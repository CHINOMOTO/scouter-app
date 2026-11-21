import { NextResponse } from "next/server";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

export interface AuthenticatedAppUser {
  id: string;
  role: string;
  company_id: string | null;
  allowed_plan: string | null;
  is_approved: boolean | null;
}

export type AuthResult =
  | {
      ok: true;
      user: User;
      appUser: AuthenticatedAppUser;
      isAdmin: boolean;
      userPlan: string;
      supabaseUser: SupabaseClient;
      supabaseAdmin: SupabaseClient;
    }
  | {
      ok: false;
      response: NextResponse;
    };

/**
 * APIルート共通の認証・承認・プラン・管理者チェック
 */
export async function authenticateApiRequest(
  request: Request,
  options?: {
    requirePlan?: "employment" | "credit";
    requireAdmin?: boolean;
  }
): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "認証情報がありません" }, { status: 401 }),
    };
  }
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "認証トークンが無効です" }, { status: 401 }),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 }),
    };
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "ユーザー情報を取得できませんでした" }, { status: 401 }),
    };
  }

  const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : supabaseUser;

  const { data: appUser } = await supabaseAdmin
    .from("app_users")
    .select("id, role, company_id, allowed_plan, is_approved, companies ( plan_type )")
    .eq("id", user.id)
    .maybeSingle();

  if (!appUser || appUser.is_approved !== true) {
    return {
      ok: false,
      response: NextResponse.json({ error: "承認されたアカウントが必要です" }, { status: 403 }),
    };
  }

  const isAdmin = appUser.role === "admin";
  const companyPlan = (appUser.companies as any)?.plan_type || null;
  const rawPlan = appUser.allowed_plan || companyPlan;
  const userPlan = isAdmin
    ? (rawPlan || "full")
    : (rawPlan === "full" || rawPlan === "employment" || rawPlan === "credit" ? rawPlan : "none");

  if (options?.requireAdmin && !isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 }),
    };
  }

  if (options?.requirePlan === "credit" && !isAdmin && !["full", "credit"].includes(userPlan)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "この機能は「MIERIS CREDIT」または「FULL」プランのご契約が必要です",
          planRestricted: true,
        },
        { status: 403 }
      ),
    };
  }

  if (options?.requirePlan === "employment" && !isAdmin && !["full", "employment"].includes(userPlan)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "この機能は「MIERIS WORK」または「FULL」プランのご契約が必要です",
          planRestricted: true,
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    user,
    appUser,
    isAdmin,
    userPlan,
    supabaseUser,
    supabaseAdmin,
  };
}

/**
 * PostgREST の .or() フィルタ構文および SQL ILIKE ワイルドカード（%, _）を除去するサニタイザー
 */
export function sanitizePostgrestFilterValue(value: string): string {
  return value.replace(/[,()*%_\\'"]/g, "").trim();
}

/**
 * 一般ユーザーが登録・添付できる自身の Storage エビデンスパスかを厳格検証する（IDOR・パストラバーサル・外部URL注入防止）
 * 許可形式: "<userId>/<安全ファイル名>.<許可拡張子>"
 */
export function isValidUserEvidencePath(rawPath: string, userId: string): boolean {
  if (typeof rawPath !== "string" || typeof userId !== "string" || !userId) return false;
  const trimmed = rawPath.trim();
  if (!trimmed || trimmed.length > 500) return false;
  if (trimmed.includes("..") || trimmed.includes("\\") || /^https?:\/\//i.test(trimmed)) return false;
  const escapedUid = userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedUid}/[A-Za-z0-9._-]+\\.(jpg|jpeg|png|gif|webp|pdf)$`, "i");
  return pattern.test(trimmed);
}

/**
 * 管理者による Storage パス検証（パストラバーサル・外部URL注入防止）
 */
export function isSafeStorageEvidencePath(rawPath: string): boolean {
  if (typeof rawPath !== "string") return false;
  const trimmed = rawPath.trim();
  if (!trimmed || trimmed.length > 500) return false;
  if (trimmed.includes("..") || trimmed.includes("\\") || /^https?:\/\//i.test(trimmed)) return false;
  return /^[A-Za-z0-9_-]+\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(trimmed);
}
