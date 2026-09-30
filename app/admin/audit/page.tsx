"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";
import { 
    ArrowLeft, 
    ShieldCheck, 
    Search, 
    Eye, 
    Building2, 
    User, 
    Calendar, 
    Globe, 
    Activity, 
    ArrowUpDown,
    Filter,
    FileSpreadsheet,
    FileText,
    RefreshCw
} from "lucide-react";
import { Toast, ToastMessage } from "@/components/Toast";
import { Pagination } from "@/components/Pagination";

type AuditLogItem = {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    user_role: string;
    company_id: string;
    company_name: string;
    action_type: string;
    target_id: string;
    target_detail: string;
    ip_address: string;
    created_at: string;
};

const PAGE_SIZE = 20;

export default function AdminAuditPage() {
    const [logs, setLogs] = useState<AuditLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    const fetchLogs = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch("/api/admin/audit", {
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setLogs(data.logs || []);
            if (isManual) setToast({ type: "success", text: "ログを最新状態に更新しました。" });
        } catch (e: any) {
            console.error(e);
            setToast({ type: "error", text: "ログ取得失敗: " + e.message });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    // フィルタリング & ソート
    const filteredAndSortedLogs = useMemo(() => {
        let result = logs;

        // アクション種別フィルター
        if (actionFilter !== "all") {
            result = result.filter(l => l.action_type === actionFilter);
        }

        // 検索ワードフィルター
        if (searchTerm.trim()) {
            const q = searchTerm.trim().toLowerCase();
            result = result.filter(l => {
                const uName = (l.user_name || "").toLowerCase();
                const uEmail = (l.user_email || "").toLowerCase();
                const cName = (l.company_name || "").toLowerCase();
                const target = (l.target_detail || "").toLowerCase();
                const ip = (l.ip_address || "").toLowerCase();
                return uName.includes(q) || uEmail.includes(q) || cName.includes(q) || target.includes(q) || ip.includes(q);
            });
        }

        // ソート（日時）
        result.sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return sortDirection === "desc" ? timeB - timeA : timeA - timeB;
        });

        return result;
    }, [logs, actionFilter, searchTerm, sortDirection]);

    const totalPages = Math.ceil(filteredAndSortedLogs.length / PAGE_SIZE) || 1;
    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredAndSortedLogs.slice(start, start + PAGE_SIZE);
    }, [filteredAndSortedLogs, currentPage]);

    // 統計計算
    const stats = useMemo(() => {
        const total = logs.length;
        const searches = logs.filter(l => l.action_type === "SEARCH" || l.action_type === "SEARCH_CREDIT").length;
        const views = logs.filter(l => l.action_type === "VIEW_CASE" || l.action_type === "VIEW_CREDIT").length;
        
        // 本日（UTC換算）
        const todayStr = new Date().toISOString().split("T")[0];
        const todayCount = logs.filter(l => (l.created_at || "").startsWith(todayStr)).length;

        return { total, searches, views, todayCount };
    }, [logs]);

    // アクション種別のバッジ情報
    const getActionBadge = (type: string) => {
        switch (type) {
            case "SEARCH":
                return {
                    label: "就業トラブル検索",
                    icon: <Search className="w-3 h-3 text-blue-600" />,
                    className: "bg-blue-50 text-blue-700 border-blue-200"
                };
            case "VIEW_CASE":
                return {
                    label: "就業トラブル閲覧",
                    icon: <Eye className="w-3 h-3 text-emerald-600" />,
                    className: "bg-emerald-50 text-emerald-700 border-emerald-200"
                };
            case "SEARCH_CREDIT":
                return {
                    label: "企業信用照会",
                    icon: <FileSpreadsheet className="w-3 h-3 text-indigo-600" />,
                    className: "bg-indigo-50 text-indigo-700 border-indigo-200"
                };
            case "VIEW_CREDIT":
                return {
                    label: "企業信用閲覧",
                    icon: <Building2 className="w-3 h-3 text-purple-600" />,
                    className: "bg-purple-50 text-purple-700 border-purple-200"
                };
            default:
                return {
                    label: type,
                    icon: <Activity className="w-3 h-3 text-slate-500" />,
                    className: "bg-slate-50 text-slate-700 border-slate-200"
                };
        }
    };

    return (
        <RequireAdmin>
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="min-h-screen pt-20 md:pt-10 pb-16 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-6xl w-full">

                    {/* ヘッダー */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="inline-flex items-center gap-1.5 text-[11px] bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                    COMPLIANCE & AUDIT
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                    監査ログ・照会履歴
                                </h1>
                                {!loading && (
                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                                        全 {filteredAndSortedLogs.length} 件
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-600 text-sm mt-1">
                                個人情報保護法および加盟規約遵守のため、システム内での全検索・照会・閲覧操作を記録・監査しています。
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5 self-start sm:self-auto">
                            <button
                                onClick={() => fetchLogs(true)}
                                disabled={refreshing}
                                className="btn-secondary text-xs h-10 px-3.5 flex items-center gap-1.5 font-bold transition-all"
                                title="ログを最新に更新"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                                <span className="whitespace-nowrap">更新</span>
                            </button>
                            <Link href="/admin" className="btn-secondary text-xs h-10 px-4 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0">
                                <ArrowLeft className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap">管理者メニューへ戻る</span>
                            </Link>
                        </div>
                    </div>

                    {/* 統計指標カード */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 animate-fade-in">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                            <span className="text-xs font-bold text-slate-500 block mb-1">総アクセスログ</span>
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stats.total}</span>
                            <span className="text-xs text-slate-400 ml-1">件</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                            <span className="text-xs font-bold text-slate-500 block mb-1">検索・照会回数</span>
                            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600">{stats.searches}</span>
                            <span className="text-xs text-slate-400 ml-1">回</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                            <span className="text-xs font-bold text-slate-500 block mb-1">事実詳細の閲覧</span>
                            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{stats.views}</span>
                            <span className="text-xs text-slate-400 ml-1">回</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                            <span className="text-xs font-bold text-slate-500 block mb-1">本日の操作</span>
                            <span className="text-2xl sm:text-3xl font-extrabold text-purple-600">{stats.todayCount}</span>
                            <span className="text-xs text-slate-400 ml-1">件</span>
                        </div>
                    </div>

                    {/* コントロールバー（タブ & 検索 & ソート） */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs mb-6 space-y-4 animate-fade-in">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
                            
                            {/* 検索窓 */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="操作ユーザー・企業名・検索内容・IPアドレスで検索..."
                                    style={{ paddingLeft: '2.5rem' }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all placeholder:text-slate-400"
                                />
                            </div>

                            {/* ソート切り替え */}
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                    並び順:
                                </span>
                                <select
                                    value={sortDirection}
                                    onChange={(e) => setSortDirection(e.target.value as "desc" | "asc")}
                                    className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-bold focus:outline-none"
                                >
                                    <option value="desc">日時 (新しい順)</option>
                                    <option value="asc">日時 (古い順)</option>
                                </select>
                            </div>
                        </div>

                        {/* アクション種別タブ */}
                        <div className="flex gap-2 pt-2 border-t border-slate-100 overflow-x-auto">
                            <button
                                onClick={() => {
                                    setActionFilter("all");
                                    setCurrentPage(1);
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    actionFilter === "all" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                                }`}
                            >
                                すべて ({logs.length})
                            </button>
                            <button
                                onClick={() => {
                                    setActionFilter("SEARCH");
                                    setCurrentPage(1);
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    actionFilter === "SEARCH" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                                }`}
                            >
                                <Search className="w-3 h-3 text-blue-500" />
                                <span>就業トラブル検索 ({logs.filter(l => l.action_type === "SEARCH").length})</span>
                            </button>
                            <button
                                onClick={() => {
                                    setActionFilter("VIEW_CASE");
                                    setCurrentPage(1);
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    actionFilter === "VIEW_CASE" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                                }`}
                            >
                                <Eye className="w-3 h-3 text-emerald-500" />
                                <span>就業詳細閲覧 ({logs.filter(l => l.action_type === "VIEW_CASE").length})</span>
                            </button>
                            <button
                                onClick={() => {
                                    setActionFilter("SEARCH_CREDIT");
                                    setCurrentPage(1);
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    actionFilter === "SEARCH_CREDIT" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                                }`}
                            >
                                <FileSpreadsheet className="w-3 h-3 text-indigo-500" />
                                <span>企業信用照会 ({logs.filter(l => l.action_type === "SEARCH_CREDIT").length})</span>
                            </button>
                            <button
                                onClick={() => {
                                    setActionFilter("VIEW_CREDIT");
                                    setCurrentPage(1);
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                    actionFilter === "VIEW_CREDIT" ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                                }`}
                            >
                                <Building2 className="w-3 h-3 text-purple-500" />
                                <span>企業詳細閲覧 ({logs.filter(l => l.action_type === "VIEW_CREDIT").length})</span>
                            </button>
                        </div>
                    </div>

                    {/* ログ一覧 */}
                    {loading ? (
                        <div className="flex justify-center py-24">
                            <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                        </div>
                    ) : filteredAndSortedLogs.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-2xs animate-fade-in">
                            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <Activity className="w-6 h-6" />
                            </div>
                            <p className="text-slate-800 font-bold text-base mb-1">該当する監査ログはありません</p>
                            <p className="text-xs text-slate-500">検索条件やフィルターを変更して再度ご確認ください。</p>
                        </div>
                    ) : (
                        <div className="space-y-3 animate-fade-in">
                            {paginatedLogs.map((log) => {
                                const badge = getActionBadge(log.action_type);
                                const dateObj = new Date(log.created_at);
                                const dateFormatted = dateObj.toLocaleString("ja-JP", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit"
                                });

                                return (
                                    <div
                                        key={log.id}
                                        className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="space-y-2 flex-1">
                                            {/* ヘッダー行: バッジ + 操作内容 */}
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.className}`}>
                                                    {badge.icon}
                                                    <span>{badge.label}</span>
                                                </span>

                                                <span className="text-xs font-bold text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                                                    {log.target_detail}
                                                </span>
                                            </div>

                                            {/* ユーザー & 企業情報 */}
                                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="font-bold text-slate-800">{log.user_name}</span>
                                                    <span className="text-slate-400">({log.user_email})</span>
                                                    {log.user_role === "admin" && (
                                                        <span className="text-[10px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-bold">管理者</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>所属: <strong className="text-slate-700">{log.company_name}</strong></span>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>IP: <code className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{log.ip_address}</code></span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 日時表示 */}
                                        <div className="text-right shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                                            <div className="flex items-center md:justify-end gap-1.5 text-xs font-mono font-bold text-slate-700">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{dateFormatted}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filteredAndSortedLogs.length}
                                pageSize={PAGE_SIZE}
                                onPageChange={setCurrentPage}
                                className="bg-white rounded-xl border border-slate-200 px-4 shadow-2xs mt-6"
                            />
                        </div>
                    )}
                </div>
            </div>
        </RequireAdmin>
    );
}
