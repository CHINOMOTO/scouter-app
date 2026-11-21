import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

export async function PATCH(
    request: Request,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: "サーバー設定エラーのため権限を更新できません。" }, { status: 500 });
        }

        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;
        const { userId } = await context.params;
        const body = await request.json();
        const { role } = body;

        if (role !== "admin" && role !== "viewer") {
            return NextResponse.json({ error: "指定された権限が不正です。" }, { status: 400 });
        }

        // 有効な管理者を降格する場合の最後の1人チェック
        if (role === "viewer") {
            const { data: targetUser } = await supabaseAdmin
                .from("app_users")
                .select("role, is_approved")
                .eq("id", userId)
                .maybeSingle();

            if (targetUser?.role === "admin" && targetUser.is_approved === true) {
                const { count } = await supabaseAdmin
                    .from("app_users")
                    .select("*", { count: "exact", head: true })
                    .eq("role", "admin")
                    .eq("is_approved", true);

                if ((count ?? 0) <= 1) {
                    return NextResponse.json(
                        { error: "有効な最後の管理者は一般ユーザーへ降格できません。" },
                        { status: 400 }
                    );
                }
            }
        }

        // 権限の更新 (app_users)
        const { error: updateError } = await supabaseAdmin
            .from("app_users")
            .update({ role })
            .eq("id", userId);

        if (updateError) {
            console.error("Role update DB error:", updateError);
            return NextResponse.json({ error: "権限の更新に失敗しました。" }, { status: 500 });
        }

        // Auth(Supabase認証)の app_metadata.role も同期
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
    } catch (error) {
        console.error("Role update error:", error);
        return NextResponse.json({ error: "権限の更新中にエラーが発生しました。" }, { status: 500 });
    }
}
