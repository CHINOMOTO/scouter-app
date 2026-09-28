"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Supabaseのハッシュフラグメント読み取り待機用
    const [isSessionReady, setIsSessionReady] = useState(false);

    useEffect(() => {
        // セッションが確立されたか確認する
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsSessionReady(true);
            } else {
                // ハッシュからの読み取りを少し待つ
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'PASSWORD_RECOVERY' || session) {
                        setIsSessionReady(true);
                    }
                });
                return () => subscription.unsubscribe();
            }
        };
        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);

        if (password !== confirmPassword) {
            setErrorMsg("パスワードが一致しません。");
            setIsLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            setSuccessMsg("パスワードが正常に更新されました！数秒後にダッシュボードへ移動します。");
            setTimeout(() => {
                router.push("/dashboard");
            }, 3000);
        } catch (err: any) {
            setErrorMsg("エラーが発生しました: " + (err.message || "詳細不明"));
            setIsLoading(false);
        }
    };

    if (!isSessionReady) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin h-10 w-10 border-4 border-white/40 rounded-full border-t-transparent mx-auto mb-4"></div>
                    <p className="text-slate-600">認証情報を確認中...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/[0.03] rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.03] rounded-full blur-[100px]"></div>
            </div>

            <main className="w-full max-w-lg flex flex-col items-center justify-center relative z-10 animate-fade-in">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
                        新パスワードの設定
                    </h1>
                    <p className="text-slate-600 text-sm">
                        8文字以上の新しいパスワードを入力してください
                    </p>
                </div>

                <div className="w-full glass-panel rounded-2xl md:rounded-3xl p-6 md:p-8 border border-slate-200 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0f172a] to-transparent opacity-50"></div>

                    {successMsg ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                                <span className="text-2xl">✅</span>
                            </div>
                            <p className="text-emerald-400 font-bold mb-2">更新完了</p>
                            <p className="text-slate-700 text-sm">{successMsg}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                                    新しいパスワード
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-200 focus:bg-white focus:ring-1 focus:ring-white/30 transition-all font-mono text-sm"
                                    placeholder="8文字以上"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                                    新しいパスワード（確認用）
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-200 focus:bg-white focus:ring-1 focus:ring-white/30 transition-all font-mono text-sm"
                                    placeholder="もう一度入力してください"
                                />
                            </div>

                            {errorMsg && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2 animate-fade-in">
                                    <span className="text-red-400 text-sm">⚠️</span>
                                    <p className="text-xs text-red-200 pt-0.5">{errorMsg}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full py-3.5"
                            >
                                {isLoading ? "UPDATING..." : "パスワードを更新"}
                            </button>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
