"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Search, AlertCircle, UserPlus, ClipboardList, ArrowLeft } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  // Check admin role and get company_id on mount
  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.app_metadata?.role === "admin") {
        setIsAdmin(true);
      }
      if (session?.user) {
        const { data: appUser } = await supabase
          .from("app_users")
          .select("company_id")
          .eq("id", session.user.id)
          .maybeSingle();
        if (appUser?.company_id) {
          setUserCompanyId(appUser.company_id);
        }
      }
    };
    checkRole();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setHasSearched(false);
    setResults([]);
    setErrorMsg(null);
    try {
      if (!nameQuery.trim()) {
        throw new Error("照会対象者の氏名（フルネーム）を入力してください。");
      }
      if (!searchYear || !searchMonth || !searchDay) {
        throw new Error("照会対象者の生年月日（年・月・日）をすべて入力してください。");
      }

      const yearNum = Number(searchYear);
      const monthNum = Number(searchMonth);
      const dayNum = Number(searchDay);

      if (yearNum < 1900 || yearNum > 2100 || monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        throw new Error("有効な生年月日を入力してください。");
      }

      const dateQuery = `${searchYear.padStart(4, '0')}-${searchMonth.padStart(2, '0')}-${searchDay.padStart(2, '0')}`;

      // クライアントサイドフィルタリング
      let query = supabase
        .from("blacklist_cases")
        .select("*");

      // 管理者でない場合は承認済みデータのみ（他社データも検索可能）
      if (!isAdmin) {
        query = query.eq("status", "approved");
      }

      const { data, error } = await query;

      if (error) {
        throw new Error("データの取得に失敗しました: " + error.message);
      }

      const filtered = (data || []).filter((item) => {
        let matchName = true;
        let matchDate = true;

        if (nameQuery) {
          const q = nameQuery.replace(/\s+/g, "").toLowerCase();
          const name = (item.full_name || "").replace(/\s+/g, "").toLowerCase();
          const kana = (item.full_name_kana || "").replace(/\s+/g, "").toLowerCase();
          matchName = name.includes(q) || kana.includes(q);
        }

        if (dateQuery) {
          matchDate = item.birth_date === dateQuery;
        }

        return matchName && matchDate;
      });

      // 登録日でソート (降順)
      filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      setResults(filtered);
      setHasSearched(true);

      // アクセスログの保存
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
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
        }
      } catch (logErr) {
        console.error("Failed to save audit log:", logErr);
      }

    } catch (err: any) {
      setErrorMsg(err.message || "予期せぬエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return { label: "登録済み", className: "bg-rose-50 text-rose-700 border-rose-200", borderLeft: "border-l-red-500" };
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
      <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 flex flex-col items-center">
        <div className="max-w-4xl w-full relative z-10">

          {/* ヘッダーエリア */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-4 border-b border-slate-200 animate-fade-in">
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
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                応募者 検索・照会
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                採用や契約前に過去のトラブルや問題行動の記録を照会し、トラブルを未然に防ぎます。
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              <Link 
                href="/dashboard" 
                className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">戻る</span>
              </Link>
              <Link
                href="/cases"
                className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">登録一覧</span>
              </Link>
              <Link
                href="/cases/new"
                className="btn-primary flex items-center gap-1.5 px-4 h-9 rounded-lg font-bold text-xs shadow-xs hover:-translate-y-0.5 transition-all whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">人物を新規登録</span>
              </Link>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-8 md:p-10 mb-8 animate-fade-in delay-100 border border-slate-200">
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                ※同姓同名の別人との誤認防止および適正運用の観点から、照会には<strong>「氏名（フルネーム）」</strong>と<strong>「生年月日」</strong>の2つの入力が必須となっています。
              </div>

              <div className="grid md:grid-cols-2 gap-8">

                {/* 氏名検索 */}
                <div className="input-group group space-y-2">
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
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-200 focus:bg-white focus:ring-4 focus:ring-white/30 transition-all duration-300"
                    placeholder="例: 山田 太郎"
                  />
                </div>

                {/* 生年月日検索 */}
                <div className="input-group group space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest transition-colors duration-300">
                      生年月日
                    </label>
                    <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 font-bold">
                      必須
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength={4}
                      value={searchYear}
                      onChange={(e) => { if (/^\d*$/.test(e.target.value)) setSearchYear(e.target.value); }}
                      className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-3.5 text-slate-900 focus:outline-none focus:border-slate-200 focus:ring-4 focus:ring-white/30 transition-all duration-300 text-center font-mono"
                      placeholder="1990"
                    />
                    <span className="text-slate-600 text-xs font-bold">年</span>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength={2}
                      value={searchMonth}
                      onChange={(e) => { if (/^\d*$/.test(e.target.value)) setSearchMonth(e.target.value); }}
                      className="w-16 bg-white border border-slate-200 rounded-xl px-3 py-3.5 text-slate-900 focus:outline-none focus:border-slate-200 focus:ring-4 focus:ring-white/30 transition-all duration-300 text-center font-mono"
                      placeholder="01"
                    />
                    <span className="text-slate-600 text-xs font-bold">月</span>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength={2}
                      value={searchDay}
                      onChange={(e) => { if (/^\d*$/.test(e.target.value)) setSearchDay(e.target.value); }}
                      className="w-16 bg-white border border-slate-200 rounded-xl px-3 py-3.5 text-slate-900 focus:outline-none focus:border-slate-200 focus:ring-4 focus:ring-white/30 transition-all duration-300 text-center font-mono"
                      placeholder="01"
                    />
                    <span className="text-slate-600 text-xs font-bold">日</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  ※氏名または生年月日の<span className="text-slate-900 font-bold">どちらか一方は必須</span>です
                </p>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary min-w-[160px] py-3 rounded-xl font-bold tracking-wide"
                >
                  {isLoading ?
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      検索中...
                    </span>
                    : "検索実行"
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

          {hasSearched && (
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
                    return (
                      <div
                        key={item.id}
                        className={`glass-panel p-6 rounded-2xl border-l-4 flex flex-col md:flex-row justify-between gap-6 card-hover group transition-all ${badge.borderLeft}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-start gap-4 mb-3">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-slate-900 group-hover:text-slate-900 transition-colors">
                                {item.full_name}
                              </h3>
                              <p className="text-sm text-slate-500 font-medium">
                                {item.full_name_kana}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`px-3 py-1 text-[10px] font-bold rounded-full border uppercase tracking-widest ${badge.className}`}>
                                {badge.label}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white rounded-xl p-4 border border-slate-200">
                            <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">登録理由</h4>
                            <p className="text-sm text-slate-700 leading-relaxed font-medium line-clamp-3">
                              {item.reason_text}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col justify-between items-end min-w-[140px] text-right">
                          <div className="space-y-1">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">生年月日</p>
                            <p className="text-sm text-slate-800 font-mono font-bold">{item.birth_date}</p>
                          </div>

                          <div className="space-y-1 mt-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">発生日</p>
                            <p className="text-sm text-red-700 font-mono font-medium">{item.occurrence_date}</p>
                          </div>

                          <Link
                            href={`/cases/${item.id}`} // 詳細ページができたら飛ぶ想定（なければ#）
                            className="mt-4 text-xs text-slate-700 hover:text-slate-900 font-bold hover:underline decoration-slate-300 underline-offset-4 transition-all"
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
