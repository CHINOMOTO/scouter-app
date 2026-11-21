import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

const VALID_PLANS = ["full", "employment", "credit"] as const;

// GET: 利用会社一覧の取得（管理者専用・RLS厳格化対応）
export async function GET(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;
        const { searchParams } = new URL(request.url);
        const sort = searchParams.get("sort");

        const query = supabaseAdmin.from("companies").select("*");
        const { data, error } =
            sort === "name"
                ? await query.order("name", { ascending: true })
                : await query.order("created_at", { ascending: false });

        if (error) {
            console.error("Admin companies GET error:", error);
            return NextResponse.json({ error: "会社一覧の取得に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ companies: data || [] });
    } catch (error) {
        console.error("Admin companies GET unexpected error:", error);
        return NextResponse.json({ error: "会社一覧の取得中にエラーが発生しました。" }, { status: 500 });
    }
}

// POST: 新規利用会社の登録（管理者専用・RLS厳格化対応）
export async function POST(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;
        const body = await request.json();

        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const rawCorpNum = typeof body?.corporateNumber === "string" ? body.corporateNumber : "";
        const cleanCorpNum = rawCorpNum.replace(/[^0-9]/g, "");
        const planType = VALID_PLANS.includes(body?.planType) ? body.planType : null;
        const isMain = Boolean(body?.isMain);

        if (!name || name.length > 200) {
            return NextResponse.json({ error: "会社名（商号）を200文字以内で入力してください。" }, { status: 400 });
        }
        if (cleanCorpNum.length !== 13) {
            return NextResponse.json({ error: "法人番号（13桁の半角数字）を入力してください。" }, { status: 400 });
        }
        if (!planType) {
            return NextResponse.json({ error: "契約プランを正しく選択してください。" }, { status: 400 });
        }

        const payload = {
            name,
            corporate_number: cleanCorpNum,
            plan_type: planType,
            is_main: isMain,
        };

        let { data, error } = await supabaseAdmin
            .from("companies")
            .insert([payload])
            .select()
            .single();

        // もしDBスキーマに corporate_number / plan_type がまだ無い場合のフォールバック
        if (error && (error.message.includes("corporate_number") || error.message.includes("plan_type"))) {
            console.warn("Falling back to basic company schema:", error.message);
            const fallback = await supabaseAdmin
                .from("companies")
                .insert([{ name, is_main: isMain }])
                .select()
                .single();
            data = fallback.data;
            error = fallback.error;
        }

        if (error) {
            console.error("Admin companies POST error:", error);
            if (error.code === "23505") {
                return NextResponse.json({ error: "同じ法人番号または会社名が既に登録されています。" }, { status: 409 });
            }
            return NextResponse.json({ error: "会社の登録に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ success: true, company: data }, { status: 201 });
    } catch (error) {
        console.error("Admin companies POST unexpected error:", error);
        return NextResponse.json({ error: "会社登録中にサーバーエラーが発生しました。" }, { status: 500 });
    }
}
