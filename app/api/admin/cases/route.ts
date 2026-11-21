import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

// GET: 管理者向け就業トラブル案件の全件取得（RLS厳格化対応）
export async function GET(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;
        const { data, error } = await supabaseAdmin
            .from("blacklist_cases")
            .select(`
                id,
                full_name,
                full_name_kana,
                gender,
                birth_date,
                phone_last4,
                occurrence_date,
                reason_text,
                evidence_urls,
                status,
                created_at,
                registered_company_id,
                companies:registered_company_id ( id, name )
            `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Admin cases GET error:", error);
            return NextResponse.json({ error: "案件一覧の取得に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ cases: data || [] });
    } catch (error) {
        console.error("Admin cases GET unexpected error:", error);
        return NextResponse.json({ error: "案件一覧の取得中にエラーが発生しました。" }, { status: 500 });
    }
}
