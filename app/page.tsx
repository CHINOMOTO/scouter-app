"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AlertCircle } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex flex-col items-center justify-between p-4 bg-[#f8fafc]">
      <div className="h-6"></div>

      <main className="w-full max-w-[460px] flex flex-col items-center justify-center py-8">

        {/* Brand Header - ロゴ＝タイトル統合デザイン */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-48 md:w-56">
            <img 
              src="/logo-brand.png" 
              alt="MIERIS ミエリス" 
              className="w-full h-auto object-contain select-none pointer-events-none" 
            />
          </div>
          <p className="text-xs font-bold text-slate-400 tracking-[0.35em] uppercase mt-1.5 mb-5">
            ミエリス
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            採る前に、事実を知る。
          </h2>
        </div>

        {/* Login Form Container - ゆったりとしたサイズ感 */}
        <div className="w-full bg-white rounded-3xl p-8 sm:p-9 border border-slate-200 shadow-xl shadow-slate-200/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field py-3 px-4 text-base rounded-xl"
                  placeholder="example@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field py-3 px-4 text-base rounded-xl"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="pt-0.5 leading-snug">{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 text-base font-bold tracking-wider rounded-xl mt-3 shadow-md hover:shadow-lg transition-all"
            >
              {isLoading ? "ログイン中..." : "ログインする"}
            </button>
          </form>

          <div className="text-center mt-7 border-t border-slate-100 pt-6 flex flex-col gap-3 text-sm">
            <Link href="/forgot-password" className="text-slate-500 hover:text-slate-900 transition-colors">
              パスワードをお忘れの方はこちら
            </Link>
            <Link href="/signup" className="text-slate-700 hover:text-blue-600 font-bold transition-colors">
              新規利用のお申し込み（アカウント登録）はこちら →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
