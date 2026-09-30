require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ドライランモード（trueなら削除せず対象を確認、--execute 引数で実際に削除）
const isDryRun = !process.argv.includes('--execute');

// ★★★ 絶対に削除してはならない保護リスト（ホワイトリスト） ★★★
const PROTECTED_COMPANIES = [
  '2132daf1-81f7-4cd3-a482-5c5d7ca78272', // 株式会社宇井建設
  '834cb8af-4e1c-4afc-8b25-1b22e3796a6c', // 株式会社ミヤエモン
];

const PROTECTED_USERS = [
  '1d196c7a-1c82-4176-a611-03fee77200c8', // 千野 幹織 (c08047886622@icloud.com)
  '20e669a1-2ebd-4fee-a62d-1561367bfd36', // 宇井 拳太 (kenta0327@uiken.jp)
  '0f9fd8ac-b2b1-485c-b948-9d75a32e80e1', // 村井 翔太 (msho0616@uiken.jp)
  '082ccc18-5834-4287-8720-d1c391236cc9', // チノモトオリ (tyuubou62@gmail.com)
];

const PROTECTED_CASES = [
  '9070db84-d789-4943-b41f-053ca55e928f', // 吉田 祐二
  '437603b7-3708-484e-9a91-88bc27807d30', // 小田切 一郎
  '61fe7022-e0e5-408f-95a1-4b2ea7cab28a', // 木戸 慎也
  '7c44d3b2-0051-4881-a867-f55f4fb27854', // 春日 亮佑
  'e88103a3-6656-489f-8b08-e6f4fea2aeb0', // 位下 陽
  '5275b411-d9a1-4d0c-8c5c-8f801a4d14c1', // 井上 龍
  'b59b7588-005e-4336-a1cd-a0d203abb166', // 丸山 政敏
  '3952f4ca-e770-4e67-85b2-00301a357e9c', // 澁谷 大輔
  '001c45b9-e8e5-4440-8573-325d5667bff1', // 渡部 秀幸
];

async function run() {
  console.log(`=== テストデータ安全削除スクリプト [${isDryRun ? 'DRY-RUN (シミュレーション)' : '★★★ 本番実行 (EXECUTE) ★★★'}] ===\n`);

  // 1. 就業トラブル案件の抽出
  const { data: allCases, error: cErr } = await supabase.from('blacklist_cases').select('id, full_name, registered_company_id');
  if (cErr) throw cErr;

  const casesToDelete = allCases.filter(c => !PROTECTED_CASES.includes(c.id));
  console.log(`[就業トラブル] 全 ${allCases.length} 件中、削除対象: ${casesToDelete.length} 件（保護: ${allCases.length - casesToDelete.length} 件）`);

  // 2. 企業信用案件の抽出
  const { data: allCredit, error: crErr } = await supabase.from('credit_cases').select('id, company_name');
  if (crErr) throw crErr;
  console.log(`[企業信用] 全 ${allCredit.length} 件中、削除対象: ${allCredit.length} 件`);

  // 3. ユーザーの抽出
  const { data: authUsersData, error: aErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (aErr) throw aErr;
  const allUsers = authUsersData?.users || [];
  const usersToDelete = allUsers.filter(u => !PROTECTED_USERS.includes(u.id));
  console.log(`[ユーザー] 全 ${allUsers.length} 名中、削除対象: ${usersToDelete.length} 名（保護: ${allUsers.length - usersToDelete.length} 名）`);

  // 4. 企業の抽出
  const { data: allCompanies, error: compErr } = await supabase.from('companies').select('id, name');
  if (compErr) throw compErr;
  const companiesToDelete = allCompanies.filter(c => !PROTECTED_COMPANIES.includes(c.id));
  console.log(`[利用会社] 全 ${allCompanies.length} 社中、削除対象: ${companiesToDelete.length} 社（保護: ${allCompanies.length - companiesToDelete.length} 社）`);

  if (isDryRun) {
    console.log("\n※ ドライラン完了。上記件数が削除されます。");
    console.log("実際に削除を実行するには `--execute` オプションを付けて実行してください。");
    return;
  }

  // ★★★ 実際の削除処理 ★★★
  console.log("\n>>> 削除処理を開始します...\n");

  // Step 1: 就業トラブルの削除
  console.log("Step 1: blacklist_cases の削除中...");
  for (const c of casesToDelete) {
    const { error } = await supabase.from('blacklist_cases').delete().eq('id', c.id);
    if (error) console.error(`  Case削除失敗 [${c.id} ${c.full_name}]:`, error.message);
  }
  console.log("✅ blacklist_cases 削除完了");

  // Step 2: 企業信用の削除
  console.log("\nStep 2: credit_cases の削除中...");
  for (const c of allCredit) {
    const { error } = await supabase.from('credit_cases').delete().eq('id', c.id);
    if (error) console.error(`  CreditCase削除失敗 [${c.id} ${c.company_name}]:`, error.message);
  }
  console.log("✅ credit_cases 削除完了");

  // Step 3: app_users & auth.users の削除
  console.log("\nStep 3: users (app_users & auth.users) の削除中...");
  for (const u of usersToDelete) {
    // app_users は cascade または個別削除
    const { error: appErr } = await supabase.from('app_users').delete().eq('id', u.id);
    if (appErr) console.error(`  app_users削除エラー [${u.id}]:`, appErr.message);

    // auth.users の削除
    const { error: authErr } = await supabase.auth.admin.deleteUser(u.id);
    if (authErr) console.error(`  auth.users削除エラー [${u.id} ${u.email}]:`, authErr.message);
  }
  console.log("✅ users 削除完了");

  // Step 4: companies の削除
  console.log("\nStep 4: companies の削除中...");
  for (const c of companiesToDelete) {
    const { error } = await supabase.from('companies').delete().eq('id', c.id);
    if (error) console.error(`  Company削除失敗 [${c.id} ${c.name}]:`, error.message);
  }
  console.log("✅ companies 削除完了");

  console.log("\n=========================================");
  console.log("🎉 すべてのテストデータの削除が完了しました！");
  console.log("=========================================");
}

run().catch(err => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
