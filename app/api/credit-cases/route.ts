import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { detectOfficialSource, isCorporateEntityName, getLocationPriorityRank, buildCompanyQueryVariants } from '@/lib/officialSources';

// GET: 未払い企業情報の検索・一覧取得
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';
        const corporateNumber = searchParams.get('corp') || '';
        const status = searchParams.get('status') || 'approved'; // 一般は承認済みのみ
        const showAll = searchParams.get('all') === 'true'; // 管理者向け全件表示フラグ

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

        // ユーザーのプラン・承認権限チェック
        const { data: appUser } = await supabaseQuery
            .from('app_users')
            .select('role, company_id, allowed_plan, is_approved')
            .eq('id', user.id)
            .single();

        if (!appUser || appUser.is_approved === false) {
            return NextResponse.json({ error: '承認されたアカウントが必要です' }, { status: 403 });
        }

        const isAdmin = appUser.role === 'admin';
        const userPlan = appUser.allowed_plan || 'full';

        // プランが employment（就業情報のみ）の場合はクレジットへのアクセス制限（管理者を除く）
        if (!isAdmin && userPlan === 'employment') {
            return NextResponse.json({ 
                error: 'この機能は「ミエリスクレジット」または「両方セット」プランのご契約が必要です',
                planRestricted: true 
            }, { status: 403 });
        }

        // クエリ構築（新ステータスカラム対応 + 後方互換フォールバック）
        const selectFieldsWithStatus = `
            id,
            company_name,
            corporate_number,
            location,
            invoice_date,
            amount,
            due_date,
            payment_status,
            resolved_delay_days,
            counterparty_claim,
            status,
            admin_notes,
            business_status,
            registry_status,
            registry_close_date,
            registry_close_cause,
            created_at,
            companies:registered_by_company_id ( id, name )
        `;

        const selectFieldsBase = `
            id,
            company_name,
            corporate_number,
            location,
            invoice_date,
            amount,
            due_date,
            payment_status,
            resolved_delay_days,
            counterparty_claim,
            status,
            admin_notes,
            created_at,
            companies:registered_by_company_id ( id, name )
        `;

        let query = supabaseQuery
            .from('credit_cases')
            .select(selectFieldsWithStatus)
            .order('created_at', { ascending: false });

        const cleanCorp = corporateNumber.trim().replace(/[^0-9]/g, '');
        const isSearching = !!(q.trim() || cleanCorp);

        // 管理者以外は一覧の垂れ流しを防止（検索でのみ該当データを照会可能）
        if (!isAdmin) {
            if (isSearching) {
                // 照会検索時は承認済みデータのみ返す（未承認・却下データの混入防止 & .or()競合防止）
                query = query.eq('status', 'approved');
            } else {
                // 一覧表示時: 自社登録データ ＋ 公的確定処分データ（国交省・厚労省・官報等の公表記録）
                if (appUser?.company_id) {
                    query = query.or(`registered_by_company_id.eq.${appUser.company_id},and(status.eq.approved,counterparty_claim.ilike.%【%)`);
                } else {
                    query = query.eq('status', 'approved').ilike('counterparty_claim', '%【%');
                }
            }
        } else if (!showAll) {
            // 管理者でも all=true でない場合（通常の照会・統計取得時）は承認済みのみ対象
            query = query.eq('status', 'approved');
        }

        // 検索フィルター（13桁法人番号がある場合は一意特定のため法人番号で照合し、社名表記揺れによる0件漏れを防ぐ）
        if (cleanCorp) {
            query = query.eq('corporate_number', cleanCorp);
        } else if (q.trim()) {
            query = query.or(buildCompanyQueryVariants(q).map(v => `company_name.ilike.%${v}%`).concat(`location.ilike.%${q.trim()}%`).join(','));
        }

        let { data, error } = await query;

        // DBにまだカラムが存在しない場合のエラーフォールバック
        if (error && error.message?.includes('column')) {
            console.warn('credit_cases status columns not in DB yet, falling back to base select:', error.message);
            let fallbackQuery = supabaseQuery
                .from('credit_cases')
                .select(selectFieldsBase)
                .order('created_at', { ascending: false });

            if (!isAdmin) {
                if (isSearching) {
                    fallbackQuery = fallbackQuery.eq('status', 'approved');
                } else {
                    if (appUser?.company_id) {
                        fallbackQuery = fallbackQuery.or(`registered_by_company_id.eq.${appUser.company_id},and(status.eq.approved,counterparty_claim.ilike.%【%)`);
                    } else {
                        fallbackQuery = fallbackQuery.eq('status', 'approved').ilike('counterparty_claim', '%【%');
                    }
                }
            } else if (!showAll) {
                fallbackQuery = fallbackQuery.eq('status', 'approved');
            }
            if (cleanCorp) {
                fallbackQuery = fallbackQuery.eq('corporate_number', cleanCorp);
            } else if (q.trim()) {
                fallbackQuery = fallbackQuery.or(buildCompanyQueryVariants(q).map(v => `company_name.ilike.%${v}%`).concat(`location.ilike.%${q.trim()}%`).join(','));
            }
            const fallbackResult = await fallbackQuery;
            data = fallbackResult.data as any;
            error = fallbackResult.error;
        }

        if (error) {
            console.warn('credit_cases query warning/error:', error.message);
            return NextResponse.json({ cases: [] });
        }

        // 営業実態・公的登記ステータスの補完（未設定レコードの場合）
        const enrichedCases = (data || []).map((item: any) => {
            let businessStatus = item.business_status;
            let registryStatus = item.registry_status;

            if (!businessStatus) {
                const claim = item.counterparty_claim || '';
                if (claim.includes('夜逃げ') || claim.includes('引き払い') || claim.includes('所在不明')) {
                    businessStatus = 'relocated';
                } else if (claim.includes('倒産') || claim.includes('破産')) {
                    businessStatus = 'bankrupt';
                } else if (claim.includes('不通') || claim.includes('連絡が取れ') || claim.includes('ブロック')) {
                    businessStatus = 'unreachable';
                } else {
                    businessStatus = 'unreachable';
                }
            }

            if (!registryStatus) {
                if (item.company_name?.includes('個人事業主') || (!item.corporate_number && !isCorporateEntityName(item.company_name)) || item.corporate_number?.startsWith('999')) {
                    registryStatus = 'sole_proprietor';
                } else {
                    registryStatus = 'active';
                }
            }

            return {
                ...item,
                business_status: businessStatus,
                registry_status: registryStatus,
                registry_close_date: item.registry_close_date || null,
                registry_close_cause: item.registry_close_cause || null,
            };
        });

        enrichedCases.sort((a: any, b: any) => {
            const rankA = getLocationPriorityRank(a.location);
            const rankB = getLocationPriorityRank(b.location);
            if (rankA !== rankB) return rankA - rankB;
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        });

        return NextResponse.json({ cases: enrichedCases });

    } catch (e: any) {
        console.error('Credit cases GET error:', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}

// POST: 未払い企業情報の新規登録申請
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

        const supabaseAdmin = supabaseServiceRoleKey
            ? createClient(supabaseUrl, supabaseServiceRoleKey)
            : supabaseUser;

        const { data: appUser } = await supabaseAdmin
            .from('app_users')
            .select('role, company_id, display_name, allowed_plan, is_approved, companies(name)')
            .eq('id', user.id)
            .single();

        if (!appUser || appUser.is_approved === false) {
            return NextResponse.json({ error: '承認されたアカウントが必要です' }, { status: 403 });
        }

        if (!appUser?.company_id) {
            return NextResponse.json({ error: '所属会社が設定されていません' }, { status: 400 });
        }

        // プランチェック
        const isAdmin = appUser.role === 'admin';
        if (!isAdmin && appUser.allowed_plan === 'employment') {
            return NextResponse.json({ error: 'クレジットプランの契約が必要です' }, { status: 403 });
        }

        const body = await request.json();
        const {
            companyName,
            corporateNumber,
            location,
            invoiceDate,
            amount,
            dueDate,
            counterpartyClaim,
            evidenceUrls,
            businessStatus,
            registryStatus,
            registryCloseDate,
            registryCloseCause
        } = body;

        // 必須チェック
        if (!companyName || !amount || !dueDate) {
            return NextResponse.json({ error: '企業名・未払い金額・支払期日は必須項目です' }, { status: 400 });
        }

        if (!Array.isArray(evidenceUrls) || evidenceUrls.length === 0) {
            return NextResponse.json({ error: '裏付け資料（請求書、契約書、督促状、同意書等）を1点以上添付してください' }, { status: 400 });
        }

        const cleanCorpNum = corporateNumber ? corporateNumber.replace(/[^0-9]/g, '') : '';
        // 法人番号がある場合は13桁チェック（個人事業主等で未入力の場合は空文字または999始まりを許容）
        if (cleanCorpNum && cleanCorpNum.length !== 13) {
            return NextResponse.json({ error: '法人番号を入力する場合は13桁の半角数字で入力してください' }, { status: 400 });
        }

        const validBusinessStatus = ['active', 'unreachable', 'relocated', 'bankrupt', 'unknown'].includes(businessStatus)
            ? businessStatus
            : 'unreachable';

        const validRegistryStatus = ['active', 'closed', 'sole_proprietor', 'unknown'].includes(registryStatus)
            ? registryStatus
            : (cleanCorpNum ? 'active' : 'sole_proprietor');

        const payloadWithStatus = {
            company_name: companyName.trim(),
            corporate_number: cleanCorpNum || null,
            location: location?.trim() || null,
            invoice_date: invoiceDate || null,
            amount: Number(amount),
            due_date: dueDate,
            payment_status: 'unpaid',
            counterparty_claim: counterpartyClaim?.trim() || null,
            registered_by_company_id: appUser.company_id,
            evidence_urls: evidenceUrls || [],
            status: 'pending', // 必ず管理者の事前審査が入る
            business_status: validBusinessStatus,
            registry_status: validRegistryStatus,
            registry_close_date: registryCloseDate || null,
            registry_close_cause: registryCloseCause || null,
        };

        const payloadBase = {
            company_name: companyName.trim(),
            corporate_number: cleanCorpNum || null,
            location: location?.trim() || null,
            invoice_date: invoiceDate || null,
            amount: Number(amount),
            due_date: dueDate,
            payment_status: 'unpaid',
            counterparty_claim: counterpartyClaim?.trim() || null,
            registered_by_company_id: appUser.company_id,
            evidence_urls: evidenceUrls || [],
            status: 'pending'
        };

        let { data: newCase, error: insertError } = await supabaseAdmin
            .from('credit_cases')
            .insert([payloadWithStatus])
            .select()
            .single();

        // DBに新カラムがまだない場合のフォールバック
        if (insertError && insertError.message?.includes('column')) {
            console.warn('credit_cases insert failed with new columns, retrying base payload:', insertError.message);
            const fallbackInsert = await supabaseAdmin
                .from('credit_cases')
                .insert([payloadBase])
                .select()
                .single();
            newCase = fallbackInsert.data;
            insertError = fallbackInsert.error;
        }

        if (insertError) {
            console.error('Credit case insert error:', insertError);
            return NextResponse.json({ error: insertError.message || '登録に失敗しました' }, { status: 500 });
        }

        // LINE通知（管理者に新規未払い企業登録の審査申請を通知）
        try {
            const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
            const adminUserId = process.env.LINE_ADMIN_USER_ID;

            if (lineToken && adminUserId) {
                const messageText = `【MIERIS CREDIT 審査申請通知】\n\n未払い企業情報が新規登録されました。\n\n対象企業: ${companyName.trim()}\n未払い金額: ¥${Number(amount).toLocaleString()}\n支払期日: ${dueDate}\n登録企業: ${(appUser.companies as any)?.name || '未所属'}\n担当者: ${appUser.display_name || '不明'}\n\n管理画面にログインしてエビデンス等の審査を行ってください。`;

                const targetIds = adminUserId.split(',').map((id: string) => id.trim()).filter((id: string) => id);
                await Promise.all(targetIds.map((targetId: string) =>
                    fetch('https://api.line.me/v2/bot/message/push', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${lineToken}`
                        },
                        body: JSON.stringify({
                            to: targetId,
                            messages: [{ type: "text", text: messageText }]
                        })
                    })
                ));
            }
        } catch (lineErr) {
            console.warn('LINE notification warning:', lineErr);
        }

        return NextResponse.json({ success: true, case: newCase });

    } catch (e: any) {
        console.error('Credit case POST error:', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
