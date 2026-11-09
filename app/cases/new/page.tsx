"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { UploadCloud, X, AlertCircle, ArrowLeft, Check, ShieldAlert } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { recognizeText } from "@/lib/ocr";

type TroubleCategory = {
  id: string;
  label: string;
  desc: string;
  subItems: string[];
};

const LATE_SUB_ITEMS = [
  "遅刻（連絡なし）",
  "直近1ヶ月で勤務回数に対して10%-20%未満の遅刻",
  "直近1ヶ月で勤務回数に対して20%以上の遅刻",
];

const TROUBLE_CATEGORIES: TroubleCategory[] = [
  {
    id: "absence",
    label: "欠勤、遅刻",
    desc: "当日欠勤・遅刻の記録",
    subItems: [
      "当日欠勤（連絡なし）",
      "当日欠勤（連絡有り）",
      ...LATE_SUB_ITEMS,
    ],
  },
  {
    id: "early_leave",
    label: "途中帰宅",
    desc: "作業途中の無断帰宅・制止に応じず帰宅",
    subItems: [
      "無断帰宅",
      "制止に応じず帰宅",
    ],
  },
  {
    id: "unreturned",
    label: "未返却・未精算",
    desc: "貸出品未返却・前貸金未精算",
    subItems: [
      "貸出品の返却なし",
      "前貸金が精算されてない",
    ],
  },
  {
    id: "falsification",
    label: "申告内容の相違",
    desc: "身分証・資格証・住所・緊急連絡先等の相違",
    subItems: [
      "申告内容の相違",
    ],
  },
  {
    id: "site_trouble",
    label: "現場トラブル",
    desc: "作業中断を伴う問題行動",
    subItems: [
      "身体的接触に伴うトラブルにより作業中断",
      "現場で大声をあげて作業が中断",
      "飲酒が確認されて作業が中断した",
    ],
  },
  {
    id: "other",
    label: "その他",
    desc: "上記以外のトラブル事象",
    subItems: [],
  },
];

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [nameKana, setNameKana] = useState("");
  const [gender, setGender] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [city, setCity] = useState("");
  const [occurrenceYear, setOccurrenceYear] = useState("");
  const [occurrenceMonth, setOccurrenceMonth] = useState("");
  const [occurrenceDay, setOccurrenceDay] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubItem, setSelectedSubItem] = useState<string>("");
  const [reason, setReason] = useState("");

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 登録に関する宣誓・同意チェックボックス
  const [agreedWork1, setAgreedWork1] = useState(false);
  const [agreedWork2, setAgreedWork2] = useState(false);
  const [agreedWork3, setAgreedWork3] = useState(false);
  // 遅刻を選択した時のみの追加同意チェックボックス
  const [agreedLate1, setAgreedLate1] = useState(false);
  const [agreedLate2, setAgreedLate2] = useState(false);

  const currentCategoryObj = TROUBLE_CATEGORIES.find((c) => c.id === selectedCategory);
  const isLateSelected = selectedCategory === "absence" && LATE_SUB_ITEMS.includes(selectedSubItem);

  // File upload handling
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB default limit for Supabase

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];

      newFiles.forEach(file => {
        if (file.size > MAX_FILE_SIZE) {
          alert(`ファイル「${file.name}」はサイズが大きすぎます (1ファイルあたり最大50MB)`);
        } else {
          validFiles.push(file);
        }
      });

      if (validFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...validFiles]);
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOCR = async (file: File) => {
    if (!confirm("画像を解析してテキストを抽出しますか？\n抽出されたテキストは「補足詳細 / 登録理由」欄に追記されます。")) return;

    setIsAnalyzing(true);
    try {
      const text = await recognizeText(file);
      if (text) {
        // 余分な空白を除去して追記
        const cleanedText = text.replace(/\s+/g, ' ').trim();
        setReason((prev) => prev + (prev ? "\n\n" : "") + "[画像解析結果]\n" + cleanedText);
        alert("テキストを抽出しました！");
      } else {
        alert("テキストが見つかりませんでした。");
      }
    } catch (error) {
      console.error(error);
      alert("解析に失敗しました。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("ログインセッションが切れました。再ログインしてください。");
      }

      // ユーザーの会社IDと会社名を取得
      const { data: appUser } = await supabase
        .from("app_users")
        .select("company_id, companies(name)")
        .eq("id", user.id)
        .single();

      if (!appUser?.company_id) {
        throw new Error("所属会社情報が見つかりません。");
      }

      if (!name.trim()) {
        throw new Error("氏名を入力してください。");
      }
      if (!nameKana.trim()) {
        throw new Error("氏名（カナ）を入力してください。");
      }
      if (!/^[ァ-ヶー\s　]+$/.test(nameKana.trim())) {
        throw new Error("氏名（カナ）は全角カタカナで入力してください。");
      }
      if (!birthYear || !birthMonth || !birthDay) {
        throw new Error("生年月日（年・月・日）をすべて入力してください。");
      }
      if (!gender) {
        throw new Error("性別を選択してください。");
      }
      if (!phoneLast4 || phoneLast4.length !== 4) {
        throw new Error("携帯電話番号（下4桁）を正確に4桁で入力してください。");
      }
      if (!city.trim()) {
        throw new Error("住所（市区町村）を入力してください。");
      }
      if (!occurrenceYear || !occurrenceMonth || !occurrenceDay) {
        throw new Error("トラブル発生時期（年・月・日）をすべて入力してください。");
      }
      if (!selectedCategory) {
        throw new Error("トラブル事象（大まかな事象ボタン）を選択してください。");
      }
      const selectedCatObj = TROUBLE_CATEGORIES.find((c) => c.id === selectedCategory);
      if (selectedCategory !== "other" && !selectedSubItem) {
        throw new Error(`「${selectedCatObj?.label}」の詳細事象ボタンを選択してください。`);
      }
      if (selectedCategory === "other" && !reason.trim()) {
        throw new Error("「その他」を選択した場合は、具体的なトラブル内容・詳細を入力してください。");
      }
      if (isLateSelected && !reason.trim()) {
        throw new Error("遅刻を選択した場合は、補足欄に「勤務◯回中、遅刻◯回」等の内訳を記載してください。");
      }
      if (!agreedWork1 || !agreedWork2 || !agreedWork3) {
        throw new Error("「登録に関する宣誓・同意」のすべての項目を確認し、チェックを入れてください。");
      }
      if (isLateSelected && (!agreedLate1 || !agreedLate2)) {
        throw new Error("遅刻に関する追加の確認事項（2項目）にすべてチェックを入れてください。");
      }
      if (selectedFiles.length === 0) {
        throw new Error("添付資料（同意書必須、あれば証拠のスクショなど）を必ず1点以上添付してください。");
      }

      const finalReasonText =
        selectedCategory === "other"
          ? `【その他】${reason.trim()}`
          : reason.trim()
            ? `【${selectedCatObj?.label}】${selectedSubItem}\n${reason.trim()}`
            : `【${selectedCatObj?.label}】${selectedSubItem}`;

      // 共通の日付バリデーション関数
      const validateDate = (y: string, m: string, d: string, label: string) => {
        const yearInt = parseInt(y, 10);
        const monthInt = parseInt(m, 10);
        const dayInt = parseInt(d, 10);
        
        const dateObj = new Date(yearInt, monthInt - 1, dayInt);
        if (dateObj.getFullYear() !== yearInt || dateObj.getMonth() + 1 !== monthInt || dateObj.getDate() !== dayInt) {
          throw new Error(`${label}に存在しない日付（${yearInt}年${monthInt}月${dayInt}日）が入力されています。正しい日付を入力してください。`);
        }
        if (yearInt < 1900 || yearInt > 2100) {
          throw new Error(`${label}の「年」は1900〜2100の範囲で入力してください。`);
        }
      };

      validateDate(birthYear, birthMonth, birthDay, "生年月日");
      validateDate(occurrenceYear, occurrenceMonth, occurrenceDay, "トラブル発生時期");

      // ファイルアップロード処理
      const uploadedUrls: string[] = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('case-evidence')
            .upload(fileName, file);

          if (uploadError) {
            console.error("Upload failed:", uploadError);
            throw new Error(`ファイルのアップロードに失敗しました (${file.name}): ${uploadError.message}`);
          }

          if (uploadData?.path) {
            uploadedUrls.push(uploadData.path);
          }
        }
      }


      const { error } = await supabase.from("blacklist_cases").insert([
        {
          registered_company_id: appUser.company_id,
          full_name: name,
          full_name_kana: nameKana,
          gender: gender || null, // "male", "female", "other" or null
          birth_date: (birthYear && birthMonth && birthDay)
            ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
            : null,
          phone_last4: phoneLast4 || null,
          city: city || null,
          occurrence_date: (occurrenceYear && occurrenceMonth && occurrenceDay)
            ? `${occurrenceYear}-${occurrenceMonth.padStart(2, '0')}-${occurrenceDay.padStart(2, '0')}`
            : null,
          reason_text: finalReasonText,
          evidence_urls: uploadedUrls, // アップロードしたファイルのパス配列
          status: "pending", // 初期状態は未承認
          registered_by_user_id: user.id,
        },
      ]);

      if (error) throw error;

      // LINE通知APIの呼び出し（失敗しても画面遷移は止めない）
      try {
        await fetch('/api/notify/line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_case',
            data: {
              targetName: name,
              company: (appUser?.companies as any)?.name || "不明"
            }
          })
        });
      } catch (notifyErr) {
        console.error("Notify Error:", notifyErr);
      }

      setLoading(false);
      setIsSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("登録処理中にエラーが発生しました: " + (err.message || "詳細不明"));
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <RequireAuth>
        <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 flex flex-col items-center justify-center">
          <div className="max-w-xl w-full text-center glass-panel p-10 rounded-3xl animate-fade-in border-t-4 border-t-slate-900 relative overflow-hidden">

            {/* Background Effect */}
            <div className="absolute inset-0 bg-white/[0.03] pointer-events-none"></div>

            <h2 className="text-2xl font-bold text-slate-900 mb-6 tracking-wider">
              登録申請完了
            </h2>
            <p className="text-slate-700 mb-8 leading-relaxed">
              登録申請が完了しました。<br />
              管理者の承認をお待ちください。
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5 justify-center relative z-10 flex-wrap">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setName("");
                  setNameKana("");
                  setGender("");
                  setBirthYear("");
                  setBirthMonth("");
                  setBirthDay("");
                  setPhoneLast4("");
                  setCity("");
                  setOccurrenceYear("");
                  setOccurrenceMonth("");
                  setOccurrenceDay("");
                  setSelectedCategory("");
                  setSelectedSubItem("");
                  setReason("");
                  setSelectedFiles([]);
                  setAgreedWork1(false);
                  setAgreedWork2(false);
                  setAgreedWork3(false);
                  setAgreedLate1(false);
                  setAgreedLate2(false);
                  window.scrollTo(0, 0);
                }}
                className="btn-secondary py-3 px-6 text-xs sm:text-sm font-bold"
              >
                続けて登録する
              </button>
              <Link href="/cases" className="btn-secondary py-3 px-6 text-xs sm:text-sm font-bold border border-slate-300 hover:border-slate-400 bg-white text-slate-800">
                自社登録トラブル一覧へ
              </Link>
              <Link href="/dashboard" className="btn-primary py-3 px-6 text-xs sm:text-sm font-bold">
                ダッシュボードへ戻る
              </Link>
            </div>
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-screen pt-16 sm:pt-20 md:pt-10 pb-12 px-3.5 sm:px-6 flex flex-col items-center">
        <div className="max-w-3xl w-full">

          {/* ヘッダーエリア */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-slate-200 animate-fade-in">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest font-mono">
                  MIERIS WORK
                </span>
                <span className="text-slate-300 text-xs">|</span>
                <span className="text-xs text-slate-500 font-semibold tracking-wide">
                  就業・採用トラブル情報登録
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                就業トラブル情報 新規登録申請
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                問題行動・無断欠勤・損害等の事実を客観的根拠に基づき登録申請します。
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <Link 
                href="/cases" 
                className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-colors whitespace-nowrap w-full sm:w-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">一覧へ戻る</span>
              </Link>
            </div>
          </div>

          {/* コンプライアンス遵守ボックス（未払い登録画面と統一した運用ルール表示） */}
          <div className="bg-slate-900 text-slate-100 p-4 sm:p-6 rounded-xl mb-6 shadow-2xs border border-slate-800 animate-fade-in w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-2.5 mb-2.5 sm:mb-3 border-b border-slate-800 pb-2.5 sm:pb-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold tracking-wide text-white">
                「晒す」仕組みにしないための運用ルール
              </span>
            </div>
            <ul className="text-xs space-y-2 text-slate-300 list-disc list-inside leading-relaxed">
              <li><strong className="text-white font-bold">同意書のない相手は登録できません</strong>（採用・就業開始時に本人署名を得た同意書の添付が必須です）</li>
              <li><strong className="text-white font-bold">評価・推測・伝聞・断定的な犯罪呼称は禁止</strong>（「悪質」「詐欺師」等の主観的表現や誹謗中傷は審査で却下されます）</li>
              <li><strong className="text-white font-bold">客観的な事実経緯を記録</strong>（本人から言い分や主張があった場合はその内容も併記してください）</li>
              <li><strong className="text-white font-bold">返却・精算や和解等で解決した場合は速やかに更新・連絡</strong>してください</li>
              <li><strong className="text-white font-bold">全件、運営管理者の厳格な同意書・エビデンス審査</strong>を経てから共有されます</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4.5 sm:p-8 md:p-10 animate-fade-in delay-100">
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">

              {/* 基本情報 */}
              <Section title="基本情報">
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label required>氏名</Label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field text-sm sm:text-base py-2.5 sm:py-3"
                      placeholder="山田 太郎"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label required>氏名（カナ）</Label>
                    <input
                      type="text"
                      value={nameKana}
                      onChange={(e) => setNameKana(e.target.value)}
                      className="input-field text-sm sm:text-base py-2.5 sm:py-3"
                      placeholder="ヤマダ タロウ"
                      pattern="^[ァ-ヶー\s　]*$"
                      title="全角カタカナで入力してください"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label required>生年月日</Label>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={birthYear}
                          onChange={(e) => { if (/^\d*$/.test(e.target.value)) setBirthYear(e.target.value); }}
                          className="input-field w-full text-center font-mono py-2.5 sm:py-3 text-sm sm:text-base"
                          placeholder="1990"
                        />
                        <span className="text-slate-600 text-xs font-bold shrink-0">年</span>
                      </div>
                      <div className="w-20 sm:w-24 flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={birthMonth}
                          onChange={(e) => { if (/^\d*$/.test(e.target.value)) setBirthMonth(e.target.value); }}
                          className="input-field w-full text-center font-mono py-2.5 sm:py-3 text-sm sm:text-base"
                          placeholder="01"
                        />
                        <span className="text-slate-600 text-xs font-bold shrink-0">月</span>
                      </div>
                      <div className="w-20 sm:w-24 flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={birthDay}
                          onChange={(e) => { if (/^\d*$/.test(e.target.value)) setBirthDay(e.target.value); }}
                          className="input-field w-full text-center font-mono py-2.5 sm:py-3 text-sm sm:text-base"
                          placeholder="01"
                        />
                        <span className="text-slate-600 text-xs font-bold shrink-0">日</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label required>性別</Label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="input-field appearance-none py-2.5 sm:py-3 text-sm sm:text-base"
                    >
                      <option value="">選択してください</option>
                      <option value="male">男性</option>
                      <option value="female">女性</option>
                      <option value="other">その他</option>
                    </select>
                  </div>
                </div>
              </Section>

              {/* 詳細情報 */}
              <Section title="トラブル情報">
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <Label required>携帯電話番号（下4桁）</Label>
                    <input
                      type="text"
                      maxLength={4}
                      value={phoneLast4}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setPhoneLast4(val);
                        }
                      }}
                      className="input-field"
                      placeholder="1234"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label required>住所（市区町村）</Label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="input-field"
                      placeholder="例: 東京都渋谷区"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label required>発生日</Label>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={occurrenceYear}
                          onChange={(e) => { if (/^\d*$/.test(e.target.value)) setOccurrenceYear(e.target.value); }}
                          className="input-field w-full text-center font-mono py-2.5 sm:py-3 text-sm sm:text-base"
                          placeholder="2024"
                        />
                        <span className="text-slate-600 text-xs font-bold shrink-0">年</span>
                      </div>
                      <div className="w-20 sm:w-24 flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={occurrenceMonth}
                          onChange={(e) => { if (/^\d*$/.test(e.target.value)) setOccurrenceMonth(e.target.value); }}
                          className="input-field w-full text-center font-mono py-2.5 sm:py-3 text-sm sm:text-base"
                          placeholder="01"
                        />
                        <span className="text-slate-600 text-xs font-bold shrink-0">月</span>
                      </div>
                      <div className="w-20 sm:w-24 flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={2}
                          value={occurrenceDay}
                          onChange={(e) => { if (/^\d*$/.test(e.target.value)) setOccurrenceDay(e.target.value); }}
                          className="input-field w-full text-center font-mono py-2.5 sm:py-3 text-sm sm:text-base"
                          placeholder="01"
                        />
                        <span className="text-slate-600 text-xs font-bold shrink-0">日</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 二重選択式トラブル事象セレクター（未払い機能と同様の選択制UI） */}
                <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 mb-6">
                  <div>
                    <Label required>トラブル事象の選択（2段階選択）</Label>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      ① 大まかな事象ボタンを選択し、続けて ② 詳細事象ボタンを選択してください。
                    </p>
                  </div>

                  {/* Step 1: 大まかな事象ボタン */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold">1</span>
                      <span>大まかな事象を選択</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {TROUBLE_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setSelectedSubItem("");
                            }}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? "ring-2 ring-blue-600 border-blue-600 bg-blue-50/60 shadow-xs"
                                : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/80"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1 w-full">
                              <span className={`text-xs sm:text-sm font-bold ${isSelected ? "text-blue-900" : "text-slate-900"}`}>
                                {cat.label}
                              </span>
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">{cat.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: 詳細事象ボタン（その他以外のカテゴリ選択時に表示） */}
                  {currentCategoryObj && currentCategoryObj.id !== "other" && (
                    <div className="pt-3 border-t border-slate-200/80 space-y-2.5 animate-fade-in">
                      <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold">2</span>
                        <span>「{currentCategoryObj.label}」の詳細事象を選択 <span className="text-red-500">*</span></span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {currentCategoryObj.subItems.map((sub) => {
                          const isSubSelected = selectedSubItem === sub;
                          return (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => setSelectedSubItem(sub)}
                              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                isSubSelected
                                  ? "ring-2 ring-blue-600 border-blue-600 bg-blue-50/80 shadow-xs"
                                  : "border-slate-200 bg-white hover:border-slate-400"
                              }`}
                            >
                              <span className={`text-xs sm:text-sm font-bold leading-snug ${isSubSelected ? "text-blue-950" : "text-slate-800"}`}>
                                {sub}
                              </span>
                              <input
                                type="radio"
                                name="troubleSubItem"
                                checked={isSubSelected}
                                onChange={() => setSelectedSubItem(sub)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 shrink-0"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 選択状態のプレビュー表示 */}
                  {selectedCategory && (selectedCategory === "other" || selectedSubItem) && (
                    <div className="pt-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>
                          選択中の事象:{" "}
                          {selectedCategory === "other"
                            ? "【その他】（下の欄に詳細を記入してください）"
                            : `【${currentCategoryObj?.label}】${selectedSubItem}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 補足詳細・その他理由入力欄 */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label required={selectedCategory === "other" || isLateSelected}>
                    {selectedCategory === "other"
                      ? "登録理由 / 具体的なトラブル詳細（「その他」選択時は必須）"
                      : isLateSelected
                        ? "補足詳細（遅刻選択時は「勤務◯回中、遅刻◯回」の記載が必須）"
                        : "補足詳細・具体的な状況（任意）"}
                  </Label>
                  <textarea
                    required={selectedCategory === "other" || isLateSelected}
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input-field min-h-[100px] text-sm leading-relaxed"
                    placeholder={
                      selectedCategory === "other"
                        ? "具体的なトラブル内容や客観的な事実経過を記載してください..."
                        : isLateSelected
                          ? "例: 勤務10回中、遅刻3回（その他、客観的な事実経過があれば記載してください）"
                          : "選択した事象に加えて補足すべき事実経過や注意点があれば記載してください（任意）..."
                    }
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <Label required>添付資料（同意書必須、あれば証拠のスクショなど）</Label>
                  <div className="border border-dashed border-slate-300 rounded-xl p-5 sm:p-6 text-center hover:bg-slate-50 transition-colors relative">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*,application/pdf"
                    />
                    <div className="pointer-events-none">
                      <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400 mx-auto mb-1.5 sm:mb-2" />
                      <p className="text-xs sm:text-sm font-semibold text-slate-700">タップまたはドラッグ＆ドロップで追加</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">（同意書は必須添付 / 証拠スクショ・画像・PDFなど複数ファイル添付可 / 1ファイルあたり最大50MB）</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    ※申請後に運営から追加資料（追完）を求められた場合も、マイページの「自社登録トラブル一覧」→該当データの詳細画面からいつでも追加アップロードが可能です。
                  </p>

                  {selectedFiles.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {selectedFiles.map((file, index) => (
                        <li key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                          <span className="truncate max-w-[60%] text-slate-700">{file.name} ({(file.size / 1024).toFixed(0)}KB)</span>
                          <div className="flex items-center gap-3">
                            {file.type.startsWith('image/') && (
                              <button
                                type="button"
                                onClick={() => handleOCR(file)}
                                disabled={isAnalyzing}
                                className="text-xs text-slate-900 hover:text-slate-900 border border-slate-200 bg-slate-50 px-2 py-1 rounded transition-colors"
                              >
                                {isAnalyzing ? "解析中..." : "文字認識(OCR)"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1 rounded transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 登録に関する宣誓・同意チェックボックス */}
                <div className="space-y-3 pt-5 mt-4 border-t border-slate-200">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>登録に関する宣誓・同意</span>
                    <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-bold">
                      必須
                    </span>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreedWork1}
                      onChange={(e) => setAgreedWork1(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 shrink-0"
                    />
                    <span className="text-xs text-slate-700 group-hover:text-slate-900 leading-relaxed">
                      記載した内容は、当社が直接経験した事実です。推測・伝聞・誇張は含みません。
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreedWork2}
                      onChange={(e) => setAgreedWork2(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 shrink-0"
                    />
                    <span className="text-xs text-slate-700 group-hover:text-slate-900 leading-relaxed">
                      添付した同意書は、本人が内容を確認し、署名したものです。
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreedWork3}
                      onChange={(e) => setAgreedWork3(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 shrink-0"
                    />
                    <span className="text-xs text-slate-700 group-hover:text-slate-900 leading-relaxed">
                      虚偽または事実と異なる登録が判明した場合、当該登録の削除、当社の利用停止、およびそれにより生じた損害の負担の対象となることに同意します。
                    </span>
                  </label>

                  {isLateSelected && (
                    <div className="mt-3 p-3.5 sm:p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2.5 animate-fade-in">
                      <div className="text-xs font-bold text-blue-950">
                        遅刻を選択した場合の追加確認事項
                      </div>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={agreedLate1}
                          onChange={(e) => setAgreedLate1(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-blue-300 text-blue-700 focus:ring-blue-600 shrink-0"
                        />
                        <span className="text-xs text-slate-800 group-hover:text-slate-950 leading-relaxed">
                          公共交通機関の遅延など、本人の責めに帰すことができない事由による遅刻は、回数に含めていません。
                        </span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={agreedLate2}
                          onChange={(e) => setAgreedLate2(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-blue-300 text-blue-700 focus:ring-blue-600 shrink-0"
                        />
                        <span className="text-xs text-slate-800 group-hover:text-slate-950 leading-relaxed">
                          補足欄に「勤務◯回中、遅刻◯回」と記載しました。
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </Section>

              {errorMsg && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 text-sm">
                  <span className="inline-flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-slate-200">
                <Link href="/dashboard" className="btn-secondary w-full sm:flex-1 text-center py-3 text-sm font-bold">
                  キャンセル
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full sm:flex-1 py-3 text-sm sm:text-base font-bold active:scale-[0.98] transition-transform"
                >
                  {loading ? "送信中..." : "登録を申請する"}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Label({ children, required }: { children: React.ReactNode, required?: boolean }) {
  return (
    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
      {children}
      {required ? (
        <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-bold">
          必須
        </span>
      ) : (
        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 font-medium">
          任意
        </span>
      )}
    </label>
  )
}
