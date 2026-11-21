import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

// GET: 有効なお知らせ一覧取得（認証・承認済みユーザー向け・RLS厳格化対応）
export async function GET(request: Request) {
    try {
        const auth = await authenticateApiRequest(request);
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;

        const { data, error } = await supabaseAdmin
            .from("announcements")
            .select("id, title, content, created_at")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) {
            console.error("Announcements GET DB error:", error);
            return NextResponse.json({ error: "お知らせの取得に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ announcements: data || [] });
    } catch (error) {
        console.error("Announcements GET unexpected error:", error);
        return NextResponse.json({ error: "お知らせの取得中にエラーが発生しました。" }, { status: 500 });
    }
}
