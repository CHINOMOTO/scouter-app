import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(
    request: Request,
    context: any
) {
    try {
        const params = await context.params;
        const { userId } = params;
        const body = await request.json();
        const { role } = body;

        if (role !== 'admin' && role !== 'viewer') {
            return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
        }

        // 1. Authorizationヘッダーからトークンを取得
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        // ユーザー用クライアント（トークン検証用）
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        // 管理者権限クライアント（実際のデータ操作用）
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        // 2. トークンからユーザー情報を取得
        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 3. 実行者が管理者権限を持っているかチェック
        const { data: appUser } = await supabaseAdmin
            .from("app_users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!appUser || appUser.role !== 'admin') {
            return NextResponse.json({ error: "Forbidden: Admin privileges required." }, { status: 403 });
        }

        // 4. 管理者を降格する場合の最後の1人チェック（誤操作で管理者が0人になるのを防ぐ）
        if (role === 'viewer') {
            const { count } = await supabaseAdmin
                .from('app_users')
                .select('*', { count: 'exact', head: true })
                .eq('role', 'admin');
            
            // 降格対象が実行者自身で、かつ管理者が1人しかいない場合はエラー
            if (userId === user.id && count && count <= 1) {
                 return NextResponse.json({ error: "Cannot demote the last remaining admin." }, { status: 400 });
            }
        }

        // 5. 権限の更新 (app_users)
        const { error: updateError } = await supabaseAdmin
            .from("app_users")
            .update({ role })
            .eq("id", userId);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // 6. Auth(Supabase認証)の app_metadata.role も同期
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        const currentAppMetadata = existingUser?.user?.app_metadata || {};
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            app_metadata: {
                ...currentAppMetadata,
                role,
            },
        });
        if (authUpdateError) {
            console.warn("auth app_metadata.role sync warning:", authUpdateError.message);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Role update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
