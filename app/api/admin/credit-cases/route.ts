import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

const CHUNK_SIZE = 1000;
const MAX_ROWS = 20000;

// GET: 管理者用 未払い企業審査一覧（1,000件上限による取りこぼしを防止するためレンジ分割取得）
export async function GET(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;

        const allCases: any[] = [];
        for (let from = 0; from < MAX_ROWS; from += CHUNK_SIZE) {
            const { data: chunk, error } = await supabaseAdmin
                .from("credit_cases")
                .select(`
                    *,
                    companies:registered_by_company_id ( id, name )
                `)
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .range(from, from + CHUNK_SIZE - 1);

            if (error) {
                console.error("Admin credit cases DB error:", error);
                return NextResponse.json({ error: "企業信用データの取得に失敗しました。" }, { status: 500 });
            }

            if (!chunk || chunk.length === 0) break;
            allCases.push(...chunk);
            if (chunk.length < CHUNK_SIZE) break;
        }

        return NextResponse.json({ cases: allCases });
    } catch (e) {
        console.error("Admin credit cases GET error:", e);
        return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
    }
}
