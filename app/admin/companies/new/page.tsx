"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function NewCompanyPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [corporateNumber, setCorporateNumber] = useState("");
    const [planType, setPlanType] = useState<"employment" | "credit" | "full">("full");
    const [isMain, setIsMain] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 法人番号のバリデーション（必須・13桁数字）
        const cleanCorpNum = corporateNumber.trim().replace(/[^0-9]/g, "");
        if (!cleanCorpNum || cleanCorpNum.length !== 13) {
            setError("法人番号（13桁の半角数字）を入力してください。");
            setLoading(false);
            return;
        }

        try {
            // まず新カラム (corporate_number, plan_type) を含めて保存を試みる
            const payload: any = {
                name: name.trim(),
                corporate_number: cleanCorpNum || null,
                plan_type: planType,
                is_main: isMain
            };

            let { error: insertError } = await supabase
                .from("companies")
                .insert([payload]);

            // もしカラムがまだマイグレーションされていない場合のフォールバック
            if (insertError && (insertError.message.includes("corporate_number") || insertError.message.includes("plan_type"))) {
                console.warn("Falling back to basic company schema:", insertError.message);
                const { error: fallbackError } = await supabase
                    .from("companies")
                    .insert([{ name: name.trim(), is_main: isMain }]);
                if (fallbackError) throw fallbackError;
            } else if (insertError) {
                throw insertError;
            }

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
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-2xl w-full">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 animate-fade-in">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">新規利用会社登録</h1>
                            <p className="text-slate-600 text-sm mt-1">お申し込み企業（利用企業）をシステムに登録します</p>
                        </div>
                        <div className="shrink-0">
                            <Link 
                                href="/admin/companies" 
                                className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>一覧へ戻る</span>
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white p-7 sm:p-9 rounded-xl border border-slate-200 shadow-2xs animate-fade-in delay-100">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* 会社名 */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-800">
                                    会社名（商号） <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input-field"
                                    placeholder="例: 株式会社ミヤエモン / 株式会社宇井建設"
                                />
                            </div>

                            {/* 法人番号 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-slate-800">
                                        法人番号（13桁） <span className="text-red-500">*</span>
                                    </label>
                                    <span className="text-xs text-slate-500 font-medium">※半角数字のみ・ハイフン不要</span>
                                </div>
                                <input
                                    type="text"
                                    required
                                    maxLength={13}
                                    value={corporateNumber}
                                    onChange={(e) => setCorporateNumber(e.target.value.replace(/[^0-9]/g, ""))}
                                    className="input-field font-mono"
                                    placeholder="例: 1234567890123"
                                />
                                <p className="text-xs text-slate-500">
                                    国税庁の法人番号公表サイト等で確認できる13桁の番号です。取引先情報照会のキーとして活用されます。
                                </p>
                            </div>

                            {/* 契約プラン選択 */}
                            <div className="space-y-3 pt-2">
                                <label className="text-sm font-bold text-slate-800 block">
                                    契約プラン <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* FULLプラン */}
                                    <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${planType === 'full' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="planType"
                                            value="full"
                                            checked={planType === 'full'}
                                            onChange={() => setPlanType('full')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-sm mb-1">FULLプラン</div>
                                        <div className="text-xs font-bold text-blue-600 mb-2">月額 30,000円</div>
                                        <div className="text-[11px] text-slate-600 leading-tight">MIERIS WORK ＋ CREDIT（全機能利用可能）</div>
                                    </label>

                                    {/* MIERIS WORK */}
                                    <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${planType === 'employment' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="planType"
                                            value="employment"
                                            checked={planType === 'employment'}
                                            onChange={() => setPlanType('employment')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-sm mb-1">MIERIS WORK</div>
                                        <div className="text-xs font-bold text-slate-700 mb-2">月額 18,000円</div>
                                        <div className="text-[11px] text-slate-600 leading-tight">就業情報・人物トラブル共有のみ</div>
                                    </label>

                                    {/* MIERIS CREDIT */}
                                    <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${planType === 'credit' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="planType"
                                            value="credit"
                                            checked={planType === 'credit'}
                                            onChange={() => setPlanType('credit')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-sm mb-1">MIERIS CREDIT</div>
                                        <div className="text-xs font-bold text-slate-700 mb-2">月額 15,000円</div>
                                        <div className="text-[11px] text-slate-600 leading-tight">企業信用・未払い企業情報共有のみ</div>
                                    </label>
                                </div>
                            </div>

                            {/* メイン会社フラグ */}
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 mt-4">
                                <input
                                    type="checkbox"
                                    id="isMain"
                                    checked={isMain}
                                    onChange={(e) => setIsMain(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                <label htmlFor="isMain" className="cursor-pointer">
                                    <span className="block text-sm font-semibold text-slate-800">運営元（メイン会社）として登録</span>
                                    <span className="block text-xs text-slate-500">※通常はチェック不要です（自社運営アカウント用）</span>
                                </label>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full py-3.5 text-base"
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
