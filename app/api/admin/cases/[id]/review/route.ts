import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";
import { sendCaseReviewNotification } from "@/lib/notificationService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateApiRequest(request, { requireAdmin: true });
    if (!auth.ok) return auth.response;

    const { user, supabaseAdmin } = auth;
    const { id } = await context.params;

    const body = await request.json();
    const { status, rejectedReason } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "ステータスが不正です。" }, { status: 400 });
    }

    if (status === "rejected" && (typeof rejectedReason !== "string" || !rejectedReason.trim())) {
      return NextResponse.json({ error: "却下理由を入力してください。" }, { status: 400 });
    }

    // 更新前のケース情報を取得（申請者情報・対象者名・現ステータス）
    const { data: targetCase, error: fetchError } = await supabaseAdmin
      .from("blacklist_cases")
      .select("id, full_name, status, registered_by_user_id, registered_company_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !targetCase) {
      return NextResponse.json({ error: "対象データが見つかりません。" }, { status: 404 });
    }

    const alreadySameStatus = targetCase.status === status;

    const updatePayload: Record<string, any> = {
      status,
      approved_by: status === "approved" ? user.id : null,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      rejected_reason: status === "rejected" ? rejectedReason.trim() : null,
    };

    const { error: updateError } = await supabaseAdmin
      .from("blacklist_cases")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      console.error("Admin case review DB error:", updateError);
      return NextResponse.json({ error: "審査ステータスの更新に失敗しました。" }, { status: 500 });
    }

    // 申請者へメール通知を送信（同一ステータス再実行時の二重送信を防止）
    if (!alreadySameStatus) {
      try {
        await sendCaseReviewNotification({
          type: "work",
          status,
          targetName: targetCase.full_name,
          reason: typeof rejectedReason === "string" ? rejectedReason.trim() : undefined,
          registeredByUserId: targetCase.registered_by_user_id,
          registeredCompanyId: targetCase.registered_company_id,
        });
      } catch (notifErr) {
        console.error("Failed to send review notification:", notifErr);
      }
    }

    return NextResponse.json({ success: true, caseId: id, status });
  } catch (error) {
    console.error("Admin case review API error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
