const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ── 業種判定・除外フィルタ定義（lib/officialSources.ts と同一基準） ──
const EXCLUDED_INDUSTRY_REGEX =
  /製薬|薬品|医薬|クリニック|病院|医療法人|歯科|薬局|整骨|接骨|鍼灸|福祉|介護|デイサービス|訪問介護|老人ホーム|保育園|幼稚園|学園|学校法人|大学|学習塾|進学塾|英会話|留学|美容|サロン|エステ|化粧品|コスメ|薬用|健康食品|サプリ|機能性表示食品|旅行|トラベル|観光|ツアー|しろくまツアー|てるみくらぶ|ホテル|旅館|アパレル|ファッション|呉服|繊維|レナウン|製菓|洋菓子|シベール|菓子|食品|フーズ|飲食|レストラン|カフェ|喫茶|居酒屋|焼肉|寿司|ラーメン|うどん|そば|弁当|給食|青果|水産|畜産|牧場|農業|農園|ケフィア|漁業|パチンコ|ガイア|アミューズメント|フィットネス|ジム|chocoZAP|RIZAP|船井電機|夢グループ|イモトのWiFi|エクスコム|磁気治療器|ジャパンライフ|出版|印刷|新聞|書店|スーパー|百貨店|ドラッグストア|ゴルフ|冠婚葬祭|葬儀|ブライダル/;

const TRANSPORT_LOGISTICS_REGEX =
  /運輸|運送|物流|ロジスティクス|ロジ|通運|急便|陸運|海運|倉庫|配送|引越|交通|貨物|自動車運送|自動車整備|レッカー|ダンプ|トラック|ドライバー|運転手|運転者|荷役|港湾|乗務員/;

const SECURITY_STAFFING_REGEX =
  /警備|セキュリティ|ガード|メンテナンス|ビル管理|清掃|美装|環境|廃棄物|産廃|不用品|害虫駆除|派遣|スタッフ|ワーク|キャリア|ヒューマン|サポート|アウトソーシング|請負|技能実習/;

const CONSTRUCTION_REALESTATE_REGEX =
  /建設|建工|工務|工業|建材|土木|建築|塗装|防水|設備|電設|電気|電工|配管|管工|給排水|給湯|水道|ガス|空調|ダクト|解体|足場|鳶|鉄筋|鉄骨|溶接|左官|板金|建具|サッシ|ガラス|タイル|石材|内装|外装|屋根|外壁|造園|舗装|基礎|仮設|杭|重機|クレーン|生コン|コンクリート|ハウス|ホーム|不動産|宅建|宅地建物|地所|興業|組|技建|住建|建装|資材|開発|設計|測量|地質|リフォーム|リノベ|エンジニアリング|工事|現場|施工/;

function classifyCompanyIndustry(item) {
  if (!item) return 'excluded';
  const name = item.company_name || '';
  const claim = item.counterparty_claim || '';
  const notes = item.admin_notes || '';
  const fullText = `${name} ${claim} ${notes}`;

  // 国土交通省の確定処分はすべて対象業種（社名や発注機関名に「食品」「病院」「大学」「冠婚葬祭」等が含まれていても除外しない）
  if (/^【(?:国土交通省|東京都知事)/.test(claim)) {
    if (/自動車運送|貨物自動車|自動車整備/.test(claim)) {
      return 'transport_logistics';
    }
    if (/マンション管理|賃貸住宅管理/.test(claim) || SECURITY_STAFFING_REGEX.test(name)) {
      return 'security_staffing';
    }
    return 'construction_realestate';
  }

  if (EXCLUDED_INDUSTRY_REGEX.test(fullText)) {
    return 'excluded';
  }
  if (/マンション管理|賃貸住宅管理|害虫駆除|不用品|清掃|ビル管理|警備/.test(fullText) || SECURITY_STAFFING_REGEX.test(name)) {
    return 'security_staffing';
  }
  if (/宅建|宅地建物|建設業|建築基準|指名停止|測量|建設コンサル|地質調査/.test(claim)) {
    return 'construction_realestate';
  }
  if (/自動車運送|貨物自動車|自動車整備/.test(claim) || TRANSPORT_LOGISTICS_REGEX.test(name) || TRANSPORT_LOGISTICS_REGEX.test(fullText)) {
    return 'transport_logistics';
  }
  if (CONSTRUCTION_REALESTATE_REGEX.test(name) || CONSTRUCTION_REALESTATE_REGEX.test(fullText)) {
    return 'construction_realestate';
  }
  if (SECURITY_STAFFING_REGEX.test(name) || SECURITY_STAFFING_REGEX.test(fullText)) {
    return 'security_staffing';
  }
  return 'excluded';
}

function hasOfficialGovernmentUrl(item) {
  const urls = Array.isArray(item && item.evidence_urls) ? item.evidence_urls : [];
  return urls.some(u => typeof u === 'string' && (/^https?:\/\/[^/]*\.go\.jp(\/|$)/i.test(u) || u.includes('kanpou.npb.go.jp')));
}

function isOfficialRecord(item) {
  if (!item) return false;
  if (item.is_official === true) return true;
  // 一般ユーザー投稿API（POST /api/credit-cases）はストレージ相対パスのみ許可し外部 https://*.go.jp URL を一切許可しないため、
  // 政府公式ドメインURLを持つレコードは旧バッチ（is_official カラム追加前）が投入した公的記録として確実に判定できる
  if (hasOfficialGovernmentUrl(item)) return true;
  if (item.is_official === false) return false;
  const claim = item.counterparty_claim || '';
  return /^(【厚生労働省|【国土交通省|【東京都知事|【消費者庁|【官報公告|【公正取引委員会|【経済産業省)/.test(claim);
}

async function insertOfficialCreditCase(recordOrRecords) {
  const withFlag = Array.isArray(recordOrRecords)
    ? recordOrRecords.map(r => ({ ...r, is_official: true }))
    : { ...recordOrRecords, is_official: true };

  let result = await supabase.from('credit_cases').insert(withFlag);
  if (result.error && result.error.message && result.error.message.includes('is_official')) {
    result = await supabase.from('credit_cases').insert(recordOrRecords);
  }
  return result;
}

function parseWarekiDate(str) {
  if (!str) return null;
  const cleaned = str.trim();
  const match = cleaned.match(/^([HR])(\d+)\.(\d+)\.(\d+)/);
  if (match) {
    const [_, era, yearStr, monthStr, dayStr] = match;
    let year = parseInt(yearStr, 10);
    if (era === 'H') year += 1988;
    if (era === 'R') year += 2018;
    return `${year}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;
  }
  const kanjiMatch = cleaned.match(/令和(\d+)年(\d+)月(\d+)日/);
  if (kanjiMatch) {
    const year = 2018 + parseInt(kanjiMatch[1], 10);
    return `${year}-${kanjiMatch[2].padStart(2, '0')}-${kanjiMatch[3].padStart(2, '0')}`;
  }
  return null;
}

// 1A. 国土交通省ネガティブ情報（建設・指名停止・測量・建設コンサル・地質・宅建・マンション管理・賃貸管理・自動車整備）
//     ※3パターンのHTMLテーブル列順序すべてに対応し、複数ページ（各分野最大15ページ＝最大150件）を取得
const MLIT_MAX_PAGES_PER_CATEGORY = 15;
const MLIT_CATEGORY_LABEL_MAP = {
  kensetugyousya: '建設業法',
  shimeiteishi: '工事等指名停止措置',
  sokuryou: '測量法',
  kensetukonsaru: '建設コンサルタント登録規程',
  tisitu: '地質調査業者登録規程',
  takuti: '宅建業法',
  mansyon: 'マンション管理適正化法',
  tintai: '賃貸住宅管理業法',
  jidousyaseibi: '道路運送車両法（自動車整備事業）'
};

function parseMlitNegaInfHtml(html, category) {
  const rows = [];
  const catLabel = MLIT_CATEGORY_LABEL_MAP[category] || '監督処分';
  const trBlocks = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];

  for (const trMatch of trBlocks) {
    const trInner = trMatch[1];
    if (!trInner.includes('class="punish"')) continue;

    const tds = [...trInner.matchAll(/<td\s+class="([^"]+)"[^>]*>([\s\S]*?)<\/td>/gi)].map(m => ({
      cls: m[1].trim(),
      html: m[2].trim()
    }));
    if (tds.length < 4) continue;

    let rawDate = '';
    let authority = '国土交通省';
    let rawNameHtml = '';
    let address = '';
    let punishType = '';
    let detailHtml = '';

    // パターンA（kensetugyousya）: name, address, date, name(authority), punish, detail
    if (tds[0].cls === 'name' && tds[1].cls === 'address') {
      rawNameHtml = tds[0].html;
      address = tds[1].html;
      rawDate = tds[2]?.html || '';
      authority = tds[3]?.html || '国土交通省';
      punishType = tds[4]?.html || '';
      detailHtml = tds[5]?.html || '';
    }
    // パターンB（takuti, shimeiteishi, jidousyaseibi）: date, date(authority), name, address, punish, detail
    else if (tds[0].cls === 'date' && tds[1].cls === 'date') {
      rawDate = tds[0].html;
      authority = tds[1].html;
      rawNameHtml = tds[2]?.html || '';
      address = tds[3]?.html || '';
      punishType = tds[4]?.html || '';
      detailHtml = tds[5]?.html || '';
    }
    // パターンC（sokuryou, kensetukonsaru, tisitu, mansyon, tintai）: date, name, address, punish, detail
    else if (tds[0].cls === 'date' && tds[1].cls === 'name') {
      rawDate = tds[0].html;
      rawNameHtml = tds[1].html;
      address = tds[2]?.html || '';
      punishType = tds[3]?.html || '';
      detailHtml = tds[4]?.html || '';
    } else {
      continue;
    }

    const dateMatch = rawDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    const pubDate = dateMatch
      ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
      : null;

    const corpMatch = rawNameHtml.match(/（(\d{13})）/);
    const corporateNumber = corpMatch ? corpMatch[1] : null;

    const cleanName = rawNameHtml
      .replace(/<span>[\s\S]*?<\/span>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/（\d{13}）/g, '')
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .trim();

    if (!cleanName) continue;

    const overviewMatch = detailHtml.match(/href="([^"]+)"/);
    const overviewUrl = overviewMatch
      ? `https://www.mlit.go.jp/nega-inf/cgi-bin/${overviewMatch[1].replace(/&amp;/g, '&')}`
      : 'https://www.mlit.go.jp/nega-inf/';

    const cleanAddr = address.replace(/<[^>]+>/g, '').replace(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)\1+/, '$1').trim();

    rows.push({
      company_name: cleanName,
      corporate_number: corporateNumber,
      pub_date: pubDate,
      authority: authority.replace(/<[^>]+>/g, '').trim() || '国土交通省',
      address: cleanAddr,
      punish_type: punishType.replace(/<[^>]+>/g, '').trim(),
      overview_url: overviewUrl,
      category_label: catLabel
    });
  }

  return rows;
}

async function fetchMlitNegaInfCases(category) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const startYear = currentYear - 2; // 直近2年分を取得

    const url = 'https://www.mlit.go.jp/nega-inf/cgi-bin/search.cgi';
    const params = new URLSearchParams({
      jigyoubunya: category,
      EID: 'search',
      start_year: String(startYear),
      start_month: '1',
      end_year: String(currentYear),
      end_month: String(currentMonth),
      shobun: '',
      jigyousya: ''
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: params.toString()
    });

    if (!res.ok) return [];

    const firstHtml = await res.text();
    const allRows = [...parseMlitNegaInfHtml(firstHtml, category)];

    const pageNums = [...firstHtml.matchAll(/page=(\d+)/g)].map(m => Number(m[1]));
    const maxPage = pageNums.length > 0 ? Math.min(Math.max(...pageNums), MLIT_MAX_PAGES_PER_CATEGORY) : 1;

    if (maxPage > 1) {
      const pagesToFetch = [];
      for (let p = 2; p <= maxPage; p++) pagesToFetch.push(p);

      const BATCH_SIZE = 5;
      for (let i = 0; i < pagesToFetch.length; i += BATCH_SIZE) {
        const batch = pagesToFetch.slice(i, i + BATCH_SIZE);
        const pageResults = await Promise.all(
          batch.map(async (page) => {
            try {
              const pageUrl = `${url}?jigyoubunya=${encodeURIComponent(category)}&EID=search&start_year=${startYear}&start_month=1&end_year=${currentYear}&end_month=${currentMonth}&disposal_name1=&disposal_name2=&reason_con=&reason1=&reason2=&reason3=&shobun=&address=&agency=&page=${page}`;
              const pRes = await fetch(pageUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
              });
              if (!pRes.ok) return [];
              const pHtml = await pRes.text();
              return parseMlitNegaInfHtml(pHtml, category);
            } catch {
              return [];
            }
          })
        );
        for (const r of pageResults) {
          allRows.push(...r);
        }
      }
    }

    return allRows;
  } catch (err) {
    console.warn(`[MLIT ${category} 同期取得エラー]:`, err.message);
    return [];
  }
}

// 1B. 国土交通省 貨物自動車運送事業（トラック事業者・軽貨物事業者）の事業停止・許可取消処分取得
//     ※件数上限（旧15件制限）および社名除外ワード制限を撤廃し、直近2年分を全件取得
async function fetchMlitTruckingCases() {
  const results = [];
  const seenKeys = new Set();
  // mode=1: 一般貨物（トラック）, mode=5: 軽貨物 / rui=4: 事業停止処分, rui=5: 許可の取り消し処分
  const queries = [
    { mode: '1', rui: '4', modeLabel: '一般貨物自動車運送事業', punishLabel: '事業停止処分' },
    { mode: '1', rui: '5', modeLabel: '一般貨物自動車運送事業', punishLabel: '許可取消処分' },
    { mode: '5', rui: '4', modeLabel: '貨物軽自動車運送事業', punishLabel: '事業停止処分' }
  ];

  const currentYear = new Date().getFullYear();
  const targetYears = [String(currentYear), String(currentYear - 1)];

  for (const yearStr of targetYears) {
    for (const q of queries) {
      try {
        const params = new URLSearchParams({
          mode: q.mode,
          year: yearStr,
          month: '0',
          day: '0',
          ken: '0',
          rui: q.rui,
          tensu: '0',
          gyosya: ''
        });

        const res = await fetch('https://www.mlit.go.jp/jidosha/anzen/03punishment/cgi-bin/list.cgi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: params.toString()
        });

        if (!res.ok) continue;

        const buf = await res.arrayBuffer();
        const html = new TextDecoder('euc-jp').decode(buf);

        const trMatches = html.matchAll(
          /<tr><td[^>]*><a href="([^"]+)">詳細<\/a><\/td><td>([^<]+)<\/td><td>([\s\S]*?)<\/td><td>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><td[^>]*>([^<]*)<\/td><\/tr>/gi
        );

        for (const m of trMatches) {
          const detailRel = m[1].trim();
          const rawDate = m[2].trim();
          const rawNameInfo = m[3].replace(/<[^>]+>/g, '').trim();
          const address = m[4].trim();
          const points = m[5].trim();

          const pubDate = parseWarekiDate(rawDate);
          const corpMatch = rawNameInfo.match(/法人番号\s*(\d{13})/);
          const corporateNumber = corpMatch ? corpMatch[1] : null;

          // 「株式会社カイト（法人番号8430001055703）代表者：志知孝保」から事業者名（法人または個人事業主屋号・氏名）を抽出
          const cleanName = rawNameInfo
            .replace(/[（\(]法人番号\s*\d{13}[）\)]/g, '')
            .replace(/[（\(]法人番号指定なし[）\)]/g, '')
            .replace(/代表者[:：]?.*$/g, '')
            .replace(/ｰ/g, 'ー')
            .trim();

          if (!cleanName) continue;

          const dedupeKey = `${cleanName}||${pubDate || rawDate}`;
          if (seenKeys.has(dedupeKey)) continue;
          seenKeys.add(dedupeKey);

          const numericPoints = parseInt(points, 10);
          const hasValidPoints = !isNaN(numericPoints) && numericPoints > 0;
          const pointsSuffix = hasValidPoints ? `（違反点数：${numericPoints}点）` : '';
          const pointsNote = hasValidPoints ? `（累積違反点数: ${numericPoints}点）` : '';

          results.push({
            company_name: cleanName,
            corporate_number: corporateNumber,
            location: address || null,
            pub_date: pubDate,
            counterparty_claim: `【国土交通省 自動車運送事業処分】${q.modeLabel}における${q.punishLabel}${pointsSuffix}`,
            admin_notes: `[公表日: ${rawDate}] 事業区分: ${q.modeLabel} / 処分種別: ${q.punishLabel}\n事業者情報: ${rawNameInfo}\n所在地: ${address}${pointsNote}`,
            evidence_urls: [`https://www.mlit.go.jp/jidosha/anzen/03punishment/cgi-bin/${detailRel}`]
          });
        }
      } catch (err) {
        console.warn(`[MLIT 貨物運送 ${yearStr} ${q.modeLabel} 取得エラー]:`, err.message);
      }
    }
  }

  return results;
}

// 2. 消費者庁「特定商取引法ガイド 執行状況一覧」から建設・リフォーム・住宅設備・運送系処分を取得
//    ※法人だけでなく、個人事業主に対する「業務停止命令」「指示」も取得（役員個人への付随「業務禁止命令」のみ重複除外）
async function fetchCaaTargetIndustryCases() {
  const caaTargetServiceRegex =
    /工事|リフォーム|屋根|外壁|塗装|住宅|建築|建設|工務|設備|水道|給湯|配管|電気|解体|修繕|メンテナンス|引越|運送|駆除|害虫|清掃|美装|不用品|廃棄物|産廃|警備|セキュリティ|ビル管理/;

  const pages = ['result_currentyear.html', 'result_1year.html', 'result_2year.html'];
  const results = [];
  const seenKeys = new Set();

  for (const page of pages) {
    try {
      const url = `https://www.no-trouble.caa.go.jp/action/${page}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (!res.ok) continue;

      const html = await res.text();
      const trs = html.matchAll(
        /<tr>\s*<td class="p-search-jigyousya">([\s\S]*?)<\/td>\s*<td class="p-search-syobun">([\s\S]*?)<\/td>\s*<td class="p-search-torihiki">([\s\S]*?)<\/td>\s*<td class="p-search-toriatsu">([\s\S]*?)<\/td>\s*<td class="p-search-ihankoui">([\s\S]*?)<\/td>\s*<td class="p-search-ihankoui">([\s\S]*?)<\/td>\s*<td class="p-search-syoribi">([\s\S]*?)<\/td>\s*<td class="p-search-syobung">([\s\S]*?)<\/td>\s*<\/tr>/gi
      );

      const clean = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

      for (const m of trs) {
        const rawNameCell = m[1];
        const hrefMatch = rawNameCell.match(/href="([^"]+)"/i);
        const detailUrl = hrefMatch ? hrefMatch[1] : 'https://www.no-trouble.caa.go.jp/action/';
        const companyName = clean(rawNameCell);
        const punishType = clean(m[2]);
        const tradeType = clean(m[3]);
        const service = clean(m[4]);
        const violation = clean(m[5]);
        const lawArticle = clean(m[6]);
        const rawDate = clean(m[7]);
        const agency = clean(m[8]);

        // 法人の役員個人に対する付随処分（業務禁止命令）は、法人本体の業務停止命令と重複するため除外
        // ※個人事業主（屋号・個人）本人が受けた「業務停止命令」「指示」はそのまま取り込む！
        if (punishType.includes('業務禁止命令') || /代表取締役|取締役|代表社員/.test(companyName)) continue;

        if (!caaTargetServiceRegex.test(service) && !caaTargetServiceRegex.test(companyName)) continue;
        if (EXCLUDED_INDUSTRY_REGEX.test(`${companyName} ${service}`)) continue;

        const dateMatch = rawDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        const pubDate = dateMatch
          ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
          : null;

        const dedupeKey = `${companyName}_${pubDate || rawDate}`;
        if (seenKeys.has(dedupeKey)) continue;
        seenKeys.add(dedupeKey);

        const prefMatch = agency.match(/^(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/);
        let location = prefMatch ? prefMatch[1] : null;
        if (!location) {
          if (agency.includes('九州経済産業局')) location = '福岡県';
          else if (agency.includes('関東経済産業局')) location = '東京都';
          else if (agency.includes('近畿経済産業局')) location = '大阪府';
          else if (agency.includes('中部経済産業局')) location = '愛知県';
          else if (agency.includes('東北経済産業局')) location = '宮城県';
          else if (agency.includes('北海道経済産業局')) location = '北海道';
          else if (agency.includes('中国経済産業局')) location = '広島県';
          else if (agency.includes('四国経済産業局')) location = '香川県';
          else if (agency.includes('消費者庁')) location = '東京都';
        }

        results.push({
          company_name: companyName,
          corporate_number: null,
          location,
          pub_date: pubDate,
          counterparty_claim: `【消費者庁 特定商取引法行政処分】${agency}による${punishType}（対象役務：${service}）`,
          admin_notes: `[公表日: ${rawDate}] 処分行政庁: ${agency} / 取引類型: ${tradeType}\n対象役務: ${service}\n違反行為: ${violation}（適用条項: ${lawArticle}）`,
          evidence_urls: [detailUrl.startsWith('http') ? detailUrl : 'https://www.no-trouble.caa.go.jp/action/']
        });
      }
    } catch (err) {
      console.warn(`[消費者庁 ${page} 取得エラー]:`, err.message);
    }
  }

  return results;
}

// ── 毎週自動取得できる公式一次ソース由来レコードの判定（固定データ・旧取り込みデータを除外するためのホワイトリスト） ──
// 国土交通省 ネガティブ情報（fetchMlitNegaInfCases）/ 自動車運送事業処分（fetchMlitTruckingCases）/ 消費者庁 特商法（fetchCaaTargetIndustryCases）
const AUTO_SYNC_CLAIM_REGEX =
  /^【(?:国土交通省 (?:建設業法|工事等指名停止措置|測量法|建設コンサルタント登録規程|地質調査業者登録規程|宅建業法|マンション管理適正化法|賃貸住宅管理業法|道路運送車両法（自動車整備事業）|監督処分)監督処分|国土交通省 自動車運送事業処分|消費者庁 特定商取引法行政処分)】/;
const AUTO_SYNC_NOTES_REGEX = /^\[公表日: [^\]]*\] (?:処分機関|事業区分|処分行政庁): /;

// 公式側の取得対象期間（国交省ネガティブ情報: 直近2年 / 消費者庁: 当年＋過去2年）を超えた記録は自動削除する
const OFFICIAL_RETENTION_YEARS = 2;

function isAutoSyncedOfficialRecord(row) {
  const claim = (row && row.counterparty_claim) || '';
  const notes = (row && row.admin_notes) || '';
  return AUTO_SYNC_CLAIM_REGEX.test(claim) && AUTO_SYNC_NOTES_REGEX.test(notes);
}

async function fetchAllCreditRows(selectWithFlag, selectWithoutFlag) {
  const collect = async (selectStr) => {
    const out = [];
    for (let from = 0; from < 50000; from += 1000) {
      const { data, error } = await supabase
        .from('credit_cases')
        .select(selectStr)
        .order('id', { ascending: true })
        .range(from, from + 999);
      if (error) return { data: null, error };
      if (!data || data.length === 0) break;
      out.push(...data);
      if (data.length < 1000) break;
    }
    return { data: out, error: null };
  };

  let result = await collect(selectWithFlag);
  if (result.error && result.error.message && result.error.message.includes('is_official')) {
    result = await collect(selectWithoutFlag);
  }
  if (result.error) throw new Error(result.error.message || 'credit_cases fetch failed');
  return result.data || [];
}

async function deleteCreditRowsByIds(ids) {
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const { error } = await supabase.from('credit_cases').delete().in('id', chunk);
    if (!error) deleted += chunk.length;
  }
  return deleted;
}

async function syncOfficialData() {
  if (!supabase) {
    throw new Error('Supabase の接続設定（環境変数）が不足しているため、公的データの同期を実行できません。');
  }
  console.log('=== [公的データ自動定期同期バッチ（国土交通省・消費者庁 公式一次ソース） 開始] ===');
  const startTime = new Date();

  const { data: adminComp } = await supabase.from('companies').select('id').eq('is_main', true).limit(1).maybeSingle();
  const regCompanyId = adminComp ? adminComp.id : null;

  let totalNew = 0;
  let totalSkipped = 0;
  let totalCleaned = 0;

  // 重複判定用インメモリセット（数百回の個別SELECTを廃止してバッチ高速化）
  const existingDateKeySet = new Set();
  const existingNameSet = new Set();

  // 0. 既存DB内の公的記録クリーンアップ
  //    (a) 毎週自動取得できる公式一次ソース以外の公的記録（固定データ・旧取り込みデータ）を削除
  //    (b) 対象外業種（旅行・製薬・飲食・医療等）を削除
  //    (c) 公式側の取得対象期間を超えた古い記録を削除
  //    ※加盟企業の民間申告データ（is_official = false）は一切対象外
  console.log('\n[0/3] 公的記録のクリーンアップ（固定データ・対象外業種・期間超過）を実行中...');
  try {
    const allCases = await fetchAllCreditRows(
      'id, is_official, company_name, counterparty_claim, admin_notes, evidence_urls, due_date',
      'id, company_name, counterparty_claim, admin_notes, evidence_urls, due_date'
    );

    const retentionCutoff = `${new Date().getFullYear() - OFFICIAL_RETENTION_YEARS}-01-01`;
    const nonAutoIds = [];
    const excludedIds = [];
    const expiredIds = [];
    const fixFlagIds = [];

    for (const row of allCases) {
      if (!isOfficialRecord(row)) {
        if (row.company_name) {
          existingNameSet.add(row.company_name);
          existingDateKeySet.add(`${row.company_name}||${row.due_date ? String(row.due_date).slice(0, 10) : ''}`);
        }
        continue;
      }
      if (!isAutoSyncedOfficialRecord(row)) {
        nonAutoIds.push(row.id);
      } else if (classifyCompanyIndustry(row) === 'excluded') {
        excludedIds.push(row.id);
      } else if (row.due_date && String(row.due_date).slice(0, 10) < retentionCutoff) {
        expiredIds.push(row.id);
      } else {
        if (row.is_official === false) {
          fixFlagIds.push(row.id);
        }
        if (row.company_name) {
          existingNameSet.add(row.company_name);
          existingDateKeySet.add(`${row.company_name}||${row.due_date ? String(row.due_date).slice(0, 10) : ''}`);
        }
      }
    }

    if (fixFlagIds.length > 0) {
      for (let i = 0; i < fixFlagIds.length; i += 50) {
        const chunk = fixFlagIds.slice(i, i + 50);
        await supabase.from('credit_cases').update({ is_official: true }).in('id', chunk);
      }
    }

    const removedNonAuto = await deleteCreditRowsByIds(nonAutoIds);
    const removedExcluded = await deleteCreditRowsByIds(excludedIds);
    const removedExpired = await deleteCreditRowsByIds(expiredIds);
    totalCleaned += removedNonAuto + removedExcluded + removedExpired;

    console.log(`- 自動取得対象外の公的記録（固定データ・旧取り込み）: ${removedNonAuto}件 を削除`);
    console.log(`- 対象外業種の公的記録: ${removedExcluded}件 を削除`);
    console.log(`- 取得対象期間（${retentionCutoff} より前）を超えた公的記録: ${removedExpired}件 を削除`);
  } catch (err) {
    console.warn('[クリーンアップ警告]:', err.message);
  }

  const batchInsertOfficialRecords = async (records) => {
    let inserted = 0;
    const CHUNK_SIZE = 100;
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);
      const { error } = await insertOfficialCreditCase(chunk);
      if (!error) {
        inserted += chunk.length;
      } else {
        console.warn('[一括追加エラー]:', error.message);
      }
    }
    return inserted;
  };

  // 1A. 国土交通省 ネガティブ情報（建設・指名停止・測量・建設コンサル・地質・宅建・マンション管理・賃貸管理・自動車整備）
  console.log('\n[1/3] 国土交通省 ネガティブ情報（建設・土木・測量・不動産・自動車整備 全9分野）の同期確認中...');
  const mlitCategories = [
    'kensetugyousya',
    'shimeiteishi',
    'sokuryou',
    'kensetukonsaru',
    'tisitu',
    'takuti',
    'mansyon',
    'tintai',
    'jidousyaseibi'
  ];

  const mlitToInsert = [];
  for (const cat of mlitCategories) {
    const cases = await fetchMlitNegaInfCases(cat);
    console.log(`- 国交省 [${cat}] 取得: ${cases.length} 件`);

    for (const item of cases) {
      if (!item.company_name) continue;
      const dateKey = `${item.company_name}||${item.pub_date || ''}`;
      const isDuplicate = item.pub_date ? existingDateKeySet.has(dateKey) : existingNameSet.has(item.company_name);

      if (!isDuplicate) {
        existingDateKeySet.add(dateKey);
        existingNameSet.add(item.company_name);
        mlitToInsert.push({
          company_name: item.company_name,
          corporate_number: item.corporate_number,
          location: item.address || null,
          invoice_date: item.pub_date,
          due_date: item.pub_date,
          amount: 0,
          payment_status: 'unpaid',
          counterparty_claim: `【国土交通省 ${item.category_label}監督処分】${item.authority}公表による${item.punish_type}処分`,
          admin_notes: `[公表日: ${item.pub_date || ''}] 処分機関: ${item.authority}\n処分種別: ${item.punish_type}\n公表ソース: ${item.overview_url}`,
          status: 'approved',
          registered_by_company_id: regCompanyId,
          evidence_urls: [item.overview_url]
        });
      } else {
        totalSkipped++;
      }
    }
  }
  if (mlitToInsert.length > 0) {
    totalNew += await batchInsertOfficialRecords(mlitToInsert);
  }

  // 1B. 国土交通省 トラック・軽貨物運送事業（一般貨物・軽貨物）の行政処分同期
  console.log('\n[2/3] 国土交通省 貨物自動車運送事業（トラック・軽貨物事業者）の同期確認中...');
  const truckCases = await fetchMlitTruckingCases();
  console.log(`- 国交省 [トラック・軽貨物] 取得: ${truckCases.length} 件`);
  const truckToInsert = [];
  for (const item of truckCases) {
    const dateKey = `${item.company_name}||${item.pub_date || ''}`;
    const isDuplicate = item.pub_date ? existingDateKeySet.has(dateKey) : existingNameSet.has(item.company_name);

    if (!isDuplicate) {
      existingDateKeySet.add(dateKey);
      existingNameSet.add(item.company_name);
      truckToInsert.push({
        company_name: item.company_name,
        corporate_number: item.corporate_number,
        location: item.location,
        invoice_date: item.pub_date,
        due_date: item.pub_date,
        amount: 0,
        payment_status: 'unpaid',
        counterparty_claim: item.counterparty_claim,
        admin_notes: item.admin_notes,
        status: 'approved',
        registered_by_company_id: regCompanyId,
        evidence_urls: item.evidence_urls
      });
    } else {
      totalSkipped++;
    }
  }
  if (truckToInsert.length > 0) {
    totalNew += await batchInsertOfficialRecords(truckToInsert);
  }

  // 2. 消費者庁「特定商取引法ガイド 執行状況一覧」（工事・リフォーム・設備・運送系のみ自動抽出）
  console.log('\n[3/3] 消費者庁 特定商取引法行政処分（建設・リフォーム・住宅設備・運送系）の同期確認中...');
  const caaCases = await fetchCaaTargetIndustryCases();
  console.log(`- 消費者庁 対象業種抽出レコード: ${caaCases.length} 件`);
  const caaToInsert = [];
  for (const item of caaCases) {
    const dateKey = `${item.company_name}||${item.pub_date || ''}`;
    const isDuplicate = existingNameSet.has(item.company_name) || existingDateKeySet.has(dateKey);

    if (!isDuplicate) {
      existingDateKeySet.add(dateKey);
      existingNameSet.add(item.company_name);
      caaToInsert.push({
        company_name: item.company_name,
        corporate_number: item.corporate_number,
        location: item.location,
        invoice_date: item.pub_date,
        due_date: item.pub_date,
        amount: 0,
        payment_status: 'unpaid',
        counterparty_claim: item.counterparty_claim,
        admin_notes: item.admin_notes,
        status: 'approved',
        registered_by_company_id: regCompanyId,
        evidence_urls: item.evidence_urls
      });
    } else {
      totalSkipped++;
    }
  }
  if (caaToInsert.length > 0) {
    totalNew += await batchInsertOfficialRecords(caaToInsert);
  }

  // ※以下の旧ソースは、毎週自動取得できる公式一次ソースではないため廃止済み
  //   - 厚生労働省 労働基準関係法令違反（個人GitHub上の2018年固定TSV）
  //   - 官報 破産公告（コード内の固定データ）

  const { count } = await supabase.from('credit_cases').select('*', { count: 'exact', head: true });
  const duration = ((new Date() - startTime) / 1000).toFixed(2);

  console.log('\n=== [公的データ自動定期同期バッチ 完了] ===');
  console.log(`- 処理所要時間: ${duration} 秒`);
  console.log(`- クリーンアップ削除: ${totalCleaned} 件`);
  console.log(`- 今回新規同期: ${totalNew} 件`);
  console.log(`- 既存最新維持: ${totalSkipped} 件`);
  console.log(`- データベース現在総件数: ${count} 件`);

  return {
    success: true,
    totalCleaned,
    totalNew,
    totalSkipped,
    currentTotalCount: count,
    durationSeconds: parseFloat(duration)
  };
}

if (require.main === module) {
  syncOfficialData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Sync Fatal Error:', err);
      process.exit(1);
    });
}

module.exports = { syncOfficialData, classifyCompanyIndustry };
