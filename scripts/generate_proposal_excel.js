const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function createProposalWorkbook() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MIERIS Project Team';
    workbook.lastModifiedBy = 'MIERIS Project Team';
    workbook.created = new Date();
    workbook.modified = new Date();

    const fontBase = { name: 'Meiryo UI', size: 10 };
    const fontTitle = { name: 'Meiryo UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    const fontSection = { name: 'Meiryo UI', size: 12, bold: true, color: { argb: 'FF1E293B' } };
    const fontHeader = { name: 'Meiryo UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    const fontBold = { name: 'Meiryo UI', size: 10, bold: true };

    const borderThin = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };

    const fillDarkNavy = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    const fillNavy = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    const fillBlue = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    const fillLightBlue = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    const fillSlateHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    const fillLightGray = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    const fillEmerald = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
    const fillAmber = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };

    // ==========================================
    // シート 1: エグゼクティブサマリー (課題と改善案)
    // ==========================================
    const ws1 = workbook.addWorksheet('1. 概要・提案サマリー', {
        views: [{ showGridLines: true }]
    });

    ws1.columns = [
        { width: 5 },   // A: 余白
        { width: 22 },  // B
        { width: 28 },  // C
        { width: 32 },  // D
        { width: 32 },  // E
        { width: 18 },  // F
        { width: 16 }   // G
    ];

    // タイトルバナー
    ws1.mergeCells('B2:G3');
    const titleCell = ws1.getCell('B2');
    titleCell.value = '【提案書】MIERIS 企業信用照会画面の付加価値向上・リッチ化施策';
    titleCell.font = fontTitle;
    titleCell.fill = fillNavy;
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // サブタイトル
    ws1.mergeCells('B4:G4');
    const subCell = ws1.getCell('B4');
    subCell.value = '～ コンプライアンス（目的外閲覧防止）を完全遵守しつつ、受動的ツールから「取引先見守りインフラ」へ進化 ～';
    subCell.font = { name: 'Meiryo UI', size: 10, italic: true, color: { argb: 'FF64748B' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'left' };

    // セクション1: 背景と課題
    ws1.mergeCells('B6:G6');
    ws1.getCell('B6').value = '1. 背景と現在の課題感（なぜ改善が必要か）';
    ws1.getCell('B6').font = fontSection;

    const issues = [
        ['課題分類', '現状の事象', 'ユーザー心理・ビジネスリスク', '根本原因と対応方針'],
        [
            '画面の過疎感\n（寂しさ）',
            '一般ユーザーがログインすると、統計が「0件 / 0社」と表示され、検索窓しか並んでいない。',
            '「本当にこのシステムは稼働しているのか？」「契約した意味があるのか？」とユーザーが価値を実感しづらい。',
            '他社ブラックリストの垂れ流しを防ぐため一覧を非表示にした結果、画面が空っぽに見えてしまっている。'
        ],
        [
            '利用頻度の低下\n（受動的ツール化）',
            '「新規取引先が出た時」しかアクセスせず、日常的にログインして開く動機がない。',
            '利用習慣がつかず、月額SaaSとしての解約（チャーン）リスクが高まる。',
            '「検索ツール（受動的）」にとどまっており、日々の取引先管理（能動的）に使われていない。'
        ],
        [
            '法規制とUXの\n両立の難しさ',
            '他社の未払い企業一覧を不特定多数に垂れ流すことは個人情報・信用情報保護法上NG。',
            '単にリストを復活させることは弁護士レビューでも認められない。',
            '「ブラックリストを垂れ流さない」ルールを厳守しながら、自社にとって有益な情報を充実させる必要がある。'
        ]
    ];

    let rIdx = 7;
    issues.forEach((row, i) => {
        row.forEach((val, j) => {
            const cell = ws1.getCell(rIdx, j + 2);
            cell.value = val;
            cell.border = borderThin;
            cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : 'left', wrapText: true };
            if (i === 0) {
                cell.font = fontHeader;
                cell.fill = fillSlateHeader;
            } else {
                cell.font = fontBase;
                if (j === 0) {
                    cell.font = fontBold;
                    cell.fill = fillLightBlue;
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                }
            }
        });
        ws1.getRow(rIdx).height = i === 0 ? 24 : 45;
        rIdx++;
    });

    // セクション2: 3つの解決アプローチ比較
    rIdx += 2;
    ws1.mergeCells(`B${rIdx}:G${rIdx}`);
    ws1.getCell(`B${rIdx}`).value = '2. 解決に向けた3つの提案施策（マトリクス比較）';
    ws1.getCell(`B${rIdx}`).font = fontSection;
    rIdx++;

    const matrix = [
        ['施策名', '概要', '活用するデータ / API', 'もたらす効果・ユーザー体験', 'コンプライアンス（法適合性）', '実装期間（目安）'],
        [
            '施策①\n全国マクロ統計\nカウンター',
            '個別の社名は一切伏せた状態で、システム全体の蓄積件数・月間審査数・業種別比率をダッシュボード上部に表示。',
            'MIERIS内部DBの匿名集計データ\n（COUNTクエリ / 定期集計）',
            '「0件」の過疎感が消え、全国の企業が相互に守り合う巨大な信用ネットワークであることを実感できる。',
            '◎ 完全適合\n（個別企業名は一切出さず統計数値のみのため法的に100%安全）',
            '小\n（即日～1営業日）'
        ],
        [
            '施策②\n自社の審査履歴\n（与信カルテ）',
            '過去に自社が照会した企業を「最近チェックした企業」としてカード形式で直近順に常時表示。',
            'アクセスログ（audit_logs）\n＋ 国税庁法人番号APIキャッシュ',
            '「先週調べたあの会社」「今月商談した先」が手元に残り、ワンクリックで再確認や社内共有ができる。',
            '◎ 完全適合\n（自社が照会したログを自社が見るだけなのでプライバシー問題ゼロ）',
            '中\n（1～2営業日）'
        ],
        [
            '施策③\n取引先モニタリング\nウォッチリスト\n【★最推奨】',
            '未払い事故のない普段の重要取引先を登録しておき、24時間見守る。他社から未払い登録があった瞬間に即時アラート通知。',
            '・国税庁 法人番号Web-API\n・経産省 gBizINFO API\n・MIERIS 審査承認イベント\n・メール / LINE通知機能',
            '「事故が起きてから検索するツール」から「取引先を常時見守る防衛インフラ」へ大進化。画面に取引先カルテがズラリと並び安心感絶大。',
            '◎ 完全適合\n（自社が指定した取引先のみを監視するため、目的外の一覧垂れ流しに該当しない）',
            '大\n（土台実装済みのため2～3営業日）'
        ]
    ];

    matrix.forEach((row, i) => {
        row.forEach((val, j) => {
            const cell = ws1.getCell(rIdx, j + 2);
            cell.value = val;
            cell.border = borderThin;
            cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : (j === 4 || j === 5 ? 'center' : 'left'), wrapText: true };
            if (i === 0) {
                cell.font = fontHeader;
                cell.fill = fillSlateHeader;
            } else {
                cell.font = fontBase;
                if (j === 0) {
                    cell.font = fontBold;
                    cell.fill = i === 3 ? fillEmerald : fillLightBlue;
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                }
                if (j === 4) {
                    cell.font = { name: 'Meiryo UI', size: 9, bold: true, color: { argb: 'FF047857' } };
                }
            }
        });
        ws1.getRow(rIdx).height = i === 0 ? 24 : 75;
        rIdx++;
    });


    // ==========================================
    // シート 2: 各施策の詳細仕様（何を使ってどうなるか）
    // ==========================================
    const ws2 = workbook.addWorksheet('2. 施策詳細（何を使ってどうなるか）', {
        views: [{ showGridLines: true }]
    });

    ws2.columns = [
        { width: 5 },   // A
        { width: 20 },  // B: 項目
        { width: 35 },  // C: 何を使って (データ/技術)
        { width: 45 },  // D: どうなるか (画面/体験)
        { width: 30 }   // E: 依頼主・営業上のメリット
    ];

    ws2.mergeCells('B2:E3');
    const t2 = ws2.getCell('B2');
    t2.value = '各施策の機能詳細仕様：何を使って・どう実現し・どう機能するか';
    t2.font = fontTitle;
    t2.fill = fillBlue;
    t2.alignment = { vertical: 'middle', horizontal: 'center' };

    // --- 施策① 詳細 ---
    let r2 = 5;
    ws2.mergeCells(`B${r2}:E${r2}`);
    ws2.getCell(`B${r2}`).value = '【施策①】全国マクロ統計カウンター（匿名データによる活況感の演出）';
    ws2.getCell(`B${r2}`).font = fontSection;
    r2++;

    const spec1 = [
        ['項目', '何を使って（入力・データソース）', 'どうなるか（画面表示・システム動作）', '営業・ビジネス上のメリット'],
        [
            '全体蓄積数カウンター',
            'MIERIS内部の案件テーブル（credit_cases）から承認済み件数をSQLで集計（COUNT）',
            '上部に「全国蓄積データ数：12,480件」「当月新規審査：342件」などの全体数字をリアルタイム表示。',
            '「0件」の過疎感が一掃され、多数の企業が参加している信頼感が生まれる。'
        ],
        [
            '業種別・地域別トレンド',
            '登録データの業種コード（日本標準産業分類）および都道府県コードを集計',
            '「直近の支払遅延傾向：建設業 34% / IT・Web 22% / 飲食・小売 18%」といった比率バーを表示。',
            '個別企業を特定させず、業界ごとの警戒トレンドとして実用的なインテリジェンスを提供できる。'
        ],
        [
            '法的な安全性',
            '統計集計（マスキング・アグリゲーション）処理',
            '特定の会社名や被害者・加害者情報は1文字も画面に出ないため、個人情報・名誉毀損リスクが皆無。',
            '弁護士レビューでも「統計情報の公開は何ら問題ない」とスムーズにクリア可能。'
        ]
    ];

    spec1.forEach((row, i) => {
        row.forEach((val, j) => {
            const cell = ws2.getCell(r2, j + 2);
            cell.value = val;
            cell.border = borderThin;
            cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : 'left', wrapText: true };
            if (i === 0) {
                cell.font = fontHeader;
                cell.fill = fillNavy;
            } else {
                cell.font = fontBase;
                if (j === 0) { cell.font = fontBold; cell.fill = fillLightGray; }
            }
        });
        ws2.getRow(r2).height = i === 0 ? 22 : 45;
        r2++;
    });

    // --- 施策② 詳細 ---
    r2 += 2;
    ws2.mergeCells(`B${r2}:E${r2}`);
    ws2.getCell(`B${r2}`).value = '【施策②】自社照会履歴（与信カルテ・審査ログ機能）';
    ws2.getCell(`B${r2}`).font = fontSection;
    r2++;

    const spec2 = [
        ['項目', '何を使って（入力・データソース）', 'どうなるか（画面表示・システム動作）', '営業・ビジネス上のメリット'],
        [
            '直近照会履歴カード',
            '自社のアクセスログ（audit_logsテーブル）から、直近に検索した法人番号・商号・日時を抽出',
            '検索窓の直下に「最近照会した企業」が直近順にカードで並ぶ（例: 先週調べた3社）。ワンクリックで再照会が可能。',
            '自社専用の審査ノートとして機能し、毎回法人番号を打ち直す手間が省ける。'
        ],
        [
            '社内メモ・ステータス記録',
            '自社ローカル管理のメモデータ（company_audit_notes）',
            '照会した企業に対して「2026/10 A部長承認済」「支払サイト前払い合意」などの社内メモを残せる。',
            '「調べるだけ」のツールから、「自社の与信判断を記録・共有する業務管理ツール」へ格上げされる。'
        ],
        [
            '安全・解決バッジ表示',
            '照会結果の突合キャッシュ',
            '履歴カード上に「🟢 該当なし（安全）」と緑色バッジが表示され、安心感が一覧で視覚化される。',
            '画面全体が「グリーン（安全）」で埋まり、ポジティブで清潔感のあるUIになる。'
        ]
    ];

    spec2.forEach((row, i) => {
        row.forEach((val, j) => {
            const cell = ws2.getCell(r2, j + 2);
            cell.value = val;
            cell.border = borderThin;
            cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : 'left', wrapText: true };
            if (i === 0) {
                cell.font = fontHeader;
                cell.fill = fillNavy;
            } else {
                cell.font = fontBase;
                if (j === 0) { cell.font = fontBold; cell.fill = fillLightGray; }
            }
        });
        ws2.getRow(r2).height = i === 0 ? 22 : 45;
        r2++;
    });

    // --- 施策③ 詳細 ---
    r2 += 2;
    ws2.mergeCells(`B${r2}:E${r2}`);
    ws2.getCell(`B${r2}`).value = '【施策③】取引先モニタリング・ウォッチリスト（リアルタイム見守りボード）★本命';
    ws2.getCell(`B${r2}`).font = fontSection;
    r2++;

    const spec3 = [
        ['項目', '何を使って（入力・データソース）', 'どうなるか（画面表示・システム動作）', '営業・ビジネス上のメリット'],
        [
            '公的登記・企業プロファイル',
            '国税庁 法人番号公表サイト Web-API\n（13桁の法人番号で即時照会）',
            '未払いがない正常企業でも、正式商号・所在地・登記状況（存続/閉鎖/清算中）を自動取得して企業カルテを生成。',
            '倒産や夜逃げ（登記閉鎖・清算）の兆候を公的データから早期検知できる。'
        ],
        [
            '財務・行政処分情報',
            '経済産業省 gBizINFO API\n（政府のオープンデータ基盤）',
            '資本金、設立年、売上、従業員数、官公庁の入札資格、補助金採択歴、行政処分歴などの公的属性を表示。',
            '帝国データバンクや東京商工リサーチに近い本格的な「企業調査シート」が画面上で完成する。'
        ],
        [
            '他社未払い登録の自動検知\n（★キラー機能）',
            'MIERIS DBトリガー ＋ ウォッチリスト照合バッチ',
            '全国のMIERIS加盟企業がその企業に対して未払い登録を申請＆承認された瞬間、ステータスが「🟢 正常」から「🚨 未払い発生」へ反転。',
            '「他社で焦げ付きが発生した」事実を、自社が被害に遭う前に察知できる最強の早期警戒システム。'
        ],
        [
            'マルチチャネル即時通知',
            'メール配信エンジン ＋ LINE Notify / Webhook 連携',
            '異変が発生した瞬間に、経理・法務担当者のメールやスマホLINEへ「【重要】取引先の未払いアラート」を自動通知。',
            '画面を開いていなくても24時間体制で見張ってくれる安心感があり、解約されない強い理由になる。'
        ]
    ];

    spec3.forEach((row, i) => {
        row.forEach((val, j) => {
            const cell = ws2.getCell(r2, j + 2);
            cell.value = val;
            cell.border = borderThin;
            cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : 'left', wrapText: true };
            if (i === 0) {
                cell.font = fontHeader;
                cell.fill = fillNavy;
            } else {
                cell.font = fontBase;
                if (j === 0) { cell.font = fontBold; cell.fill = fillEmerald; }
            }
        });
        ws2.getRow(r2).height = i === 0 ? 22 : 55;
        r2++;
    });


    // ==========================================
    // シート 3: 画面レイアウト案 & 弁護士確認論点
    // ==========================================
    const ws3 = workbook.addWorksheet('3. 画面UI構成案と法的確認点', {
        views: [{ showGridLines: true }]
    });

    ws3.columns = [
        { width: 5 },   // A
        { width: 28 },  // B
        { width: 35 },  // C
        { width: 35 },  // D
        { width: 25 }   // E
    ];

    ws3.mergeCells('B2:E3');
    const t3 = ws3.getCell('B2');
    t3.value = '新・企業信用照会画面（/credit）の統合レイアウト案 & 弁護士確認ポイント';
    t3.font = fontTitle;
    t3.fill = fillDarkNavy;
    t3.alignment = { vertical: 'middle', horizontal: 'center' };

    let r3 = 5;
    ws3.mergeCells(`B${r3}:E${r3}`);
    ws3.getCell(`B${r3}`).value = '1. 新画面レイアウト構成（縦スクロールの流れ）';
    ws3.getCell(`B${r3}`).font = fontSection;
    r3++;

    const layout = [
        ['画面ゾーン', 'コンポーネント内容', '表示される情報・機能', '狙いと効果'],
        [
            '最上部\n【ヘッダー・統計帯】',
            '全国マクロ統計カウンター\n（施策①）',
            '・MIERIS全国データベース蓄積件数：◯◯件\n・当月審査完了数：◯◯件\n・業種別未払い発生マップ（匿名比率）',
            '「0件」の寂しさを無くし、全国規模の信用データベースとしての力強さと権威性を表現。'
        ],
        [
            '上部メイン\n【即時照会窓口】',
            '法人番号 検索・照会フォーム\n（現行の検索機能）',
            '・法人番号（13桁）入力欄\n・商号・所在地あいまい検索補助\n・国税庁リアルタイム商号補完機能',
            '新規取引先や商談相手をすぐにチェックできるコア機能を最も目立つ中央上部に配置。'
        ],
        [
            '中央メイン\n【見守りボード】',
            '自社取引先ウォッチリスト\n（施策③・★最大の見せ場）',
            '・見守り登録中の取引先カード一覧（例: 5～20社）\n・国税庁/gBizINFO由来の公的登記・資本金・従業員数\n・信用ステータス（🟢 正常・異変なし / 🚨 警戒発生）\n・「＋ 取引先を見守り登録」ボタン',
            'ログインした瞬間に自社の大切な取引先が並び、「全社安全」の緑ランプで満たされる。SaaSのメイン画面として圧巻の安心感。'
        ],
        [
            '下部サブ\n【履歴・カルテ】',
            '自社照会履歴 & メモ\n（施策②）',
            '・直近検索した企業一覧（再照会ショートカット）\n・自社内メモ（商談日付、取引担当者など）',
            '過去に調べた結果がそのまま社内ナレッジとして蓄積され、業務の効率化を実現。'
        ]
    ];

    layout.forEach((row, i) => {
        row.forEach((val, j) => {
            const cell = ws3.getCell(r3, j + 2);
            cell.value = val;
            cell.border = borderThin;
            cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : 'left', wrapText: true };
            if (i === 0) {
                cell.font = fontHeader;
                cell.fill = fillSlateHeader;
            } else {
                cell.font = fontBase;
                if (j === 0) { cell.font = fontBold; cell.fill = fillLightBlue; cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; }
            }
        });
        ws3.getRow(r3).height = i === 0 ? 22 : 65;
        r3++;
    });

    // 弁護士確認用論点
    r3 += 2;
    ws3.mergeCells(`B${r3}:E${r3}`);
    ws3.getCell(`B${r3}`).value = '2. 月曜日の弁護士レビューに向けた論点整理（法的安全性）';
    ws3.getCell(`B${r3}`).font = fontSection;
    r3++;

    const legalPoints = [
        ['論点', 'リスク検討', '本提案での対策・法適合性の根拠', '弁護士への確認コメント例'],
        [
            '① 他社ブラックリストの\n一覧垂れ流し防止',
            '不特定多数への未払い企業リスト公表は、名誉毀損・信用毀損、または個人情報保護法上の目的外利用に問われる恐れがある。',
            '他社が登録したトラブル企業の一覧は一切閲覧できない仕様を徹底（API・UIともに遮断）。',
            '「第三者のトラブル一覧は一切リスト公開せず、検索時または合意取引先への限定通知のみとしています」'
        ],
        [
            '② 統計情報の公開',
            '統計情報が個別の企業を特定できるレベルに細分化されている場合、実質的なリスト公開になりかねない。',
            '都道府県×大分類業種などの大枠マクロ集計にとどめ、個別特定が不可能な統計データのみを表示。',
            '「統計数値・業種比率の表示は個人情報・信用情報に該当せず、公開情報として問題ないか確認」'
        ],
        [
            '③ 取引先見守り\n（ウォッチリスト）の適法性',
            '取引先を登録して異変を検知する行為が、法的に問題ないか。',
            '「自社が正当な取引関係を有する相手方」に対して、自社の売掛金保全のために限定して信用異変の通知を受けるものであり、正当な業務行為（与信管理）に該当する。',
            '「自社が登録した取引先に対して、他社からの支払遅延情報が登録された際にアラートを送る仕組みは、正当な与信管理目的として問題ないか」'
        ]
    ];

    legalPoints.forEach((row, i) => {
        row.forEach((val, j) => {
            const cell = ws3.getCell(r3, j + 2);
            cell.value = val;
            cell.border = borderThin;
            cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : 'left', wrapText: true };
            if (i === 0) {
                cell.font = fontHeader;
                cell.fill = fillNavy;
            } else {
                cell.font = fontBase;
                if (j === 0) { cell.font = fontBold; cell.fill = fillAmber; cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; }
            }
        });
        ws3.getRow(r3).height = i === 0 ? 22 : 60;
        r3++;
    });

    // 保存処理
    const desktopPath = path.join('C:', 'Users', 'chino', 'Desktop', 'MIERIS_企業信用画面リッチ化_提案資料.xlsx');
    const localPath = path.join(process.cwd(), 'MIERIS_企業信用画面リッチ化_提案資料.xlsx');

    await workbook.xlsx.writeFile(localPath);
    console.log(`Saved to local: ${localPath}`);

    try {
        await workbook.xlsx.writeFile(desktopPath);
        console.log(`Saved to desktop: ${desktopPath}`);
    } catch (e) {
        console.warn('Desktop save failed, using local copy:', e.message);
    }
}

createProposalWorkbook().catch(console.error);
