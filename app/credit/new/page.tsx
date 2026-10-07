"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    ShieldAlert, 
    ArrowLeft, 
    Upload, 
    AlertCircle, 
    AlertTriangle,
    Check, 
    FileText,
    Building2,
    Calendar,
    Coins,
    X
} from "lucide-react";
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
    
    // 営業実態ステータス & 公的登記ステータス
    const [businessStatus, setBusinessStatus] = useState<string>("unreachable");
    const [registryStatus, setRegistryStatus] = useState<string>("active");
    const [registryCloseDate, setRegistryCloseDate] = useState<string>("");
    const [registryCloseCause, setRegistryCloseCause] = useState<string>("");
    const [isSoleProprietor, setIsSoleProprietor] = useState(false);
    
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
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
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
        if (!isSoleProprietor && (!cleanCorpNum || cleanCorpNum.length !== 13)) {
            setErrorMsg("法人の場合は法人番号（13桁の半角数字）を入力してください。個人事業主の場合は「個人事業主・一人親方」にチェックを入れてください。");
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
                    corporateNumber: isSoleProprietor ? null : (cleanCorpNum || null),
                    location: location.trim() || null,
                    invoiceDate: invoiceDate || null,
                    amount: numAmount,
                    dueDate: dueDate,
                    counterpartyClaim: counterpartyClaim.trim() || null,
                    evidenceUrls: uploadedUrls,
                    businessStatus: businessStatus,
                    registryStatus: isSoleProprietor ? "sole_proprietor" : registryStatus,
                    registryCloseDate: registryCloseDate || null,
                    registryCloseCause: registryCloseCause || null
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "登録申請に失敗しました");
            }

            alert("企業信用（遅延・未払い）情報の登録申請を受け付けました。\n運営管理者による事実確認・審査を経てシステム全体に共有されます。");
            router.push("/credit");

        } catch (err: any) {
            setErrorMsg(err.message || "予期せぬエラーが発生しました");
        } finally {
            setUploading(false);
        }
    };

    // 法人番号入力時の自動照会（公的ステータスチェック）
    const handleCorporateNumberChange = async (num: string) => {
        const clean = num.replace(/[^0-9]/g, "");
        setCorporateNumber(clean);
        if (clean.length === 13) {
            try {
                const res = await fetch(`/api/credit/corporate-lookup?number=${clean}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.found && data.name) {
                        if (!companyName) setCompanyName(data.name);
                        if (data.registry_status) {
                            setRegistryStatus(data.registry_status);
                            setRegistryCloseDate(data.registry_close_date || "");
                            setRegistryCloseCause(data.registry_close_cause || "");
                        }
                    }
                }
            } catch (err) {
                console.warn("Corporate lookup silent error:", err);
            }
        }
    };

    return (
        <RequireAuth>
            <div className="min-h-screen pt-16 sm:pt-20 md:pt-10 pb-16 px-3.5 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-3xl w-full">

                    {/* ナビゲーション */}
                    <div className="flex items-center justify-between mb-4 sm:mb-6 animate-fade-in flex-wrap gap-2.5">
                        <Link 
                            href="/credit" 
                            className="btn-secondary text-xs h-9 px-3 sm:px-3.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap shrink-0"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                            <span className="whitespace-nowrap">企業信用照会へ戻る</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest font-mono">
                                MIERIS CREDIT
                            </span>
                            <span className="text-slate-300 text-xs">|</span>
                            <span className="text-xs text-slate-500 font-semibold tracking-wide">
                                取引先信用情報共有システム
                            </span>
                        </div>
                    </div>

                    {/* 見出し */}
                    <div className="mb-6 sm:mb-8 animate-fade-in">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            企業信用（遅延・未払い）情報の登録申請
                        </h1>
                        <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                            客観的な請求事実と裏付け資料に基づき、未払い・支払遅延の事実を記録・申請します。
                        </p>
                    </div>

                    {/* コンプライアンス遵守ボックス（確実に視認可能なコントラスト設計） */}
                    <div className="bg-slate-900 text-slate-100 p-4.5 sm:p-6 rounded-xl mb-6 shadow-2xs border border-slate-800 animate-fade-in">
                        <div className="flex items-center gap-2.5 mb-2.5 sm:mb-3 border-b border-slate-800 pb-2.5 sm:pb-3">
                            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                            <span className="text-xs sm:text-sm font-bold tracking-wide text-white">
                                「晒す」仕組みにしないための6つの運用ルール
                            </span>
                        </div>
                        <ul className="text-xs space-y-2 text-slate-300 list-disc list-inside leading-relaxed">
                            <li><strong className="text-white font-bold">同意書のない相手は登録できません</strong>（取引開始時に署名を得た同意書が必要です）</li>
                            <li><strong className="text-white font-bold">評価・推測・伝聞は禁止</strong>（「悪質」「危ない」といった主観的表現は審査で却下されます）</li>
                            <li><strong className="text-white font-bold">登録理由（未払い・遅延の経緯）および相手側の主張を必ず記録</strong>してください（客観性を担保するため、未払いに至る経緯と相手側から提示された言い分や主張内容も明記が必要です）</li>
                            <li><strong className="text-white font-bold">入金されたら5営業日以内に更新</strong>（「解決済み（遅延○日）」と表示更新されます）</li>
                            <li><strong className="text-white font-bold">全件、運営管理者の厳格なエビデンス審査</strong>を経てから共有されます</li>
                        </ul>
                    </div>

                    {/* 申請フォーム */}
                    <div className="bg-white p-4.5 sm:p-9 rounded-2xl border border-slate-200 shadow-2xs animate-fade-in">
                        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">

                            {/* 対象企業名 */}
                            <div className="space-y-1.5 sm:space-y-2">
                                <label className="text-xs sm:text-sm font-bold text-slate-800 flex items-center justify-between">
                                    <span>対象企業名（商号） <span className="text-red-500">*</span></span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="input-field py-2.5 sm:py-3 text-sm sm:text-base"
                                    placeholder="例: 株式会社〇〇工務店"
                                />
                            </div>

                            {/* 法人番号 & 所在地 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5 sm:space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs sm:text-sm font-bold text-slate-800">
                                            法人番号（13桁） {!isSoleProprietor && <span className="text-red-500">*</span>}
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={isSoleProprietor}
                                                onChange={(e) => {
                                                    setIsSoleProprietor(e.target.checked);
                                                    if (e.target.checked) {
                                                        setRegistryStatus("sole_proprietor");
                                                    } else {
                                                        setRegistryStatus("active");
                                                    }
                                                }}
                                                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                            />
                                            <span className="font-semibold text-slate-700">個人事業主・一人親方</span>
                                        </label>
                                    </div>
                                    <input
                                        type="text"
                                        disabled={isSoleProprietor}
                                        required={!isSoleProprietor}
                                        maxLength={13}
                                        value={isSoleProprietor ? "" : corporateNumber}
                                        onChange={(e) => handleCorporateNumberChange(e.target.value)}
                                        className={`input-field font-mono py-2.5 sm:py-3 text-sm sm:text-base ${
                                            isSoleProprietor ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""
                                        }`}
                                        placeholder={isSoleProprietor ? "（法人番号なし・個人事業主）" : "例: 1234567890123"}
                                    />
                                    {/* 登記閉鎖検知バナー */}
                                    {registryStatus === "closed" && (
                                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                                            <span>
                                                <strong>公的データ検知:</strong> この法人はすでに登記閉鎖（{registryCloseCause || "清算結了等"}）されています
                                            </span>
                                        </div>
                                    )}
                                    {isSoleProprietor && (
                                        <p className="text-[10px] sm:text-[11px] text-blue-600 font-medium">
                                            ※個人事業主・一人親方（屋号）として登録されます
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5 sm:space-y-2">
                                    <label className="text-xs sm:text-sm font-bold text-slate-800">
                                        本社所在地 / 現場拠点
                                    </label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="input-field py-2.5 sm:py-3 text-sm sm:text-base"
                                        placeholder="例: 東京都千代田区〇〇1-2-3"
                                    />
                                </div>
                            </div>

                            {/* 相手先の現在の営業実態ステータス（一人親方・未払い現場対策） */}
                            <div className="p-4 sm:p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        <span>相手先の現在の営業状況・連絡状況 <span className="text-red-500">*</span></span>
                                    </label>
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                                        信用リスク判定
                                    </span>
                                </div>
                                <p className="text-xs text-amber-900/80 leading-relaxed">
                                    未払い発生後の相手方の現状を選択してください。他社が照会する際の重要なリスク指標になります。
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                                    {[
                                        { id: "unreachable", label: "音信不通", desc: "電話不通・LINE等ブロック", badge: "高リスク", color: "border-red-300 bg-white hover:border-red-500" },
                                        { id: "relocated", label: "事務所引き払い・夜逃げ", desc: "拠点不在・行方不明", badge: "極めて危険", color: "border-rose-300 bg-white hover:border-rose-500" },
                                        { id: "bankrupt", label: "破産・倒産手続き中", desc: "弁護士等からの通知受領", badge: "回収困難", color: "border-purple-300 bg-white hover:border-purple-500" },
                                        { id: "active", label: "連絡可能（督促中）", desc: "連絡はつくが支払拒絶・延期", badge: "協議中", color: "border-amber-300 bg-white hover:border-amber-500" },
                                        { id: "unknown", label: "現状不明", desc: "最新状況は未確認", badge: "不明", color: "border-slate-300 bg-white hover:border-slate-400" },
                                    ].map((opt) => (
                                        <label
                                            key={opt.id}
                                            onClick={() => setBusinessStatus(opt.id)}
                                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${opt.color} ${
                                                businessStatus === opt.id
                                                    ? "ring-2 ring-blue-600 border-blue-600 bg-blue-50/50 shadow-xs"
                                                    : "opacity-80 hover:opacity-100"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                                                <input
                                                    type="radio"
                                                    name="businessStatus"
                                                    value={opt.id}
                                                    checked={businessStatus === opt.id}
                                                    onChange={() => setBusinessStatus(opt.id)}
                                                    className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-500 leading-tight">{opt.desc}</p>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* 未払い金額 & 支払期日 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200">
                                <div className="space-y-1.5 sm:space-y-2">
                                    <label className="text-xs sm:text-sm font-bold text-slate-800">
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
                                            className="input-field pl-8 font-extrabold text-base sm:text-lg"
                                            placeholder="1,500,000"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5 sm:space-y-2">
                                    <label className="text-xs sm:text-sm font-bold text-slate-800">
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

                            {/* 登録理由 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-slate-800">
                                        登録理由（未払い・遅延の経緯・相手側の主張）
                                    </label>
                                    <span className="text-xs text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                        ※客観的な経緯と相手側の主張をご記入ください
                                    </span>
                                </div>
                                <textarea
                                    rows={4}
                                    value={counterpartyClaim}
                                    onChange={(e) => setCounterpartyClaim(e.target.value)}
                                    className="input-field py-2.5 resize-none text-sm"
                                    placeholder="例: 「支払期日を過ぎても入金がなく、複数回の督促に対して『社内精査中』『資金調達中』と回答されている」「納品完了後に相手側より『検収内容に疑義がある』と主張され残金の支払いを拒絶されている」「連絡を試みているが担当者不在を理由に折り返しがない」など、未払い・遅延に至った客観的な経緯および相手側からの主張・言い分をご記入ください。"
                                />
                                <p className="text-[11px] text-slate-500">
                                    ※一方的な申立てを防ぎ審査の客観性を保つため、未払い・遅延に至った経緯に加え、相手企業から提示された理由・言い分・反論（または連絡不通などの実態）についても併せてご記載ください。
                                </p>
                            </div>

                            {/* エビデンス添付 */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <FileText className="w-4 h-4 text-slate-600" />
                                        <span>裏付け資料の添付（請求書、督促状、同意書等）</span>
                                    </div>
                                    <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-bold">必須</span>
                                </label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                    <input
                                        type="file"
                                        multiple
                                        required={files.length === 0}
                                        onChange={handleFileChange}
                                        className="block w-full text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-2">
                                        ※PDFまたは画像ファイルを添付してください。管理者の審査時にエビデンスとして確認されます。
                                    </p>

                                    {files.length > 0 && (
                                        <ul className="mt-3 space-y-1.5 pt-3 border-t border-slate-200">
                                            {files.map((file, index) => (
                                                <li key={index} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                                                    <span className="truncate max-w-[70%] text-slate-700 font-medium">
                                                        {file.name} ({(file.size / 1024).toFixed(0)}KB)
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(index)}
                                                        className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                        <span>削除</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* 同意チェックボックス */}
                            <div className="space-y-3 pt-4 border-t border-slate-100">
                                <div className="text-xs font-bold text-slate-900">
                                    登録に関する宣誓・同意
                                </div>
                                
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={agreedRule1}
                                        onChange={(e) => setAgreedRule1(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                    />
                                    <span className="text-xs text-slate-700 group-hover:text-slate-900 leading-relaxed">
                                        取引開始時に所定の同意書を取得済みであり、エビデンス資料を添付しています。
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={agreedRule2}
                                        onChange={(e) => setAgreedRule2(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                    />
                                    <span className="text-xs text-slate-700 group-hover:text-slate-900 leading-relaxed">
                                        主観的な評価や誹謗中傷は含まず、客観的な請求・支払遅延の事実のみを記録しています。
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={agreedRule3}
                                        onChange={(e) => setAgreedRule3(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                    />
                                    <span className="text-xs text-slate-700 group-hover:text-slate-900 leading-relaxed">
                                        相手方から代金の支払いがあった場合は、5営業日以内に「解決済み（入金完了）」へ更新します。
                                    </span>
                                </label>
                            </div>

                            {errorMsg && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2.5">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="btn-primary w-full py-3.5 sm:py-4 text-sm sm:text-base font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                                            <span>エビデンス送信中...</span>
                                        </>
                                    ) : (
                                        <span>信用情報を審査申請する</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </RequireAuth>
    );
}
