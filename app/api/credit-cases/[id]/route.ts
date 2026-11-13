import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { detectOfficialSource, isCorporateEntityName } from '@/lib/officialSources';

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

        // 他社が閲覧する場合は evidence_urls と admin_notes（却下理由等）をマスクする
        const sanitizedCase = (!isAdmin && !isOwnCompany)
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

        // ユーザーの権限・所属会社チェック
        const { data: appUser } = await supabaseAdmin
            .from('app_users')
            .select('role, company_id, is_approved')
            .eq('id', user.id)
            .single();

        if (!appUser || appUser.is_approved === false) {
            return NextResponse.json({ error: '承認されたアカウントが必要です' }, { status: 403 });
        }

        const { data: creditCase, error: fetchErr } = await supabaseAdmin
            .from('credit_cases')
            .select('company_name, registered_by_company_id, companies:registered_by_company_id ( id, name )')
            .eq('id', id)
            .single();

        if (fetchErr || !creditCase) {
            return NextResponse.json({ error: '対象データが見つかりません' }, { status: 404 });
        }

        // 所有者または管理者のみ更新可能
        const isAdmin = appUser.role === 'admin';
        const isOwner = appUser.company_id && creditCase.registered_by_company_id === appUser.company_id;
        if (!isAdmin && !isOwner) {
            return NextResponse.json({ error: '自社が登録した案件のみ更新できます' }, { status: 403 });
        }

        const updateData: any = {};
        if (body.paymentStatus) updateData.payment_status = body.paymentStatus;
        if (body.resolvedDelayDays !== undefined) updateData.resolved_delay_days = body.resolvedDelayDays;
        if (body.counterpartyClaim !== undefined) updateData.counterparty_claim = body.counterpartyClaim;
        if (Array.isArray(body.evidenceUrls)) updateData.evidence_urls = body.evidenceUrls;
        if (body.resubmit === true) {
            updateData.status = 'pending';
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
