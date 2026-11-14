import nodemailer from "nodemailer";

export function createMailTransporter() {
  const host = process.env.SMTP_HOST || "uiken.sakura.ne.jp";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || "mieris0610@uiken.jp";
  const pass = process.env.SMTP_PASSWORD;

  if (!pass) {
    return null;
  }

  // さくらインターネットのSMTP設定 (ポート587 / STARTTLS) または 465 (SSL)
  const isSecure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false, // さくらの共有SSL対応
    },
  });
}

export const DEFAULT_FROM_ADDRESS = process.env.EMAIL_FROM || "MIERIS 運営事務局 <mieris0610@uiken.jp>";
