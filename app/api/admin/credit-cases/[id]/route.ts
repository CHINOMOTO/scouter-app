import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";
import { sendCaseReviewNotification } from "@/lib/notificationService";
import { isValidCalendarDate } from "@/lib/dateFormat";

// PATCH: 管理者による審査（承認 / 却下）および登録内容の直接編集（誤字脱字修正用）
export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;
        const { id } = await context.params;

        const body = await request.json();
        const {
            status,
            adminNotes,
            company_name,
            corporate_number,
            location,
            invoice_date,
            amount,
            due_date,
            business_status,
            counterparty_claim
        } = body;

        const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString()
        };

        if (status !== undefined) {
            if (!["approved", "rejected", "pending"].includes(status)) {
                return NextResponse.json({ error: "ステータスが不正です。" }, { status: 400 });
            }
            if (status === "rejected" && (typeof adminNotes !== "string" || !adminNotes.trim())) {
                return NextResponse.json({ error: "却下理由を入力してください。" }, { status: 400 });
            }
            updatePayload.status = status;
        }

        if (adminNotes !== undefined) {
            updatePayload.admin_notes = typeof adminNotes === "string" ? adminNotes.trim() || null : null;
        }

        if (company_name !== undefined) {
            if (typeof company_name !== "string" || !company_name.trim()) {
                return NextResponse.json({ error: "対象企業名は必須です。" }, { status: 400 });
            }
            updatePayload.company_name = company_name.trim();
        }
        // 既存レコードの存在・現ステータスを確認（存在しないIDの404返却＆二重通知防止）
        const { data: existingCase, error: existingErr } = await supabaseAdmin
            .from("credit_cases")
            .select("id, status")
            .eq("id", id)
            .maybeSingle();

        if (existingErr || !existingCase) {
            return NextResponse.json({ error: "対象データが見つかりません。" }, { status: 404 });
        }

        const alreadySameStatus = status !== undefined && existingCase.status === status;

        if (corporate_number !== undefined) {
            const rawCorp = typeof corporate_number === "string"
                ? corporate_number.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)).trim()
                : "";
            const cleanCorp = rawCorp.replace(/[^0-9]/g, "");
            if (rawCorp && cleanCorp.length !== 13) {
                return NextResponse.json({ error: "法人番号は13桁の半角数字で入力してください。" }, { status: 400 });
            }
            updatePayload.corporate_number = cleanCorp || null;
        }
        if (location !== undefined) {
            updatePayload.location = typeof location === "string" ? location.trim() || null : null;
        }
        if (invoice_date !== undefined) {
            const trimmed = typeof invoice_date === "string" ? invoice_date.trim() : "";
            if (trimmed && !isValidCalendarDate(trimmed)) {
                return NextResponse.json({ error: "請求日の形式が正しくありません。" }, { status: 400 });
            }
            updatePayload.invoice_date = trimmed || null;
        }
        if (amount !== undefined) {
            const parsedAmount = Number(amount);
            if (!Number.isFinite(parsedAmount) || parsedAmount < 0 || parsedAmount > 999999999999) {
                return NextResponse.json({ error: "金額は0円〜9,999億円の範囲で正しく入力してください。" }, { status: 400 });
            }
            updatePayload.amount = Math.floor(parsedAmount);
        }
        if (due_date !== undefined) {
            const trimmed = typeof due_date === "string" ? due_date.trim() : "";
            if (trimmed && !isValidCalendarDate(trimmed)) {
                return NextResponse.json({ error: "支払期日の形式が正しくありません。" }, { status: 400 });
            }
            updatePayload.due_date = trimmed || null;
        }
        if (business_status !== undefined) updatePayload.business_status = business_status;
        if (counterparty_claim !== undefined) {
            updatePayload.counterparty_claim = typeof counterparty_claim === "string" ? counterparty_claim.trim() || null : null;
        }

        const { data: updatedCase, error } = await supabaseAdmin
            .from("credit_cases")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .maybeSingle();

        if (error) {
            console.error("Admin credit case PATCH DB error:", error);
            return NextResponse.json({ error: "案件情報の更新に失敗しました。" }, { status: 500 });
        }
        if (!updatedCase) {
            return NextResponse.json({ error: "対象データが見つかりません。" }, { status: 404 });
        }

        // 申請者企業へ通知メールを送信 (承認または却下の場合・同一ステータス再実行時の二重送信を防止)
        if ((status === "approved" || status === "rejected") && !alreadySameStatus) {
            try {
                await sendCaseReviewNotification({
                    type: "credit",
                    status,
                    targetName: updatedCase.company_name,
                    reason: typeof adminNotes === "string" ? adminNotes.trim() || undefined : undefined,
                    registeredCompanyId: updatedCase.registered_by_company_id,
                });
            } catch (notifErr) {
                console.error("Failed to send credit review notification:", notifErr);
            }
        }

        return NextResponse.json({ success: true, case: updatedCase });
    } catch (e) {
        console.error("Admin credit case review error:", e);
        return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
    }
}
