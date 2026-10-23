const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const realEstateCases = [
  {
    company_name: '株式会社robot home',
    corporate_number: '3290001025873',
    location: '東京都中央区銀座六丁目10番1号',
    invoice_date: '2019-06-28',
    amount: 0,
    due_date: '2019-06-28',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【国土交通省 宅建業法違反監督処分】融資資料改ざんによる業務停止命令（宅建業全部 7日間）',
    admin_notes: '【公表日: 2019年6月28日】国土交通大臣より宅地建物取引業法に基づく業務停止処分。自ら売主となる宅地売買等において、融資承認を得るため顧客の預金残高等の収入関係資料を組織的に改ざん・偽装したことによる（旧商号：株式会社TATERU）。',
    evidence_urls: ['https://www.mlit.go.jp/nega-inf/']
  },
  {
    company_name: '株式会社レオパレス21',
    corporate_number: '3011201000900',
    location: '東京都中野区本町二丁目54番11号',
    invoice_date: '2019-02-07',
    amount: 0,
    due_date: '2019-02-07',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【国土交通省 建築基準法不適合是正命令・建築士行政処分】界壁未施工等の施工不備に対する指示',
    admin_notes: '【公表日: 2019年2月7日】国土交通省より建築基準法仕様不適合（界壁未施工等）に伴う全件改修・是正指示。設計・工事監理に関与した建築士への建築士法に基づく行政処分（免許取消等）が発令。',
    evidence_urls: ['https://www.mlit.go.jp/nega-inf/']
  },
  {
    company_name: '株式会社スマートデイズ',
    corporate_number: '4010001148478',
    location: '東京都中央区銀座一丁目7番10号',
    invoice_date: '2018-04-09',
    amount: 10000000,
    due_date: '2018-04-09',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【東京都知事 宅建業者免許取消・破産管財事案】シェアハウス「かぼちゃの馬車」破綻・サブリース賃料未払い（公的閉鎖登記済）',
    admin_notes: '【公表日: 2018年4月9日】シェアハウス「かぼちゃの馬車」破綻。オーナーへのサブリース代金支払停止、宅建業免許取消および東京地裁へ破産申し立て（負債総額約60億円、2021年5月清算結了・公的登記閉鎖済）。',
    evidence_urls: ['https://www.mlit.go.jp/nega-inf/']
  },
  {
    company_name: '株式会社RERISE',
    corporate_number: '7011101083777',
    location: '東京都新宿区西新宿二丁目6番1号 新宿住友ビル37F',
    invoice_date: '2024-08-06',
    amount: 0,
    due_date: '2024-08-06',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【国土交通省 関東地方整備局 監督処分】住宅瑕疵担保履行法違反・重説不実説明による指示処分',
    admin_notes: '【公表日: 2024年8月6日】関東地方整備局長より宅地建物取引業法第65条第1項に基づく指示処分。自ら売主の新築住宅において資力確保措置（保険・供託）未履行および無届出契約締結、重説での虚偽保険加入説明。',
    evidence_urls: ['https://www.mlit.go.jp/nega-inf/']
  },
  {
    company_name: '株式会社フライングブリッジ',
    corporate_number: '9010001219019',
    location: '東京都新宿区市谷山伏町1番地12-1号',
    invoice_date: '2023-10-05',
    amount: 0,
    due_date: '2023-10-05',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【東京都知事 宅建業法監督処分】架空契約作出・偽造書類行使による業務停止処分（60日間）',
    admin_notes: '【公表日: 2023年10月5日】東京都知事より宅地建物取引業法に基づく業務の全部停止（60日間）処分。土地買取交渉において他人の名義を冒用し、架空の売買契約書等を作出し行使した重大な法令違反。',
    evidence_urls: ['https://www.mlit.go.jp/nega-inf/']
  },
  {
    company_name: '株式会社インターネット不動産販売',
    corporate_number: '2011201021088',
    location: '東京都中野区',
    invoice_date: '2024-02-15',
    amount: 0,
    due_date: '2024-02-15',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【東京都知事 宅建業法監督処分】重要事項説明義務違反・広告規制違反による業務停止（14日間）及び指示',
    admin_notes: '【公表日: 2024年2月15日】東京都知事より宅地建物取引業法第35条（重要事項説明義務違反）および誇大広告の禁止違反に伴う業務停止14日間・指示処分。',
    evidence_urls: ['https://www.mlit.go.jp/nega-inf/']
  },
  {
    company_name: '株式会社グロース',
    corporate_number: '6010901027580',
    location: '東京都世田谷区上馬四丁目3番9号',
    invoice_date: '2023-03-15',
    amount: 0,
    due_date: '2023-03-15',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【東京都知事 宅建業法監督処分】不当勧誘禁止違反による業務停止処分（15日間）',
    admin_notes: '【公表日: 2023年3月15日】東京都知事より宅地建物取引業法第47条の2（不当な勧誘等の禁止）違反に伴う業務停止15日間処分。',
    evidence_urls: ['https://www.mlit.go.jp/nega-inf/']
  },
  {
    company_name: 'TOYO TIRE株式会社',
    corporate_number: '2120001053424',
    location: '兵庫県伊丹市藤ノ木二丁目2番13号',
    invoice_date: '2015-04-10',
    amount: 0,
    due_date: '2015-04-10',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【国土交通省 建築基準法行政処分】免震ゴム性能偽装・大臣認定適合改修指示処分',
    admin_notes: '【公表日: 2015年4月10日】国土交通省より建築基準法に基づく構造基準不適合に対する大臣認定取消および全件適合改修指示（旧商号：東洋ゴム工業株式会社）。免震積層ゴムの性能検査データ改ざん問題。',
    evidence_urls: ['https://www.mlit.go.jp/nega-inf/']
  },
  {
    company_name: '旭化成建材株式会社',
    corporate_number: '8010001103762',
    location: '東京都千代田区有楽町一丁目1番2号',
    invoice_date: '2016-01-13',
    amount: 0,
    due_date: '2016-01-13',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【国土交通省 建設業法監督処分】既製コンクリート杭施工データ流用・虚偽記録による指示処分',
    admin_notes: '【公表日: 2016年1月13日】国土交通省より建設業法第28条第1項に基づく指示処分。横浜市マンション傾斜問題に伴い、杭打ち基礎工事における施工データ転用・虚偽記録が多数確認されたことによる是正指示。',
    evidence_urls: ['https://www.mlit.go.jp/nega-inf/']
  },
  {
    company_name: '大東建託株式会社',
    corporate_number: '5011001018599',
    location: '東京都港区港南二丁目16番1号',
    invoice_date: '2019-11-20',
    amount: 0,
    due_date: '2019-11-20',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【国土交通省 宅地建物取引業法監督処分】賃貸媒介業務における重説不備による指示処分',
    admin_notes: '【公表日: 2019年11月20日】国土交通省より宅地建物取引業法に基づく指示処分。賃貸借契約の媒介において重要事項説明書の交付および記名押印に関する不備が確認されたことによる是正指示。',
    evidence_urls: ['https://www.mlit.go.jp/nega-inf/']
  }
];

async function run() {
  console.log('--- 国土交通省・自治体 宅建業・不動産・建築 行政処分データ インポート開始 ---');

  const { data: adminComp } = await supabase.from('companies').select('id').limit(1).single();
  const regCompanyId = adminComp ? adminComp.id : null;

  let inserted = 0;
  let updated = 0;

  for (const c of realEstateCases) {
    const payload = {
      company_name: c.company_name,
      corporate_number: c.corporate_number,
      location: c.location,
      invoice_date: c.invoice_date,
      due_date: c.due_date,
      amount: c.amount,
      payment_status: c.payment_status,
      status: c.status,
      counterparty_claim: c.counterparty_claim,
      admin_notes: c.admin_notes,
      registered_by_company_id: regCompanyId,
      evidence_urls: c.evidence_urls
    };

    // 既存チェック（社名または法人番号で重複防止）
    const { data: existing } = await supabase
      .from('credit_cases')
      .select('id, company_name')
      .eq('company_name', c.company_name)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[更新] 既存レコード更新: ${c.company_name}`);
      const { error: updErr } = await supabase
        .from('credit_cases')
        .update(payload)
        .eq('id', existing[0].id);

      if (updErr) {
        console.error(`Update error for ${c.company_name}:`, updErr.message);
      } else {
        updated++;
      }
    } else {
      console.log(`[新規] レコード追加: ${c.company_name} (法人番号: ${c.corporate_number})`);
      const { error: insErr } = await supabase
        .from('credit_cases')
        .insert([payload]);

      if (insErr) {
        console.error(`Insert error for ${c.company_name}:`, insErr.message);
      } else {
        inserted++;
      }
    }
  }

  console.log(`\n完了: 新規追加 ${inserted}件, 更新 ${updated}件 (計 ${realEstateCases.length}件)`);

  // 総件数の確認
  const { count } = await supabase.from('credit_cases').select('*', { count: 'exact', head: true });
  console.log(`現在のDB全件数: ${count}件`);
}

run();
