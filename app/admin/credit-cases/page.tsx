"use client";

import { useEffect, useState } from "react";
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
    Building2,
    Calendar,
    CircleDollarSign
} from "lucide-react";
import { Toast, ToastMessage } from "@/components/Toast";
import { Pagination } from "@/components/Pagination";

type CreditCaseAdmin = {
    id: string;
    company_name: string;
    corporate_number?: string | null;
    location?: string | null;
    amount: number;
    due_date: string;
    payment_status: "unpaid" | "resolved";
    counterparty_claim?: string | null;
    evidence_urls?: string[];
    status: "pending" | "approved" | "rejected";
    admin_notes?: string | null;
    created_at: string;
    companies?: {
        id: string;
        name: string;
    } | null;
};

const PAGE_SIZE = 10;

export default function AdminCreditCasesPage() {
    const [cases, setCases] = useState<CreditCaseAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
    const [currentPage, setCurrentPage] = useState(1);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    const fetchCases = async () => {
        setLoading(true);
        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) return;

            const res = await fetch("/api/admin/credit-cases", {
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });

            const data = await res.json();
            setCases(data.cases || []);

        } catch (e) {
            console.error("Fetch admin credit cases error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
    }, []);

    const handleUpdateStatus = async (id: string, newStatus: "approved" | "rejected") => {
        const actionLabel = newStatus === "approved" ? "承認" : "却下";
        if (!confirm(`この未払い企業情報を「${actionLabel}」しますか？`)) return;

        setActionLoading(id);

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) return;

            const res = await fetch(`/api/admin/credit-cases/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    status: newStatus
                })
            });

            if (res.ok) {
                setToast({ type: "success", text: `ステータスを「${actionLabel}」に更新しました。` });
                fetchCases();
            } else {
                const err = await res.json();
                setToast({ type: "error", text: "更新失敗: " + (err.error || "予期せぬエラー") });
            }

        } catch (err: any) {
            setToast({ type: "error", text: "エラー: " + err.message });
        } finally {
            setActionLoading(null);
        }
    };

    const filteredCases = cases.filter(c => filterStatus === "all" ? true : c.status === filterStatus);
    const totalPages = Math.ceil(filteredCases.length / PAGE_SIZE);
    const paginatedCases = filteredCases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <RequireAdmin>
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="min-h-screen pt-20 md:pt-10 pb-16 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-6xl w-full">

                    {/* ヘッダー */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 text-[11px] bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                    ADMIN CONSOLE
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                    企業信用 審査管理
                                </h1>
                                {!loading && (
                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                                        全 {filteredCases.length} 件
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-600 text-sm mt-1">
                                加盟企業から申請された企業信用（遅延・未払い）情報・エビデンス資料の審査を行います。
                            </p>
                        </div>
                        <Link href="/admin" className="btn-secondary text-xs h-10 px-4 flex items-center gap-1.5 self-start transition-colors whitespace-nowrap shrink-0">
                            <ArrowLeft className="w-4 h-4 shrink-0" />
                            <span className="whitespace-nowrap">管理者メニューへ戻る</span>
                        </Link>
                    </div>

                    {/* タブ切り替え */}
                    <div className="flex gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto">
                        <button
                            onClick={() => {
                                setFilterStatus("pending");
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${filterStatus === "pending" ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"}`}
                        >
                            <Clock className="w-3.5 h-3.5" />
                            <span>審査待ち ({cases.filter(c => c.status === "pending").length})</span>
                        </button>
                        <button
                            onClick={() => {
                                setFilterStatus("approved");
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${filterStatus === "approved" ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"}`}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>承認済み ({cases.filter(c => c.status === "approved").length})</span>
                        </button>
                        <button
                            onClick={() => {
                                setFilterStatus("rejected");
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${filterStatus === "rejected" ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"}`}
                        >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>却下 ({cases.filter(c => c.status === "rejected").length})</span>
                        </button>
                        <button
                            onClick={() => {
                                setFilterStatus("all");
                                setCurrentPage(1);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === "all" ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"}`}
                        >
                            すべて ({cases.length})
                        </button>
                    </div>

                    {/* 一覧 */}
                    {loading ? (
                        <div className="flex justify-center py-24">
                            <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                        </div>
                    ) : filteredCases.length === 0 ? (
                        <div className="bg-white p-10 text-center rounded-xl border border-slate-200 shadow-2xs animate-fade-in">
                            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center mx-auto mb-3">
                                <FileText className="w-6 h-6" />
                            </div>
                            <p className="text-slate-700 font-bold text-base mb-1">対象の審査申請はありません</p>
                            <p className="text-xs text-slate-500">現在、審査待ち・ステータスに該当する企業データはありません。</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            {paginatedCases.map((c) => (
                                <div
                                    key={c.id}
                                    className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                <Building2 className="w-5 h-5 text-slate-600" />
                                                <span>{c.company_name}</span>
                                            </h3>
                                            {c.status === "pending" && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    <Clock className="w-3 h-3" />
                                                    <span>審査待ち</span>
                                                </span>
                                            )}
                                            {c.status === "approved" && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    <span>承認済み</span>
                                                </span>
                                            )}
                                            {c.status === "rejected" && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                    <XCircle className="w-3 h-3" />
                                                    <span>却下</span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600 my-3">
                                            <div>未払い額: <strong className="text-slate-900 font-extrabold text-sm">¥{c.amount.toLocaleString()}</strong></div>
                                            <div>支払期日: <span className="font-mono text-slate-800">{c.due_date}</span></div>
                                            {c.corporate_number && <div>法人番号: <span className="font-mono text-slate-800">{c.corporate_number}</span></div>}
                                            <div>申請企業: <strong className="text-slate-800">{c.companies?.name || "加盟企業"}</strong></div>
                                            <div>申請日: <span className="text-slate-700">{new Date(c.created_at).toLocaleDateString()}</span></div>
                                        </div>

                                        {c.counterparty_claim && (
                                            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-2">
                                                <span className="font-bold text-slate-900 block mb-0.5">登録理由:</span>
                                                {c.counterparty_claim}
                                            </div>
                                        )}
                                    </div>

                                    {/* アクションボタン */}
                                    <div className="flex flex-row md:flex-col gap-2 min-w-[140px]">
                                        <Link
                                            href={`/admin/credit-cases/${c.id}`}
                                            className="btn-secondary text-xs text-center py-2.5 rounded-xl font-bold"
                                        >
                                            詳細を確認
                                        </Link>

                                        {c.status === "pending" && (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateStatus(c.id, "approved")}
                                                    disabled={actionLoading === c.id}
                                                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>{actionLoading === c.id ? "更新中..." : "承認する"}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(c.id, "rejected")}
                                                    disabled={actionLoading === c.id}
                                                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all"
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
                                totalItems={filteredCases.length}
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
