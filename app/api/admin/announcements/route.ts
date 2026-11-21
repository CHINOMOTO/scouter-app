import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

export async function POST(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { user, supabaseAdmin } = auth;
        const body = await request.json();
        const title = typeof body?.title === "string" ? body.title.trim() : "";
        const content = typeof body?.content === "string" ? body.content.trim() : "";
        const is_active = typeof body?.is_active === "boolean" ? body.is_active : true;

        if (!title || !content) {
            return NextResponse.json({ error: "タイトルと本文は必須です。" }, { status: 400 });
        }

        const { error: insertError } = await supabaseAdmin
            .from("announcements")
            .insert([{ title, content, is_active, created_by: user.id }]);

        if (insertError) {
            console.error("Announcement insert error:", insertError);
            return NextResponse.json({ error: "お知らせの作成に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Announcement POST error:", error);
        return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;

        const { data, error } = await supabaseAdmin
            .from("announcements")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Announcement GET error:", error);
            return NextResponse.json({ error: "お知らせ一覧の取得に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Announcement GET unexpected error:", error);
        return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
    }
}
