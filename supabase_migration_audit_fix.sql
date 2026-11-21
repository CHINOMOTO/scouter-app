-- ============================================================================
-- MIERIS 本番リリース前監査 Phase 1 マイグレーションSQL
-- 作成日: 2026-11-21
-- 目的:
--   1. credit_cases に is_official カラムを追加し、公的処分データと民間未払い
--      データを厳密に区別（テキスト「【」依存による他社民間案件漏洩を防止）
--   2. audit_logs.user_id の NOT NULL 制約を解除し、ユーザー削除時も監査証跡
--      （照会・閲覧履歴）を消去せず永続保持可能にする
-- ============================================================================

-- 1. credit_cases.is_official カラム追加およびインデックス作成
ALTER TABLE public.credit_cases
ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.credit_cases.is_official IS '公的機関公表データフラグ（true: 省庁・裁判所等の公的処分記録 / false: 加盟企業からの民間未払い申告）';

CREATE INDEX IF NOT EXISTS idx_credit_cases_is_official
ON public.credit_cases (is_official);

-- 2. 既存レコードの公的データバックフィル
--    各省庁・官報・裁判所等の公式プレフィックスまたは公的機関URLを持つレコードを is_official = true に更新
UPDATE public.credit_cases
SET is_official = true
WHERE is_official = false
  AND (
    counterparty_claim LIKE '【厚生労働省%'
    OR counterparty_claim LIKE '【国土交通省%'
    OR counterparty_claim LIKE '【東京都知事%'
    OR counterparty_claim LIKE '【消費者庁%'
    OR counterparty_claim LIKE '【官報公告%'
    OR counterparty_claim LIKE '【公正取引委員会%'
    OR counterparty_claim LIKE '【経済産業省%'
    OR counterparty_claim LIKE '%地方裁判所公認%'
    OR counterparty_claim LIKE '%gBizINFO%'
    OR EXISTS (
      SELECT 1
      FROM unnest(COALESCE(evidence_urls, ARRAY[]::text[])) AS u
      WHERE u LIKE '%.go.jp%' OR u LIKE '%kanpou%'
    )
  );

-- 3. audit_logs.user_id の NOT NULL 制約解除（ユーザー削除時の監査証跡保全）
ALTER TABLE public.audit_logs
ALTER COLUMN user_id DROP NOT NULL;

-- 外部キー制約が存在する場合、削除時にエラーにならないよう ON DELETE SET NULL へ整理
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT tc.constraint_name
    INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'audit_logs'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'user_id'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.audit_logs DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'audit_logs_user_id_fkey adjustment skipped: %', SQLERRM;
END $$;

-- 4. 確認クエリ（実行後、件数に不自然さがないか確認してください）
SELECT
  is_official,
  COUNT(*) AS record_count
FROM public.credit_cases
GROUP BY is_official
ORDER BY is_official DESC;
