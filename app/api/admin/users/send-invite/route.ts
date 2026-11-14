import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMailTransporter, DEFAULT_FROM_ADDRESS } from "@/lib/mailTransporter";
import { translateErrorMessage } from "@/lib/errorMessage";

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "認証トークンが不足しています" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceRoleKey) {
            return NextResponse.json({ error: "サーバー設定エラー: Service Role Key が未設定です" }, { status: 500 });
        }

        // 呼び出し元のユーザー認証 & 管理者権限チェック
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: { user: caller }, error: callerError } = await supabaseUser.auth.getUser();
        if (callerError || !caller) {
            return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data: callerProfile } = await supabaseAdmin
            .from("app_users")
            .select("role")
            .eq("id", caller.id)
            .single();

        if (!callerProfile || callerProfile.role !== "admin") {
            return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
        }

        const body = await request.json();
        const { email, subject, text } = body;

        if (!email || !text) {
            return NextResponse.json({ error: "宛先メールアドレスとメール本文は必須です" }, { status: 400 });
        }

        const mailTransporter = createMailTransporter();
        if (!mailTransporter) {
            return NextResponse.json({
                error: "メール送信サーバー（SMTP）が設定されていません。環境変数をご確認ください。"
            }, { status: 500 });
        }

        const mailSubject = subject || "【MIERIS】アカウント発行およびログイン情報のご案内";
        const fromAddress = DEFAULT_FROM_ADDRESS;

        const info = await mailTransporter.sendMail({
            from: fromAddress,
            to: email.trim(),
            subject: mailSubject,
            text: text,
        });

        console.log(`[SMTP INVITE SENT] Sent invitation to ${email.trim()} messageId: ${info.messageId}`);

        return NextResponse.json({
            success: true,
            message: "案内メールを正常に送信しました",
            messageId: info.messageId,
            recipient: email.trim()
        });

    } catch (error: any) {
        console.error("Admin user send-invite error:", error);
        return NextResponse.json({
            error: translateErrorMessage(error) || "メール送信処理中にエラーが発生しました"
        }, { status: 500 });
    }
}
