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
        const { allowedPlan } = body;

        if (allowedPlan !== "full" && allowedPlan !== "employment" && allowedPlan !== "credit") {
            return NextResponse.json({ error: "無効なプランが指定されました" }, { status: 400 });
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "認証情報がありません" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data: callerProfile } = await supabaseAdmin
            .from("app_users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!callerProfile || callerProfile.role !== "admin") {
            return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
        }

        // 対象ユーザーの所属会社IDを取得
        const { data: targetUser, error: targetErr } = await supabaseAdmin
            .from("app_users")
            .select("id, company_id")
            .eq("id", userId)
            .single();

        if (targetErr || !targetUser) {
            return NextResponse.json({ error: "対象ユーザーが見つかりません" }, { status: 404 });
        }

        if (targetUser.company_id) {
            // 会社管理（companies.plan_type）と同社に所属する全ユーザー（app_users.allowed_plan）を連動更新
            const { error: compErr } = await supabaseAdmin
                .from("companies")
                .update({ plan_type: allowedPlan })
                .eq("id", targetUser.company_id);

            if (compErr) {
                return NextResponse.json({ error: compErr.message }, { status: 500 });
            }

            const { error: usersErr } = await supabaseAdmin
                .from("app_users")
                .update({ allowed_plan: allowedPlan })
                .eq("company_id", targetUser.company_id);

            if (usersErr) {
                return NextResponse.json({ error: usersErr.message }, { status: 500 });
            }
        } else {
            const { error: updateError } = await supabaseAdmin
                .from("app_users")
                .update({ allowed_plan: allowedPlan })
                .eq("id", userId);

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            allowedPlan,
            companyId: targetUser.company_id || null
        });
    } catch (error: any) {
        console.error("Plan update error:", error);
        return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
    }
}
