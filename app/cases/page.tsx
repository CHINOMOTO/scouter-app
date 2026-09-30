"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  FolderOpen, 
  Search, 
  Plus, 
  AlertCircle, 
  Pencil, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  UserPlus, 
  ArrowLeft,
  ArrowRight,
  User
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";
import { Pagination } from "@/components/Pagination";
import { Toast, ToastMessage } from "@/components/Toast";

type BlacklistCase = {
  id: string;
  full_name: string;
  full_name_kana?: string | null;
  birth_date: string | null;
  occurrence_date?: string | null;
  phone_last4?: string | null;
  reason_text: string;
  status: string;
  created_at: string;
};

const PAGE_SIZE = 15;

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<BlacklistCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMSG, setErrorMSG] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "created_at", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedCases = useMemo(() => {
    let result = [...cases];

    if (searchTerm.trim() !== "") {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(c => 
        (c.full_name && c.full_name.toLowerCase().includes(lowerTerm)) ||
        (c.full_name_kana && c.full_name_kana.toLowerCase().includes(lowerTerm)) ||
        (c.reason_text && c.reason_text.toLowerCase().includes(lowerTerm))
      );
    }

    result.sort((a, b) => {
      const dir = sortConfig.direction === "asc" ? 1 : -1;
      switch (sortConfig.key) {
        case "created_at":
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
        case "full_name":
          return (a.full_name || "").localeCompare(b.full_name || "") * dir;
        case "birth_date":
          return (a.birth_date || "").localeCompare(b.birth_date || "") * dir;
        case "reason_text":
          return (a.reason_text || "").localeCompare(b.reason_text || "") * dir;
        case "status":
          return (a.status || "").localeCompare(b.status || "") * dir;
        default:
          return 0;
      }
    });

    return result;
  }, [cases, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedCases.length / PAGE_SIZE);

  const paginatedCases = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredAndSortedCases.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedCases, currentPage]);

  useEffect(() => {
    const init = async () => {
      // 1. Check Admin Role
      const { data: { user } } = await supabase.auth.getUser();
      const isUserAdmin = user?.app_metadata?.role === 'admin';

      if (user) {
        setIsAdmin(isUserAdmin);
      }

      // 2. Fetch Cases
      try {
        let query = supabase
          .from("blacklist_cases")
          .select("id, full_name, full_name_kana, birth_date, occurrence_date, phone_last4, reason_text, status, created_at, registered_company_id")
          .order("created_at", { ascending: false });

        // 一般ユーザーは自社登録データのみ表示（個人情報保護法対応）
        if (!isUserAdmin && user) {
          const { data: appUser } = await supabase
            .from("app_users")
            .select("company_id")
            .eq("id", user.id)
            .maybeSingle();

          if (appUser?.company_id) {
            query = query.eq("registered_company_id", appUser.company_id);
          }
          query = query.eq("status", "approved");
        }

        const { data, error } = await query;

        if (error) throw error;
        setCases(data || []);
      } catch (err: any) {
        setErrorMSG("データ取得に失敗しました: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("本当にこのデータを削除しますか？この操作は取り消せません。")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/cases/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setCases(prev => prev.filter(c => c.id !== id));
      setToast({ type: "success", text: "データを削除しました。" });
    } catch (err: any) {
      setToast({ type: "error", text: "削除に失敗しました: " + err.message });
    }
  };

  const renderSortableHeader = (label: string, key: string, isRightAlign = false) => {
    const isActive = sortConfig.key === key;
    return (
      <th 
        className={`px-6 py-5 tracking-widest cursor-pointer hover:bg-slate-50 transition-colors select-none ${isRightAlign ? 'text-right' : ''}`}
        onClick={() => handleSort(key)}
      >
        <div className={`flex items-center gap-2 ${isRightAlign ? 'justify-end' : ''}`}>
          {label}
          <span className={`text-[10px] ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
            {isActive ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </div>
      </th>
    );
  };

  return (
    <RequireAuth>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 flex flex-col items-center">
        <div className="max-w-6xl w-full relative z-10">

          {/* ヘッダーエリア */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-4 border-b border-slate-200 animate-fade-in">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest font-mono">
                  MIERIS WORK
                </span>
                <span className="text-slate-300 text-xs">|</span>
                <span className="text-xs text-slate-500 font-semibold tracking-wide">
                  就業・採用トラブル情報データベース
                </span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  就業トラブル 登録データ一覧
                </h1>
                {!isLoading && (
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                    全 {filteredAndSortedCases.length} 件
                  </span>
                )}
              </div>
              <p className="text-slate-600 text-sm mt-1">
                共有データベースに登録されている就業トラブル情報の一覧です。
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
                href="/search"
                className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">検索・照会</span>
              </Link>
              <Link
                href="/cases/new"
                className="btn-primary flex items-center gap-1.5 px-4 h-9 rounded-lg font-bold text-xs shadow-xs hover:-translate-y-0.5 transition-all whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">トラブル情報を新規登録</span>
              </Link>
            </div>
          </div>

          {errorMSG && (
            <div className="p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-sm flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <span className="pt-0.5">{errorMSG}</span>
            </div>
          )}

          {/* Controls Bar */}
          {!isLoading && cases.length > 0 && (
            <div className="flex gap-4 mb-6 animate-fade-in delay-100">
              <div className="flex-1 relative max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="氏名や登録理由で絞り込み..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ paddingLeft: '2.5rem' }}
                  className="w-full bg-white border border-slate-200 rounded-xl pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-24">
              <div className="relative">
                <div className="animate-spin h-12 w-12 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 bg-slate-100 rounded-full blur-md"></div>
                </div>
              </div>
            </div>
          ) : filteredAndSortedCases.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-2xs animate-fade-in">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" strokeWidth={1} />
              <h3 className="text-base font-bold text-slate-800 mb-1">該当するデータが見つかりませんでした</h3>
              <p className="text-xs text-slate-500 mb-6">
                {searchTerm ? "検索条件を変更してお試しください。" : "現在、登録されている就業トラブル情報はありません。"}
              </p>
              <Link href="/cases/new" className="btn-primary text-xs inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>トラブル情報を新規登録</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in delay-100">
              
              {/* カードグリッド (PC: 2列, スマホ: 1列) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedCases.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all group flex flex-col justify-between"
                  >
                    <div>
                      {/* ヘッダー: 氏名・カナ・ステータスバッジ */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                            <User className="w-5 h-5 text-slate-600 shrink-0" />
                            <span>{c.full_name}</span>
                          </h3>
                          {c.full_name_kana && (
                            <p className="text-xs text-slate-500 font-medium mt-1 ml-7">
                              {c.full_name_kana}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {c.status === "approved" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>登録済み（承認済）</span>
                            </span>
                          )}
                          {c.status === "pending" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              <span>審査待ち</span>
                            </span>
                          )}
                          {c.status === "rejected" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>却下</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* インフォボックス */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-3.5 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 font-medium">生年月日</span>
                          <span className="text-slate-900 font-bold font-mono text-sm">
                            {c.birth_date ? c.birth_date.replace(/-/g, "/") : "-"}
                          </span>
                        </div>
                        {c.occurrence_date && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">トラブル発生日</span>
                            <span className="font-mono text-slate-800">{c.occurrence_date.replace(/-/g, "/")}</span>
                          </div>
                        )}
                        {c.phone_last4 && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">電話番号（下4桁）</span>
                            <span className="font-mono text-slate-800">***-****-{c.phone_last4}</span>
                          </div>
                        )}
                      </div>

                      {/* 経緯・登録理由ボックス */}
                      {c.reason_text && (
                        <div className="text-xs text-slate-700 leading-relaxed mb-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-900">経緯 / 登録理由: </span>
                          <span className="line-clamp-2">{c.reason_text}</span>
                        </div>
                      )}
                    </div>

                    {/* フッター */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                      <span>登録日: {new Date(c.created_at).toLocaleDateString()}</span>
                      <div className="flex items-center gap-3">
                        {isAdmin && (
                          <div className="flex items-center gap-1 mr-1">
                            <Link
                              href={`/cases/${c.id}/edit`}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="編集"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="削除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <Link
                          href={`/cases/${c.id}`}
                          className="text-blue-600 hover:text-blue-700 font-bold group-hover:translate-x-0.5 transition-all flex items-center gap-1"
                        >
                          <span>事実詳細を確認</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 共通ページネーション */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredAndSortedCases.length}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                className="bg-white rounded-xl border border-slate-200 px-4 shadow-2xs"
              />
            </div>
          )}
        </div>
      </div>
    </RequireAuth>
  );
}

function StatusBadge({ status }: { status: string }) {
  let styles = "bg-slate-100 text-slate-600 border-slate-200";
  let label = status;

  if (status === "pending") {
    styles = "bg-amber-50 text-amber-700 border-amber-200";
    label = "審査中";
  } else if (status === "approved") {
    styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
    label = "承認済み";
  } else if (status === "rejected") {
    styles = "bg-rose-50 text-rose-700 border-rose-200";
    label = "却下";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles}`}>
      {label}
    </span>
  );
}
