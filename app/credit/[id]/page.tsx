"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";
import { 
    ArrowLeft, 
    CheckCircle2, 
    AlertTriangle, 
    Building2, 
    Calendar, 
    ShieldCheck, 
    Check,
    Clock
} from "lucide-react";
import { Toast, ToastMessage } from "@/components/Toast";

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
    business_status?: string | null;
    registry_status?: string | null;
    registry_close_date?: string | null;
    registry_close_cause?: string | null;
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
    const [toast, setToast] = useState<ToastMessage | null>(null);

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
                setToast({ type: "success", text: "解決状況を更新しました。" });
                setShowResolveModal(false);
                fetchDetail();
            } else {
                const err = await res.json();
                setToast({ type: "error", text: "更新失敗: " + (err.error || "予期せぬエラー") });
            }
        } catch (err: any) {
            setToast({ type: "error", text: "エラー: " + err.message });
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
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="min-h-screen pt-20 md:pt-10 pb-16 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-3xl w-full">

                    {/* ナビゲーション */}
                    <div className="flex items-center justify-between mb-8 gap-4 flex-wrap sm:flex-nowrap">
                        <Link 
                            href="/credit" 
                            className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap shrink-0"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                            <span className="whitespace-nowrap">企業信用照会へ戻る</span>
                        </Link>
                        {isOwner && !isResolved && (
                            <button
                                onClick={() => setShowResolveModal(true)}
                                className="inline-flex items-center gap-1.5 px-4 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all whitespace-nowrap shrink-0"
                            >
                                <Check className="w-3.5 h-3.5 shrink-0" />
                                <span className="whitespace-nowrap">入金完了（解決）を報告する</span>
                            </button>
                        )}
                    </div>

                    {/* メインカード */}
                    <div className="bg-white p-7 sm:p-9 rounded-xl border border-slate-200 shadow-2xs">

                        {/* ヘッダー情報 */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase tracking-widest font-mono">
                                        CASE ID: {caseData.id.slice(0, 8)}
                                    </span>
                                    {caseData.status === "pending" && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                            <Clock className="w-3 h-3" />
                                            <span>審査待ち</span>
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-start sm:items-center gap-2.5">
                                    <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-slate-700 shrink-0 mt-0.5 sm:mt-0" />
                                    <span className="break-keep [word-break:keep-all]">{caseData.company_name}</span>
                                </h1>
                                {caseData.corporate_number && (
                                    <p className="text-xs text-slate-500 font-mono mt-1 ml-8 sm:ml-9">
                                        法人番号: {caseData.corporate_number}
                                    </p>
                                )}
                            </div>

                            {/* 入金ステータスバッジ */}
                            <div>
                                {isResolved ? (
                                    <div className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-center flex flex-col items-center">
                                        <div className="flex items-center gap-1.5 text-xs font-bold">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            <span>解決済み（入金完了）</span>
                                        </div>
                                        {caseData.resolved_delay_days ? (
                                            <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">遅延 {caseData.resolved_delay_days} 日</div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <div className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-center flex flex-col items-center">
                                        <div className="flex items-center gap-1.5 text-xs font-extrabold">
                                            <AlertTriangle className="w-4 h-4 text-rose-600" />
                                            <span>未払い・支払遅延中</span>
                                        </div>
                                        <div className="text-[11px] text-rose-600 mt-0.5">未入金</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 請求・未払い金額ハイライト */}
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 my-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                    未払い金額（税込）
                                </span>
                                <span className="text-4xl font-extrabold text-slate-900 font-mono">
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

                        {/* 2軸ステータスカード（公的登記ステータス × 相手先の営業実態） */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                            {/* 1. 公的登記ステータス（国税庁データ準拠） */}
                            <div className={`p-4 rounded-xl border ${
                                caseData.registry_status === "closed"
                                    ? "bg-rose-50/80 border-rose-200"
                                    : caseData.registry_status === "sole_proprietor"
                                    ? "bg-amber-50/80 border-amber-200"
                                    : "bg-blue-50/80 border-blue-200"
                            }`}>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                                    <span>公的登記ステータス（国税庁準拠）</span>
                                    <span className="text-[10px] font-normal text-slate-400">公的記録</span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    {caseData.registry_status === "closed" ? (
                                        <div className="text-sm font-extrabold text-rose-800 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                                            <span>登記記録閉鎖（{caseData.registry_close_cause || "清算結了等"}）</span>
                                        </div>
                                    ) : caseData.registry_status === "sole_proprietor" ? (
                                        <div className="text-sm font-extrabold text-amber-800">
                                            個人事業主（法人登記なし）
                                        </div>
                                    ) : (
                                        <div className="text-sm font-extrabold text-blue-800">
                                            法人登記中（存続中）
                                        </div>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-600 leading-snug">
                                    {caseData.registry_status === "closed"
                                        ? `国税庁データ上、すでに清算結了や解散が行われ法人格が消滅しています${caseData.registry_close_date ? `（閉鎖日: ${caseData.registry_close_date}）` : ""}。`
                                        : caseData.registry_status === "sole_proprietor"
                                        ? "法人番号を持たない個人事業主（屋号等）として登録されています。"
                                        : "国税庁の法人番号公表サイト上で正常に存続・登記されています。"}
                                </p>
                            </div>

                            {/* 2. 相手方の営業実態（被害企業報告） */}
                            <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                                    <span>相手方の営業実態（被害企業報告）</span>
                                    <span className="text-[10px] font-normal text-slate-400">現場実態</span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                    {caseData.business_status === "unreachable" ? (
                                        <span className="text-sm font-extrabold text-rose-700">
                                            音信不通（電話不通・連絡拒絶）
                                        </span>
                                    ) : caseData.business_status === "relocated" ? (
                                        <span className="text-sm font-extrabold text-purple-700">
                                            事務所引き払い・所在不明
                                        </span>
                                    ) : caseData.business_status === "bankrupt" ? (
                                        <span className="text-sm font-extrabold text-slate-900">
                                            倒産・破産手続き中
                                        </span>
                                    ) : caseData.business_status === "active" ? (
                                        <span className="text-sm font-extrabold text-emerald-700">
                                            連絡可能（督促・協議継続中）
                                        </span>
                                    ) : (
                                        <span className="text-sm font-extrabold text-slate-700">
                                            不明・未申告
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-600 leading-snug">
                                    {caseData.business_status === "unreachable"
                                        ? "請求・督促に対して電話拒否、LINEブロック、着信不通など連絡が取れない状態です。"
                                        : caseData.business_status === "relocated"
                                        ? "登録されている所在地から退去・不在となっており、連絡がつかない状態です。"
                                        : caseData.business_status === "bankrupt"
                                        ? "弁護士等による受任通知や破産申し立て手続きが行われている状態です。"
                                        : caseData.business_status === "active"
                                        ? "連絡自体は取れているものの、約束期日に入金が履行されていない状態です。"
                                        : "現在の営業実態に関する明確な申告はありません。"}
                                </p>
                            </div>
                        </div>

                        {/* 7項目詳細リスト */}
                        <div className="space-y-4 py-2 text-sm">
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">対象企業名（商号・屋号）</span>
                                <span className="font-bold text-slate-900">{caseData.company_name}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">法人番号</span>
                                <span className="font-mono text-slate-800">{caseData.corporate_number || "未登録（個人事業主）"}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">公的登記ステータス</span>
                                <span className="font-bold text-slate-800">
                                    {caseData.registry_status === "closed" ? "閉鎖（清算結了等）" : caseData.registry_status === "sole_proprietor" ? "個人事業主" : "登記中（存続）"}
                                </span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">相手先営業・連絡実態</span>
                                <span className="font-bold text-slate-800">
                                    {caseData.business_status === "unreachable" ? "音信不通" : caseData.business_status === "relocated" ? "事務所引き払い・所在不明" : caseData.business_status === "bankrupt" ? "倒産・破産手続き中" : caseData.business_status === "active" ? "連絡可能（協議中）" : "不明"}
                                </span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">本社所在地・拠点</span>
                                <span className="text-slate-800">{caseData.location || "未登録"}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">請求日</span>
                                <span className="font-mono text-slate-800">{caseData.invoice_date?.replace(/-/g, "/") || "-"}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">入金の有無</span>
                                <span className={`font-bold ${isResolved ? "text-emerald-700" : "text-rose-700"}`}>
                                    {isResolved ? "解決済み" : "未払い"}
                                </span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">登録元企業</span>
                                <span className="text-slate-700">{caseData.companies?.name || "加盟企業"}</span>
                            </div>
                        </div>

                        {/* 登録理由 */}
                        <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                                登録理由（未払い・遅延の経緯・相手側の主張）
                            </h3>
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                {caseData.counterparty_claim || "特段の登録理由・相手側の主張は記載されていません。"}
                            </p>
                        </div>

                        {/* 登録日 */}
                        <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
                            <span>システム登録日: {new Date(caseData.created_at).toLocaleString()}</span>
                            <span className="flex items-center gap-1 font-semibold text-emerald-700">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                <span>運営管理者承認済み</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* 解決報告モーダル */}
                {showResolveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
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
