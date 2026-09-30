"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    Building2, 
    Search, 
    Plus, 
    ArrowLeft, 
    ArrowRight,
    AlertTriangle, 
    CheckCircle2, 
    Clock, 
    ArrowUpDown, 
    FileText, 
    ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";
import { Pagination } from "@/components/Pagination";
import { Toast, ToastMessage } from "@/components/Toast";

type CreditCaseItem = {
    id: string;
    company_name: string;
    corporate_number: string | null;
    location: string | null;
    invoice_date: string | null;
    amount: number;
    due_date: string;
    payment_status: "unpaid" | "resolved";
    resolved_delay_days: number | null;
    counterparty_claim: string | null;
    status: "approved" | "pending" | "rejected";
    created_at: string;
    companies?: {
        id: string;
        name: string;
    } | null;
};

const PAGE_SIZE = 15;

export default function CreditCasesListPage() {
    const router = useRouter();
    const [cases, setCases] = useState<CreditCaseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "resolved">("all");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
        key: "created_at",
        direction: "desc"
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    // 期日超過日数の計算
    const calculateOverdueDays = (dueDateStr?: string | null) => {
        if (!dueDateStr) return 0;
        const due = new Date(dueDateStr).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - due) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    };

    const fetchCases = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push("/login");
                return;
            }

            // all=true を指定してテスト検証用に全件取得
            const res = await fetch("/api/credit-cases?all=true", {
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });

            const data = await res.json();
            if (data.error) {
                throw new Error(data.error);
            }

            setCases(data.cases || []);
        } catch (err: any) {
            console.error("Credit cases fetch error:", err);
            setToast({ type: "error", text: "データ取得に失敗しました: " + err.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
    }, []);

    // ソート切り替えハンドラー
    const handleSort = (key: string) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    // 検索・フィルタリング・ソート
    const filteredCases = useMemo(() => {
        let result = [...cases];

        // ステータスフィルター（未払い / 解決済み）
        if (statusFilter !== "all") {
            result = result.filter((c) => c.payment_status === statusFilter);
        }

        // キーワード検索（企業名、法人番号、所在地、登録理由）
        if (searchTerm.trim() !== "") {
            const term = searchTerm.toLowerCase().trim();
            result = result.filter((c) => {
                const name = (c.company_name || "").toLowerCase();
                const corp = (c.corporate_number || "").toLowerCase();
                const loc = (c.location || "").toLowerCase();
                const claim = (c.counterparty_claim || "").toLowerCase();
                return name.includes(term) || corp.includes(term) || loc.includes(term) || claim.includes(term);
            });
        }

        // ソート
        result.sort((a, b) => {
            const dir = sortConfig.direction === "asc" ? 1 : -1;
            switch (sortConfig.key) {
                case "created_at":
                    return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
                case "due_date":
                    return (new Date(a.due_date).getTime() - new Date(b.due_date).getTime()) * dir;
                case "company_name":
                    return (a.company_name || "").localeCompare(b.company_name || "") * dir;
                case "amount":
                    return (a.amount - b.amount) * dir;
                case "payment_status":
                    return (a.payment_status || "").localeCompare(b.payment_status || "") * dir;
                default:
                    return 0;
            }
        });

        return result;
    }, [cases, searchTerm, statusFilter, sortConfig]);

    const totalPages = Math.ceil(filteredCases.length / PAGE_SIZE) || 1;

    const paginatedCases = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredCases.slice(start, start + PAGE_SIZE);
    }, [filteredCases, currentPage]);

    const renderSortableHeader = (label: string, sortKey: string) => {
        const isActive = sortConfig.key === sortKey;
        return (
            <button
                type="button"
                onClick={() => handleSort(sortKey)}
                className={`flex items-center gap-1 font-bold text-xs uppercase tracking-wider transition-colors ${
                    isActive ? "text-slate-900 font-extrabold" : "text-slate-500 hover:text-slate-800"
                }`}
            >
                <span>{label}</span>
                <ArrowUpDown className={`w-3.5 h-3.5 ${isActive ? "text-slate-900" : "text-slate-400"}`} />
            </button>
        );
    };

    return (
        <RequireAuth>
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="min-h-screen pt-20 md:pt-10 pb-16 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-6xl w-full">

                    {/* ナビゲーションバー */}
                    <div className="flex items-center justify-between mb-6 animate-fade-in flex-wrap gap-3">
                        <Link 
                            href="/credit" 
                            className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap shrink-0"
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

                    {/* ヘッダー */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-fade-in">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                                    企業信用 登録データ一覧
                                </h1>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    全 {filteredCases.length} 件
                                </span>
                            </div>
                            <p className="text-slate-600 text-sm mt-1">
                                登録・共有されている取引先企業の未払い・支払遅延データ一覧です。
                            </p>
                        </div>
                        <div className="shrink-0">
                            <Link 
                                href="/credit/new" 
                                className="btn-primary flex items-center gap-2 px-5 py-2.5 hover:-translate-y-0.5 transition-all rounded-xl font-bold text-sm shadow-xs whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" />
                                <span>遅延・未払いを新規登録</span>
                            </Link>
                        </div>
                    </div>

                    {/* 検索・絞り込みコントロール */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs mb-6 space-y-4 animate-fade-in">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                            
                            {/* 検索窓 */}
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="企業名・法人番号・登録理由で絞り込み..."
                                    style={{ paddingLeft: '2.5rem' }}
                                    className="w-full bg-white border border-slate-200 rounded-xl pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500 transition-colors placeholder:text-slate-400"
                                />
                            </div>

                            {/* 支払ステータスタブ */}
                            <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto text-xs font-bold">
                                <button
                                    onClick={() => {
                                        setStatusFilter("all");
                                        setCurrentPage(1);
                                    }}
                                    className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg transition-all ${
                                        statusFilter === "all" 
                                            ? "bg-white text-slate-900 shadow-2xs" 
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    すべて ({cases.length})
                                </button>
                                <button
                                    onClick={() => {
                                        setStatusFilter("unpaid");
                                        setCurrentPage(1);
                                    }}
                                    className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg transition-all ${
                                        statusFilter === "unpaid" 
                                            ? "bg-white text-rose-700 shadow-2xs font-extrabold" 
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    未払い中 ({cases.filter(c => c.payment_status === "unpaid").length})
                                </button>
                                <button
                                    onClick={() => {
                                        setStatusFilter("resolved");
                                        setCurrentPage(1);
                                    }}
                                    className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg transition-all ${
                                        statusFilter === "resolved" 
                                            ? "bg-white text-emerald-700 shadow-2xs font-extrabold" 
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    解決済み ({cases.filter(c => c.payment_status === "resolved").length})
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* リスト表示エリア */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-2xs">
                            <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900 mb-3"></div>
                            <p className="text-xs text-slate-500 font-medium">企業信用データを読み込み中...</p>
                        </div>
                    ) : filteredCases.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-2xs animate-fade-in">
                            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-slate-800 mb-1">該当するデータが見つかりませんでした</h3>
                            <p className="text-xs text-slate-500 mb-6">
                                {searchTerm ? "検索条件を変更してお試しください。" : "現在、登録されている企業信用情報はありません。"}
                            </p>
                            <Link href="/credit/new" className="btn-primary text-xs inline-flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                <span>遅延・未払いを新規登録</span>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in delay-100">
                            
                            {/* カードグリッド (PC: 2列, スマホ: 1列) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {paginatedCases.map((c) => {
                                    const isResolved = c.payment_status === "resolved";
                                    const overdueDays = calculateOverdueDays(c.due_date);
                                    return (
                                        <div
                                            key={c.id}
                                            className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all group flex flex-col justify-between"
                                        >
                                            <div>
                                                {/* ヘッダー: 企業名・法人番号・ステータスバッジ */}
                                                <div className="flex items-start justify-between gap-3 mb-4">
                                                    <div>
                                                        <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                                            <Building2 className="w-5 h-5 text-slate-600 shrink-0" />
                                                            <span>{c.company_name}</span>
                                                        </h3>
                                                        {c.corporate_number && (
                                                            <p className="text-xs text-slate-500 font-mono mt-1 ml-7">
                                                                法人番号: {c.corporate_number}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                        {isResolved ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                <span>遅延解決 {c.resolved_delay_days ? `(遅延${c.resolved_delay_days}日)` : ""}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                                                <span>現在未払い {overdueDays > 0 ? `(超過${overdueDays}日)` : ""}</span>
                                                            </span>
                                                        )}
                                                        {c.status === "pending" && (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                <Clock className="w-3 h-3 text-amber-600" />
                                                                <span>審査待ち</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* インフォボックス */}
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-3.5 space-y-2 text-xs">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-500 font-medium">請求金額</span>
                                                        <span className="text-slate-900 font-extrabold text-base font-mono">
                                                            ¥{c.amount.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-500 font-medium">当初支払期日</span>
                                                        <span className="font-mono text-slate-800">{c.due_date}</span>
                                                    </div>
                                                    {c.location && (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-slate-500 font-medium">所在地</span>
                                                            <span className="text-slate-800 truncate max-w-[240px] text-right font-medium">{c.location}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 経緯ボックス */}
                                                {c.counterparty_claim && (
                                                    <div className="text-xs text-slate-700 leading-relaxed mb-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                                                        <span className="font-bold text-slate-900">経緯: </span>
                                                        <span>{c.counterparty_claim}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* フッター */}
                                            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                                                <span>登録日: {new Date(c.created_at).toLocaleDateString()}</span>
                                                <Link
                                                    href={`/credit/${c.id}`}
                                                    className="text-blue-600 hover:text-blue-700 font-bold group-hover:translate-x-0.5 transition-all flex items-center gap-1"
                                                >
                                                    <span>事実詳細を確認</span>
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 共通ページネーション */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filteredCases.length}
                                pageSize={PAGE_SIZE}
                                onPageChange={setCurrentPage}
                                className="bg-white rounded-xl border border-slate-200 px-4 shadow-2xs"
                            />
                        </div>
                    )}
                </div>
            </div>
        </RequireAuth>
    );
}
