"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Star,
  Award,
  Sparkles,
  Clock,
  Lock,
  Building,
  TrendingUp,
  Send,
  Check,
  FileSpreadsheet,
  HelpCircle,
  Phone,
  Mail,
  ArrowDown
} from "lucide-react";

export default function DemoLandingPage() {
  // デモ画面のタブ切り替え
  const [activeDemoTab, setActiveDemoTab] = useState<"person" | "credit" | "register">("person");
  // デモ検索入力
  const [personSearchQuery, setPersonSearchQuery] = useState("");
  const [creditSearchQuery, setCreditSearchQuery] = useState("");

  // FAQアコーディオン開閉
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // 料金シミュレーション
  const [selectedPlanType, setSelectedPlanType] = useState<"full" | "employment" | "credit">("full");
  const [locationCount, setLocationCount] = useState<number>(1);

  // お問い合わせフォーム送信状態
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    name: "",
    email: "",
    phone: "",
    inquiryType: "資料請求（全12P提案書）",
    message: ""
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  // サンプルデモデータ
  const mockPersons = [
    {
      name: "山田 太郎",
      kana: "ヤマダ タロウ",
      birth: "1988/04/12",
      badge: "当日欠勤（複数回）",
      badgeColor: "bg-red-50 text-red-700 border-red-200",
      reason: "就業当日の朝に連絡なく欠勤。その後連絡不通となり貸与品未返却。",
      evidence: "同意書取得済・通話履歴あり",
      date: "2026/08/15"
    },
    {
      name: "佐藤 健一",
      kana: "サトウ ケンイチ",
      birth: "1992/11/03",
      badge: "直前キャンセル・トラブル",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      reason: "配属直前の深夜に虚偽の理由で辞退。他社現場への二重手配が判明。",
      evidence: "本人同意書・メール履歴",
      date: "2026/09/02"
    },
    {
      name: "鈴木 一郎",
      kana: "スズキ イチロウ",
      birth: "1995/07/20",
      badge: "良好（勤務実績あり）",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      reason: "荷揚げ現場にて3ヶ月間皆勤。トラブル報告なし。",
      evidence: "本人同意書・出勤台帳",
      date: "2026/09/20"
    }
  ];

  const mockCredits = [
    {
      company: "株式会社東洋ビルド",
      corpNum: "1010001099887",
      pref: "東京都新宿区",
      amount: "¥850,000",
      status: "未払い",
      statusColor: "bg-red-50 text-red-700 border-red-200",
      reason: "工事完了後の請求書受領後、期日を経過しても支払いがなく元請からの入金遅延を理由に支払い留保。",
      evidence: "契約書・請求書・督促記録あり",
      dueDate: "2026/07/31"
    },
    {
      company: "城西建設工務株式会社",
      corpNum: "4010401022334",
      pref: "神奈川県横浜市",
      amount: "¥420,000",
      status: "解決済み（遅延18日）",
      statusColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      reason: "資材検収の確認に時間を要したため遅延。その後全額入金確認済。",
      evidence: "銀行振込明細・合意書",
      dueDate: "2026/08/25"
    },
    {
      company: "大和ロジテック株式会社",
      corpNum: "7020001055667",
      pref: "埼玉県さいたま市",
      amount: "¥1,200,000",
      status: "未払い",
      statusColor: "bg-red-50 text-red-700 border-red-200",
      reason: "運送傭車代金の期日超過。複数回督促を行うも分割払いの交渉中。",
      evidence: "運送引受書・請求明細",
      dueDate: "2026/08/31"
    }
  ];

  // 料金計算
  const calculateTotal = () => {
    let monthlyBase = 0;
    if (selectedPlanType === "full") monthlyBase = 30000;
    else if (selectedPlanType === "employment") monthlyBase = 18000;
    else monthlyBase = 15000;

    const initial = 10000 * locationCount;
    const monthly = monthlyBase * locationCount;
    return { initial, monthly };
  };

  const pricing = calculateTotal();

  const faqs = [
    {
      q: "本人や取引先に無断で情報が共有されることはありますか？",
      a: "一切ございません。ミエリスは個人情報保護法および関係法令を完全に遵守しており、求職者・取引先との面接時または取引開始時に所定の「同意書（書面）」を取得することが登録の必須要件となっております。同意書が添付されていない情報は登録できません。"
    },
    {
      q: "事実と違う内容や誹謗中傷が登録される心配はありませんか？",
      a: "「晒し」を防ぐため、6つの厳格な運用ルールを設けています。感情的な評価（「危ない」「悪質」など）や伝聞・推測の記載は禁止されており、客観的な日時・金額・相手方の言い分のみを記載します。また、全件が運営管理者の審査を経てから公開されます。"
    },
    {
      q: "利用企業が法的リスク（名誉毀損・訴訟など）を負うことはありますか？",
      a: "弁護士の法務監修のもと、本人同意書・利用規約・申込書の3つの書面で適法性を担保しています。万が一ご本人や登録対象からのお問い合わせや開示請求があった場合も、運営事務局が直接窓口となって対応いたしますのでご安心ください。"
    },
    {
      q: "未払いだった取引先から入金があった場合、情報は消えますか？",
      a: "入金が確認された場合は、5営業日以内にステータスが「解決済み（遅延〇日）」に更新されます。安易な削除ではなく『遅延したが最終的に支払われた事実』を客観的に残すことで、双方の公平性を保ちます。また登録から5年経過で自動削除されます。"
    },
    {
      q: "支店や営業所ごとに個別アカウントは必要ですか？",
      a: "はい、1事業所（支店・営業所）ごとに1アカウントのご契約となります。支店ごとの追加も可能で、同一企業グループ内での情報共有や現場ごとのスムーズな照会に対応しています。"
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* 1. 専用LPヘッダー */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link href="/demo" className="flex items-center gap-3 group">
            <img src="/logo-mark.png" alt="MIERIS" className="w-9 h-9 object-contain" />
            <div className="flex flex-col">
              <span className="font-black text-xl text-slate-900 tracking-wider leading-none">
                MIERIS
              </span>
              <span className="text-[10px] text-slate-500 tracking-widest font-bold mt-0.5">
                ミエリス
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="#problem" className="hover:text-blue-600 transition-colors">課題解決</a>
            <a href="#strength" className="hover:text-blue-600 transition-colors">選ばれる理由</a>
            <a href="#demo" className="hover:text-blue-600 transition-colors">画面デモ</a>
            <a href="#case" className="hover:text-blue-600 transition-colors">導入事例</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">料金プラン</a>
            <a href="#faq" className="hover:text-blue-600 transition-colors">よくある質問</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="hidden lg:inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              管理者画面へ
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all whitespace-nowrap"
            >
              資料請求・デモ相談
            </a>
          </div>
        </div>
      </header>

      {/* 2. ヒーローセクション（カオナビ風FV） */}
      <section className="pt-32 pb-20 lg:pt-36 lg:pb-24 bg-gradient-to-b from-slate-50 via-white to-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* 左側コピー & CTA */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                <span>建設・荷揚げ・警備・運送業界特化の就業＆信用リスク管理システム</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.25] mb-6">
                履歴書と30分の面接では<br className="hidden sm:inline" />
                見抜けないリスクを、<br />
                <span className="text-blue-600 relative inline-block">
                  採る前に防ぐ！
                  <span className="absolute left-0 bottom-1 w-full h-3 bg-blue-100/60 -z-10 rounded-sm" />
                </span>
              </h1>

              <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8 max-w-2xl">
                日払い・週払い現場の<strong>「当日欠勤・直前バックレ」</strong>や、初めての取引先による<strong>「代金未払い・入金遅延」</strong>を、本人の明確な同意と客観的事実のもとで業界企業間に共有する、適法なリスク防御プラットフォームです。
              </p>

              {/* カオナビ風 ダブルCTAボタン */}
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <a
                  href="#contact"
                  className="group inline-flex flex-col items-center justify-center px-8 py-3.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all font-bold text-center"
                >
                  <span className="text-[11px] text-blue-200 font-medium">3分でわかるサービス概要</span>
                  <span className="text-base flex items-center gap-1.5">
                    詳しいPDF資料を見る
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </a>

                <a
                  href="#demo"
                  className="group inline-flex flex-col items-center justify-center px-8 py-3.5 rounded-xl bg-white text-slate-800 border-2 border-slate-300 hover:border-slate-800 transition-all font-bold text-center"
                >
                  <span className="text-[11px] text-slate-500 font-medium">操作感が1分でわかる</span>
                  <span className="text-base flex items-center gap-1.5">
                    無料デモ画面を体験
                    <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                  </span>
                </a>
              </div>

              {/* 信頼性チェックリスト */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>弁護士による法務監修済</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>本人同意書必須の適法運用</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>最短即日でアカウント発行</span>
                </div>
              </div>
            </div>

            {/* 右側：UIモックアッププレビュー */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                {/* 装飾の背景グロー */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20 blur-xl -z-10" />

                {/* PCウィンドウ風フレーム */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden">
                  {/* ブラウザ風バー */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-[11px] font-mono text-slate-400 ml-2">mieris.jp/search</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      LIVE DEMO
                    </span>
                  </div>

                  {/* プレビュー中身 */}
                  <div className="p-5 space-y-4">
                    {/* 検索バーモック */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-700">
                        <Search className="w-4 h-4 text-blue-600" />
                        <span className="font-bold">面接前の照会:</span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-slate-900">ヤマダ タロウ</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">照会完了 (1.2秒)</span>
                    </div>

                    {/* 照会結果カード（人物） */}
                    <div className="p-4 rounded-xl border border-red-200 bg-red-50/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">山田 太郎</span>
                          <span className="text-[10px] text-slate-500 font-mono">1988/04/12生</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                          当日欠勤あり
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        就業当日の朝に連絡なく欠勤。通話不通、貸与備品未返却。
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-red-100 pt-2">
                        <span>同意書: 取得済（原本保管）</span>
                        <span>登録日: 2026/08/15</span>
                      </div>
                    </div>

                    {/* 照会結果カード（企業クレジット） */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-slate-700" />
                          <span className="font-bold text-slate-900 text-sm">株式会社東洋ビルド</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                          未払い発生中
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500">未払い代金:</span>
                        <span className="font-bold text-red-600 font-mono">¥850,000</span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        登録理由: 工事完了後の請求書受領後、期日を経過しても支払いがなく元請からの入金遅延を主張。
                      </p>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. ホワイトペーパー（お役立ち資料）セクション - カオナビ完全同期 */}
      <section className="py-12 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
            DOWNLOAD WHITEPAPER / 導入検討に役立つ3つの資料
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <a
              href="#contact"
              className="group p-5 rounded-2xl border border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 transition-all flex items-start gap-4"
            >
              <div className="p-3 rounded-xl bg-blue-100 text-blue-700 group-hover:scale-105 transition-transform shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 mb-1.5 inline-block">
                  全12ページ 企画書
                </span>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  ミエリス サービス総合提案書・運用ルールブック
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  料金・機能・6つの運用ルールを網羅した公式PDF資料。
                </p>
              </div>
            </a>

            <a
              href="#contact"
              className="group p-5 rounded-2xl border border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 transition-all flex items-start gap-4"
            >
              <div className="p-3 rounded-xl bg-indigo-100 text-indigo-700 group-hover:scale-105 transition-transform shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 mb-1.5 inline-block">
                  弁護士監修ガイド
                </span>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  個人情報保護法と情報共有の適法性解説書
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  「訴訟リスクはないか？」に法務の専門家が答える解説書。
                </p>
              </div>
            </a>

            <a
              href="#contact"
              className="group p-5 rounded-2xl border border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/30 transition-all flex items-start gap-4"
            >
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-700 group-hover:scale-105 transition-transform shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 mb-1.5 inline-block">
                  業界別 成功事例
                </span>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  【建設・警備・運送】当日欠勤＆焦げ付きゼロ化 実例集
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  導入企業がどうやって初日バックレを根絶したかを解説。
                </p>
              </div>
            </a>

          </div>
        </div>
      </section>

      {/* 4. 実績・権威性 (No.1バッジ / 数字) - カオナビ完全同期 */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">PROVEN RESULTS</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              日払い・週払い現場の痛みに寄り添う、確かな実績
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs text-center relative overflow-hidden group hover:border-blue-300 transition-colors">
              <div className="text-xs font-bold text-slate-500 mb-2">参加企業満足度</div>
              <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight text-blue-600">
                98.4<span className="text-lg text-slate-700 font-bold ml-1">%</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">「面接前の安心感が全く違う」</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs text-center relative overflow-hidden group hover:border-blue-300 transition-colors">
              <div className="text-xs font-bold text-slate-500 mb-2">当日欠勤・バックレ抑止</div>
              <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight text-blue-600">
                92.8<span className="text-lg text-slate-700 font-bold ml-1">%</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">事前照会によるトラブル未然防止</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs text-center relative overflow-hidden group hover:border-blue-300 transition-colors">
              <div className="text-xs font-bold text-slate-500 mb-2">照会にかかる所要時間</div>
              <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight text-blue-600">
                1<span className="text-lg text-slate-700 font-bold ml-1">分以内</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">氏名・生年月日で即座に検索完了</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs text-center relative overflow-hidden group hover:border-blue-300 transition-colors">
              <div className="text-xs font-bold text-slate-500 mb-2">法務・個人情報適法性</div>
              <div className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight text-emerald-600">
                100<span className="text-lg text-slate-700 font-bold ml-1">%</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">弁護士監修・本人同意書必須制</p>
            </div>

          </div>

          {/* 参画業界タグ */}
          <div className="mt-10 pt-8 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs font-bold text-slate-500 mr-2">主要対応業界:</span>
            {["揚重・荷揚げ業", "雑工・土木工事", "交通誘導警備", "一般貨物自動車運送", "解体工事業", "建機・仮設リース", "内装仕上げ業"].map((tag, idx) => (
              <span key={idx} className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 課題解決セクション (Problem & Solution) - カオナビ完全同期 */}
      <section id="problem" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">THE PROBLEM & SOLUTION</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mt-2">
              ミエリスなら、こんな現場と経営のお悩みを即座に解決
            </h2>
            <p className="text-slate-600 text-sm mt-3">
              1社だけで抱え込んでも悪循環は変わりません。起きた「客観的事実」を持ち寄ることで解決します。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* 課題 1 */}
            <div className="bg-slate-50/80 rounded-2xl p-6 sm:p-8 border border-slate-200 flex flex-col justify-between hover:shadow-lg transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-black mb-4">
                  01
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug mb-3">
                  求人費をかけたのに、<br />
                  当日欠勤・バックレで現場に大穴が開く
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  面接では愛想が良くても、配属当日の朝に連絡が途絶える。職長に怒鳴られ、信用を失い、内勤社員が疲弊して退職してしまう悪循環。
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>ミエリスが解決！</span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 mb-1">
                  面接前に氏名・生年月日で瞬時に照会
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  過去に他社で発生した勤務実績や当日欠勤の客観的事実を事前に把握。リスクの高い採用を未然に防ぎます。
                </p>
              </div>
            </div>

            {/* 課題 2 */}
            <div className="bg-slate-50/80 rounded-2xl p-6 sm:p-8 border border-slate-200 flex flex-col justify-between hover:shadow-lg transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black mb-4">
                  02
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug mb-3">
                  初めての相手先から受注。<br />
                  工事完了後に代金未払い・回収難航
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  人工代も材料費も自社で先払いしたのに、期日を過ぎても「元請から入らない」と放置。高額な与信調査は手が出ず泣き寝入り。
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>ミエリスが解決！</span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 mb-1">
                  商号・法人番号で支払い遅延履歴を把握
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  取引開始前に過去の未払い発生や解決状況を確認。前受金条件への変更など、焦げ付きを確実に回避できます。
                </p>
              </div>
            </div>

            {/* 課題 3 */}
            <div className="bg-slate-50/80 rounded-2xl p-6 sm:p-8 border border-slate-200 flex flex-col justify-between hover:shadow-lg transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black mb-4">
                  03
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug mb-3">
                  個人情報保護法や「晒し」による<br />
                  法的なトラブル・訴訟が心配
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  勝手な共有やネット掲示板への書き込みは自社が訴えられるリスクがある。ルールが曖昧なブラックリストは使いたくない。
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>ミエリスが解決！</span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 mb-1">
                  弁護士監修の「6つの運用ルール」で完全防御
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  面接時の本人同意書が必須。運営が全件審査し、感情的評価を排除。登録後5年で自動削除されるため適法・安全です。
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. 選ばれる理由・システムの強み (Strengths) */}
      <section id="strength" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">WHY CHOOSE MIERIS</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mt-2">
              だから、選ばれる。ミエリス 3つの圧倒的強み
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-2xs hover:-translate-y-1 transition-transform">
              <div className="p-3 w-fit rounded-xl bg-blue-50 text-blue-600 mb-6">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                1. 誰でも迷わない直感画面<br />
                「採用に3つ足すだけ」
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                難しい研修や設定は不要。応募書類が届いたら「検索する」、該当があれば「確認する」、トラブル時は同意書を添えて「登録する」。内勤の手間を増やしません。
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-2xs hover:-translate-y-1 transition-transform">
              <div className="p-3 w-fit rounded-xl bg-indigo-50 text-indigo-600 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                2. 晒しにしない厳格基準<br />
                「客観事実のみ全件審査」
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                「危ない」「性格が悪い」といった主観的コメントは一切登録不可。金額・日時・相手方の言い分・裏付け資料を運営管理者がチェックして承認します。
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-2xs hover:-translate-y-1 transition-transform">
              <div className="p-3 w-fit rounded-xl bg-emerald-50 text-emerald-600 mb-6">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                3. 就業トラブル ＋ 未払い信用<br />
                「現場の2大リスクを一元管理」
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                求職者の就業トラブル防止と、取引先の代金未払いリスク対策。ひとつのIDで両方のデータベースにアクセスでき、会社の経営基盤を強固に守ります。
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 7. 体験デモプレビュー (Interactive Demo) */}
      <section id="demo" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">INTERACTIVE DEMO</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mt-2">
              実際の操作感をここで体験
            </h2>
            <p className="text-slate-600 text-sm mt-3">
              以下のタブを切り替えて、ミエリスの各照会画面のリアルな挙動をお試しいただけます。
            </p>
          </div>

          {/* デモタブ切り替え */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1.5 rounded-xl bg-slate-100 border border-slate-200 gap-1.5">
              <button
                onClick={() => setActiveDemoTab("person")}
                className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeDemoTab === "person"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-4 h-4 text-blue-600" />
                <span>① 人物トラブル照会</span>
              </button>

              <button
                onClick={() => setActiveDemoTab("credit")}
                className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeDemoTab === "credit"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>② 未払い企業照会</span>
              </button>

              <button
                onClick={() => setActiveDemoTab("register")}
                className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeDemoTab === "register"
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>③ 事実登録の流れ</span>
              </button>
            </div>
          </div>

          {/* デモウィンドウ本体 */}
          <div className="max-w-4xl mx-auto rounded-2xl border border-slate-200 shadow-lg bg-white overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <span className="text-xs font-mono text-slate-500 ml-2 font-bold">
                  {activeDemoTab === "person" && "app.mieris.jp/search (人物照会)"}
                  {activeDemoTab === "credit" && "app.mieris.jp/credit (未払い企業照会)"}
                  {activeDemoTab === "register" && "app.mieris.jp/cases/new (事実登録申請)"}
                </span>
              </div>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                お試しシミュレーター
              </span>
            </div>

            <div className="p-6 sm:p-8">
              {/* タブ 1: 人物トラブル照会 */}
              {activeDemoTab === "person" && (
                <div>
                  <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      氏名またはカナ・生年月日で照会（デモ入力できます）
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={personSearchQuery}
                          onChange={(e) => setPersonSearchQuery(e.target.value)}
                          placeholder="例: 山田、サトウ、鈴木（全件表示は空欄）"
                          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500 bg-white"
                        />
                      </div>
                      <button
                        onClick={() => {}}
                        className="px-6 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors whitespace-nowrap"
                      >
                        照会実行
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                      <span>照会ヒット結果（サンプルデータ）</span>
                      <span>全 3 件中 表示</span>
                    </div>

                    {mockPersons
                      .filter((p) => p.name.includes(personSearchQuery) || p.kana.includes(personSearchQuery))
                      .map((p, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors bg-white">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900">{p.name}</span>
                              <span className="text-xs text-slate-500 font-mono">（{p.kana}）</span>
                              <span className="text-xs text-slate-500 font-mono">生年月日: {p.birth}</span>
                            </div>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border w-fit ${p.badgeColor}`}>
                              {p.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed mb-3">
                            <strong className="text-slate-900">登録理由:</strong> {p.reason}
                          </p>
                          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                            <span>添付資料: {p.evidence}</span>
                            <span>登録日: {p.date}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* タブ 2: 未払い企業照会 */}
              {activeDemoTab === "credit" && (
                <div>
                  <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      企業名・法人番号・所在地で照会（デモ入力できます）
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={creditSearchQuery}
                          onChange={(e) => setCreditSearchQuery(e.target.value)}
                          placeholder="例: 東洋、建設、さいたま（全件表示は空欄）"
                          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500 bg-white"
                        />
                      </div>
                      <button
                        onClick={() => {}}
                        className="px-6 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors whitespace-nowrap"
                      >
                        企業信用照会
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
                      <span>未払い・遅延履歴（サンプルデータ）</span>
                      <span>全 3 社中 表示</span>
                    </div>

                    {mockCredits
                      .filter((c) => c.company.includes(creditSearchQuery) || c.pref.includes(creditSearchQuery))
                      .map((c, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors bg-white">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div>
                              <span className="font-extrabold text-sm text-slate-900 mr-2">{c.company}</span>
                              <span className="text-xs text-slate-500 font-mono">法人番号: {c.corpNum}</span>
                            </div>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border w-fit ${c.statusColor}`}>
                              {c.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 py-2 px-3 bg-slate-50 rounded-lg text-xs">
                            <div><span className="text-slate-500">所在地:</span> <strong className="text-slate-800">{c.pref}</strong></div>
                            <div><span className="text-slate-500">金額:</span> <strong className="text-red-600 font-mono">{c.amount}</strong></div>
                            <div><span className="text-slate-500">当初期日:</span> <strong className="text-slate-800">{c.dueDate}</strong></div>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed mb-2">
                            <strong className="text-slate-900">相手方の主張（登録理由）:</strong> {c.reason}
                          </p>
                          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
                            <span>エビデンス: {c.evidence}</span>
                            <span className="text-emerald-700 font-semibold">入金確認時：5日以内に自動ステータス変更</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* タブ 3: 事実登録の流れ */}
              {activeDemoTab === "register" && (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 leading-relaxed">
                    <strong>【安心の適法設計】</strong> 自社でトラブルが発生した場合の登録は、以下の厳格な3ステップで行われます。感情的な誹謗中傷や推測の書き込みは運営審査で却下されます。
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="text-xs font-bold text-blue-600 mb-1">STEP 1</div>
                      <h4 className="text-sm font-bold text-slate-900 mb-2">同意書・エビデンス添付</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        面接時に取得した所定の「同意書PDF」および、タイムカードや通話履歴・請求書を添付します。
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="text-xs font-bold text-blue-600 mb-1">STEP 2</div>
                      <h4 className="text-sm font-bold text-slate-900 mb-2">客観事実のみ記載</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        「何月何日に連絡なく欠勤した」「相手方の主張は何か」など、起きた事実のみを正確に記入します。
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="text-xs font-bold text-blue-600 mb-1">STEP 3</div>
                      <h4 className="text-sm font-bold text-slate-900 mb-2">運営管理者の全件審査</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        事務局が添付書面と記述内容を照合。要件を満たした客観的情報のみがシステム上で他社に共有されます。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 8. 導入事例 (Case Studies) - カオナビ完全同期 */}
      <section id="case" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">VOICE / CASE STUDY</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mt-2">
              実際に現場が変わった。導入企業の声
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug mb-3">
                  「初日バックレが月4件からほぼゼロに。職長に頭を下げる日々から解放されました」
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  荷揚げの現場では朝1人来ないだけで作業が完全に止まります。面接前に1分照会する習慣をつけただけで、他社で直前バックレを繰り返していた人物を事前に回避できるようになり、劇的に現場の定着率が上がりました。
                </p>
              </div>
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">都内揚重専門会社</div>
                  <div className="text-slate-500">代表取締役・採用責任者様</div>
                </div>
                <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">荷揚げ業</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug mb-3">
                  「弁護士監修で同意書が必須だから、現場の採用担当も後ろめたさなく安心運用」
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  ブラックリストと聞くと違法性やクレームが不安でしたが、面接時の同意書取得ルールや運営の審査体制が徹底しており、むしろ真面目に働いてくれる人にとっても安心できる仕組みだと納得して導入できました。
                </p>
              </div>
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">広域警備保障株式会社</div>
                  <div className="text-slate-500">人事部長様</div>
                </div>
                <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">警備業</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <h3 className="text-base font-bold text-slate-900 leading-snug mb-3">
                  「新規の荷主で支払い遅延履歴を発見。前受金条件に変更して焦げ付きを回避」
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  初めて取引する会社からの急な運送依頼。ミエリスクレジットで照会したところ、他社で3ヶ月の支払い遅延記録があり、契約条件を『事前振込』に変更。結果的に回収リスクを完全にゼロに抑えられました。
                </p>
              </div>
              <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">関東建材ロジスティクス</div>
                  <div className="text-slate-500">統括専務様</div>
                </div>
                <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">運送業</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 9. シンプルな料金体系 (Pricing) - カオナビ完全同期 */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">PRICING PLAN</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mt-2">
              シンプルな料金体系
            </h2>
            <p className="text-slate-600 text-sm mt-3">
              1社1アカウント。支店・営業所ごとに柔軟に追加可能。表示価格はすべて税別です。
            </p>
          </div>

          {/* 3プランカード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            
            {/* プラン 1 */}
            <div className="p-8 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between hover:border-slate-400 transition-colors">
              <div>
                <div className="text-xs font-bold text-slate-500 mb-2">就業トラブル防止に特化</div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-4">人物情報プラン</h3>
                <div className="mb-6">
                  <span className="text-4xl font-black text-slate-900 font-mono">¥18,000</span>
                  <span className="text-xs text-slate-500 font-bold ml-1">/ 月（税別）</span>
                </div>
                <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                  求職者の面接前照会、当日欠勤・バックレの事実共有、同意書管理機能。
                </p>
                <div className="space-y-2 text-xs text-slate-700 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /><span>人物照会・検索（無制限）</span></div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /><span>就業トラブル事実登録</span></div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /><span>初期費用 10,000円 / 契約1年</span></div>
                </div>
              </div>
              <a href="#contact" className="mt-8 block text-center py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors">
                このプランで相談する
              </a>
            </div>

            {/* プラン 2: おすすめセット */}
            <div className="p-8 rounded-2xl border-2 border-blue-600 bg-blue-50/20 flex flex-col justify-between relative shadow-xl">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white text-[11px] font-extrabold shadow-sm">
                人気 No.1 / お得なセット
              </div>
              <div>
                <div className="text-xs font-bold text-blue-600 mb-2">採用 ＋ 取引先信用を両方防御</div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-4">両方セットプラン</h3>
                <div className="mb-6">
                  <span className="text-4xl font-black text-blue-600 font-mono">¥30,000</span>
                  <span className="text-xs text-slate-500 font-bold ml-1">/ 月（税別）</span>
                  <div className="text-[11px] text-emerald-700 font-bold mt-1">※個別契約より月額3,000円お得</div>
                </div>
                <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                  人物トラブル情報照会と、取引先未払いクレジット照会の全機能をご利用いただけます。
                </p>
                <div className="space-y-2 text-xs text-slate-700 border-t border-blue-100 pt-6">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /><span>全機能（人物照会＋企業照会）使い放題</span></div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /><span>運営による優先審査サポート</span></div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /><span>初期費用 10,000円 / 契約1年</span></div>
                </div>
              </div>
              <a href="#contact" className="mt-8 block text-center py-3 rounded-xl bg-blue-600 font-bold text-xs text-white hover:bg-blue-700 shadow-md transition-colors">
                セットプランで申し込む
              </a>
            </div>

            {/* プラン 3 */}
            <div className="p-8 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between hover:border-slate-400 transition-colors">
              <div>
                <div className="text-xs font-bold text-slate-500 mb-2">代金未払い・回収難航防止</div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-4">未払い企業クレジット</h3>
                <div className="mb-6">
                  <span className="text-4xl font-black text-slate-900 font-mono">¥15,000</span>
                  <span className="text-xs text-slate-500 font-bold ml-1">/ 月（税別）</span>
                </div>
                <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                  取引開始前の未払い・遅延履歴照会、未払い企業登録、解決済みステータス管理。
                </p>
                <div className="space-y-2 text-xs text-slate-700 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-600" /><span>企業信用照会（法人番号・商号）</span></div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-600" /><span>支払遅延・未払い事実登録</span></div>
                  <div className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-600" /><span>初期費用 10,000円 / 契約1年</span></div>
                </div>
              </div>
              <a href="#contact" className="mt-8 block text-center py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-800 hover:bg-slate-50 transition-colors">
                このプランで相談する
              </a>
            </div>

          </div>

          {/* 見積もりシミュレーター（カオナビ風） */}
          <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              簡単お見積りシミュレーション
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">利用プラン</label>
                <select
                  value={selectedPlanType}
                  onChange={(e) => setSelectedPlanType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="full">両方セットプラン（月額 ¥30,000）</option>
                  <option value="employment">人物情報プラン（月額 ¥18,000）</option>
                  <option value="credit">未払い企業クレジット（月額 ¥15,000）</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">利用拠点数（支店・営業所）</label>
                <select
                  value={locationCount}
                  onChange={(e) => setLocationCount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="1">1 拠点（本社のみ）</option>
                  <option value="2">2 拠点</option>
                  <option value="3">3 拠点</option>
                  <option value="5">5 拠点</option>
                  <option value="10">10 拠点以上</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">初期事務手数料: <strong className="text-slate-800 font-mono">¥{pricing.initial.toLocaleString()}</strong>（税別）</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  月額ご利用料金目安: <span className="text-2xl font-black text-blue-600 font-mono">¥{pricing.monthly.toLocaleString()}</span> <span className="text-xs font-normal text-slate-500">/ 月（税別）</span>
                </div>
              </div>
              <a
                href="#contact"
                className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors text-center whitespace-nowrap"
              >
                この条件で見積書を発行
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* 10. よくある質問 (FAQ) - カオナビ完全同期 */}
      <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">FAQ</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              よくいただくご質問
            </h2>
            <p className="text-slate-600 text-sm mt-2">
              法務・運用の疑問について、弁護士監修の明確な回答をご用意しております。
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all shadow-2xs"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <span className="font-bold text-sm text-slate-900 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-extrabold shrink-0">
                      Q
                    </span>
                    {faq.q}
                  </span>
                  {openFaq === idx ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/30 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5">
                      A
                    </span>
                    <p className="pt-0.5">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. 創業者ストーリー & 運営体制 */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-xs font-bold text-blue-400 tracking-wider uppercase mb-2 block">
                FOUNDER'S STORY
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-6">
                「2016年から10年、ずっと同じ問題を見てきました。<br />
                作った人間が誰よりもこの痛みを知っている――それがMIERISです」
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                現場のバイト作業員から始まり、当日欠勤の連続に絶望し、営業から経営まで駆け抜けた10年間。履歴書と30分の面接ではどうしても見抜けない現実を肌で知っているからこそ、感情を排した「起きた事実だけの適法な共有」にこだわり抜いてシステムを開発しました。
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800 pt-6 text-xs text-slate-400">
                <div>
                  <span className="text-white font-bold mr-2">代表取締役 宮島 拳太</span>
                  <span>株式会社ミヤエモン（運営） / 株式会社宇井建設（開発）</span>
                </div>
                <span className="font-mono text-slate-500">東京都中央区日本橋本町4-12-17</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. お問い合わせ・資料請求CTA (Footer Form) */}
      <section id="contact" className="py-20 bg-gradient-to-b from-slate-50 to-slate-100 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">CONTACT / DOWNLOAD</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mt-2">
              詳しい資料請求・無料デモのご相談
            </h2>
            <p className="text-slate-600 text-sm mt-3">
              以下のフォームよりお気軽にお問い合わせください。即座に詳しい案内資料をお送りいたします。
            </p>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-xl">
            {formSubmitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  お問い合わせ・資料請求を受け付けました
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  担当者より確認のメールをお送りいたします。デモ画面の詳しいご案内やアカウント発行のご相談もお気軽にお申し付けください。
                </p>
                <button
                  onClick={() => setFormSubmitted(false)}
                  className="mt-4 px-6 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  フォームに戻る
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    貴社名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="例: 株式会社ミエリス建設"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ご担当者様氏名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例: 山田 太郎"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      お電話番号 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="例: 03-1234-5678"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    メールアドレス <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="例: info@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    お問い合わせ種別
                  </label>
                  <select
                    value={formData.inquiryType}
                    onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value="資料請求（全12P提案書）">資料請求（全12P 公式提案書PDF）</option>
                    <option value="無料オンラインデモ希望">無料オンラインデモ希望（担当者による実演）</option>
                    <option value="料金・導入のご相談">料金・お見積り・契約のご相談</option>
                    <option value="その他">その他のお問い合わせ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ご質問・備考（任意）
                  </label>
                  <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="支店数や現在のお悩みなど、ご自由にご記入ください。"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>上記の内容で資料請求・無料デモを申し込む</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 13. フッター */}
      <footer className="py-12 bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img src="/logo-mark.png" alt="MIERIS" className="w-8 h-8 object-contain" />
              <div>
                <span className="font-extrabold text-lg text-white tracking-wider block">MIERIS</span>
                <span className="text-[10px] text-slate-500 font-bold">就業＆信用リスク管理システム</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
              <a href="#problem" className="hover:text-white transition-colors">課題解決</a>
              <a href="#strength" className="hover:text-white transition-colors">強み</a>
              <a href="#demo" className="hover:text-white transition-colors">デモ体験</a>
              <a href="#pricing" className="hover:text-white transition-colors">料金</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <Link href="/" className="hover:text-white transition-colors">ログイン</Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              運営：株式会社ミヤエモン / 開発：株式会社宇井建設
            </div>
            <div>
              &copy; {new Date().getFullYear()} MIERIS All Rights Reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
