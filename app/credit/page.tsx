"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";
import { Toast, ToastMessage } from "@/components/Toast";
import { 
    Search, 
    Plus, 
    ShieldCheck, 
    AlertTriangle, 
    CheckCircle2, 
    Lock, 
    Building2, 
    FileText, 
    ArrowRight,
    ArrowLeft,
    Info,
    FileCheck,
    AlertCircle,
    BookmarkCheck
} from "lucide-react";

type CreditCase = {
    id: string;
    company_name: string;
    corporate_number?: string | null;
    location?: string | null;
    invoice_date?: string | null;
    amount: number;
    due_date: string;
    payment_status: "unpaid" | "resolved";
    resolved_delay_days?: number | null;
    counterparty_claim?: string | null;
    status: "pending" | "approved" | "rejected";
    business_status?: string | null;
    registry_status?: string | null;
    registry_close_date?: string | null;
    registry_close_cause?: string | null;
    created_at: string;
};

// 公的登記ステータスバッジ
const renderRegistryBadge = (status?: string | null, closeCause?: string | null) => {
    switch (status) {
        case "closed":
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                    <span>公的登記: 閉鎖（{closeCause || "清算結了等"}）</span>
                </span>
            );
        case "sole_proprietor":
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                    <span>個人事業主（法人登記なし）</span>
                </span>
            );
        case "active":
        default:
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <span>公的登記: 登記中（存続）</span>
                </span>
            );
    }
};

// 相手方の営業実態バッジ（被害企業報告）
const renderBusinessStatusBadge = (status?: string | null) => {
    switch (status) {
        case "unreachable":
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <span>営業実態: 音信不通（連絡拒絶）</span>
                </span>
            );
        case "relocated":
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    <span>営業実態: 夜逃げ・事務所閉鎖</span>
                </span>
            );
        case "bankrupt":
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-slate-900 text-rose-300 border border-slate-700 font-extrabold">
                    <span>営業実態: 倒産・破産手続き中</span>
                </span>
            );
        case "active":
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span>営業実態: 連絡可能（協議中）</span>
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    <span>営業実態: 不明・未申告</span>
                </span>
            );
    }
};

export default function CreditSearchPage() {
    const router = useRouter();
    const [cases, setCases] = useState<CreditCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchedCorp, setSearchedCorp] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [corpFilter, setCorpFilter] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastMessage | null>(null);
    
    // サマリー用
    const [totalCases, setTotalCases] = useState(0);
    const [unpaidCount, setUnpaidCount] = useState(0);
    const [resolvedCount, setResolvedCount] = useState(0);

    // ウォッチリスト監視用
    const [isWatched, setIsWatched] = useState(false);
    const [watchLoading, setWatchLoading] = useState(false);
    const [discoveredCompanyName, setDiscoveredCompanyName] = useState("");

    // 国税庁lookup照会結果（該当なし時の閉鎖検知用）
    const [lookupRegistryStatus, setLookupRegistryStatus] = useState<string | null>(null);
    const [lookupCloseDetails, setLookupCloseDetails] = useState<{ date?: string; cause?: string } | null>(null);

    // プラン制限チェック用
    const [planRestricted, setPlanRestricted] = useState(false);

    // 期日超過日数の計算
    const calculateOverdueDays = (dueDateStr?: string | null) => {
        if (!dueDateStr) return 0;
        const due = new Date(dueDateStr).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - due) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    };

    // 初期化: プラン確認と統計サマリーの取得
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const session = (await supabase.auth.getSession()).data.session;
                if (!session) return;

                // ユーザーのプラン権限をチェック
                const { data: appUser } = await supabase
                    .from("app_users")
                    .select("allowed_plan, role")
                    .eq("id", session.user.id)
                    .single();

                if (appUser && appUser.allowed_plan === "employment" && appUser.role !== "admin") {
                    setPlanRestricted(true);
                    setLoading(false);
                    return;
                }

                // 統計サマリーのみ取得（件数集計用）
                const res = await fetch("/api/credit-cases", {
                    headers: {
                        "Authorization": `Bearer ${session.access_token}`
                    }
                });

                if (res.ok) {
                    const data = await res.json();
                    const fetchedCases: CreditCase[] = data.cases || [];
                    
                    let unpaid = 0;
                    let resolved = 0;

                    fetchedCases.forEach((c) => {
                        if (c.payment_status === "unpaid") {
                            unpaid++;
                        } else if (c.payment_status === "resolved") {
                            resolved++;
                        }
                    });

                    setTotalCases(fetchedCases.length);
                    setUnpaidCount(unpaid);
                    setResolvedCount(resolved);
                }
            } catch (e) {
                console.error("Credit cases init error:", e);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, []);

    // 法人番号必須の照会実行
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        // 全角数字を半角に正規化し、数字のみ抽出
        const normalizedCorp = corpFilter
            .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
            .replace(/[^0-9]/g, "");

        if (!normalizedCorp) {
            const msg = "照会対象企業の法人番号（13桁）を入力してください。";
            setErrorMsg(msg);
            setToast({ type: "error", text: msg });
            return;
        }

        if (normalizedCorp.length !== 13) {
            const msg = "法人番号は13桁の半角数字で入力してください。";
            setErrorMsg(msg);
            setToast({ type: "error", text: msg });
            return;
        }

        setSearching(true);
        setHasSearched(false);
        setCases([]);
        setLookupRegistryStatus(null);
        setLookupCloseDetails(null);

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) {
                setErrorMsg("認証セッションが見つかりません。再度ログインしてください。");
                setSearching(false);
                return;
            }

            const params = new URLSearchParams();
            params.append("corp", normalizedCorp);
            if (searchQuery.trim()) {
                params.append("q", searchQuery.trim());
            }

            const res = await fetch(`/api/credit-cases?${params.toString()}`, {
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "データの照会に失敗しました。");
            }

            const data = await res.json();
            const fetchedCases: CreditCase[] = data.cases || [];

            setCases(fetchedCases);
            setHasSearched(true);
            setSearchedCorp(normalizedCorp);

            // ウォッチリスト登録状況の確認と社名・登記ステータス補完
            checkWatchlistStatus(normalizedCorp, fetchedCases);

            // 照会監査ログの保存 (POST /api/audit)
            try {
                await fetch("/api/audit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        action_type: "SEARCH_CREDIT",
                        target_id: `法人番号: ${normalizedCorp}${searchQuery.trim() ? ` (${searchQuery.trim()})` : ""}`
                    })
                });
            } catch (auditErr) {
                console.error("Audit log error:", auditErr);
            }

        } catch (err: any) {
            setErrorMsg(err.message || "照会中にエラーが発生しました。");
            setToast({ type: "error", text: err.message || "照会中にエラーが発生しました。" });
        } finally {
            setSearching(false);
        }
    };

    // 照会対象のウォッチリスト状況チェック & 国税庁登記ステータス確認
    const checkWatchlistStatus = async (corpNum: string, currentCases: CreditCase[]) => {
        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) return;

            const res = await fetch("/api/credit/watchlist", {
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                const list = data.watchlist || [];
                const watched = list.some((item: any) => item.corporate_number === corpNum);
                setIsWatched(watched);
            }

            // 国税庁lookupを呼び出して、登記ステータス（存続/閉鎖/清算等）と社名を取得
            try {
                const lookupRes = await fetch(`/api/credit/corporate-lookup?number=${corpNum}`);
                if (lookupRes.ok) {
                    const lookupData = await lookupRes.json();
                    if (lookupData.found) {
                        if (lookupData.name && !discoveredCompanyName) {
                            setDiscoveredCompanyName(lookupData.name);
                        }
                        if (lookupData.registry_status) {
                            setLookupRegistryStatus(lookupData.registry_status);
                        }
                        if (lookupData.close_date || lookupData.close_cause) {
                            setLookupCloseDetails({
                                date: lookupData.close_date,
                                cause: lookupData.close_cause
                            });
                        }
                    }
                }
            } catch (lookupErr) {
                console.error("Corporate lookup error:", lookupErr);
            }

            // currentCasesから社名補完
            if (currentCases.length > 0 && currentCases[0].company_name) {
                setDiscoveredCompanyName(currentCases[0].company_name);
            } else if (searchQuery.trim() && !discoveredCompanyName) {
                setDiscoveredCompanyName(searchQuery.trim());
            }
        } catch (e) {
            console.error("Watchlist check error:", e);
        }
    };

    // ウォッチリスト登録・解除トグル
    const handleToggleWatchlist = async () => {
        if (!searchedCorp) return;
        setWatchLoading(true);

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) {
                setToast({ type: "error", text: "再度ログインしてください。" });
                return;
            }

            if (isWatched) {
                // 解除
                const res = await fetch(`/api/credit/watchlist?corp=${searchedCorp}`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${session.access_token}`
                    }
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || "ウォッチ解除に失敗しました。");
                }

                setIsWatched(false);
                setToast({ type: "success", text: "取引先ウォッチを解除しました。" });
            } else {
                // 登録
                const targetName = discoveredCompanyName || searchQuery.trim() || `法人番号: ${searchedCorp}`;
                const res = await fetch("/api/credit/watchlist", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        corporate_number: searchedCorp,
                        company_name: targetName,
                        notes: "信用照会画面からウォッチ登録"
                    })
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || "ウォッチ登録に失敗しました。");
                }

                setIsWatched(true);
                setToast({ type: "success", text: `「${targetName}」を取引先ウォッチリストに登録しました。` });
            }
        } catch (err: any) {
            setToast({ type: "error", text: err.message || "処理に失敗しました。" });
        } finally {
            setWatchLoading(false);
        }
    };

    return (
        <RequireAuth>
            <Toast toast={toast} onClose={() => setToast(null)} />

            <div className="min-h-screen pt-16 sm:pt-20 md:pt-10 pb-16 px-3.5 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-6xl w-full">

                    {/* ヘッダーエリア */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-slate-200">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-widest font-mono">
                                    MIERIS CREDIT
                                </span>
                                <span className="text-slate-300 text-xs">|</span>
                                <span className="text-xs text-slate-500 font-semibold tracking-wide">
                                    取引先信用情報共有システム
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                企業信用 検索・照会
                            </h1>
                            <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                                取引開始前に事実を確認し、代金未回収・支払い遅延リスクを未然に防ぎます。
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 w-full md:w-auto">
                            <Link 
                                href="/dashboard" 
                                className="btn-secondary text-xs h-9 px-3 sm:px-3.5 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-colors whitespace-nowrap"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                                <span>戻る</span>
                            </Link>
{/*                             <Link 
                                href="/credit/watchlist" 
                                className="btn-secondary text-xs h-9 px-3 sm:px-3.5 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-colors whitespace-nowrap text-slate-700 hover:text-blue-600 hover:border-blue-200"
                            >
                                <BookmarkCheck className="w-4 h-4 text-blue-600 shrink-0" />
                                <span>取引先ウォッチ</span>
                            </Link> */}
                            <Link
                                href="/credit/new"
                                className="btn-primary flex items-center justify-center gap-1.5 px-3 sm:px-4 h-9 rounded-lg font-bold text-xs shadow-xs hover:-translate-y-0.5 transition-all whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4 shrink-0" />
                                <span>遅延・未払いを新規登録</span>
                            </Link>
                        </div>
                    </div>

                    {/* プラン制限の場合の案内 */}
                    {planRestricted ? (
                        <div className="bg-white p-6 sm:p-10 rounded-xl border border-slate-200 text-center max-w-xl mx-auto my-8 sm:my-12 shadow-sm animate-fade-in">
                            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-amber-600 border border-amber-200/60">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                                ミエリスクレジット 未加入プランです
                            </h2>
                            <p className="text-xs text-slate-600 leading-relaxed mb-6">
                                現在のアカウントは「就業情報プラン」のため、企業信用情報の照会・登録をご利用いただけません。<br />
                                「ミエリスクレジット」または「両方セットプラン」へのアップグレードで、全データをご利用いただけます。
                            </p>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-700 max-w-md mx-auto mb-6 text-left space-y-1.5">
                                <div className="font-bold text-slate-900 mb-1">【プラン変更のご案内】</div>
                                <div>・ミエリスクレジット単体: 月額 15,000円</div>
                                <div>・就業情報 ＋ クレジット 両方セット: 月額 30,000円（おすすめ）</div>
                            </div>
                            <Link href="/contact" className="btn-primary px-6 py-2.5 rounded-lg font-bold text-xs inline-block">
                                プラン変更をお問い合わせ
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* 統計サマリーカード */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
                                    <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
                                        <span className="text-xs font-bold tracking-wider text-slate-600">事故情報 登録企業</span>
                                        <Building2 className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
                                            {totalCases}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 ml-1">社 / 件</span>
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">過去に未払い・遅延の発生が報告された企業</p>
                                </div>

                                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
                                    <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
                                        <span className="text-xs font-bold tracking-wider text-rose-700">現在未払い（要注意）</span>
                                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-rose-600 font-mono tabular-nums">
                                            {unpaidCount}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 ml-1">社</span>
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">現在も代金未回収・支払拒絶が継続中</p>
                                </div>

                                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
                                    <div className="flex items-center justify-between text-slate-500 mb-1.5 sm:mb-2">
                                        <span className="text-xs font-bold tracking-wider text-emerald-700">遅延後解決（入金完了）</span>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-600 font-mono tabular-nums">
                                            {resolvedCount}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 ml-1">件</span>
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">支払遅延が発生したがその後全額回収完了</p>
                                </div>
                            </div>

                            {/* 照会条件カード（法人番号必須） */}
                            <div className="bg-white p-4.5 sm:p-7 rounded-xl border border-slate-200 shadow-2xs mb-6">
                                <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed mb-5">
                                    ※同名企業との誤認防止および信用情報の適正管理の観点から、照会には<strong>「法人番号（13桁）」</strong>の入力が必須となっています。
                                </div>

                                {errorMsg && (
                                    <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                                        <div className="text-xs font-semibold leading-relaxed">
                                            {errorMsg}
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSearch} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* 法人番号（必須） */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="text-xs font-bold text-slate-700">
                                                    法人番号（13桁）
                                                </label>
                                                <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-bold">
                                                    必須
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                maxLength={13}
                                                inputMode="numeric"
                                                value={corpFilter}
                                                onChange={(e) => {
                                                    // 数字と全角数字のみ許可
                                                    const val = e.target.value;
                                                    setCorpFilter(val);
                                                }}
                                                placeholder="例: 1234567890123 (半角数字13桁)"
                                                className="input-field font-mono py-2.5 text-sm"
                                            />
                                            <p className="text-[11px] text-slate-500 mt-1">
                                                国税庁が指定した13桁の法人番号を入力してください（ハイフン不要）
                                            </p>
                                        </div>

                                        {/* 企業名・商号（任意） */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <label className="text-xs font-bold text-slate-700">
                                                    企業名・商号 または 所在地
                                                </label>
                                                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                                                    任意
                                                </span>
                                            </div>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="例: 株式会社〇〇建設、東京都中央区..."
                                                className="input-field py-2.5 text-sm"
                                            />
                                            <p className="text-[11px] text-slate-500 mt-1">
                                                法人番号と併せて企業名で絞り込む場合に入力します
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={searching}
                                            className="btn-primary w-full sm:w-auto px-8 h-[44px] text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-transform"
                                        >
                                            {searching ? (
                                                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" />
                                            ) : (
                                                <Search className="w-4 h-4" />
                                            )}
                                            <span>{searching ? "信用情報を照会中..." : "企業信用情報を照会する"}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* 結果表示エリア */}
                            {searching ? (
                                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-2xs">
                                    <div className="animate-spin h-8 w-8 border-3 border-slate-200 rounded-full border-t-slate-900 mb-3"></div>
                                    <p className="text-xs text-slate-500 font-medium">データベース照会中...</p>
                                </div>
                            ) : !hasSearched ? (
                                /* 初期状態（未検索時）のガイドカード */
                                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                                    <div className="p-6 sm:p-8 text-center border-b border-slate-100 bg-slate-50/50">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-900 mb-3 border border-slate-200">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1 leading-snug">
                                            照会対象企業の「法人番号」を入力して照会してください
                                        </h3>
                                        <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed mt-1">
                                            本システムは厳格な信用情報管理のため、13桁の法人番号による特定照会を採用しています。上記の入力欄に法人番号を入力して「企業信用情報を照会する」を押してください。
                                        </p>
                                    </div>

                                    {/* 業務サポート・安全取引ガイド */}
                                    <div className="p-4.5 sm:p-6 bg-white">
                                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3.5 sm:mb-4 flex items-center gap-1.5">
                                            <Info className="w-4 h-4 text-slate-900" />
                                            <span>取引前の安全対策チェックポイント</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                                            <div className="p-3.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200/80">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                                                    <FileCheck className="w-4 h-4 text-slate-900 shrink-0" />
                                                    <span>1. 同意書の事前取得</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    取引開始時に信用情報共有に関する同意書へ署名を取得しておくことで、万が一の未払い時に本システムへ登録が可能になります。
                                                </p>
                                            </div>

                                            <div className="p-3.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200/80">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                                                    <FileText className="w-4 h-4 text-slate-900 shrink-0" />
                                                    <span>2. 客観的証憑の保管</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    発注書、納品書、請求書、支払期日の通知メールなど、法的・客観的に請求権を裏付ける証憑を保管してください。
                                                </p>
                                            </div>

                                            <div className="p-3.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200/80">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                                                    <AlertTriangle className="w-4 h-4 text-slate-900 shrink-0" />
                                                    <span>3. 期日超過時の速やかな登録</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    支払期日を経過しても入金がない場合は、加盟企業全体の債権保全のため、速やかに右上の「新規登録」より申請を行ってください。
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : cases.length === 0 ? (
                                /* 検索後・該当なし（安全・または登記閉鎖アラート） */
                                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                                    <div className="p-6 sm:p-8 text-center border-b border-slate-100 bg-slate-50/50">
                                        {lookupRegistryStatus === "closed" ? (
                                            <>
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-50 text-rose-600 mb-3 border border-rose-200/80">
                                                    <AlertTriangle className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-sm sm:text-base font-bold text-rose-800 mb-1">
                                                    注意: 公的登記がすでに閉鎖（清算・解散）されています
                                                </h3>
                                                <div className="flex flex-wrap items-center justify-center gap-2 mt-1 mb-2">
                                                    {discoveredCompanyName && (
                                                        <span className="text-sm font-bold text-slate-800">
                                                            {discoveredCompanyName}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-500 font-mono">
                                                        (法人番号: {searchedCorp})
                                                    </span>
                                                </div>
                                                <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 mb-3">
                                                    国税庁登記情報: 閉鎖（{lookupCloseDetails?.cause || "清算結了等"}）{lookupCloseDetails?.date ? ` / 閉鎖日: ${lookupCloseDetails.date}` : ""}
                                                </div>
                                                <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed mb-4">
                                                    過去の未払い登録自体はありませんが、<strong>国税庁の法人登記データ上ですでに法人活動が終了（倒産・清算結了）</strong>しています。取引や債権回収の際は極めて高い警戒が必要です。
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-200/60">
                                                    <ShieldCheck className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                                                    該当する遅延・未払い企業情報はありません
                                                </h3>
                                                <div className="flex flex-wrap items-center justify-center gap-2 mt-1 mb-2">
                                                    {discoveredCompanyName && (
                                                        <span className="text-sm font-bold text-slate-800">
                                                            {discoveredCompanyName}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-slate-500 font-mono">
                                                        (法人番号: {searchedCorp})
                                                    </span>
                                                </div>
                                                <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 mb-3">
                                                    公的登記ステータス: 登記中（存続企業）
                                                </div>
                                                <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed mb-4">
                                                    データベース上に該当する未払い・支払遅延の記録は存在しません。安心してお取引をご検討いただけます。
                                                </p>
                                            </>
                                        )}

{/*                                         {/* ウォッチ登録カード */}
                                        <div className="mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-100 max-w-lg mx-auto flex flex-col sm:flex-row items-center justify-between gap-3.5 text-left">
                                            <div className="flex-1">
                                                <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                                                    <BookmarkCheck className="w-4 h-4 text-blue-600 shrink-0" />
                                                    <span>取引先ウォッチ（アラート監視）</span>
                                                </div>
                                                <p className="text-[11px] text-blue-700/80 mt-1 leading-snug">
                                                    監視リストに追加すると、今後の未払いトラブル発生時に自動で通知・アラートされます。
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleToggleWatchlist}
                                                disabled={watchLoading}
                                                className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                                                    isWatched
                                                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                                        : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                                                }`}
                                            >
                                                {watchLoading ? (
                                                    <div className="animate-spin h-3.5 w-3.5 border-2 border-white rounded-full border-t-transparent" />
                                                ) : isWatched ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                ) : (
                                                    <Plus className="w-3.5 h-3.5" />
                                                )}
                                                <span>{isWatched ? "ウォッチ中（監視継続）" : "ウォッチリストに登録"}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* 業務サポート・安全取引ガイド */}
                                    <div className="p-4.5 sm:p-6 bg-white">
                                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3.5 sm:mb-4 flex items-center gap-1.5">
                                            <Info className="w-4 h-4 text-slate-900" />
                                            <span>取引前の安全対策チェックポイント</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                                            <div className="p-3.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200/80">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                                                    <FileCheck className="w-4 h-4 text-slate-900 shrink-0" />
                                                    <span>1. 同意書の事前取得</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    取引開始時に信用情報共有に関する同意書へ署名を取得しておくことで、万が一の未払い時に本システムへ登録が可能になります。
                                                </p>
                                            </div>

                                            <div className="p-3.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200/80">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                                                    <FileText className="w-4 h-4 text-slate-900 shrink-0" />
                                                    <span>2. 客観的証憑の保管</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    発注書、納品書、請求書、支払期日の通知メールなど、法的・客観的に請求権を裏付ける証憑を保管してください。
                                                </p>
                                            </div>

                                            <div className="p-3.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200/80">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                                                    <AlertTriangle className="w-4 h-4 text-slate-900 shrink-0" />
                                                    <span>3. 期日超過時の速やかな登録</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    支払期日を経過しても入金がない場合は、加盟企業全体の債権保全のため、速やかに右上の「新規登録」より申請を行ってください。
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* 検索後・該当あり（警告・事故情報表示） */
                                <div>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                        <span className="text-xs font-bold text-slate-700">
                                            照会結果: {cases.length} 件の記録が見つかりました（法人番号: <span className="font-mono">{searchedCorp}</span>）
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleToggleWatchlist}
                                            disabled={watchLoading}
                                            className={`self-start sm:self-auto px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                                                isWatched
                                                    ? "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200"
                                                    : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                            }`}
                                        >
                                            {watchLoading ? (
                                                <div className="animate-spin h-3.5 w-3.5 border-2 border-current rounded-full border-t-transparent" />
                                            ) : isWatched ? (
                                                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                                <Plus className="w-3.5 h-3.5 text-blue-600" />
                                            )}
                                            <span>{isWatched ? "ウォッチリスト登録中（解除）" : "この企業をウォッチ登録"}</span>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {cases.map((c) => {
                                            const isResolved = c.payment_status === "resolved";
                                            return (
                                                <Link
                                                    key={c.id}
                                                    href={`/credit/${c.id}`}
                                                    className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all group flex flex-col justify-between"
                                                >
                                                    <div>
                                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 mb-2.5">
                                                            <div>
                                                                <h4 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                                                    <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                                                                    <span>{c.company_name}</span>
                                                                </h4>
                                                                {c.corporate_number ? (
                                                                    <p className="text-xs text-slate-500 font-mono mt-0.5 ml-5.5">
                                                                        法人番号: {c.corporate_number}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-[11px] text-amber-700 font-semibold mt-0.5 ml-5.5">
                                                                        ※個人事業主（法人番号なし）
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="shrink-0 self-start sm:self-auto">
                                                                {isResolved ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                        <CheckCircle2 className="w-3 h-3" />
                                                                        <span>遅延解決 {c.resolved_delay_days ? `(${c.resolved_delay_days}日)` : ""}</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                                        <AlertTriangle className="w-3 h-3" />
                                                                        <span>現在未払い {calculateOverdueDays(c.due_date) > 0 ? `(${calculateOverdueDays(c.due_date)}日超過)` : ""}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* 2軸ステータス表示（公的登記 & 営業実態） */}
                                                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                                            {renderRegistryBadge(c.registry_status, c.registry_close_cause)}
                                                            {renderBusinessStatusBadge(c.business_status)}
                                                        </div>

                                                        <div className="bg-slate-50 p-3 sm:p-3.5 rounded-lg border border-slate-200/80 mb-3 space-y-1.5 text-xs">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-slate-500 font-medium">請求金額</span>
                                                                <span className="text-slate-900 font-extrabold text-sm font-mono">¥{c.amount.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-slate-500 font-medium">当初支払期日</span>
                                                                <span className="font-mono text-slate-800">{c.due_date}</span>
                                                            </div>
                                                            {c.location && (
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-slate-500 font-medium">所在地</span>
                                                                    <span className="text-slate-800 truncate max-w-[200px]">{c.location}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {c.counterparty_claim && (
                                                            <p className="text-xs text-slate-600 line-clamp-2 mb-3 sm:mb-4 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                                                                <span className="font-bold text-slate-800">経緯: </span>
                                                                {c.counterparty_claim}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                                                        <span className="text-[11px] sm:text-xs">登録日: {new Date(c.created_at).toLocaleDateString()}</span>
                                                        <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                                            <span>事実詳細を確認</span>
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                        </span>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </RequireAuth>
    );
}
