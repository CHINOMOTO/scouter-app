"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";

export default function NewCreditCasePage() {
    const router = useRouter();

    const [companyName, setCompanyName] = useState("");
    const [corporateNumber, setCorporateNumber] = useState("");
    const [location, setLocation] = useState("");
    const [invoiceDate, setInvoiceDate] = useState("");
    const [amount, setAmount] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [counterpartyClaim, setCounterpartyClaim] = useState("");
    
    // エビデンスファイル（同意書、請求書、督促書）
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    // 6つのルールの同意チェック
    const [agreedRule1, setAgreedRule1] = useState(false); // 同意書の取得
    const [agreedRule2, setAgreedRule2] = useState(false); // 評価・伝聞ではなく客観的事実のみ
    const [agreedRule3, setAgreedRule3] = useState(false); // 入金時は5日以内に解決報告する

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!agreedRule1 || !agreedRule2 || !agreedRule3) {
            setErrorMsg("登録コンプライアンスの遵守事項にすべて同意してください。");
            return;
        }

        const numAmount = Number(amount.replace(/[^0-9]/g, ""));
        if (!numAmount || numAmount <= 0) {
            setErrorMsg("有効な未払い金額を入力してください。");
            return;
        }

        const cleanCorpNum = corporateNumber.trim().replace(/[^0-9]/g, "");
        if (corporateNumber.trim() && cleanCorpNum.length !== 13) {
            setErrorMsg("法人番号は13桁の半角数字で入力してください。");
            return;
        }

        setUploading(true);

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) throw new Error("認証セッションがありません");

            // 1. エビデンスファイルのアップロード
            const uploadedUrls: string[] = [];
            for (const file of files) {
                const ext = file.name.split('.').pop();
                const fileName = `credit-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                const filePath = `credit_evidence/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("case_attachments")
                    .upload(filePath, file);

                if (!uploadError) {
                    uploadedUrls.push(filePath);
                } else {
                    console.warn("Storage upload warning:", uploadError.message);
                }
            }

            // 2. 登録申請 API の呼び出し
            const res = await fetch("/api/credit-cases", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    companyName: companyName.trim(),
                    corporateNumber: cleanCorpNum || null,
                    location: location.trim() || null,
                    invoiceDate: invoiceDate || null,
                    amount: numAmount,
                    dueDate: dueDate,
                    counterpartyClaim: counterpartyClaim.trim() || null,
                    evidenceUrls: uploadedUrls
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "登録申請に失敗しました");
            }

            alert("未払い企業情報の登録申請を受け付けました。\n運営管理者による事実確認・審査を経てシステム全体に共有されます。");
            router.push("/credit");

        } catch (err: any) {
            setErrorMsg(err.message || "予期せぬエラーが発生しました");
        } finally {
            setUploading(false);
        }
    };

    return (
        <RequireAuth>
            <div className="min-h-screen pt-24 pb-16 px-4 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-3xl w-full">

                    {/* ヘッダー */}
                    <div className="mb-8 animate-fade-in">
                        <Link href="/credit" className="text-slate-600 hover:text-slate-900 text-sm flex items-center gap-1 mb-4">
                            ← 未払い企業一覧へ戻る
                        </Link>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white uppercase tracking-wider">
                                MIERIS CREDIT
                            </span>
                            <span className="text-xs text-slate-500 font-medium">事実のみを記録する安全な運用</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            未払い・支払遅延企業の登録申請
                        </h1>
                        <p className="text-slate-600 text-sm mt-1">
                            客観的な請求事実と裏付け資料に基づき、未払い・支払遅延の事実を記録・申請します。
                        </p>
                    </div>

                    {/* コンプライアンス遵守ボックス */}
                    <div className="bg-slate-900 text-slate-100 p-6 rounded-3xl mb-8 shadow-md">
                        <h3 className="text-sm font-bold tracking-widest text-slate-300 uppercase mb-3">
                            【重要】「晒す」仕組みにしないための6つの運用ルール
                        </h3>
                        <ul className="text-xs space-y-2 text-slate-300 list-disc list-inside leading-relaxed">
                            <li><strong className="text-white">同意書のない相手は登録できません</strong>（取引開始時に署名を得た同意書が必要です）</li>
                            <li><strong className="text-white">評価・推測・伝聞は禁止</strong>（「悪質」「危ない」といった主観的表現は審査で却下されます）</li>
                            <li><strong className="text-white">相手の言い分（反論・保留理由）を必ず併記</strong>してください</li>
                            <li><strong className="text-white">入金されたら5営業日以内に更新</strong>（「解決済み（遅延○日）」と表示更新されます）</li>
                            <li>全件、運営管理者の厳格なエビデンス審査を経てから共有されます</li>
                        </ul>
                    </div>

                    {/* 申請フォーム */}
                    <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-200 bg-white shadow-xl">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* 対象企業名 */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-800">
                                    対象企業名（商号） <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="input-field"
                                    placeholder="例: 株式会社〇〇工務店"
                                />
                            </div>

                            {/* 法人番号 & 所在地 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-800">
                                        法人番号（13桁）
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={13}
                                        value={corporateNumber}
                                        onChange={(e) => setCorporateNumber(e.target.value.replace(/[^0-9]/g, ""))}
                                        className="input-field font-mono"
                                        placeholder="例: 1234567890123"
                                    />
                                    <p className="text-[11px] text-slate-400">※同名他社との誤認防止のため推奨</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-800">
                                        本社所在地
                                    </label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="input-field"
                                        placeholder="例: 東京都千代田区〇〇1-2-3"
                                    />
                                </div>
                            </div>

                            {/* 未払い金額 & 支払期日 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-800">
                                        未払い・遅延金額（税込） <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3 text-slate-500 font-bold">¥</span>
                                        <input
                                            type="text"
                                            required
                                            value={amount}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, "");
                                                setAmount(val ? Number(val).toLocaleString() : "");
                                            }}
                                            className="input-field pl-8 font-extrabold text-lg"
                                            placeholder="1,500,000"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-800">
                                        当初の支払期日 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="input-field"
                                    />
                                </div>
                                <div className="col-span-1 sm:col-span-2 space-y-2">
                                    <label className="text-xs font-bold text-slate-700">
                                        請求日（請求書の発行日）
                                    </label>
                                    <input
                                        type="date"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                        className="input-field"
                                    />
                                </div>
                            </div>

                            {/* 相手方の主張 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-slate-800">
                                        相手方の主張（反論・理由）
                                    </label>
                                    <span className="text-xs text-amber-700 font-bold">※公平性の担保のため必ず記入</span>
                                </div>
                                <textarea
                                    rows={3}
                                    value={counterpartyClaim}
                                    onChange={(e) => setCounterpartyClaim(e.target.value)}
                                    className="input-field py-2.5 resize-none text-sm"
                                    placeholder="例: 「元請からの入金が遅れているため待ってほしいと言われている」「工事のやり直し箇所があり金額の協議中と主張されている」など、相手の主張を客観的に記入してください。"
                                />
                            </div>

                            {/* エビデンス添付 */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-800">
                                    裏付け資料の添付（請求書、督促状、同意書等） <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    multiple
                                    required
                                    onChange={handleFileChange}
                                    className="block w-full text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer border border-slate-200 rounded-xl p-2 bg-slate-50"
                                />
                                <p className="text-[11px] text-slate-500">
                                    ※PDFまたは画像ファイルを添付してください。管理者の審査時にエビデンスとして確認されます。
                                </p>
                            </div>

                            {/* 同意チェックボックス */}
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <div className="text-xs font-bold text-slate-900">
                                    登録に関する宣誓・同意
                                </div>
                                
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={agreedRule1}
                                        onChange={(e) => setAgreedRule1(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                    />
                                    <span className="text-xs text-slate-700">
                                        取引開始時に所定の同意書を取得済みであり、エビデンス資料を添付しています。
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={agreedRule2}
                                        onChange={(e) => setAgreedRule2(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                    />
                                    <span className="text-xs text-slate-700">
                                        主観的な評価や誹謗中傷は含まず、客観的な請求・支払遅延の事実のみを記録しています。
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={agreedRule3}
                                        onChange={(e) => setAgreedRule3(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                    />
                                    <span className="text-xs text-slate-700">
                                        相手方から代金の支払いがあった場合は、5営業日以内に「解決済み（入金完了）」へ更新します。
                                    </span>
                                </label>
                            </div>

                            {errorMsg && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                                    <span>⚠️</span>
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="btn-primary w-full py-4 text-base font-bold shadow-md hover:shadow-lg transition-all"
                                >
                                    {uploading ? "エビデンス送信中..." : "未払い企業情報を審査申請する"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </RequireAuth>
    );
}
