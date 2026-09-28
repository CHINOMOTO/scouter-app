"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";

const CATEGORIES = [
    { value: "bug", label: "システム不具合の報告" },
    { value: "feature", label: "機能の追加・改善要望" },
    { value: "account", label: "アカウントに関する相談" },
    { value: "other", label: "その他" },
];

const MAX_MESSAGE_LENGTH = 2000;

export default function ContactPage() {
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
                    setCompanyName((appUser.companies as any)?.name || "未所属");
                }
            }
            setIsLoading(false);
        };
        fetchProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
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
        } catch (err: any) {
            setError(err.message || "予期せぬエラーが発生しました。");
        } finally {
            setIsSending(false);
        }
    };

    if (success) {
        return (
            <RequireAuth>
                <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                    <div className="max-w-2xl w-full relative z-10">
                        <div className="glass-panel rounded-3xl p-10 text-center animate-fade-in border border-slate-200">
                            <div className="text-5xl mb-6">✅</div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">
                                お問い合わせを送信しました
                            </h2>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                ご連絡ありがとうございます。<br />
                                管理者が確認次第、対応いたします。
                            </p>
                            <Link
                                href="/dashboard"
                                className="btn-primary w-full py-3.5"
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
            <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                <div className="max-w-2xl w-full relative z-10">
                    {/* ヘッダー */}
                    <div className="flex items-center justify-between mb-8 animate-fade-in">
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

                    {/* フォーム */}
                    <div className="glass-panel rounded-3xl p-6 md:p-10 animate-fade-in border border-slate-200">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin h-8 w-8 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* 会社名（自動入力） */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700">
                                        会社名
                                    </label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        readOnly
                                        className="input-field w-full opacity-60 cursor-not-allowed"
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
                                        className="input-field w-full opacity-60 cursor-not-allowed"
                                    />
                                </div>

                                {/* お問い合わせ種類 */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700">
                                        お問い合わせ種類 <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="input-field w-full"
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
                                        お問い合わせ内容 <span className="text-red-400">*</span>
                                    </label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="お問い合わせ内容を入力してください"
                                        rows={6}
                                        maxLength={MAX_MESSAGE_LENGTH}
                                        className="input-field w-full resize-none"
                                    />
                                    <p className="text-xs text-slate-9000 text-right">
                                        {message.length} / {MAX_MESSAGE_LENGTH}
                                    </p>
                                </div>

                                {/* エラーメッセージ */}
                                {error && (
                                    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                                        <span className="text-red-400 text-lg">⚠️</span>
                                        <p className="text-sm text-red-700 leading-snug pt-0.5">{error}</p>
                                    </div>
                                )}

                                {/* 送信ボタン */}
                                <button
                                    type="submit"
                                    disabled={isSending}
                                    className="btn-primary w-full py-3.5"
                                >
                                    {isSending ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            送信中...
                                        </span>
                                    ) : (
                                        "送信する"
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </RequireAuth>
    );
}
