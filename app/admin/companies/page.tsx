"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";

type Company = {
    id: string;
    name: string;
    corporate_number?: string | null;
    plan_type?: "employment" | "credit" | "full" | null;
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
            setCompanies((data as any) || []);
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
            setCompanies(companies.filter(c => c.id !== id));
        } catch (err: any) {
            alert("削除に失敗しました: " + err.message);
        }
    };

    const getPlanBadge = (planType?: string | null) => {
        switch (planType) {
            case "employment":
                return (
                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-300 font-bold">
                        就業情報のみ (1.8万/月)
                    </span>
                );
            case "credit":
                return (
                    <span className="text-[11px] bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200 font-bold">
                        クレジットのみ (1.5万/月)
                    </span>
                );
            case "full":
            default:
                return (
                    <span className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 font-bold">
                        両方セット (3万/月)
                    </span>
                );
        }
    };

    return (
        <RequireAdmin>
            <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                <div className="max-w-4xl w-full relative z-10">
                    <div className="flex items-center justify-between mb-8 animate-fade-in">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">利用会社管理</h1>
                            <p className="text-slate-600 font-medium">登録されている加盟企業（法人番号・契約プラン）の一覧です</p>
                        </div>
                        <div className="flex gap-3 items-center">
                            <Link href="/admin" className="btn-secondary text-xs h-10 px-4 flex items-center">
                                管理メニューへ戻る
                            </Link>
                            <Link href="/admin/companies/new" className="btn-primary flex items-center gap-2 px-5 py-2.5 hover:-translate-y-0.5 transition-all rounded-xl font-bold text-sm">
                                <span>+</span> 新規会社追加
                            </Link>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                    </div>
                ) : companies.length === 0 ? (
                    <div className="glass-panel p-12 text-center rounded-3xl border-slate-200 bg-white/30 animate-fade-in max-w-4xl w-full">
                        <span className="text-4xl mb-4 block opacity-30">🏢</span>
                        <p className="text-slate-600 font-medium">登録されている会社はありません。</p>
                        <p className="text-slate-500 text-sm mt-2">右上のボタンから新規追加してください。</p>
                    </div>
                ) : (
                    <div className="grid gap-4 animate-fade-in delay-100 max-w-4xl w-full">
                        {companies.map((company) => (
                            <div
                                key={company.id}
                                className="glass-panel p-6 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-all border border-slate-200 hover:border-slate-300 group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                                        🏢
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                {company.name}
                                            </h3>
                                            {company.is_main && (
                                                <span className="text-[10px] bg-slate-900 text-white px-2.5 py-0.5 rounded-full font-bold tracking-widest">
                                                    運営元 / HQ
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2.5 mt-2">
                                            {/* 契約プランバッジ */}
                                            {getPlanBadge(company.plan_type)}

                                            {/* 法人番号 */}
                                            {company.corporate_number ? (
                                                <span className="text-xs text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md font-mono border border-slate-200">
                                                    法人番号: {company.corporate_number}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded font-mono">
                                                    法人番号未登録
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <Link
                                        href={`/admin/companies/${company.id}`}
                                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm"
                                        title="詳細・編集"
                                    >
                                        ✎ 編集
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(company.id, company.name)}
                                        className="p-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg transition-colors text-sm"
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
