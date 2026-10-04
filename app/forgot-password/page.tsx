"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Mail, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) {
                throw error;
            }

            setSuccessMsg("パスワード再設定用のメールを送信しました。メール内のリンクをクリックして新しいパスワードを設定してください。");
        } catch (err: any) {
            const msg = (err?.message || "").toLowerCase();
            if (msg.includes("rate limit") || msg.includes("security") || msg.includes("60 seconds")) {
                setErrorMsg("短期間にメールが送信されすぎました。セキュリティのため、1分ほど時間をおいてから再度お試しください。");
            } else if (msg.includes("invalid email") || msg.includes("unable to validate email")) {
                setErrorMsg("正しいメールアドレス形式を入力してください。");
            } else if (msg.includes("network") || msg.includes("fetch failed")) {
                setErrorMsg("通信に失敗しました。ネットワーク接続をご確認の上、再度お試しください。");
            } else {
                setErrorMsg("パスワード再設定メールの送信に失敗しました。時間をおいて再度お試しください。");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-between p-3.5 sm:p-6 bg-[#f8fafc]">
            <div className="h-2 sm:h-6"></div>

            <main className="w-full max-w-[460px] flex flex-col items-center justify-center py-4 sm:py-8 my-auto">
                <div className="mb-6 sm:mb-8 text-center flex flex-col items-center">
                    <Link href="/" className="inline-block mb-3">
                        <img 
                            src="/logo-brand.png" 
                            alt="MIERIS ミエリス" 
                            className="w-36 sm:w-44 h-auto object-contain select-none pointer-events-none" 
                        />
                    </Link>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                        パスワード再発行
                    </h1>
                    <p className="text-slate-600 text-xs sm:text-sm mt-1">
                        ご登録のメールアドレスに再設定リンクをお送りします
                    </p>
                </div>

                <div className="w-full bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-9 border border-slate-200 shadow-xl shadow-slate-200/50">
                    {successMsg ? (
                        <div className="text-center py-2">
                            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 text-emerald-600">
                                <Mail className="w-7 h-7" />
                            </div>
                            <p className="text-slate-800 leading-relaxed text-xs sm:text-sm mb-6">
                                {successMsg}
                            </p>
                            <Link href="/" className="btn-secondary w-full inline-block py-3 rounded-xl font-bold text-xs sm:text-sm active:scale-[0.98]">
                                ログイン画面に戻る
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                                    メールアドレス
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field py-2.5 sm:py-3 px-3.5 sm:px-4 text-sm sm:text-base rounded-xl"
                                    placeholder="example@company.com"
                                />
                            </div>

                            {errorMsg && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm">
                                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                    <p className="leading-snug">{errorMsg}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full py-3.5 sm:py-4 text-sm sm:text-base font-bold tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                            >
                                {isLoading ? "送信中..." : "再設定メールを送信する"}
                            </button>
                        </form>
                    )}

                    <div className="text-center mt-5 sm:mt-6 pt-4 border-t border-slate-100">
                        <Link href="/" className="text-xs sm:text-sm text-slate-500 hover:text-slate-900 transition-colors">
                            ← ログイン画面へ戻る
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="text-center py-3 text-[11px] text-slate-400 font-medium">
                © 2026 MIERIS. All rights reserved.
            </footer>
        </div>
    );
}
