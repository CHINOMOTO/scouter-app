"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";

export default function NewCompanyPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [isMain, setIsMain] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from("companies")
                .insert([{ name, is_main: isMain }]);

            if (insertError) throw insertError;

            router.push("/admin/companies");
            router.refresh();
        } catch (err: any) {
            setError(err.message || "登録に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <RequireAdmin>
            <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                <div className="max-w-2xl w-full">
                    <div className="mb-8 animate-fade-in">
                        <Link href="/admin/companies" className="text-slate-9000 hover:text-slate-700 text-sm flex items-center gap-1 mb-4">
                            キャンセルして一覧へ戻る
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">新規会社登録</h1>
                        <p className="text-slate-600">新しいグループ会社をシステムに追加します</p>
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
                                    disabled={loading}
                                    className="btn-primary w-full py-3 text-base"
                                >
                                    {loading ? "登録中..." : "会社情報を保存"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </RequireAdmin>
    );
}
