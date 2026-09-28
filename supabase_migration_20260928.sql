-- ========================================================
-- MIERIS マイグレーション: 管理者発行型アカウント & ミエリスクレジット
-- 作成日: 2026-09-28
-- ========================================================

-- 1. companies テーブルの拡張
-- 法人番号 (13桁) および 契約プラン (employment: 就業情報のみ, credit: クレジットのみ, full: 両方セット)
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS corporate_number VARCHAR(13),
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'full';

COMMENT ON COLUMN public.companies.corporate_number IS '法人番号 (13桁数字)';
COMMENT ON COLUMN public.companies.plan_type IS '契約プラン (employment | credit | full)';

-- 2. app_users テーブルの拡張
-- ユーザーごとの利用可能プラン (会社のプランを継承、または個別設定)
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS allowed_plan VARCHAR(20) DEFAULT 'full';

COMMENT ON COLUMN public.app_users.allowed_plan IS 'ユーザー権限プラン (employment | credit | full)';

-- 3. credit_cases (未払い企業・取引先情報) テーブルの新設
CREATE TABLE IF NOT EXISTS public.credit_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,                         -- 対象企業名（商号）
    corporate_number VARCHAR(13),                       -- 法人番号（13桁）
    location TEXT,                                      -- 本社所在地（都道府県・市区町村）
    invoice_date DATE,                                  -- 請求日
    amount BIGINT NOT NULL,                             -- 未払い金額（円）
    due_date DATE,                                      -- 当初支払期日
    payment_status VARCHAR(20) DEFAULT 'unpaid',        -- 入金状況: 'unpaid' (未払い), 'resolved' (解決済み)
    resolved_delay_days INTEGER,                        -- 解決時: 遅延日数
    counterparty_claim TEXT,                            -- 相手方の主張（反論・理由）
    registered_by_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL, -- 登録企業
    evidence_urls TEXT[],                               -- エビデンス資料URL（請求書・同意書等）
    status VARCHAR(20) DEFAULT 'pending',               -- 審査状況: 'pending' (審査待ち), 'approved' (承認済み), 'rejected' (却下)
    admin_notes TEXT,                                   -- 管理者審査メモ
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_credit_cases_corp_num ON public.credit_cases(corporate_number);
CREATE INDEX IF NOT EXISTS idx_credit_cases_company_name ON public.credit_cases(company_name);
CREATE INDEX IF NOT EXISTS idx_credit_cases_status ON public.credit_cases(status);
CREATE INDEX IF NOT EXISTS idx_credit_cases_reg_company ON public.credit_cases(registered_by_company_id);

-- RLS (Row Level Security) の有効化
ALTER TABLE public.credit_cases ENABLE ROW LEVEL SECURITY;

-- 閲覧ポリシー: 承認済みデータは認証済みユーザー全員（クレジットまたはフルプラン加入者）が検索可能
CREATE POLICY "Approved credit cases are viewable by authenticated users" 
ON public.credit_cases FOR SELECT 
TO authenticated 
USING (
    status = 'approved' 
    OR registered_by_company_id IN (
        SELECT company_id FROM public.app_users WHERE id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 登録ポリシー: 認証済みユーザーは自社データとして登録申請可能
CREATE POLICY "Authenticated users can insert credit cases" 
ON public.credit_cases FOR INSERT 
TO authenticated 
WITH CHECK (
    registered_by_company_id IN (
        SELECT company_id FROM public.app_users WHERE id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 管理者ポリシー: 管理者は全件の更新・削除が可能
CREATE POLICY "Admins have full access to credit cases" 
ON public.credit_cases FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 4. 既存レコードの初期値補正
UPDATE public.companies SET plan_type = 'full' WHERE plan_type IS NULL;
UPDATE public.app_users SET allowed_plan = 'full' WHERE allowed_plan IS NULL;
