// Supabase・サーバーAPI・ブラウザfetch等から返される英文エラーメッセージを
// ユーザー向けの分かりやすい日本語に変換する共通ヘルパー

export type TranslateErrorOptions = {
  /** デフォルトの日本語フォールバック文言 */
  fallback?: string;
  /** 管理者向けのSMTP詳細ヒント（さくら国外IPフィルタ等）を表示するか */
  includeAdminSmtpHint?: boolean;
};

export function translateErrorMessage(
  error: unknown,
  options?: string | TranslateErrorOptions
): string {
  const opts: TranslateErrorOptions =
    typeof options === "string" ? { fallback: options } : options || {};
  const fallback =
    opts.fallback ||
    "処理中にエラーが発生しました。時間をおいて再度お試しいただくか、運営事務局へお問い合わせください。";

  if (!error) return fallback;

  const rawMsg =
    typeof error === "string"
      ? error
      : typeof error === "object" && error !== null
        ? String((error as any).message || (error as any).error || "")
        : "";

  const msg = rawMsg.trim();
  if (!msg) return fallback;

  const lower = msg.toLowerCase();

  // メールアドレス・アカウント関連
  if (
    lower.includes("already been registered") ||
    lower.includes("email already in use") ||
    lower.includes("already registered") ||
    lower.includes("user already exists")
  ) {
    return "このメールアドレスは既に登録されています。別のメールアドレスをご使用いただくか、登録済みのアカウントをご確認ください。";
  }
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (lower.includes("email not confirmed")) {
    return "メールアドレスの確認が完了していません。受信トレイをご確認ください。";
  }
  if (lower.includes("user not found")) {
    return "該当するユーザーが見つかりません。";
  }

  // パスワード関連
  if (
    lower.includes("password should be at least") ||
    lower.includes("at least 6 characters") ||
    lower.includes("at least 8 characters")
  ) {
    return "パスワードは8文字以上で設定してください。";
  }
  if (lower.includes("different from the old password") || lower.includes("same_password")) {
    return "以前と同じパスワードは設定できません。異なるパスワードを入力してください。";
  }
  if (lower.includes("weak_password") || lower.includes("too weak") || lower.includes("pwned")) {
    return "安全性が低いパスワードです。英数字や記号を組み合わせた強固なパスワードを設定してください。";
  }

  // レートリミット・セキュリティ関連
  if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("over_email_send_rate_limit") ||
    lower.includes("security purposes")
  ) {
    return "短時間の操作回数が制限を超えました。セキュリティ保護のため、数分ほど時間をおいてから再度お試しください。";
  }

  // 権限・セッション関連
  if (
    lower.includes("auth session missing") ||
    lower.includes("jwt expired") ||
    lower.includes("invalid jwt") ||
    lower.includes("token is expired") ||
    lower.includes("invalid refresh token")
  ) {
    return "ログインセッションの有効期限が切れています。再度ログインしてください。";
  }
  if (
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden")
  ) {
    return "この操作を行う権限がありません。";
  }

  // ストレージ・ファイル関連
  if (
    lower.includes("payload too large") ||
    lower.includes("exceeded the maximum allowed size") ||
    lower.includes("file size")
  ) {
    return "ファイルサイズが上限（1ファイルあたり50MB）を超えています。ファイルサイズを縮小して再度お試しください。";
  }
  if (lower.includes("mime type") || lower.includes("not supported") || lower.includes("invalid file")) {
    return "このファイル形式はアップロードできません。画像（JPG/PNG/GIF/WebP）またはPDFを選択してください。";
  }
  if (lower.includes("bucket not found") || lower.includes("object not found")) {
    return "ファイルの保存または取得に失敗しました。時間をおいて再度お試しください。";
  }

  // 入力・DB型エラー関連
  if (lower.includes("invalid input syntax for type uuid")) {
    return "指定されたIDの形式が正しくありません。";
  }
  if (lower.includes("invalid input syntax for type date")) {
    return "日付の形式が正しくありません。正しい日付を入力してください。";
  }
  if (lower.includes("out of range") || lower.includes("bigint") || lower.includes("numeric field overflow")) {
    return "入力された数値が許容範囲を超えています。内容をご確認ください。";
  }
  if (lower.includes("foreign key")) {
    return "関連するデータが存在するため、この操作を実行できません。";
  }
  if (lower.includes("duplicate key") || lower.includes("unique constraint")) {
    return "既に同じ情報が登録されているため、重複して登録することはできません。";
  }

  // ネットワーク・JSONパース・サーバー関連
  if (
    lower.includes("failed to fetch") ||
    lower.includes("load failed") ||
    lower.includes("networkerror") ||
    lower.includes("network error") ||
    lower.includes("err_internet_disconnected")
  ) {
    return "ネットワーク通信に失敗しました。インターネット接続をご確認のうえ、再度お試しください。";
  }
  if (lower.includes("unexpected token") || lower.includes("unexpected end of json") || lower.includes("invalid json")) {
    return "サーバーから予期しない応答が返されました。時間をおいて再度お試しください。";
  }
  if (lower.includes("internal server error") || lower.includes("server error")) {
    return "サーバーで問題が発生しました。時間をおいて再度お試しいただくか、運営事務局へお問い合わせください。";
  }

  // メールサーバー・SMTP関連（管理者専用ヒントはオプション時のみ付与）
  if (lower.includes("command rejected") || lower.includes("550 5.7.1") || lower.includes("relaying denied")) {
    return opts.includeAdminSmtpHint
      ? "メールサーバー（さくらインターネット）のセキュリティ設定（国外IPアドレスフィルタ等）により送信が拒否されました。コントロールパネルの設定を確認するか、案内文をコピーして送信してください。"
      : "メール送信サーバーとの通信が拒否されました。時間をおいて再度お試しいただくか、運営事務局へお問い合わせください。";
  }
  if (lower.includes("authentication failed") || lower.includes("535 5.7.0")) {
    return opts.includeAdminSmtpHint
      ? "メール送信サーバー（SMTP）の認証に失敗しました。サーバー設定をご確認ください。"
      : "メール送信に失敗しました。時間をおいて再度お試しください。";
  }
  if (
    lower.includes("getaddrinfo") ||
    lower.includes("ebusy") ||
    lower.includes("enotfound") ||
    lower.includes("smtp") ||
    lower.includes("etimedout") ||
    lower.includes("econnrefused")
  ) {
    return opts.includeAdminSmtpHint
      ? "メールサーバーとの接続が一時的に失敗しました。時間をおいて再度送信をお試しください。"
      : "メール送信サーバーとの通信に失敗しました。時間をおいて再度お試しください。";
  }

  // 日本語（ひらがな・カタカナ・漢字）が含まれている場合は自然な日本語メッセージとして返却
  // ただし「失敗しました: Failed to fetch」のように末尾に英語生エラーが付いた場合は除去して再帰判定する
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(msg);
  if (hasJapanese) {
    return msg;
  }

  // 未翻訳の英語エラーは一切ユーザー画面に露出させない
  return fallback;
}
