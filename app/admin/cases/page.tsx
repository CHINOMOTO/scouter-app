"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { RequireAdmin } from "@/components/RequireAdmin";

type CaseRow = {
  id: string;
  full_name: string;
  birth_date: string | null;
  created_at: string;
};

export default function AdminCaseList() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("blacklist_cases")
        .select("id, full_name, birth_date, created_at")
        .eq("status", "pending") // 審査中のみ
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      setCases((data || []) as CaseRow[]);
      setLoading(false);
    };

    fetchCases();
  }, []);

  return (
    <RequireAdmin>
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
        <div className="max-w-4xl w-full relative z-10">

          <div className="flex items-center justify-between mb-8 animate-fade-in">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">承認待ち一覧</h1>
              <p className="text-slate-900 font-medium">確認が必要な申請の一覧です</p>
            </div>
            <Link href="/dashboard" className="btn-secondary text-xs px-4 py-2.5">
              戻る
            </Link>
          </div>

          {errorMsg && (
            <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-sm flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span className="pt-0.5">{errorMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-24">
              <div className="relative">
                <div className="animate-spin h-12 w-12 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-4 w-4 bg-slate-100 rounded-full blur-md"></div>
                </div>
              </div>
            </div>
          ) : cases.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border-slate-200 bg-white/30 animate-fade-in">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="w-8 h-8 text-emerald-500" /></div>
              <p className="text-slate-600 font-medium">現在、審査中の案件はありません。</p>
              <p className="text-slate-500 text-sm mt-2">全ての申請が処理されました。</p>
            </div>
          ) : (
            <div className="grid gap-4 animate-fade-in delay-100">
              {cases.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/cases/${c.id}`}
                  className="glass-panel p-6 rounded-2xl flex items-center justify-between hover:bg-white/[0.03] hover:border-slate-200 transition-all group border-l-4 border-l-yellow-500"
                >
                  <div className="flex items-center gap-6">
                    <div className="h-12 w-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 inline mr-1" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-slate-900 transition-colors">
                        {c.full_name}
                      </h3>
                      <div className="flex gap-4 text-sm text-slate-600 mt-1">
                        <span className="font-mono">生年月日: {c.birth_date ? c.birth_date.replace(/-/g, "/") : "不明"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">申請日</span>
                    <div className="font-mono text-slate-700 text-sm">
                      {new Date(c.created_at).toLocaleDateString()}
                    </div>
                    <span className="text-slate-900 text-xs mt-2 inline-block font-bold hover:underline decoration-slate-300 underline-offset-4 pointer-events-none">
                      審査詳細
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireAdmin >
  );
}
