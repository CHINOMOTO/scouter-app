"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignUpPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [companyName, setCompanyName] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);

        try {
            // 1. Supabase Auth Sign Up
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) {
                if (authError.message.includes("User already registered")) {
                    throw new Error("このメールアドレスは既に登録されています。ログイン画面からログインしてください。");
                }
                if (authError.message.includes("Password should be at least")) {
                    throw new Error("パスワードは8文字以上で設定してください。");
                }
                throw new Error("アカウント登録に失敗しました: " + authError.message);
            }

            if (!authData.user) {
                throw new Error("ユーザー作成に失敗しました。時間をおいて再度お試しください。");
            }

            const userId = authData.user.id;

            // 2. 会社情報の検索または作成
            let companyId: string | null = null;

            // 会社名を正規化（表記ゆれ対策）
            const normalizeCompanyName = (name: string): string => {
                let n = name.trim();
                // 全角スペース・半角スペースを除去
                n = n.replace(/[\s\u3000]+/g, '');
                // ㈱ → 株式会社
                n = n.replace(/㈱/g, '株式会社');
                // ㈲ → 有限会社
                n = n.replace(/㈲/g, '有限会社');
                // (株) → 株式会社
                n = n.replace(/[（(]株[）)]/g, '株式会社');
                // (有) → 有限会社
                n = n.replace(/[（(]有[）)]/g, '有限会社');
                // 全角英数字を半角に変換
                n = n.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
                    String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
                );
                return n;
            };

            const normalizedName = normalizeCompanyName(companyName);

            // 既存の会社を全件取得して正規化後の名前で比較
            const { data: allCompanies } = await supabase
                .from("companies")
                .select("id, name");

            const matchedCompany = (allCompanies || []).find(
                (c) => normalizeCompanyName(c.name) === normalizedName
            );

            if (matchedCompany) {
                companyId = matchedCompany.id;
            } else {
                // 新規作成（ユーザーが入力したそのままの名前で保存）
                const { data: newCompany, error: companyError } = await supabase
                    .from("companies")
                    .insert([{ name: companyName.trim(), is_main: false }])
                    .select("id")
                    .single();

                if (companyError) {
                    throw new Error("会社情報の登録に失敗しました。管理者にお問い合わせください。");
                }
                companyId = newCompany.id;
            }

            if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
                throw new Error("このメールアドレスは既に登録されています。ログイン画面からログインしてください。");
            }

            // 3. app_usersテーブルへの追加
            // 少し待機してauth.usersの伝播を確実にする（念の為）
            await new Promise(resolve => setTimeout(resolve, 1000));

            const { error: appUserError } = await supabase
                .from("app_users")
                .upsert([
                    {
                        id: userId,
                        display_name: displayName,
                        company_id: companyId,
                        role: "viewer",
                        is_approved: false
                    }
                ]);

            if (appUserError) {
                console.error("App User Insert Error:", appUserError);
                if (appUserError.code === "23503") {
                    throw new Error("このメールアドレスは既に登録されています。ログイン画面からログインしてください。");
                }
                throw new Error(`ユーザープロフィールの保存に失敗しました: ${appUserError.message} (Code: ${appUserError.code})`);
            }

            // LINE通知APIの呼び出し（失敗してもユーザーの画面遷移は止めない）
            try {
                await fetch('/api/notify/line', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'signup',
                        data: {
                            name: displayName,
                            company: companyName,
                            email: email
                        }
                    })
                });
            } catch (notifyErr) {
                console.error("Notify Error:", notifyErr);
            }

            router.push("/pending-approval");

        } catch (err: any) {
            setErrorMsg(err.message || "予期せぬエラーが発生しました。");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="w-full max-w-lg relative z-10 my-8">
                <div className="glass-panel rounded-3xl p-8 md:p-10 border border-white/5 animate-fade-in backdrop-blur-xl">

                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 mb-4 border border-white/5">
                            <span className="text-2xl filter">✨</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
                            新規アカウント作成
                        </h1>
                        <p className="text-slate-600 text-sm">
                            アカウント情報を入力してください
                        </p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-5">

                        <div className="grid grid-cols-1 gap-5">
                            {/* Display Name */}
                            <div className="input-group group space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                                    氏名（表示名） <span className="text-slate-900">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-200 focus:bg-white focus:ring-4 focus:ring-white/30 transition-all duration-300"
                                    placeholder="例: 山田 太郎"
                                />
                            </div>

                            {/* Company Name */}
                            <div className="input-group group space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                                    会社名 <span className="text-slate-900">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-200 focus:bg-white focus:ring-4 focus:ring-white/30 transition-all duration-300"
                                    placeholder="例: 株式会社〇〇建設"
                                />
                                <p className="text-[10px] text-slate-500 pl-1">
                                    ※既存の会社がある場合は自動的に紐付けられます
                                </p>
                            </div>

                            {/* Email */}
                            <div className="input-group group space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                                    メールアドレス <span className="text-slate-900">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-200 focus:bg-white focus:ring-4 focus:ring-white/30 transition-all duration-300"
                                    placeholder="name@company.com"
                                />
                            </div>

                            {/* Password */}
                            <div className="input-group group space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-widest ml-1">
                                    パスワード <span className="text-slate-900">*</span>
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-200 focus:bg-white focus:ring-4 focus:ring-white/30 transition-all duration-300"
                                    placeholder="8文字以上で設定"
                                />
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-fade-in flex items-start gap-3 mt-4">
                                <span className="text-red-400 text-lg">⚠️</span>
                                <p className="text-sm text-red-200 leading-snug pt-0.5">
                                    {errorMsg}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-[#0f172a]/80 to-[#0f172a] hover:from-[#0f172a] hover:to-[#0f172a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/30 transition-all duration-300 hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                "アカウント作成（申請）"
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-xs text-slate-500 text-center leading-relaxed">
                        登録申請後、管理者による承認が必要です。<br />
                        <Link href="/" className="text-slate-700 hover:text-slate-900 underline underline-offset-2 ml-1">
                            すでにアカウントをお持ちの方はこちら
                        </Link>
                    </p>
                </div>

                <div className="text-center mt-6">
                    <Link href="/" className="text-slate-500 hover:text-slate-700 text-xs transition-colors">
                        トップページに戻る
                    </Link>
                </div>
            </div>
        </div>
    );
}
