import { NextResponse } from "next/server";
import { authenticateApiRequest, isSafeStorageEvidencePath } from "@/lib/apiAuth";
import { isValidCalendarDate } from "@/lib/dateFormat";

// PATCH: 管理者による就業トラブル投稿情報の直接編集（誤字脱字・表現の是正用）
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateApiRequest(request, { requireAdmin: true });
    if (!auth.ok) return auth.response;

    const { supabaseAdmin } = auth;
    const { id } = await context.params;

    const body = await request.json();
    const {
      full_name,
      full_name_kana,
      gender,
      birth_date,
      phone_last4,
      city,
      occurrence_date,
      reason_text,
      status,
      evidence_urls,
    } = body;

    const updatePayload: Record<string, any> = {};

    if (full_name !== undefined) {
      if (typeof full_name !== "string" || !full_name.trim() || full_name.trim().length > 100) {
        return NextResponse.json({ error: "氏名は100文字以内で必須です。" }, { status: 400 });
      }
      updatePayload.full_name = full_name.trim();
    }
    if (full_name_kana !== undefined) {
      updatePayload.full_name_kana = typeof full_name_kana === "string" ? full_name_kana.trim().slice(0, 120) || null : null;
    }
    if (gender !== undefined) {
      if (gender && !["male", "female", "other", "unknown"].includes(gender)) {
        return NextResponse.json({ error: "性別の指定が不正です。" }, { status: 400 });
      }
      updatePayload.gender = !gender || gender === "unknown" ? null : gender;
    }
    if (birth_date !== undefined) {
      const trimmed = typeof birth_date === "string" ? birth_date.trim() : "";
      if (trimmed && !isValidCalendarDate(trimmed, { allowFuture: false })) {
        return NextResponse.json({ error: "生年月日の形式が正しくありません。" }, { status: 400 });
      }
      updatePayload.birth_date = trimmed || null;
    }
    if (phone_last4 !== undefined) {
      const trimmed = typeof phone_last4 === "string" ? phone_last4.trim() : "";
      if (trimmed && !/^\d{4}$/.test(trimmed)) {
        return NextResponse.json({ error: "携帯電話番号（下4桁）は4桁の半角数字で入力してください。" }, { status: 400 });
      }
      updatePayload.phone_last4 = trimmed || null;
    }
    if (city !== undefined) {
      updatePayload.city = typeof city === "string" ? city.trim().slice(0, 120) || null : null;
    }
    if (occurrence_date !== undefined) {
      const trimmed = typeof occurrence_date === "string" ? occurrence_date.trim() : "";
      if (trimmed && !isValidCalendarDate(trimmed, { allowFuture: false })) {
        return NextResponse.json({ error: "発生日の形式が正しくありません。" }, { status: 400 });
      }
      updatePayload.occurrence_date = trimmed || null;
    }
    if (reason_text !== undefined) {
      if (typeof reason_text !== "string" || !reason_text.trim() || reason_text.trim().length > 5000) {
        return NextResponse.json({ error: "トラブル詳細・理由文は5000文字以内で必須です。" }, { status: 400 });
      }
      updatePayload.reason_text = reason_text.trim();
    }
    if (status !== undefined) {
      if (!["pending", "approved", "rejected"].includes(status)) {
        return NextResponse.json({ error: "不正なステータスが指定されました。" }, { status: 400 });
      }
      updatePayload.status = status;
    }
    if (evidence_urls !== undefined) {
      if (!Array.isArray(evidence_urls)) {
        return NextResponse.json({ error: "添付資料の形式が不正です。" }, { status: 400 });
      }
      const cleanUrls: string[] = evidence_urls.filter(
        (u: unknown): u is string => typeof u === "string" && u.trim().length > 0
      );
      if (cleanUrls.length > 10) {
        return NextResponse.json({ error: "添付資料は最大10件までです。" }, { status: 400 });
      }
      if (cleanUrls.some((u: string) => !isSafeStorageEvidencePath(u))) {
        return NextResponse.json({ error: "添付資料のファイルパスが不正です。" }, { status: 400 });
      }
      updatePayload.evidence_urls = cleanUrls;
    }

    updatePayload.updated_at = new Date().toISOString();

    const { data: updatedCase, error: updateError } = await supabaseAdmin
      .from("blacklist_cases")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("Admin case update DB error:", updateError);
      return NextResponse.json({ error: "案件情報の更新に失敗しました。" }, { status: 500 });
    }
    if (!updatedCase) {
      return NextResponse.json({ error: "対象データが見つかりません。" }, { status: 404 });
    }

    return NextResponse.json({ success: true, case: updatedCase });
  } catch (err) {
    console.error("Admin case update error:", err);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
