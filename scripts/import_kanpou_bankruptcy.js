const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const bankruptcyCases = [
  {
    company_name: '船井電機株式会社',
    corporate_number: '3122001036719',
    location: '大阪府大東市中垣内七丁目7番1号',
    invoice_date: '2024-10-24',
    amount: 46159000000,
    due_date: '2024-10-24',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【官報公告 裁判所公認】東京地裁より破産手続開始決定（負債約461億円・給与・売掛金未払い）',
    admin_notes: '【公表日: 2024年10月24日】東京地方裁判所より破産手続開始決定（官報公告事案）。液晶テレビ・音響機器製造販売大手。資金繰り破綻により全従業員解雇・破産手続へ移行。破産管財人による財産換価手続き中。',
    evidence_urls: ['https://www.kanpou.npb.go.jp/']
  },
  {
    company_name: '株式会社ガイア',
    corporate_number: '8010001065835',
    location: '東京都中央区日本橋横山町7番18号',
    invoice_date: '2023-10-30',
    amount: 94355000000,
    due_date: '2023-10-30',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【官報公告 裁判所公認】東京地裁へ民事再生法適用申請・監督命令発令（負債約943億円）',
    admin_notes: '【公表日: 2023年10月30日】東京地方裁判所へ民事再生法適用を申請し同日監督命令発令（官報公告事案）。パチンコホール全国展開大手。遊技機高騰・資金ショートにより自主再建断念、負債総額は単体約943億円（グループ計1,793億円）。',
    evidence_urls: ['https://www.kanpou.npb.go.jp/']
  },
  {
    company_name: '株式会社てるみくらぶ',
    corporate_number: '6011001044153',
    location: '東京都渋谷区渋谷二丁目1番1号',
    invoice_date: '2017-03-27',
    amount: 15100000000,
    due_date: '2017-03-27',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【官報公告 裁判所公認】東京地裁より破産手続開始決定（負債約151億円・公的登記閉鎖済）',
    admin_notes: '【公表日: 2017年3月27日】東京地方裁判所より破産手続開始決定（官報公告事案）。格安海外旅行販売大手。旅行者への航空券未発券・ホテル代金未払い等で自己破産（2019年9月破産手続終結・清算結了済）。',
    evidence_urls: ['https://www.kanpou.npb.go.jp/']
  },
  {
    company_name: 'ジャパンライフ株式会社',
    corporate_number: '3010001070195',
    location: '東京都千代田区西神田二丁目8番5号',
    invoice_date: '2018-03-01',
    amount: 240500000000,
    due_date: '2018-03-01',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【官報公告 裁判所公認】東京地裁より破産手続開始決定（負債約2,405億円・公的登記閉鎖済）',
    admin_notes: '【公表日: 2018年3月1日】東京地方裁判所より破産手続開始決定（官報公告事案）。磁気治療器預託オーナー商法。銀行取引停止処分を経て債権者申し立てにより破産手続開始（2023年9月破産手続終結・清算結了済）。',
    evidence_urls: ['https://www.kanpou.npb.go.jp/']
  },
  {
    company_name: '株式会社レナウン',
    corporate_number: '6010701015232',
    location: '東京都江東区有明三丁目6番11号',
    invoice_date: '2020-11-27',
    amount: 13879000000,
    due_date: '2020-11-27',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【官報公告 裁判所公認】民事再生廃止・東京地裁より破産手続開始決定（負債約138億円・公的登記閉鎖済）',
    admin_notes: '【公表日: 2020年11月27日】東京地方裁判所より破産手続開始決定（官報公告事案）。名門アパレル総合メーカー。民事再生手続廃止を経て破産手続へ移行、清算結了により公的登記閉鎖済。',
    evidence_urls: ['https://www.kanpou.npb.go.jp/']
  },
  {
    company_name: '株式会社ケフィア事業振興会',
    corporate_number: '7010001127512',
    location: '東京都千代田区神田須田町二丁目25番地16',
    invoice_date: '2018-09-03',
    amount: 100000000000,
    due_date: '2018-09-03',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【官報公告 裁判所公認】東京地裁より破産手続開始決定（グループ負債1,000億円超・買戻し代金未払い）',
    admin_notes: '【公表日: 2018年9月3日】東京地方裁判所より破産手続開始決定（官報公告事案）。かぶちゃん農園・加工食品オーナー商法。買戻し代金支払遅延が多発し債権者より破産申し立て、破産手続開始決定。',
    evidence_urls: ['https://www.kanpou.npb.go.jp/']
  },
  {
    company_name: '株式会社ホワイト・ベアーファミリー',
    corporate_number: '6120001070371',
    location: '大阪府大阪市北区豊崎三丁目14番9号',
    invoice_date: '2020-06-30',
    amount: 27800000000,
    due_date: '2020-06-30',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【官報公告 裁判所公認】大阪地裁へ民事再生法適用申請・監督命令発令（負債約278億円）',
    admin_notes: '【公表日: 2020年6月30日】大阪地方裁判所へ民事再生法適用を申請し監督命令発令（官報公告事案）。「しろくまツアー」等の旅行企画販売大手。コロナ禍による旅行需要消滅に伴い法的整理、のちに再建完了。',
    evidence_urls: ['https://www.kanpou.npb.go.jp/']
  },
  {
    company_name: '株式会社つばさ',
    corporate_number: '2090001016010',
    location: '山形県山形市蔵王松ケ丘二丁目1番3号',
    invoice_date: '2019-01-17',
    amount: 1965000000,
    due_date: '2019-01-17',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【官報公告 裁判所公認】山形地裁へ民事再生法適用申請（旧商号：株式会社シベール・負債約19億円）',
    admin_notes: '【公表日: 2019年1月17日】山形地方裁判所へ民事再生法適用を申請（官報公告事案）。「ラスクフランス」で知られる旧JASDAQ上場の洋菓子メーカー（旧商号：株式会社シベール）。業績悪化・借入金返済難により法的再生へ移行。',
    evidence_urls: ['https://www.kanpou.npb.go.jp/']
  }
];

async function run() {
  console.log('--- 官報 破産・民事再生・会社更生 公的倒産公告データ インポート開始 ---');

  const { data: adminComp } = await supabase.from('companies').select('id').limit(1).single();
  const regCompanyId = adminComp ? adminComp.id : null;

  let inserted = 0;
  let updated = 0;

  for (const c of bankruptcyCases) {
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

  console.log(`\n完了: 新規追加 ${inserted}件, 更新 ${updated}件 (計 ${bankruptcyCases.length}件)`);

  const { count } = await supabase.from('credit_cases').select('*', { count: 'exact', head: true });
  console.log(`現在のDB全件数: ${count}件`);
}

run();
