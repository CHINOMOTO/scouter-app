"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";
import { 
    ArrowLeft, 
    ShieldCheck, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Check, 
    X, 
    FileText, 
    User,
    Calendar,
    Search,
    ArrowUpDown
} from "lucide-react";
import { Toast, ToastMessage } from "@/components/Toast";
import { Pagination } from "@/components/Pagination";

type CaseRowAdmin = {
    id: string;
    full_name: string;
    full_name_kana?: string | null;
    gender?: "male" | "female" | "other" | "unknown" | null;
    birth_date?: string | null;
    phone_last4?: string | null;
    occurrence_date?: string | null;
    reason_text?: string | null;
    evidence_urls?: string[] | null;
    status: "pending" | "approved" | "rejected";
    created_at: string;
    registered_company_id?: string | null;
    companies?: {
        id: string;
        name: string;
    } | null;
};

const PAGE_SIZE = 10;

export default function AdminCaseList() {
    const [cases, setCases] = useState<CaseRowAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: "created_at" | "full_name" | "occurrence_date"; direction: "asc" | "desc" }>({
        key: "created_at",
        direction: "desc"
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    const handleSort = (key: "created_at" | "full_name" | "occurrence_date") => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const fetchCases = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("blacklist_cases")
                .select(`
                    id,
                    full_name,
                    full_name_kana,
                    gender,
                    birth_date,
                    phone_last4,
                    occurrence_date,
                    reason_text,
                    evidence_urls,
                    status,
                    created_at,
                    registered_company_id,
                    companies:registered_company_id ( id, name )
                `)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Fetch admin cases error:", error);
            } else {
                setCases((data as any) || []);
            }
        } catch (e) {
            console.error("Fetch admin cases error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
    }, []);

    const handleUpdateStatus = async (id: string, newStatus: "approved" | "rejected") => {
        const actionLabel = newStatus === "approved" ? "承認" : "却下";
        let rejectReason: string | null = null;
        if (newStatus === "rejected") {
            const reason = prompt("却下理由を入力してください（空欄の場合は『要件不備』）:");
            if (reason === null) return; // キャンセル
            rejectReason = reason.trim() || "要件不備";
        } else {
            if (!confirm(`この就業トラブル情報を「${actionLabel}」しますか？`)) return;
        }

        setActionLoading(id);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const updatePayload: any = {
                status: newStatus,
                approved_by: user?.id || null,
                approved_at: newStatus === "approved" ? new Date().toISOString() : null,
                rejected_reason: rejectReason,
            };

            const { error: updateError } = await supabase
                .from("blacklist_cases")
                .update(updatePayload)
                .eq("id", id);

            if (updateError) {
                setToast({ type: "error", text: "更新失敗: " + updateError.message });
            } else {
                setToast({ type: "success", text: `ステータスを「${actionLabel}」に更新しました。` });
                fetchCases();
            }
        } catch (err: any) {
            setToast({ type: "error", text: "エラー: " + err.message });
        } finally {
            setActionLoading(null);
        }
    };

    const filteredAndSortedCases = useMemo(() => {
        let result = cases.filter(c => filterStatus === "all" ? true : c.status === filterStatus);

        if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            result = result.filter(c => {
                const name = (c.full_name || "").toLowerCase();
                const kana = (c.full_name_kana || "").toLowerCase();
                const reason = (c.reason_text || "").toLowerCase();
                const comp = (c.companies?.name || "").toLowerCase();
                return name.includes(q) || kana.includes(q) || reason.includes(q) || comp.includes(q);
            });
        }

        result.sort((a, b) => {
            const dir = sortConfig.direction === "asc" ? 1 : -1;
            switch (sortConfig.key) {
                case "created_at":
                    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
                case "full_name":
                    return (a.full_name || "").localeCompare(b.full_name || "") * dir;
                case "occurrence_date":
                    return ((a.occurrence_date || "").localeCompare(b.occurrence_date || "")) * dir;
                default:
                    return 0;
            }
        });

        return result;
    }, [cases, filterStatus, searchTerm, sortConfig]);

    const totalPages = Math.ceil(filteredAndSortedCases.length / PAGE_SIZE) || 1;
    const paginatedCases = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredAndSortedCases.slice(start, start + PAGE_SIZE);
    }, [filteredAndSortedCases, currentPage]);

    return (
        <RequireAdmin>
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="min-h-screen pt-16 sm:pt-20 md:pt-10 pb-16 px-3.5 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-6xl w-full">

                    {/* ヘッダー */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 animate-fade-in">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 text-[11px] bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                    ADMIN CONSOLE
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                    就業トラブル 審査管理
                                </h1>
                                {!loading && (
                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                                        全 {filteredAndSortedCases.length} 件
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-600 text-xs sm:text-sm mt-1">
                                加盟企業から申請された就業トラブル情報・エビデンス資料の審査を行います。
                            </p>
                        </div>
                        <Link href="/admin" className="btn-secondary text-xs h-10 px-4 flex items-center justify-center gap-1.5 w-full sm:w-auto transition-colors whitespace-nowrap shrink-0 active:scale-[0.98]">
                            <ArrowLeft className="w-4 h-4 shrink-0" />
                            <span className="whitespace-nowrap">管理者メニューへ戻る</span>
                        </Link>
                    </div>

                    {/* コントロールバー（タブ & 検索 & ソート） */}
                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs mb-6 space-y-4 animate-fade-in">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center">
                            
                            {/* 検索窓 */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="氏名・フリガナ・登録企業名・理由で絞り込み..."
                                    style={{ paddingLeft: '2.5rem' }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-4 py-2.5 sm:py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all placeholder:text-slate-400"
                                />
                            </div>

                            {/* ソート切り替え */}
                            <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                    並び順:
                                </span>
                                <select
                                    value={`${sortConfig.key}-${sortConfig.direction}`}
                                    onChange={(e) => {
                                        const [key, direction] = e.target.value.split('-') as [any, any];
                                        setSortConfig({ key, direction });
                                    }}
                                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-bold focus:outline-none flex-1 sm:flex-none"
                                >
                                    <option value="created_at-desc">登録日 (新しい順)</option>
                                    <option value="created_at-asc">登録日 (古い順)</option>
                                    <option value="full_name-asc">氏名 (五十音順)</option>
                                    <option value="occurrence_date-desc">発生日 (新しい順)</option>
                                </select>
                            </div>
                        </div>

                        {/* タブ切り替え */}
                        <div className="flex gap-2 pt-2 border-t border-slate-100 overflow-x-auto pb-1 -mx-1 px-1">
                            <button
                                onClick={() => {
                                    setFilterStatus("pending");
                                    setCurrentPage(1);
                                }}
                                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-[0.98] ${filterStatus === "pending" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"}`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                <span>審査待ち ({cases.filter(c => c.status === "pending").length})</span>
                            </button>
                            <button
                                onClick={() => {
                                    setFilterStatus("approved");
                                    setCurrentPage(1);
                                }}
                                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-[0.98] ${filterStatus === "approved" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"}`}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>承認済み ({cases.filter(c => c.status === "approved").length})</span>
                            </button>
                            <button
                                onClick={() => {
                                    setFilterStatus("rejected");
                                    setCurrentPage(1);
                                }}
                                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-[0.98] ${filterStatus === "rejected" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"}`}
                            >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>却下 ({cases.filter(c => c.status === "rejected").length})</span>
                            </button>
                            <button
                                onClick={() => {
                                    setFilterStatus("all");
                                    setCurrentPage(1);
                                }}
                                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 active:scale-[0.98] ${filterStatus === "all" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"}`}
                            >
                                すべて ({cases.length})
                            </button>
                        </div>
                    </div>

                    {/* 一覧 */}
                    {loading ? (
                        <div className="flex justify-center py-24">
                            <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                        </div>
                    ) : filteredAndSortedCases.length === 0 ? (
                        <div className="bg-white p-10 text-center rounded-xl border border-slate-200 shadow-2xs animate-fade-in">
                            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center mx-auto mb-3">
                                <FileText className="w-6 h-6" />
                            </div>
                            <p className="text-slate-700 font-bold text-base mb-1">対象の審査申請はありません</p>
                            <p className="text-xs text-slate-500">現在、審査待ち・ステータスに該当するトラブルデータはありません。</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            {paginatedCases.map((c) => (
                                <div
                                    key={c.id}
                                    className="bg-white p-4.5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6"
                                >
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2.5 mb-2">
                                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                                                <User className="w-5 h-5 text-slate-600 shrink-0" />
                                                <span>{c.full_name}</span>
                                                {c.full_name_kana && (
                                                    <span className="text-xs text-slate-400 font-normal">
                                                        （{c.full_name_kana}）
                                                    </span>
                                                )}
                                            </h3>
                                            {c.status === "pending" && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                                    <Clock className="w-3 h-3 shrink-0" />
                                                    <span>審査待ち</span>
                                                </span>
                                            )}
                                            {c.status === "approved" && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                                                    <span>承認済み</span>
                                                </span>
                                            )}
                                            {c.status === "rejected" && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                                                    <XCircle className="w-3 h-3 shrink-0" />
                                                    <span>却下</span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-600 my-3">
                                            <div>生年月日: <span className="font-mono text-slate-800">{c.birth_date ? c.birth_date.replace(/-/g, "/") : "未設定"}</span></div>
                                            {c.occurrence_date && <div>発生日: <span className="font-mono text-slate-800">{c.occurrence_date.replace(/-/g, "/")}</span></div>}
                                            {c.phone_last4 && <div>電話番号: <span className="font-mono text-slate-800">下4桁 {c.phone_last4}</span></div>}
                                            <div>申請企業: <strong className="text-slate-800">{c.companies?.name || "加盟企業"}</strong></div>
                                            <div>申請日: <span className="text-slate-700">{new Date(c.created_at).toLocaleDateString()}</span></div>
                                        </div>

                                        {c.reason_text && (
                                            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-2">
                                                <span className="font-bold text-slate-900 block mb-0.5">登録理由:</span>
                                                <span className="line-clamp-2">{c.reason_text}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* アクションボタン */}
                                    <div className="flex flex-col sm:flex-row md:flex-col gap-2 min-w-[140px] w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                                        <Link
                                            href={`/admin/cases/${c.id}`}
                                            className="btn-secondary text-xs text-center py-2.5 rounded-xl font-bold w-full active:scale-[0.98]"
                                        >
                                            詳細を確認
                                        </Link>

                                        {c.status === "pending" && (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateStatus(c.id, "approved")}
                                                    disabled={actionLoading === c.id}
                                                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all w-full active:scale-[0.98]"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>{actionLoading === c.id ? "更新中..." : "承認する"}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(c.id, "rejected")}
                                                    disabled={actionLoading === c.id}
                                                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all w-full active:scale-[0.98]"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    <span>却下する</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filteredAndSortedCases.length}
                                pageSize={PAGE_SIZE}
                                onPageChange={setCurrentPage}
                                className="mt-6"
                            />
                        </div>
                    )}
                </div>
            </div>
        </RequireAdmin>
    );
}
