import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET: 管理者用 未払い企業審査一覧
export async function GET(request: Request) {
    try {
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

        const { data: cases, error } = await supabaseAdmin
            .from('credit_cases')
            .select(`
                *,
                companies:registered_by_company_id ( id, name )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Admin credit cases warning:', error.message);
            return NextResponse.json({ cases: [] });
        }

        return NextResponse.json({ cases: cases || [] });

    } catch (e: any) {
        console.error('Admin credit cases GET error:', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
