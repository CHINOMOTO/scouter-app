/**
 * 軽量インメモリ・スライディングウィンドウ方式のレートリミッター
 * 公開エンドポイント（/api/signup, /api/auth/reset-password）のスパム・メール爆撃防止用
 */

type RateLimitEntry = {
  timestamps: number[];
};

const buckets = new Map<string, RateLimitEntry>();
let lastCleanupAt = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export function checkRateLimit(options: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();

  // 定期的な古いエントリの掃除（メモリ肥大化防止）
  if (now - lastCleanupAt > CLEANUP_INTERVAL_MS) {
    lastCleanupAt = now;
    for (const [k, entry] of buckets.entries()) {
      const recent = entry.timestamps.filter((t) => now - t < 60 * 60 * 1000);
      if (recent.length === 0) {
        buckets.delete(k);
      } else {
        entry.timestamps = recent;
      }
    }
  }

  const entry = buckets.get(options.key) || { timestamps: [] };
  const windowStart = now - options.windowMs;
  const recentTimestamps = entry.timestamps.filter((t) => t > windowStart);

  if (recentTimestamps.length >= options.limit) {
    const oldestInWindow = recentTimestamps[0];
    const retryAfterMs = Math.max(1000, oldestInWindow + options.windowMs - now);
    buckets.set(options.key, { timestamps: recentTimestamps });
    return {
      allowed: false,
      retryAfterSec: Math.ceil(retryAfterMs / 1000),
    };
  }

  recentTimestamps.push(now);
  buckets.set(options.key, { timestamps: recentTimestamps });
  return { allowed: true, retryAfterSec: 0 };
}
