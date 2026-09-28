import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET: 詳細情報取得
export async function GET(
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

        const { data: creditCase, error } = await supabaseAdmin
            .from('credit_cases')
            .select(`
                *,
                companies:registered_by_company_id ( id, name )
            `)
            .eq('id', id)
            .single();

        if (error || !creditCase) {
            return NextResponse.json({ error: '対象データが見つかりません' }, { status: 404 });
        }

        return NextResponse.json({ case: creditCase });

    } catch (e: any) {
        console.error('Credit case detail GET error:', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}

// PATCH: 入金状況の更新（「解決済み」報告）
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
            .select('role, company_id')
            .eq('id', user.id)
            .single();

        const { data: existingCase } = await supabaseAdmin
            .from('credit_cases')
            .select('*')
            .eq('id', id)
            .single();

        if (!existingCase) {
            return NextResponse.json({ error: 'データが見つかりません' }, { status: 404 });
        }

        // 自社が登録したデータか、管理者のみ更新可能
        const isOwner = existingCase.registered_by_company_id === appUser?.company_id;
        const isAdmin = appUser?.role === 'admin';

        if (!isOwner && !isAdmin) {
            return NextResponse.json({ error: '更新権限がありません' }, { status: 403 });
        }

        const body = await request.json();
        const { paymentStatus, resolvedDelayDays, counterpartyClaim } = body;

        const updatePayload: any = {
            updated_at: new Date().toISOString()
        };

        if (paymentStatus) updatePayload.payment_status = paymentStatus;
        if (resolvedDelayDays !== undefined) updatePayload.resolved_delay_days = Number(resolvedDelayDays);
        if (counterpartyClaim !== undefined) updatePayload.counterparty_claim = counterpartyClaim;

        const { data: updatedCase, error: updateError } = await supabaseAdmin
            .from('credit_cases')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, case: updatedCase });

    } catch (e: any) {
        console.error('Credit case detail PATCH error:', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
