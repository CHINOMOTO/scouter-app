import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;
        const { id } = await context.params;
        const body = await request.json();
        const { is_active } = body;

        if (typeof is_active !== "boolean") {
            return NextResponse.json({ error: "公開状態の指定が不正です。" }, { status: 400 });
        }

        const { error: updateError } = await supabaseAdmin
            .from("announcements")
            .update({ is_active })
            .eq("id", id);

        if (updateError) {
            console.error("Announcement PATCH error:", updateError);
            return NextResponse.json({ error: "公開状態の更新に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Announcement PATCH unexpected error:", error);
        return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;
        const { id } = await context.params;

        const { error: deleteError } = await supabaseAdmin
            .from("announcements")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("Announcement DELETE error:", deleteError);
            return NextResponse.json({ error: "お知らせの削除に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Announcement DELETE unexpected error:", error);
        return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
    }
}
