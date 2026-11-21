import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

export async function GET(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;

        // 1. 全ユーザーを取得（承認済み・承認待ち／利用停止ユーザーを含む）
        const { data: usersData, error: dbError } = await supabaseAdmin
            .from("app_users")
            .select(`
                id,
                role,
                display_name,
                is_approved,
                allowed_plan,
                created_at,
                companies ( id, name, plan_type )
            `)
            .order("created_at", { ascending: false });

        if (dbError) throw dbError;

        // 2. メールアドレスを取得
        const emailMap: Record<string, string> = {};
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                let page = 1;
                const perPage = 1000;
                let hasMore = true;
                while (hasMore) {
                    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
                    if (authError || !authData) break;
                    for (const au of authData.users) {
                        emailMap[au.id] = au.email || "不明";
                    }
                    hasMore = authData.users.length === perPage;
                    page++;
                }
            } catch (e) {
                console.error("Failed to fetch auth users for emails:", e);
            }
        }

        // 3. マージ
        const mergedUsers = (usersData || []).map((u: any) => ({
            ...u,
            email: emailMap[u.id] || null
        }));

        return NextResponse.json({ users: mergedUsers });
    } catch (error) {
        console.error("Fetch users error:", error);
        return NextResponse.json({ error: "ユーザー一覧の取得に失敗しました。" }, { status: 500 });
    }
}
