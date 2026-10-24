"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { FileText, AlertCircle, Edit3, Save, X } from "lucide-react";
import { RequireAdmin } from "@/components/RequireAdmin";

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
  created_at: string;
  approved_at: string | null;
  rejected_reason: string | null;
  evidence_urls?: string[];
  registered_company_id?: string;
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

export default function AdminCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null); // データ取得エラー（ブロッキング）
  const [companyName, setCompanyName] = useState<string | null>(null);

  // Action States
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); // フォーム操作エラー（非ブロッキング）

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState<{ type: 'approved' | 'rejected' } | null>(null);

  // Storage files
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  // 編集モード用ステート（誤字脱字・表現修正用）
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNameKana, setEditNameKana] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editPhoneLast4, setEditPhoneLast4] = useState("");
  const [editOccurrenceDate, setEditOccurrenceDate] = useState("");
  const [editReasonText, setEditReasonText] = useState("");
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      setLoading(true);
      setFetchError(null);

      const { data, error } = await supabase
        .from("blacklist_cases")
        .select(
          "id, full_name, full_name_kana, gender, birth_date, phone_last4, occurrence_date, reason_text, status, created_at, approved_at, rejected_reason, evidence_urls, registered_company_id"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        setFetchError(error.message || "データの取得に失敗しました。");
        setLoading(false);
        return;
      }

      if (!data) {
        setFetchError("該当するデータが見つかりません。");
        setLoading(false);
        return;
      }

      setCaseDetail(data as CaseDetail);
      setEditName(data.full_name || "");
      setEditNameKana(data.full_name_kana || "");
      setEditGender(data.gender || "male");
      setEditBirthDate(data.birth_date || "");
      setEditPhoneLast4(data.phone_last4 || "");
      setEditOccurrenceDate(data.occurrence_date || "");
      setEditReasonText(data.reason_text || "");

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

  const REJECT_PRESETS = [
    "裏付け資料（契約書・誓約書・勤務実績等）が添付されていない、または不鮮明なため",
    "入力された対象者情報（氏名・生年月日・連絡先等）に不備・誤りがあるため",
    "すでにトラブルが解決（弁済・和解・示談等）済みと確認されたため",
    "当社規定の登録要件（客観的事実の確認）を満たしていないため",
  ];

  const handleSaveEdit = async () => {
    if (!caseDetail) return;
    setIsSaving(true);
    setFormError(null);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("セッションがありません");

      const res = await fetch(`/api/admin/cases/${caseDetail.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: editName,
          full_name_kana: editNameKana,
          gender: editGender,
          birth_date: editBirthDate,
          phone_last4: editPhoneLast4,
          occurrence_date: editOccurrenceDate,
          reason_text: editReasonText,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "更新に失敗しました");
      }

      setCaseDetail((prev) => prev ? {
        ...prev,
        full_name: editName,
        full_name_kana: editNameKana,
        gender: editGender as any,
        birth_date: editBirthDate,
        phone_last4: editPhoneLast4,
        occurrence_date: editOccurrenceDate,
        reason_text: editReasonText,
      } : null);

      setIsEditing(false);
      alert("投稿内容を更新・保存しました。");
    } catch (err: any) {
      setFormError(err.message || "更新エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  const executeApprove = async () => {
    if (!caseDetail) return;
    setFormError(null);
    setIsProcessing(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setFormError("ログインセッションを取得できませんでした。再度ログインしてください。");
        setIsProcessing(false);
        return;
      }

      const res = await fetch(`/api/admin/cases/${caseDetail.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: "approved" }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setFormError(resData.error || "承認に失敗しました。");
        setIsProcessing(false);
        return;
      }

      // 成功
      setIsProcessing(false);
      setShowApproveModal(false);
      setShowSuccessModal({ type: 'approved' });

    } catch (err: any) {
      setFormError(err.message || "予期せぬエラーが発生しました。");
      setIsProcessing(false);
    }
  };

  const executeReject = async () => {
    if (!caseDetail) return;

    if (!rejectReason.trim()) {
      setFormError("却下理由を入力してください。");
      return;
    }

    setFormError(null);
    setIsProcessing(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setFormError("ログインセッションを取得できませんでした。再度ログインしてください。");
        setIsProcessing(false);
        return;
      }

      const res = await fetch(`/api/admin/cases/${caseDetail.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status: "rejected",
          rejectedReason: rejectReason.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setFormError(resData.error || "却下に失敗しました。");
        setIsProcessing(false);
        return;
      }

      // 成功
      setIsProcessing(false);
      setShowRejectModal(false);
      setShowSuccessModal({ type: 'rejected' });

    } catch (err: any) {
      setFormError(err.message || "予期せぬエラーが発生しました。");
      setIsProcessing(false);
    }
  };

  return (
    <RequireAdmin>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center pt-16 sm:pt-20 md:pt-10 pb-12 px-3 sm:px-4">
        <div className="max-w-3xl w-full bg-slate-100/80 border border-slate-200 rounded-2xl p-4.5 sm:p-8 relative">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
              <p className="text-sm text-slate-600 font-medium">申請詳細を読み込み中...</p>
            </div>
          ) : fetchError ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {fetchError}
            </p>
          ) : !caseDetail ? (
            <p className="text-sm text-slate-700">データが見つかりません。</p>
          ) : (
            <>
              <div className="mb-4">
                <Link
                  href="/admin/cases"
                  className="text-xs sm:text-sm text-slate-900 hover:text-slate-900 transition-colors inline-block mb-2 font-medium"
                >
                  ← 一覧へ戻る
                </Link>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  承認・却下（詳細）
                </h1>
              </div>

              {/* Inline Error for Ops */}
              {formError && !showRejectModal && (
                <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-700 text-xs">
                  <span className="inline-flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /><span>{formError}</span></span>
                </div>
              )}

              {isEditing ? (
                  <div className="bg-blue-50/40 p-4.5 sm:p-6 rounded-2xl border-2 border-blue-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                      <h2 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                        <Edit3 className="w-4 h-4 text-blue-600" />
                        <span>投稿内容の直接編集（管理者モード）</span>
                      </h2>
                      <span className="text-[11px] text-blue-700 font-medium">誤字脱字・不適切表現の修正を行えます</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">氏名</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="input-field py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">氏名（カナ）</label>
                        <input
                          type="text"
                          value={editNameKana}
                          onChange={(e) => setEditNameKana(e.target.value)}
                          className="input-field py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">性別</label>
                        <select
                          value={editGender}
                          onChange={(e) => setEditGender(e.target.value)}
                          className="input-field py-2 text-xs"
                        >
                          <option value="male">男性</option>
                          <option value="female">女性</option>
                          <option value="other">その他</option>
                          <option value="unknown">未設定</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">生年月日</label>
                        <input
                          type="date"
                          value={editBirthDate}
                          onChange={(e) => setEditBirthDate(e.target.value)}
                          className="input-field py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">電話番号（下4桁）</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={editPhoneLast4}
                          onChange={(e) => setEditPhoneLast4(e.target.value)}
                          className="input-field py-2 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">トラブル発生日</label>
                        <input
                          type="date"
                          value={editOccurrenceDate}
                          onChange={(e) => setEditOccurrenceDate(e.target.value)}
                          className="input-field py-2 text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block font-bold text-slate-700 text-xs mb-1">トラブル詳細・理由文</label>
                      <textarea
                        rows={6}
                        value={editReasonText}
                        onChange={(e) => setEditReasonText(e.target.value)}
                        className="input-field py-2.5 text-xs leading-relaxed resize-y w-full"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-2 border-t border-blue-200">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="btn-secondary py-2 px-4 text-xs"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="btn-primary py-2 px-5 text-xs flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving ? "保存中..." : "編集内容を保存する"}</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              <div className="space-y-4 mb-8">
                <div className="bg-white p-4.5 sm:p-6 rounded-xl border border-slate-200">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">基本情報</h2>
                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr]">
                      <span className="text-slate-600">氏名：</span>
                      <span className="text-slate-900 font-semibold">{caseDetail.full_name}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr]">
                      <span className="text-slate-600">氏名（カナ）：</span>
                      <span className="text-slate-900">{caseDetail.full_name_kana || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr]">
                      <span className="text-slate-600">性別：</span>
                      <span className="text-slate-900">{genderLabel(caseDetail.gender)}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr]">
                      <span className="text-slate-600">生年月日：</span>
                      <span className="text-slate-900">{caseDetail.birth_date?.replace(/-/g, "/")}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr]">
                      <span className="text-slate-600">電話番号（下4桁）：</span>
                      <span className="text-slate-900">{caseDetail.phone_last4 || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr]">
                      <span className="text-slate-600">発生日：</span>
                      <span className="text-slate-900">{caseDetail.occurrence_date?.replace(/-/g, "/")}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr]">
                      <span className="text-slate-600">登録日：</span>
                      <span className="text-slate-900">
                        {caseDetail.created_at
                          ? new Date(caseDetail.created_at).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr]">
                      <span className="text-slate-600">登録元：</span>
                      <span className="text-slate-900">{companyName || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr]">
                      <span className="text-slate-600">ステータス：</span>
                      <span className="text-slate-900 font-bold">{statusLabel(caseDetail.status)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4.5 sm:p-6 rounded-xl border border-slate-200">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">トラブル詳細・理由</h2>
                  <div className="text-xs sm:text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">
                    {caseDetail.reason_text}
                  </div>
                </div>

                {/* 証拠ファイルセクション */}
                <div className="bg-white p-4.5 sm:p-6 rounded-xl border border-slate-200">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">添付資料</h2>
                  {evidenceFiles.length === 0 ? (
                    <p className="text-xs sm:text-sm text-slate-500">証拠ファイルはありません。</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
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
                            <a href={file.signedUrl} target="_blank" rel="noopener noreferrer" className="block outline-none h-full p-4 flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-slate-900">
                              <FileText className="w-8 h-8 text-slate-500" />
                              <span className="text-xs truncate w-full text-center">{file.name}</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(true)}
                  disabled={isProcessing}
                  className="flex-1 bg-[#0f172a]/80 hover:bg-[#0f172a] disabled:bg-[#0f172a]/40 text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-[0.98]"
                >
                  承認する
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setShowRejectModal(true)
                  }}
                  disabled={isProcessing}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-red-800/60 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-red-900/20 active:scale-[0.98]"
                >
                  却下する
                </button>
              </div>
            </>
          )}

          {/* === Modals === */}

          {/* Approve Confirmation Modal */}
          {showApproveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
              <div className="bg-white border border-slate-300 p-6 sm:p-8 rounded-2xl max-w-sm w-full shadow-xl">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">承認の確認</h3>
                <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                  この就業トラブル申請を承認しますか？<br />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    承認すると申請者に通知メールが自動送信され、データベースに公開・反映されます。
                  </span>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowApproveModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={executeApprove}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-bold hover:bg-slate-800 shadow-md transition-all disabled:opacity-50"
                  >
                    {isProcessing ? "処理中..." : "承認確定"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reject Input Modal */}
          {showRejectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
              <div className="bg-white border border-red-300 p-6 sm:p-8 rounded-2xl max-w-lg w-full shadow-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">申請却下の確認</h3>
                </div>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  却下理由を入力してください。<span className="font-semibold text-red-600">入力された理由は申請者への通知メールおよび申請者画面に提示されます。</span>
                </p>

                {/* 定型理由クイック選択 */}
                <div className="mb-3">
                  <label className="text-[11px] font-bold text-slate-700 mb-1.5 block">
                    定型理由クイック選択（クリックで自動挿入）:
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {REJECT_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setRejectReason(preset)}
                        className="text-left text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-red-50 hover:border-red-200 text-slate-700 hover:text-red-700 transition-colors"
                      >
                        • {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                    却下理由（申請者へ通知されます）:
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 text-xs sm:text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="例: 裏付け資料（雇用契約書・督促履歴等）が添付されていないため"
                  />
                </div>

                {formError && (
                  <div className="mb-4 text-xs text-red-600 font-medium p-2.5 rounded-lg bg-red-50 border border-red-200">
                    <span className="inline-flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setFormError(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={executeReject}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-bold hover:bg-red-500 shadow-md transition-all disabled:opacity-50"
                  >
                    {isProcessing ? "処理中..." : "却下確定"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Modal */}
          {showSuccessModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
              <div className={`p-10 rounded-3xl max-w-sm w-full text-center bg-white border-t-4 ${showSuccessModal.type === 'approved' ? 'border-slate-300 shadow-md' : 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.2)]'}`}>
                <h3 className="text-xl font-bold text-slate-900 mb-8">
                  {showSuccessModal.type === 'approved' ? '申請が承認されました。' : '申請が却下されました。'}
                </h3>
                <button
                  onClick={() => router.push("/admin/cases")}
                  className={`w-full py-3 rounded-lg font-bold text-black ${showSuccessModal.type === 'approved' ? 'bg-[#0f172a] hover:bg-[#0f172a]/80' : 'bg-red-500 hover:bg-red-400 text-white'}`}
                >
                  一覧へ戻る
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </RequireAdmin >
  );
}
