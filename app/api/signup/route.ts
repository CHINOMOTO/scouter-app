import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createMailTransporter, DEFAULT_FROM_ADDRESS } from "@/lib/mailTransporter";

const PLAN_LABELS: Record<string, string> = {
  full: "FULLプラン（MIERIS WORK ＋ MIERIS CREDIT / 月額30,000円）",
  employment: "MIERIS WORK（就業情報・人物信用 / 月額18,000円）",
  credit: "MIERIS CREDIT（企業信用・未払い防止 / 月額18,000円）",
};

const sanitizeSingleLine = (val: unknown, maxLen: number): string => {
  if (typeof val !== "string") return "";
  return val.replace(/[\r\n]+/g, " ").trim().slice(0, maxLen);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const companyName = sanitizeSingleLine(body?.companyName, 120);
    const displayName = sanitizeSingleLine(body?.displayName, 80);
    const email = sanitizeSingleLine(body?.email, 160);
    const phoneNumber = sanitizeSingleLine(body?.phoneNumber, 30);
    const rawCorpNum = sanitizeSingleLine(body?.corporateNumber, 30);
    const cleanCorpNum = rawCorpNum.replace(/[^0-9]/g, "");
    const planType = ["full", "employment", "credit"].includes(body?.planType)
      ? (body.planType as "full" | "employment" | "credit")
      : "full";
    const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 1500) : "";

    if (!companyName || !displayName) {
      return NextResponse.json({ error: "会社名と担当者名は必須です。" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "正しいメールアドレス形式で入力してください。" }, { status: 400 });
    }
    if (!/^[0-9-]+$/.test(phoneNumber)) {
      return NextResponse.json({ error: "電話番号は半角数字とハイフンのみで入力してください。" }, { status: 400 });
    }
    if (cleanCorpNum.length !== 13) {
      return NextResponse.json({ error: "法人番号（13桁の半角数字）を必ず入力してください。" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: "サーバー設定エラーのため受付できません。" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const chosenPlan = PLAN_LABELS[planType];
    const inquiryMessage = `【新規利用お申し込み】
希望プラン: ${chosenPlan}
法人番号: ${cleanCorpNum}
会社名: ${companyName}
担当者名: ${displayName}
メール: ${email}
電話番号: ${phoneNumber}
備考・ご質問:
${notes || "なし"}`;

    const { error: insertError } = await supabaseAdmin.from("contact_inquiries").insert({
      company_name: companyName,
      user_name: displayName,
      email,
      phone_number: phoneNumber,
      category: "account",
      message: inquiryMessage,
      status: "unread",
    });

    if (insertError) {
      console.error("[SIGNUP] DB insert error:", insertError);
      return NextResponse.json(
        { error: "お申し込みデータの保存に失敗しました。時間をおいて再度お試しください。" },
        { status: 500 }
      );
    }

    // 1. 管理者へ LINE 通知（環境変数未設定時はスキップ）
    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const adminUserId = process.env.LINE_ADMIN_USER_ID;
    if (lineToken && adminUserId) {
      const targetIds = adminUserId.split(",").map((id) => id.trim()).filter(Boolean);
      const lineText = `【MIERIS システム通知】\n\n新規アカウントの登録申請がありました。\n\n氏名: ${displayName}（希望プラン: ${planType}）\n会社: ${companyName}\n法人番号: ${cleanCorpNum}\nEmail: ${email} / TEL: ${phoneNumber}\n\n管理画面にログインして承認・却下を行ってください。`;
      await Promise.allSettled(
        targetIds.map((targetId) =>
          fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lineToken}`,
            },
            body: JSON.stringify({
              to: targetId,
              messages: [{ type: "text", text: lineText }],
            }),
          })
        )
      );
    }

    // 2. 申込者へ自動返信メール送信（DB保存成功後のみ）
    try {
      const transporter = createMailTransporter();
      if (transporter) {
        const subject = "【MIERIS】利用お申し込みを受け付けました";
        const textContent = `${companyName}
${displayName} 様

この度は、就業情報・企業信用情報共有システム「MIERIS（ミエリス）」へ
お申し込みいただき、誠にありがとうございます。

下記の内容でお申し込みを受け付けいたしました。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ お申し込み内容
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
・ご希望プラン: ${chosenPlan}
・貴社名: ${companyName}
・法人番号: ${cleanCorpNum}
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

        await transporter.sendMail({
          from: DEFAULT_FROM_ADDRESS,
          to: email,
          subject,
          text: textContent,
        });
      }
    } catch (mailErr) {
      console.warn("[SIGNUP] Auto-reply email skipped/failed:", mailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[SIGNUP] Unexpected error:", err);
    return NextResponse.json(
      { error: "お申し込みの送信に失敗しました。時間をおいて再度お試しください。" },
      { status: 500 }
    );
  }
}
