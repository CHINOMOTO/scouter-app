import { NextResponse } from "next/server";
import { createMailTransporter, DEFAULT_FROM_ADDRESS } from "@/lib/mailTransporter";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, displayName, companyName, planType } = body;

    if (!email || !displayName) {
      return NextResponse.json({ error: "メールアドレスと担当者名は必須です" }, { status: 400 });
    }

    const transporter = createMailTransporter();
    if (!transporter) {
      console.warn("SMTP not configured. Skipping applicant auto-reply email.");
      return NextResponse.json({ sent: false, reason: "SMTP not configured" });
    }

    const planLabels: Record<string, string> = {
      full: "FULLプラン（MIERIS WORK ＋ CREDIT / 月額30,000円）",
      employment: "MIERIS WORK（就業情報・人物信用 / 月額18,000円）",
      credit: "MIERIS CREDIT（企業信用・未払い防止 / 月額18,000円）",
    };

    const chosenPlan = planLabels[planType] || "FULLプラン";

    const subject = "【MIERIS】利用お申し込みを受け付けました";
    const textContent = `${companyName || "お申し込み企業"}
${displayName} 様

この度は、就業情報・企業信用情報共有システム「MIERIS（ミエリス）」へ
お申し込みいただき、誠にありがとうございます。

下記の内容でお申し込みを受け付けいたしました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ お申し込み内容
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
・ご希望プラン: ${chosenPlan}
・貴社名: ${companyName || "未入力"}
・ご担当者様: ${displayName} 様
・ご連絡先メール: ${email}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【今後の流れ】
1. 運営事務局（株式会社ミヤエモン / 株式会社宇井建設）にて会社情報・ご利用プランの確認
2. 担当者様へ利用規約および初期ログイン情報（ID/PW）の送付（通常1〜2営業日以内）
3. ログイン後、すぐにご利用を開始いただけます

ご不明な点やご質問などがございましたら、本メールへのご返信、
または下記窓口までお気軽にお問い合わせください。

──────────────────────────────
【MIERIS 運営事務局】
運営：株式会社ミヤエモン / 開発：株式会社宇井建設
〒103-0023 東京都中央区日本橋本町4-12-17 ヨネヅビル5F
TEL: 080-5584-6715（平日 10:00〜18:00）
Mail: mieris0610@uiken.jp
Web: https://mieris.jp
──────────────────────────────`;

    const info = await transporter.sendMail({
      from: DEFAULT_FROM_ADDRESS,
      to: email.trim(),
      subject,
      text: textContent,
    });

    console.log(`[SIGNUP AUTO-REPLY SENT] To: ${email} MessageId: ${info.messageId}`);
    return NextResponse.json({ sent: true, messageId: info.messageId });

  } catch (error: any) {
    console.error("Signup auto-reply email error:", error);
    // メール送信失敗でも画面側のお申込み自体は成功させるためエラーは返さない
    return NextResponse.json({ sent: false, error: error.message }, { status: 500 });
  }
}
