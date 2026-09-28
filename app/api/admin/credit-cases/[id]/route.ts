import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// PATCH: 管理者による審査（承認 / 却下）
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
        const { status, adminNotes } = body;

        if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
            return NextResponse.json({ error: 'ステータスが不正です' }, { status: 400 });
        }

        const { data: updatedCase, error } = await supabaseAdmin
            .from('credit_cases')
            .update({
                status,
                admin_notes: adminNotes || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, case: updatedCase });

    } catch (e: any) {
        console.error('Admin credit case review error:', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
