import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

const ALLOWED_STATUSES = ["unread", "in_progress", "resolved"] as const;

// PATCH: お問い合わせステータス更新（管理者専用・RLS厳格化対応）
export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;
        const body = await request.json();
        const status = typeof body?.status === "string" ? body.status.trim() : "";

        if (!ALLOWED_STATUSES.includes(status as any)) {
            return NextResponse.json({ error: "不正なステータスが指定されました。" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from("contact_inquiries")
            .update({ status })
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) {
            console.error("Admin inquiry PATCH error:", error);
            return NextResponse.json({ error: "ステータスの更新に失敗しました。" }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: "対象のお問い合わせが見つかりません。" }, { status: 404 });
        }

        return NextResponse.json({ success: true, inquiry: data });
    } catch (error) {
        console.error("Admin inquiry PATCH unexpected error:", error);
        return NextResponse.json({ error: "ステータス更新中にサーバーエラーが発生しました。" }, { status: 500 });
    }
}
