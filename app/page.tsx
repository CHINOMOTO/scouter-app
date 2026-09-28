"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#090d16]">
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-white/[0.02] rounded-full blur-[120px]"></div>
      </div>

      <main className="w-full max-w-xl flex flex-col items-center justify-center relative z-10 py-12">

        {/* Brand Header */}
        <div className="text-center mb-10 space-y-3">
          <p className="text-[11px] font-mono tracking-[0.25em] text-slate-400 uppercase">
            TALENT RISK MANAGEMENT
          </p>

          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#090d16] font-black text-xl tracking-tighter shadow-md">
              M
            </div>
            <div className="text-left">
              <h1 className="text-4xl md:text-5xl font-black tracking-wider text-white leading-none">
                MIERIS
              </h1>
              <span className="text-[11px] text-slate-400 tracking-[0.2em] font-medium leading-none block mt-1">
                ミエリス
              </span>
            </div>
          </div>

          <div className="pt-2">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              採る前に、事実を知る。
            </h2>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed max-w-md mx-auto mt-2">
              就業実績を、本人同意のもとで利用企業間に共有する仕組みです。<br className="hidden sm:block" />
              履歴書と30分の面接では見抜けなかったことを、採る前に。
            </p>
            <span className="inline-block mt-3 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[11px] text-slate-300 font-medium">
              雑工・荷揚げ・警備・運送 就業情報共有システム
            </span>
          </div>
        </div>

        {/* Login Form Container */}
        <div className="w-full max-w-md glass-panel p-8 border border-white/10 shadow-2xl relative">
          <div className="mb-6 text-center">
            <h3 className="text-base font-bold text-white tracking-wide">
              ログイン
            </h3>
            <p className="text-xs text-slate-400 mt-1">登録済みのメールアドレスとパスワードを入力してください</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  メールアドレス
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="example@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  パスワード
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 text-red-300 text-xs">
                <span>⚠️</span>
                <p className="pt-0.5">{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3.5 mt-2"
            >
              {isLoading ? "ログイン中..." : "ログインする"}
            </button>
          </form>

          <div className="text-center mt-6 border-t border-white/10 pt-5 flex flex-col gap-2.5 text-xs">
            <Link href="/forgot-password" className="text-slate-400 hover:text-white transition-colors">
              パスワードをお忘れの方はこちら
            </Link>
            <Link href="/signup" className="text-slate-400 hover:text-white font-medium transition-colors">
              新規利用のお申し込み（アカウント登録）はこちら →
            </Link>
          </div>
        </div>
      </main>

      <footer className="w-full text-center text-slate-600 text-xs py-4">
        <p>&copy; 2026 MIERIS. 株式会社ミヤエモン / 株式会社宇井建設</p>
      </footer>
    </div>
  );
}
