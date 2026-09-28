"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";

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

        // 法人番号のバリデーション（入力されている場合は13桁数字）
        const cleanCorpNum = corporateNumber.trim().replace(/[^0-9]/g, "");
        if (corporateNumber.trim() && cleanCorpNum.length !== 13) {
            setError("法人番号は半角数字13桁で入力してください。");
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
            <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                <div className="max-w-2xl w-full">
                    <div className="mb-8 animate-fade-in">
                        <Link href="/admin/companies" className="text-slate-600 hover:text-slate-900 text-sm flex items-center gap-1 mb-4">
                            ← キャンセルして一覧へ戻る
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">新規利用会社登録</h1>
                        <p className="text-slate-600">お申し込み企業（利用企業）をシステムに登録します</p>
                    </div>

                    <div className="glass-panel p-8 rounded-2xl animate-fade-in delay-100">
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
                                        法人番号（13桁）
                                    </label>
                                    <span className="text-xs text-slate-500 font-medium">※半角数字のみ・ハイフン不要</span>
                                </div>
                                <input
                                    type="text"
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
                                    {/* フルセット */}
                                    <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${planType === 'full' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="planType"
                                            value="full"
                                            checked={planType === 'full'}
                                            onChange={() => setPlanType('full')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-sm mb-1">両方セット</div>
                                        <div className="text-xs font-bold text-blue-600 mb-2">月額 30,000円</div>
                                        <div className="text-[11px] text-slate-600 leading-tight">就業情報 ＋ 未払い企業情報 すべて利用可能</div>
                                    </label>

                                    {/* 就業情報のみ */}
                                    <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${planType === 'employment' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="planType"
                                            value="employment"
                                            checked={planType === 'employment'}
                                            onChange={() => setPlanType('employment')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-sm mb-1">就業情報のみ</div>
                                        <div className="text-xs font-bold text-slate-700 mb-2">月額 18,000円</div>
                                        <div className="text-[11px] text-slate-600 leading-tight">作業員・応募者トラブル共有のみ</div>
                                    </label>

                                    {/* クレジットのみ */}
                                    <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${planType === 'credit' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="planType"
                                            value="credit"
                                            checked={planType === 'credit'}
                                            onChange={() => setPlanType('credit')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-sm mb-1">クレジットのみ</div>
                                        <div className="text-xs font-bold text-slate-700 mb-2">月額 15,000円</div>
                                        <div className="text-[11px] text-slate-600 leading-tight">未払い企業・取引先情報共有のみ</div>
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
                                    <span>⚠️</span>
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
