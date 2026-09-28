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
            if (err.message?.includes("rate limit")) {
                setErrorMsg("短期間にメールが送信されすぎました。しばらく時間をおいてから再度お試しください。");
            } else {
                setErrorMsg("エラーが発生しました: " + (err.message || "詳細不明"));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/[0.03] rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.03] rounded-full blur-[100px]"></div>
            </div>

            <main className="w-full max-w-lg flex flex-col items-center justify-center relative z-10 animate-fade-in">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
                        パスワード再発行
                    </h1>
                    <p className="text-slate-600 text-sm">
                        登録済みのメールアドレスを入力してください
                    </p>
                </div>

                <div className="w-full glass-panel rounded-2xl md:rounded-3xl p-6 md:p-8 border border-slate-200 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0f172a] to-transparent opacity-50"></div>

                    {successMsg ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                                <Mail className="w-8 h-8 text-blue-600" />
                            </div>
                            <p className="text-slate-800 leading-relaxed text-sm mb-6">
                                {successMsg}
                            </p>
                            <Link href="/" className="btn-secondary w-full inline-block py-3">
                                ログイン画面に戻る
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                                    メールアドレス
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-200 focus:bg-white focus:ring-1 focus:ring-white/30 transition-all font-mono text-sm"
                                    placeholder="name@company.com"
                                />
                            </div>

                            {errorMsg && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2 animate-fade-in">
                                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                                    <p className="text-xs text-red-700 pt-0.5">{errorMsg}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full py-3.5"
                            >
                                {isLoading ? "SENDING..." : "リセットメールを送信"}
                            </button>
                        </form>
                    )}

                    <div className="text-center mt-8 pt-4 border-t border-slate-200">
                        <Link href="/" className="text-xs text-slate-500 hover:text-slate-900 transition-colors">
                            キャンセルして戻る
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
