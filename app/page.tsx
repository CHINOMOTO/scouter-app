"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const timeoutPromise = new Promise<{ data: { session: null }; error: { message: string } }>((_, reject) =>
        setTimeout(() => reject(new Error("サーバーからの応答がありません。ネットワーク接続を確認してください。")), 15000)
      );

      const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("メールアドレスまたはパスワードが間違っています。");
        }
        if (error.message.includes("Email not confirmed")) {
          throw new Error("メールアドレスの確認が完了していません。受信トレイを確認してください。");
        }
        throw error;
      }

      if (data?.session) {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "ログイン中に問題が発生しました。");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-3.5 sm:p-6 bg-[#f8fafc]">
      <div className="h-2 sm:h-6"></div>

      <main className="w-full max-w-[460px] flex flex-col items-center justify-center py-4 sm:py-8 my-auto">

        {/* Brand Header - ロゴ＝タイトル統合デザイン */}
        <div className="text-center mb-6 sm:mb-8 flex flex-col items-center">
          <div className="w-44 sm:w-52 md:w-56">
            <img 
              src="/logo-brand.png" 
              alt="MIERIS ミエリス" 
              className="w-full h-auto object-contain select-none pointer-events-none" 
            />
          </div>
          <p className="text-[11px] sm:text-xs font-bold text-slate-400 tracking-[0.35em] uppercase mt-1 mb-4 sm:mb-5">
            ミエリス
          </p>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
            採る前に、事実を知る。
          </h2>
        </div>

        {/* Login Form Container - スマホからPCまで最適化されたサイズ感 */}
        <div className="w-full bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-9 border border-slate-200 shadow-xl shadow-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 sm:mb-2">
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
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5 sm:mb-2">
                  パスワード
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field py-2.5 sm:py-3 pl-3.5 sm:pl-4 pr-11 text-sm sm:text-base rounded-xl"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-3.5 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="leading-snug">{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3.5 sm:py-4 text-sm sm:text-base font-bold tracking-wider rounded-xl mt-2 sm:mt-3 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              {isLoading ? "ログイン中..." : "ログインする"}
            </button>
          </form>

          <div className="text-center mt-5 sm:mt-7 border-t border-slate-100 pt-5 sm:pt-6 flex flex-col gap-2.5 sm:gap-3 text-xs sm:text-sm">
            <Link href="/forgot-password" className="text-slate-500 hover:text-slate-900 transition-colors">
              パスワードをお忘れの方はこちら
            </Link>
            {/* <Link href="/signup" className="text-slate-700 hover:text-blue-600 font-bold transition-colors">
              新規アカウント登録（お申し込み）はこちら →
            </Link> */}
          </div>
        </div>
      </main>

      {/* 画面下部の引き締めフッター */}
      <footer className="text-center py-3 text-[11px] text-slate-400 font-medium">
        © 2026 MIERIS. All rights reserved.
      </footer>
    </div>
  );
}
