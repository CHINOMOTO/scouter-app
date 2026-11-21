import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

// GET: お問い合わせ一覧取得（管理者専用・RLS厳格化対応）
export async function GET(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;
        const { data, error } = await supabaseAdmin
            .from("contact_inquiries")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Admin inquiries GET error:", error);
            return NextResponse.json({ error: "お問い合わせ一覧の取得に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ inquiries: data || [] });
    } catch (error) {
        console.error("Admin inquiries GET unexpected error:", error);
        return NextResponse.json({ error: "お問い合わせ一覧の取得中にエラーが発生しました。" }, { status: 500 });
    }
}
