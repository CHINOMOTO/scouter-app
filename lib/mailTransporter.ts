import nodemailer from "nodemailer";

export function createMailTransporter() {
  const rawHost = process.env.SMTP_HOST || "uiken.sakura.ne.jp";
  const rawPort = process.env.SMTP_PORT || "587";
  const rawUser = process.env.SMTP_USER || "mieris0610@uiken.jp";
  const rawPass = process.env.SMTP_PASSWORD;

  const host = rawHost.trim();
  const port = parseInt(rawPort.trim(), 10);
  const user = rawUser.trim();
  const pass = rawPass ? rawPass.trim() : undefined;

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
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: false, // さくらの共有SSL対応
      servername: host,
    },
  } as any);
}

export const DEFAULT_FROM_ADDRESS = (process.env.EMAIL_FROM || "MIERIS 運営事務局 <mieris0610@uiken.jp>").trim();
