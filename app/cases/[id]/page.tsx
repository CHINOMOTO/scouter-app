"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { FileText, AlertCircle, ArrowLeft, Search, UploadCloud, X, Check } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";

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
    const [canUploadEvidence, setCanUploadEvidence] = useState(false);
    const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
    const [uploadingEvidence, setUploadingEvidence] = useState(false);
    const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 1ファイルあたり最大50MB

    const handleAdditionalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            const validFiles: File[] = [];
            newFiles.forEach((file) => {
                if (file.size > MAX_FILE_SIZE) {
                    alert(`ファイル「${file.name}」はサイズが大きすぎます (1ファイルあたり最大50MB)`);
                } else {
                    validFiles.push(file);
                }
            });
            if (validFiles.length > 0) {
                setAdditionalFiles((prev) => [...prev, ...validFiles]);
            }
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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("ログインセッションが切れました。再ログインしてください。");

            const newPaths: string[] = [];
            for (const file of additionalFiles) {
                const fileExt = file.name.split(".").pop();
                const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError, data: uploadData } = await supabase.storage
                    .from("case-evidence")
                    .upload(fileName, file);

                if (uploadError) {
                    throw new Error(`ファイルのアップロードに失敗しました (${file.name}): ${uploadError.message}`);
                }
                if (uploadData?.path) {
                    newPaths.push(uploadData.path);
                }
            }

            const updatedUrls = [...(caseDetail.evidence_urls || []), ...newPaths];

            const { error: updateError } = await supabase
                .from("blacklist_cases")
                .update({ evidence_urls: updatedUrls })
                .eq("id", caseDetail.id);

            if (updateError) {
                throw new Error(`データ更新に失敗しました: ${updateError.message}`);
            }

            const addedEvidence: EvidenceFile[] = [];
            for (const path of newPaths) {
                const { data: signedData } = await supabase.storage
                    .from("case-evidence")
                    .createSignedUrl(path, 3600);
                if (signedData) {
                    const isImage = path.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    addedEvidence.push({
                        path,
                        signedUrl: signedData.signedUrl,
                        type: isImage ? "image" : "other",
                        name: path.split("/").pop() || "file",
                    });
                }
            }

            setCaseDetail({ ...caseDetail, evidence_urls: updatedUrls });
            setEvidenceFiles((prev) => [...prev, ...addedEvidence]);
            setAdditionalFiles([]);
            setUploadMessage({ type: "success", text: "追加資料（追完エビデンス）をアップロードしました。" });
        } catch (err: any) {
            setUploadMessage({ type: "error", text: err.message || "アップロード中にエラーが発生しました。" });
        } finally {
            setUploadingEvidence(false);
        }
    };

    useEffect(() => {
        if (!id) return;

        const fetchDetail = async () => {
            setLoading(true);
            setErrorMsg(null);

            // 現在のログインユーザー情報を取得
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setErrorMsg("認証エラー: ログインしてください。");
                setLoading(false);
                return;
            }

            const { data: currentUser } = await supabase
                .from("app_users")
                .select("company_id, role")
                .eq("id", user.id)
                .single();

            if (!currentUser) {
                setErrorMsg("ユーザー情報の取得に失敗しました。");
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("blacklist_cases")
                .select(
                    "id, full_name, full_name_kana, gender, birth_date, phone_last4, occurrence_date, reason_text, status, rejected_reason, created_at, evidence_urls, registered_company_id, registered_by_user_id, risk_score"
                )
                .eq("id", id)
                .maybeSingle();

            if (error) {
                setErrorMsg(error.message || "データの取得に失敗しました。");
                setLoading(false);
                return;
            }

            if (!data) {
                setErrorMsg("該当するデータが見つかりません。");
                setLoading(false);
                return;
            }

            // アクセス権限チェック: 管理者(admin)であるか、自社のデータであるか、またはステータスが「承認済み(approved)」の場合のみ閲覧可能
            const isOwnCompany = data.registered_company_id === currentUser.company_id;
            const isApproved = data.status === 'approved';
            
            if (currentUser.role !== 'admin' && !isOwnCompany && !isApproved) {
                setErrorMsg("アクセス権限がありません。他社の審査中データは閲覧できません。");
                setLoading(false);
                return;
            }

            setCanUploadEvidence(currentUser.role === 'admin' || isOwnCompany);
            setCaseDetail(data as CaseDetail);

            // アクセスログの保存
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    await fetch("/api/audit", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            action_type: "VIEW_CASE",
                            target_id: id
                        })
                    });
                }
            } catch (logErr) {
                console.error("Failed to save audit log:", logErr);
            }

            // Fetch Company Name if exists
            if (data.registered_company_id) {
                const { data: comp } = await supabase
                    .from("companies")
                    .select("name")
                    .eq("id", data.registered_company_id)
                    .single();
                if (comp) {
                    setCompanyName(comp.name);
                }
            }

            // Fetch Registrant Name if exists
            if (data.registered_by_user_id) {
                const { data: appUser } = await supabase
                    .from("app_users")
                    .select("display_name")
                    .eq("id", data.registered_by_user_id)
                    .single();
                if (appUser) {
                    setRegistrantName(appUser.display_name);
                }
            }

            // 証拠ファイルの署名付きURLを取得
            if (data.evidence_urls && Array.isArray(data.evidence_urls) && data.evidence_urls.length > 0) {
                const files: EvidenceFile[] = [];
                for (const path of data.evidence_urls) {
                    const { data: signedData } = await supabase.storage
                        .from('case-evidence')
                        .createSignedUrl(path, 3600); // 1時間有効

                    if (signedData) {
                        const isImage = path.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                        files.push({
                            path,
                            signedUrl: signedData.signedUrl,
                            type: isImage ? 'image' : 'other',
                            name: path.split('/').pop() || 'file'
                        });
                    }
                }
                setEvidenceFiles(files);
            } else {
                setEvidenceFiles([]);
            }

            setLoading(false);
        };

        fetchDetail();
    }, [id]);

    return (
        <RequireAuth>
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 flex flex-col items-center">
                <div className="max-w-3xl w-full">

                    <div className="mb-4 animate-fade-in flex items-center gap-2.5 flex-wrap">
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
                                                    {caseDetail.created_at ? new Date(caseDetail.created_at).toLocaleDateString() : "-"}
                                                </dd>
                                            </div>
                                            <div className="grid grid-cols-[120px_1fr]">
                                                <dt className="text-slate-600">登録元</dt>
                                                <dd className="text-slate-900 font-medium">
                                                    {companyName || "-"}
                                                </dd>
                                            </div>
                                            <div className="grid grid-cols-[120px_1fr]">
                                                <dt className="text-slate-600">登録者</dt>
                                                <dd className="text-slate-900 font-medium">
                                                    {registrantName || "-"}
                                                </dd>
                                            </div>
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
                                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2">添付資料</h2>
                                    {evidenceFiles.length === 0 ? (
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

                                    {/* 自社または管理者の場合：追加資料（追完エビデンス）アップロード欄 */}
                                    {canUploadEvidence && (
                                        <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                            <div>
                                                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                                                    追加資料（追完エビデンス）のアップロード
                                                </h3>
                                                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                                    運営から追加資料の提出（追完）を求められた場合や、後から証拠スクリーンショット・PDF等を追加したい場合はこちらからアップロードできます（1ファイルあたり最大50MB / 複数ファイル添付可）。
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
                                                        {uploadingEvidence ? "アップロード中..." : "選択した資料を追加保存する"}
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
