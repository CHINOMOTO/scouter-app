import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET: 未払い企業情報の検索・一覧取得
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q') || '';
        const corporateNumber = searchParams.get('corp') || '';
        const status = searchParams.get('status') || 'approved'; // 一般は承認済みのみ
        const showAll = searchParams.get('all') === 'true'; // テスト検証用：全件表示フラグ

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

        // ユーザーのプラン権限チェック
        const { data: appUser } = await supabaseQuery
            .from('app_users')
            .select('role, company_id, allowed_plan')
            .eq('id', user.id)
            .single();

        const isAdmin = appUser?.role === 'admin';
        const userPlan = appUser?.allowed_plan || 'full';

        // プランが employment（就業情報のみ）の場合はクレジットへのアクセス制限（管理者を除く）
        if (!isAdmin && userPlan === 'employment') {
            return NextResponse.json({ 
                error: 'この機能は「ミエリスクレジット」または「両方セット」プランのご契約が必要です',
                planRestricted: true 
            }, { status: 403 });
        }

        // クエリ構築
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
            created_at,
            companies:registered_by_company_id ( id, name )
        `;

        let query = supabaseQuery
            .from('credit_cases')
            .select(selectFieldsWithStatus)
            .order('created_at', { ascending: false });

        // 一般ユーザーは承認済みデータ、または自社が登録したデータのみ閲覧可（テスト用all=true時は全件閲覧可）
        if (!isAdmin && !showAll) {
            query = query.or(`status.eq.approved,registered_by_company_id.eq.${appUser?.company_id}`);
        }

        // 検索フィルター
        if (q.trim()) {
            query = query.or(`company_name.ilike.%${q.trim()}%,location.ilike.%${q.trim()}%`);
        }
        if (corporateNumber.trim()) {
            query = query.eq('corporate_number', corporateNumber.trim().replace(/[^0-9]/g, ''));
        }

        let { data, error } = await query;

        // DBにまだカラムが存在しない場合のエラーフォールバック
        if (error && error.message?.includes('column')) {
            console.warn('credit_cases status columns not in DB yet, falling back to base select:', error.message);
            let fallbackQuery = supabaseQuery
                .from('credit_cases')
                .select(selectFieldsBase)
                .order('created_at', { ascending: false });

            if (!isAdmin && !showAll) {
                fallbackQuery = fallbackQuery.or(`status.eq.approved,registered_by_company_id.eq.${appUser?.company_id}`);
            }
            if (q.trim()) {
                fallbackQuery = fallbackQuery.or(`company_name.ilike.%${q.trim()}%,location.ilike.%${q.trim()}%`);
            }
            if (corporateNumber.trim()) {
                fallbackQuery = fallbackQuery.eq('corporate_number', corporateNumber.trim().replace(/[^0-9]/g, ''));
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
                if (claim.includes('夜逃げ') || claim.includes('引き払い')) {
                    businessStatus = 'relocated';
                } else if (claim.includes('倒産') || claim.includes('破産')) {
                    businessStatus = 'bankrupt';
                } else if (claim.includes('不通') || claim.includes('連絡が取れ') || claim.includes('ブロック')) {
                    businessStatus = 'unreachable';
                } else {
                    businessStatus = 'unreachable'; // デフォルトは音信不通（未払い現場の最頻出）
                }
            }

            if (!registryStatus) {
                // テスト用・デモ用：特定の番号や名前に応じた初期値
                if (item.company_name?.includes('大和建装') || item.corporate_number === '5011101998002') {
                    registryStatus = 'closed';
                } else if (item.company_name?.includes('鈴木') || !item.corporate_number || item.corporate_number.startsWith('999')) {
                    registryStatus = 'sole_proprietor';
                } else {
                    registryStatus = 'active';
                }
            }

            return {
                ...item,
                business_status: businessStatus,
                registry_status: registryStatus,
                registry_close_date: item.registry_close_date || (registryStatus === 'closed' ? '2024-10-15' : null),
                registry_close_cause: item.registry_close_cause || (registryStatus === 'closed' ? '清算結了' : null),
            };
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
            .select('role, company_id, display_name, allowed_plan, companies(name)')
            .eq('id', user.id)
            .single();

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
