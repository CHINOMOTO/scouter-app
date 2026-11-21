-- ============================================================================
-- MIERIS 本番リリース前 Supabase RLS・Storage・スキーマ一括点検 SQL
-- 作成日: 2026-11-21
-- 特徴:
--   ・読み取り専用（SELECTのみ / データや設定は一切変更しません）
--   ・そのまま Supabase Dashboard → SQL Editor に貼り付けて「Run」を押すと、
--     全点検項目が 1 つの結果表（OK / 要確認 / NG）で出力されます。
-- ============================================================================

-- ============================================================================
-- 【STEP 1】一括ヘルスチェック（まずはこのまま全体を実行してください）
-- ============================================================================
SELECT
  no,
  category,
  check_item,
  status,
  detail
FROM (
  -- 1. public スキーマ全テーブルの RLS 有効化確認
  SELECT
    10 AS no,
    '1. RLS有効化'::text AS category,
    ('public.' || c.relname::text) AS check_item,
    CASE WHEN c.relrowsecurity THEN 'OK' ELSE 'NG' END AS status,
    CASE
      WHEN c.relrowsecurity THEN 'RLS有効'
      ELSE 'RLSが無効です！ ALTER TABLE public.' || c.relname::text || ' ENABLE ROW LEVEL SECURITY; が必要'
    END AS detail
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'

  UNION ALL

  -- 2. public テーブルへの anon / public ロール開放ポリシー有無
  SELECT
    20 AS no,
    '2. 未認証アクセス防御'::text AS category,
    'public.* の anon/public ポリシー有無'::text AS check_item,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'NG' END AS status,
    CASE
      WHEN COUNT(*) = 0 THEN 'anon / public 向けポリシーなし（安全）'
      ELSE '未認証開放ポリシー検出 (' || COUNT(*) || '件): '
           || string_agg(tablename::text || '.' || policyname::text || ' [' || cmd || ']', ', ')
    END AS detail
  FROM pg_policies
  WHERE schemaname = 'public'
    AND ('anon' = ANY(roles::text[]) OR 'public' = ANY(roles::text[]))

  UNION ALL

  -- 3-1. app_users: 認証ユーザーの自身行 SELECT 可否（RequireAuth / PlanContext に必須）
  SELECT
    30 AS no,
    '3. app_users RLS'::text AS category,
    '認証ユーザーの自身行 SELECT 可否'::text AS check_item,
    CASE
      WHEN COUNT(*) FILTER (WHERE LOWER(BTRIM(COALESCE(qual, ''))) IN ('true', '(true)')) > 0 THEN 'NG'
      WHEN COUNT(*) > 0 THEN 'OK'
      ELSE 'NG'
    END AS status,
    CASE
      WHEN COUNT(*) FILTER (WHERE LOWER(BTRIM(COALESCE(qual, ''))) IN ('true', '(true)')) > 0
        THEN '全ユーザー閲覧可能な USING(true) あり！ id = auth.uid() に制限してください'
      WHEN COUNT(*) > 0
        THEN 'SELECTポリシー ' || COUNT(*) || '件検出: '
             || string_agg(policyname::text || ' => ' || COALESCE(qual, ''), ' / ')
      ELSE 'SELECTポリシーが0件です！一般ユーザーがログイン後に承認確認できず /pending-approval へ飛ばされます'
    END AS detail
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'app_users'
    AND cmd IN ('SELECT', 'ALL')
    AND 'authenticated' = ANY(roles::text[])

  UNION ALL

  -- 3-2. app_users: 認証ユーザーの直接書込（権限昇格防止）チェック
  SELECT
    31 AS no,
    '3. app_users RLS'::text AS category,
    '認証ユーザーの直接 INSERT/UPDATE/DELETE 制限'::text AS check_item,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE '要確認' END AS status,
    CASE
      WHEN COUNT(*) = 0 THEN '直接書込ポリシーなし（プロフィール更新は /api/profile 経由のため安全）'
      ELSE '直接書込ポリシーあり (' || COUNT(*) || '件) — role/is_approved/allowed_plan を自己変更不可か要確認: '
           || string_agg(policyname::text || ' [' || cmd || ']', ', ')
    END AS detail
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'app_users'
    AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    AND 'authenticated' = ANY(roles::text[])

  UNION ALL

  -- 4. API経由専用テーブルへの authenticated 直接アクセス残存チェック
  --    ※旧 supabase_migration_20260928.sql の credit_cases ポリシー残存もここで検出されます
  SELECT
    40 AS no,
    '4. 業務テーブル直アクセス防御'::text AS category,
    ('public.' || t.tbl || ' の authenticated ポリシー') AS check_item,
    CASE
      WHEN COUNT(p.policyname) = 0 THEN 'OK'
      WHEN COUNT(p.policyname) FILTER (
        WHERE LOWER(COALESCE(p.qual, '')) LIKE '%admin%'
           OR LOWER(COALESCE(p.with_check, '')) LIKE '%admin%'
      ) = COUNT(p.policyname) THEN '要確認'
      ELSE 'NG'
    END AS status,
    CASE
      WHEN COUNT(p.policyname) = 0
        THEN 'authenticated 向け直接ポリシーなし（全操作 Next.js API 経由・最適）'
      ELSE 'ポリシー ' || COUNT(p.policyname) || '件残存（プラン越境・未承認回避リスクあり）: '
           || string_agg(p.policyname::text || ' [' || p.cmd || ']', ', ')
    END AS detail
  FROM (
    VALUES
      ('blacklist_cases'),
      ('credit_cases'),
      ('companies'),
      ('audit_logs'),
      ('contact_inquiries'),
      ('announcements')
  ) AS t(tbl)
  LEFT JOIN pg_policies p
    ON p.schemaname = 'public'
   AND p.tablename = t.tbl
   AND 'authenticated' = ANY(p.roles::text[])
  GROUP BY t.tbl

  UNION ALL

  -- 5-1. Storage: case-evidence バケットの存在・非公開確認
  SELECT
    50 AS no,
    '5. Storage設定'::text AS category,
    'case-evidence バケット設定'::text AS check_item,
    CASE
      WHEN COUNT(*) = 0 THEN 'NG'
      WHEN bool_or(public) THEN 'NG'
      ELSE 'OK'
    END AS status,
    CASE
      WHEN COUNT(*) = 0 THEN 'case-evidence バケットが存在しません！'
      WHEN bool_or(public) THEN '公開バケット(public=true)になっています！証拠資料がURL直打ちで流出するため非公開にしてください'
      ELSE '非公開(public=false) / サイズ上限=' || COALESCE(MAX(file_size_limit)::text, '無制限')
    END AS detail
  FROM storage.buckets
  WHERE id = 'case-evidence'

  UNION ALL

  -- 5-2. Storage: 全バケットに公開バケット（public=true）が混在していないか
  SELECT
    51 AS no,
    '5. Storage設定'::text AS category,
    '公開バケット (public=true) の有無'::text AS check_item,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'NG' END AS status,
    CASE
      WHEN COUNT(*) = 0 THEN '公開バケットなし（安全）'
      ELSE '公開バケット検出: ' || string_agg(id, ', ')
    END AS detail
  FROM storage.buckets
  WHERE public = true

  UNION ALL

  -- 5-3. Storage RLS: case-evidence への認証ユーザー INSERT 可否（証拠添付に必須）
  --      アプリ側は全画面で <userId>/<filename> パスへアップロードします
  SELECT
    52 AS no,
    '5. Storage RLS'::text AS category,
    'case-evidence への認証ユーザー INSERT 可否'::text AS check_item,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'NG' END AS status,
    CASE
      WHEN COUNT(*) > 0
        THEN 'INSERTポリシー ' || COUNT(*) || '件検出（<auth.uid()>/... パスを許可しているか確認）: '
             || string_agg(policyname::text || ' => ' || COALESCE(with_check, qual, ''), ' / ')
      ELSE 'INSERTポリシーがありません！案件登録・編集時の証拠ファイルアップロードが失敗します'
    END AS detail
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND cmd IN ('INSERT', 'ALL')
    AND 'authenticated' = ANY(roles::text[])
    AND (
      COALESCE(with_check, '') LIKE '%case-evidence%'
      OR COALESCE(qual, '') LIKE '%case-evidence%'
      OR (COALESCE(with_check, '') NOT LIKE '%bucket_id%' AND COALESCE(qual, '') NOT LIKE '%bucket_id%')
    )

  UNION ALL

  -- 5-4. Storage RLS: anon / public 開放ポリシー有無
  SELECT
    53 AS no,
    '5. Storage RLS'::text AS category,
    'storage.objects の anon/public ポリシー有無'::text AS check_item,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'NG' END AS status,
    CASE
      WHEN COUNT(*) = 0 THEN 'anon / public 向けポリシーなし（安全）'
      ELSE '未認証開放ポリシー検出 (' || COUNT(*) || '件): '
           || string_agg(policyname::text || ' [' || cmd || ']', ', ')
    END AS detail
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND ('anon' = ANY(roles::text[]) OR 'public' = ANY(roles::text[]))

  UNION ALL

  -- 5-5. Storage RLS: 認証ユーザーの直接 SELECT / DELETE ポリシー有無
  SELECT
    54 AS no,
    '5. Storage RLS'::text AS category,
    'storage.objects の認証ユーザー SELECT/DELETE 制限'::text AS check_item,
    CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE '要確認' END AS status,
    CASE
      WHEN COUNT(*) = 0 THEN '直接 SELECT/DELETE ポリシーなし（閲覧はAPI発行の署名付きURL経由・安全）'
      ELSE '直接ポリシーあり (' || COUNT(*) || '件) — 他社ファイルの閲覧・削除不可か確認: '
           || string_agg(policyname::text || ' [' || cmd || '] => ' || COALESCE(qual, ''), ' / ')
    END AS detail
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND cmd IN ('SELECT', 'DELETE', 'ALL')
    AND 'authenticated' = ANY(roles::text[])

  UNION ALL

  -- 6-1. マイグレーション: credit_cases.is_official カラム有無
  SELECT
    60 AS no,
    '6. マイグレーション・設定'::text AS category,
    'credit_cases.is_official カラム存在'::text AS check_item,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'NG' END AS status,
    CASE
      WHEN COUNT(*) > 0 THEN '適用済み'
      ELSE '未適用！ supabase_migration_audit_fix.sql を実行してください'
    END AS detail
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'credit_cases'
    AND column_name = 'is_official'

  UNION ALL

  -- 6-2. マイグレーション: credit_cases 登記・営業実態ステータス4カラム有無
  SELECT
    61 AS no,
    '6. マイグレーション・設定'::text AS category,
    'credit_cases 登記/営業実態カラム (4件)'::text AS check_item,
    CASE WHEN COUNT(*) = 4 THEN 'OK' ELSE '要確認' END AS status,
    '検出 ' || COUNT(*) || '/4件: ' || COALESCE(string_agg(column_name::text, ', ' ORDER BY column_name), 'なし') AS detail
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'credit_cases'
    AND column_name IN ('business_status', 'registry_status', 'registry_close_date', 'registry_close_cause')

  UNION ALL

  -- 6-3. マイグレーション: audit_logs.user_id NULL許容 & ON DELETE SET NULL
  SELECT
    62 AS no,
    '6. マイグレーション・設定'::text AS category,
    'audit_logs.user_id NULL許容 & FK設定'::text AS check_item,
    CASE
      WHEN col.is_nullable = 'YES' AND COALESCE(fk.delete_rule, 'SET NULL') = 'SET NULL' THEN 'OK'
      ELSE 'NG'
    END AS status,
    'is_nullable=' || COALESCE(col.is_nullable, 'カラム不在')
    || ', FK delete_rule=' || COALESCE(fk.delete_rule, 'FKなし')
    || CASE
         WHEN col.is_nullable = 'YES' AND COALESCE(fk.delete_rule, 'SET NULL') = 'SET NULL' THEN ''
         ELSE '（supabase_migration_audit_fix.sql の適用が必要）'
       END AS detail
  FROM (
    SELECT MAX(is_nullable::text) AS is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
      AND column_name = 'user_id'
  ) col
  CROSS JOIN (
    SELECT MAX(rc.delete_rule::text) AS delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
     AND tc.constraint_schema = rc.constraint_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'audit_logs'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
  ) fk

  UNION ALL

  -- 6-4. Realtime: app_users の supabase_realtime 登録確認
  SELECT
    63 AS no,
    '6. マイグレーション・設定'::text AS category,
    'app_users の Realtime 購読設定'::text AS check_item,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE '要確認' END AS status,
    CASE
      WHEN COUNT(*) > 0 THEN 'supabase_realtime に登録済み（プラン変更の即時反映有効）'
      ELSE '未登録（画面リロードでは反映されます。即時反映したい場合は Database → Publications で app_users を有効化）'
    END AS detail
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'app_users'

  UNION ALL

  -- 7-1. 初期データ: 承認済み管理者の存在確認
  SELECT
    70 AS no,
    '7. 初期データ整合性'::text AS category,
    '承認済み管理者アカウント数'::text AS check_item,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'NG' END AS status,
    '承認済み admin = ' || COUNT(*) || '名' AS detail
  FROM public.app_users
  WHERE role = 'admin' AND is_approved = true

  UNION ALL

  -- 7-2. 初期データ: companies / app_users の plan 値チェック
  SELECT
    71 AS no,
    '7. 初期データ整合性'::text AS category,
    '不正/NULL のプラン値 (companies / app_users)'::text AS check_item,
    CASE WHEN (c_bad + u_bad) = 0 THEN 'OK' ELSE '要確認' END AS status,
    'companies 対象=' || c_bad || '件, app_users 対象=' || u_bad || '件' AS detail
  FROM (
    SELECT
      (SELECT COUNT(*) FROM public.companies WHERE plan_type IS NULL OR plan_type NOT IN ('employment', 'credit', 'full')) AS c_bad,
      (SELECT COUNT(*) FROM public.app_users WHERE allowed_plan IS NULL OR allowed_plan NOT IN ('employment', 'credit', 'full')) AS u_bad
  ) s
) AS audit_result
ORDER BY no, check_item;


/*
-- ============================================================================
-- 【STEP 2】詳細確認用（STEP 1 で「要確認」や「NG」が出た場合に選択して実行）
-- ============================================================================

-- 2-A. public / storage.objects の全 RLS ポリシー一覧を目視確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expr,
  with_check AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public'
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, cmd, policyname;

-- 2-B. credit_cases の公的データ分類 (is_official) バックフィル漏れ確認
--      ※未分類件数が 0 件であれば OK
SELECT
  is_official,
  status,
  COUNT(*) AS record_count
FROM public.credit_cases
GROUP BY is_official, status
ORDER BY is_official DESC, status;

SELECT COUNT(*) AS unbackfilled_official_count
FROM public.credit_cases
WHERE is_official = false
  AND (
    counterparty_claim LIKE '【厚生労働省%'
    OR counterparty_claim LIKE '【国土交通省%'
    OR counterparty_claim LIKE '【東京都知事%'
    OR counterparty_claim LIKE '【消費者庁%'
    OR counterparty_claim LIKE '【官報公告%'
    OR counterparty_claim LIKE '【公正取引委員会%'
    OR counterparty_claim LIKE '【経済産業省%'
  );


-- ============================================================================
-- 【参考】よくある NG が出た場合の最小修正 SQL テンプレート（必要な行のみ実行）
-- ============================================================================

-- (1) 旧 credit_cases ポリシーが残っていて 4番が NG になった場合:
-- DROP POLICY IF EXISTS "Approved credit cases are viewable by authenticated users" ON public.credit_cases;
-- DROP POLICY IF EXISTS "Authenticated users can insert credit cases" ON public.credit_cases;
-- DROP POLICY IF EXISTS "Admins have full access to credit cases" ON public.credit_cases;

-- (2) app_users の自身行 SELECT ポリシーが無く 3番が NG になった場合:
-- CREATE POLICY "Users can view own app_users row"
-- ON public.app_users FOR SELECT TO authenticated
-- USING (id = auth.uid());

-- (3) case-evidence への INSERT ポリシーが無く 5-3 が NG になった場合:
-- CREATE POLICY "Approved users can upload own case evidence"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (
--   bucket_id = 'case-evidence'
--   AND (storage.foldername(name))[1] = auth.uid()::text
--   AND EXISTS (
--     SELECT 1 FROM public.app_users
--     WHERE id = auth.uid() AND is_approved = true
--   )
-- );
*/
