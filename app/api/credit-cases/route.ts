import { NextResponse } from 'next/server';
import {
    detectOfficialSource,
    isCorporateEntityName,
    getLocationPriorityRank,
    buildCompanyQueryVariants,
    isTargetCreditIndustry,
    extractCompanyCoreName,
    normalizeCompanySearchText,
} from '@/lib/officialSources';
import {
    authenticateApiRequest,
    sanitizePostgrestFilterValue,
    isValidUserEvidencePath,
    isSafeStorageEvidencePath,
} from '@/lib/apiAuth';

const OFFICIAL_FALLBACK_CLAIM_FILTERS = [
    'counterparty_claim.ilike.【厚生労働省%',
    'counterparty_claim.ilike.【国土交通省%',
    'counterparty_claim.ilike.【東京都知事%',
    'counterparty_claim.ilike.【消費者庁%',
    'counterparty_claim.ilike.【官報公告%',
    'counterparty_claim.ilike.【公正取引委員会%',
    'counterparty_claim.ilike.【経済産業省%',
];

function isValidIsoDate(dateStr: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (y < 1900 || y > 2100) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d;
}

// GET: 未払い企業情報の検索・一覧取得
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';
        const corporateNumber = searchParams.get('corp') || '';
        const showAll = searchParams.get('all') === 'true'; // 管理者向け全件表示フラグ

        // 認証・承認・CREDITプランチェック
        const auth = await authenticateApiRequest(request, { requirePlan: 'credit' });
        if (!auth.ok) return auth.response;

        const { appUser, isAdmin, supabaseAdmin: supabaseQuery } = auth;

        // クエリ構築（新ステータスカラム + is_official 対応 + 後方互換フォールバック）
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
            is_official,
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
            business_status,
            registry_status,
            registry_close_date,
            registry_close_cause,
            created_at,
            companies:registered_by_company_id ( id, name )
        `;

        const selectFieldsMinimal = `
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

        const cleanCorp = corporateNumber.trim().replace(/[^0-9]/g, '');
        const trimmedQ = q.trim();
        const safeQ = sanitizePostgrestFilterValue(trimmedQ);
        const queryCore = extractCompanyCoreName(safeQ);
        const queryNorm = normalizeCompanySearchText(safeQ);
        const safeVariants = (safeQ && queryCore.length >= 2)
            ? buildCompanyQueryVariants(safeQ)
                .map(sanitizePostgrestFilterValue)
                .filter((v) => v.length >= 2 && extractCompanyCoreName(v).length >= 2)
            : [];

        // 記号のみ・1文字・法人格のみ（"株式会社"等）による検索フィルタ回避・一括抽出を防止
        if (trimmedQ && !cleanCorp && (safeQ.length < 2 || queryCore.length < 2 || safeVariants.length === 0)) {
            return NextResponse.json(
                { error: '法人格（株式会社等）や記号を除いた具体的な企業名・屋号を2文字以上で入力してください。' },
                { status: 400 }
            );
        }
        if (cleanCorp && cleanCorp.length !== 13) {
            return NextResponse.json(
                { error: '法人番号・インボイス登録番号は13桁の半角数字で指定してください。' },
                { status: 400 }
            );
        }

        const isSearching = !!(cleanCorp || (safeQ.length >= 2 && queryCore.length >= 2 && safeVariants.length > 0));

        const applySearchFilter = (qb: any) => {
            // 法人番号＋企業名（サジェスト選択時等）は、法人番号一致に加えて「法人番号未登録(null)の公的処分・民間案件」も企業名で拾う
            if (cleanCorp && safeVariants.length > 0) {
                const orConds = [
                    `corporate_number.eq.${cleanCorp}`,
                    ...safeVariants.map(v => `and(corporate_number.is.null,company_name.ilike.%${v}%)`),
                ];
                return qb.or(orConds.join(','));
            }
            if (cleanCorp) {
                return qb.eq('corporate_number', cleanCorp);
            }
            if (safeVariants.length > 0) {
                // 住所(location)の無差別一致による都道府県一括抽出を防ぐため企業名のみ対象とする
                return qb.or(safeVariants.map(v => `company_name.ilike.%${v}%`).join(','));
            }
            return qb;
        };

        // 一覧モード時は Supabase デフォルト上限（1,000件）による切り捨てを防ぐためレンジ分割取得
        const fetchRows = async (buildQuery: () => any): Promise<{ data: any[] | null; error: any }> => {
            if (isSearching) {
                const res = await buildQuery();
                return { data: res.data, error: res.error };
            }
            const CHUNK_SIZE = 1000;
            const MAX_ROWS = 20000;
            const collected: any[] = [];
            for (let from = 0; from < MAX_ROWS; from += CHUNK_SIZE) {
                const { data: chunk, error: chunkError } = await buildQuery().range(from, from + CHUNK_SIZE - 1);
                if (chunkError) {
                    return { data: null, error: chunkError };
                }
                if (!chunk || chunk.length === 0) break;
                collected.push(...chunk);
                if (chunk.length < CHUNK_SIZE) break;
            }
            return { data: collected, error: null };
        };

        const buildPrimaryQuery = () => {
            let qBuilder = supabaseQuery
                .from('credit_cases')
                .select(selectFieldsWithStatus)
                .order('created_at', { ascending: false })
                .order('id', { ascending: false });

            // 管理者以外は一覧の垂れ流しを防止（検索でのみ該当データを照会可能）
            if (!isAdmin) {
                if (isSearching) {
                    qBuilder = qBuilder.eq('status', 'approved').limit(50);
                } else {
                    // 一覧表示時: 自社登録データ ＋ 公的確定処分データ（is_official = true）
                    if (appUser.company_id) {
                        qBuilder = qBuilder.or(`registered_by_company_id.eq.${appUser.company_id},and(status.eq.approved,is_official.eq.true)`);
                    } else {
                        qBuilder = qBuilder.eq('status', 'approved').eq('is_official', true);
                    }
                }
            } else if (!showAll) {
                qBuilder = qBuilder.eq('status', 'approved');
            }

            return applySearchFilter(qBuilder);
        };

        let { data, error } = await fetchRows(buildPrimaryQuery);

        // is_official またはステータスカラムが未適用の場合の後方互換フォールバック
        if (error && error.message?.includes('column')) {
            console.warn('credit_cases extended columns not in DB yet, falling back:', error.message);

            const runFallback = async (selectStr: string) => {
                const buildFallbackQuery = () => {
                    let fallbackQuery = supabaseQuery
                        .from('credit_cases')
                        .select(selectStr)
                        .order('created_at', { ascending: false })
                        .order('id', { ascending: false });

                    if (!isAdmin) {
                        if (isSearching) {
                            fallbackQuery = fallbackQuery.eq('status', 'approved').limit(50);
                        } else {
                            const officialConds = OFFICIAL_FALLBACK_CLAIM_FILTERS.map(f => `and(status.eq.approved,${f})`);
                            if (appUser.company_id) {
                                fallbackQuery = fallbackQuery.or([`registered_by_company_id.eq.${appUser.company_id}`, ...officialConds].join(','));
                            } else {
                                fallbackQuery = fallbackQuery.eq('status', 'approved').or(OFFICIAL_FALLBACK_CLAIM_FILTERS.join(','));
                            }
                        }
                    } else if (!showAll) {
                        fallbackQuery = fallbackQuery.eq('status', 'approved');
                    }

                    return applySearchFilter(fallbackQuery);
                };

                return await fetchRows(buildFallbackQuery);
            };

            let fallbackResult = await runFallback(selectFieldsBase);
            if (fallbackResult.error && fallbackResult.error.message?.includes('column')) {
                fallbackResult = await runFallback(selectFieldsMinimal);
            }
            data = fallbackResult.data as any;
            error = fallbackResult.error;
        }

        if (error) {
            console.error('credit_cases query error:', error);
            return NextResponse.json(
                { error: '企業信用データの照会に失敗しました。時間をおいて再度お試しください。' },
                { status: 500 }
            );
        }

        // 対象外業種（旅行・製薬・飲食・医療等の公的データ）を除外
        // さらに非管理者の一覧モードでは「自社登録」または「正当な公的データ」のみを厳格に通過させる
        // また法人番号＋企業名の併用検索時は、法人番号未登録レコードの誤ヒットを防ぐため正規化名の一致を検証する
        const targetFiltered = (data || []).filter((item: any) => {
            if (!isTargetCreditIndustry(item)) return false;
            if (cleanCorp && safeVariants.length > 0 && item.corporate_number !== cleanCorp) {
                if (item.corporate_number) return false;
                const dbNorm = normalizeCompanySearchText(item.company_name);
                const dbCore = extractCompanyCoreName(item.company_name);
                const isNameMatch =
                    (queryNorm && (dbNorm === queryNorm || dbNorm.startsWith(queryNorm))) ||
                    (queryCore && dbCore === queryCore);
                if (!isNameMatch) return false;
            }
            if (!isAdmin && !isSearching) {
                const isOwner = Boolean(appUser.company_id) && item.companies?.id === appUser.company_id;
                const isOfficial = item.status === 'approved' && detectOfficialSource(item).isOfficial;
                return isOwner || isOfficial;
            }
            return true;
        });

        const enrichedCases = targetFiltered.map((item: any) => {
            let businessStatus = item.business_status;
            let registryStatus = item.registry_status;

            const fullText = `${item.counterparty_claim || ''} ${item.admin_notes || ''}`;
            const isOfficial = detectOfficialSource(item).isOfficial;

            if (!businessStatus && !isOfficial) {
                if (fullText.includes('夜逃げ') || fullText.includes('引き払い') || fullText.includes('所在不明')) {
                    businessStatus = 'relocated';
                } else if (fullText.includes('倒産') || fullText.includes('破産') || fullText.includes('民事再生')) {
                    businessStatus = 'bankrupt';
                } else if (fullText.includes('不通') || fullText.includes('連絡が取れ') || fullText.includes('ブロック')) {
                    businessStatus = 'unreachable';
                } else {
                    businessStatus = 'unknown';
                }
            }

            if (!registryStatus) {
                if (fullText.includes('閉鎖登記') || fullText.includes('清算結了') || fullText.includes('破産手続開始') || fullText.includes('破産管財')) {
                    registryStatus = 'closed';
                } else if (item.company_name?.includes('個人事業主') || (!item.corporate_number && !isCorporateEntityName(item.company_name)) || item.corporate_number?.startsWith('999')) {
                    registryStatus = 'sole_proprietor';
                } else {
                    // 未照合データを根拠なく「登記中（存続）」と断定しない
                    registryStatus = 'unknown';
                }
            }

            const isOwner = Boolean(appUser.company_id) && item.companies?.id === appUser.company_id;
            // 承認時などの内部用管理者メモは申請元へ露出させない（却下理由または公的データ補足のみ開示）
            const safeAdminNotes = (isAdmin || isOfficial || (isOwner && item.status === 'rejected')) ? item.admin_notes : null;

            return {
                ...item,
                admin_notes: safeAdminNotes,
                business_status: businessStatus ?? null,
                registry_status: registryStatus,
                registry_close_date: item.registry_close_date || null,
                registry_close_cause: item.registry_close_cause || null,
            };
        });

        enrichedCases.sort((a: any, b: any) => {
            const dueA = a.due_date ? new Date(a.due_date).getTime() : 0;
            const dueB = b.due_date ? new Date(b.due_date).getTime() : 0;
            if (dueA !== dueB) return (isNaN(dueB) ? 0 : dueB) - (isNaN(dueA) ? 0 : dueA);
            const rankA = getLocationPriorityRank(a.location);
            const rankB = getLocationPriorityRank(b.location);
            if (rankA !== rankB) return rankA - rankB;
            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        });

        // 一覧・サマリー取得時: プラットフォーム全体の承認済み民間案件の件数集計を返す
        // （他社案件の明細は一切露出せず、サマリーカードの統計数値のみを正確に反映するため）
        let stats: { totalListCount: number; unpaidCount: number; resolvedCount: number } | undefined;
        if (!isSearching) {
            let unpaidCount = 0;
            let resolvedCount = 0;

            const [unpaidRes, resolvedRes] = await Promise.all([
                supabaseQuery
                    .from('credit_cases')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'approved')
                    .eq('is_official', false)
                    .eq('payment_status', 'unpaid'),
                supabaseQuery
                    .from('credit_cases')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'approved')
                    .eq('is_official', false)
                    .eq('payment_status', 'resolved'),
            ]);

            if (!unpaidRes.error && !resolvedRes.error) {
                unpaidCount = unpaidRes.count ?? 0;
                resolvedCount = resolvedRes.count ?? 0;
            } else {
                // is_official カラム未適用環境へのフォールバック集計
                const { data: fallbackApprovedRows } = await fetchRows(() =>
                    supabaseQuery
                        .from('credit_cases')
                        .select('payment_status, counterparty_claim, admin_notes')
                        .eq('status', 'approved')
                        .order('id', { ascending: false })
                );
                for (const row of fallbackApprovedRows || []) {
                    if (!detectOfficialSource(row).isOfficial) {
                        if (row.payment_status === 'unpaid') unpaidCount++;
                        else if (row.payment_status === 'resolved') resolvedCount++;
                    }
                }
            }

            stats = {
                totalListCount: enrichedCases.length,
                unpaidCount,
                resolvedCount,
            };
        }

        return NextResponse.json(stats ? { cases: enrichedCases, stats } : { cases: enrichedCases });

    } catch (e: unknown) {
        console.error('Credit cases GET error:', e);
        return NextResponse.json({ error: 'データの取得中にサーバーエラーが発生しました。' }, { status: 500 });
    }
}

// POST: 未払い企業情報の新規登録申請
export async function POST(request: Request) {
    try {
        // 認証・承認・CREDITプランチェック
        const auth = await authenticateApiRequest(request, { requirePlan: 'credit' });
        if (!auth.ok) return auth.response;

        const { user, appUser, supabaseAdmin } = auth;

        if (!appUser.company_id) {
            return NextResponse.json({ error: '所属会社が設定されていません。運営事務局へお問い合わせください。' }, { status: 400 });
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
        } = body || {};

        const trimmedCompanyName = typeof companyName === 'string' ? companyName.trim() : '';
        const numAmount = Number(amount);

        // 必須・形式チェック
        if (!trimmedCompanyName || trimmedCompanyName.length > 200) {
            return NextResponse.json({ error: '対象企業名を正しく入力してください（200文字以内）。' }, { status: 400 });
        }
        if (!Number.isFinite(numAmount) || numAmount < 1 || numAmount > 999999999999) {
            return NextResponse.json({ error: '未払い金額は1円〜9,999億円の範囲で正しく入力してください。' }, { status: 400 });
        }
        if (typeof dueDate !== 'string' || !isValidIsoDate(dueDate.trim())) {
            return NextResponse.json({ error: '支払期日を正しい日付（YYYY-MM-DD）で入力してください。' }, { status: 400 });
        }
        if (invoiceDate && (typeof invoiceDate !== 'string' || !isValidIsoDate(invoiceDate.trim()))) {
            return NextResponse.json({ error: '請求日を正しい日付（YYYY-MM-DD）で入力してください。' }, { status: 400 });
        }

        const sanitizedEvidenceUrls: string[] = Array.isArray(evidenceUrls)
            ? evidenceUrls.filter((u: unknown): u is string => typeof u === 'string' && u.trim().length > 0)
            : [];

        if (sanitizedEvidenceUrls.length === 0) {
            return NextResponse.json({ error: '裏付け資料（請求書、契約書、督促状、同意書等）を1点以上添付してください。' }, { status: 400 });
        }
        if (sanitizedEvidenceUrls.length > 10) {
            return NextResponse.json({ error: '裏付け資料は最大10件まで添付できます。' }, { status: 400 });
        }
        const invalidEvidence = sanitizedEvidenceUrls.some((u: string) =>
            auth.isAdmin ? !isSafeStorageEvidencePath(u) : !isValidUserEvidencePath(u, user.id)
        );
        if (invalidEvidence) {
            return NextResponse.json({ error: '添付資料のファイルパスが不正です。再度アップロードしてください。' }, { status: 400 });
        }

        const cleanCorpNum = typeof corporateNumber === 'string' ? corporateNumber.replace(/[^0-9]/g, '') : '';
        // 法人番号がある場合は13桁チェック（個人事業主等で未入力の場合は空文字または999始まりを許容）
        if (cleanCorpNum && cleanCorpNum.length !== 13) {
            return NextResponse.json({ error: '法人番号を入力する場合は13桁の半角数字で入力してください。' }, { status: 400 });
        }

        const validBusinessStatus = ['active', 'unreachable', 'relocated', 'bankrupt', 'unknown'].includes(businessStatus)
            ? businessStatus
            : 'unreachable';

        // 一般ユーザーからのクライアント申告で「国税庁登記閉鎖(closed)」等の公的登記ステータスを偽装させない
        const validRegistryStatus = auth.isAdmin
            ? (['active', 'closed', 'sole_proprietor', 'unknown'].includes(registryStatus)
                ? registryStatus
                : (!cleanCorpNum && !isCorporateEntityName(trimmedCompanyName) ? 'sole_proprietor' : 'unknown'))
            : (registryStatus === 'sole_proprietor' || (!cleanCorpNum && !isCorporateEntityName(trimmedCompanyName))
                ? 'sole_proprietor'
                : 'unknown');

        const safeCloseDate = auth.isAdmin && typeof registryCloseDate === 'string' && isValidIsoDate(registryCloseDate.trim())
            ? registryCloseDate.trim()
            : null;
        const safeCloseCause = auth.isAdmin && typeof registryCloseCause === 'string'
            ? registryCloseCause.trim().slice(0, 100) || null
            : null;

        const basePayload = {
            company_name: trimmedCompanyName,
            corporate_number: cleanCorpNum || null,
            location: typeof location === 'string' ? location.trim() || null : null,
            invoice_date: invoiceDate ? invoiceDate.trim() : null,
            amount: Math.floor(numAmount),
            due_date: dueDate.trim(),
            payment_status: 'unpaid',
            counterparty_claim: typeof counterpartyClaim === 'string' ? counterpartyClaim.trim().slice(0, 5000) || null : null,
            registered_by_company_id: appUser.company_id,
            evidence_urls: sanitizedEvidenceUrls,
            status: 'pending', // 必ず管理者の事前審査が入る
        };

        const payloadWithStatus = {
            ...basePayload,
            business_status: validBusinessStatus,
            registry_status: validRegistryStatus,
            registry_close_date: safeCloseDate,
            registry_close_cause: safeCloseCause,
        };

        const payloadFull = {
            ...payloadWithStatus,
            is_official: false,
        };

        let { data: newCase, error: insertError } = await supabaseAdmin
            .from('credit_cases')
            .insert([payloadFull])
            .select()
            .single();

        // is_official または新カラムが未適用の場合の後方互換フォールバック
        if (insertError && insertError.message?.includes('column')) {
            console.warn('credit_cases insert retrying without is_official:', insertError.message);
            const retryWithStatus = await supabaseAdmin
                .from('credit_cases')
                .insert([payloadWithStatus])
                .select()
                .single();
            newCase = retryWithStatus.data;
            insertError = retryWithStatus.error;

            if (insertError && insertError.message?.includes('column')) {
                console.warn('credit_cases insert retrying with base payload:', insertError.message);
                const fallbackInsert = await supabaseAdmin
                    .from('credit_cases')
                    .insert([basePayload])
                    .select()
                    .single();
                newCase = fallbackInsert.data;
                insertError = fallbackInsert.error;
            }
        }

        if (insertError) {
            console.error('Credit case insert error:', insertError);
            return NextResponse.json({ error: '未払い企業情報の登録に失敗しました。時間をおいて再度お試しください。' }, { status: 500 });
        }

        // LINE通知（管理者に新規未払い企業登録の審査申請を通知）
        try {
            const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
            const adminUserId = process.env.LINE_ADMIN_USER_ID;

            if (lineToken && adminUserId) {
                const { data: userProfile } = await supabaseAdmin
                    .from('app_users')
                    .select('display_name, companies(name)')
                    .eq('id', user.id)
                    .maybeSingle();

                const messageText = `【MIERIS CREDIT 審査申請通知】\n\n未払い企業情報が新規登録されました。\n\n対象企業: ${trimmedCompanyName}\n未払い金額: ¥${Math.floor(numAmount).toLocaleString()}\n支払期日: ${dueDate.trim()}\n登録企業: ${(userProfile?.companies as any)?.name || '未所属'}\n担当者: ${userProfile?.display_name || '不明'}\n\n管理画面にログインしてエビデンス等の審査を行ってください。`;

                const targetIds = adminUserId.split(',').map((id: string) => id.trim()).filter((id: string) => id);
                await Promise.allSettled(targetIds.map((targetId: string) =>
                    fetch('https://api.line.me/v2/bot/message/push', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${lineToken}`
                        },
                        body: JSON.stringify({
                            to: targetId,
                            messages: [{ type: 'text', text: messageText }]
                        })
                    })
                ));
            }
        } catch (lineErr) {
            console.warn('LINE notification warning:', lineErr);
        }

        return NextResponse.json({ success: true, case: newCase });

    } catch (e: unknown) {
        console.error('Credit case POST error:', e);
        return NextResponse.json({ error: '登録処理中にサーバーエラーが発生しました。' }, { status: 500 });
    }
}
