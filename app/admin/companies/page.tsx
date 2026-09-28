"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";

type Company = {
    id: string;
    name: string;
    is_main: boolean;
    created_at: string;
};

export default function AdminCompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);


    const fetchCompanies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("companies")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
        } else {
            setCompanies(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`本当に「${name}」を削除しますか？\n所属するユーザーやデータがある場合、不整合が生じる可能性があります。`)) return;

        try {
            const { error } = await supabase
                .from("companies")
                .delete()
                .eq("id", id);

            if (error) throw error;

            alert("削除しました。");
            setCompanies(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            alert("削除に失敗しました: " + err.message);
        }
    };



    return (
        <RequireAdmin>
            <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                <div className="max-w-4xl w-full relative z-10">
                    <div className="flex items-center justify-between mb-8 animate-fade-in">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">会社管理</h1>
                            <p className="text-slate-600 font-medium">登録されている加盟企業の一覧です</p>
                        </div>
                        <div className="flex gap-3 items-center">
                            <Link href="/dashboard" className="btn-secondary text-xs h-10 px-4 flex items-center">
                                戻る
                            </Link>
                            <Link href="/admin/companies/new" className="btn-primary flex items-center gap-2 px-5 py-2.5 hover:-translate-y-0.5 transition-all rounded-xl font-bold text-sm">
                                <span>+</span> 新規会社追加
                            </Link>
                        </div>
                    </div>
                </div>



                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="relative">
                            <div className="animate-spin h-12 w-12 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-4 w-4 bg-white/10 rounded-full blur-md"></div>
                            </div>
                        </div>
                    </div>
                ) : companies.length === 0 ? (
                    <div className="glass-panel p-12 text-center rounded-3xl border-white/5 bg-white/30 animate-fade-in">
                        <span className="text-4xl mb-4 block opacity-30">🏢</span>
                        <p className="text-slate-600 font-medium">登録されている会社はありません。</p>
                        <p className="text-slate-500 text-sm mt-2">右上のボタンから新規追加してください。</p>
                    </div>
                ) : (
                    <div className="grid gap-4 animate-fade-in delay-100">
                        {companies.map((company) => (
                            <div
                                key={company.id}
                                className="glass-panel p-6 rounded-2xl flex items-center justify-between hover:bg-slate-100/30 transition-all border border-white/5 hover:border-slate-200 group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-2xl group-hover:from-[#0f172a]/20 group-hover:to-slate-800 transition-colors">
                                        🏢
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-slate-900 transition-colors">
                                            {company.name}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            {company.is_main && (
                                                <span className="text-[10px] bg-white/10 text-slate-900 px-2.5 py-0.5 rounded-full border border-slate-200 font-bold tracking-widest">
                                                    HQ / MAIN
                                                </span>
                                            )}
                                            <span className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded font-mono">
                                                ID: {company.id}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link
                                        href={`/admin/companies/${company.id}`}
                                        className="p-2 bg-slate-100 hover:bg-white/10 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                                        title="編集"
                                    >
                                        ✎
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(company.id, company.name)}
                                        className="p-2 bg-slate-100 hover:bg-red-500/20 text-slate-600 hover:text-red-400 rounded-lg transition-colors"
                                        title="削除"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </RequireAdmin>
    );
}
