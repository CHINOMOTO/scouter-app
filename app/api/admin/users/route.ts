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

        // ユーザー用クライアント（トークン検証用）
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Service Role Keyがある場合はAdmin Client経由で全データ取得
        // ない場合はUser Client経由（RLSに従う）
        const supabaseQuery = supabaseServiceRoleKey
            ? createClient(supabaseUrl, supabaseServiceRoleKey)
            : supabaseUser;

        // 権限チェック
        const { data: appUser } = await supabaseQuery
            .from("app_users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!appUser || appUser.role !== 'admin') {
            return NextResponse.json({ error: "Forbidden: Admin privileges required." }, { status: 403 });
        }

        // 1. Fetch from app_users
        const { data: usersData, error: dbError } = await supabaseQuery
            .from("app_users")
            .select(`
                id,
                role,
                display_name,
                is_approved,
                allowed_plan,
                companies ( id, name, plan_type )
            `)
            .eq("is_approved", true);

        if (dbError) throw dbError;

        // 2. メールアドレスの取得を試みる（Service Role Keyがある場合のみ）
        let emailMap: Record<string, string> = {};
        if (supabaseServiceRoleKey) {
            try {
                const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
                // ページネーションで全ユーザーを取得（デフォルトは50件まで）
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
                // メールアドレス取得に失敗しても処理は継続
            }
        }

        // 3. Merge data
        const mergedUsers = usersData?.map((u: any) => ({
            ...u,
            email: emailMap[u.id] || null
        }));

        return NextResponse.json({ users: mergedUsers });

    } catch (error: any) {
        console.error("Fetch users error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
