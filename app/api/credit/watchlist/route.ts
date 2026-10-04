import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET: 自社の取引先ウォッチリスト一覧 ＋ 未払いステータス突合
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

        const supabaseQuery = supabaseServiceRoleKey
            ? createClient(supabaseUrl, supabaseServiceRoleKey)
            : supabaseUser;

        // ユーザーの会社・プラン権限取得
        const { data: appUser } = await supabaseQuery
            .from('app_users')
            .select('role, company_id, allowed_plan')
            .eq('id', user.id)
            .single();

        if (!appUser || !appUser.company_id) {
            return NextResponse.json({ error: '所属企業が設定されていません' }, { status: 400 });
        }

        const isAdmin = appUser.role === 'admin';
        const userPlan = appUser.allowed_plan || 'full';

        if (!isAdmin && userPlan === 'employment') {
            return NextResponse.json({ 
                error: 'この機能は「ミエリスクレジット」または「両方セット」プランのご契約が必要です',
                planRestricted: true 
            }, { status: 403 });
        }

        // ウォッチリストの取得
        const { data: watchlistData, error: watchlistError } = await supabaseQuery
            .from('credit_watchlist')
            .select('*')
            .eq('company_id', appUser.company_id)
            .order('created_at', { ascending: false });

        if (watchlistError) {
            // テーブル未作成時の安全なハンドリング
            if (watchlistError.message?.includes('does not exist') || watchlistError.message?.includes('schema cache')) {
                return NextResponse.json({ 
                    watchlist: [], 
                    total_count: 0, 
                    warning_count: 0,
                    tableNotReady: true 
                });
            }
            console.error('Fetch watchlist error:', watchlistError);
            return NextResponse.json({ error: watchlistError.message }, { status: 500 });
        }

        const watchlist = watchlistData || [];
        if (watchlist.length === 0) {
            return NextResponse.json({ watchlist: [], total_count: 0, warning_count: 0 });
        }

        // 監視対象企業の法人番号リスト
        const corpNumbers = watchlist.map(w => w.corporate_number).filter(Boolean);

        // 承認済み未払い案件の検索（他社未払いを含む）
        let activeCases: any[] = [];
        if (corpNumbers.length > 0) {
            const { data: casesData } = await supabaseQuery
                .from('credit_cases')
                .select('id, company_name, corporate_number, amount, due_date, payment_status, status')
                .in('corporate_number', corpNumbers)
                .eq('status', 'approved');

            activeCases = casesData || [];
        }

        // 各ウォッチ企業に対してステータス・未払い件数を判定突合
        let warningCount = 0;
        const enrichedWatchlist = watchlist.map((item) => {
            const matchedCases = activeCases.filter(c => c.corporate_number === item.corporate_number);
            const unpaidCases = matchedCases.filter(c => c.payment_status === 'unpaid');
            const isWarning = unpaidCases.length > 0;

            if (isWarning) warningCount++;

            return {
                ...item,
                status: isWarning ? 'warning' : 'safe',
                total_cases: matchedCases.length,
                unpaid_count: unpaidCases.length,
                latest_unpaid: unpaidCases.length > 0 ? {
                    amount: unpaidCases[0].amount,
                    due_date: unpaidCases[0].due_date
                } : null
            };
        });

        return NextResponse.json({
            watchlist: enrichedWatchlist,
            total_count: enrichedWatchlist.length,
            warning_count: warningCount
        });

    } catch (err: any) {
        console.error('Watchlist API error:', err);
        return NextResponse.json({ error: err.message || '内部エラーが発生しました' }, { status: 500 });
    }
}

// POST: 取引先のウォッチリスト追加
export async function POST(request: Request) {
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

        const supabaseQuery = supabaseServiceRoleKey
            ? createClient(supabaseUrl, supabaseServiceRoleKey)
            : supabaseUser;

        const { data: appUser } = await supabaseQuery
            .from('app_users')
            .select('role, company_id, allowed_plan')
            .eq('id', user.id)
            .single();

        if (!appUser || !appUser.company_id) {
            return NextResponse.json({ error: '所属企業が設定されていません' }, { status: 400 });
        }

        const body = await request.json();
        const { corporate_number, company_name, notes } = body;

        const cleanCorpNum = (corporate_number || '').trim().replace(/[^0-9]/g, '');
        if (!cleanCorpNum || cleanCorpNum.length !== 13) {
            return NextResponse.json({ error: '法人番号は13桁の半角数字で入力してください' }, { status: 400 });
        }

        if (!company_name || !company_name.trim()) {
            return NextResponse.json({ error: '企業名を入力してください' }, { status: 400 });
        }

        // 保存（Upsert: 同じ法人番号ならメモや会社名を更新）
        const { data, error: insertError } = await supabaseQuery
            .from('credit_watchlist')
            .upsert({
                company_id: appUser.company_id,
                user_id: user.id,
                corporate_number: cleanCorpNum,
                company_name: company_name.trim(),
                notes: notes ? notes.trim() : null
            }, {
                onConflict: 'company_id,corporate_number'
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert watchlist error:', insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, item: data });

    } catch (err: any) {
        console.error('Watchlist POST error:', err);
        return NextResponse.json({ error: err.message || '内部エラーが発生しました' }, { status: 500 });
    }
}

// DELETE: 取引先ウォッチの解除
export async function DELETE(request: Request) {
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

        const supabaseQuery = supabaseServiceRoleKey
            ? createClient(supabaseUrl, supabaseServiceRoleKey)
            : supabaseUser;

        const { data: appUser } = await supabaseQuery
            .from('app_users')
            .select('company_id')
            .eq('id', user.id)
            .single();

        if (!appUser || !appUser.company_id) {
            return NextResponse.json({ error: '所属企業が設定されていません' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const corp = searchParams.get('corp');

        if (!id && !corp) {
            return NextResponse.json({ error: '削除対象のIDまたは法人番号が必要です' }, { status: 400 });
        }

        let deleteQuery = supabaseQuery
            .from('credit_watchlist')
            .delete()
            .eq('company_id', appUser.company_id);

        if (id) {
            deleteQuery = deleteQuery.eq('id', id);
        } else if (corp) {
            deleteQuery = deleteQuery.eq('corporate_number', corp);
        }

        const { error: deleteError } = await deleteQuery;
        if (deleteError) {
            console.error('Delete watchlist error:', deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('Watchlist DELETE error:', err);
        return NextResponse.json({ error: err.message || '内部エラーが発生しました' }, { status: 500 });
    }
}
