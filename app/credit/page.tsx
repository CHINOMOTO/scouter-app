"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
    Banknote, 
    AlertTriangle, 
    CheckCircle2, 
    ShieldCheck, 
    Search, 
    Plus, 
    ArrowRight, 
    Lock,
    Building2,
    Calendar,
    Coins
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";

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
    created_at: string;
    companies?: {
        id: string;
        name: string;
    } | null;
};

export default function CreditSearchPage() {
    const [cases, setCases] = useState<CreditCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [corpFilter, setCorpFilter] = useState("");
    const [planRestricted, setPlanRestricted] = useState(false);

    const fetchCases = async () => {
        setLoading(true);
        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) return;

            const url = new URL("/api/credit-cases", window.location.origin);
            if (searchQuery.trim()) url.searchParams.set("q", searchQuery.trim());
            if (corpFilter.trim()) url.searchParams.set("corp", corpFilter.trim());

            const res = await fetch(url.toString(), {
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });

            if (res.status === 403) {
                const errData = await res.json();
                if (errData.planRestricted) {
                    setPlanRestricted(true);
                    setLoading(false);
                    return;
                }
            }

            const data = await res.json();
            setCases(data.cases || []);

        } catch (e) {
            console.error("Fetch credit cases error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCases();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchCases();
    };

    // 統計計算
    const totalAmount = cases.reduce((sum, c) => sum + (c.payment_status === "unpaid" ? c.amount : 0), 0);
    const unpaidCount = cases.filter(c => c.payment_status === "unpaid").length;
    const resolvedCount = cases.filter(c => c.payment_status === "resolved").length;

    return (
        <RequireAuth>
            <div className="min-h-screen pt-24 pb-16 px-4 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-6xl w-full">

                    {/* ヘッダーエリア */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 animate-fade-in">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white tracking-widest uppercase">
                                    MIERIS CREDIT
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                    取引先情報共有システム
                                </span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                                未払い・支払遅延企業照会
                            </h1>
                            <p className="text-slate-600 text-sm mt-1">
                                取引開始前に事実を確認し、代金未回収・支払い遅延リスクを未然に防ぎます。
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard" className="btn-secondary text-xs h-10 px-4 flex items-center">
                                戻る
                            </Link>
                            <Link
                                href="/credit/new"
                                className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition-all shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span>未払い企業を新規登録</span>
                            </Link>
                        </div>
                    </div>

                    {/* プラン制限の場合の案内 */}
                    {planRestricted ? (
                        <div className="glass-panel p-12 rounded-3xl border border-slate-200 text-center max-w-2xl mx-auto my-12 shadow-xl bg-white animate-fade-in">
                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-600">
                                <Lock className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                ミエリスクレジット 未加入プランです
                            </h2>
                            <p className="text-sm text-slate-600 leading-relaxed mb-6">
                                現在のアカウントは「就業情報プラン」のため、未払い企業情報の照会・登録をご利用いただけません。<br />
                                「ミエリスクレジット」または「両方セットプラン」へのアップグレードで、全データをご利用いただけます。
                            </p>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 max-w-md mx-auto mb-6 text-left">
                                <div className="font-bold text-slate-900 mb-1.5">【プラン変更のご案内】</div>
                                <div className="space-y-1">
                                    <div>・ミエリスクレジット単体: 月額 15,000円</div>
                                    <div>・就業情報 ＋ クレジット 両方セット: 月額 30,000円（おすすめ）</div>
                                </div>
                            </div>
                            <Link href="/contact" className="btn-primary px-8 py-3 rounded-xl font-bold text-sm inline-block">
                                プラン変更をお問い合わせ
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* 統計サマリーカード */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                            未払い総額
                                        </div>
                                        <div className="text-3xl font-extrabold text-slate-900">
                                            ¥{totalAmount.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                                        <Coins className="w-7 h-7" strokeWidth={1.5} />
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                            現在未払いの件数
                                        </div>
                                        <div className="text-3xl font-extrabold text-slate-900">
                                            {unpaidCount} <span className="text-sm font-normal text-slate-500">社</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                                        <AlertTriangle className="w-7 h-7" strokeWidth={1.5} />
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                            解決済み（入金完了）
                                        </div>
                                        <div className="text-3xl font-extrabold text-slate-900">
                                            {resolvedCount} <span className="text-sm font-normal text-slate-500">件</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                                        <CheckCircle2 className="w-7 h-7" strokeWidth={1.5} />
                                    </div>
                                </div>
                            </div>

                            {/* 検索フィルターバー */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 animate-fade-in delay-100">
                                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-center">
                                    <div className="flex-1 w-full">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            企業名・商号 または 所在地
                                        </label>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="例: 株式会社〇〇建設、東京都中央区..."
                                            className="input-field"
                                        />
                                    </div>
                                    <div className="w-full md:w-64">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            法人番号（13桁）
                                        </label>
                                        <input
                                            type="text"
                                            value={corpFilter}
                                            onChange={(e) => setCorpFilter(e.target.value)}
                                            placeholder="13桁数字で照会"
                                            className="input-field font-mono"
                                        />
                                    </div>
                                    <div className="w-full md:w-auto pt-5">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="btn-primary w-full md:w-auto px-8 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
                                        >
                                            <Search className="w-4 h-4" />
                                            <span>{loading ? "照会中..." : "照会・検索"}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* 結果一覧 */}
                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                                </div>
                            ) : cases.length === 0 ? (
                                <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-sm animate-fade-in">
                                    <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <ShieldCheck className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">照会条件に該当する未払い企業はありません</h3>
                                    <p className="text-xs text-slate-500">
                                        登録がないことは安心材料のひとつです。取引前に同意書を取得し、支払遅延が生じた場合はご登録ください。
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                                    {cases.map((c) => {
                                        const isResolved = c.payment_status === "resolved";
                                        return (
                                            <Link
                                                key={c.id}
                                                href={`/credit/${c.id}`}
                                                className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div>
                                                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                                {c.company_name}
                                                            </h3>
                                                            {c.corporate_number && (
                                                                <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                                                                    法人番号: {c.corporate_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isResolved ? (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                <span>解決済み {c.resolved_delay_days ? `(遅延${c.resolved_delay_days}日)` : ""}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                                <span>未払い</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 my-4 text-xs">
                                                        <div>
                                                            <span className="text-slate-500 block mb-0.5">未払い金額</span>
                                                            <span className="text-base font-extrabold text-slate-900">
                                                                ¥{c.amount.toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-500 block mb-0.5">当初支払期日</span>
                                                            <span className="text-sm font-bold text-slate-800">
                                                                {c.due_date.replace(/-/g, "/")}
                                                            </span>
                                                        </div>
                                                        {c.location && (
                                                            <div className="col-span-2">
                                                                <span className="text-slate-500 block mb-0.5">所在地</span>
                                                                <span className="font-medium text-slate-700">{c.location}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {c.counterparty_claim && (
                                                        <div className="text-xs text-slate-600 line-clamp-2 mb-3 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60">
                                                            <span className="font-bold text-amber-900 mr-1">【相手方の主張】</span>
                                                            {c.counterparty_claim}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                                    <span>登録日: {new Date(c.created_at).toLocaleDateString()}</span>
                                                    <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                        <span>事実詳細を見る</span>
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </RequireAuth>
    );
}
