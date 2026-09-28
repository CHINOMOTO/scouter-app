"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";

type CreditCaseDetail = {
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
    registered_by_company_id: string;
    evidence_urls?: string[];
    status: "pending" | "approved" | "rejected";
    created_at: string;
    companies?: {
        id: string;
        name: string;
    } | null;
};

export default function CreditCaseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;

    const [caseData, setCaseData] = useState<CreditCaseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // 解決報告モーダル用
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [delayDays, setDelayDays] = useState("");
    const [resolving, setResolving] = useState(false);

    const fetchDetail = async () => {
        if (!id) return;
        setLoading(true);

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) return;

            // ユーザー情報取得
            const { data: appUser } = await supabase
                .from("app_users")
                .select("role, company_id")
                .eq("id", session.user.id)
                .single();

            setCurrentCompanyId(appUser?.company_id || null);
            setIsAdmin(appUser?.role === "admin");

            const res = await fetch(`/api/credit-cases/${id}`, {
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });

            const data = await res.json();
            if (data.case) {
                setCaseData(data.case);
            }
        } catch (e) {
            console.error("Fetch detail error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [id]);

    // 入金解決の報告
    const handleResolve = async (e: React.FormEvent) => {
        e.preventDefault();
        setResolving(true);

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) return;

            const res = await fetch(`/api/credit-cases/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    paymentStatus: "resolved",
                    resolvedDelayDays: Number(delayDays) || 0
                })
            });

            if (res.ok) {
                alert("解決状況を更新しました。");
                setShowResolveModal(false);
                fetchDetail();
            } else {
                const err = await res.json();
                alert("更新失敗: " + err.error);
            }
        } catch (err: any) {
            alert("エラー: " + err.message);
        } finally {
            setResolving(false);
        }
    };

    if (loading) {
        return (
            <RequireAuth>
                <div className="min-h-screen pt-32 flex justify-center">
                    <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                </div>
            </RequireAuth>
        );
    }

    if (!caseData) {
        return (
            <RequireAuth>
                <div className="min-h-screen pt-32 text-center px-4">
                    <h2 className="text-xl font-bold text-slate-800">データが見つかりませんでした</h2>
                    <Link href="/credit" className="btn-secondary mt-4 inline-block">一覧へ戻る</Link>
                </div>
            </RequireAuth>
        );
    }

    const isOwner = caseData.registered_by_company_id === currentCompanyId;
    const isResolved = caseData.payment_status === "resolved";

    return (
        <RequireAuth>
            <div className="min-h-screen pt-24 pb-16 px-4 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-3xl w-full">

                    {/* ナビゲーション */}
                    <div className="flex items-center justify-between mb-8">
                        <Link href="/credit" className="text-slate-600 hover:text-slate-900 text-sm flex items-center gap-1 font-medium">
                            ← 未払い企業一覧へ戻る
                        </Link>
                        {isOwner && !isResolved && (
                            <button
                                onClick={() => setShowResolveModal(true)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                            >
                                ✓ 入金完了（解決）を報告する
                            </button>
                        )}
                    </div>

                    {/* メインカード */}
                    <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-200 bg-white shadow-xl">

                        {/* ヘッダー情報 */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase tracking-widest font-mono">
                                        CASE ID: {caseData.id.slice(0, 8)}
                                    </span>
                                    {caseData.status === "pending" && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                            審査待ち
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                    {caseData.company_name}
                                </h1>
                                {caseData.corporate_number && (
                                    <p className="text-xs text-slate-500 font-mono mt-1">
                                        法人番号: {caseData.corporate_number}
                                    </p>
                                )}
                            </div>

                            {/* 入金ステータスバッジ */}
                            <div>
                                {isResolved ? (
                                    <div className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-center">
                                        <div className="text-xs font-bold">解決済み（入金完了）</div>
                                        {caseData.resolved_delay_days ? (
                                            <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">遅延 {caseData.resolved_delay_days} 日</div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <div className="px-4 py-2 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 text-center animate-pulse">
                                        <div className="text-xs font-extrabold">未払い・支払遅延中</div>
                                        <div className="text-[11px] text-rose-600 mt-0.5">未入金</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 請求・未払い金額ハイライト */}
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 my-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    未払い金額（税込）
                                </span>
                                <span className="text-4xl font-extrabold text-slate-900">
                                    ¥{caseData.amount.toLocaleString()}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-slate-500 block mb-1">当初支払期日</span>
                                <span className="text-lg font-bold text-slate-900 font-mono">
                                    {caseData.due_date.replace(/-/g, "/")}
                                </span>
                            </div>
                        </div>

                        {/* 7項目詳細リスト */}
                        <div className="space-y-4 py-2 text-sm">
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">商号（企業名）</span>
                                <span className="font-bold text-slate-900">{caseData.company_name}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">法人番号</span>
                                <span className="font-mono text-slate-800">{caseData.corporate_number || "未登録"}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">本社所在地</span>
                                <span className="text-slate-800">{caseData.location || "未登録"}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">請求日</span>
                                <span className="font-mono text-slate-800">{caseData.invoice_date?.replace(/-/g, "/") || "-"}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">入金の有無</span>
                                <span className="font-bold">{isResolved ? "解決済み" : "未払い"}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">登録元企業</span>
                                <span className="text-slate-700">{caseData.companies?.name || "加盟企業"}</span>
                            </div>
                        </div>

                        {/* 相手方の主張 */}
                        <div className="mt-6 p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80">
                            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <span>⚖️</span> 相手方の主張（反論・理由）
                            </h3>
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                {caseData.counterparty_claim || "相手方からの特段の主張・反論の申立はありません。"}
                            </p>
                        </div>

                        {/* 登録日 */}
                        <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                            <span>システム登録日: {new Date(caseData.created_at).toLocaleString()}</span>
                            <span>運営管理者承認済み</span>
                        </div>
                    </div>
                </div>

                {/* 解決報告モーダル */}
                {showResolveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                入金完了（解決）の報告
                            </h3>
                            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                                相手方から代金の全額または和解金等の入金が確認できた場合、記録を「解決済み」へ更新します。
                            </p>

                            <form onSubmit={handleResolve} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        期日からの遅延日数（日数）
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={delayDays}
                                        onChange={(e) => setDelayDays(e.target.value)}
                                        className="input-field"
                                        placeholder="例: 45"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">※支払期日から入金日までの日数を入力してください</p>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowResolveModal(false)}
                                        className="btn-secondary flex-1 py-3 text-xs"
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={resolving}
                                        className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all"
                                    >
                                        {resolving ? "更新中..." : "解決済みに更新"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </RequireAuth>
    );
}
