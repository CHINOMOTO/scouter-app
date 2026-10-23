const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const consumerCases = [
  {
    company_name: 'RIZAP株式会社',
    corporate_number: '2011201014257',
    location: '東京都新宿区西新宿八丁目17番1号',
    invoice_date: '2024-03-27',
    amount: 0,
    due_date: '2024-03-27',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【消費者庁 景品表示法措置命令】「chocoZAP」等の優良誤認表示に対する是正命令',
    admin_notes: '【公表日: 2024年3月27日】消費者庁より景品表示法第7条第1項に基づく措置命令。コンビニジム「chocoZAP」の広告表示において、全店舗で利用可能であるかのように誤認させる表示や特典付与に関する優良誤認が認定されたことによる。',
    evidence_urls: ['https://www.caa.go.jp/']
  },
  {
    company_name: '株式会社夢グループ',
    corporate_number: '9010001098124',
    location: '東京都文京区音羽二丁目10番2号',
    invoice_date: '2023-09-29',
    amount: 22070000,
    due_date: '2023-09-29',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【消費者庁 景品表示法課徴金納付命令】二重価格表示（有利誤認）に対する課徴金2,207万円納付命令',
    admin_notes: '【公表日: 2023年9月29日】消費者庁より景品表示法第8条第1項に基づく課徴金納付命令（2,207万円）。通信販売において、販売実績のない架空の「通常価格」を比較対照として提示し、不当に大幅値引きであると誤認させた有利誤認表示。',
    evidence_urls: ['https://www.caa.go.jp/']
  },
  {
    company_name: '大正製薬株式会社',
    corporate_number: '4013301006867',
    location: '東京都豊島区高田三丁目24番1号',
    invoice_date: '2024-07-25',
    amount: 0,
    due_date: '2024-07-25',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【消費者庁 景品表示法措置命令】ステルスマーケティング（ステマ告示違反）に対する措置命令',
    admin_notes: '【公表日: 2024年7月25日】消費者庁より景品表示法に基づく措置命令。広告である旨を明示せずインフルエンサー等にSNS投稿を行わせたステルスマーケティング規制違反。',
    evidence_urls: ['https://www.caa.go.jp/']
  },
  {
    company_name: 'エクスコムグローバル株式会社',
    corporate_number: '4011001045715',
    location: '東京都渋谷区渋谷二丁目24番12号',
    invoice_date: '2024-03-08',
    amount: 0,
    due_date: '2024-03-08',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【消費者庁 景品表示法措置命令】客観的根拠のない「満足度No.1」表示に対する優良誤認措置命令',
    admin_notes: '【公表日: 2024年3月8日】消費者庁より景品表示法第7条第1項に基づく措置命令。「イモトのWiFi」等の広告において、客観的・学術的な実態調査に基づかない「顧客満足度No.1」表示を行ったことによる優良誤認認定。',
    evidence_urls: ['https://www.caa.go.jp/']
  },
  {
    company_name: '株式会社VERIFY',
    corporate_number: '6011001157475',
    location: '東京都目黒区上目黒二丁目7番12号',
    invoice_date: '2024-12-20',
    amount: 0,
    due_date: '2024-12-20',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【消費者庁 特定商取引法行政処分】誇大広告・定期購入確認画面義務違反による業務停止命令（6か月間）',
    admin_notes: '【公表日: 2024年12月23日】消費者庁より特定商取引法第15条第1項に基づく業務停止命令（6か月間）および指示処分。美容クリームの通信販売において合理的根拠のない効能を謳う誇大広告、および定期購入契約最終確認画面における不実告知・表示義務違反。',
    evidence_urls: ['https://www.caa.go.jp/']
  },
  {
    company_name: '株式会社マーキュリー',
    corporate_number: '9010601059005',
    location: '東京都渋谷区神宮前六丁目28番9号',
    invoice_date: '2024-10-31',
    amount: 0,
    due_date: '2024-10-31',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【消費者庁 特定商取引法行政処分】薬用歯磨き定期通販における誇大広告による業務停止命令（3か月間）',
    admin_notes: '【公表日: 2024年10月31日】消費者庁より特定商取引法第15条第1項に基づく業務停止命令（3か月間）および指示処分。薬用歯磨きの定期通販において「10秒で黄ばみ消えた」等の根拠のない誇大広告を行い特商法に違反。',
    evidence_urls: ['https://www.caa.go.jp/']
  },
  {
    company_name: 'さくらフォレスト株式会社',
    corporate_number: '1290001065905',
    location: '福岡県福岡市中央区警固二丁目12番23号',
    invoice_date: '2025-03-19',
    amount: 109030000,
    due_date: '2025-03-19',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【消費者庁 景品表示法課徴金納付命令】機能性表示食品の不当表示に対する課徴金1億903万円納付命令',
    admin_notes: '【公表日: 2025年3月19日】消費者庁より景品表示法第8条第1項に基づく課徴金納付命令（1億903万円）。機能性表示食品「きなり匠」「きなり極」において届出表示を裏付ける合理的根拠のない効能を謳った優良誤認表示。',
    evidence_urls: ['https://www.caa.go.jp/']
  },
  {
    company_name: '株式会社ユニットコム',
    corporate_number: '2120001037218',
    location: '大阪府大阪市浪速区日本橋四丁目16番1号',
    invoice_date: '2023-03-24',
    amount: 0,
    due_date: '2023-03-24',
    payment_status: 'unpaid',
    status: 'approved',
    counterparty_claim: '【消費者庁 景品表示法措置命令】パソコン通販における不当な二重価格表示（有利誤認）に対する措置命令',
    admin_notes: '【公表日: 2023年3月24日】消費者庁より景品表示法第7条第1項に基づく措置命令。パソコン通信販売において、直近の販売実績のない価格を「通常価格」として比較対照し、不当に安価であると誤認させた有利誤認表示。',
    evidence_urls: ['https://www.caa.go.jp/']
  }
];

async function run() {
  console.log('--- 消費者庁 特定商取引法・景品表示法 行政処分・措置命令データ インポート開始 ---');

  const { data: adminComp } = await supabase.from('companies').select('id').limit(1).single();
  const regCompanyId = adminComp ? adminComp.id : null;

  let inserted = 0;
  let updated = 0;

  for (const c of consumerCases) {
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

  console.log(`\n完了: 新規追加 ${inserted}件, 更新 ${updated}件 (計 ${consumerCases.length}件)`);

  const { count } = await supabase.from('credit_cases').select('*', { count: 'exact', head: true });
  console.log(`現在のDB全件数: ${count}件`);
}

run();
