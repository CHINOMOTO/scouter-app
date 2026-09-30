require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function verifyState() {
  console.log("=== 現在のデータベース状態 ===");

  const { data: companies } = await supabase.from('companies').select('id, name, created_at');
  console.log(`\n■ 利用会社: ${companies.length} 社`);
  companies.forEach(c => console.log(`  - ${c.name} (${c.id})`));

  const { data: authUsersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authUsers = authUsersData?.users || [];
  const { data: appUsers } = await supabase.from('app_users').select('id, display_name, role, company_id');
  const compMap = new Map(companies.map(c => [c.id, c.name]));
  const appMap = new Map(appUsers.map(u => [u.id, u]));

  console.log(`\n■ ユーザー: ${authUsers.length} 名`);
  authUsers.forEach(u => {
    const p = appMap.get(u.id);
    console.log(`  - ${u.email} | 表示名: ${p?.display_name} | 所属: ${compMap.get(p?.company_id) || '不明'} | ロール: ${p?.role}`);
  });

  const { data: blacklistCases } = await supabase.from('blacklist_cases').select('id, full_name, birth_date, phone_last4, created_at');
  console.log(`\n■ 就業トラブル登録データ: ${blacklistCases.length} 件`);
  blacklistCases.forEach((c, i) => console.log(`  ${i+1}. ${c.full_name} | 生年月日: ${c.birth_date} | 電話: ${c.phone_last4}`));

  const { data: creditCases } = await supabase.from('credit_cases').select('id, company_name');
  console.log(`\n■ 企業信用登録データ: ${creditCases.length} 件`);
  creditCases.forEach(c => console.log(`  - ${c.company_name}`));
}

verifyState();
