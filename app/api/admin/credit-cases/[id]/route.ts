import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCaseReviewNotification } from '@/lib/notificationService';

// PATCH: 管理者による審査（承認 / 却下）および登録内容の直接編集（誤字脱字修正用）
export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: '認証情報がありません' }, { status: 401 });
        }
        const token = authHeader.replace('Bearer ', '');

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'ユーザー情報を取得できませんでした' }, { status: 401 });
        }

        const supabaseAdmin = supabaseServiceRoleKey
            ? createClient(supabaseUrl, supabaseServiceRoleKey)
            : supabaseUser;

        const { data: appUser } = await supabaseAdmin
            .from('app_users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (appUser?.role !== 'admin') {
            return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
        }

        const body = await request.json();
        const {
            status,
            adminNotes,
            company_name,
            corporate_number,
            location,
            invoice_date,
            amount,
            due_date,
            business_status,
            counterparty_claim
        } = body;

        const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString()
        };

        if (status !== undefined) {
            if (!['approved', 'rejected', 'pending'].includes(status)) {
                return NextResponse.json({ error: 'ステータスが不正です' }, { status: 400 });
            }
            if (status === 'rejected' && !adminNotes?.trim()) {
                return NextResponse.json({ error: '却下理由を入力してください' }, { status: 400 });
            }
            updatePayload.status = status;
            updatePayload.admin_notes = adminNotes || null;
        } else if (adminNotes !== undefined) {
            updatePayload.admin_notes = adminNotes || null;
        }

        if (company_name !== undefined) updatePayload.company_name = company_name.trim();
        if (corporate_number !== undefined) updatePayload.corporate_number = corporate_number?.trim() || null;
        if (location !== undefined) updatePayload.location = location?.trim() || null;
        if (invoice_date !== undefined) updatePayload.invoice_date = invoice_date || null;
        if (amount !== undefined) updatePayload.amount = Number(amount) || 0;
        if (due_date !== undefined) updatePayload.due_date = due_date;
        if (business_status !== undefined) updatePayload.business_status = business_status;
        if (counterparty_claim !== undefined) updatePayload.counterparty_claim = counterparty_claim?.trim() || null;

        const { data: updatedCase, error } = await supabaseAdmin
            .from('credit_cases')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 申請者企業へ通知メールを送信 (承認または却下の場合)
        if (status === 'approved' || status === 'rejected') {
            try {
                await sendCaseReviewNotification({
                    type: 'credit',
                    status,
                    targetName: updatedCase.company_name,
                    reason: adminNotes || undefined,
                    registeredCompanyId: updatedCase.registered_by_company_id,
                });
            } catch (notifErr) {
                console.error('Failed to send credit review notification:', notifErr);
            }
        }

        return NextResponse.json({ success: true, case: updatedCase });

    } catch (e: any) {
        console.error('Admin credit case review error:', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
