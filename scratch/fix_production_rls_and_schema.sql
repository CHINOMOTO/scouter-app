-- ============================================================================
-- MIERIS 本番リリース前 Supabase RLS厳格化 & 不足カラム適用 SQL
-- 作成日: 2026-11-21
-- 根拠: check_production_rls.sql の点検結果に基づく本番DB最終仕上げ
--
-- 【前提確認済み】
--   本アプリの業務テーブル読み書きはすべて Next.js API（service_role）経由。
--   ブラウザ（authenticated）から直接アクセスするのは以下の2箇所のみ：
--     1. public.app_users の自分自身の行 SELECT（ログイン/承認/Realtime判定）
--     2. storage.objects（case-evidence）への自分のフォルダ <auth.uid()>/... への INSERT
--
-- 【実行手順】
--   1. 本SQLを Supabase Dashboard → SQL Editor で実行
--   2. 続けて scratch/check_production_rls.sql を再実行し、全項目 OK を確認
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Storage RLS 厳格化（他社証拠ファイルの閲覧防止 & 承認済み本人のみアップロード許可）
-- ============================================================================
-- 【最重要】他社・未承認ユーザーが他社の証拠資料を直接閲覧できる SELECT ポリシーを削除
-- （アプリ側の証拠資料閲覧はすべて API 発行の署名付きURL経由のため影響なし）
DROP POLICY IF EXISTS "Allow authenticated select" ON storage.objects;

-- 緩いアップロードポリシーを「承認済みユーザー ＆ 自分の <auth.uid()>/ フォルダのみ」に厳格化
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Approved users can upload own case evidence" ON storage.objects;

CREATE POLICY "Approved users can upload own case evidence"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'case-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.app_users
    WHERE id = auth.uid()
      AND is_approved = true
  )
);

-- case-evidence バケットのサイズ上限をアプリ側上限（50MB）と一致させ、非公開を明示保証
UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 52428800
WHERE id = 'case-evidence';

-- ============================================================================
-- 2. public.app_users RLS 厳格化（自分の行の SELECT のみに限定・権限昇格防止）
-- ============================================================================
-- プロフィール更新は /api/profile 経由のため直接 UPDATE を完全禁止
DROP POLICY IF EXISTS "Users update own profile only" ON public.app_users;
DROP POLICY IF EXISTS "Users view own or same company" ON public.app_users;
DROP POLICY IF EXISTS "Admins full access on app_users" ON public.app_users;
DROP POLICY IF EXISTS "Users view own app_users row only" ON public.app_users;

CREATE POLICY "Users view own app_users row only"
ON public.app_users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- ============================================================================
-- 3. 業務テーブルの不要な直接アクセスポリシーを削除（API迂回・全件ダンプ防止）
-- ============================================================================
-- 3-1. companies（全加盟社一覧の直接取得を遮断）
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
DROP POLICY IF EXISTS "Admins full access on companies" ON public.companies;

-- 3-2. blacklist_cases（API側の検索必須・limit(50)・admin_notes除外の迂回を遮断）
DROP POLICY IF EXISTS "WORK users view approved or own company cases" ON public.blacklist_cases;
DROP POLICY IF EXISTS "WORK users insert pending own company cases" ON public.blacklist_cases;
DROP POLICY IF EXISTS "WORK users update own unapproved cases" ON public.blacklist_cases;
DROP POLICY IF EXISTS "Admins full access on blacklist_cases" ON public.blacklist_cases;

-- 3-3. credit_cases（API側の検索必須・limit(50)・対象外業種除外・プラン確認の迂回を遮断）
DROP POLICY IF EXISTS "Approved credit cases are viewable by authorized users" ON public.credit_cases;
DROP POLICY IF EXISTS "CREDIT users can insert own company credit cases" ON public.credit_cases;
DROP POLICY IF EXISTS "Admins have full access to credit cases" ON public.credit_cases;

-- 3-4. announcements（全操作 API 経由）
DROP POLICY IF EXISTS "Authenticated users view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins full access on announcements" ON public.announcements;

-- 3-5. audit_logs（TO public の残存ポリシーを削除・全操作 API 経由）
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;

-- 3-6. contact_inquiries（TO public の残存ポリシーを削除・全操作 API 経由）
DROP POLICY IF EXISTS "Admins can update inquiry status" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Admins can view all inquiries" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Users can insert their own inquiries" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Users can view their own inquiries" ON public.contact_inquiries;

-- 3-7. credit_watchlist（未使用テーブル上の TO public 残存ポリシーを削除）
DROP POLICY IF EXISTS "Users can delete their company's watchlist" ON public.credit_watchlist;
DROP POLICY IF EXISTS "Users can insert their company's watchlist" ON public.credit_watchlist;
DROP POLICY IF EXISTS "Users can update their company's watchlist" ON public.credit_watchlist;
DROP POLICY IF EXISTS "Users can view their company's watchlist" ON public.credit_watchlist;

-- ============================================================================
-- 4. 不足していた credit_cases 登記・営業実態カラム（4件）を追加
--    ※未適用だと /api/credit-cases が毎回最小フォールバックに落ち is_official が効かないため必須
-- ============================================================================
ALTER TABLE public.credit_cases
  ADD COLUMN IF NOT EXISTS business_status TEXT DEFAULT 'unreachable',
  ADD COLUMN IF NOT EXISTS registry_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS registry_close_date TEXT,
  ADD COLUMN IF NOT EXISTS registry_close_cause TEXT;

COMMENT ON COLUMN public.credit_cases.business_status IS '営業実態ステータス: active(連絡可能), unreachable(音信不通), relocated(事務所引き払い・夜逃げ), bankrupt(破産・倒産手続き中), unknown(不明)';
COMMENT ON COLUMN public.credit_cases.registry_status IS '公的登記ステータス: active(登記中), closed(登記閉鎖・解散済), sole_proprietor(個人事業主・一人親方), unknown(未確認)';
COMMENT ON COLUMN public.credit_cases.registry_close_date IS '登記閉鎖年月日 (例: 2024-10-15)';
COMMENT ON COLUMN public.credit_cases.registry_close_cause IS '登記閉鎖事由 (例: 清算結了, 解散)';

-- ============================================================================
-- 5. app_users の Realtime 購読を有効化（プラン変更・承認状態の即時反映）
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'app_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;
  END IF;
END $$;

COMMIT;
