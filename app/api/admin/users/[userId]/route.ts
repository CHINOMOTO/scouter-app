import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

const VALID_PLANS = ["full", "employment", "credit"] as const;

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: "サーバー設定エラーのため削除できません。" }, { status: 500 });
        }

        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { user, supabaseAdmin } = auth;
        const resolvedParams = await Promise.resolve(params);
        const userId = resolvedParams.userId;

        // 自分自身は削除できないように保護
        if (user.id === userId) {
            return NextResponse.json({ error: "ログイン中の自分自身のアカウントは削除できません。" }, { status: 400 });
        }

        // 削除対象が有効な最後の管理者でないか確認（同一企業フォールバック用に company_id も取得）
        const { data: targetUser } = await supabaseAdmin
            .from("app_users")
            .select("role, is_approved, company_id")
            .eq("id", userId)
            .maybeSingle();

        if (targetUser?.role === "admin" && targetUser.is_approved === true) {
            const { count: activeAdminCount } = await supabaseAdmin
                .from("app_users")
                .select("*", { count: "exact", head: true })
                .eq("role", "admin")
                .eq("is_approved", true);

            if ((activeAdminCount ?? 0) <= 1) {
                return NextResponse.json(
                    { error: "有効な最後の管理者は削除できません。少なくとも1名の管理者が必要です。" },
                    { status: 400 }
                );
            }
        }

        // 関連データの外部キー制約を安全に解決（監査証跡は決して削除しない）
        const { error: auditUpdateError } = await supabaseAdmin
            .from("audit_logs")
            .update({ user_id: null })
            .eq("user_id", userId);

        if (auditUpdateError) {
            console.error("audit_logs user_id detach error:", auditUpdateError);
            return NextResponse.json(
                {
                    error:
                        "このユーザーには監査ログが残っているため物理削除できません。監査証跡保全のため「利用停止」をご利用いただくか、DBマイグレーション（audit_logs.user_id NULL許容化）を適用してください。",
                },
                { status: 409 }
            );
        }

        await supabaseAdmin
            .from("contact_inquiries")
            .update({ user_id: null })
            .eq("user_id", userId);

        await supabaseAdmin
            .from("announcements")
            .update({ created_by: user.id })
            .eq("created_by", userId);

        await supabaseAdmin
            .from("blacklist_cases")
            .update({ approved_by: null })
            .eq("approved_by", userId);

        // blacklist_cases の登録者参照を安全に切り離す（管理者IDへ付け替えると審査通知誤送信・管理者名露出の原因になるため）
        const { error: detachBlacklistUserErr } = await supabaseAdmin
            .from("blacklist_cases")
            .update({ registered_by_user_id: null })
            .eq("registered_by_user_id", userId);

        if (detachBlacklistUserErr) {
            // NOT NULL 制約等で NULL 化できない環境では、同一企業の別の承認済みユーザーへ引き継ぐ
            let fallbackUserId: string | null = null;
            if (targetUser?.company_id) {
                const { data: sameCompanyUser } = await supabaseAdmin
                    .from("app_users")
                    .select("id")
                    .eq("company_id", targetUser.company_id)
                    .neq("id", userId)
                    .eq("is_approved", true)
                    .limit(1)
                    .maybeSingle();
                fallbackUserId = sameCompanyUser?.id ?? null;
            }

            const { error: reassignBlacklistUserErr } = await supabaseAdmin
                .from("blacklist_cases")
                .update({ registered_by_user_id: fallbackUserId ?? user.id })
                .eq("registered_by_user_id", userId);

            if (reassignBlacklistUserErr) {
                console.error("blacklist_cases registered_by_user_id detach error:", reassignBlacklistUserErr);
                return NextResponse.json(
                    { error: "登録案件との紐付け解除に失敗しました。時間をおいて再度お試しください。" },
                    { status: 500 }
                );
            }
        }

        // app_users テーブルから削除
        const { error: appUserError } = await supabaseAdmin
            .from("app_users")
            .delete()
            .eq("id", userId);

        if (appUserError) {
            console.error("app_users delete error:", appUserError);
            return NextResponse.json({ error: "ユーザープロフィールの削除に失敗しました。" }, { status: 500 });
        }

        // Auth(Supabase認証)からユーザー削除
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authDeleteError) {
            console.error("auth delete error:", authDeleteError);
            return NextResponse.json({ error: "認証アカウントの削除に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Delete user API error:", e);
        return NextResponse.json({ error: "ユーザー削除中にエラーが発生しました。" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: "サーバー設定エラーのため更新できません。" }, { status: 500 });
        }

        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { user, supabaseAdmin } = auth;
        const resolvedParams = await Promise.resolve(params);
        const userId = resolvedParams.userId;

        const body = await request.json();
        const { is_approved, allowed_plan } = body;

        const updatePayload: Record<string, any> = {};
        if (typeof is_approved === "boolean") {
            if (is_approved === false && user.id === userId) {
                return NextResponse.json({ error: "自分自身のアカウントは利用停止にできません。" }, { status: 400 });
            }
            if (is_approved === false) {
                const { data: targetUser } = await supabaseAdmin
                    .from("app_users")
                    .select("role, is_approved")
                    .eq("id", userId)
                    .maybeSingle();

                if (targetUser?.role === "admin" && targetUser.is_approved === true) {
                    const { count: activeAdminCount } = await supabaseAdmin
                        .from("app_users")
                        .select("*", { count: "exact", head: true })
                        .eq("role", "admin")
                        .eq("is_approved", true);

                    if ((activeAdminCount ?? 0) <= 1) {
                        return NextResponse.json(
                            { error: "有効な最後の管理者は利用停止にできません。" },
                            { status: 400 }
                        );
                    }
                }
            }
            updatePayload.is_approved = is_approved;
        }
        if (allowed_plan !== undefined) {
            if (!VALID_PLANS.includes(allowed_plan)) {
                return NextResponse.json({ error: "指定されたプランが不正です。" }, { status: 400 });
            }
            updatePayload.allowed_plan = allowed_plan;
        }

        if (Object.keys(updatePayload).length === 0) {
            return NextResponse.json({ error: "更新対象の項目がありません。" }, { status: 400 });
        }

        // app_users テーブルの更新
        const { error: updateError } = await supabaseAdmin
            .from("app_users")
            .update(updatePayload)
            .eq("id", userId);

        if (updateError) {
            console.error("app_users update error:", updateError);
            return NextResponse.json({ error: "ユーザー情報の更新に失敗しました。" }, { status: 400 });
        }

        // is_approved の変更がある場合、Auth の app_metadata も同期
        if (typeof is_approved === "boolean") {
            const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
            const currentAppMetadata = existingUser?.user?.app_metadata || {};

            const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                app_metadata: {
                    ...currentAppMetadata,
                    is_approved: is_approved
                }
            });

            if (authUpdateError) {
                console.warn("auth app_metadata sync warning:", authUpdateError.message);
            }
        }

        return NextResponse.json({ success: true, updated: updatePayload });
    } catch (e) {
        console.error("Update user API error:", e);
        return NextResponse.json({ error: "ユーザー情報の更新中にエラーが発生しました。" }, { status: 500 });
    }
}
