require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedCreditCases() {
  console.log("Seeding test credit cases...");

  // 1. 登録企業（自社）となる企業を取得
  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1);

  if (compErr || !companies || companies.length === 0) {
    console.error("No company found to associate credit cases with:", compErr);
    process.exit(1);
  }

  const registeredCompany = companies[0];
  console.log(`Using registered company: ${registeredCompany.name} (${registeredCompany.id})`);

  // 2. テストデータ定義
  const testCases = [
    {
      company_name: "株式会社東都エンタープライズ",
      corporate_number: "1010001999001",
      location: "東京都港区六本木三丁目",
      invoice_date: "2024-04-10",
      amount: 1850000,
      due_date: "2024-05-31",
      payment_status: "unpaid",
      resolved_delay_days: null,
      counterparty_claim: "納品完了・検収後、期日直前になり「資金繰りの都合がつかない」と連絡。その後分割支払いを提案されるも第1回目から不履行となり、以降連絡不通状態。",
      registered_by_company_id: registeredCompany.id,
      evidence_urls: ["https://example.com/invoice-001.pdf"],
      status: "approved",
      admin_notes: "登記簿謄本および督促内容証明郵便の送付履歴を確認済み。承認。",
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      company_name: "大和建装株式会社",
      corporate_number: "5011101998002",
      location: "大阪府大阪市中央区本町二丁目",
      invoice_date: "2024-03-01",
      amount: 3420000,
      due_date: "2024-04-30",
      payment_status: "unpaid",
      resolved_delay_days: null,
      counterparty_claim: "施工完了後に現場の一部のやり直しを主張し全額支払いを拒絶。当方弁護士を通じて協議書を送付するも受取拒否のまま放置。",
      registered_by_company_id: registeredCompany.id,
      evidence_urls: ["https://example.com/invoice-002.pdf"],
      status: "approved",
      admin_notes: "契約書および工事完了検収書の控えを確認。承認。",
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      company_name: "ネクストロジスティクス合同会社",
      corporate_number: "3010403997003",
      location: "愛知県名古屋市中区栄四丁目",
      invoice_date: "2024-02-15",
      amount: 680000,
      due_date: "2024-03-31",
      payment_status: "resolved",
      resolved_delay_days: 45,
      counterparty_claim: "当初「経理担当者の退職による引き継ぎ不備」との理由で支払遅延。複数回の督促および役員面談を経て45日遅れで全額入金確認済み。",
      registered_by_company_id: registeredCompany.id,
      evidence_urls: ["https://example.com/invoice-003.pdf"],
      status: "approved",
      admin_notes: "全額入金完了の領収控を確認済み。解決済みとして承認。",
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      company_name: "株式会社サンライズ商事",
      corporate_number: "2010601996004",
      location: "福岡県福岡市博多区博多駅前一丁目",
      invoice_date: "2024-06-01",
      amount: 920000,
      due_date: "2024-06-30",
      payment_status: "unpaid",
      resolved_delay_days: null,
      counterparty_claim: "請求書送付後、期日を過ぎても入金がなく、担当者に電話するも「現在社内精査中」を繰り返すのみ。進展がないため共有申請。",
      registered_by_company_id: registeredCompany.id,
      evidence_urls: ["https://example.com/invoice-004.pdf"],
      status: "pending", // 管理者審査待ち
      admin_notes: null,
      created_at: new Date().toISOString(),
    },
    {
      company_name: "フロンティアソリューションズ株式会社",
      corporate_number: "4010001995005",
      location: "東京都千代田区神田神保町一丁目",
      invoice_date: "2024-05-20",
      amount: 1250000,
      due_date: "2024-06-30",
      payment_status: "unpaid",
      resolved_delay_days: null,
      counterparty_claim: "システム受託開発案件。納品後の請求に対し「仕様の解釈相違」として一方的に半額減額を要求され、残金の支払いを拒絶されている状態。",
      registered_by_company_id: registeredCompany.id,
      evidence_urls: [],
      status: "approved",
      admin_notes: "仕様合意書および納品検収メールを確認。承認。",
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ];

  // 3. レコードの挿入
  const { data: inserted, error: insertErr } = await supabase
    .from('credit_cases')
    .insert(testCases)
    .select('id, company_name, amount, payment_status, status');

  if (insertErr) {
    console.error("Failed to insert test credit cases:", insertErr);
    process.exit(1);
  }

  console.log(`Successfully inserted ${inserted.length} test credit cases:`);
  inserted.forEach((item, idx) => {
    console.log(` ${idx + 1}. [${item.status}] [${item.payment_status}] ${item.company_name} - ¥${item.amount.toLocaleString()} (ID: ${item.id})`);
  });
}

seedCreditCases();
