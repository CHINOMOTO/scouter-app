"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";
import { 
    Search, 
    Plus, 
    ShieldCheck, 
    Coins, 
    AlertTriangle, 
    CheckCircle2, 
    Lock, 
    Building2, 
    FileText, 
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    Info,
    Calendar,
    FileCheck
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
    created_at: string;
};

export default function CreditSearchPage() {
    const router = useRouter();
    const [cases, setCases] = useState<CreditCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [corpFilter, setCorpFilter] = useState("");
    
    // サマリー用
    const [totalAmount, setTotalAmount] = useState(0);
    const [unpaidCount, setUnpaidCount] = useState(0);
    const [resolvedCount, setResolvedCount] = useState(0);

    // プラン制限チェック用
    const [planRestricted, setPlanRestricted] = useState(false);

    const checkPlanAndFetchCases = async () => {
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

            // allowed_plan が 'employment'（就業情報のみ）かつ 管理者でない場合はクレジット機能を制限
            if (appUser && appUser.allowed_plan === "employment" && appUser.role !== "admin") {
                setPlanRestricted(true);
                setLoading(false);
                return;
            }

            // API 経由で取得
            const params = new URLSearchParams();
            if (searchQuery.trim()) params.append("q", searchQuery.trim());
            if (corpFilter.trim()) params.append("corp", corpFilter.trim());

            const res = await fetch(`/api/credit-cases?${params.toString()}`, {
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });

            const data = await res.json();
            const fetchedCases: CreditCase[] = data.cases || [];
            setCases(fetchedCases);

            // 統計の計算（承認済みのみ）
            let sum = 0;
            let unpaid = 0;
            let resolved = 0;

            fetchedCases.forEach((c) => {
                if (c.payment_status === "unpaid") {
                    sum += c.amount;
                    unpaid++;
                } else if (c.payment_status === "resolved") {
                    resolved++;
                }
            });

            setTotalAmount(sum);
            setUnpaidCount(unpaid);
            setResolvedCount(resolved);

        } catch (e) {
            console.error("Credit cases fetch error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkPlanAndFetchCases();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        checkPlanAndFetchCases();
    };

    return (
        <RequireAuth>
            <div className="min-h-screen pt-24 pb-16 px-4 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-6xl w-full">

                    {/* ヘッダーエリア（洗練された欧文サブタイトルと引き締まったアクションバー） */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
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
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                未払い・支払遅延企業照会
                            </h1>
                            <p className="text-slate-600 text-sm mt-1">
                                取引開始前に事実を確認し、代金未回収・支払い遅延リスクを未然に防ぎます。
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Link 
                                href="/dashboard" 
                                className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>戻る</span>
                            </Link>
                            <Link
                                href="/credit/new"
                                className="btn-primary flex items-center gap-1.5 px-4 h-9 rounded-lg font-bold text-xs shadow-xs hover:-translate-y-0.5 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                <span>未払い企業を新規登録</span>
                            </Link>
                        </div>
                    </div>

                    {/* プラン制限の場合の案内 */}
                    {planRestricted ? (
                        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center max-w-xl mx-auto my-12 shadow-sm animate-fade-in">
                            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-amber-600 border border-amber-200/60">
                                <Lock className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">
                                ミエリスクレジット 未加入プランです
                            </h2>
                            <p className="text-xs text-slate-600 leading-relaxed mb-6">
                                現在のアカウントは「就業情報プラン」のため、未払い企業情報の照会・登録をご利用いただけません。<br />
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
                            {/* 統計サマリーカード（脱パステル・洗練された金融ダッシュボードスタイル） */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                                    <div className="flex items-center justify-between text-slate-500 mb-2">
                                        <span className="text-xs font-bold tracking-wider text-slate-600">未払い総額</span>
                                        <Coins className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xs font-bold text-slate-400 font-mono">¥</span>
                                        <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
                                            {totalAmount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                                    <div className="flex items-center justify-between text-slate-500 mb-2">
                                        <span className="text-xs font-bold tracking-wider text-slate-600">現在未払いの件数</span>
                                        <AlertTriangle className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
                                            {unpaidCount}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 ml-1">社</span>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                                    <div className="flex items-center justify-between text-slate-500 mb-2">
                                        <span className="text-xs font-bold tracking-wider text-slate-600">解決済み（入金完了）</span>
                                        <CheckCircle2 className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
                                            {resolvedCount}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 ml-1">件</span>
                                    </div>
                                </div>
                            </div>

                            {/* 検索フィルターバー（シャープな業務ツールバー） */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs mb-6">
                                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 items-end">
                                    <div className="flex-1 w-full">
                                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                            企業名・商号 または 所在地
                                        </label>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="例: 株式会社〇〇建設、東京都中央区..."
                                            className="input-field py-2 text-sm"
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
                                            className="input-field font-mono py-2 text-sm"
                                        />
                                    </div>
                                    <div className="w-full md:w-auto">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="btn-primary w-full md:w-auto px-6 h-[42px] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                                        >
                                            <Search className="w-3.5 h-3.5" />
                                            <span>{loading ? "照会中..." : "照会・検索"}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* 結果一覧エリア */}
                            {loading ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin h-8 w-8 border-3 border-slate-200 rounded-full border-t-slate-900"></div>
                                </div>
                            ) : cases.length === 0 ? (
                                /* 空状態（スカスカ感を廃止し、業務的ガイドを組み込んだ端正なレイアウト） */
                                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                                    <div className="p-8 text-center border-b border-slate-100 bg-slate-50/50">
                                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 mb-3 border border-emerald-200/60">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 mb-1">
                                            照会条件に該当する未払い企業はありません
                                        </h3>
                                        <p className="text-xs text-slate-500 max-w-lg mx-auto">
                                            データベース上に該当する未払い・支払遅延の記録は存在しません。安心してお取引をご検討いただけます。
                                        </p>
                                    </div>

                                    {/* 業務サポート・安全取引ガイド */}
                                    <div className="p-6 bg-white">
                                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                            <Info className="w-4 h-4 text-blue-600" />
                                            <span>取引前の安全対策チェックポイント</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                                                    <FileCheck className="w-4 h-4 text-emerald-600" />
                                                    <span>1. 同意書の事前取得</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    取引開始時に信用情報共有に関する同意書へ署名を取得しておくことで、万が一の未払い時に本システムへ登録が可能になります。
                                                </p>
                                            </div>

                                            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                                                    <FileText className="w-4 h-4 text-blue-600" />
                                                    <span>2. 客観的エビデンスの保管</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    発注書、納品書、請求書、支払期日の通知メールなど、法的・客観的に請求権を裏付ける証憑を保管してください。
                                                </p>
                                            </div>

                                            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {cases.map((c) => {
                                        const isResolved = c.payment_status === "resolved";
                                        return (
                                            <Link
                                                key={c.id}
                                                href={`/credit/${c.id}`}
                                                className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all group flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div>
                                                            <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                                                <Building2 className="w-4 h-4 text-slate-500" />
                                                                <span>{c.company_name}</span>
                                                            </h4>
                                                            {c.corporate_number && (
                                                                <p className="text-xs text-slate-500 font-mono mt-0.5 ml-5.5">
                                                                    法人番号: {c.corporate_number}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {isResolved ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                <span>解決済み {c.resolved_delay_days ? `(遅延${c.resolved_delay_days}日)` : ""}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                <span>未払い</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 mb-3 space-y-1.5 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500 font-medium">未払い金額</span>
                                                            <strong className="text-slate-900 font-extrabold text-sm font-mono">
                                                                ¥{c.amount.toLocaleString()}
                                                            </strong>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-500 font-medium">当初支払期日</span>
                                                            <span className="text-slate-800 font-mono">{c.due_date}</span>
                                                        </div>
                                                        {c.location && (
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500 font-medium">所在地</span>
                                                                <span className="text-slate-800 truncate max-w-[200px]">{c.location}</span>
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
                                                    <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                                        <span>事実詳細を確認</span>
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
