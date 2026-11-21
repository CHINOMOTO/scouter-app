/**
 * 日本時間（JST / Asia/Tokyo）に統一した日時フォーマットおよび日数計算ユーティリティ
 * ブラウザやサーバーのローカルタイムゾーン（UTC等）による日付・1日ズレを防止する
 */

const JST_TIME_ZONE = "Asia/Tokyo";

/**
 * 現在の日本時間（JST）のカレンダー日付を "YYYY-MM-DD" で返す
 */
export function getTodayIsoDateJST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value || "1970";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DD 文字列をタイムゾーン非依存の「UTC日付エポック日（通算日数）」へ変換する
 */
function isoDateToDayNumber(dateStr: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() + 1 !== m ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return Math.floor(dt.getTime() / (1000 * 60 * 60 * 24));
}

/**
 * YYYY-MM-DD 形式の妥当性チェック（実在日・年範囲・未来日禁止オプション対応）
 */
export function isValidCalendarDate(
  dateStr?: string | null,
  options?: { minYear?: number; maxYear?: number; allowFuture?: boolean }
): boolean {
  if (!dateStr || typeof dateStr !== "string") return false;
  const trimmed = dateStr.trim();
  const dayNum = isoDateToDayNumber(trimmed);
  if (dayNum === null) return false;

  const year = Number(trimmed.slice(0, 4));
  const minYear = options?.minYear ?? 1900;
  const maxYear = options?.maxYear ?? 2100;
  if (year < minYear || year > maxYear) return false;

  if (options?.allowFuture === false) {
    const todayNum = isoDateToDayNumber(getTodayIsoDateJST());
    if (todayNum !== null && dayNum > todayNum) {
      return false;
    }
  }
  return true;
}

/**
 * 支払期日（YYYY-MM-DD）から日本時間（JST）の本日の経過日数を算出する
 * - 正の値: 期日超過日数（遅延中）
 * - 0: 本日が支払期日
 * - 負の値: 期日まで残り日数
 */
export function getDiffDaysFromDueDateJST(dueDateStr?: string | null): number | null {
  if (!dueDateStr) return null;
  // ISOタイムスタンプが渡された場合も先頭10文字(YYYY-MM-DD)を抽出
  const datePart = dueDateStr.trim().slice(0, 10);
  const dueDayNum = isoDateToDayNumber(datePart);
  const todayDayNum = isoDateToDayNumber(getTodayIsoDateJST());
  if (dueDayNum === null || todayDayNum === null) return null;
  return todayDayNum - dueDayNum;
}

/**
 * 支払期日超過日数（0以上）を JST カレンダー日付ベースで返す
 */
export function calculateOverdueDaysJST(dueDateStr?: string | null): number {
  const diff = getDiffDaysFromDueDateJST(dueDateStr);
  return diff !== null && diff > 0 ? diff : 0;
}

/**
 * YYYY-MM-DD または ISO タイムスタンプを日本時間の日付（YYYY/MM/DD 等）へフォーマット
 */
export function formatDateJST(
  value?: string | Date | null,
  options?: { long?: boolean }
): string {
  if (!value) return "-";
  // YYYY-MM-DD だけの純粋な日付文字列はタイムゾーン変換によるズレを避けてそのまま整形
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [y, m, d] = value.trim().split("-");
    if (options?.long) {
      return `${Number(y)}年${Number(m)}月${Number(d)}日`;
    }
    return `${y}/${m}/${d}`;
  }

  const dt = value instanceof Date ? value : new Date(value);
  if (isNaN(dt.getTime())) return "-";

  if (options?.long) {
    return dt.toLocaleDateString("ja-JP", {
      timeZone: JST_TIME_ZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return dt.toLocaleDateString("ja-JP", {
    timeZone: JST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * ISO タイムスタンプを日本時間の日時（YYYY/MM/DD HH:mm または HH:mm:ss）へフォーマット
 */
export function formatDateTimeJST(
  value?: string | Date | null,
  options?: { withSeconds?: boolean }
): string {
  if (!value) return "-";
  const dt = value instanceof Date ? value : new Date(value);
  if (isNaN(dt.getTime())) return "-";

  return dt.toLocaleString("ja-JP", {
    timeZone: JST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(options?.withSeconds ? { second: "2-digit" } : {}),
  });
}
