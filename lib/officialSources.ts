/**
 * 公的機関公表データ・民間被害申告データの判別および情報公表元（省庁・裁判所等）の名称特定ユーティリティ
 */

export interface OfficialSourceInfo {
    isOfficial: boolean;
    sourceName: string;
    sourceCategory: string;
    sourceUrl?: string;
}

export function detectOfficialSource(item?: {
    counterparty_claim?: string | null;
    evidence_urls?: string[] | null;
    admin_notes?: string | null;
    companies?: { name?: string } | null;
} | null): OfficialSourceInfo {
    if (!item) {
        return {
            isOfficial: false,
            sourceName: '加盟企業',
            sourceCategory: '民間取引先 被害申告'
        };
    }

    const claim = typeof item.counterparty_claim === 'string' ? item.counterparty_claim : '';
    const notes = typeof item.admin_notes === 'string' ? item.admin_notes : '';
    const urls = Array.isArray(item.evidence_urls) ? item.evidence_urls : [];

    // 1. 厚生労働省（労働局・労働基準監督署）
    if (
        claim.includes('【厚生労働省') ||
        notes.includes('厚生労働省') ||
        urls.some(u => typeof u === 'string' && u.includes('mhlw.go.jp'))
    ) {
        return {
            isOfficial: true,
            sourceName: '厚生労働省（労働基準監督署・労働局）',
            sourceCategory: '労働基準関係法令違反 送検公表事案',
            sourceUrl: urls.find(u => typeof u === 'string' && u.includes('mhlw.go.jp')) || 'https://www.mhlw.go.jp/'
        };
    }

    // 2. 国土交通省・自治体（ネガティブ情報検索システム・宅建/建築監督処分）
    if (
        claim.includes('【国土交通省') ||
        claim.includes('【東京都知事') ||
        notes.includes('国土交通省') ||
        urls.some(u => typeof u === 'string' && (u.includes('mlit.go.jp') || u.includes('nega-inf')))
    ) {
        const agencyName = claim.includes('東京都知事') 
            ? '東京都（都市整備局） / 国土交通省' 
            : '国土交通省（各地方整備局）';
        return {
            isOfficial: true,
            sourceName: `${agencyName} ネガティブ情報検索システム`,
            sourceCategory: '宅地建物取引業法・建築基準法に基づく監督処分',
            sourceUrl: urls.find(u => typeof u === 'string' && (u.includes('mlit.go.jp') || u.includes('nega-inf'))) || 'https://www.mlit.go.jp/nega-inf/'
        };
    }

    // 3. 消費者庁（特定商取引法・景品表示法違反公表）
    if (
        claim.includes('【消費者庁') ||
        notes.includes('消費者庁') ||
        urls.some(u => typeof u === 'string' && u.includes('caa.go.jp'))
    ) {
        return {
            isOfficial: true,
            sourceName: '消費者庁（取引対策課・表示対策課）',
            sourceCategory: '特定商取引法・景品表示法 行政処分',
            sourceUrl: urls.find(u => typeof u === 'string' && u.includes('caa.go.jp')) || 'https://www.caa.go.jp/'
        };
    }

    // 4. 国立印刷局「官報」・管轄地方裁判所（破産・民事再生・特別清算）
    if (
        claim.includes('【官報公告') ||
        claim.includes('地方裁判所公認') ||
        notes.includes('破産管財') ||
        urls.some(u => typeof u === 'string' && u.includes('kanpou'))
    ) {
        return {
            isOfficial: true,
            sourceName: '国立印刷局「官報」公告 / 管轄地方裁判所',
            sourceCategory: '裁判所公認 破産・民事再生手続開始決定',
            sourceUrl: urls.find(u => typeof u === 'string' && u.includes('kanpou')) || 'https://kanpou.npb.go.jp/'
        };
    }

    // 5. 公正取引委員会（下請法・独占禁止法）
    if (
        claim.includes('【公正取引委員会') ||
        notes.includes('公正取引委員会') ||
        urls.some(u => typeof u === 'string' && u.includes('jftc.go.jp'))
    ) {
        return {
            isOfficial: true,
            sourceName: '公正取引委員会',
            sourceCategory: '下請法・独占禁止法違反 勧告処分',
            sourceUrl: urls.find(u => typeof u === 'string' && u.includes('jftc.go.jp')) || 'https://www.jftc.go.jp/'
        };
    }

    // 6. 経済産業省（gBizINFO・公的法人情報）
    if (
        claim.includes('【経済産業省') ||
        claim.includes('gBizINFO') ||
        notes.includes('gBizINFO')
    ) {
        return {
            isOfficial: true,
            sourceName: '経済産業省（gBizINFO公的法人データベース）',
            sourceCategory: '公的法人プロファイル・届出公表情報',
            sourceUrl: 'https://info.gbiz.go.jp/'
        };
    }

    // 7. その他の行政・公的機関
    if (claim.startsWith('【') && claim.includes('】')) {
        const match = claim.match(/【(.*?)】/);
        const tag = match ? match[1] : '公的機関';
        return {
            isOfficial: true,
            sourceName: `${tag}（公的公表データベース）`,
            sourceCategory: '行政処分・確定公表記録'
        };
    }

    if (urls.some(u => typeof u === 'string' && u.includes('.go.jp'))) {
        return {
            isOfficial: true,
            sourceName: '政府・関係省庁公的データ',
            sourceCategory: '公的行政処分公表'
        };
    }

    // 民間加盟企業の被害申告
    return {
        isOfficial: false,
        sourceName: item?.companies?.name || '加盟企業（信用共有ネットワーク参加企業）',
        sourceCategory: '民間取引先 債権未払い被害申告'
    };
}

/**
 * 公表元機関の表示用短縮名称を取得（安全ガード付き）
 */
export function getCleanOfficialSourceName(
    sourceInfo?: OfficialSourceInfo | null,
    fallback: string = '公的機関'
): string {
    if (!sourceInfo || !sourceInfo.sourceName || typeof sourceInfo.sourceName !== 'string') {
        return fallback;
    }
    const name = sourceInfo.sourceName.trim();
    if (name.includes('（')) {
        return name.split('（')[0] || fallback;
    }
    if (name.includes('(')) {
        return name.split('(')[0] || fallback;
    }
    return name || fallback;
}

/**
 * 登録元または公表元の安全な表示文字列を取得
 */
export function getSourceDisplayName(
    sourceInfo?: OfficialSourceInfo | null,
    companyName?: string | null,
    defaultFallback: string = '加盟企業'
): string {
    if (sourceInfo?.isOfficial) {
        return getCleanOfficialSourceName(sourceInfo, '公的機関');
    }
    return companyName?.trim() || defaultFallback;
}

/**
 * 企業名（商号・屋号）から法人格（株式会社・有限会社・合同会社・各種法人・組合等）を有する法人かどうかを判定する
 */
export function isCorporateEntityName(companyName?: string | null): boolean {
    if (!companyName || typeof companyName !== 'string') return false;
    const name = companyName.trim();
    if (!name) return false;

    // 明示的に個人事業主・一人親方と記載されている場合は個人事業主扱い
    if (name.includes('個人事業主') || name.includes('一人親方')) {
        return false;
    }

    const corporateKeywords = [
        '株式会社', '（株）', '(株)', '（株)', '(株）', '㈱',
        '有限会社', '（有）', '(有)', '（有)', '(有）', '㈲',
        '合同会社', '（同）', '(同)', '（同)', '(同）',
        '合資会社', '（資）', '(資)', '（資)', '(資）',
        '合名会社', '（名）', '(名)', '（名)', '(名）',
        '（合）', '(合)', '（合)', '(合）',
        '相互会社',
        '協同組合', '協業組合', '企業組合', '森林組合', '農業協同組合', '漁業協同組合', '生活協同組合',
        '医療法人', '（医）', '(医)', '（医)', '(医）',
        '社会福祉法人', '（福）', '(福)', '（福)', '(福）',
        '一般社団法人', '（一社）', '(一社)',
        '公益社団法人', '（公社）', '(公社)',
        '一般財団法人', '（一財）', '(一財)',
        '公益財団法人', '（公財）', '(公財)',
        '宗教法人', '（宗）', '(宗)',
        '学校法人', '（学）', '(学)',
        '特定非営利活動法人', 'NPO法人', 'ＮＰＯ法人',
        '独立行政法人', '地方独立行政法人',
        '弁護士法人', '税理士法人', '司法書士法人', '行政書士法人', '監査法人', '社会保険労務士法人',
        '労働組合', '管理組合法人', '信用金庫', '信用組合',
        '環境局', '水道局', '交通局', '市役所', '区役所', '県庁', '都庁', '府庁', '道庁', '公社'
    ];

    return corporateKeywords.some(kw => name.includes(kw));
}

/**
 * 企業名・検索クエリの揺れ（株式会社 ⇔ （株）、有限会社 ⇔ （有）、全角英数 ⇔ 半角英数、スペース等）を正規化した比較用文字列を返す
 */
export function normalizeCompanySearchText(text?: string | null): string {
    if (!text || typeof text !== 'string') return '';
    return text
        .trim()
        .replace(/[（\(]株[）\)]|㈱/g, '株式会社')
        .replace(/[（\(]有[）\)]|㈲/g, '有限会社')
        .replace(/[（\(]同[）\)]/g, '合同会社')
        .replace(/[（\(]資[）\)]/g, '合資会社')
        .replace(/[（\(]名[）\)]/g, '合名会社')
        .replace(/[（\(]医[）\)]/g, '医療法人')
        .replace(/[（\(]一社[）\)]/g, '一般社団法人')
        .replace(/[（\(]公社[）\)]/g, '公益社団法人')
        .replace(/[（\(]一財[）\)]/g, '一般財団法人')
        .replace(/[（\(]公財[）\)]/g, '公益財団法人')
        .replace(/[（\(]福[）\)]/g, '社会福祉法人')
        .replace(/[（\(]宗[）\)]/g, '宗教法人')
        .replace(/[（\(]学[）\)]/g, '学校法人')
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
        .replace(/[\s　・･]/g, '')
        .replace(/[-－ー―−]/g, '-')
        .toLowerCase();
}

/**
 * 検索クエリから DB 検索（ilike）用のバリエーション配列を生成する
 * 例: 「株式会社さつま地鶏屋」 -> ["株式会社さつま地鶏屋", "（株）さつま地鶏屋", "さつま地鶏屋（株）", "さつま地鶏屋"]
 */
export function buildCompanyQueryVariants(rawQuery?: string | null): string[] {
    if (!rawQuery || typeof rawQuery !== 'string') return [];
    const q = rawQuery.trim();
    if (!q) return [];

    const variants = new Set<string>([q]);

    // 法人格を除いたコア名称を抽出
    const core = q
        .replace(/株式会社|[（\(]株[）\)]|㈱/g, '')
        .replace(/有限会社|[（\(]有[）\)]|㈲/g, '')
        .replace(/合同会社|[（\(]同[）\)]/g, '')
        .replace(/合資会社|[（\(]資[）\)]/g, '')
        .replace(/合名会社|[（\(]名[）\)]/g, '')
        .replace(/医療法人(?:社団|財団)?|[（\(]医[）\)]/g, '')
        .trim();

    if (core && core.length >= 2 && core !== q) {
        variants.add(core);
    }

    if (q.includes('株式会社')) {
        variants.add(q.replace(/株式会社/g, '（株）'));
    } else if (/[（\(]株[）\)]|㈱/.test(q)) {
        variants.add(q.replace(/[（\(]株[）\)]|㈱/g, '株式会社'));
    }

    if (q.includes('有限会社')) {
        variants.add(q.replace(/有限会社/g, '（有）'));
    } else if (/[（\(]有[）\)]|㈲/.test(q)) {
        variants.add(q.replace(/[（\(]有[）\)]|㈲/g, '有限会社'));
    }

    return Array.from(variants);
}

/**
 * 47都道府県リスト（プルダウン表示順：東京都・神奈川県・埼玉県・千葉県を先頭に配置し、以降は北から順）
 */
export const PREFECTURE_OPTIONS = [
    '東京都', '神奈川県', '埼玉県', '千葉県',
    '茨城県', '栃木県', '群馬県',
    '北海道',
    '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
    '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
    '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県',
    '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
] as const;

/**
 * 所在地文字列から都道府県名を判定する（政令市・主要都市名のみの場合も補完）
 */
export function extractPrefectureFromLocation(location?: string | null): string | null {
    if (!location || typeof location !== 'string') return null;
    const loc = location.trim();
    if (!loc) return null;

    for (const pref of PREFECTURE_OPTIONS) {
        if (loc.includes(pref)) return pref;
    }

    // 都道府県名が省略され市区町村名から始まっている公的データの補完
    if (loc.startsWith('横浜') || loc.startsWith('川崎') || loc.startsWith('相模原') || loc.startsWith('横須賀') || loc.startsWith('藤沢') || loc.startsWith('厚木')) return '神奈川県';
    if (loc.startsWith('さいたま') || loc.startsWith('川口') || loc.startsWith('川越') || loc.startsWith('越谷') || loc.startsWith('所沢')) return '埼玉県';
    if (loc.startsWith('船橋') || loc.startsWith('松戸') || loc.startsWith('市川') || loc.startsWith('柏市') || loc.startsWith('木更津')) return '千葉県';
    if (loc.startsWith('名古屋')) return '愛知県';
    if (loc.startsWith('神戸') || loc.startsWith('姫路') || loc.startsWith('西宮') || loc.startsWith('尼崎')) return '兵庫県';
    if (loc.startsWith('北九州') || loc.startsWith('久留米')) return '福岡県';
    if (loc.startsWith('札幌') || loc.startsWith('旭川') || loc.startsWith('函館')) return '北海道';
    if (loc.startsWith('仙台')) return '宮城県';

    return null;
}

/**
 * 初期表示ソート用のエリア優先度ランクを取得（小さいほど上位に表示）
 * 0: 東京都, 1: 神奈川県, 2: 埼玉県, 3: 千葉県, 4: 北関東(茨城・栃木・群馬), 5: その他全国
 */
export function getLocationPriorityRank(location?: string | null): number {
    const pref = extractPrefectureFromLocation(location);
    if (pref === '東京都') return 0;
    if (pref === '神奈川県') return 1;
    if (pref === '埼玉県') return 2;
    if (pref === '千葉県') return 3;
    if (pref === '茨城県' || pref === '栃木県' || pref === '群馬県') return 4;
    return 5;
}



