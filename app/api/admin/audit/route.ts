import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceRoleKey) {
            return NextResponse.json({ error: "Server configuration error: Service role key missing" }, { status: 500 });
        }

        // 1. ユーザー認証検証
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });
        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        // 2. 管理者権限チェック
        const { data: appUser } = await supabaseAdmin
            .from("app_users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!appUser || appUser.role !== 'admin') {
            return NextResponse.json({ error: "Forbidden: Admin privileges required." }, { status: 403 });
        }

        // 3. 監査ログの取得 (最新500件)
        const { data: auditLogs, error: logError } = await supabaseAdmin
            .from("audit_logs")
            .select("id, user_id, company_id, action_type, target_id, ip_address, created_at")
            .order("created_at", { ascending: false })
            .limit(500);

        if (logError) throw logError;

        // 4. ユーザープロファイル・企業・メールの関連マップ作成
        const [usersRes, companiesRes, authUsersRes, casesRes, creditRes] = await Promise.all([
            supabaseAdmin.from("app_users").select("id, display_name, role"),
            supabaseAdmin.from("companies").select("id, name"),
            supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
            supabaseAdmin.from("blacklist_cases").select("id, full_name"),
            supabaseAdmin.from("credit_cases").select("id, company_name")
        ]);

        const userMap = new Map((usersRes.data || []).map(u => [u.id, u]));
        const compMap = new Map((companiesRes.data || []).map(c => [c.id, c.name]));
        const emailMap = new Map((authUsersRes.data?.users || []).map(u => [u.id, u.email]));
        const caseMap = new Map((casesRes.data || []).map(c => [c.id, c.full_name]));
        const creditMap = new Map((creditRes.data || []).map(c => [c.id, c.company_name]));

        // 5. ログに詳細情報をマージ
        const enrichedLogs = (auditLogs || []).map(log => {
            const uProfile = userMap.get(log.user_id);
            const userEmail = emailMap.get(log.user_id) || "不明";
            const companyName = compMap.get(log.company_id) || "所属なし";

            let targetDetail = log.target_id || "-";
            if (log.action_type === "VIEW_CASE" && caseMap.has(log.target_id)) {
                targetDetail = `対象者: ${caseMap.get(log.target_id)} (ID: ${log.target_id.slice(0, 8)}...)`;
            } else if (log.action_type === "VIEW_CREDIT" && creditMap.has(log.target_id)) {
                targetDetail = `対象企業: ${creditMap.get(log.target_id)} (ID: ${log.target_id.slice(0, 8)}...)`;
            }

            return {
                id: log.id,
                user_id: log.user_id,
                user_name: uProfile?.display_name || userEmail.split("@")[0] || "不明",
                user_email: userEmail,
                user_role: uProfile?.role || "user",
                company_id: log.company_id,
                company_name: companyName,
                action_type: log.action_type,
                target_id: log.target_id,
                target_detail: targetDetail,
                ip_address: log.ip_address || "不明",
                created_at: log.created_at
            };
        });

        return NextResponse.json({ logs: enrichedLogs, total: enrichedLogs.length });

    } catch (err: any) {
        console.error("Admin Audit API Error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
