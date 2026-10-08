import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET: 人物トラブル情報のサーバーサイド検索・照会API
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const nameQuery = (searchParams.get('name') || '').trim();
        const birthDate = (searchParams.get('birth_date') || '').trim();

        // 必須パラメータチェック
        if (!nameQuery || nameQuery.length < 2) {
            return NextResponse.json(
                { error: '氏名（フルネーム）は2文字以上で入力してください。' },
                { status: 400 }
            );
        }
        if (!birthDate) {
            return NextResponse.json(
                { error: '生年月日を正しく指定してください。' },
                { status: 400 }
            );
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: '認証情報がありません。再度ログインしてください。' }, { status: 401 });
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
            return NextResponse.json({ error: 'ユーザー情報を取得できませんでした。' }, { status: 401 });
        }

        const supabaseQuery = supabaseServiceRoleKey
            ? createClient(supabaseUrl, supabaseServiceRoleKey)
            : supabaseUser;

        // ユーザーのプラン権限チェック
        const { data: appUser } = await supabaseQuery
            .from('app_users')
            .select('role, company_id, allowed_plan')
            .eq('id', user.id)
            .single();

        const isAdmin = appUser?.role === 'admin';
        const userPlan = appUser?.allowed_plan || 'full';

        // プランが credit（企業信用のみ）の場合はアクセス制限
        if (!isAdmin && userPlan === 'credit') {
            return NextResponse.json({
                error: 'この機能は「応募者照会」または「両方セット」プランのご契約が必要です。',
                planRestricted: true
            }, { status: 403 });
        }

        // サーバーサイド検索クエリの構築
        // 生年月日は完全一致を必須とする（同姓同名の過剰ヒット防止）
        let query = supabaseQuery
            .from('blacklist_cases')
            .select(`
                id,
                full_name,
                full_name_kana,
                gender,
                birth_date,
                phone_last4,
                occurrence_date,
                reason_text,
                status,
                created_at,
                registered_company_id
            `)
            .eq('birth_date', birthDate);

        // 管理者以外は「承認済み」データのみ照会可能
        if (!isAdmin) {
            query = query.eq('status', 'approved');
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Search blacklist cases error:', error);
            return NextResponse.json({ error: 'データの照会に失敗しました: ' + error.message }, { status: 500 });
        }

        // 文字列の正規化関数（半角・全角スペース除去、カタカナ→ひらがな統一、NFKC正規化）
        const normalize = (str?: string | null): string => {
            if (!str) return '';
            return str
                .toLowerCase()
                .replace(/[\s　]+/g, '')
                .replace(/[ァ-ン]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60))
                .normalize('NFKC');
        };

        const targetQuery = normalize(nameQuery);
        const queryTokens = nameQuery
            .trim()
            .split(/[\s　]+/)
            .map(t => normalize(t))
            .filter(Boolean);

        // スペース有無・全角半角・カナひらがなに関わらず柔軟に照合
        const matchedResults = (data || []).filter((item: any) => {
            const itemFullName = normalize(item.full_name);
            const itemKana = normalize(item.full_name_kana);

            // 1. スペース完全除去での一致または部分一致
            if (itemFullName.includes(targetQuery) || targetQuery.includes(itemFullName)) {
                return true;
            }
            if (itemKana.includes(targetQuery) || targetQuery.includes(itemKana)) {
                return true;
            }

            // 2. 姓名をスペース区切りで入力した場合、全トークンが含まれているか
            if (queryTokens.length > 1) {
                const matchAllTokensName = queryTokens.every(token => itemFullName.includes(token));
                const matchAllTokensKana = queryTokens.every(token => itemKana.includes(token));
                if (matchAllTokensName || matchAllTokensKana) {
                    return true;
                }
            }

            return false;
        });

        return NextResponse.json({ results: matchedResults });

    } catch (e: any) {
        console.error('Search API unexpected error:', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
