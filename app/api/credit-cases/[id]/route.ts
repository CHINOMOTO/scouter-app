import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { detectOfficialSource, isCorporateEntityName } from '@/lib/officialSources';
import { authenticateApiRequest } from '@/lib/apiAuth';

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

        // ユーザーの承認状態・プラン・所属企業を確認
        const { data: appUser } = await supabaseAdmin
            .from('app_users')
            .select('role, company_id, allowed_plan, is_approved')
            .eq('id', user.id)
            .single();

        if (!appUser || appUser.is_approved === false) {
            return NextResponse.json({ error: '承認されたアカウントが必要です' }, { status: 403 });
        }

        const isAdmin = appUser.role === 'admin';
        const userPlan = appUser.allowed_plan || 'full';

        if (!isAdmin && userPlan === 'employment') {
            return NextResponse.json({ error: 'この機能は「ミエリスクレジット」または「両方セット」プランのご契約が必要です', planRestricted: true }, { status: 403 });
        }

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

        const isOwnCompany = appUser.company_id && creditCase.registered_by_company_id === appUser.company_id;
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

        if (isOfficialData) {
            businessStatus = null;
            if (claim.includes('破産') || claim.includes('清算')) {
                registryStatus = 'closed';
            } else if (!creditCase.corporate_number && !isCorporate) {
                registryStatus = 'sole_proprietor';
            } else {
                registryStatus = 'active';
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
                } else if (businessStatus === 'bankrupt' || claim.includes('清算')) {
                    registryStatus = 'closed';
                } else {
                    registryStatus = 'active';
                }
            }
        }

        // 民間登録案件を他社が閲覧する場合のみ evidence_urls と admin_notes（却下理由等）をマスクする
        // ※公的処分データ（isOfficialData）は違反法条・事案概要・公表元URLを全加盟企業に公開する
        const sanitizedCase = (!isAdmin && !isOwnCompany && !isOfficialData)
            ? { ...creditCase, evidence_urls: [], admin_notes: null }
            : creditCase;

        const enrichedCase = {
            ...sanitizedCase,
            is_official_record: isOfficialData,
            official_source: officialSource,
            business_status: businessStatus,
            registry_status: registryStatus
        };

        return NextResponse.json({ case: enrichedCase });

    } catch (e: any) {
        console.error('Credit case detail GET error:', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}

// PATCH: ステータス更新（解決報告・追加資料の再審査申請など）
export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await request.json();

        // 認証・承認・CREDITプランチェック
        const auth = await authenticateApiRequest(request, { requirePlan: 'credit' });
        if (!auth.ok) return auth.response;

        const { appUser, isAdmin, supabaseAdmin } = auth;

        const { data: creditCase, error: fetchErr } = await supabaseAdmin
            .from('credit_cases')
            .select('company_name, registered_by_company_id, status, counterparty_claim, admin_notes, evidence_urls, companies:registered_by_company_id ( id, name )')
            .eq('id', id)
            .single();

        if (fetchErr || !creditCase) {
            return NextResponse.json({ error: '対象データが見つかりません' }, { status: 404 });
        }

        // 公的機関の確定公表記録は一般ユーザーによる更新不可
        const sourceInfo = detectOfficialSource(creditCase as any);
        if (!isAdmin && sourceInfo.isOfficial) {
            return NextResponse.json({ error: '公的機関の公表記録は更新できません' }, { status: 403 });
        }

        // 所有者または管理者のみ更新可能
        const isOwner = Boolean(appUser.company_id) && creditCase.registered_by_company_id === appUser.company_id;
        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: '自社が登録した案件のみ更新できます' }, { status: 403 });
        }

        const updateData: any = {};

        // 承認済み案件の場合、一般ユーザーは解決報告（入金完了・遅延日数）のみ許可
        if (!isAdmin && creditCase.status === 'approved') {
            if (body.paymentStatus !== 'resolved') {
                return NextResponse.json(
                    { error: '承認済み案件は解決報告（入金完了）のみ実行できます' },
                    { status: 403 }
                );
            }
            updateData.payment_status = 'resolved';
            if (body.resolvedDelayDays !== undefined) {
                const days = Number(body.resolvedDelayDays);
                if (!Number.isFinite(days) || days < 0 || days > 36500) {
                    return NextResponse.json({ error: '遅延日数が不正です' }, { status: 400 });
                }
                updateData.resolved_delay_days = Math.floor(days);
            }
        } else {
            if (body.paymentStatus !== undefined) {
                if (!['unpaid', 'resolved'].includes(body.paymentStatus)) {
                    return NextResponse.json({ error: '入金ステータスが不正です' }, { status: 400 });
                }
                updateData.payment_status = body.paymentStatus;
            }
            if (body.resolvedDelayDays !== undefined) {
                const days = Number(body.resolvedDelayDays);
                if (!Number.isFinite(days) || days < 0 || days > 36500) {
                    return NextResponse.json({ error: '遅延日数が不正です' }, { status: 400 });
                }
                updateData.resolved_delay_days = Math.floor(days);
            }
            if (body.counterpartyClaim !== undefined) {
                if (typeof body.counterpartyClaim !== 'string') {
                    return NextResponse.json({ error: '入力形式が不正です' }, { status: 400 });
                }
                updateData.counterparty_claim = body.counterpartyClaim;
            }
            if (Array.isArray(body.evidenceUrls)) {
                updateData.evidence_urls = body.evidenceUrls.filter((u: unknown) => typeof u === 'string');
            }
            if (body.resubmit === true) {
                updateData.status = 'pending';
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: '更新対象のデータがありません' }, { status: 400 });
        }

        const { data: updatedCase, error: updateErr } = await supabaseAdmin
            .from('credit_cases')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateErr) {
            return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, case: updatedCase });

    } catch (e: any) {
        console.error('Credit case detail PATCH error:', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}
