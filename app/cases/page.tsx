"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";

type BlacklistCase = {
  id: string;
  full_name: string;
  birth_date: string | null;
  reason_text: string;
  status: string;
  created_at: string;
};

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<BlacklistCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMSG, setErrorMSG] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({ key: "created_at", direction: "desc" });

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
          .select("id, full_name, birth_date, reason_text, status, created_at, registered_company_id")
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
      alert("削除しました。");
    } catch (err: any) {
      alert("削除に失敗しました: " + err.message);
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
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
        <div className="max-w-6xl w-full relative z-10">

          <div className="flex items-center justify-between mb-8 animate-fade-in">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">登録データ一覧</h1>
              <p className="text-slate-600 font-medium">登録されている全データの一覧です</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="btn-secondary text-xs backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10 px-4 py-2.5">
                戻る
              </Link>
              <Link href="/cases/new" className="btn-primary flex items-center gap-2 px-5 py-2.5 hover:-translate-y-0.5 transition-all rounded-xl font-bold text-sm">
                <span>+</span> 新規登録
              </Link>
            </div>
          </div>

          {errorMSG && (
            <div className="p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-start gap-3 animate-fade-in">
              <span className="text-lg">⚠️</span>
              <span className="pt-0.5">{errorMSG}</span>
            </div>
          )}

          {/* Controls Bar */}
          {!isLoading && cases.length > 0 && (
            <div className="flex gap-4 mb-6 animate-fade-in delay-100">
              <div className="flex-1 relative max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">🔍</span>
                <input
                  type="text"
                  placeholder="氏名や登録理由で絞り込み..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 transition-colors"
                />
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-24">
              <div className="relative">
                <div className="animate-spin h-12 w-12 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 bg-white/10 rounded-full blur-md"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl overflow-hidden animate-fade-in delay-100 border border-slate-200 p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      {renderSortableHeader("氏名", "full_name")}
                      {renderSortableHeader("生年月日", "birth_date")}
                      {renderSortableHeader("登録理由", "reason_text")}
                      {renderSortableHeader("ステータス", "status")}
                      {renderSortableHeader("登録日", "created_at", true)}
                      <th className="px-6 py-4 tracking-wider text-right font-bold text-slate-600">詳細</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredAndSortedCases.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          データが見つかりません
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedCases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <Link
                            href={`/cases/${c.id}`}
                            className="text-slate-900 font-bold text-base hover:text-blue-600 transition-colors inline-block truncate max-w-[200px]"
                          >
                            {c.full_name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">
                          {c.birth_date || <span className="text-slate-600">-</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="truncate max-w-xs text-slate-700 font-medium" title={c.reason_text}>
                            {c.reason_text}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 text-right font-mono">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link
                                href={`/cases/${c.id}/edit`}
                                className="p-2 bg-slate-100 hover:bg-white/10 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                                title="編集"
                              >
                                ✎
                              </Link>
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="p-2 bg-slate-100 hover:bg-red-500/20 text-slate-600 hover:text-red-400 rounded-lg transition-colors"
                                title="削除"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                    )}
                    {cases.length === 0 && searchTerm === "" && (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5} className="px-6 py-20 text-center text-slate-500">
                          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-slate-500 opacity-50" strokeWidth={1} />
                          <p>データがまだありません</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
    label = "承認待ち";
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
