import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";
import { getClientIp } from "@/lib/rateLimit";

const ALLOWED_ACTION_TYPES = [
    "SEARCH",
    "VIEW_CASE",
    "SEARCH_CREDIT",
    "VIEW_CREDIT",
] as const;

export async function POST(request: Request) {
    try {
        // 1. 認証・承認チェック
        const auth = await authenticateApiRequest(request);
        if (!auth.ok) return auth.response;

        const { user, appUser, supabaseAdmin } = auth;

        const body = await request.json();
        const actionType = typeof body?.action_type === "string" ? body.action_type.trim() : "";

        // 2. action_type のホワイトリスト検証（監査ログ改ざん・ゴミデータ注入防止）
        if (!ALLOWED_ACTION_TYPES.includes(actionType as any)) {
            return NextResponse.json({ error: "不正な操作種別です。" }, { status: 400 });
        }

        const rawTargetId = body?.target_id;
        const targetId =
            typeof rawTargetId === "string"
                ? rawTargetId.replace(/[\r\n]+/g, " ").trim().slice(0, 200)
                : rawTargetId === null || rawTargetId === undefined
                    ? null
                    : String(rawTargetId).replace(/[\r\n]+/g, " ").trim().slice(0, 200);

        // 3. IPアドレス取得とログ保存
        const clientIp = getClientIp(request);
        const ipAddress = clientIp === "unknown" ? null : clientIp.slice(0, 64);

        const { error: insertError } = await supabaseAdmin
            .from("audit_logs")
            .insert([{
                user_id: user.id,
                company_id: appUser.company_id,
                action_type: actionType,
                target_id: targetId,
                ip_address: ipAddress,
            }]);

        if (insertError) {
            console.error("Audit Log Insert Error:", insertError);
            // ログの保存失敗でユーザーの画面操作を止めないため、500エラーにはせず返す
            return NextResponse.json({ success: false, error: "監査ログの保存に失敗しました。" });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Audit log error:", error);
        return NextResponse.json({ error: "監査ログの記録中にエラーが発生しました。" }, { status: 500 });
    }
}
