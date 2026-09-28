"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";

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

export default function AdminCreditCasesPage() {
    const [cases, setCases] = useState<CreditCaseAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

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
                alert(`ステータスを「${actionLabel}」に更新しました。`);
                fetchCases();
            } else {
                const err = await res.json();
                alert("更新失敗: " + err.error);
            }

        } catch (err: any) {
            alert("エラー: " + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredCases = cases.filter(c => filterStatus === "all" ? true : c.status === filterStatus);

    return (
        <RequireAdmin>
            <div className="min-h-screen pt-24 pb-16 px-4 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-6xl w-full">

                    {/* ヘッダー */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full font-bold uppercase">
                                    ADMIN CONSOLE
                                </span>
                            </div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                未払い企業 審査管理
                            </h1>
                            <p className="text-slate-600 text-sm mt-1">
                                加盟企業から申請された未払い企業情報・エビデンス資料の審査を行います。
                            </p>
                        </div>
                        <Link href="/admin" className="btn-secondary text-xs h-10 px-4 flex items-center self-start">
                            管理者メニューへ戻る
                        </Link>
                    </div>

                    {/* タブ切り替え */}
                    <div className="flex gap-2 border-b border-slate-200 pb-3 mb-6">
                        <button
                            onClick={() => setFilterStatus("pending")}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === "pending" ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
                        >
                            審査待ち ({cases.filter(c => c.status === "pending").length})
                        </button>
                        <button
                            onClick={() => setFilterStatus("approved")}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === "approved" ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
                        >
                            承認済み ({cases.filter(c => c.status === "approved").length})
                        </button>
                        <button
                            onClick={() => setFilterStatus("rejected")}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === "rejected" ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
                        >
                            却下 ({cases.filter(c => c.status === "rejected").length})
                        </button>
                        <button
                            onClick={() => setFilterStatus("all")}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === "all" ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
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
                        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-sm">
                            <p className="text-slate-600 font-medium">現在、対象の審査申請はありません。</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredCases.map((c) => (
                                <div
                                    key={c.id}
                                    className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-slate-900">
                                                {c.company_name}
                                            </h3>
                                            {c.status === "pending" && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    審査待ち
                                                </span>
                                            )}
                                            {c.status === "approved" && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    承認済み
                                                </span>
                                            )}
                                            {c.status === "rejected" && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                    却下
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600 my-3">
                                            <div>未払い額: <strong className="text-slate-900 font-extrabold text-sm">¥{c.amount.toLocaleString()}</strong></div>
                                            <div>支払期日: <span className="font-mono">{c.due_date}</span></div>
                                            {c.corporate_number && <div>法人番号: <span className="font-mono">{c.corporate_number}</span></div>}
                                            <div>申請企業: <strong>{c.companies?.name || "加盟企業"}</strong></div>
                                            <div>申請日: <span>{new Date(c.created_at).toLocaleDateString()}</span></div>
                                        </div>

                                        {c.counterparty_claim && (
                                            <div className="text-xs text-slate-700 bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 mb-2">
                                                <span className="font-bold text-amber-900 block mb-0.5">相手方の主張:</span>
                                                {c.counterparty_claim}
                                            </div>
                                        )}
                                    </div>

                                    {/* アクションボタン */}
                                    <div className="flex flex-row md:flex-col gap-2 min-w-[140px]">
                                        <Link
                                            href={`/credit/${c.id}`}
                                            className="btn-secondary text-xs text-center py-2.5 rounded-xl font-bold"
                                        >
                                            事実詳細を確認
                                        </Link>

                                        {c.status === "pending" && (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateStatus(c.id, "approved")}
                                                    disabled={actionLoading === c.id}
                                                    className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
                                                >
                                                    {actionLoading === c.id ? "更新中..." : "✓ 承認する"}
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(c.id, "rejected")}
                                                    disabled={actionLoading === c.id}
                                                    className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all"
                                                >
                                                    ✕ 却下する
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </RequireAdmin>
    );
}
