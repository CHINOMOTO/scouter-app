"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Send, Edit3 } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";

const CATEGORIES = [
    { value: "bug", label: "システム不具合の報告" },
    { value: "feature", label: "機能の追加・改善要望" },
    { value: "account", label: "アカウントに関する相談" },
    { value: "other", label: "その他" },
];

const MAX_MESSAGE_LENGTH = 2000;

export default function ContactPage() {
    const [step, setStep] = useState<"input" | "confirm">("input");
    const [companyName, setCompanyName] = useState("");
    const [userName, setUserName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [category, setCategory] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: appUser } = await supabase
                    .from("app_users")
                    .select("display_name, phone_number, companies(name)")
                    .eq("id", user.id)
                    .single();

                if (appUser) {
                    setUserName(appUser.display_name || "");
                    setPhoneNumber(appUser.phone_number || "");
                    setCompanyName((appUser.companies as any)?.name || "未所属");
                }
            }
            setIsLoading(false);
        };
        fetchProfile();
    }, []);

    // 入力画面から確認画面へ
    const handleProceedToConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!category) {
            setError("お問い合わせ種類を選択してください。");
            return;
        }
        if (!message.trim()) {
            setError("お問い合わせ内容を入力してください。");
            return;
        }
        if (message.length > MAX_MESSAGE_LENGTH) {
            setError(`お問い合わせ内容は${MAX_MESSAGE_LENGTH}文字以内で入力してください。`);
            return;
        }

        setStep("confirm");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // 確認画面から実際の送信処理
    const handleFinalSubmit = async () => {
        setError(null);
        setIsSending(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError("ログイン情報が取得できませんでした。再度ログインしてください。");
                setIsSending(false);
                return;
            }

            const res = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    category,
                    message: message.trim(),
                    companyName,
                    userName,
                    phoneNumber,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "送信に失敗しました。");
            }

            setSuccess(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err: any) {
            setError(err.message || "予期せぬエラーが発生しました。");
        } finally {
            setIsSending(false);
        }
    };

    const selectedCategoryLabel = CATEGORIES.find((c) => c.value === category)?.label || category;

    // 送信完了画面
    if (success) {
        return (
            <RequireAuth>
                <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 flex flex-col items-center">
                    <div className="max-w-2xl w-full relative z-10">
                        <div className="glass-panel rounded-3xl p-10 text-center animate-fade-in border border-slate-200">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">
                                お問い合わせを送信しました
                            </h2>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                ご連絡ありがとうございます。<br />
                                管理者が確認次第、対応いたします。
                            </p>
                            <Link
                                href="/dashboard"
                                className="btn-primary w-full py-3.5 inline-block text-center"
                            >
                                ダッシュボードへ戻る
                            </Link>
                        </div>
                    </div>
                </div>
            </RequireAuth>
        );
    }

    return (
        <RequireAuth>
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 flex flex-col items-center">
                <div className="max-w-2xl w-full relative z-10">

                    {/* ヘッダー */}
                    <div className="flex items-center justify-between mb-6 animate-fade-in">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
                                お問い合わせ
                            </h1>
                            <p className="text-slate-600">
                                管理者への連絡・ご相談はこちらから
                            </p>
                        </div>
                        <Link href="/dashboard" className="btn-secondary text-xs px-4 py-2.5">
                            戻る
                        </Link>
                    </div>

                    {/* ステップインジケーター */}
                    <div className="mb-8 flex items-center justify-center gap-3 text-xs font-bold animate-fade-in">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                            step === "input" 
                                ? "bg-slate-900 text-white border-slate-900 shadow-xs" 
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
                            <span>入力</span>
                        </div>
                        <span className="text-slate-300">──</span>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                            step === "confirm" 
                                ? "bg-slate-900 text-white border-slate-900 shadow-xs" 
                                : "bg-slate-100 text-slate-400 border-slate-200"
                        }`}>
                            <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[10px]">2</span>
                            <span>確認</span>
                        </div>
                        <span className="text-slate-300">──</span>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-slate-100 text-slate-400 border-slate-200">
                            <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[10px]">3</span>
                            <span>完了</span>
                        </div>
                    </div>

                    {/* メインパネル */}
                    <div className="glass-panel rounded-3xl p-6 md:p-10 animate-fade-in border border-slate-200">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin h-8 w-8 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                            </div>
                        ) : step === "input" ? (
                            /* ---------------- STEP 1: 入力フォーム ---------------- */
                            <form onSubmit={handleProceedToConfirm} className="space-y-6">
                                {/* 会社名（自動入力） */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700">
                                        会社名
                                    </label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        readOnly
                                        className="input-field w-full opacity-60 cursor-not-allowed bg-slate-50"
                                    />
                                </div>

                                {/* ユーザー名（自動入力） */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700">
                                        ユーザー名
                                    </label>
                                    <input
                                        type="text"
                                        value={userName}
                                        readOnly
                                        className="input-field w-full opacity-60 cursor-not-allowed bg-slate-50"
                                    />
                                </div>

                                {/* お問い合わせ種類 */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700">
                                        お問い合わせ種類 <span className="text-rose-600">*</span>
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="input-field w-full"
                                        required
                                    >
                                        <option value="">-- 選択してください --</option>
                                        {CATEGORIES.map((cat) => (
                                             <option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* お問い合わせ内容 */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700">
                                        お問い合わせ内容 <span className="text-rose-600">*</span>
                                    </label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="お問い合わせ内容を入力してください"
                                        rows={6}
                                        maxLength={MAX_MESSAGE_LENGTH}
                                        className="input-field w-full resize-none"
                                        required
                                    />
                                    <p className="text-xs text-slate-500 text-right">
                                        {message.length} / {MAX_MESSAGE_LENGTH}
                                    </p>
                                </div>

                                {/* エラーメッセージ */}
                                {error && (
                                    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                                        <p className="text-sm text-red-700 leading-snug pt-0.5">{error}</p>
                                    </div>
                                )}

                                {/* 確認画面へ進むボタン */}
                                <button
                                    type="submit"
                                    className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base font-bold shadow-sm"
                                >
                                    <span>入力内容を確認する</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </form>
                        ) : (
                            /* ---------------- STEP 2: 確認画面 ---------------- */
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs leading-relaxed">
                                    まだ送信は完了していません。以下の入力内容をご確認いただき、問題がなければ「この内容で送信する」ボタンを押してください。
                                </div>

                                <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 divide-y divide-slate-200">
                                    {/* 会社名 */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3">
                                        <span className="text-xs font-bold text-slate-500">会社名</span>
                                        <span className="text-sm font-bold text-slate-900">{companyName || "未登録"}</span>
                                    </div>

                                    {/* ユーザー名 */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-3">
                                        <span className="text-xs font-bold text-slate-500">ユーザー名</span>
                                        <span className="text-sm font-bold text-slate-900">{userName || "未設定"}</span>
                                    </div>

                                    {/* お問い合わせ種類 */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-3">
                                        <span className="text-xs font-bold text-slate-500">お問い合わせ種類</span>
                                        <span className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200 inline-block self-start sm:self-auto">
                                            {selectedCategoryLabel}
                                        </span>
                                    </div>

                                    {/* お問い合わせ内容 */}
                                    <div className="space-y-2 pt-3">
                                        <span className="text-xs font-bold text-slate-500 block">お問い合わせ内容</span>
                                        <div className="text-sm text-slate-800 bg-white p-4 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed min-h-[100px]">
                                            {message}
                                        </div>
                                    </div>
                                </div>

                                {/* エラーメッセージ */}
                                {error && (
                                    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                                        <p className="text-sm text-red-700 leading-snug pt-0.5">{error}</p>
                                    </div>
                                )}

                                {/* ボタン群 */}
                                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                                    <button
                                        type="button"
                                        disabled={isSending}
                                        onClick={() => setStep("input")}
                                        className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        <span>修正する</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isSending}
                                        onClick={handleFinalSubmit}
                                        className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-sm font-bold shadow-md"
                                    >
                                        {isSending ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                送信中...
                                            </span>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4" />
                                                <span>この内容で送信する</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </RequireAuth>
    );
}
