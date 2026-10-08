"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";
import { 
    ArrowLeft, 
    Plus, 
    Building2, 
    Pencil, 
    Trash2, 
    ShieldCheck 
} from "lucide-react";
import { Toast, ToastMessage } from "@/components/Toast";
import { Pagination } from "@/components/Pagination";

type Company = {
    id: string;
    name: string;
    corporate_number?: string | null;
    plan_type?: "employment" | "credit" | "full" | null;
    is_main: boolean;
    created_at: string;
};

const PAGE_SIZE = 10;

export default function AdminCompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [toast, setToast] = useState<ToastMessage | null>(null);

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

            setToast({ type: "success", text: "会社を削除しました。" });
            setCompanies(companies.filter(c => c.id !== id));
        } catch (err: any) {
            setToast({ type: "error", text: "削除に失敗しました: " + err.message });
        }
    };

    const getPlanBadge = (planType?: string | null) => {
        switch (planType) {
            case "employment":
                return (
                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-300 font-bold">
                        MIERIS WORK (1.8万/月)
                    </span>
                );
            case "credit":
                return (
                    <span className="text-[11px] bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200 font-bold">
                        MIERIS CREDIT (1.5万/月)
                    </span>
                );
            case "full":
            default:
                return (
                    <span className="text-[11px] bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200 font-bold">
                        FULLプラン (3万/月)
                    </span>
                );
        }
    };

    const totalPages = Math.ceil(companies.length / PAGE_SIZE);
    const paginatedCompanies = companies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <RequireAdmin>
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-4xl w-full relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">利用会社管理</h1>
                                {!loading && (
                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                                        全 {companies.length} 件
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-600 text-sm mt-1">登録されている加盟企業（法人番号・契約プラン）の一覧です</p>
                        </div>
                        <div className="flex gap-3 items-center flex-wrap sm:flex-nowrap">
                            <Link href="/admin" className="btn-secondary text-xs h-10 px-4 flex items-center gap-1.5 font-bold transition-colors">
                                <ArrowLeft className="w-4 h-4" />
                                <span>管理者メニューへ戻る</span>
                            </Link>
                            <Link href="/admin/companies/new" className="btn-primary flex items-center gap-1.5 px-5 py-2.5 hover:-translate-y-0.5 transition-all rounded-xl font-bold text-sm">
                                <Plus className="w-4 h-4" />
                                <span>新規会社追加</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                    </div>
                ) : companies.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-sm animate-fade-in max-w-4xl w-full">
                        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <p className="text-slate-700 font-bold text-base mb-1">登録されている会社はありません</p>
                        <p className="text-slate-500 text-sm mt-1">右上のボタンから新規追加してください。</p>
                    </div>
                ) : (
                    <div className="max-w-4xl w-full space-y-4">
                        <div className="grid gap-4 animate-fade-in delay-100">
                            {paginatedCompanies.map((company) => (
                                <div
                                    key={company.id}
                                    className="bg-white p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all border border-slate-200 shadow-sm group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-all shrink-0">
                                            <Building2 className="w-6 h-6" />
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
                                                    <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md font-mono border border-slate-200">
                                                        法人番号未登録
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 items-center self-end sm:self-center">
                                        <Link
                                            href={`/admin/companies/${company.id}`}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-xs font-bold"
                                            title="詳細・編集"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            <span>編集</span>
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(company.id, company.name)}
                                            className="inline-flex items-center justify-center p-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors text-xs"
                                            title="削除"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={companies.length}
                            pageSize={PAGE_SIZE}
                            onPageChange={setCurrentPage}
                            className="bg-white rounded-xl border border-slate-200 px-4 shadow-2xs"
                        />
                    </div>
                )}
            </div>
        </RequireAdmin>
    );
}
