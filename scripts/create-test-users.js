/**
 * MIERIS テストユーザー一括作成スクリプト
 * 30社 × 4アカウント = 120名を自動作成
 * 
 * 使い方:
 *   作成: node scripts/create-test-users.js
 *   削除: node scripts/create-test-users.js --delete
 */

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ 環境変数が不足しています。.env.local を確認してください。');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✅' : '❌');
  process.exit(1);
}

// 設定
const NUM_COMPANIES = 30;
const USERS_PER_COMPANY = 4;
const TEST_PASSWORD = 'TestScouter2026!';
const COMPANY_PREFIX = 'テスト建設';
const EMAIL_DOMAIN = 'mieris-test.local';

// Supabase REST API ヘルパー
async function supabaseAdmin(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : undefined,
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const text = await res.text();
  
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

// Auth Admin API ヘルパー
async function authAdmin(endpoint, method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/auth/v1/admin${endpoint}`;
  const options = {
    method,
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const text = await res.text();
  
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

// ===== 作成処理 =====
async function createTestData() {
  console.log('');
  console.log('⌖ MIERIS テストデータ一括作成');
  console.log('================================');
  console.log(`会社数: ${NUM_COMPANIES}`);
  console.log(`1社あたりユーザー数: ${USERS_PER_COMPANY}`);
  console.log(`合計ユーザー数: ${NUM_COMPANIES * USERS_PER_COMPANY}`);
  console.log(`共通パスワード: ${TEST_PASSWORD}`);
  console.log('================================');
  console.log('');

  const results = { companies: 0, users: 0, errors: [] };

  for (let c = 1; c <= NUM_COMPANIES; c++) {
    const companyName = `${COMPANY_PREFIX}${String(c).padStart(2, '0')}`;
    
    // 1. 会社作成
    const companyRes = await supabaseAdmin('/rest/v1/companies', 'POST', {
      name: companyName,
      is_main: false,
    });

    if (!companyRes.ok) {
      console.error(`❌ 会社作成失敗: ${companyName}`, companyRes.data);
      results.errors.push(`会社: ${companyName}`);
      continue;
    }

    const companyId = Array.isArray(companyRes.data) ? companyRes.data[0].id : companyRes.data.id;
    results.companies++;
    process.stdout.write(`🏢 ${companyName} (${companyId.substring(0, 8)}...) `);

    // 2. ユーザー作成
    for (let u = 1; u <= USERS_PER_COMPANY; u++) {
      const userNum = (c - 1) * USERS_PER_COMPANY + u;
      const email = `test-user${String(userNum).padStart(3, '0')}@${EMAIL_DOMAIN}`;
      const displayName = `テスト太郎${String(userNum).padStart(3, '0')}`;

      // Auth ユーザー作成（メール確認スキップ）
      const authRes = await authAdmin('/users', 'POST', {
        email: email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
        },
        app_metadata: {
          role: 'viewer',
          is_approved: true,
        },
      });

      if (!authRes.ok) {
        process.stdout.write('❌');
        results.errors.push(`ユーザー: ${email} - ${JSON.stringify(authRes.data)}`);
        continue;
      }

      const userId = authRes.data.id;

      // app_users に登録
      const appUserRes = await supabaseAdmin('/rest/v1/app_users', 'POST', {
        id: userId,
        display_name: displayName,
        company_id: companyId,
        role: 'viewer',
        is_approved: true,
      });

      if (!appUserRes.ok) {
        process.stdout.write('⚠');
        results.errors.push(`app_users: ${email} - ${JSON.stringify(appUserRes.data)}`);
      } else {
        process.stdout.write('✅');
        results.users++;
      }
    }
    console.log('');
  }

  // 結果表示
  console.log('');
  console.log('================================');
  console.log('📊 結果サマリー');
  console.log(`  会社作成: ${results.companies}/${NUM_COMPANIES}`);
  console.log(`  ユーザー作成: ${results.users}/${NUM_COMPANIES * USERS_PER_COMPANY}`);
  
  if (results.errors.length > 0) {
    console.log(`  エラー: ${results.errors.length}件`);
    results.errors.forEach(e => console.log(`    - ${e}`));
  } else {
    console.log('  エラー: なし ✅');
  }

  console.log('================================');
  console.log('');
  console.log('📧 ログイン情報:');
  console.log(`  メール: test-user001@${EMAIL_DOMAIN} 〜 test-user${String(NUM_COMPANIES * USERS_PER_COMPANY).padStart(3, '0')}@${EMAIL_DOMAIN}`);
  console.log(`  パスワード: ${TEST_PASSWORD}`);
  console.log('');
}

// ===== 削除処理 =====
async function deleteTestData() {
  console.log('');
  console.log('⌖ MIERIS テストデータ一括削除');
  console.log('================================');
  console.log('');

  // 1. テストユーザー検索
  console.log('🔍 テストユーザーを検索中...');
  const usersRes = await supabaseAdmin(`/rest/v1/app_users?display_name=like.テスト太郎*&select=id,display_name`);
  
  if (!usersRes.ok) {
    console.error('❌ ユーザー検索失敗:', usersRes.data);
    return;
  }

  const testUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
  console.log(`  見つかったテストユーザー: ${testUsers.length}名`);

  // 2. ユーザー削除
  for (const user of testUsers) {
    // app_users から削除
    await supabaseAdmin(`/rest/v1/app_users?id=eq.${user.id}`, 'DELETE');
    // Auth から削除
    await authAdmin(`/users/${user.id}`, 'DELETE');
    process.stdout.write('🗑️');
  }
  console.log('');

  // 3. テスト会社検索・削除
  console.log('🔍 テスト会社を検索中...');
  const companiesRes = await supabaseAdmin(`/rest/v1/companies?name=like.${COMPANY_PREFIX}*&select=id,name`);
  
  if (companiesRes.ok && Array.isArray(companiesRes.data)) {
    console.log(`  見つかったテスト会社: ${companiesRes.data.length}社`);
    for (const company of companiesRes.data) {
      await supabaseAdmin(`/rest/v1/companies?id=eq.${company.id}`, 'DELETE');
      process.stdout.write('🗑️');
    }
    console.log('');
  }

  console.log('');
  console.log('✅ テストデータの削除が完了しました。');
  console.log('');
}

// ===== メイン =====
const isDelete = process.argv.includes('--delete');

if (isDelete) {
  deleteTestData().catch(console.error);
} else {
  createTestData().catch(console.error);
}
