"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Search, AlertCircle, UserPlus, ClipboardList, ArrowLeft, Lock } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Toast, ToastMessage } from "@/components/Toast";
import { usePlan } from "@/contexts/PlanContext";
import { translateErrorMessage } from "@/lib/errorMessage";
import { formatDateJST, isValidCalendarDate } from "@/lib/dateFormat";

type BlacklistCase = {
  id: string;
  full_name: string;
  full_name_kana: string | null;
  gender: string | null;
  birth_date: string | null;
  phone_last4: string | null;
  occurrence_date: string | null;
  reason_text: string;
  status: string;
  approved_at?: string | null;
  companies?: { id: string; name: string } | null;
};

export default function SearchPage() {
  const [nameQuery, setNameQuery] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [searchMonth, setSearchMonth] = useState("");
  const [searchDay, setSearchDay] = useState("");
  const [results, setResults] = useState<BlacklistCase[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const { allowedPlan, isAdmin, loading: planLoading } = usePlan();
  const planChecked = !planLoading;
  const [apiPlanRestricted, setApiPlanRestricted] = useState(false);
  const hasWorkAccess = isAdmin || allowedPlan === "full" || allowedPlan === "employment";
  const planRestricted = !planLoading && (!hasWorkAccess || apiPlanRestricted);

  // プランが変更された際にAPI側の制限フラグもリセット
  useEffect(() => {
    if (hasWorkAccess) {
      setApiPlanRestricted(false);
    }
  }, [hasWorkAccess]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setHasSearched(false);
    setResults([]);
    setErrorMsg(null);
    try {
      const trimmedName = nameQuery.trim();
      if (!trimmedName) {
        throw new Error("照会対象者の氏名（フルネーム）を入力してください。");
      }
      if (trimmedName.length < 2) {
        throw new Error("照会対象者の氏名（フルネーム）は2文字以上で入力してください。");
      }
      if (!searchYear || !searchMonth || !searchDay) {
        throw new Error("照会対象者の生年月日（年・月・日）をすべて入力してください。");
      }

      const dateQuery = `${searchYear.padStart(4, '0')}-${searchMonth.padStart(2, '0')}-${searchDay.padStart(2, '0')}`;
      if (!isValidCalendarDate(dateQuery, { allowFuture: false })) {
        throw new Error("実在する正しい生年月日（本日以前）を入力してください。");
      }

      // サーバーサイドAPI経由の安全な照会実行
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("ログインセッションが見つかりません。再度ログインしてください。");
      }

      const params = new URLSearchParams();
      params.append("name", trimmedName);
      params.append("birth_date", dateQuery);

      const res = await fetch(`/api/cases/search?${params.toString()}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 && errData.planRestricted) {
          setApiPlanRestricted(true);
        }
        throw new Error(errData.error || "データの照会に失敗しました。");
      }

      const data = await res.json().catch(() => ({}));
      const fetchedResults = (data.results || []) as BlacklistCase[];

      setResults(fetchedResults);
      setHasSearched(true);

      // アクセスログの保存
      try {
        const logQuery = [nameQuery, dateQuery].filter(Boolean).join(", ");
        await fetch("/api/audit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            action_type: "SEARCH",
            target_id: logQuery
          })
        });
      } catch (logErr) {
        console.error("Failed to save audit log:", logErr);
      }

    } catch (err: unknown) {
      const msg = translateErrorMessage(err, "照会処理中にエラーが発生しました。");
      setErrorMsg(msg);
      setToast({ type: "error", text: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return { label: "承認済み", className: "bg-emerald-50 text-emerald-700 border-emerald-200", borderLeft: "border-l-emerald-500" };
      case "pending":
        return { label: "審査中", className: "bg-amber-50 text-amber-700 border-amber-200", borderLeft: "border-l-yellow-500" };
      case "rejected":
        return { label: "却下", className: "bg-slate-500/10 text-slate-600 border-slate-500/20", borderLeft: "border-l-slate-500" };
      default:
        return { label: status, className: "bg-slate-500/10 text-slate-600 border-slate-500/20", borderLeft: "border-l-slate-500" };
    }
  };

  return (
    <RequireAuth>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="min-h-screen pt-16 sm:pt-20 md:pt-10 pb-12 px-3.5 sm:px-6 flex flex-col items-center">
        <div className="max-w-4xl w-full relative z-10">

          {/* ヘッダーエリア */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-slate-200 animate-fade-in">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest font-mono">
                  MIERIS WORK
                </span>
                <span className="text-slate-300 text-xs">|</span>
                <span className="text-xs text-slate-500 font-semibold tracking-wide">
                  就業・採用トラブル情報照会
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                応募者 検索・照会
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                採用や契約前に過去のトラブルや問題行動の記録を照会し、トラブルを未然に防ぎます。
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 w-full md:w-auto">
              <Link 
                href="/dashboard" 
                className="btn-secondary text-xs h-9 px-2 sm:px-3.5 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 font-medium transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span>戻る</span>
              </Link>
              {planChecked && !planRestricted && (
                <>
                  <Link
                    href="/cases"
                    className="btn-secondary text-xs h-9 px-2 sm:px-3.5 rounded-lg flex items-center justify-center gap-1 sm:gap-1.5 font-medium transition-colors whitespace-nowrap"
                  >
                    <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                    <span>{isAdmin ? "登録一覧" : "自社登録一覧"}</span>
                  </Link>
                  <Link
                    href="/cases/new"
                    className="btn-primary flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 h-9 rounded-lg font-bold text-xs shadow-xs hover:-translate-y-0.5 transition-all whitespace-nowrap"
                  >
                    <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>新規登録</span>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* プラン制限の場合の案内 */}
          {!planChecked ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
            </div>
          ) : planRestricted ? (
            <div className="bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 text-center max-w-xl mx-auto my-8 sm:my-12 shadow-sm animate-fade-in">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-amber-600 border border-amber-200/60">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                MIERIS WORK（就業信用管理）未加入です
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                現在のご契約プラン（MIERIS CREDIT）では、MIERIS WORK（応募者照会・就業トラブル防止機能）をご利用いただけません。<br />
                採用時のバックグラウンド確認やトラブル人物情報の照会を行うには、プラン追加（またはFULLプランへの変更）のお申し込みが必要です。
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/contact"
                  className="btn-primary text-xs w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold shadow-xs hover:-translate-y-0.5 transition-all text-center"
                >
                  プラン追加のお問い合わせ
                </Link>
                <Link
                  href="/dashboard"
                  className="btn-secondary text-xs w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold transition-all text-center"
                >
                  ダッシュボードへ戻る
                </Link>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl sm:rounded-3xl p-4.5 sm:p-8 md:p-10 mb-8 animate-fade-in delay-100 border border-slate-200">
              <form onSubmit={handleSearch} className="space-y-5 sm:space-y-6">
                <div className="text-xs text-slate-600 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                  ※同姓同名の別人との誤認防止および適正運用の観点から、照会には<strong>「氏名（フルネーム）」</strong>と<strong>「生年月日」</strong>の2つの入力が必須となっています。
                </div>

              <div className="grid md:grid-cols-2 gap-5 sm:gap-8">

                {/* 氏名検索 */}
                <div className="input-group group space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest transition-colors duration-300">
                      氏名（フルネーム） / カナ
                    </label>
                    <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-bold">
                      必須
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={nameQuery}
                    onChange={(e) => setNameQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all duration-200"
                    placeholder="例: 山田 太郎"
                  />
                </div>

                {/* 生年月日検索 */}
                <div className="input-group group space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest transition-colors duration-300">
                      生年月日
                    </label>
                    <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-bold">
                      必須
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={4}
                        value={searchYear}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
                          if (/^\d*$/.test(v)) setSearchYear(v);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 sm:px-3 py-3 sm:py-3.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 transition-all text-center font-mono"
                        placeholder="1990"
                      />
                      <span className="text-slate-600 text-xs font-bold shrink-0">年</span>
                    </div>
                    <div className="w-20 sm:w-24 flex items-center gap-1">
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={2}
                        value={searchMonth}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
                          if (/^\d*$/.test(v)) setSearchMonth(v);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 sm:px-3 py-3 sm:py-3.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 transition-all text-center font-mono"
                        placeholder="01"
                      />
                      <span className="text-slate-600 text-xs font-bold shrink-0">月</span>
                    </div>
                    <div className="w-20 sm:w-24 flex items-center gap-1">
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={2}
                        value={searchDay}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
                          if (/^\d*$/.test(v)) setSearchDay(v);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2 sm:px-3 py-3 sm:py-3.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 transition-all text-center font-mono"
                        placeholder="01"
                      />
                      <span className="text-slate-600 text-xs font-bold shrink-0">日</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-[11px] sm:text-xs text-slate-500 leading-normal">
                  ※適正運用の観点から、氏名（フルネーム）と生年月日は<span className="text-slate-900 font-bold">両方の入力が必須</span>です
                </p>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full sm:w-auto sm:min-w-[160px] py-3 rounded-xl font-bold tracking-wide active:scale-[0.98] transition-transform"
                >
                  {isLoading ?
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      照会中...
                    </span>
                    : "照会を実行"
                  }
                </button>
              </div>

              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-sm flex items-start gap-3 animate-fade-in">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span className="pt-0.5">{errorMsg}</span>
                </div>
              )}
            </form>
          </div>
          )}

          {!planRestricted && hasSearched && (
            <div className="animate-fade-in delay-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                検索結果
                <span className="text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  {results.length} 件
                </span>
              </h2>

              {results.length === 0 ? (
                <div className="glass-panel p-12 text-center rounded-3xl border-slate-200 bg-white/30">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8" /></div>
                  <p className="text-slate-600 font-medium">該当するデータは見つかりませんでした。</p>
                  <p className="text-slate-500 text-sm mt-2">条件を変更して再度検索してください。</p>
                </div>
              ) : (
                <div className="grid gap-5">
                  {results.map((item) => {
                    const badge = getStatusBadge(item.status);
                    const regCompanyName = Array.isArray(item.companies)
                      ? item.companies[0]?.name
                      : item.companies?.name;
                    return (
                      <div
                        key={item.id}
                        className="glass-panel p-4.5 sm:p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between gap-4 sm:gap-6 card-hover group transition-all"
                      >
                        <div className="flex-1">
                          <div className="flex items-start gap-3 sm:gap-4 mb-2.5 sm:mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-slate-900 transition-colors">
                                {item.full_name}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                                {item.full_name_kana}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider ${badge.className}`}>
                                {badge.label}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">登録理由・事実経過</h4>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                <span>登録元: <strong className="text-slate-700">{regCompanyName || "加盟企業"}</strong></span>
                                {item.approved_at && (
                                  <span>承認日: <strong className="text-slate-700 font-mono">{formatDateJST(item.approved_at)}</strong></span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium line-clamp-3">
                              {item.reason_text}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col justify-between items-center md:items-end md:min-w-[140px] pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 gap-2">
                          <div className="flex md:flex-col gap-3 md:gap-2 text-left md:text-right">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">生年月日</p>
                              <p className="text-xs sm:text-sm text-slate-800 font-mono font-bold">{item.birth_date}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">発生日</p>
                              <p className="text-xs sm:text-sm text-red-700 font-mono font-medium">{item.occurrence_date || "—"}</p>
                            </div>
                          </div>

                          <Link
                            href={`/cases/${item.id}`}
                            className="btn-secondary text-xs px-3 py-1.5 rounded-lg font-bold text-slate-700 hover:text-slate-900 shrink-0 md:mt-2"
                          >
                            詳細を見る
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}
