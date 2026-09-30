require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed13CreditCases() {
  console.log("=== 企業信用テストデータ（13件）登録開始 ===");

  // 宇井建設を取得
  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', '株式会社宇井建設')
    .single();

  if (compErr || !companies) {
    console.error("宇井建設の取得に失敗しました:", compErr);
    process.exit(1);
  }

  const registeredCompanyId = companies.id;
  console.log(`登録元企業: ${companies.name} (${registeredCompanyId})`);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

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
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-001.pdf"],
      status: "approved",
      admin_notes: "登記簿謄本および督促内容証明郵便の送付履歴を確認済み。承認。",
      created_at: new Date(now - 30 * dayMs).toISOString(),
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
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-002.pdf"],
      status: "approved",
      admin_notes: "工事完了報告書および相手側とのメール履歴を確認。承認。",
      created_at: new Date(now - 20 * dayMs).toISOString(),
    },
    {
      company_name: "ネクストロジスティクス合同会社",
      corporate_number: "3010403997003",
      location: "愛知県名古屋市中区栄四丁目",
      invoice_date: "2024-05-15",
      amount: 680000,
      due_date: "2024-06-30",
      payment_status: "resolved",
      resolved_delay_days: 45,
      counterparty_claim: "運送委託費用の未払い。45日遅延ののちに全額着金確認済み。ただし事前の遅延連絡等は一切なく、複数回の督促後にようやく支払われた経緯あり。",
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-003.pdf"],
      status: "approved",
      admin_notes: "遅延解決済みの事実を確認。客観的記録として承認。",
      created_at: new Date(now - 15 * dayMs).toISOString(),
    },
    {
      company_name: "フロンティアソリューションズ株式会社",
      corporate_number: "4010001995005",
      location: "福岡県福岡市博多区博多駅前一丁目",
      invoice_date: "2024-06-01",
      amount: 1250000,
      due_date: "2024-07-31",
      payment_status: "unpaid",
      resolved_delay_days: null,
      counterparty_claim: "システム開発受託案件。検収受領証受領済みにも関わらず、期日を過ぎても入金なし。問い合わせに対して「来月支払う」と口頭回答を繰り返すのみ。",
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-005.pdf"],
      status: "approved",
      admin_notes: "検収証および請求書の控えを確認。承認。",
      created_at: new Date(now - 5 * dayMs).toISOString(),
    },
    {
      company_name: "株式会社サンライズ商事",
      corporate_number: "2010601996004",
      location: "神奈川県横浜市中区元町一丁目",
      invoice_date: "2024-06-20",
      amount: 920000,
      due_date: "2024-08-10",
      payment_status: "unpaid",
      resolved_delay_days: null,
      counterparty_claim: "建材卸売代金の未払い。担当者退職を理由に引き継ぎができていないと主張し、支払いを保留され続けている。",
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-004.pdf"],
      status: "pending",
      admin_notes: "現在、登記情報および納品受領印の照合審査中。",
      created_at: new Date(now - 1 * dayMs).toISOString(),
    },
    {
      company_name: "三陽重機土木株式会社",
      corporate_number: "6010001012345",
      location: "埼玉県さいたま市大宮区桜木町一丁目",
      invoice_date: "2024-04-20",
      amount: 4800000,
      due_date: "2024-05-31",
      payment_status: "unpaid",
      resolved_delay_days: null,
      counterparty_claim: "重機オペレーター派遣および基礎掘削工事費用の未払い。元請けからの入金がないことを理由に下請けへの支払いを一方的に停止。",
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-006.pdf"],
      status: "approved",
      admin_notes: "作業日報および未払い督促通知を確認済み。",
      created_at: new Date(now - 28 * dayMs).toISOString(),
    },
    {
      company_name: "有限会社丸信資材",
      corporate_number: "7020002023456",
      location: "千葉県船橋市本町四丁目",
      invoice_date: "2024-05-01",
      amount: 1150000,
      due_date: "2024-06-15",
      payment_status: "resolved",
      resolved_delay_days: 30,
      counterparty_claim: "生コンクリート納入代金。期日から30日後に分割にて完済。経理担当者の入院を理由としていたが連絡遅延が著しかった。",
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-007.pdf"],
      status: "approved",
      admin_notes: "遅延解決済み確認。記録承認。",
      created_at: new Date(now - 22 * dayMs).toISOString(),
    },
    {
      company_name: "協和電設株式会社",
      corporate_number: "8010001034567",
      location: "東京都江東区東陽二丁目",
      invoice_date: "2024-06-10",
      amount: 2730000,
      due_date: "2024-07-25",
      payment_status: "unpaid",
      resolved_delay_days: null,
      counterparty_claim: "オフィスビル配線工事。引き渡し完了後、追加工事分の請求に関して合意がなかったと主張し、基本工事分も含めて全額を支払い拒否。",
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-008.pdf"],
      status: "approved",
      admin_notes: "工事請負契約書および検収印あり。承認。",
      created_at: new Date(now - 18 * dayMs).toISOString(),
    },
    {
      company_name: "アスカテクノロジー株式会社",
      corporate_number: "9010401045678",
      location: "東京都千代田区神田錦町三丁目",
      invoice_date: "2024-07-01",
      amount: 850000,
      due_date: "2024-08-20",
      payment_status: "unpaid",
      resolved_delay_days: null,
      counterparty_claim: "ネットワーク機器導入および設定作業費。代表者の体調不良を理由に請求書の受取を保留されている状態。",
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-009.pdf"],
      status: "pending",
      admin_notes: "請求書および完了確認書を審査中。",
      created_at: new Date(now - 2 * dayMs).toISOString(),
    },
    {
      company_name: "北斗運輸株式会社",
      corporate_number: "1011201056789",
      location: "北海道札幌市白石区平和通二丁目",
      invoice_date: "2024-03-15",
      amount: 1960000,
      due_date: "2024-04-30",
      payment_status: "unpaid",
      resolved_delay_days: null,
      counterparty_claim: "長距離幹線輸送の委託料。燃料サーチャージ分の支払いを拒否し、基本運賃の支払いもストップさせたまま係争中。",
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-010.pdf"],
      status: "approved",
      admin_notes: "運行指示書および運送引受書を確認済み。",
      created_at: new Date(now - 25 * dayMs).toISOString(),
    },
    {
      company_name: "株式会社メイプルプランニング",
      corporate_number: "2011001067890",
      location: "兵庫県神戸市中央区磯上通七丁目",
      invoice_date: "2024-04-05",
      amount: 540000,
      due_date: "2024-05-15",
      payment_status: "resolved",
      resolved_delay_days: 60,
      counterparty_claim: "催事用什器製作費。納品後60日間にわたり連絡が取れなかったが、内容証明郵便の送付により全額回収完了。",
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-011.pdf"],
      status: "approved",
      admin_notes: "回収完了を確認。遅延履歴として登録承認。",
      created_at: new Date(now - 12 * dayMs).toISOString(),
    },
    {
      company_name: "創和クリエイト株式会社",
      corporate_number: "3010001078901",
      location: "静岡県静岡市葵区追手町五丁目",
      invoice_date: "2024-07-05",
      amount: 3100000,
      due_date: "2024-08-15",
      payment_status: "unpaid",
      resolved_delay_days: null,
      counterparty_claim: "内装仕上工事費用。完工引渡書に署名捺印があるにも関わらず、支払い期日を徒過。「来週振り込む」との約束を3回反故にされている。",
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-012.pdf"],
      status: "approved",
      admin_notes: "契約書および催告書の送付履歴を確認。",
      created_at: new Date(now - 8 * dayMs).toISOString(),
    },
    {
      company_name: "美和工務店合同会社",
      corporate_number: "4010801089012",
      location: "宮城県仙台市青葉区一番町二丁目",
      invoice_date: "2024-05-25",
      amount: 1420000,
      due_date: "2024-06-30",
      payment_status: "unpaid",
      resolved_delay_days: null,
      counterparty_claim: "足場仮設工事代金。元請けからの資材納入遅延を理由に現場支払いを差し止め中と主張。支払予定日の確約も得られない状態。",
      registered_by_company_id: registeredCompanyId,
      evidence_urls: ["https://example.com/invoice-013.pdf"],
      status: "approved",
      admin_notes: "現場写真および注文請書を確認。承認。",
      created_at: new Date(now - 14 * dayMs).toISOString(),
    }
  ];

  console.log(`登録対象: ${testCases.length} 件`);

  for (const tc of testCases) {
    const { error } = await supabase.from('credit_cases').insert(tc);
    if (error) {
      console.error(`❌ [${tc.company_name}] 登録エラー:`, error.message);
    } else {
      console.log(`✅ [${tc.company_name}] 登録完了 (請求額: ¥${tc.amount.toLocaleString()} / ${tc.payment_status} / ${tc.status})`);
    }
  }

  console.log("\n🎉 13件の企業信用テストデータの登録が完了しました！");
}

seed13CreditCases();
