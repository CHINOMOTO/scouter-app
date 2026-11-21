import { NextResponse } from 'next/server';
import { detectOfficialSource, isCorporateEntityName } from '@/lib/officialSources';
import { authenticateApiRequest, isValidUserEvidencePath, isSafeStorageEvidencePath } from '@/lib/apiAuth';

// GET: 詳細情報取得
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        // 認証・承認・CREDITプランチェック
        const auth = await authenticateApiRequest(request, { requirePlan: 'credit' });
        if (!auth.ok) return auth.response;

        const { appUser, isAdmin, supabaseAdmin } = auth;

        const { data: creditCase, error } = await supabaseAdmin
            .from('credit_cases')
            .select(`
                *,
                companies:registered_by_company_id ( id, name )
            `)
            .eq('id', id)
            .maybeSingle();

        if (error || !creditCase) {
            return NextResponse.json({ error: '対象データが見つかりません。' }, { status: 404 });
        }

        const isOwnCompany = Boolean(appUser.company_id && creditCase.registered_by_company_id === appUser.company_id);
        const isApproved = creditCase.status === 'approved';

        // 権限チェック: 管理者か、自社登録案件か、承認済み案件のみ閲覧可能
        if (!isAdmin && !isOwnCompany && !isApproved) {
            return NextResponse.json({ error: 'アクセス権限がありません。他社の審査中・却下データは閲覧できません。' }, { status: 403 });
        }

        // 公的機関（省庁・裁判所・官報）データかどうかの判定および公表元特定の取得
        const officialSource = detectOfficialSource(creditCase);
        const isOfficialData = officialSource.isOfficial;
        const claim = creditCase.counterparty_claim || '';

        // 営業実態・公的登記ステータスの補完
        let businessStatus = creditCase.business_status;
        let registryStatus = creditCase.registry_status;

        const isCorporate = isCorporateEntityName(creditCase.company_name);
        const isSoleProprietorEntity =
            creditCase.company_name?.includes('個人事業主') ||
            (!creditCase.corporate_number && !isCorporate) ||
            creditCase.corporate_number?.startsWith('999');

        if (isOfficialData) {
            businessStatus = null;
            if (isSoleProprietorEntity) {
                registryStatus = 'sole_proprietor';
            } else if (!registryStatus || registryStatus === 'unknown') {
                if (claim.includes('破産') || claim.includes('清算') || claim.includes('閉鎖登記')) {
                    registryStatus = 'closed';
                } else {
                    registryStatus = 'unknown';
                }
            }
        } else {
            if (!businessStatus) {
                if (claim.includes('夜逃げ') || claim.includes('引き払い') || claim.includes('所在不明')) {
                    businessStatus = 'relocated';
                } else if (claim.includes('倒産') || claim.includes('破産')) {
                    businessStatus = 'bankrupt';
                } else if (claim.includes('不通') || claim.includes('連絡が取れ') || claim.includes('ブロック')) {
                    businessStatus = 'unreachable';
                } else if (creditCase.payment_status === 'resolved') {
                    businessStatus = 'active';
                } else {
                    businessStatus = null;
                }
            }

            if (!registryStatus) {
                if (creditCase.company_name?.includes('個人事業主') || (!creditCase.corporate_number && !isCorporate)) {
                    registryStatus = 'sole_proprietor';
                } else if (businessStatus === 'bankrupt' || claim.includes('清算') || claim.includes('閉鎖登記')) {
                    registryStatus = 'closed';
                } else {
                    // 未照合の法人を根拠なく「登記中（存続）」と断定しない
                    registryStatus = 'unknown';
                }
            }
        }

        // 証拠資料は管理者・自社・公的記録のみ閲覧可能
        // admin_notes は承認時の内部メモ漏洩を防ぐため、非管理者には「公的記録」または「自社却下案件（却下理由）」のみ開示
        const canViewEvidence = isAdmin || isOwnCompany || isOfficialData;
        const canViewAdminNotes = isAdmin || isOfficialData || (isOwnCompany && creditCase.status === 'rejected');

        const sanitizedCase = {
            ...creditCase,
            evidence_urls: canViewEvidence ? (creditCase.evidence_urls || []) : [],
            admin_notes: canViewAdminNotes ? creditCase.admin_notes : null,
        };

        // サーバー側（Service Role）で証拠資料の署名付きURLを生成（厳格化Storage RLS対応＋公的外部URL対応）
        const evidenceFiles: Array<{ path: string; signedUrl: string; type: 'image' | 'pdf' | 'other'; name: string }> = [];
        if (canViewEvidence && Array.isArray(creditCase.evidence_urls) && creditCase.evidence_urls.length > 0) {
            for (const rawPath of creditCase.evidence_urls) {
                if (typeof rawPath !== 'string' || !rawPath.trim()) continue;
                const cleanPath = rawPath.trim();

                if (/^https?:\/\//i.test(cleanPath)) {
                    // 外部URLの直接展開は公的機関データのみ許可（民間案件への悪性外部URL注入を防止）
                    if (!isOfficialData) continue;
                    const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(cleanPath);
                    const isPdf = /\.pdf(\?|$)/i.test(cleanPath);
                    evidenceFiles.push({
                        path: cleanPath,
                        signedUrl: cleanPath,
                        type: isImage ? 'image' : isPdf ? 'pdf' : 'other',
                        name: cleanPath.split('/').pop()?.split('?')[0] || '公的公表ソース'
                    });
                    continue;
                }

                // パストラバーサル防止
                if (cleanPath.includes('..') || cleanPath.includes('\\')) continue;

                let signedUrl: string | null = null;
                // 統一バケット（case-evidence）を優先し、過去データ互換のため case_attachments にフォールバック
                const { data: primarySigned } = await supabaseAdmin.storage
                    .from('case-evidence')
                    .createSignedUrl(cleanPath, 3600);
                if (primarySigned?.signedUrl) {
                    signedUrl = primarySigned.signedUrl;
                } else {
                    const { data: fallbackSigned } = await supabaseAdmin.storage
                        .from('case_attachments')
                        .createSignedUrl(cleanPath, 3600);
                    if (fallbackSigned?.signedUrl) {
                        signedUrl = fallbackSigned.signedUrl;
                    }
                }

                if (signedUrl) {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(cleanPath);
                    const isPdf = /\.pdf$/i.test(cleanPath);
                    evidenceFiles.push({
                        path: cleanPath,
                        signedUrl,
                        type: isImage ? 'image' : isPdf ? 'pdf' : 'other',
                        name: cleanPath.split('/').pop() || 'evidence_file'
                    });
                }
            }
        }

        const enrichedCase = {
            ...sanitizedCase,
            is_official_record: isOfficialData,
            official_source: officialSource,
            business_status: businessStatus,
            registry_status: registryStatus
        };

        return NextResponse.json({ case: enrichedCase, evidenceFiles });

    } catch (e: unknown) {
        console.error('Credit case detail GET error:', e);
        return NextResponse.json({ error: '詳細データの取得中にサーバーエラーが発生しました。' }, { status: 500 });
    }
}

// PATCH: ステータス更新（解決報告・追加資料の再審査申請など）
export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        // 認証・承認・CREDITプランチェック（リクエスト解析より先に認証）
        const auth = await authenticateApiRequest(request, { requirePlan: 'credit' });
        if (!auth.ok) return auth.response;

        const { user, appUser, isAdmin, supabaseAdmin } = auth;
        const body = await request.json();

        const { data: creditCase, error: fetchErr } = await supabaseAdmin
            .from('credit_cases')
            .select('*, companies:registered_by_company_id ( id, name )')
            .eq('id', id)
            .maybeSingle();

        if (fetchErr || !creditCase) {
            return NextResponse.json({ error: '対象データが見つかりません。' }, { status: 404 });
        }

        // 公的機関の確定公表記録は一般ユーザーによる更新不可
        const sourceInfo = detectOfficialSource(creditCase as any);
        if (!isAdmin && sourceInfo.isOfficial) {
            return NextResponse.json({ error: '公的機関の公表記録は更新できません。' }, { status: 403 });
        }

        // 所有者または管理者のみ更新可能
        const isOwner = Boolean(appUser.company_id) && creditCase.registered_by_company_id === appUser.company_id;
        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: '自社が登録した案件のみ更新できます。' }, { status: 403 });
        }

        const updateData: Record<string, any> = {};

        // 承認済み案件の場合、一般ユーザーは未払い中の解決報告（入金完了・遅延日数）のみ1回許可
        if (!isAdmin && creditCase.status === 'approved') {
            if (creditCase.payment_status === 'resolved') {
                return NextResponse.json(
                    { error: 'すでに解決済み（入金完了）として報告されています。修正が必要な場合は運営事務局へお問い合わせください。' },
                    { status: 400 }
                );
            }
            if (body.paymentStatus !== 'resolved') {
                return NextResponse.json(
                    { error: '承認済み案件は解決報告（入金完了）のみ実行できます。' },
                    { status: 403 }
                );
            }
            updateData.payment_status = 'resolved';
            if (body.resolvedDelayDays !== undefined) {
                const days = Number(body.resolvedDelayDays);
                if (!Number.isFinite(days) || days < 0 || days > 36500) {
                    return NextResponse.json({ error: '遅延日数が不正です。' }, { status: 400 });
                }
                updateData.resolved_delay_days = Math.floor(days);
            }
        } else {
            // 未承認・却下案件に対して一般ユーザーによる解決報告（入金完了）は不可（M-1）
            if (body.paymentStatus !== undefined) {
                if (!isAdmin) {
                    return NextResponse.json(
                        { error: '承認済み（公開中）の案件のみ解決報告を実行できます。' },
                        { status: 403 }
                    );
                }
                if (!['unpaid', 'resolved'].includes(body.paymentStatus)) {
                    return NextResponse.json({ error: '入金ステータスが不正です。' }, { status: 400 });
                }
                updateData.payment_status = body.paymentStatus;
            }
            if (body.resolvedDelayDays !== undefined) {
                if (!isAdmin) {
                    return NextResponse.json(
                        { error: '承認済み（公開中）の案件のみ解決報告を実行できます。' },
                        { status: 403 }
                    );
                }
                const days = Number(body.resolvedDelayDays);
                if (!Number.isFinite(days) || days < 0 || days > 36500) {
                    return NextResponse.json({ error: '遅延日数が不正です。' }, { status: 400 });
                }
                updateData.resolved_delay_days = Math.floor(days);
            }
            if (body.counterpartyClaim !== undefined) {
                if (typeof body.counterpartyClaim !== 'string') {
                    return NextResponse.json({ error: '入力形式が不正です。' }, { status: 400 });
                }
                updateData.counterparty_claim = body.counterpartyClaim.slice(0, 5000);
            }
            if (body.evidenceUrls !== undefined) {
                if (!Array.isArray(body.evidenceUrls)) {
                    return NextResponse.json({ error: '添付資料の形式が不正です。' }, { status: 400 });
                }
                const cleanUrls: string[] = body.evidenceUrls.filter(
                    (u: unknown): u is string => typeof u === 'string' && u.trim().length > 0
                );
                if (!isAdmin && cleanUrls.length === 0) {
                    return NextResponse.json({ error: '裏付け資料を1点以上添付してください。' }, { status: 400 });
                }
                if (cleanUrls.length > 10) {
                    return NextResponse.json({ error: '添付資料は最大10件までです。' }, { status: 400 });
                }
                // 既存の添付パスか、ログインユーザー自身がアップロードした安全なパスのみ許可（他社ファイルIDOR・外部URL注入防止）
                const existingUrlSet = new Set<string>(
                    Array.isArray(creditCase.evidence_urls)
                        ? creditCase.evidence_urls.filter((u: unknown): u is string => typeof u === 'string')
                        : []
                );
                const hasInvalidUrl = cleanUrls.some((u: string) => {
                    if (existingUrlSet.has(u)) return false;
                    return isAdmin ? !isSafeStorageEvidencePath(u) : !isValidUserEvidencePath(u, user.id);
                });
                if (hasInvalidUrl) {
                    return NextResponse.json({ error: '添付資料のファイルパスが不正です。再度アップロードしてください。' }, { status: 400 });
                }
                updateData.evidence_urls = cleanUrls;
            }
            if (body.resubmit === true) {
                const effectiveEvidence = Array.isArray(updateData.evidence_urls)
                    ? updateData.evidence_urls
                    : (Array.isArray(creditCase.evidence_urls) ? creditCase.evidence_urls : []);
                if (!isAdmin && effectiveEvidence.length === 0) {
                    return NextResponse.json({ error: '再審査申請には裏付け資料が1点以上必要です。' }, { status: 400 });
                }
                updateData.status = 'pending';
                // 再審査申請時は過去の却下理由をクリアする（M-1）
                updateData.admin_notes = null;
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: '更新対象のデータがありません。' }, { status: 400 });
        }

        const { data: updatedCase, error: updateErr } = await supabaseAdmin
            .from('credit_cases')
            .update(updateData)
            .eq('id', id)
            .select()
            .maybeSingle();

        if (updateErr) {
            console.error('Credit case detail PATCH DB error:', updateErr);
            return NextResponse.json({ error: 'データの更新に失敗しました。' }, { status: 500 });
        }
        if (!updatedCase) {
            return NextResponse.json({ error: '対象データが見つかりません。' }, { status: 404 });
        }

        // レスポンス返却時にも承認時の内部管理者メモを非管理者へ露出させない
        const canViewAdminNotes = isAdmin || sourceInfo.isOfficial || (isOwner && updatedCase.status === 'rejected');
        const safeUpdatedCase = {
            ...updatedCase,
            admin_notes: canViewAdminNotes ? updatedCase.admin_notes : null,
        };

        return NextResponse.json({ success: true, case: safeUpdatedCase });

    } catch (e: unknown) {
        console.error('Credit case detail PATCH error:', e);
        return NextResponse.json({ error: '更新処理中にサーバーエラーが発生しました。' }, { status: 500 });
    }
}
