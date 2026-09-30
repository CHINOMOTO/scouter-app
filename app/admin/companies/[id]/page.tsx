"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function EditCompanyPage() {
    const router = useRouter();
    const params = useParams();
    const { id } = params;

    const [name, setName] = useState("");
    const [corporateNumber, setCorporateNumber] = useState("");
    const [planType, setPlanType] = useState<"employment" | "credit" | "full">("full");
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
                setName(data.name || "");
                setCorporateNumber(data.corporate_number || "");
                setPlanType(data.plan_type || "full");
                setIsMain(data.is_main || false);
            }
            setLoading(false);
        };

        fetchCompany();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const cleanCorpNum = corporateNumber.trim().replace(/[^0-9]/g, "");
        if (!cleanCorpNum || cleanCorpNum.length !== 13) {
            setError("法人番号（13桁の半角数字）を入力してください。");
            setSaving(false);
            return;
        }

        try {
            const payload: any = {
                name: name.trim(),
                corporate_number: cleanCorpNum || null,
                plan_type: planType,
                is_main: isMain
            };

            let { error: updateError } = await supabase
                .from("companies")
                .update(payload)
                .eq("id", id);

            if (updateError && (updateError.message.includes("corporate_number") || updateError.message.includes("plan_type"))) {
                console.warn("Falling back to basic company schema:", updateError.message);
                const { error: fallbackError } = await supabase
                    .from("companies")
                    .update({ name: name.trim(), is_main: isMain })
                    .eq("id", id);
                if (fallbackError) throw fallbackError;
            } else if (updateError) {
                throw updateError;
            }

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
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-2xl w-full">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 animate-fade-in">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">会社情報の編集</h1>
                            <p className="text-slate-600 text-sm mt-1">登録済みの会社情報・契約プランを更新します</p>
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
                                    placeholder="例: 株式会社〇〇支店"
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
                            </div>

                            {/* 契約プラン選択 */}
                            <div className="space-y-3 pt-2">
                                <label className="text-sm font-bold text-slate-800 block">
                                    契約プラン <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                        <div className="text-[11px] text-slate-600 leading-tight">就業情報 ＋ 未払い企業情報</div>
                                    </label>

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
                                        <div className="text-[11px] text-slate-600 leading-tight">就業トラブル共有のみ</div>
                                    </label>

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
                                        <div className="text-[11px] text-slate-600 leading-tight">未払い企業共有のみ</div>
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
                                    <span className="block text-sm font-semibold text-slate-800">運営元（メイン会社）</span>
                                    <span className="block text-xs text-slate-500">※通常はチェック不要です</span>
                                </label>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary flex-1 py-3.5 text-base"
                                >
                                    {saving ? "保存中..." : "変更を保存"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </RequireAdmin>
    );
}
