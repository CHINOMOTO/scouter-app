"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";
import { Search, ClipboardList, UserPlus, Settings, Mail, ShieldAlert } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Tokenベースの判定（DBアクセスなし）
        const role = user.app_metadata?.role;
        setIsAdmin(role === 'admin');
      }
    };
    checkAdmin();
  }, []);

  return (
    <RequireAuth>
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
        <div className="max-w-5xl w-full animate-fade-in relative z-10">

          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
              ダッシュボード
            </h1>
            <p className="text-slate-600 font-medium">メインメニュー</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 検索 */}
            <DashboardCard
              title="検索・照会"
              description="氏名やカナなどから登録データを検索します。"
              icon={<Search className="w-10 h-10" strokeWidth={1.5} />}
              onClick={() => router.push("/search")}
            />

            {/* 一覧 */}
            <DashboardCard
              title="登録データ一覧"
              description="現在登録されている全データを確認します。"
              icon={<ClipboardList className="w-10 h-10" strokeWidth={1.5} />}
              onClick={() => router.push("/cases")}
            />

            {/* 新規登録 */}
            <DashboardCard
              title="新規登録"
              description="新たな対象者を登録データに追加します。"
              icon={<UserPlus className="w-10 h-10" strokeWidth={1.5} />}
              onClick={() => router.push("/cases/new")}
            />

            {/* アカウント設定 */}
            <DashboardCard
              title="アカウント設定"
              description="ログインパスワードの変更や、アカウントの確認を行います。"
              icon={<Settings className="w-10 h-10" strokeWidth={1.5} />}
              onClick={() => router.push("/settings")}
            />

            {/* お問い合わせ */}
            <DashboardCard
              title="お問い合わせ"
              description="システムの不具合や機能要望など、管理者にご連絡いただけます。"
              icon={<Mail className="w-10 h-10" strokeWidth={1.5} />}
              onClick={() => router.push("/contact")}
            />

            {/* 管理者メニュー */}
            {isAdmin && (
              <DashboardCard
                title="管理者メニュー"
              description="新規登録申請やユーザーアカウントの承認・管理を行います。"
                icon={<ShieldAlert className="w-10 h-10" strokeWidth={1.5} />}
                isAdmin
                onClick={() => router.push("/admin")}
              />
            )}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

function DashboardCard({
  title, description, icon, onClick,  isAdmin = false
}: {
  title: string, description: string, icon: React.ReactNode, onClick: () => void,  isAdmin?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="group relative text-left p-8 rounded-3xl border border-slate-200 transition-all duration-300 glass-panel hover:-translate-y-2 flex flex-col h-full overflow-hidden hover:border-slate-300/50 hover:bg-slate-50"
    >
      {/* Background Hover Glow */}
      <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-6 w-full">
          <div className="p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white">
            {icon}
          </div>
          {isAdmin && (
            <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 uppercase tracking-wider shadow-sm">
              Admin Only
            </span>
          )}
        </div>

        <h3 className={`text-2xl font-bold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-blue-600 ${isAdmin ? 'text-slate-900' : ''}`}>
          {title}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed mt-auto ">
          {description}
        </p>
      </div>
    </button>
  )
}
