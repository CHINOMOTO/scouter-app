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
    User,
    Calendar
} from "lucide-react";

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

export default function AdminCaseList() {
    const [cases, setCases] = useState<CaseRowAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

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
                alert("更新失敗: " + updateError.message);
            } else {
                alert(`ステータスを「${actionLabel}」に更新しました。`);
                fetchCases();
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
            <div className="min-h-screen pt-20 md:pt-10 pb-16 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-6xl w-full">

                    {/* ヘッダー */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 text-[11px] bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                    ADMIN CONSOLE
                                </span>
                            </div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                就業トラブル 審査管理
                            </h1>
                            <p className="text-slate-600 text-sm mt-1">
                                加盟企業から申請された就業トラブル情報・エビデンス資料の審査を行います。
                            </p>
                        </div>
                        <Link href="/admin" className="btn-secondary text-xs h-10 px-4 flex items-center gap-1.5 self-start transition-colors whitespace-nowrap shrink-0">
                            <ArrowLeft className="w-4 h-4 shrink-0" />
                            <span className="whitespace-nowrap">管理者メニューへ戻る</span>
                        </Link>
                    </div>

                    {/* タブ切り替え */}
                    <div className="flex gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto animate-fade-in">
                        <button
                            onClick={() => setFilterStatus("pending")}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${filterStatus === "pending" ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"}`}
                        >
                            <Clock className="w-3.5 h-3.5" />
                            <span>審査待ち ({cases.filter(c => c.status === "pending").length})</span>
                        </button>
                        <button
                            onClick={() => setFilterStatus("approved")}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${filterStatus === "approved" ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"}`}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>承認済み ({cases.filter(c => c.status === "approved").length})</span>
                        </button>
                        <button
                            onClick={() => setFilterStatus("rejected")}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${filterStatus === "rejected" ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"}`}
                        >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>却下 ({cases.filter(c => c.status === "rejected").length})</span>
                        </button>
                        <button
                            onClick={() => setFilterStatus("all")}
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
                            <p className="text-xs text-slate-500">現在、審査待ち・ステータスに該当するトラブルデータはありません。</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            {filteredCases.map((c) => (
                                <div
                                    key={c.id}
                                    className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                <User className="w-5 h-5 text-slate-600" />
                                                <span>{c.full_name}</span>
                                                {c.full_name_kana && (
                                                    <span className="text-xs text-slate-400 font-normal">
                                                        （{c.full_name_kana}）
                                                    </span>
                                                )}
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
                                    <div className="flex flex-row md:flex-col gap-2 min-w-[140px]">
                                        <Link
                                            href={`/admin/cases/${c.id}`}
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
                        </div>
                    )}
                </div>
            </div>
        </RequireAdmin>
    );
}
