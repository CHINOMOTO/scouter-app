import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

// GET: ログインユーザー自身のプロフィール取得（RLS厳格化対応）
export async function GET(request: Request) {
    try {
        const auth = await authenticateApiRequest(request);
        if (!auth.ok) return auth.response;

        const { user, supabaseAdmin } = auth;

        const { data: appUser, error } = await supabaseAdmin
            .from("app_users")
            .select("id, display_name, phone_number, company_id, role, allowed_plan, is_approved, created_at, companies ( name, plan_type )")
            .eq("id", user.id)
            .maybeSingle();

        if (error || !appUser) {
            console.error("Profile GET error:", error);
            return NextResponse.json({ error: "プロフィール情報の取得に失敗しました。" }, { status: 500 });
        }

        const displayName = appUser.display_name || user.user_metadata?.display_name || "未設定";
        const phoneNumber = appUser.phone_number || "";
        const companyName = (appUser.companies as any)?.name || null;
        const companyPlan = (appUser.companies as any)?.plan_type || null;
        const rawPlan = appUser.allowed_plan || companyPlan;
        const resolvedPlan = appUser.role === "admin"
            ? (rawPlan || "full")
            : (rawPlan === "full" || rawPlan === "employment" || rawPlan === "credit" ? rawPlan : "none");

        return NextResponse.json({
            profile: {
                id: user.id,
                email: user.email || "",
                displayName,
                phoneNumber,
                companyId: appUser.company_id || null,
                companyName,
                role: appUser.role || "viewer",
                allowedPlan: resolvedPlan,
                isApproved: appUser.is_approved === true,
                createdAt: appUser.created_at || user.created_at || "",
            },
        });
    } catch (error) {
        console.error("Profile GET unexpected error:", error);
        return NextResponse.json({ error: "プロフィール情報の取得中にエラーが発生しました。" }, { status: 500 });
    }
}

// PATCH: ログインユーザー自身の表示名・電話番号のみ更新（権限・会社・プラン改ざん防止 + RLS厳格化対応）
export async function PATCH(request: Request) {
    try {
        const auth = await authenticateApiRequest(request);
        if (!auth.ok) return auth.response;

        const { user, supabaseAdmin } = auth;
        const body = await request.json();

        const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
        const phoneNumber = typeof body?.phoneNumber === "string" ? body.phoneNumber.trim() : "";

        if (!displayName || displayName.length > 100) {
            return NextResponse.json({ error: "表示名（氏名）を100文字以内で入力してください。" }, { status: 400 });
        }
        if (phoneNumber.length > 30) {
            return NextResponse.json({ error: "電話番号は30文字以内で入力してください。" }, { status: 400 });
        }

        // display_name と phone_number のみ更新を許可
        const { error: updateError } = await supabaseAdmin
            .from("app_users")
            .update({
                display_name: displayName,
                phone_number: phoneNumber || null,
            })
            .eq("id", user.id);

        if (updateError) {
            console.error("Profile PATCH DB error:", updateError);
            return NextResponse.json({ error: "基本情報の更新に失敗しました。" }, { status: 500 });
        }

        // Auth側の user_metadata も同期（失敗してもDB更新成功を優先）
        try {
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
                user_metadata: {
                    ...(user.user_metadata || {}),
                    display_name: displayName,
                },
            });
        } catch (metaErr) {
            console.warn("Profile PATCH user_metadata sync warning:", metaErr);
        }

        return NextResponse.json({
            success: true,
            profile: {
                displayName,
                phoneNumber,
            },
        });
    } catch (error) {
        console.error("Profile PATCH unexpected error:", error);
        return NextResponse.json({ error: "基本情報の更新中にサーバーエラーが発生しました。" }, { status: 500 });
    }
}
