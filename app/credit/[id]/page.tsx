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
    Clock,
    ExternalLink,
    FileText,
    UploadCloud,
    X,
    Lock
} from "lucide-react";
import { Toast, ToastMessage } from "@/components/Toast";
import { detectOfficialSource, OfficialSourceInfo, isCorporateEntityName } from "@/lib/officialSources";
import { OfficialDataNotice } from "@/components/OfficialDataNotice";
import { usePlan } from "@/contexts/PlanContext";
import { translateErrorMessage } from "@/lib/errorMessage";
import { getDiffDaysFromDueDateJST, formatDateTimeJST } from "@/lib/dateFormat";
import { validateEvidenceFiles, extractSafeFileExtension } from "@/lib/fileValidation";

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
    admin_notes?: string | null;
    registered_by_company_id: string;
    evidence_urls?: string[];
    status: "pending" | "approved" | "rejected";
    business_status?: string | null;
    registry_status?: string | null;
    registry_close_date?: string | null;
    registry_close_cause?: string | null;
    created_at: string;
    is_official_record?: boolean;
    official_source?: OfficialSourceInfo;
    companies?: {
        id: string;
        name: string;
    } | null;
};

type EvidenceFile = {
    path: string;
    signedUrl: string;
    type: "image" | "pdf" | "other";
    name: string;
};

export default function CreditCaseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;

    const [caseData, setCaseData] = useState<CreditCaseDetail | null>(null);
    const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [apiPlanRestricted, setApiPlanRestricted] = useState(false);
    const { allowedPlan, isAdmin, companyId: currentCompanyId, loading: planLoading } = usePlan();
    const hasCreditAccess = isAdmin || allowedPlan === "full" || allowedPlan === "credit";
    const planRestricted = !planLoading && (!hasCreditAccess || apiPlanRestricted);

    // 解決報告モーダル用
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [delayDays, setDelayDays] = useState("");
    const [resolving, setResolving] = useState(false);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    // 追加資料アップロード用
    const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
    const [uploadingEvidence, setUploadingEvidence] = useState(false);

    const handleAdditionalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const currentTotal = (caseData?.evidence_urls?.length || 0) + additionalFiles.length;
            const { validFiles, errors } = validateEvidenceFiles(Array.from(e.target.files), currentTotal);
            if (errors.length > 0) {
                setToast({ type: "error", text: errors[0] });
            }
            if (validFiles.length > 0) {
                setAdditionalFiles((prev) => [...prev, ...validFiles]);
            }
            e.target.value = "";
        }
    };

    const removeAdditionalFile = (index: number) => {
        setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleAdditionalUpload = async () => {
        if (!caseData || additionalFiles.length === 0) return;
        setUploadingEvidence(true);

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) throw new Error("認証セッションがありません。再度ログインしてください。");

            const newPaths: string[] = [];
            for (const file of additionalFiles) {
                const safeExt = extractSafeFileExtension(file.name);
                if (!safeExt) {
                    throw new Error(`ファイル「${file.name}」は対応していない形式です。画像またはPDFを選択してください。`);
                }
                const fileName = `credit-${Date.now()}-${Math.random().toString(36).substring(7)}.${safeExt}`;
                const filePath = `${session.user.id}/${fileName}`;

                const { error: uploadError, data: uploadData } = await supabase.storage
                    .from("case-evidence")
                    .upload(filePath, file);

                if (uploadError) {
                    throw new Error(`ファイル「${file.name}」のアップロードに失敗しました。${translateErrorMessage(uploadError, "")}`);
                }
                newPaths.push(uploadData?.path || filePath);
            }

            const updatedUrls = [...(caseData.evidence_urls || []), ...newPaths];
            const isResubmitting = caseData.status === "rejected";

            const res = await fetch(`/api/credit-cases/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    evidenceUrls: updatedUrls,
                    resubmit: isResubmitting
                })
            });

            const resData = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(resData.error || "更新に失敗しました。");
            }

            setAdditionalFiles([]);
            setToast({
                type: "success",
                text: isResubmitting
                    ? "追加資料をアップロードし、再審査を申請しました。"
                    : "追加資料をアップロードしました。"
            });
            fetchDetail();
        } catch (err: unknown) {
            setToast({ type: "error", text: translateErrorMessage(err, "アップロード中にエラーが発生しました。") });
        } finally {
            setUploadingEvidence(false);
        }
    };

    const fetchDetail = async () => {
        if (!id || planLoading) return;
        if (!hasCreditAccess) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setFetchError(null);

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) {
                setFetchError("ログインセッションが見つかりません。再度ログインしてください。");
                return;
            }

            const res = await fetch(`/api/credit-cases/${id}`, {
                headers: {
                    "Authorization": `Bearer ${session.access_token}`
                }
            });

            const data = await res.json().catch(() => ({}));
            if (res.status === 403 && data.planRestricted) {
                setApiPlanRestricted(true);
                return;
            }
            if (!res.ok || !data.case) {
                setCaseData(null);
                setEvidenceFiles([]);
                setFetchError(translateErrorMessage(data.error, "対象のデータが見つかりませんでした。"));
                return;
            }

            setCaseData(data.case);
            setEvidenceFiles(Array.isArray(data.evidenceFiles) ? data.evidenceFiles : []);

            // アクセス監査ログの保存
            try {
                await fetch("/api/audit", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        action_type: "VIEW_CREDIT",
                        target_id: data.case.company_name || String(id)
                    })
                });
            } catch {
                // ignore audit error
            }
        } catch (e: unknown) {
            console.error("Fetch detail error:", e);
            setCaseData(null);
            setEvidenceFiles([]);
            setFetchError(translateErrorMessage(e, "データの取得中にエラーが発生しました。"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!planLoading) {
            if (hasCreditAccess) {
                setApiPlanRestricted(false);
            }
            fetchDetail();
        }
    }, [id, planLoading, isAdmin, allowedPlan]);

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
                const err = await res.json().catch(() => ({}));
                setToast({ type: "error", text: translateErrorMessage(err.error, "解決報告の更新に失敗しました。") });
            }
        } catch (err: unknown) {
            setToast({ type: "error", text: translateErrorMessage(err, "更新処理中にエラーが発生しました。") });
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

    if (planRestricted) {
        return (
            <RequireAuth>
                <div className="min-h-screen pt-20 md:pt-10 pb-16 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                    <div className="max-w-xl w-full my-8 sm:my-12 bg-white p-6 sm:p-10 rounded-xl border border-slate-200 text-center shadow-sm animate-fade-in">
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-amber-600 border border-amber-200/60">
                            <Lock className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                            MIERIS CREDIT 未加入プランです
                        </h2>
                        <p className="text-xs text-slate-600 leading-relaxed mb-6">
                            現在のアカウントは「MIERIS WORK」のため、企業信用情報の詳細をご利用いただけません。<br />
                            「MIERIS CREDIT」または「FULLプラン」への変更で、全機能をご利用いただけます。
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link href="/contact" className="btn-primary px-6 py-2.5 rounded-lg font-bold text-xs w-full sm:w-auto text-center">
                                プラン変更をお問い合わせ
                            </Link>
                            <Link href="/dashboard" className="btn-secondary px-5 py-2.5 rounded-lg font-bold text-xs w-full sm:w-auto text-center">
                                ダッシュボードへ戻る
                            </Link>
                        </div>
                    </div>
                </div>
            </RequireAuth>
        );
    }

    if (!caseData) {
        return (
            <RequireAuth>
                <div className="min-h-screen pt-24 text-center px-4 bg-[#f8fafc]">
                    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                        <h2 className="text-lg font-bold text-slate-900">データを表示できません</h2>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            {fetchError || "対象のデータが見つかりませんでした。"}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                            <Link href="/credit/cases" className="btn-primary text-xs px-5 py-2.5 rounded-xl font-bold w-full sm:w-auto">
                                一覧へ戻る
                            </Link>
                            <Link href="/credit" className="btn-secondary text-xs px-5 py-2.5 rounded-xl font-bold w-full sm:w-auto">
                                企業信用照会へ戻る
                            </Link>
                        </div>
                    </div>
                </div>
            </RequireAuth>
        );
    }

    const isOwner = Boolean(caseData.registered_by_company_id && caseData.registered_by_company_id === currentCompanyId);
    const isResolved = caseData.payment_status === "resolved";
    const sourceInfo = caseData.official_source || detectOfficialSource(caseData) || { isOfficial: false, sourceName: "加盟企業", sourceCategory: "被害申告" };

    // 支払期日からの経過日数（遅延日数）の算出（JSTカレンダー日付基準）
    const currentDelayDays = getDiffDaysFromDueDateJST(caseData.due_date) ?? 0;

    return (
        <RequireAuth>
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="min-h-screen pt-20 md:pt-10 pb-16 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-3xl w-full">

                    {/* ナビゲーション */}
                    <div className="flex items-center justify-between mb-8 gap-4 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link 
                                href="/credit" 
                                className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap shrink-0"
                            >
                                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                                <span className="whitespace-nowrap">企業信用照会へ戻る</span>
                            </Link>
                            <Link 
                                href="/credit/cases" 
                                className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 font-medium border border-slate-300 hover:border-slate-400 bg-white text-slate-700 transition-colors whitespace-nowrap shrink-0 shadow-2xs hover:shadow-xs"
                            >
                                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="whitespace-nowrap">公的処分・信用情報一覧</span>
                            </Link>
                        </div>
                        {!sourceInfo.isOfficial && isOwner && !isResolved && caseData.status === "approved" && (
                            <button
                                onClick={() => {
                                    setDelayDays(String(currentDelayDays > 0 ? currentDelayDays : 0));
                                    setShowResolveModal(true);
                                }}
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
                                    {caseData.status === "rejected" && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                            <AlertTriangle className="w-3 h-3" />
                                            <span>却下（差し戻し）</span>
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

                            {/* 入金ステータス / 公的記録バッジ */}
                            <div>
                                {sourceInfo.isOfficial ? (
                                    <div className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-center flex flex-col items-center">
                                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-900">
                                            <ShieldCheck className="w-4 h-4 text-blue-700" />
                                            <span>公的機関 公認処分・確定記録</span>
                                        </div>
                                        <div className="text-[11px] text-blue-700 mt-0.5 font-bold">
                                            公表日: {caseData.due_date?.replace(/-/g, "/") || "-"}
                                        </div>
                                    </div>
                                ) : isResolved ? (
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
                                        <div className="text-[11px] text-rose-600 mt-0.5 font-bold">
                                            {currentDelayDays > 0 ? `遅延 ${currentDelayDays}日目` : "未入金"}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 請求・未払い金額 / 公的処分ハイライト */}
                        {sourceInfo.isOfficial ? (
                            <div className="p-6 bg-blue-50/50 rounded-xl border border-blue-200/80 my-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">
                                        {(caseData.amount ?? 0) > 0 ? "公表不払認定額（概算）" : "処分区分・措置概要"}
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                                        {(caseData.amount ?? 0) > 0 ? `¥${(caseData.amount ?? 0).toLocaleString()}` : "行政処分・公認記録"}
                                    </span>
                                </div>
                                <div className="text-left sm:text-right">
                                    <span className="text-xs font-bold text-slate-500 block mb-1">公表日 / 処分発令日</span>
                                    <div className="flex flex-col sm:items-end">
                                        <span className="text-lg font-bold text-slate-900 font-mono">
                                            {caseData.due_date?.replace(/-/g, "/") || "-"}
                                        </span>
                                        <span className="mt-1 text-[11px] font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                            確定公表情報（民間債権遅延ではありません）
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 my-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        未払い金額（税込）
                                    </span>
                                    <span className="text-4xl font-extrabold text-slate-900 font-mono">
                                        ¥{(caseData.amount ?? 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-slate-500 block mb-1">当初支払期日</span>
                                    <div className="flex flex-col items-end">
                                        <span className="text-lg font-bold text-slate-900 font-mono">
                                            {caseData.due_date?.replace(/-/g, "/") || "-"}
                                        </span>
                                        {!isResolved && currentDelayDays > 0 && (
                                            <span className="mt-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 border border-rose-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                期日から {currentDelayDays}日 遅れ
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2軸ステータスカード（公的登記ステータス × 相手先の営業実態） */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                            {/* 1. 公的登記ステータス（国税庁・gBizINFO準拠） */}
                            <div className={`p-4 rounded-xl border ${
                                caseData.registry_status === "closed"
                                    ? "bg-rose-50/80 border-rose-200"
                                    : caseData.registry_status === "sole_proprietor"
                                    ? "bg-amber-50/80 border-amber-200"
                                    : caseData.registry_status === "active"
                                    ? "bg-blue-50/80 border-blue-200"
                                    : "bg-slate-50 border-slate-200"
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
                                    ) : caseData.registry_status === "active" ? (
                                        <div className="text-sm font-extrabold text-blue-800">
                                            法人登記中（存続中）
                                        </div>
                                    ) : (
                                        <div className="text-sm font-extrabold text-slate-700">
                                            未確認（国税庁サイトで要確認）
                                        </div>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-600 leading-snug">
                                    {caseData.registry_status === "closed"
                                        ? `国税庁データ上、すでに清算結了や解散が行われ法人格が消滅しています${caseData.registry_close_date ? `（閉鎖日: ${caseData.registry_close_date}）` : ""}。`
                                        : caseData.registry_status === "sole_proprietor"
                                        ? "法人番号を持たない個人事業主（屋号等）として登録されています。"
                                        : caseData.registry_status === "active"
                                        ? "国税庁・経済産業省gBizINFOの法人情報上で存続・登記が確認されています。"
                                        : "最新の法人登記ステータスは自動照合されていません。取引前に国税庁法人番号公表サイト等で最新状況をご確認ください。"}
                                </p>
                            </div>

                            {/* 2. 相手方の営業実態（被害企業報告 または 公的処分記録） */}
                            {sourceInfo.isOfficial ? (
                                <div className="p-4 rounded-xl border bg-blue-50/50 border-blue-200">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                                        <span>公的記録ステータス</span>
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-300">
                                            公表元: {sourceInfo.sourceName}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-extrabold text-slate-900">
                                            公的機関による処分・命令記録
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-[11px] text-slate-600 leading-snug">
                                        <p>
                                            {sourceInfo.sourceName}が法令に基づき公表した公認確定記録をもとにMIERISが独自に抽出・加工して掲載しています（民間申告データではありません）。
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            ※国・各省庁が本サービスを直接保証・認証したものではありません。是正措置の完了等による最新状況は公表元一次資料をご確認ください。
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                                        <span>相手方の営業実態（加盟企業報告）</span>
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
                                            ? "請求・督促に対して電話着信拒否など連絡が一切取れない状態です。"
                                            : caseData.business_status === "relocated"
                                            ? "登録所在地から退去・不在となっており、連絡がつかない状態です。"
                                            : caseData.business_status === "bankrupt"
                                            ? "弁護士受任通知や破産申し立て手続きが行われている状態です。"
                                            : caseData.business_status === "active"
                                            ? "連絡自体は取れているものの、約束期日に入金が履行されていない状態です。"
                                            : "現在の営業実態に関する明確な申告はありません。"}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 7項目詳細リスト */}
                        <div className="space-y-4 py-2 text-sm">
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">対象企業名（商号・屋号）</span>
                                <span className="font-bold text-slate-900">{caseData.company_name}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">法人番号</span>
                                <span className="font-mono text-slate-800">
                                    {caseData.corporate_number || (isCorporateEntityName(caseData.company_name) || caseData.registry_status !== "sole_proprietor" ? "公表資料に記載なし（法人）" : "未登録（個人事業主）")}
                                </span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">公的登記ステータス</span>
                                <span className="font-bold text-slate-800">
                                    {caseData.registry_status === "closed"
                                        ? "閉鎖（清算結了等）"
                                        : caseData.registry_status === "sole_proprietor"
                                        ? "個人事業主"
                                        : caseData.registry_status === "active"
                                        ? "登記中（存続）"
                                        : "未確認（国税庁サイトで要確認）"}
                                </span>
                            </div>
                            {sourceInfo.isOfficial ? (
                                <div className="flex justify-between py-2.5 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">事案分類（公的記録）</span>
                                    <span className="font-bold text-blue-900">{sourceInfo.sourceCategory}</span>
                                </div>
                            ) : (
                                <div className="flex justify-between py-2.5 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">相手先営業・連絡実態</span>
                                    <span className="font-bold text-slate-800">
                                        {caseData.business_status === "unreachable" ? "音信不通" : caseData.business_status === "relocated" ? "事務所引き払い・所在不明" : caseData.business_status === "bankrupt" ? "倒産・破産手続き中" : caseData.business_status === "active" ? "連絡可能（協議中）" : "不明"}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">本社所在地・拠点</span>
                                <span className="text-slate-800">{caseData.location || "未登録"}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">
                                    {sourceInfo.isOfficial ? "公表日 / 処分日" : "請求日"}
                                </span>
                                <span className="font-mono text-slate-800">
                                    {sourceInfo.isOfficial
                                        ? (caseData.due_date || caseData.invoice_date)?.replace(/-/g, "/") || "-"
                                        : caseData.invoice_date?.replace(/-/g, "/") || "-"}
                                </span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b border-slate-100">
                                <span className="text-slate-500 font-medium">
                                    {sourceInfo.isOfficial ? "記録の種別・区分" : "入金の有無"}
                                </span>
                                {sourceInfo.isOfficial ? (
                                    <span className="font-bold text-blue-900">
                                        {/破産|民事再生/.test(caseData.counterparty_claim || "")
                                            ? "裁判所公告・法的整理手続記録"
                                            : "行政処分・法令違反公表記録（公表日時点の確定事実）"}
                                    </span>
                                ) : (
                                    <span className={`font-bold ${isResolved ? "text-emerald-700" : "text-rose-700"}`}>
                                        {isResolved ? "解決済み" : "未払い"}
                                    </span>
                                )}
                            </div>
                            {sourceInfo.isOfficial ? (
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2.5 border-b border-slate-100 gap-1 sm:gap-4">
                                    <span className="text-slate-500 font-medium shrink-0">公表元・公開機関</span>
                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                        <span className="font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 text-xs sm:text-sm">
                                            🏛️ {sourceInfo.sourceName}
                                        </span>
                                        {sourceInfo.sourceUrl && (
                                            <a
                                                href={sourceInfo.sourceUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                <span>公表ソース</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between py-2.5 border-b border-slate-100">
                                    <span className="text-slate-500 font-medium">登録元企業</span>
                                    <span className="text-slate-700">{caseData.companies?.name || "加盟企業"}</span>
                                </div>
                            )}
                        </div>

                        {/* 登録理由 */}
                        <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                                {sourceInfo.isOfficial ? "公的公表概要・処分内容" : "登録理由（未払い・遅延の経緯・相手側の主張）"}
                            </h3>
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                {caseData.counterparty_claim || "特段の登録理由・相手側の主張は記載されていません。"}
                            </p>
                            {caseData.admin_notes && (sourceInfo.isOfficial || isAdmin || (isOwner && caseData.status === "rejected")) && (
                                <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-wrap">
                                    {caseData.admin_notes}
                                </div>
                            )}
                        </div>

                        {/* 添付資料・証拠ファイル確認状況（民間登録案件のみ） */}
                        {!sourceInfo.isOfficial && (
                            <div className="mt-6 space-y-3">
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
                                    添付資料・証拠ファイル確認状況
                                </h3>
                                {!(isAdmin || isOwner) ? (
                                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs sm:text-sm font-medium">
                                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <span>運営事務局にて請求書・契約書等の客観的証拠資料を確認・審査済みです（機密・個人情報保護のため添付原本は非公開）。</span>
                                    </div>
                                ) : evidenceFiles.length === 0 ? (
                                    <p className="text-xs sm:text-sm text-slate-500">添付された証拠ファイルはありません。</p>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {evidenceFiles.map((file, i) => (
                                            <a
                                                key={`${file.path}-${i}`}
                                                href={file.signedUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400 transition-colors block outline-none"
                                            >
                                                {file.type === "image" ? (
                                                    <>
                                                        <div className="aspect-square relative flex items-center justify-center bg-slate-950">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={file.signedUrl}
                                                                alt={file.name}
                                                                className="max-w-full max-h-full object-contain"
                                                            />
                                                        </div>
                                                        <div className="p-2 text-[11px] text-slate-700 truncate text-center group-hover:text-slate-900 bg-white/95 absolute bottom-0 w-full backdrop-blur-sm">
                                                            {file.name}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="aspect-square p-4 flex flex-col items-center justify-center gap-2 text-slate-600 group-hover:text-slate-900 bg-white">
                                                        <FileText className="w-8 h-8 text-slate-500" />
                                                        <span className="text-[11px] truncate w-full text-center font-medium">
                                                            {file.name}
                                                        </span>
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 font-semibold">
                                                            <span>開く</span>
                                                            <ExternalLink className="w-2.5 h-2.5" />
                                                        </span>
                                                    </div>
                                                )}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 自社登録（未承認時）または管理者の場合：追加資料のアップロード */}
                        {!sourceInfo.isOfficial && (isAdmin || (isOwner && caseData.status !== "approved")) && (
                            <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                                            追加資料のアップロード
                                        </h3>
                                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                            運営から追加資料の提出を求められた場合や、後から請求書・契約書・スクリーンショット等を追加したい場合はこちらからアップロードできます（1ファイルあたり最大50MB / 複数ファイル添付可）。
                                            {caseData.status === "rejected" && (
                                                <span className="block mt-1 font-semibold text-slate-900">
                                                    ※追加資料をアップロードして保存すると、自動的に「審査待ち」へ戻り再審査が申請されます。
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {caseData.evidence_urls && caseData.evidence_urls.length > 0 && (
                                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 shrink-0">
                                            現在の添付資料: {caseData.evidence_urls.length} 件
                                        </span>
                                    )}
                                </div>

                                <div className="border border-dashed border-slate-300 bg-white rounded-xl p-4 text-center hover:bg-slate-50/80 transition-colors relative">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={handleAdditionalFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept="image/*,application/pdf"
                                    />
                                    <div className="pointer-events-none">
                                        <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                                        <p className="text-xs font-semibold text-slate-700">タップまたはドラッグ＆ドロップでファイルを選択</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">（1ファイルあたり最大50MB / 複数ファイル添付可）</p>
                                    </div>
                                </div>

                                {additionalFiles.length > 0 && (
                                    <div className="space-y-2">
                                        <ul className="space-y-1.5">
                                            {additionalFiles.map((file, idx) => (
                                                <li key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs">
                                                    <span className="truncate max-w-[75%] text-slate-700 font-medium">
                                                        {file.name} ({(file.size / 1024).toFixed(0)}KB)
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAdditionalFile(idx)}
                                                        className="text-rose-600 hover:text-rose-800 p-1 rounded"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            type="button"
                                            onClick={handleAdditionalUpload}
                                            disabled={uploadingEvidence}
                                            className="btn-primary px-5 py-2.5 text-xs font-bold rounded-lg inline-flex items-center gap-1.5"
                                        >
                                            {uploadingEvidence
                                                ? "アップロード中..."
                                                : caseData.status === "rejected"
                                                ? "追加資料を保存して再審査を申請する"
                                                : "選択した資料を追加保存する"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 登録日 & 審査ステータス */}
                        <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
                            <span>システム登録日: {formatDateTimeJST(caseData.created_at)}</span>
                            {sourceInfo.isOfficial ? (
                                <span className="flex items-center gap-1 font-semibold text-blue-700">
                                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                                    <span>公的機関公表データ（自動同期）</span>
                                </span>
                            ) : caseData.status === "approved" ? (
                                <span className="flex items-center gap-1 font-semibold text-emerald-700">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    <span>運営管理者承認済み</span>
                                </span>
                            ) : caseData.status === "pending" ? (
                                <span className="flex items-center gap-1 font-semibold text-amber-700">
                                    <Clock className="w-4 h-4 text-amber-600" />
                                    <span>運営管理者審査中</span>
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 font-semibold text-rose-700">
                                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                                    <span>審査却下（差し戻し）</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 公的オープンデータ出典および利用規約（免責事項） */}
                    <div className="mt-6">
                        <OfficialDataNotice />
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
