"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Toast, ToastMessage } from "@/components/Toast";
import {
    ArrowLeft,
    Building2,
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    FileText,
    ExternalLink,
    ShieldCheck,
    Check,
    X,
    File,
    Download,
    Eye
} from "lucide-react";

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
    evidence_urls?: string[];
    status: "pending" | "approved" | "rejected";
    admin_notes?: string | null;
    created_at: string;
    updated_at?: string;
    registered_by_company_id?: string;
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

export default function AdminCreditCaseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [caseDetail, setCaseDetail] = useState<CreditCaseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // 証拠ファイル
    const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // モーダル・アクション状態
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [adminNotes, setAdminNotes] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    const fetchDetail = async () => {
        if (!id) return;
        setLoading(true);
        setFetchError(null);

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) {
                setFetchError("認証セッションがありません。ログインしてください。");
                setLoading(false);
                return;
            }

            const res = await fetch(`/api/credit-cases/${id}`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                setFetchError(errData.error || "データの取得に失敗しました。");
                setLoading(false);
                return;
            }

            const data = await res.json();
            if (!data.case) {
                setFetchError("対象のデータが見つかりませんでした。");
                setLoading(false);
                return;
            }

            const c = data.case as CreditCaseDetail;
            setCaseDetail(c);
            setAdminNotes(c.admin_notes || "");

            // 証拠ファイルの署名付きURLを取得
            if (c.evidence_urls && Array.isArray(c.evidence_urls) && c.evidence_urls.length > 0) {
                const files: EvidenceFile[] = [];
                for (const path of c.evidence_urls) {
                    // まず case_attachments から取得を試みる
                    let { data: signedData } = await supabase.storage
                        .from("case_attachments")
                        .createSignedUrl(path, 3600);

                    // なければ case-evidence を試行
                    if (!signedData) {
                        const fallback = await supabase.storage
                            .from("case-evidence")
                            .createSignedUrl(path, 3600);
                        signedData = fallback.data;
                    }

                    if (signedData?.signedUrl) {
                        const isImage = path.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        const isPdf = path.match(/\.pdf$/i);
                        files.push({
                            path,
                            signedUrl: signedData.signedUrl,
                            type: isImage ? "image" : isPdf ? "pdf" : "other",
                            name: path.split("/").pop() || "evidence_file"
                        });
                    }
                }
                setEvidenceFiles(files);
            } else {
                setEvidenceFiles([]);
            }
        } catch (e: any) {
            console.error("Fetch detail error:", e);
            setFetchError(e.message || "予期せぬエラーが発生しました。");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [id]);

    // 審査ステータス更新 (承認 / 却下)
    const handleUpdateStatus = async (status: "approved" | "rejected") => {
        if (!caseDetail) return;
        setIsProcessing(true);

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) {
                setToast({ type: "error", text: "認証セッションが見つかりません。" });
                setIsProcessing(false);
                return;
            }

            const res = await fetch(`/api/admin/credit-cases/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    status,
                    adminNotes: adminNotes.trim() || null
                })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || "審査ステータスの更新に失敗しました。");
            }

            setToast({
                type: "success",
                text: status === "approved" ? "企業信用審査を承認しました。" : "企業信用審査を却下しました。"
            });

            setShowApproveModal(false);
            setShowRejectModal(false);
            await fetchDetail();
        } catch (err: any) {
            setToast({ type: "error", text: err.message || "エラーが発生しました。" });
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <RequireAdmin>
                <div className="min-h-screen pt-32 flex justify-center bg-[#f8fafc]">
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                        <p className="text-xs text-slate-500 font-medium">読み込み中...</p>
                    </div>
                </div>
            </RequireAdmin>
        );
    }

    if (fetchError || !caseDetail) {
        return (
            <RequireAdmin>
                <div className="min-h-screen pt-32 text-center px-4 bg-[#f8fafc]">
                    <div className="max-w-md mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-2xs">
                        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                        <h2 className="text-lg font-bold text-slate-900 mb-2">データを取得できませんでした</h2>
                        <p className="text-xs text-slate-600 mb-6">{fetchError || "該当データが存在しないか、アクセス権がありません。"}</p>
                        <Link href="/admin/credit-cases" className="btn-secondary text-xs inline-block">
                            企業信用審査一覧へ戻る
                        </Link>
                    </div>
                </div>
            </RequireAdmin>
        );
    }

    const isResolved = caseDetail.payment_status === "resolved";

    return (
        <RequireAdmin>
            <Toast toast={toast} onClose={() => setToast(null)} />

            <div className="min-h-screen pt-16 sm:pt-20 md:pt-10 pb-20 px-3.5 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-4xl w-full">

                    {/* ナビゲーション & バッジ */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 sm:gap-4">
                        <Link
                            href="/admin/credit-cases"
                            className="btn-secondary text-xs h-10 px-4 rounded-xl flex items-center justify-center gap-1.5 font-medium transition-colors whitespace-nowrap active:scale-[0.98] w-full sm:w-auto"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>← 企業信用審査一覧へ戻る</span>
                        </Link>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white tracking-wider">
                                ADMIN CONSOLE
                            </span>
                            <span className="text-xs text-slate-500 font-mono truncate max-w-[200px]">
                                ID: {caseDetail.id}
                            </span>
                        </div>
                    </div>

                    {/* メインカード */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden mb-6">
                        
                        {/* ヘッダー情報 */}
                        <div className="p-4.5 sm:p-8 border-b border-slate-100">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase tracking-widest font-mono">
                                            CREDIT CASE
                                        </span>
                                        {caseDetail.status === "pending" && (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                <Clock className="w-3 h-3" />
                                                <span>審査待ち</span>
                                            </span>
                                        )}
                                        {caseDetail.status === "approved" && (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>承認済み</span>
                                            </span>
                                        )}
                                        {caseDetail.status === "rejected" && (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                                <XCircle className="w-3 h-3" />
                                                <span>却下</span>
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                        <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-slate-700 shrink-0" />
                                        <span>{caseDetail.company_name}</span>
                                    </h1>
                                    {caseDetail.corporate_number && (
                                        <p className="text-xs text-slate-500 font-mono mt-1 sm:ml-8">
                                            法人番号: {caseDetail.corporate_number}
                                        </p>
                                    )}
                                </div>

                                {/* 入金ステータス */}
                                <div>
                                    {isResolved ? (
                                        <div className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                <span>解決済み（入金完了）</span>
                                            </div>
                                            {caseDetail.resolved_delay_days ? (
                                                <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                                                    遅延 {caseDetail.resolved_delay_days} 日
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-2 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-center">
                                            <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold">
                                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                                <span>未払い・支払遅延中</span>
                                            </div>
                                            <div className="text-[11px] text-rose-600 mt-0.5">未入金</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 未払い金額ハイライト */}
                            <div className="p-4 sm:p-6 bg-slate-50 rounded-xl border border-slate-200 mt-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                                <div>
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                        未払い金額（税込）
                                    </span>
                                    <span className="text-2xl sm:text-4xl font-extrabold text-slate-900">
                                        ¥{caseDetail.amount.toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-left sm:text-right">
                                    <span className="text-xs font-bold text-slate-500 block mb-0.5 sm:mb-1">当初支払期日</span>
                                    <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                                        {caseDetail.due_date.replace(/-/g, "/")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 申請詳細リスト */}
                        <div className="p-6 sm:p-8 space-y-3 text-sm">
                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                案件情報
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-50/60 p-3.5 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-500 block mb-0.5">対象企業名（商号）</span>
                                    <span className="font-bold text-slate-900">{caseDetail.company_name}</span>
                                </div>
                                <div className="bg-slate-50/60 p-3.5 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-500 block mb-0.5">法人番号</span>
                                    <span className="font-mono font-medium text-slate-900">{caseDetail.corporate_number || "未登録"}</span>
                                </div>
                                <div className="bg-slate-50/60 p-3.5 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-500 block mb-0.5">本社所在地</span>
                                    <span className="font-medium text-slate-900">{caseDetail.location || "未登録"}</span>
                                </div>
                                <div className="bg-slate-50/60 p-3.5 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-500 block mb-0.5">請求日</span>
                                    <span className="font-mono font-medium text-slate-900">{caseDetail.invoice_date?.replace(/-/g, "/") || "-"}</span>
                                </div>
                                <div className="bg-slate-50/60 p-3.5 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-500 block mb-0.5">登録申請元企業</span>
                                    <span className="font-bold text-slate-900">{caseDetail.companies?.name || "加盟企業"}</span>
                                </div>
                                <div className="bg-slate-50/60 p-3.5 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-500 block mb-0.5">申請日時</span>
                                    <span className="font-mono text-slate-700">{new Date(caseDetail.created_at).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* 登録理由 */}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                                    登録理由（未払い・遅延の経緯・相手側の主張）
                                </span>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {caseDetail.counterparty_claim || "特段の登録理由・相手側の主張は記載されていません。"}
                                </div>
                            </div>

                            {/* 管理者メモ */}
                            {caseDetail.admin_notes && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                                        管理者メモ / 審査却下理由
                                    </span>
                                    <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-mono">
                                        {caseDetail.admin_notes}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 証拠書類（エビデンスファイル） */}
                        <div className="p-6 sm:p-8 border-t border-slate-100 bg-slate-50/40">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-slate-600" />
                                    <h2 className="text-sm font-bold text-slate-900">
                                        提出された証拠資料（エビデンス）
                                    </h2>
                                </div>
                                <span className="text-xs text-slate-500">
                                    {evidenceFiles.length} 件の添付ファイル
                                </span>
                            </div>

                            {evidenceFiles.length === 0 ? (
                                <p className="text-xs text-slate-500 italic bg-white p-4 rounded-xl border border-slate-200 text-center">
                                    添付された証拠ファイルはありません。
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {evidenceFiles.map((file, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                                        >
                                            {file.type === "image" ? (
                                                <div
                                                    className="relative aspect-video bg-slate-100 cursor-pointer group overflow-hidden"
                                                    onClick={() => setSelectedImage(file.signedUrl)}
                                                >
                                                    <img
                                                        src={file.signedUrl}
                                                        alt={file.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 text-xs font-bold">
                                                        <Eye className="w-4 h-4" />
                                                        <span>拡大表示</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center text-slate-500 p-4">
                                                    <File className="w-10 h-10 text-slate-400 mb-2" />
                                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                                        {file.type === "pdf" ? "PDF Document" : "File"}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                                                <span className="text-xs text-slate-700 truncate font-mono" title={file.name}>
                                                    {file.name}
                                                </span>
                                                <a
                                                    href={file.signedUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-secondary text-[11px] py-1 px-2 rounded-lg flex items-center gap-1 shrink-0"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    <span>開く</span>
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 審査アクションバー */}
                        <div className="p-4.5 sm:p-8 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                            <div className="text-xs text-slate-500">
                                <span className="font-bold text-slate-700 block sm:inline">現在の審査ステータス: </span>
                                {caseDetail.status === "pending" && "審査待ち（承認または却下を決定してください）"}
                                {caseDetail.status === "approved" && "承認済み（システム全体に共有されています）"}
                                {caseDetail.status === "rejected" && "却下（非公開）"}
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                                {caseDetail.status !== "approved" && (
                                    <button
                                        type="button"
                                        onClick={() => setShowApproveModal(true)}
                                        className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all active:scale-[0.98] w-full sm:w-auto"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>承認する</span>
                                    </button>
                                )}

                                {caseDetail.status !== "rejected" && (
                                    <button
                                        type="button"
                                        onClick={() => setShowRejectModal(true)}
                                        className="inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all active:scale-[0.98] w-full sm:w-auto"
                                    >
                                        <X className="w-4 h-4" />
                                        <span>却下する</span>
                                    </button>
                                )}

                                {caseDetail.status === "approved" && (
                                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2.5 rounded-xl border border-emerald-200 w-full sm:w-auto">
                                        <ShieldCheck className="w-4 h-4" />
                                        <span>承認完了済み</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 画像拡大モーダル */}
                {selectedImage && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
                        onClick={() => setSelectedImage(null)}
                    >
                        <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2">
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <img
                                src={selectedImage}
                                alt="拡大証拠資料"
                                className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                )}

                {/* 承認確認モーダル */}
                {showApproveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200">
                            <div className="flex items-center gap-3 mb-4 text-slate-900">
                                <div className="p-2.5 rounded-full bg-slate-100 text-slate-900">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-bold">企業信用審査の承認</h3>
                            </div>
                            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                                この企業信用登録申請を承認しますか？<br />
                                承認すると、システム全体の企業信用照会で加盟企業に情報が開示されます。
                            </p>

                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    管理者メモ（任意）
                                </label>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="確認したエビデンスや承認理由等"
                                    className="input-field text-xs min-h-[70px] resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowApproveModal(false)}
                                    disabled={isProcessing}
                                    className="btn-secondary flex-1 py-2.5 text-xs font-bold"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdateStatus("approved")}
                                    disabled={isProcessing}
                                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    {isProcessing ? (
                                        <div className="animate-spin h-3.5 w-3.5 border-2 border-white rounded-full border-t-transparent" />
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            <span>承認する</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 却下確認モーダル */}
                {showRejectModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200">
                            <div className="flex items-center gap-3 mb-4 text-rose-600">
                                <div className="p-2.5 rounded-full bg-rose-50 text-rose-600">
                                    <XCircle className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">企業信用審査の却下</h3>
                            </div>
                            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                                この企業信用登録申請を却下しますか？<br />
                                却下された情報は一般の照会一覧には公開されません。
                            </p>

                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    却下理由 / 管理者メモ <span className="text-rose-500 font-bold">*</span>
                                </label>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="例: 提出書類の請求期日と申請内容が不一致のため"
                                    className="input-field text-xs min-h-[90px] resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowRejectModal(false)}
                                    disabled={isProcessing}
                                    className="btn-secondary flex-1 py-2.5 text-xs font-bold"
                                >
                                    キャンセル
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdateStatus("rejected")}
                                    disabled={isProcessing || !adminNotes.trim()}
                                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    {isProcessing ? (
                                        <div className="animate-spin h-3.5 w-3.5 border-2 border-white rounded-full border-t-transparent" />
                                    ) : (
                                        <>
                                            <X className="w-4 h-4" />
                                            <span>却下する</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RequireAdmin>
    );
}
