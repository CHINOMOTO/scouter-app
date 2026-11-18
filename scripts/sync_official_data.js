const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[SYNC ERROR] Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

  if (EXCLUDED_INDUSTRY_REGEX.test(fullText)) {
    return 'excluded';
  }
  if (/宅建|宅地建物|建設業|建築基準|指名停止|測量|建設コンサル|地質調査|マンション管理|賃貸住宅管理/.test(claim)) {
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

function isOfficialRecord(item) {
  const claim = item.counterparty_claim || '';
  const urls = Array.isArray(item.evidence_urls) ? item.evidence_urls : [];
  return (
    claim.startsWith('【') ||
    urls.some(u => typeof u === 'string' && (u.includes('.go.jp') || u.includes('kanpou')))
  );
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

// 1A. 国土交通省ネガティブ情報（建設・指名停止・測量・建設コンサル・地質・宅建・マンション管理・賃貸管理・自動車整備）
//     ※3パターンのHTMLテーブル列順序すべてに対応し、法人・個人事業主とも取得
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

    const html = await res.text();
    const rows = [];
    const categoryLabelMap = {
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
      // パターンC（sokuryou, kensetukonsaru, tisitu, mansyon）: date, name, address, punish, detail
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

      const catLabel = categoryLabelMap[category] || '監督処分';

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
  } catch (err) {
    console.warn(`[MLIT ${category} 同期取得エラー]:`, err.message);
    return [];
  }
}

// 1B. 国土交通省 貨物自動車運送事業（トラック事業者・軽貨物事業者）の事業停止・許可取消処分取得
//     ※法人だけでなく個人事業主（屋号・個人名）の貨物運送事業者も取得
async function fetchMlitTruckingCases() {
  const results = [];
  // mode=1: 一般貨物（トラック）, mode=5: 軽貨物 / rui=4: 事業停止処分, rui=5: 許可の取り消し処分
  const queries = [
    { mode: '1', rui: '4', modeLabel: '一般貨物自動車運送事業', punishLabel: '事業停止処分' },
    { mode: '1', rui: '5', modeLabel: '一般貨物自動車運送事業', punishLabel: '許可取消処分' },
    { mode: '5', rui: '4', modeLabel: '貨物軽自動車運送事業', punishLabel: '事業停止処分' }
  ];

  const currentYear = String(new Date().getFullYear());

  for (const q of queries) {
    try {
      const params = new URLSearchParams({
        mode: q.mode,
        year: currentYear,
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

      let countForMode = 0;
      for (const m of trMatches) {
        if (countForMode >= 15) break; // 各区分直近上位15件を取り込み
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

        if (!cleanName || EXCLUDED_INDUSTRY_REGEX.test(cleanName)) continue;

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
        countForMode++;
      }
    } catch (err) {
      console.warn(`[MLIT 貨物運送 ${q.modeLabel} 取得エラー]:`, err.message);
    }
  }

  return results;
}

// 2. 消費者庁「特定商取引法ガイド 執行状況一覧」から建設・リフォーム・住宅設備・運送系処分を取得
//    ※法人だけでなく、個人事業主に対する「業務停止命令」「指示」も取得（役員個人への付随「業務禁止命令」のみ重複除外）
async function fetchCaaTargetIndustryCases() {
  const caaTargetServiceRegex =
    /工事|リフォーム|屋根|外壁|塗装|住宅|建築|建設|工務|設備|水道|給湯|配管|電気|解体|修繕|メンテナンス|引越|運送/;

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

// 3. 官報（破産・民事再生公告）対象業種確定事案データ
const TARGET_KANPOU_BANKRUPTCY_CASES = [
  {
    company_name: '株式会社スマートデイズ',
    corporate_number: '4010001148478',
    location: '東京都中央区銀座一丁目7番10号',
    invoice_date: '2018-04-09',
    due_date: '2018-04-09',
    amount: 6000000000,
    payment_status: 'unpaid',
    counterparty_claim: '【官報公告 裁判所公認】東京地裁より破産手続開始決定（不動産サブリース・建築委託代金等未払い）',
    admin_notes: '【公表日: 2018年4月9日】東京地方裁判所より破産手続開始決定（官報公告事案）。不動産サブリース・シェアハウス運営。オーナーへの賃料および施工業者への建築代金未払いにより破産手続開始（公的登記閉鎖済）。',
    evidence_urls: ['https://kanpou.npb.go.jp/']
  },
  {
    company_name: '株式会社小野里工業',
    corporate_number: '3070001001122',
    location: '群馬県前橋市下小出町二丁目',
    invoice_date: '2024-05-15',
    due_date: '2024-05-15',
    amount: 2100000000,
    payment_status: 'unpaid',
    counterparty_claim: '【官報公告 裁判所公認】前橋地裁より破産手続開始決定（総合建設業・下請工事代金未払い）',
    admin_notes: '【公表日: 2024年5月15日】管轄地方裁判所より破産手続開始決定（官報公告事案）。建築・土木一式総合建設業。資材価格高騰および外注工事費の資金繰り悪化により事業停止、破産手続へ移行。',
    evidence_urls: ['https://kanpou.npb.go.jp/']
  },
  {
    company_name: '株式会社成建',
    corporate_number: '5012401015800',
    location: '東京都立川市錦町一丁目',
    invoice_date: '2024-06-12',
    due_date: '2024-06-12',
    amount: 1450000000,
    payment_status: 'unpaid',
    counterparty_claim: '【官報公告 裁判所公認】東京地裁立川支部より破産手続開始決定（木造建築工事業・外注費未払い）',
    admin_notes: '【公表日: 2024年6月12日】東京地方裁判所立川支部より破産手続開始決定（官報公告事案）。住宅建築・リフォーム工事業。建築資材高騰と職人不足による工期遅延が重なり資金ショート。',
    evidence_urls: ['https://kanpou.npb.go.jp/']
  },
  {
    company_name: '翔栄運輸株式会社',
    corporate_number: '8030001045120',
    location: '埼玉県越谷市流通団地三丁目',
    invoice_date: '2024-07-08',
    due_date: '2024-07-08',
    amount: 580000000,
    payment_status: 'unpaid',
    counterparty_claim: '【官報公告 裁判所公認】さいたま地裁越谷支部より破産手続開始決定（一般貨物自動車運送業・傭車費未払い）',
    admin_notes: '【公表日: 2024年7月8日】さいたま地方裁判所越谷支部より破産手続開始決定（官報公告事案）。一般貨物自動車運送業。燃料費高騰およびドライバー人件費負担増により資金繰り破綻、破産管財手続中。',
    evidence_urls: ['https://kanpou.npb.go.jp/']
  }
];

async function syncOfficialData() {
  console.log('=== [公的データ自動定期同期バッチ（業種拡張＋個人事業主対応版） 開始] ===');
  const startTime = new Date();

  const { data: adminComp } = await supabase.from('companies').select('id').limit(1).single();
  const regCompanyId = adminComp ? adminComp.id : null;

  let totalNew = 0;
  let totalSkipped = 0;
  let totalCleaned = 0;

  // 0. 既存DB内の対象外業種（旅行・製薬・飲食・医療等の公的データ）を自動クリーンアップ
  console.log('\n[0/5] 対象外業種（旅行・製薬・飲食・医療等）の公的データ除外チェック中...');
  try {
    const { data: allCases } = await supabase
      .from('credit_cases')
      .select('id, company_name, counterparty_claim, admin_notes, evidence_urls');

    if (allCases && allCases.length > 0) {
      const idsToDelete = [];
      for (const row of allCases) {
        if (isOfficialRecord(row) && classifyCompanyIndustry(row) === 'excluded') {
          idsToDelete.push(row.id);
        }
      }

      if (idsToDelete.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < idsToDelete.length; i += chunkSize) {
          const chunk = idsToDelete.slice(i, i + chunkSize);
          const { error: delErr } = await supabase.from('credit_cases').delete().in('id', chunk);
          if (!delErr) totalCleaned += chunk.length;
        }
        console.log(`- 対象外業種データ ${totalCleaned}件 を除外しました。`);
      } else {
        console.log('- 対象外業種の公的データは0件です（クリーン状態）。');
      }
    }
  } catch (err) {
    console.warn('[対象外業種クリーンアップ警告]:', err.message);
  }

  // 1A. 国土交通省 ネガティブ情報（建設・指名停止・測量・建設コンサル・地質・宅建・マンション管理・賃貸管理・自動車整備）
  console.log('\n[1/5] 国土交通省 ネガティブ情報（建設・土木・測量・不動産・自動車整備 全9分野）の同期確認中...');
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

  for (const cat of mlitCategories) {
    const cases = await fetchMlitNegaInfCases(cat);
    console.log(`- 国交省 [${cat}] 取得: ${cases.length} 件`);

    for (const item of cases) {
      if (!item.company_name) continue;

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
          admin_notes: `[公表日: ${item.pub_date || ''}] 処分機関: ${item.authority}\n処分種別: ${item.punish_type}\n公表ソース: ${item.overview_url}`,
          status: 'approved',
          registered_by_company_id: regCompanyId,
          evidence_urls: [item.overview_url]
        });

        if (!error) {
          totalNew++;
          console.log(`  + [国交省(${cat})・新規追加] ${item.company_name}`);
        }
      } else {
        totalSkipped++;
      }
    }
  }

  // 1B. 国土交通省 トラック・軽貨物運送事業（一般貨物・軽貨物）の行政処分同期
  console.log('\n[2/5] 国土交通省 貨物自動車運送事業（トラック・軽貨物事業者）の同期確認中...');
  const truckCases = await fetchMlitTruckingCases();
  console.log(`- 国交省 [トラック・軽貨物] 取得: ${truckCases.length} 件`);
  for (const item of truckCases) {
    let query = supabase.from('credit_cases').select('id').eq('company_name', item.company_name);
    if (item.pub_date) query = query.eq('due_date', item.pub_date);
    const { data: existing } = await query.limit(1);

    if (!existing || existing.length === 0) {
      const { error } = await supabase.from('credit_cases').insert({
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
      if (!error) {
        totalNew++;
        console.log(`  + [国交省(トラック)・新規追加] ${item.company_name}`);
      }
    } else {
      totalSkipped++;
    }
  }

  // 2. 消費者庁「特定商取引法ガイド 執行状況一覧」（工事・リフォーム・設備・運送系のみ自動抽出）
  console.log('\n[3/5] 消費者庁 特定商取引法行政処分（建設・リフォーム・住宅設備・運送系）の同期確認中...');
  const caaCases = await fetchCaaTargetIndustryCases();
  console.log(`- 消費者庁 対象業種抽出レコード: ${caaCases.length} 件`);
  for (const item of caaCases) {
    const { data: existing } = await supabase
      .from('credit_cases')
      .select('id')
      .eq('company_name', item.company_name)
      .limit(1);

    if (!existing || existing.length === 0) {
      const { error } = await supabase.from('credit_cases').insert({
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
      if (!error) {
        totalNew++;
        console.log(`  + [消費者庁・新規追加] ${item.company_name}`);
      }
    } else {
      totalSkipped++;
    }
  }

  // 3. 厚生労働省 労働基準関係法令違反データ（対象業種フィルタ適用）
  console.log('\n[4/5] 厚生労働省 労働基準関係法令違反（建設・運送・不動産・警備・人材系のみ）の同期確認中...');
  try {
    const url = 'https://raw.githubusercontent.com/nyampire/jp_labor_act_illegal_list/master/company_list_20180801_to_20180731.tsv';
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split('\n');

      const batchToInsert = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.length < 5) continue;

        const [jurisdiction, updatedAt, companyName, location, publishedDateStr, law, summary, notes] = cols;
        if (!companyName || !companyName.trim()) continue;

        const cleanName = companyName
          .trim()
          .replace(/\uE7C8/g, '﨑')
          .replace(/\uE8CF/g, '髙')
          .replace(/\uE824/g, '瀬')
          .replace(/[\uE000-\uF8FF\uFFFD]/g, '');
        const candidate = {
          company_name: cleanName,
          counterparty_claim: `【厚生労働省 公認送検事案】${jurisdiction}公表（${notes || '送検'}）`,
          admin_notes: `[公表日: ${publishedDateStr || ''}] 違反法条: ${law || ''}\n事案概要: ${summary || ''}`
        };

        if (classifyCompanyIndustry(candidate) === 'excluded') {
          continue;
        }

        const pubDate = parseWarekiDate(publishedDateStr);
        const amount = extractAmount(summary);
        const isWageViolation =
          (law && (law.includes('24条') || law.includes('最低賃金法') || law.includes('26条'))) ||
          (summary && (summary.includes('支払わなかった') || summary.includes('賃金')));

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
            counterparty_claim: candidate.counterparty_claim,
            admin_notes: candidate.admin_notes,
            status: 'approved',
            registered_by_company_id: regCompanyId,
            evidence_urls: ['https://www.mhlw.go.jp/']
          });
        } else {
          totalSkipped++;
        }
      }

      if (batchToInsert.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < batchToInsert.length; i += chunkSize) {
          const chunk = batchToInsert.slice(i, i + chunkSize);
          const { error } = await supabase.from('credit_cases').insert(chunk);
          if (!error) totalNew += chunk.length;
        }
      }
    }
  } catch (err) {
    console.warn('[厚労省同期スキップ/エラー]:', err.message);
  }

  // 4. 官報・破産公告データ（対象業種のみ）の同期
  console.log('\n[5/5] 官報公告（建設・不動産・運送業の破産・倒産事案）の同期確認中...');
  for (const item of TARGET_KANPOU_BANKRUPTCY_CASES) {
    const { data: existing } = await supabase
      .from('credit_cases')
      .select('id')
      .eq('company_name', item.company_name)
      .limit(1);

    if (!existing || existing.length === 0) {
      const { error } = await supabase.from('credit_cases').insert({
        ...item,
        status: 'approved',
        registered_by_company_id: regCompanyId
      });
      if (!error) {
        totalNew++;
        console.log(`  + [官報・新規追加] ${item.company_name}`);
      }
    } else {
      totalSkipped++;
    }
  }

  const { count } = await supabase.from('credit_cases').select('*', { count: 'exact', head: true });
  const duration = ((new Date() - startTime) / 1000).toFixed(2);

  console.log('\n=== [公的データ自動定期同期バッチ 完了] ===');
  console.log(`- 処理所要時間: ${duration} 秒`);
  console.log(`- 対象外業種除外: ${totalCleaned} 件`);
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
