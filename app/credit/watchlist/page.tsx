"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
    ArrowLeft, 
    ShieldAlert, 
    ShieldCheck, 
    Building2, 
    Plus, 
    Search, 
    Trash2, 
    AlertTriangle, 
    CheckCircle2, 
    ExternalLink, 
    Clock, 
    X,
    FileText,
    BookmarkCheck,
    Bell
} from "lucide-react";
import { Toast, ToastMessage } from "@/components/Toast";

type WatchlistItem = {
    id: string;
    corporate_number: string;
    company_name: string;
    notes?: string | null;
    created_at: string;
    status: "safe" | "warning";
    total_cases: number;
    unpaid_count: number;
    latest_unpaid?: {
        amount: number;
        due_date: string;
    } | null;
};

export default function CreditWatchlistPage() {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "warning" | "safe">("all");
    const [showAddModal, setShowAddModal] = useState(false);
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const [planRestricted, setPlanRestricted] = useState(false);
    const [tableNotReady, setTableNotReady] = useState(false);

    // 新規登録フォーム state
    const [newCorpNum, setNewCorpNum] = useState("");
    const [newCompanyName, setNewCompanyName] = useState("");
    const [newNotes, setNewNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fetchingCorp, setFetchingCorp] = useState(false);

    const fetchWatchlist = async () => {
        setLoading(true);
        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) return;

            const res = await fetch("/api/credit/watchlist", {
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });

            if (res.status === 403) {
                setPlanRestricted(true);
                return;
            }

            const data = await res.json();
            if (data.tableNotReady) {
                setTableNotReady(true);
                setWatchlist([]);
            } else {
                setTableNotReady(false);
                setWatchlist(data.watchlist || []);
            }
        } catch (e) {
            console.error("Fetch watchlist error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWatchlist();
    }, []);

    // 国税庁API自動取得
    const handleFetchCorporateName = async () => {
        const clean = newCorpNum.trim().replace(/[^0-9]/g, "");
        if (clean.length !== 13) {
            setToast({ type: "error", text: "法人番号は13桁の半角数字を入力してください。" });
            return;
        }

        setFetchingCorp(true);
        try {
            const res = await fetch(`https://api.houjin-bangou.nta.go.jp/4/num?id=K8yQd8Xq9L1zV&number=${clean}&type=12&history=0`);
            const xmlText = await res.text();
            const nameMatch = xmlText.match(/<name>(.*?)<\/name>/);
            if (nameMatch && nameMatch[1]) {
                setNewCompanyName(nameMatch[1]);
                setToast({ type: "success", text: `企業名「${nameMatch[1]}」を取得しました。` });
            } else {
                setToast({ type: "error", text: "企業名が見つかりませんでした。手動で入力してください。" });
            }
        } catch (e) {
            console.error(e);
            setToast({ type: "error", text: "国税庁API通信に失敗しました。企業名を手動で入力してください。" });
        } finally {
            setFetchingCorp(false);
        }
    };

    // 新規ウォッチ登録
    const handleAddWatchlist = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCorp = newCorpNum.trim().replace(/[^0-9]/g, "");
        if (cleanCorp.length !== 13) {
            setToast({ type: "error", text: "法人番号は13桁の半角数字で入力してください。" });
            return;
        }

        if (!newCompanyName.trim()) {
            setToast({ type: "error", text: "企業名を入力してください。" });
            return;
        }

        setIsSubmitting(true);
        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) return;

            const res = await fetch("/api/credit/watchlist", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    corporate_number: cleanCorp,
                    company_name: newCompanyName.trim(),
                    notes: newNotes.trim()
                })
            });

            const data = await res.json();
            if (res.ok) {
                setToast({ type: "success", text: `【${newCompanyName.trim()}】をウォッチリストに登録しました。` });
                setShowAddModal(false);
                setNewCorpNum("");
                setNewCompanyName("");
                setNewNotes("");
                fetchWatchlist();
            } else {
                setToast({ type: "error", text: "登録失敗: " + (data.error || "予期せぬエラー") });
            }
        } catch (e: any) {
            setToast({ type: "error", text: "登録失敗: " + e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ウォッチ解除
    const handleDeleteWatchlist = async (item: WatchlistItem) => {
        if (!confirm(`【${item.company_name}】のウォッチ監視を解除しますか？`)) return;

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) return;

            const res = await fetch(`/api/credit/watchlist?id=${item.id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });

            if (res.ok) {
                setToast({ type: "success", text: `【${item.company_name}】の監視を解除しました。` });
                setWatchlist(prev => prev.filter(w => w.id !== item.id));
            } else {
                const data = await res.json();
                setToast({ type: "error", text: "解除失敗: " + (data.error || "予期せぬエラー") });
            }
        } catch (e: any) {
            setToast({ type: "error", text: "解除失敗: " + e.message });
        }
    };

    // 検索・フィルタリング
    const filteredWatchlist = useMemo(() => {
        return watchlist.filter(item => {
            if (filterStatus === "warning" && item.status !== "warning") return false;
            if (filterStatus === "safe" && item.status !== "safe") return false;

            if (searchTerm.trim()) {
                const q = searchTerm.trim().toLowerCase();
                const name = (item.company_name || "").toLowerCase();
                const corp = (item.corporate_number || "").toLowerCase();
                const notes = (item.notes || "").toLowerCase();
                return name.includes(q) || corp.includes(q) || notes.includes(q);
            }
            return true;
        });
    }, [watchlist, filterStatus, searchTerm]);

    const warningCount = watchlist.filter(w => w.status === "warning").length;
    const safeCount = watchlist.filter(w => w.status === "safe").length;

    return (
        <div className="min-h-screen pt-16 sm:pt-20 md:pt-10 pb-20 px-3.5 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
            <Toast toast={toast} onClose={() => setToast(null)} />

            <div className="max-w-5xl w-full">
                {/* ヘッダー */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8 animate-fade-in">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-[11px] bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                <BookmarkCheck className="w-3.5 h-3.5 text-blue-400" />
                                CREDIT MONITORING
                            </span>
                            <span className="text-slate-300 text-xs">|</span>
                            <span className="text-xs text-slate-500 font-semibold tracking-wide">
                                取引先信用モニタリング
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            取引先ウォッチリスト
                        </h1>
                        <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                            主要な取引先・元請け・下請け企業を監視登録し、他社で未払い事故が発生した際に即座に検知します。
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 shrink-0 w-full md:w-auto">
                        <Link 
                            href="/credit" 
                            className="btn-secondary text-xs h-10 px-3.5 sm:px-4 rounded-xl flex items-center justify-center gap-1.5 font-medium transition-colors whitespace-nowrap active:scale-[0.98]"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                            <span>照会トップへ</span>
                        </Link>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn-primary flex items-center justify-center gap-1.5 px-3.5 sm:px-4 h-10 rounded-xl font-bold text-xs shadow-sm transition-all whitespace-nowrap active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4 shrink-0" />
                            <span>取引先を監視登録</span>
                        </button>
                    </div>
                </div>

                {/* テーブル未準備の案内 */}
                {tableNotReady && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6 text-amber-800 text-xs sm:text-sm animate-fade-in">
                        <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>データベースの初期設定が必要です</span>
                        </div>
                        <p className="text-xs leading-relaxed text-amber-700">
                            取引先ウォッチ機能を利用するには、SupabaseのSQLエディタで <code>scratch/create_credit_watchlist.sql</code> を実行してください。
                        </p>
                    </div>
                )}

                {/* プラン制限 */}
                {planRestricted ? (
                    <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 text-center max-w-xl mx-auto my-8 shadow-sm">
                        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                        <h2 className="text-lg font-bold text-slate-900 mb-2">ミエリスクレジット未加入プランです</h2>
                        <p className="text-xs text-slate-600 mb-6">この機能をご利用いただくには「ミエリスクレジット」または「両方セット」プランが必要です。</p>
                        <Link href="/contact" className="btn-primary text-xs px-5 py-2.5 rounded-xl">プラン変更を問い合わせる</Link>
                    </div>
                ) : (
                    <>
                        {/* 統計サマリーカード（2連） */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 animate-fade-in">
                            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                <div className="flex items-center justify-between text-slate-500 mb-1">
                                    <span className="text-[11px] sm:text-xs font-bold text-slate-600">監視中取引先</span>
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                                        {watchlist.length}
                                    </span>
                                    <span className="text-xs text-slate-500 ml-1">社</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">自社がモニタリング中の企業</p>
                            </div>

                            <div className={`p-3.5 sm:p-5 rounded-2xl border shadow-2xs ${warningCount > 0 ? "bg-rose-50/70 border-rose-200" : "bg-white border-slate-200"}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-[11px] sm:text-xs font-bold ${warningCount > 0 ? "text-rose-700" : "text-slate-600"}`}>
                                        未払い警告発生中
                                    </span>
                                    <AlertTriangle className={`w-4 h-4 ${warningCount > 0 ? "text-rose-600" : "text-slate-400"}`} />
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-xl sm:text-3xl font-extrabold font-mono ${warningCount > 0 ? "text-rose-600" : "text-slate-900"}`}>
                                        {warningCount}
                                    </span>
                                    <span className="text-xs text-slate-500 ml-1">社</span>
                                </div>
                                <p className={`text-[10px] mt-0.5 ${warningCount > 0 ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                                    {warningCount > 0 ? "⚠️ 他社で焦げ付きが発生中！" : "現在、事故報告はありません"}
                                </p>
                            </div>

                            <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                                <div className="flex items-center justify-between text-slate-500 mb-1">
                                    <span className="text-[11px] sm:text-xs font-bold text-emerald-700">正常稼働（白）</span>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
                                        {safeCount}
                                    </span>
                                    <span className="text-xs text-slate-500 ml-1">社</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">未払い事故の報告なし</p>
                            </div>
                        </div>

                        {/* コントロールバー（検索 & フィルター） */}
                        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs mb-6 space-y-3 animate-fade-in">
                            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                                {/* 検索窓 */}
                                <div className="relative flex-1">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="企業名・法人番号・自社メモで絞り込み..."
                                        style={{ paddingLeft: '2.5rem' }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all placeholder:text-slate-400"
                                    />
                                </div>

                                {/* タブ切り替え */}
                                <div className="flex gap-1.5 shrink-0">
                                    <button
                                        onClick={() => setFilterStatus("all")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
                                            filterStatus === "all" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                                        }`}
                                    >
                                        すべて ({watchlist.length})
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus("warning")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-[0.98] ${
                                            filterStatus === "warning" ? "bg-rose-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                                        }`}
                                    >
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>警告のみ ({warningCount})</span>
                                    </button>
                                    <button
                                        onClick={() => setFilterStatus("safe")}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-[0.98] ${
                                            filterStatus === "safe" ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                                        }`}
                                    >
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>正常 ({safeCount})</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* リスト一覧 */}
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                            </div>
                        ) : filteredWatchlist.length === 0 ? (
                            <div className="bg-white p-8 sm:p-12 text-center rounded-2xl border border-slate-200 shadow-2xs animate-fade-in">
                                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <h3 className="text-base font-bold text-slate-800 mb-1">
                                    {searchTerm || filterStatus !== "all" ? "該当する企業はありません" : "監視登録されている取引先はありません"}
                                </h3>
                                <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
                                    {searchTerm || filterStatus !== "all" 
                                        ? "検索条件を変更して再度お試しください。" 
                                        : "主要な取引先や元請け企業を登録しておくと、他社で未払いが発生した際に即座に検知できます。"}
                                </p>
                                {!searchTerm && filterStatus === "all" && (
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="btn-primary text-xs px-5 py-2.5 rounded-xl active:scale-[0.98]"
                                    >
                                        ＋ 取引先を登録してみる
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3 sm:space-y-4 animate-fade-in">
                                {filteredWatchlist.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`bg-white p-4.5 sm:p-6 rounded-2xl border transition-all shadow-2xs hover:border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                            item.status === "warning" ? "border-rose-300 ring-1 ring-rose-200 bg-rose-50/20" : "border-slate-200"
                                        }`}
                                    >
                                        <div className="space-y-2 flex-1 min-w-0">
                                            {/* ヘッダー行: ステータスバッジ ＋ 会社名 */}
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                {item.status === "warning" ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap animate-pulse">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                                        <span>未払い警告（他社未払い {item.unpaid_count} 件）</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                        <span>正常（事故報告なし）</span>
                                                    </span>
                                                )}

                                                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                    法人番号: {item.corporate_number}
                                                </span>
                                            </div>

                                            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                                <Building2 className="w-5 h-5 text-slate-600 shrink-0" />
                                                <span>{item.company_name}</span>
                                            </h3>

                                            {/* 自社メモ */}
                                            {item.notes && (
                                                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                                    <strong className="text-slate-800">自社メモ:</strong> {item.notes}
                                                </p>
                                            )}

                                            {/* 警告発生時のハイライトボックス */}
                                            {item.status === "warning" && item.latest_unpaid && (
                                                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-4 flex-wrap">
                                                        <span>最新の他社未払い額: <strong className="text-rose-900 font-extrabold text-sm">¥{item.latest_unpaid.amount.toLocaleString()}</strong></span>
                                                        <span>当初支払期日: <span className="font-mono">{item.latest_unpaid.due_date}</span></span>
                                                    </div>
                                                    <span className="text-[11px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                                                        即時確認を推奨
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* アクションボタン */}
                                        <div className="flex flex-row md:flex-col items-center md:items-stretch gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                                            <Link
                                                href={`/credit?corp=${item.corporate_number}`}
                                                className="btn-secondary text-xs h-9 px-3.5 rounded-xl flex items-center justify-center gap-1.5 flex-1 md:flex-none font-bold active:scale-[0.98]"
                                            >
                                                <Search className="w-3.5 h-3.5" />
                                                <span>照会詳細</span>
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteWatchlist(item)}
                                                className="h-9 px-3 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors flex items-center justify-center gap-1 active:scale-[0.98]"
                                                title="ウォッチ監視を解除"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span className="md:hidden">監視解除</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* 新規登録モーダル */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-scale-up">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                                <BookmarkCheck className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">取引先を監視登録</h3>
                                <p className="text-xs text-slate-500">監視対象の企業を登録します</p>
                            </div>
                        </div>

                        <form onSubmit={handleAddWatchlist} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                    法人番号（13桁） <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        maxLength={13}
                                        value={newCorpNum}
                                        onChange={(e) => setNewCorpNum(e.target.value.replace(/[^0-9]/g, ""))}
                                        placeholder="例: 1234567890123"
                                        className="input-field font-mono text-sm py-2 px-3.5 rounded-xl flex-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleFetchCorporateName}
                                        disabled={fetchingCorp || newCorpNum.length !== 13}
                                        className="btn-secondary text-xs px-3 h-10 rounded-xl whitespace-nowrap font-bold shrink-0 active:scale-[0.98]"
                                    >
                                        {fetchingCorp ? "取得中..." : "企業名取得"}
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">※半角数字13桁を入力してください</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                    企業名（商号） <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newCompanyName}
                                    onChange={(e) => setNewCompanyName(e.target.value)}
                                    placeholder="例: 株式会社〇〇建設"
                                    className="input-field text-sm py-2 px-3.5 rounded-xl"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                    自社用メモ（任意）
                                </label>
                                <input
                                    type="text"
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                    placeholder="例: 〇〇現場の元請け、新規検討先など"
                                    className="input-field text-xs py-2 px-3.5 rounded-xl"
                                />
                            </div>

                            <div className="flex gap-2.5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="btn-secondary flex-1 py-2.5 text-xs rounded-xl font-bold"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn-primary flex-1 py-2.5 text-xs rounded-xl font-bold active:scale-[0.98]"
                                >
                                    {isSubmitting ? "登録中..." : "ウォッチリストに追加"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
