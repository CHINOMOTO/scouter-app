import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendCaseReviewNotification } from "@/lib/notificationService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証情報がありません" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "ユーザー情報を取得できませんでした" }, { status: 401 });
    }

    const supabaseAdmin = supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey)
      : supabaseUser;

    // 管理者権限チェック
    const { data: appUser } = await supabaseAdmin
      .from("app_users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (appUser?.role !== "admin") {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const body = await request.json();
    const { status, rejectedReason } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "ステータスが不正です" }, { status: 400 });
    }

    if (status === "rejected" && !rejectedReason?.trim()) {
      return NextResponse.json({ error: "却下理由を入力してください" }, { status: 400 });
    }

    // 更新前のケース情報を取得（申請者情報と対象者名）
    const { data: targetCase, error: fetchError } = await supabaseAdmin
      .from("blacklist_cases")
      .select("id, full_name, registered_by_user_id, registered_company_id")
      .eq("id", id)
      .single();

    if (fetchError || !targetCase) {
      return NextResponse.json({ error: "対象データが見つかりません" }, { status: 404 });
    }

    const updatePayload: any = {
      status,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejected_reason: status === "rejected" ? rejectedReason.trim() : null,
    };

    const { error: updateError } = await supabaseAdmin
      .from("blacklist_cases")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 申請者へメール通知を送信（バックグラウンドで処理、失敗してもAPI自体は成功させる）
    try {
      await sendCaseReviewNotification({
        type: "work",
        status,
        targetName: targetCase.full_name,
        reason: rejectedReason?.trim(),
        registeredByUserId: targetCase.registered_by_user_id,
        registeredCompanyId: targetCase.registered_company_id,
      });
    } catch (notifErr) {
      console.error("Failed to send review notification:", notifErr);
    }

    return NextResponse.json({ success: true, caseId: id, status });

  } catch (error: any) {
    console.error("Admin case review API error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
