import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

export async function DELETE(
    request: Request,
    context: any
) {
    try {
        const params = await context.params;
        const { id } = params;

        // 1. 認証・承認・WORKプランチェック
        const auth = await authenticateApiRequest(request, { requirePlan: "employment" });
        if (!auth.ok) return auth.response;

        const { appUser, isAdmin, supabaseAdmin } = auth;

        // 2. 削除対象のケースを取得して登録会社・ステータスを確認
        const { data: caseDetail } = await supabaseAdmin
            .from("blacklist_cases")
            .select("registered_company_id, status")
            .eq("id", id)
            .single();

        if (!caseDetail) {
            return NextResponse.json({ error: "Case not found" }, { status: 404 });
        }

        // 3. 権限チェック: 管理者か、自社が登録したデータのみ削除可能（null === null 対策含む）
        const isOwnCompany = Boolean(appUser.company_id) && caseDetail.registered_company_id === appUser.company_id;
        if (!isAdmin && !isOwnCompany) {
            return NextResponse.json({ error: "Forbidden: You can only delete cases registered by your own company." }, { status: 403 });
        }

        // 4. 承認済み案件の削除ガード（一般ユーザーは審査中・却下案件のみ削除可能）
        if (!isAdmin && caseDetail.status === "approved") {
            return NextResponse.json(
                { error: "承認済み（公開中）の案件は削除できません。修正・削除が必要な場合は運営事務局へお問い合わせください。" },
                { status: 403 }
            );
        }

        // 5. データの削除
        const { error: deleteError } = await supabaseAdmin
            .from("blacklist_cases")
            .delete()
            .eq("id", id);

        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Case delete error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
