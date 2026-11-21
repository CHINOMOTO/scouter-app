import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

export async function GET(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;

        // 1. 監査ログの取得 (最新500件)
        const { data: auditLogs, error: logError } = await supabaseAdmin
            .from("audit_logs")
            .select("id, user_id, company_id, action_type, target_id, ip_address, created_at")
            .order("created_at", { ascending: false })
            .limit(500);

        if (logError) throw logError;

        const logs = auditLogs || [];

        // ログに出現するIDのみに絞り込んで参照テーブルを取得（全件フルスキャン回避）
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const userIds = Array.from(new Set(logs.map(l => l.user_id).filter((id): id is string => Boolean(id))));
        const companyIds = Array.from(new Set(logs.map(l => l.company_id).filter((id): id is string => Boolean(id))));
        const caseIds = Array.from(new Set(
            logs.filter(l => l.action_type === "VIEW_CASE" && l.target_id && UUID_RE.test(l.target_id)).map(l => l.target_id as string)
        ));
        const creditIds = Array.from(new Set(
            logs.filter(l => l.action_type === "VIEW_CREDIT" && l.target_id && UUID_RE.test(l.target_id)).map(l => l.target_id as string)
        ));

        // 2. ユーザープロファイル・企業・メール・対象案件の関連マップ作成
        const [usersRes, companiesRes, authUsersRes, casesRes, creditRes] = await Promise.all([
            userIds.length > 0
                ? supabaseAdmin.from("app_users").select("id, display_name, role").in("id", userIds)
                : Promise.resolve({ data: [] as Array<{ id: string; display_name: string | null; role: string | null }> }),
            companyIds.length > 0
                ? supabaseAdmin.from("companies").select("id, name").in("id", companyIds)
                : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
            supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
            caseIds.length > 0
                ? supabaseAdmin.from("blacklist_cases").select("id, full_name").in("id", caseIds)
                : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
            creditIds.length > 0
                ? supabaseAdmin.from("credit_cases").select("id, company_name").in("id", creditIds)
                : Promise.resolve({ data: [] as Array<{ id: string; company_name: string }> })
        ]);

        const userMap = new Map((usersRes.data || []).map(u => [u.id, u]));
        const compMap = new Map((companiesRes.data || []).map(c => [c.id, c.name]));
        const emailMap = new Map((authUsersRes.data?.users || []).map(u => [u.id, u.email]));
        const caseMap = new Map((casesRes.data || []).map(c => [c.id, c.full_name]));
        const creditMap = new Map((creditRes.data || []).map(c => [c.id, c.company_name]));

        // 1000件超のAuthユーザー環境でも取りこぼさないよう未解決のuser_idのみ個別取得
        const missingAuthUserIds = userIds.filter(uid => !emailMap.has(uid));
        if (missingAuthUserIds.length > 0) {
            await Promise.all(
                missingAuthUserIds.map(async (uid) => {
                    try {
                        const { data: uData } = await supabaseAdmin.auth.admin.getUserById(uid);
                        if (uData?.user?.email) {
                            emailMap.set(uid, uData.user.email);
                        }
                    } catch {
                        // 削除済みユーザー等
                    }
                })
            );
        }

        // 3. ログに詳細情報をマージ
        const enrichedLogs = logs.map(log => {
            const uProfile = log.user_id ? userMap.get(log.user_id) : null;
            const userEmail = log.user_id ? (emailMap.get(log.user_id) || "削除済みユーザー") : "削除済みユーザー";
            const companyName = log.company_id ? (compMap.get(log.company_id) || "所属なし") : "所属なし";

            let targetDetail = log.target_id || "-";
            if (log.action_type === "VIEW_CASE") {
                targetDetail = caseMap.has(log.target_id)
                    ? `対象者: ${caseMap.get(log.target_id)} (ID: ${log.target_id.slice(0, 8)}...)`
                    : `対象者: ${log.target_id}`;
            } else if (log.action_type === "VIEW_CREDIT") {
                targetDetail = creditMap.has(log.target_id)
                    ? `対象企業: ${creditMap.get(log.target_id)} (ID: ${log.target_id.slice(0, 8)}...)`
                    : `対象企業: ${log.target_id}`;
            }

            return {
                id: log.id,
                user_id: log.user_id,
                user_name: uProfile?.display_name || (log.user_id ? userEmail.split("@")[0] : "削除済みユーザー"),
                user_email: userEmail,
                user_role: uProfile?.role || "viewer",
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
    } catch (err) {
        console.error("Admin Audit API Error:", err);
        return NextResponse.json({ error: "監査ログの取得に失敗しました。" }, { status: 500 });
    }
}
