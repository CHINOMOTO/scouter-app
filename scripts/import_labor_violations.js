const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseWarekiDate(str) {
  if (!str) return null;
  const cleaned = str.trim();
  const match = cleaned.match(/^([HR])(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;

  const [_, era, yearStr, monthStr, dayStr] = match;
  let year = parseInt(yearStr, 10);
  if (era === 'H') year += 1988;
  if (era === 'R') year += 2018;

  const m = monthStr.padStart(2, '0');
  const d = dayStr.padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function extractAmount(summary) {
  if (!summary) return 0;
  const manMatch = summary.match(/約?([\d,]+)\s*万\s*円/);
  if (manMatch) {
    const num = parseInt(manMatch[1].replace(/,/g, ''), 10);
    return num * 10000;
  }
  const yenMatch = summary.match(/約?([\d,]+)\s*円/);
  if (yenMatch) {
    const num = parseInt(yenMatch[1].replace(/,/g, ''), 10);
    if (num > 0) return num;
  }
  return 0;
}

async function runImport(isDryRun = true) {
  console.log(`Starting Labor Violation Import... (DryRun = ${isDryRun})`);
  
  const url = 'https://raw.githubusercontent.com/nyampire/jp_labor_act_illegal_list/master/company_list_20180801_to_20180731.tsv';
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.trim().split('\n');

  console.log(`Fetched ${lines.length - 1} records from dataset.`);

  const { data: adminComp } = await supabase.from('companies').select('id').limit(1).single();
  const regCompanyId = adminComp ? adminComp.id : null;

  const casesToInsert = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 5) continue;

    const [jurisdiction, updatedAt, companyName, location, publishedDateStr, law, summary, notes] = cols;
    if (!companyName || !companyName.trim()) continue;

    const pubDate = parseWarekiDate(publishedDateStr);
    const amount = extractAmount(summary);
    
    const isWageViolation = (law && (law.includes('24条') || law.includes('最低賃金法') || law.includes('26条'))) || 
                           (summary && (summary.includes('支払わなかった') || summary.includes('賃金')));

    // credit_cases 実テーブルの確定カラムのみ使用
    casesToInsert.push({
      company_name: companyName.trim(),
      corporate_number: null,
      location: location ? location.trim() : null,
      invoice_date: pubDate,
      due_date: pubDate,
      amount: amount,
      payment_status: isWageViolation ? 'unpaid' : 'resolved', // 既存スキーマ対応
      counterparty_claim: `【厚生労働省 公認送検事案】${jurisdiction}公表（${notes || '送検'}）`,
      admin_notes: `[公表日: ${publishedDateStr || ''}] 違反法条: ${law || ''}\n事案概要: ${summary || ''}`,
      status: 'approved',
      registered_by_company_id: regCompanyId,
      evidence_urls: ['https://www.mhlw.go.jp/']
    });
  }

  console.log(`Constructed ${casesToInsert.length} valid cases.`);

  if (isDryRun) {
    console.log('\n--- DRY RUN PREVIEW (First 2 Records) ---');
    console.dir(casesToInsert.slice(0, 2), { depth: 3 });
    console.log('\nDry run completed! To actually insert, run with `--commit` flag.');
    return;
  }

  console.log('Inserting into database in chunks of 50...');
  const chunkSize = 50;
  let insertedTotal = 0;

  for (let i = 0; i < casesToInsert.length; i += chunkSize) {
    const chunk = casesToInsert.slice(i, i + chunkSize);
    const { data, error } = await supabase.from('credit_cases').insert(chunk).select('id');

    if (error) {
      console.error(`Error inserting chunk ${i} - ${i + chunk.length}:`, error.message);
      break;
    }

    insertedTotal += (data ? data.length : chunk.length);
    console.log(`Inserted ${insertedTotal} / ${casesToInsert.length} records...`);
  }

  console.log(`\n✓ Successfully inserted ${insertedTotal} public violation cases into credit_cases!`);
}

const shouldCommit = process.argv.includes('--commit');
runImport(!shouldCommit).catch(console.error);
