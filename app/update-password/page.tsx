"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Supabaseのハッシュフラグメント読み取り待機用
    const [isSessionReady, setIsSessionReady] = useState(false);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        // URLハッシュにエラー情報（期限切れなど）が含まれているかチェック
        if (typeof window !== "undefined") {
            const hash = window.location.hash;
            if (hash.includes("error=access_denied") || hash.includes("otp_expired") || hash.includes("error_code=")) {
                setIsExpired(true);
                return;
            }
        }

        let isMounted = true;

        // セッションが確立されたか確認する
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session && isMounted) {
                    setIsSessionReady(true);
                    return;
                }

                // ハッシュからの読み取りを待つ
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if ((event === 'PASSWORD_RECOVERY' || session) && isMounted) {
                        setIsSessionReady(true);
                    }
                });

                // 4秒待ってもセッションが確立されない場合は期限切れ・無効と判断
                const timeoutId = setTimeout(() => {
                    if (isMounted) {
                        supabase.auth.getSession().then(({ data: { session } }) => {
                            if (!session && isMounted) {
                                setIsExpired(true);
                            }
                        });
                    }
                }, 4000);

                return () => {
                    subscription.unsubscribe();
                    clearTimeout(timeoutId);
                };
            } catch (err) {
                console.error("Session check error:", err);
                if (isMounted) setIsExpired(true);
            }
        };

        checkSession();

        return () => {
            isMounted = false;
        };
    }, []);

    // エラーメッセージの日本語変換関数
    const formatErrorMessage = (error: any): string => {
        const msg = (error?.message || "").toLowerCase();
        if (msg.includes("different from the old password") || msg.includes("same_password")) {
            return "以前と同じパスワードは設定できません。異なる新しいパスワードを入力してください。";
        }
        if (msg.includes("at least 8 characters") || msg.includes("should be at least")) {
            return "パスワードは8文字以上で入力してください。";
        }
        if (msg.includes("pwned") || msg.includes("weak_password") || msg.includes("too weak")) {
            return "セキュリティ強度が不足しています。英数字や記号を組み合わせた推測されにくいパスワードを設定してください。";
        }
        if (msg.includes("session") || msg.includes("token") || msg.includes("auth session missing")) {
            return "認証セッションの有効期限が切れています。お手数ですが、再度パスワード再発行を行ってください。";
        }
        if (msg.includes("network") || msg.includes("fetch failed")) {
            return "通信エラーが発生しました。ネットワーク接続をご確認の上、再度お試しください。";
        }
        return "パスワードの更新に失敗しました。時間をおいて再度お試しください。";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);

        if (password.length < 8) {
            setErrorMsg("パスワードは8文字以上で入力してください。");
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg("パスワードが一致しません。入力内容をご確認ください。");
            setIsLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            setSuccessMsg("パスワードが正常に更新されました！3秒後にダッシュボードへ移動します。");
            setTimeout(() => {
                router.push("/dashboard");
            }, 3000);
        } catch (err: any) {
            setErrorMsg(formatErrorMessage(err));
            setIsLoading(false);
        }
    };

    // 再設定リンクの期限切れ・無効画面
    if (isExpired) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#f8fafc]">
                <div className="max-w-md w-full glass-panel p-8 md:p-10 rounded-3xl text-center border border-slate-200 shadow-sm animate-fade-in relative z-10">
                    <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-5 text-amber-600">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">
                        再設定リンクの有効期限切れ
                    </h1>
                    <p className="text-slate-600 text-xs leading-relaxed mb-6">
                        パスワード再設定リンクの有効期限が切れているか、すでに使用されています。<br />
                        お手数ですが、再度パスワードの再発行申請を行ってください。
                    </p>
                    <Link 
                        href="/forgot-password" 
                        className="btn-primary w-full py-3.5 inline-flex items-center justify-center gap-2 font-bold text-xs"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>パスワード再発行ページへ</span>
                    </Link>
                </div>
            </div>
        );
    }

    // 認証情報読み取り待機中
    if (!isSessionReady) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc]">
                <div className="text-center">
                    <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900 mx-auto mb-4"></div>
                    <p className="text-slate-600 text-xs font-medium">認証情報を確認しています...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#f8fafc]">
            <main className="w-full max-w-lg flex flex-col items-center justify-center relative z-10 animate-fade-in">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
                        新パスワードの設定
                    </h1>
                    <p className="text-slate-600 text-xs">
                        8文字以上の新しいパスワードを入力してください
                    </p>
                </div>

                <div className="w-full glass-panel rounded-2xl md:rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm relative overflow-hidden bg-white">
                    {successMsg ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 text-emerald-600">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-2">更新完了</h2>
                            <p className="text-slate-600 text-xs leading-relaxed mb-6">{successMsg}</p>
                            <Link href="/dashboard" className="btn-primary px-6 py-2.5 inline-block text-xs font-bold">
                                ダッシュボードへ今すぐ移動
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">
                                    新しいパスワード
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all font-mono text-sm"
                                    placeholder="8文字以上で入力"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">
                                    新しいパスワード（確認用）
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all font-mono text-sm"
                                    placeholder="もう一度入力してください"
                                />
                            </div>

                            {errorMsg && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 animate-fade-in text-red-700">
                                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                    <p className="text-xs font-medium leading-relaxed">{errorMsg}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full py-3.5 font-bold text-sm shadow-xs transition-all"
                            >
                                {isLoading ? "パスワード更新中..." : "パスワードを更新する"}
                            </button>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
