-- 取引先ウォッチリスト（信用モニタリング）テーブルを作成します
create table if not exists credit_watchlist (
    id uuid default gen_random_uuid() primary key,
    company_id uuid references companies(id) on delete cascade not null,
    user_id uuid references app_users(id) on delete cascade not null,
    corporate_number text not null, -- 13桁の法人番号
    company_name text not null, -- 監視対象企業の商号
    notes text, -- 自社用メモ（例: 「主要元請け」「新規検討中」）
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(company_id, corporate_number)
);

-- RLSの有効化
alter table credit_watchlist enable row level security;

-- 自社のデータのみ閲覧・操作可能にするポリシー
create policy "Users can view their company's watchlist"
on credit_watchlist
for select
using (
    company_id in (select company_id from app_users where id = auth.uid())
);

create policy "Users can insert their company's watchlist"
on credit_watchlist
for insert
with check (
    company_id in (select company_id from app_users where id = auth.uid())
);

create policy "Users can update their company's watchlist"
on credit_watchlist
for update
using (
    company_id in (select company_id from app_users where id = auth.uid())
);

create policy "Users can delete their company's watchlist"
on credit_watchlist
for delete
using (
    company_id in (select company_id from app_users where id = auth.uid())
);
