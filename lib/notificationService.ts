import { createClient } from "@supabase/supabase-js";

export type ReviewNotificationParams = {
  type: "work" | "credit"; // 就業トラブル(work) または 企業信用(credit)
  status: "approved" | "rejected";
  targetName: string; // 対象者の氏名 または 対象企業名
  reason?: string; // 却下理由 (rejectedの場合)
  registeredByUserId?: string | null;
  registeredCompanyId?: string | null;
};

export async function sendCaseReviewNotification(params: ReviewNotificationParams) {
  const {
    type,
    status,
    targetName,
    reason,
    registeredByUserId,
    registeredCompanyId,
  } = params;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.warn("Service role key or URL missing. Skipping review email notification.");
      return { sent: false, reason: "Missing credentials" };
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 宛先メールアドレスのリスト
    const recipientEmails: string[] = [];

    // 1. 申請者ユーザーのメールアドレス取得
    if (registeredByUserId) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(registeredByUserId);
      if (userData?.user?.email) {
        recipientEmails.push(userData.user.email);
      }
    }

    // 2. ユーザーが見つからない、または会社単位での登録の場合、その会社のアカウントユーザー全員を宛先に追加
    if (recipientEmails.length === 0 && registeredCompanyId) {
      const { data: usersInCompany } = await supabaseAdmin
        .from("app_users")
        .select("id")
        .eq("company_id", registeredCompanyId);

      if (usersInCompany && usersInCompany.length > 0) {
        for (const u of usersInCompany) {
          const { data: uAuth } = await supabaseAdmin.auth.admin.getUserById(u.id);
          if (uAuth?.user?.email && !recipientEmails.includes(uAuth.user.email)) {
            recipientEmails.push(uAuth.user.email);
          }
        }
      }
    }

    if (recipientEmails.length === 0) {
      console.warn("No recipient email found for review notification:", params);
      return { sent: false, reason: "No recipient email found" };
    }

    const typeLabel = type === "work" ? "就業トラブル情報" : "企業信用（未払い）情報";
    const statusLabel = status === "approved" ? "承認" : "却下（見送り）";
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.m-m-m-mieris0610.com";

    const subject = status === "approved"
      ? `【MIERIS】ご登録申請が承認されました（${targetName} 様 / 社）`
      : `【MIERIS】ご登録申請の審査結果について（${targetName} 様 / 社）`;

    let textContent = "";
    if (status === "approved") {
      textContent = `MIERIS をご利用いただき、誠にありがとうございます。
MIERIS 運営事務局でございます。

貴社よりご申請いただきました下記情報の審査が完了し、正式に【承認】されましたのでご報告いたします。
情報はデータベースに反映され、適正に管理・共有されます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 審査結果: 承認完了
■ 対象種別: ${typeLabel}
■ 申請対象: ${targetName}
■ 反映日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

登録内容の詳細は下記ダッシュボードよりいつでもご確認いただけます。
マイページ: ${appBaseUrl}/dashboard

今後とも MIERIS をよろしくお願い申し上げます。
──────────────────────────────
MIERIS 運営事務局
お問い合わせ: ${appBaseUrl}/contact
──────────────────────────────`;
    } else {
      textContent = `MIERIS をご利用いただき、誠にありがとうございます。
MIERIS 運営事務局でございます。

貴社よりご申請いただきました下記情報につきまして、運営事務局にて厳正に審査を行いました結果、
誠に恐れ入りますが今回は【却下（登録見送り）】の判断となりましたことをご連絡いたします。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 審査結果: 却下（登録見送り）
■ 対象種別: ${typeLabel}
■ 申請対象: ${targetName}
■ 判定日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}

【却下の理由】
${reason || "裏付け資料の不足または登録要件に合致しないため"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

不足資料の追加提出や内容を修正のうえでの再申請も可能となっております。
ご不明点やご確認がございましたら、下記よりお問い合わせまたはダッシュボードをご確認ください。

ダッシュボード: ${appBaseUrl}/dashboard
お問い合わせ: ${appBaseUrl}/contact

何卒ご理解のほどよろしくお願い申し上げます。
──────────────────────────────
MIERIS 運営事務局
──────────────────────────────`;
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.log(`[SIMULATED EMAIL] RESEND_API_KEY not set. Email would be sent to: ${recipientEmails.join(", ")}\nSubject: ${subject}\nContent:\n${textContent}`);
      return { sent: true, simulated: true, recipients: recipientEmails };
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "MIERIS 運営事務局 <onboarding@resend.dev>";

    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: recipientEmails,
      subject: subject,
      text: textContent,
    });

    if (emailResult.error) {
      console.error("Resend error in case review notification:", emailResult.error);
      return { sent: false, error: emailResult.error.message };
    }

    return { sent: true, recipients: recipientEmails, id: emailResult.data?.id };

  } catch (error: any) {
    console.error("Error in sendCaseReviewNotification:", error);
    return { sent: false, error: error.message };
  }
}
