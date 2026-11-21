import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";
import { createMailTransporter, DEFAULT_FROM_ADDRESS } from "@/lib/mailTransporter";
import { translateErrorMessage } from "@/lib/errorMessage";

export async function POST(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const body = await request.json();
        const { email, subject, text } = body;

        if (typeof email !== "string" || !email.trim() || typeof text !== "string" || !text.trim()) {
            return NextResponse.json({ error: "宛先メールアドレスとメール本文は必須です。" }, { status: 400 });
        }

        const mailTransporter = createMailTransporter();
        if (!mailTransporter) {
            return NextResponse.json({
                error: "メール送信サーバー（SMTP）が設定されていません。環境変数をご確認ください。"
            }, { status: 500 });
        }

        const mailSubject = (typeof subject === "string" && subject.trim())
            ? subject.trim()
            : "【MIERIS】アカウント発行およびログイン情報のご案内";
        const fromAddress = DEFAULT_FROM_ADDRESS;

        let info;
        try {
            info = await mailTransporter.sendMail({
                from: fromAddress,
                to: email.trim(),
                subject: mailSubject,
                text: text,
            });
        } catch (firstErr: any) {
            console.warn("[SMTP INVITE] First attempt failed, retrying in 1s...", firstErr.message);
            await new Promise(resolve => setTimeout(resolve, 1000));
            info = await mailTransporter.sendMail({
                from: fromAddress,
                to: email.trim(),
                subject: mailSubject,
                text: text,
            });
        }

        console.log(`[SMTP INVITE SENT] Sent invitation to ${email.trim()} messageId: ${info.messageId}`);

        return NextResponse.json({
            success: true,
            message: "案内メールを正常に送信しました。",
            messageId: info.messageId,
            recipient: email.trim()
        });
    } catch (error: any) {
        console.error("Admin user send-invite error:", error);
        return NextResponse.json({
            error: translateErrorMessage(error, {
                fallback: "メール送信処理中にエラーが発生しました。",
                includeAdminSmtpHint: true,
            })
        }, { status: 500 });
    }
}
