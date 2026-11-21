import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

const VALID_PLANS = ["full", "employment", "credit"] as const;

// GET: 利用会社の詳細取得（管理者専用）
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;
        const { data, error } = await supabaseAdmin
            .from("companies")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error || !data) {
            return NextResponse.json({ error: "該当する会社情報が見つかりません。" }, { status: 404 });
        }

        return NextResponse.json({ company: data });
    } catch (error) {
        console.error("Admin company GET unexpected error:", error);
        return NextResponse.json({ error: "会社情報の取得中にエラーが発生しました。" }, { status: 500 });
    }
}

// PATCH: 利用会社の情報更新 ＋ 所属ユーザーの契約プラン一括同期（管理者専用・RLS厳格化対応）
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

        let { data: updatedCompany, error: updateError } = await supabaseAdmin
            .from("companies")
            .update(payload)
            .eq("id", id)
            .select()
            .maybeSingle();

        if (updateError && (updateError.message.includes("corporate_number") || updateError.message.includes("plan_type"))) {
            console.warn("Falling back to basic company schema:", updateError.message);
            const fallback = await supabaseAdmin
                .from("companies")
                .update({ name, is_main: isMain })
                .eq("id", id)
                .select()
                .maybeSingle();
            updatedCompany = fallback.data;
            updateError = fallback.error;
        }

        if (updateError) {
            console.error("Admin company PATCH error:", updateError);
            if (updateError.code === "23505") {
                return NextResponse.json({ error: "同じ法人番号または会社名が既に登録されています。" }, { status: 409 });
            }
            return NextResponse.json({ error: "会社情報の更新に失敗しました。" }, { status: 500 });
        }

        if (!updatedCompany) {
            return NextResponse.json({ error: "更新対象の会社が見つかりません。" }, { status: 404 });
        }

        // 所属ユーザーの契約プラン（allowed_plan）も Service Role で確実に一括同期する
        const { error: syncUsersError } = await supabaseAdmin
            .from("app_users")
            .update({ allowed_plan: planType })
            .eq("company_id", id);

        if (syncUsersError) {
            console.error("Admin company PATCH sync app_users error:", syncUsersError);
            return NextResponse.json(
                { error: "会社情報は更新されましたが、所属ユーザーの契約プラン同期に失敗しました。ユーザー管理画面から確認してください。" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, company: updatedCompany });
    } catch (error) {
        console.error("Admin company PATCH unexpected error:", error);
        return NextResponse.json({ error: "更新処理中にサーバーエラーが発生しました。" }, { status: 500 });
    }
}

// DELETE: 利用会社の削除（管理者専用）
export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;
        const { error } = await supabaseAdmin
            .from("companies")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Admin company DELETE error:", error);
            if (error.code === "23503" || error.message.toLowerCase().includes("foreign key")) {
                return NextResponse.json(
                    { error: "この会社に紐づくユーザーまたは案件データが存在するため削除できません。先に関連データを整理してください。" },
                    { status: 409 }
                );
            }
            return NextResponse.json({ error: "会社の削除に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin company DELETE unexpected error:", error);
        return NextResponse.json({ error: "削除処理中にサーバーエラーが発生しました。" }, { status: 500 });
    }
}
