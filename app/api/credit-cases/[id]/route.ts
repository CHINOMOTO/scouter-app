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

        // 公的機関（省庁・裁判所・官報）データかどうかの判定
        const claim = creditCase.counterparty_claim || '';
        const isOfficialData = claim.includes('【厚生労働省') || 
                               claim.includes('【公正取引委員会') || 
                               claim.includes('【国土交通省') || 
                               claim.includes('【東京都知事') || 
                               claim.includes('【消費者庁') || 
                               claim.includes('【官報公告') ||
                               (Array.isArray(creditCase.evidence_urls) && creditCase.evidence_urls.some((u: string) => typeof u === 'string' && u.includes('.go.jp')));

        // 営業実態・公的登記ステータスの補完
        let businessStatus = creditCase.business_status;
        let registryStatus = creditCase.registry_status;

        if (isOfficialData) {
            // 公的機関データの場合、民間の「音信不通（LINEブロック）」のような被害報告ステータスは付与しない
            businessStatus = null;
            if (claim.includes('破産') || claim.includes('清算')) {
                registryStatus = 'closed';
            } else if (!creditCase.corporate_number) {
                registryStatus = 'sole_proprietor';
            } else {
                registryStatus = 'active';
            }
        } else {
            // 加盟企業からの民間未払い被害登録の場合のみ判定
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
                if (!creditCase.corporate_number) {
                    registryStatus = 'sole_proprietor';
                } else if (businessStatus === 'bankrupt' || claim.includes('清算')) {
                    registryStatus = 'closed';
                } else {
                    registryStatus = 'active';
                }
            }
        }

        const enrichedCase = {
            ...creditCase,
            is_official_record: isOfficialData,
            business_status: businessStatus,
            registry_status: registryStatus
        };

        return NextResponse.json({ case: enrichedCase });

    } catch (e: any) {
        console.error('Credit case detail GET error:', e);
        return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
    }
}

// PATCH: ステータス更新（解決報告など）
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

        const { data: creditCase, error: fetchErr } = await supabaseAdmin
            .from('credit_cases')
            .select('registered_by_company_id, companies:registered_by_company_id ( id, name )')
            .eq('id', id)
            .single();

        if (fetchErr || !creditCase) {
            return NextResponse.json({ error: '対象データが見つかりません' }, { status: 404 });
        }

        const updateData: any = {};
        if (body.paymentStatus) updateData.payment_status = body.paymentStatus;
        if (body.resolvedDelayDays !== undefined) updateData.resolved_delay_days = body.resolvedDelayDays;
        if (body.counterpartyClaim !== undefined) updateData.counterparty_claim = body.counterpartyClaim;

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
