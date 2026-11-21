import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMailTransporter, DEFAULT_FROM_ADDRESS } from "@/lib/mailTransporter";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawEmail = typeof body?.email === "string" ? body.email.trim() : "";

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return NextResponse.json(
        { error: "正しいメールアドレス形式を入力してください。" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: "サーバー設定エラーにより再設定メールを送信できません。" },
        { status: 500 }
      );
    }

    const transporter = createMailTransporter();
    if (!transporter) {
      return NextResponse.json(
        { error: "メールサーバー設定が未構成のため送信できません。" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.m-m-m-mieris0610.com").replace(/\/+$/, "");
    // オープンリダイレクト防止のため、リダイレクト先はサーバー側の固定ドメインに限定
    const redirectTo = `${appBaseUrl}/update-password`;

    // Supabase Admin API でパスワード再設定用の安全なワンタイムリンクを生成
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: rawEmail,
      options: {
        redirectTo,
      },
    });

    if (error || !data?.properties?.action_link) {
      // アカウント有無の推測を防ぐため、未登録アドレスでも画面上は正常受付として返す
      console.warn("[RESET PASSWORD] generateLink skipped or user not found:", error?.message);
      return NextResponse.json({ success: true });
    }

    const resetLink = data.properties.action_link;
    const subject = "【MIERIS】パスワード再設定のご案内";
    const textContent = `MIERIS（ミエリス）をご利用いただき、誠にありがとうございます。
MIERIS 運営事務局でございます。

パスワード再設定のリクエストを受け付けました。
下記のURLをクリックし、新しいパスワードの設定を行ってください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ パスワード再設定用URL
${resetLink}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

※セキュリティ保護のため、上記URLには有効期限がございます。
※有効期限が切れた場合は、再度ログイン画面の「パスワードをお忘れの方はこちら」よりお手続きください。
※本メールにお心当たりがない場合は、第三者による誤入力の可能性がありますので、そのまま破棄してください（パスワードは変更されません）。

──────────────────────────────
【MIERIS 運営事務局】
運営：株式会社ミヤエモン / 開発：株式会社宇井建設
お問い合わせ: ${appBaseUrl}/contact
公式サイト: ${appBaseUrl}/
──────────────────────────────`;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM_ADDRESS,
      to: rawEmail,
      subject,
      text: textContent,
    });

    console.log(`[RESET PASSWORD EMAIL SENT] To: ${rawEmail} MessageId: ${info.messageId}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[RESET PASSWORD ERROR]:", err);
    return NextResponse.json(
      { error: "パスワード再設定メールの送信に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
