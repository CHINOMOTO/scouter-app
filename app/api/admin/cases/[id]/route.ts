import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// PATCH: 管理者による就業トラブル投稿情報の直接編集（誤字脱字・表現の是正用）
export async function PATCH(
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
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

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
    const {
      full_name,
      full_name_kana,
      gender,
      birth_date,
      phone_last4,
      city,
      occurrence_date,
      reason_text,
    } = body;

    const updatePayload: Record<string, any> = {};

    if (full_name !== undefined) updatePayload.full_name = full_name.trim();
    if (full_name_kana !== undefined) updatePayload.full_name_kana = full_name_kana?.trim() || null;
    if (gender !== undefined) updatePayload.gender = gender || null;
    if (birth_date !== undefined) updatePayload.birth_date = birth_date || null;
    if (phone_last4 !== undefined) updatePayload.phone_last4 = phone_last4?.trim() || null;
    if (city !== undefined) updatePayload.city = city?.trim() || null;
    if (occurrence_date !== undefined) updatePayload.occurrence_date = occurrence_date || null;
    if (reason_text !== undefined) updatePayload.reason_text = reason_text.trim();

    updatePayload.updated_at = new Date().toISOString();

    const { data: updatedCase, error: updateError } = await supabaseAdmin
      .from("blacklist_cases")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, case: updatedCase });
  } catch (err: any) {
    console.error("Admin case update error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
