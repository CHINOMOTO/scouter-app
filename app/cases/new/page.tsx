"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { UploadCloud, X, AlertCircle } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { recognizeText } from "@/lib/ocr";

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
  const [reason, setReason] = useState("");

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // File upload handling
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB default limit for Supabase

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];

      newFiles.forEach(file => {
        if (file.size > MAX_FILE_SIZE) {
          alert(`ファイル「${file.name}」はサイズが大きすぎます (最大50MB)`);
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
    if (!confirm("画像を解析してテキストを抽出しますか？\\n抽出されたテキストは「登録理由/詳細」に追記されます。")) return;

    setIsAnalyzing(true);
    try {
      const text = await recognizeText(file);
      if (text) {
        // 余分な空白を除去して追記
        const cleanedText = text.replace(/\\s+/g, ' ').trim();
        setReason((prev) => prev + (prev ? "\\n\\n" : "") + "[画像解析結果]\\n" + cleanedText);
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

      if (nameKana && !/^[ァ-ヶー\s　]*$/.test(nameKana)) {
        throw new Error("氏名（カナ）は全角カタカナで入力してください。");
      }

      // 共通の日付バリデーション関数
      const validateDate = (y, m, d, label) => {
        if (!y && !m && !d) return; // 空ならOK
        if (!y || !m || !d) {
          throw new Error(`${label}は「年・月・日」すべてを入力するか、すべて空にしてください。`);
        }
        const yearInt = parseInt(y, 10);
        const monthInt = parseInt(m, 10);
        const dayInt = parseInt(d, 10);
        
        const dateObj = new Date(yearInt, monthInt - 1, dayInt);
        // Dateオブジェクトが自動補正した結果が元の値と異なる場合は無効な日付（例: 2月30日 -> 3月2日）
        if (dateObj.getFullYear() !== yearInt || dateObj.getMonth() + 1 !== monthInt || dateObj.getDate() !== dayInt) {
          throw new Error(`${label}に存在しない日付（${yearInt}年${monthInt}月${dayInt}日）が入力されています。正しい日付を入力してください。`);
        }
        
        // 常識的な年の範囲チェック
        if (yearInt < 1900 || yearInt > 2100) {
          throw new Error(`${label}の「年」は1900〜2100の範囲で入力してください。`);
        }
      };

      // 生年月日と発生時期のバリデーションを実行
      validateDate(birthYear, birthMonth, birthDay, "生年月日");
      validateDate(occurrenceYear, occurrenceMonth, occurrenceDay, "トラブル発生時期");

      // 電話番号のバリデーション
      if (phoneLast4 && phoneLast4.length !== 4) {
        throw new Error("電話番号（下4桁）は必ず4桁の数字で入力してください。");
      }

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
          reason_text: reason,
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
        <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center">
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

            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
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
                  setReason("");
                  setSelectedFiles([]);
                  window.scrollTo(0, 0);
                }}
                className="btn-secondary py-3 px-6"
              >
                続けて登録する
              </button>
              <Link href="/dashboard" className="btn-primary py-3 px-6">
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
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
        <div className="max-w-3xl w-full">

          <div className="mb-8 text-center animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">新規登録申請</h1>
            <p className="text-slate-600">新しいデータを登録します</p>
          </div>

          <div className="glass-panel rounded-2xl p-6 md:p-10 animate-fade-in delay-100">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* 基本情報 */}
              <Section title="基本情報">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label required>氏名</Label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                      placeholder="山田 太郎"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>氏名（カナ）</Label>
                    <input
                      type="text"
                      value={nameKana}
                      onChange={(e) => setNameKana(e.target.value)}
                      className="input-field"
                      placeholder="ヤマダ タロウ"
                      pattern="^[ァ-ヶー\s　]*$"
                      title="全角カタカナで入力してください"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>生年月日</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={birthYear}
                        onChange={(e) => { if (/^\d*$/.test(e.target.value)) setBirthYear(e.target.value); }}
                        className="input-field w-24 text-center"
                        placeholder="0000"
                      />
                      <span className="text-slate-600">年</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={birthMonth}
                        onChange={(e) => { if (/^\d*$/.test(e.target.value)) setBirthMonth(e.target.value); }}
                        className="input-field w-16 text-center"
                        placeholder="00"
                      />
                      <span className="text-slate-600">月</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={birthDay}
                        onChange={(e) => { if (/^\d*$/.test(e.target.value)) setBirthDay(e.target.value); }}
                        className="input-field w-16 text-center"
                        placeholder="00"
                      />
                      <span className="text-slate-600">日</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>性別</Label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="input-field appearance-none"
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
                    <Label>携帯電話番号（下4桁）</Label>
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
                    <Label>住所（市区町村）</Label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="input-field"
                      placeholder="例：東京都渋谷区"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>発生日</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={occurrenceYear}
                        onChange={(e) => { if (/^\d*$/.test(e.target.value)) setOccurrenceYear(e.target.value); }}
                        className="input-field w-24 text-center"
                        placeholder="0000"
                      />
                      <span className="text-slate-600">年</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={occurrenceMonth}
                        onChange={(e) => { if (/^\d*$/.test(e.target.value)) setOccurrenceMonth(e.target.value); }}
                        className="input-field w-16 text-center"
                        placeholder="00"
                      />
                      <span className="text-slate-600">月</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={2}
                        value={occurrenceDay}
                        onChange={(e) => { if (/^\d*$/.test(e.target.value)) setOccurrenceDay(e.target.value); }}
                        className="input-field w-16 text-center"
                        placeholder="00"
                      />
                      <span className="text-slate-600">日</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label required>登録理由 / 詳細</Label>
                  <textarea
                    required
                    rows={5}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input-field min-h-[120px]"
                    placeholder="具体的なトラブル内容や注意点を記載してください..."
                  />
                </div>

                <div className="space-y-2 mt-4">
                  <Label>添付資料（画像・PDF等）</Label>
                  <div className="border border-dashed border-slate-600 rounded-lg p-6 text-center hover:bg-slate-100/30 transition-colors relative">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*,application/pdf"
                    />
                    <div className="pointer-events-none">
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">クリックまたはドラッグ＆ドロップでファイルを追加</p>
                      <p className="text-xs text-slate-500 mt-1">（画像、PDFなど複数可）</p>
                    </div>
                  </div>

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
              </Section>

              {errorMsg && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 text-sm">
                  <span className="inline-flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></span>
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-slate-200">
                <Link href="/dashboard" className="btn-secondary flex-1 text-center py-3">
                  キャンセル
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 py-3 text-base"
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
        <span className="text-slate-900 text-[10px] border border-slate-200 bg-slate-50 px-1.5 py-0.5 rounded">
          必須
        </span>
      ) : (
        <span className="text-slate-500 text-[10px] border border-slate-200 bg-slate-100 px-1.5 py-0.5 rounded">
          任意
        </span>
      )}
    </label>
  )
}
