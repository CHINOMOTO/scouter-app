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
    <div className="min-h-screen flex flex-col items-center justify-between p-4 bg-[#f8fafc]">
      <div className="h-6"></div>

      <main className="w-full max-w-sm flex flex-col items-center justify-center py-6">

        {/* Brand Header - 黄金比・ロゴ統合デザイン */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="w-40 md:w-44 aspect-square relative mb-1 -mt-2">
            <img 
              src="/logo-b.jpg" 
              alt="MIERIS ミエリス" 
              className="w-full h-full object-contain mix-blend-multiply select-none pointer-events-none" 
            />
          </div>
          <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase mb-2.5">
            ミエリス
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
            採る前に、事実を知る。
          </h2>
        </div>

        {/* Login Form Container */}
        <div className="w-full bg-white rounded-2xl p-7 border border-slate-200/90 shadow-lg shadow-slate-200/40">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-700 text-xs">
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

          <div className="text-center mt-6 border-t border-slate-100 pt-5 flex flex-col gap-2.5 text-xs">
            <Link href="/forgot-password" className="text-slate-500 hover:text-slate-900 transition-colors">
              パスワードをお忘れの方はこちら
            </Link>
            <Link href="/signup" className="text-slate-600 hover:text-slate-900 font-semibold transition-colors">
              新規利用のお申し込み（アカウント登録）はこちら →
            </Link>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="w-full text-center text-slate-400 text-xs py-6">
        <p>&copy; 2026 MIERIS. 株式会社ミヤエモン / 株式会社宇井建設</p>
      </footer>
    </div>
  );
}
