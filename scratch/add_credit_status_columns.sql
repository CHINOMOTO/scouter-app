-- credit_cases テーブルに公的登記ステータスと現場営業実態ステータスカラムを追加
alter table if exists credit_cases 
  add column if not exists business_status text default 'unreachable',
  add column if not exists registry_status text default 'active',
  add column if not exists registry_close_date text,
  add column if not exists registry_close_cause text;

-- コメント追加
comment on column credit_cases.business_status is '営業実態ステータス: active(連絡可能), unreachable(音信不通), relocated(事務所引き払い・夜逃げ), bankrupt(破産・倒産手続き中), unknown(不明)';
comment on column credit_cases.registry_status is '公的登記ステータス: active(登記中), closed(登記閉鎖・解散済), sole_proprietor(個人事業主・一人親方), unknown(未確認)';
comment on column credit_cases.registry_close_date is '登記閉鎖年月日 (例: 2024-10-15)';
comment on column credit_cases.registry_close_cause is '登記閉鎖事由 (例: 清算結了, 解散)';
