"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { translateErrorMessage } from "@/lib/errorMessage";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ログイン済みユーザーがトップ（/）を開いた場合はダッシュボードへ自動遷移
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) {
        router.replace("/dashboard");
      }
    });
    return () => {
      active = false;
    };
  }, [router]);

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
        const lower = (error.message || "").toLowerCase();
        if (lower.includes("invalid login credentials")) {
          throw new Error("メールアドレスまたはパスワードが間違っています。");
        }
        if (lower.includes("email not confirmed")) {
          throw new Error("メールアドレスの確認が完了していません。受信トレイを確認してください。");
        }
        if (lower.includes("rate limit") || lower.includes("too many requests")) {
          throw new Error("短期間にログイン試行が集中しました。1分ほど時間をおいてから再度お試しください。");
        }
        if (lower.includes("network") || lower.includes("fetch")) {
          throw new Error("通信エラーが発生しました。ネットワーク接続をご確認の上、再度お試しください。");
        }
        throw new Error("ログインに失敗しました。入力内容をご確認の上、再度お試しください。");
      }

      if (data?.session) {
        router.push("/dashboard");
      } else {
        setErrorMsg("ログインセッションを確立できませんでした。再度お試しください。");
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setErrorMsg(translateErrorMessage(err, "ログイン中に問題が発生しました。時間をおいて再度お試しください。"));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-3.5 sm:p-6 bg-[#f8fafc]">
      <main className="w-full max-w-[460px] flex flex-col items-center justify-center py-4 sm:py-8 my-auto">

        {/* Brand Header - ロゴ＝タイトル統合デザイン */}
        <div className="text-center mb-6 sm:mb-8 flex flex-col items-center">
          <div className="w-44 sm:w-52 md:w-56 mb-4 sm:mb-5">
            <img 
              src="/logo-brand.png" 
              alt="MIERIS ミエリス" 
              className="w-full h-auto object-contain select-none pointer-events-none" 
            />
          </div>
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
          </div>
        </div>
      </main>
    </div>
  );
}
