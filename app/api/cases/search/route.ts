import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';
import { isValidCalendarDate } from '@/lib/dateFormat';

// GET: 人物トラブル情報のサーバーサイド検索・照会API
export async function GET(request: Request) {
    try {
        // 認証・承認・WORKプランチェック（パラメータ検証より先に必ず認証）
        const auth = await authenticateApiRequest(request, { requirePlan: 'employment' });
        if (!auth.ok) return auth.response;

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
        if (!birthDate || !isValidCalendarDate(birthDate, { allowFuture: false })) {
            return NextResponse.json(
                { error: '生年月日を正しい日付（本日以前・YYYY-MM-DD）で指定してください。' },
                { status: 400 }
            );
        }

        const { supabaseAdmin } = auth;

        // サーバーサイド検索クエリの構築
        // 生年月日は完全一致を必須とする（同姓同名の過剰ヒット防止）
        // 照会検索では「承認済み」データのみ照会可能
        const { data, error } = await supabaseAdmin
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
                approved_at,
                created_at,
                registered_company_id,
                companies:registered_company_id ( id, name )
            `)
            .eq('birth_date', birthDate)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Search blacklist cases error:', error);
            return NextResponse.json({ error: 'データの照会に失敗しました。時間をおいて再度お試しください。' }, { status: 500 });
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
        if (targetQuery.length < 2) {
            return NextResponse.json(
                { error: '氏名（フルネーム）はスペースを除いて2文字以上で入力してください。' },
                { status: 400 }
            );
        }

        const queryTokens = nameQuery
            .trim()
            .split(/[\s　]+/)
            .map(t => normalize(t))
            .filter(Boolean);

        // スペース有無・全角半角・カナひらがなに関わらず柔軟に照合
        // ※逆方向一致（targetQuery.includes(itemFullName)）は長文文字列による総当たり抽出を防ぐため行わない
        const matchedResults = (data || []).filter((item: any) => {
            const itemFullName = normalize(item.full_name);
            const itemKana = normalize(item.full_name_kana);

            // 1. スペース完全除去での一致または部分一致（登録氏名側にクエリが含まれること）
            if (itemFullName && itemFullName.includes(targetQuery)) {
                return true;
            }
            if (itemKana && itemKana.includes(targetQuery)) {
                return true;
            }

            // 2. 姓名をスペース区切りで入力した場合、全トークンが含まれているか
            if (queryTokens.length > 1) {
                const matchAllTokensName = Boolean(itemFullName) && queryTokens.every(token => itemFullName.includes(token));
                const matchAllTokensKana = Boolean(itemKana) && queryTokens.every(token => itemKana.includes(token));
                if (matchAllTokensName || matchAllTokensKana) {
                    return true;
                }
            }

            return false;
        });

        return NextResponse.json({ results: matchedResults });

    } catch (e: unknown) {
        console.error('Search API unexpected error:', e);
        return NextResponse.json({ error: '照会処理中にエラーが発生しました。時間をおいて再度お試しください。' }, { status: 500 });
    }
}
