"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { FileText, AlertCircle, ArrowLeft, Search, UploadCloud, X, Check, ShieldCheck } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { translateErrorMessage } from "@/lib/errorMessage";
import { formatDateJST } from "@/lib/dateFormat";
import { validateEvidenceFiles, extractSafeFileExtension } from "@/lib/fileValidation";

type CaseDetail = {
    id: string;
    full_name: string;
    full_name_kana: string | null;
    gender: "male" | "female" | "other" | "unknown";
    birth_date: string;
    phone_last4: string | null;
    occurrence_date: string;
    reason_text: string;
    status: "pending" | "approved" | "rejected";
    rejected_reason?: string | null;
    created_at: string;
    approved_at?: string | null;
    evidence_urls?: string[];
    registered_company_id?: string;
    registered_by_user_id?: string;
    city?: string | null;
};

type EvidenceFile = {
    path: string;
    signedUrl: string;
    type: 'image' | 'other';
    name: string;
}

function genderLabel(g: CaseDetail["gender"]) {
    switch (g) {
        case "male":
            return "男性";
        case "female":
            return "女性";
        case "other":
            return "その他";
        case "unknown":
        default:
            return "未設定";
    }
}

function statusLabel(status: CaseDetail["status"]) {
    switch (status) {
        case "approved":
            return "承認済み";
        case "pending":
            return "審査中";
        case "rejected":
            return "却下";
    }
}

function statusColor(status: CaseDetail["status"]) {
    switch (status) {
        case "approved":
            return "text-emerald-700 border-emerald-200 bg-emerald-50";
        case "pending":
            return "text-amber-700 border-amber-200 bg-amber-50";
        case "rejected":
            return "text-rose-700 border-rose-200 bg-rose-50";
    }
}

export default function CaseDetailPage() {
    const params = useParams();
    const id = params?.id as string;

    const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [registrantName, setRegistrantName] = useState<string | null>(null);

    // Storage files & 追完アップロード用ステート
    const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
    const [canViewRawEvidence, setCanViewRawEvidence] = useState(false);
    const [canUploadEvidence, setCanUploadEvidence] = useState(false);
    const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
    const [uploadingEvidence, setUploadingEvidence] = useState(false);
    const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleAdditionalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const currentTotal = (caseDetail?.evidence_urls?.length || 0) + additionalFiles.length;
            const { validFiles, errors } = validateEvidenceFiles(Array.from(e.target.files), currentTotal);
            if (errors.length > 0) {
                setUploadMessage({ type: "error", text: errors[0] });
            } else {
                setUploadMessage(null);
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
        if (!caseDetail || additionalFiles.length === 0) return;
        setUploadingEvidence(true);
        setUploadMessage(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!session?.access_token || !user) {
                throw new Error("ログインセッションが切れました。再ログインしてください。");
            }

            const newPaths: string[] = [];
            for (const file of additionalFiles) {
                const safeExt = extractSafeFileExtension(file.name);
                if (!safeExt) {
                    throw new Error(`ファイル「${file.name}」は対応していない形式です。画像またはPDFを選択してください。`);
                }
                const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${safeExt}`;

                const { error: uploadError, data: uploadData } = await supabase.storage
                    .from("case-evidence")
                    .upload(fileName, file);

                if (uploadError) {
                    throw new Error(`ファイル「${file.name}」のアップロードに失敗しました。${translateErrorMessage(uploadError, "")}`);
                }
                if (uploadData?.path) {
                    newPaths.push(uploadData.path);
                }
            }

            const res = await fetch(`/api/cases/${caseDetail.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    addedEvidenceUrls: newPaths,
                }),
            });

            const resData = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(resData.error || "追加資料の保存に失敗しました。");
            }

            const isRejectedResubmit = Boolean(resData.resubmitted);
            setCaseDetail({
                ...caseDetail,
                evidence_urls: resData.case?.evidence_urls || [...(caseDetail.evidence_urls || []), ...newPaths],
                status: resData.case?.status || caseDetail.status,
                rejected_reason: isRejectedResubmit ? null : caseDetail.rejected_reason,
            });
            if (Array.isArray(resData.addedEvidence)) {
                setEvidenceFiles((prev) => [...prev, ...resData.addedEvidence]);
            }
            setAdditionalFiles([]);
            setUploadMessage({
                type: "success",
                text: isRejectedResubmit
                    ? "追加資料をアップロードし、再審査を申請しました。"
                    : "追加資料をアップロードしました。",
            });
        } catch (err: unknown) {
            setUploadMessage({ type: "error", text: translateErrorMessage(err, "アップロード中にエラーが発生しました。") });
        } finally {
            setUploadingEvidence(false);
        }
    };

    useEffect(() => {
        if (!id) return;

        const fetchDetail = async () => {
            setLoading(true);
            setErrorMsg(null);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                    setErrorMsg("認証エラー: ログインしてください。");
                    return;
                }

                const res = await fetch(`/api/cases/${id}`, {
                    headers: {
                        "Authorization": `Bearer ${session.access_token}`,
                    },
                });
                const data = await res.json().catch(() => ({}));

                if (!res.ok || !data.case) {
                    setErrorMsg(translateErrorMessage(data.error, "該当するデータが見つかりません。"));
                    return;
                }

                setCaseDetail(data.case as CaseDetail);
                setCompanyName(data.companyName || null);
                setRegistrantName(data.registrantName || null);
                setEvidenceFiles(Array.isArray(data.evidenceFiles) ? data.evidenceFiles : []);
                setCanViewRawEvidence(Boolean(data.canViewRawEvidence));
                setCanUploadEvidence(Boolean(data.canUploadEvidence));

                // アクセスログの保存
                try {
                    await fetch("/api/audit", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                            action_type: "VIEW_CASE",
                            target_id: id,
                        }),
                    });
                } catch (logErr) {
                    console.error("Failed to save audit log:", logErr);
                }
            } catch (err: unknown) {
                console.error("Case detail fetch error:", err);
                setErrorMsg(translateErrorMessage(err, "データの取得に失敗しました。"));
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id]);

    return (
        <RequireAuth>
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 flex flex-col items-center">
                <div className="max-w-3xl w-full">

                    <div className="mb-4 animate-fade-in flex items-center gap-2.5 flex-wrap">
                        <Link href="/dashboard" className="btn-secondary text-xs inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg hover:bg-slate-100 transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                            <span>ダッシュボードへ戻る</span>
                        </Link>
                        <Link href="/search" className="btn-secondary text-xs inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg hover:bg-slate-100 transition-colors">
                            <Search className="w-3.5 h-3.5 shrink-0" />
                            <span>応募者照会へ戻る</span>
                        </Link>
                        <Link href="/cases" className="btn-secondary text-xs inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg hover:bg-slate-100 transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                            <span>登録一覧へ戻る</span>
                        </Link>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-8 animate-fade-in delay-100">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <span className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></span>
                            </div>
                        ) : errorMsg ? (
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 text-sm">
                                <span className="inline-flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></span>
                            </div>
                        ) : !caseDetail ? (
                            <p className="text-slate-600 text-center py-8">データが見つかりません。</p>
                        ) : (
                            <div className="space-y-8">

                                {/* Header */}
                                <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 relative overflow-hidden mb-6">

                                    <div className="relative z-10 max-w-[75%]">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColor(caseDetail.status)}`}>
                                                {statusLabel(caseDetail.status)}
                                            </span>
                                            <span className="text-slate-600 text-[10px] font-mono">ID: {caseDetail.id.substring(0, 8)}</span>
                                        </div>
                                        <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-1 leading-tight">{caseDetail.full_name}</h1>
                                        <p className="text-slate-600 font-medium">{caseDetail.full_name_kana || ""}</p>
                                    </div>
                                </div>

                                {/* 審査却下の理由アラート */}
                                {caseDetail.status === "rejected" && caseDetail.rejected_reason && (
                                    <div className="p-4 md:p-5 rounded-xl bg-rose-50 border border-rose-200 mb-6">
                                        <div className="flex items-center gap-2 font-bold text-rose-800 text-sm mb-1.5">
                                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                            <span>この登録申請は却下されました</span>
                                        </div>
                                        <div className="text-xs sm:text-sm text-rose-900 leading-relaxed font-medium pl-6">
                                            <span className="font-bold">理由: </span>{caseDetail.rejected_reason}
                                        </div>
                                    </div>
                                )}

                                {/* Info Grid */}
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">基本情報</h2>
                                        <dl className="space-y-3 text-sm">
                                            <div className="grid grid-cols-[120px_1fr]">
                                                <dt className="text-slate-600">性別</dt>
                                                <dd className="text-slate-900 font-medium">{genderLabel(caseDetail.gender)}</dd>
                                            </div>
                                            <div className="grid grid-cols-[120px_1fr]">
                                                <dt className="text-slate-600">生年月日</dt>
                                                <dd className="text-slate-900 font-medium">{caseDetail.birth_date?.replace(/-/g, "/") || "-"}</dd>
                                            </div>
                                            <div className="grid grid-cols-[120px_1fr]">
                                                <dt className="text-slate-600">電話番号(下4桁)</dt>
                                                <dd className="text-slate-900 font-medium">{caseDetail.phone_last4 || "-"}</dd>
                                            </div>
                                            <div className="grid grid-cols-[120px_1fr]">
                                                <dt className="text-slate-600">住所</dt>
                                                <dd className="text-slate-900 font-medium">{caseDetail.city || "-"}</dd>
                                            </div>
                                            <div className="grid grid-cols-[120px_1fr]">
                                                <dt className="text-slate-600">発生日</dt>
                                                <dd className="text-slate-900 font-medium">{caseDetail.occurrence_date?.replace(/-/g, "/") || "-"}</dd>
                                            </div>
                                            <div className="grid grid-cols-[120px_1fr]">
                                                <dt className="text-slate-600">登録日</dt>
                                                <dd className="text-slate-900 font-medium">
                                                    {formatDateJST(caseDetail.created_at)}
                                                </dd>
                                            </div>
                                            {caseDetail.approved_at && (
                                                <div className="grid grid-cols-[120px_1fr]">
                                                    <dt className="text-slate-600">承認日</dt>
                                                    <dd className="text-slate-900 font-medium">
                                                        {formatDateJST(caseDetail.approved_at)}
                                                    </dd>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-[120px_1fr]">
                                                <dt className="text-slate-600">登録元</dt>
                                                <dd className="text-slate-900 font-medium">
                                                    {companyName || "加盟企業"}
                                                </dd>
                                            </div>
                                            {canViewRawEvidence && (
                                                <div className="grid grid-cols-[120px_1fr]">
                                                    <dt className="text-slate-600">登録担当者</dt>
                                                    <dd className="text-slate-900 font-medium">
                                                        {registrantName || "-"}
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>

                                    <div className="space-y-4">
                                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">トラブル詳細・理由</h2>
                                        <div className="bg-white p-4 rounded-lg border border-slate-200 min-h-[160px]">
                                            <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                                                {caseDetail.reason_text}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence Files */}
                                <div className="space-y-4">
                                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">添付資料・同意書確認状況</h2>
                                    {!canViewRawEvidence ? (
                                        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs sm:text-sm font-medium">
                                            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                            <span>運営事務局にて本人同意書および客観的証拠資料の確認・審査済みです（個人情報保護のため添付原本は非公開）。</span>
                                        </div>
                                    ) : evidenceFiles.length === 0 ? (
                                        <p className="text-sm text-slate-500">証拠ファイルはありません。</p>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {evidenceFiles.map((file, i) => (
                                                <div key={i} className="group relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200 hover:border-slate-200 transition-colors">
                                                    {file.type === 'image' ? (
                                                        <a href={file.signedUrl} target="_blank" rel="noopener noreferrer" className="block outline-none">
                                                            <div className="aspect-square relative flex items-center justify-center bg-slate-950">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={file.signedUrl} alt={file.name} className="max-w-full max-h-full object-contain" />
                                                            </div>
                                                            <div className="p-2 text-xs text-slate-700 truncate text-center group-hover:text-slate-900 bg-white absolute bottom-0 w-full backdrop-blur-sm">
                                                                {file.name}
                                                            </div>
                                                        </a>
                                                    ) : (
                                                        <a href={file.signedUrl} target="_blank" rel="noopener noreferrer" className="block outline-none h-full p-4 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-slate-900 aspect-square">
                                                            <FileText className="w-8 h-8 text-slate-500" />
                                                            <span className="text-xs truncate w-full text-center">{file.name}</span>
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* 自社（未承認時）または管理者の場合：追加資料のアップロード欄 */}
                                    {canUploadEvidence && (
                                        <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                            <div>
                                                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                                                    追加資料のアップロード
                                                </h3>
                                                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                                    運営から追加資料の提出を求められた場合や、後から証拠スクリーンショット・PDF等を追加したい場合はこちらからアップロードできます（1ファイルあたり最大50MB / 複数ファイル添付可）。
                                                    {caseDetail.status === "rejected" && (
                                                        <span className="block font-bold text-slate-800 mt-1">
                                                            ※追加資料をアップロードすると、自動的に「審査中」に戻り再申請されます。
                                                        </span>
                                                    )}
                                                </p>
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
                                                            : caseDetail.status === "rejected"
                                                                ? "追加資料を保存して再審査を申請する"
                                                                : "選択した資料を追加保存する"}
                                                    </button>
                                                </div>
                                            )}

                                            {uploadMessage && (
                                                <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                                                    uploadMessage.type === "success"
                                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                        : "bg-rose-50 text-rose-800 border border-rose-200"
                                                }`}>
                                                    {uploadMessage.type === "success" ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                                    <span>{uploadMessage.text}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                            </div>
                        )}
                    </div>
                </div>
            </div>
        </RequireAuth>
    );
}
