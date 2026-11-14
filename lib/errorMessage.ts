// SupabaseやサーバーAPIから返される英文エラーメッセージを分かりやすい日本語に変換する共通ヘルパー

export function translateErrorMessage(error: any): string {
  if (!error) return "エラーが発生しました";

  const msg = typeof error === "string" ? error : (error.message || error.error || "");
  const lower = msg.toLowerCase();

  // メールアドレス・アカウント関連
  if (lower.includes("already been registered") || lower.includes("email already in use") || lower.includes("already registered") || lower.includes("user already exists")) {
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
  if (lower.includes("password should be at least") || lower.includes("at least 6 characters") || lower.includes("at least 8 characters")) {
    return "パスワードは8文字以上で設定してください。";
  }
  if (lower.includes("different from the old password") || lower.includes("same_password")) {
    return "以前と同じパスワードは設定できません。異なるパスワードを入力してください。";
  }
  if (lower.includes("weak_password") || lower.includes("too weak") || lower.includes("pwned")) {
    return "安全性が低いパスワードです。英数字や記号を組み合わせた強固なパスワードを設定してください。";
  }

  // レートリミット・セキュリティ関連
  if (lower.includes("rate limit") || lower.includes("too many requests") || lower.includes("over_email_send_rate_limit") || lower.includes("security purposes")) {
    return "短時間の操作回数が制限を超えました。セキュリティ保護のため、数分ほど時間をおいてから再度お試しください。";
  }

  // 権限・セッション関連
  if (lower.includes("auth session missing") || lower.includes("jwt expired") || lower.includes("token is expired") || lower.includes("session")) {
    return "ログインセッションの有効期限が切れています。再度ログインしてください。";
  }
  if (lower.includes("permission denied") || lower.includes("row-level security") || lower.includes("unauthorized") || lower.includes("forbidden")) {
    return "この操作を行う権限がありません。";
  }

  // ネットワーク・サーバー関連
  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("networkerror") || lower.includes("abort")) {
    return "ネットワーク通信に失敗しました。インターネット接続をご確認ください。";
  }
  if (lower.includes("server error") || lower.includes("internal server error") || lower.includes("500")) {
    return "サーバーで問題が発生しました。時間をおいて再度お試しいただくか、運営事務局へお問い合わせください。";
  }

  // メールサーバー・SMTP関連
  if (lower.includes("getaddrinfo") || lower.includes("ebusy") || lower.includes("enotfound") || lower.includes("smtp") || lower.includes("etimedout") || lower.includes("econnrefused")) {
    return "メールサーバーとの接続が混雑しているか一時的に失敗しました。もう一度「案内メールを送信する」を押してお試しください。";
  }

  // データベース制約
  if (lower.includes("duplicate key") || lower.includes("unique constraint")) {
    return "既に同じ情報が登録されているため、重複して登録することはできません。";
  }

  // その他の英文エラーの場合はデフォルト日本語メッセージまたはそのまま返す
  return msg || "エラーが発生しました。入力内容をご確認の上、再度お試しください。";
}
