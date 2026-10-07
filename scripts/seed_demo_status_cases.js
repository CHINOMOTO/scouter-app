const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://llgstbsndyyjcmcsiflu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- 信用情報 デモデータ確認・シード ---');

  // 登録元となる会社を1件取得
  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1);

  if (compErr || !companies || companies.length === 0) {
    console.error('No company found for registered_by_company_id:', compErr);
    process.exit(1);
  }

  const companyId = companies[0].id;
  console.log(`Using company: ${companies[0].name} (${companyId})`);

  // デモ用ケース定義
  const demoCases = [
    {
      company_name: '大和建装株式会社',
      corporate_number: '5011101998002',
      location: '東京都新宿区西新宿2-8-1',
      invoice_date: '2025-10-15',
      amount: 2450000,
      due_date: '2025-11-30',
      payment_status: 'unpaid',
      status: 'approved',
      counterparty_claim: '商業施設の内装工事代金。支払期日超過後に破産申し立て手続きが行われ、登記も清算結了済み。',
      business_status: 'bankrupt',
      registry_status: 'closed',
      registry_close_date: '2025-12-20',
      registry_close_cause: '清算結了'
    },
    {
      company_name: '鈴木内装（一人親方）',
      corporate_number: null,
      location: '埼玉県さいたま市大宮区桜木町1-4',
      invoice_date: '2025-11-01',
      amount: 680000,
      due_date: '2025-11-30',
      payment_status: 'unpaid',
      status: 'approved',
      counterparty_claim: '個人事業主（一人親方）。クロス貼り替え現場完工後に電話不通・LINEブロックとなり、アパート事務所も引き払い夜逃げ状態。',
      business_status: 'relocated',
      registry_status: 'sole_proprietor'
    },
    {
      company_name: '株式会社東都エンタープライズ',
      corporate_number: '1010001000000',
      location: '東京都千代田区神田錦町3-1',
      invoice_date: '2025-12-01',
      amount: 1200000,
      due_date: '2025-12-31',
      payment_status: 'unpaid',
      status: 'approved',
      counterparty_claim: 'オフィスクリーニング・原状回復工事代金。担当者とは電話連絡可能だが資金繰り悪化により分割支払いの協議中。',
      business_status: 'active',
      registry_status: 'active'
    }
  ];

  for (const c of demoCases) {
    // 既存チェック
    const { data: existing } = await supabase
      .from('credit_cases')
      .select('id, company_name')
      .eq('company_name', c.company_name)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Updating existing case: ${c.company_name}`);
      // カラムが存在するか分からないので、まずは新カラム含めて更新を試みる
      const updateData = { ...c, registered_by_company_id: companyId };
      const { error: updErr } = await supabase
        .from('credit_cases')
        .update(updateData)
        .eq('id', existing[0].id);

      if (updErr && updErr.message.includes('column')) {
        console.warn(`Columns do not exist in DB yet, updating base fields only:`, updErr.message);
        const { business_status, registry_status, registry_close_date, registry_close_cause, ...baseData } = updateData;
        await supabase
          .from('credit_cases')
          .update(baseData)
          .eq('id', existing[0].id);
      }
    } else {
      console.log(`Inserting new case: ${c.company_name}`);
      const insertData = { ...c, registered_by_company_id: companyId };
      const { error: insErr } = await supabase
        .from('credit_cases')
        .insert([insertData]);

      if (insErr && insErr.message.includes('column')) {
        console.warn(`Columns do not exist in DB yet, inserting base fields only:`, insErr.message);
        const { business_status, registry_status, registry_close_date, registry_close_cause, ...baseData } = insertData;
        await supabase
          .from('credit_cases')
          .insert([baseData]);
      }
    }
  }

  console.log('✅ デモデータ準備完了');
}

main().catch(console.error);
