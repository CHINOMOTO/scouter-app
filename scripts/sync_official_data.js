const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[SYNC ERROR] Missing Supabase credentials');
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

async function syncOfficialData() {
  console.log('=== [公的データ自動定期同期バッチ 開始] ===');
  const startTime = new Date();

  const { data: adminComp } = await supabase.from('companies').select('id').limit(1).single();
  const regCompanyId = adminComp ? adminComp.id : null;

  let totalNew = 0;
  let totalSkipped = 0;

  // 1. 厚生労働省 労働基準関係法令違反データの自動同期
  console.log('\n[1/3] 厚生労働省 労働基準関係法令違反（送検データ）の同期確認中...');
  try {
    const url = 'https://raw.githubusercontent.com/nyampire/jp_labor_act_illegal_list/master/company_list_20180801_to_20180731.tsv';
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n');
      console.log(`- 外部公表データソース取得: ${lines.length - 1} レコード`);

      const batchToInsert = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.length < 5) continue;

        const [jurisdiction, updatedAt, companyName, location, publishedDateStr, law, summary, notes] = cols;
        if (!companyName || !companyName.trim()) continue;

        const cleanName = companyName.trim();
        const pubDate = parseWarekiDate(publishedDateStr);
        const amount = extractAmount(summary);
        const isWageViolation = (law && (law.includes('24条') || law.includes('最低賃金法') || law.includes('26条'))) || 
                               (summary && (summary.includes('支払わなかった') || summary.includes('賃金')));

        // 既存チェック
        const { data: existing } = await supabase
          .from('credit_cases')
          .select('id')
          .eq('company_name', cleanName)
          .limit(1);

        if (!existing || existing.length === 0) {
          batchToInsert.push({
            company_name: cleanName,
            corporate_number: null,
            location: location ? location.trim() : null,
            invoice_date: pubDate,
            due_date: pubDate,
            amount: amount,
            payment_status: isWageViolation ? 'unpaid' : 'resolved',
            counterparty_claim: `【厚生労働省 公認送検事案】${jurisdiction}公表（${notes || '送検'}）`,
            admin_notes: `[公表日: ${publishedDateStr || ''}] 違反法条: ${law || ''}\n事案概要: ${summary || ''}`,
            status: 'approved',
            registered_by_company_id: regCompanyId,
            evidence_urls: ['https://www.mhlw.go.jp/']
          });
        } else {
          totalSkipped++;
        }
      }

      if (batchToInsert.length > 0) {
        console.log(`- 新規未登録データ ${batchToInsert.length}件 を検出、挿入中...`);
        const chunkSize = 50;
        for (let i = 0; i < batchToInsert.length; i += chunkSize) {
          const chunk = batchToInsert.slice(i, i + chunkSize);
          const { error } = await supabase.from('credit_cases').insert(chunk);
          if (error) {
            console.error('Batch insert error:', error.message);
          } else {
            totalNew += chunk.length;
          }
        }
      } else {
        console.log('- すべてのレコードがすでに最新状態で同期済みです（新規 0件）');
      }
    }
  } catch (err) {
    console.warn('[厚労省同期スキップ/エラー]:', err.message);
  }

  // 2. 総件数の確認
  const { count } = await supabase.from('credit_cases').select('*', { count: 'exact', head: true });
  const duration = ((new Date() - startTime) / 1000).toFixed(2);

  console.log('\n=== [公的データ自動定期同期バッチ 完了] ===');
  console.log(`- 処理所要時間: ${duration} 秒`);
  console.log(`- 今回新規同期: ${totalNew} 件`);
  console.log(`- 既存最新維持: ${totalSkipped} 件`);
  console.log(`- データベース現在総件数: ${count} 件`);

  return {
    success: true,
    totalNew,
    totalSkipped,
    currentTotalCount: count,
    durationSeconds: parseFloat(duration)
  };
}

// CLI直接実行時
if (require.main === module) {
  syncOfficialData().then(() => process.exit(0)).catch(err => {
    console.error('Sync Fatal Error:', err);
    process.exit(1);
  });
}

module.exports = { syncOfficialData };
