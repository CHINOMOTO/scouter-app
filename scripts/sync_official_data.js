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

// 国土交通省ネガティブ情報 差分スクレイピング取得関数
async function fetchMlitRecentCases(category = 'takuti') {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 直近6ヶ月間の最新処分データを取得
    const startYear = currentMonth <= 6 ? currentYear - 1 : currentYear;
    const startMonth = currentMonth <= 6 ? currentMonth + 6 : currentMonth - 6;

    const url = 'https://www.mlit.go.jp/nega-inf/cgi-bin/search.cgi';
    const params = new URLSearchParams();
    params.append('jigyoubunya', category);
    params.append('EID', 'search');
    params.append('start_year', String(startYear));
    params.append('start_month', String(startMonth));
    params.append('end_year', String(currentYear));
    params.append('end_month', String(currentMonth));
    params.append('shobun', '');
    params.append('jigyousya', '');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: params.toString()
    });

    if (!res.ok) return [];

    const html = await res.text();
    const rows = [];
    const trMatches = html.matchAll(/<tr>\s*<td class="date">([^<]+)<\/td>\s*<td class="date">([^<]+)<\/td>\s*<td class="name">([\s\S]*?)<\/td>\s*<td class="address">([^<]*)<\/td>\s*<td class="punish">([^<]*)<\/td>\s*<td class="detail">([\s\S]*?)<\/td>\s*<\/tr>/gi);

    for (const m of trMatches) {
      const rawDate = m[1].trim();
      const authority = m[2].trim();
      const rawNameHtml = m[3].trim();
      const address = m[4].trim();
      const punishType = m[5].trim();
      const detailHtml = m[6].trim();

      const dateMatch = rawDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      const pubDate = dateMatch 
        ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
        : null;

      const corpMatch = rawNameHtml.match(/（(\d{13})）/);
      const corporateNumber = corpMatch ? corpMatch[1] : null;

      const cleanName = rawNameHtml
        .replace(/<span>[\s\S]*?<\/span>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/（\d+）/g, '')
        .trim();

      const overviewMatch = detailHtml.match(/href="([^"]+)"/);
      const overviewUrl = overviewMatch ? `https://www.mlit.go.jp/nega-inf/cgi-bin/${overviewMatch[1]}` : null;

      rows.push({
        company_name: cleanName,
        corporate_number: corporateNumber,
        pub_date: pubDate,
        authority,
        address,
        punish_type: punishType,
        overview_url: overviewUrl,
        category_label: category === 'takuti' ? '宅建業法' : '建設業法'
      });
    }

    return rows;
  } catch (err) {
    console.warn(`[MLIT ${category} 同期取得エラー]:`, err.message);
    return [];
  }
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

  // 2. 国土交通省 ネガティブ情報（宅建業・建設業）の自動同期
  console.log('\n[2/3] 国土交通省 ネガティブ情報（直近行政処分）の同期確認中...');
  const mlitCategories = ['takuti', 'kensetugyousya'];
  for (const cat of mlitCategories) {
    const cases = await fetchMlitRecentCases(cat);
    console.log(`- 国交省 [${cat}] 直近公表: ${cases.length} 件`);

    for (const item of cases) {
      if (!item.company_name) continue;

      // 既存重複チェック（社名 ＋ 処分日）
      let query = supabase.from('credit_cases').select('id').eq('company_name', item.company_name);
      if (item.pub_date) query = query.eq('due_date', item.pub_date);
      const { data: existing } = await query.limit(1);

      if (!existing || existing.length === 0) {
        const { error } = await supabase.from('credit_cases').insert({
          company_name: item.company_name,
          corporate_number: item.corporate_number,
          location: item.address || null,
          invoice_date: item.pub_date,
          due_date: item.pub_date,
          amount: 0,
          payment_status: 'unpaid',
          counterparty_claim: `【国土交通省 ${item.category_label}監督処分】${item.authority}公表による${item.punish_type}処分`,
          admin_notes: `[公表日: ${item.pub_date || ''}] 処分機関: ${item.authority}\n処分種別: ${item.punish_type}\n公表ソース: ${item.overview_url || 'https://www.mlit.go.jp/nega-inf/'}`,
          status: 'approved',
          registered_by_company_id: regCompanyId,
          evidence_urls: [item.overview_url || 'https://www.mlit.go.jp/nega-inf/']
        });

        if (!error) {
          totalNew++;
          console.log(`  + [新規追加] ${item.company_name} (${item.authority} ${item.punish_type})`);
        } else {
          console.warn(`  ! [追加失敗] ${item.company_name}:`, error.message);
        }
      } else {
        totalSkipped++;
      }
    }
  }

  // 3. 総件数の確認
  console.log('\n[3/3] データベース確定件数の集計中...');
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
