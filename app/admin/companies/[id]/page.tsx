"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";

export default function EditCompanyPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;

    const [name, setName] = useState("");
    const [isMain, setIsMain] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCompany = async () => {
            if (!id) return;

            const { data, error } = await supabase
                .from("companies")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                setError("会社情報の取得に失敗しました");
            } else if (data) {
                setName(data.name);
                setIsMain(data.is_main);
            }
            setLoading(false);
        };

        fetchCompany();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from("companies")
                .update({ name, is_main: isMain })
                .eq("id", id);

            if (updateError) throw updateError;

            router.push("/admin/companies");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "更新に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <RequireAdmin>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                </div>
            </RequireAdmin>
        );
    }

    return (
        <RequireAdmin>
            <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                <div className="max-w-2xl w-full">
                    <div className="mb-8 animate-fade-in">
                        <Link href="/admin/companies" className="text-slate-9000 hover:text-slate-700 text-sm flex items-center gap-1 mb-4">
                            キャンセルして一覧へ戻る
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">会社情報の編集</h1>
                        <p className="text-slate-600">登録済みの会社情報を更新します</p>
                    </div>

                    <div className="glass-panel p-8 rounded-2xl animate-fade-in delay-100">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    会社名 <span className="text-slate-900">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-field"
                                    placeholder="例: 株式会社〇〇支店"
                                />
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <input
                                    type="checkbox"
                                    id="isMain"
                                    checked={isMain}
                                    onChange={(e) => setIsMain(e.target.checked)}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-white focus:ring-white/30"
                                />
                                <label htmlFor="isMain" className="cursor-pointer">
                                    <span className="block text-sm font-semibold text-slate-800">メイン会社として登録</span>
                                    <span className="block text-xs text-slate-9000">※通常はチェック不要です（管理用フラグ）</span>
                                </label>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-700 text-sm">
                                    ⚠️ {error}
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary w-full py-3 text-base"
                                >
                                    {saving ? "更新中..." : "変更を保存"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </RequireAdmin>
    );
}
