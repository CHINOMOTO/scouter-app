"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";
import { 
  Search, 
  ClipboardList, 
  UserPlus, 
  Settings, 
  Mail, 
  ShieldAlert, 
  Building2, 
  FilePlus2, 
  ArrowRight,
  Sparkles,
  Lock,
  Building,
  Bell
} from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowedPlan, setAllowedPlan] = useState<string>("full");
  const [companyName, setCompanyName] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const role = user.app_metadata?.role;
        const isUserAdmin = role === "admin";
        setIsAdmin(isUserAdmin);

        const { data: appUser } = await supabase
          .from("app_users")
          .select("display_name, allowed_plan, company_id, companies ( name )")
          .eq("id", user.id)
          .maybeSingle();

        if (appUser) {
          if (appUser.allowed_plan) {
            setAllowedPlan(appUser.allowed_plan);
          }
          if (appUser.display_name) {
            setDisplayName(appUser.display_name);
          }
          const comp = (appUser.companies as any)?.name;
          if (comp) {
            setCompanyName(comp);
          }
        }
      } catch (e) {
        console.error("Dashboard user fetch error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    const loadAnnouncements = async () => {
      try {
        const { data } = await supabase
          .from("announcements")
          .select("id, title, content, created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(5);

        if (data) {
          setAnnouncements(data);
        }
      } catch (err) {
        console.error("Announcements fetch error:", err);
      }
    };

    loadUserData();
    loadAnnouncements();
  }, []);

  // プラン権限の判定
  const canViewPerson = isAdmin || allowedPlan === "full" || allowedPlan === "employment";
  const canViewCredit = isAdmin || allowedPlan === "full" || allowedPlan === "credit";

  return (
    <RequireAuth>
      <div className="min-h-screen pt-20 md:pt-10 pb-16 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-32 gap-3">
            <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
            <p className="text-sm text-slate-600 font-medium">ダッシュボードを読み込み中...</p>
          </div>
        ) : (
          <div className="max-w-5xl w-full animate-fade-in relative z-10">

          {/* ヘッダーエリア */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                ダッシュボード
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                ご利用のプランに応じた各種照会・登録メニューをご案内します。
              </p>
            </div>
          </div>

          {/* お知らせ・システム通知 */}
          {announcements.length > 0 && (
            <div className="mb-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 tracking-wide">
                    お知らせ・システム通知
                  </span>
                </div>
                {isAdmin && (
                  <Link
                    href="/admin/announcements"
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap"
                  >
                    お知らせ管理 →
                  </Link>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {announcements.map((item) => (
                  <div key={item.id} className="p-5 hover:bg-slate-50/40 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <span className="text-xs text-slate-500 font-mono shrink-0">
                        {new Date(item.created_at).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* セクション 1: 👤 応募者照会・就業管理（トラブル防止） */}
          {canViewPerson && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-5 bg-slate-900 rounded-full" />
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    応募者照会・就業管理
                  </h2>
                  <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                    （就業トラブル・無断欠勤・損害リスク等の照会・共有）
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {/* 応募者検索・照会 */}
                <MenuCard
                  title="応募者 検索・照会"
                  description="氏名・カナ・生年月日等から過去のトラブルや問題行動の記録を照会します。"
                  badge="照会"
                  icon={<Search className="w-5 h-5 text-slate-700" />}
                  onClick={() => router.push("/search")}
                />

                {/* 登録データ一覧 */}
                <MenuCard
                  title="登録データ一覧"
                  description="現在データベースに登録・共有されているトラブル人材の一覧を確認します。"
                  badge="一覧"
                  icon={<ClipboardList className="w-5 h-5 text-slate-700" />}
                  onClick={() => router.push("/cases")}
                />

                {/* 人物を新規登録 */}
                <MenuCard
                  title="トラブル情報を新規登録"
                  description="就業トラブルを起こした従業員や応募者の事実を新規登録し、共有申請を行います。"
                  badge="登録申請"
                  icon={<UserPlus className="w-5 h-5 text-slate-700" />}
                  onClick={() => router.push("/cases/new")}
                />
              </div>
            </div>
          )}

          {/* セクション 2: 🏢 企業信用管理（未払い・代金未回収防止） */}
          {canViewCredit && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    企業信用管理
                  </h2>
                  <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                    （MIERIS CREDIT | 支払い遅延・未払い情報の照会・共有）
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {/* 企業信用照会 */}
                <MenuCard
                  title="企業信用 検索・照会"
                  description="取引先企業の支払い遅延履歴や未払い金額、事故の登録理由を照会し、代金未回収を防ぎます。"
                  badge="信用照会"
                  icon={<Building2 className="w-5 h-5 text-blue-600" />}
                  onClick={() => router.push("/credit")}
                />

                {/* 登録データ一覧 */}
                <MenuCard
                  title="登録データ一覧"
                  description="現在データベースに登録・共有されている取引先企業の遅延・未払いデータの一覧を確認します。"
                  badge="一覧"
                  icon={<ClipboardList className="w-5 h-5 text-slate-700" />}
                  onClick={() => router.push("/credit/cases")}
                />

                {/* 遅延・未払いを新規登録 */}
                <MenuCard
                  title="遅延・未払いを新規登録"
                  description="期日を過ぎても支払いがない取引先企業の事実を登録し、信用情報として共有申請します。"
                  badge="情報登録"
                  icon={<FilePlus2 className="w-5 h-5 text-slate-700" />}
                  onClick={() => router.push("/credit/new")}
                />
              </div>
            </div>
          )}

          {/* 未契約プランのアップセル案内バナー（未契約機能がある場合のみ表示） */}
          {!isAdmin && allowedPlan === "employment" && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider font-mono">
                      PLAN UPGRADE
                    </span>
                    <span className="text-xs text-slate-400">|</span>
                    <h3 className="text-sm font-bold text-slate-900">
                      取引先信用管理「ミエリスクレジット」を追加しませんか？
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    売掛金の未回収や支払い遅延リスクを未然に防ぐ、企業未払い情報データベースをご利用いただけます。
                  </p>
                </div>
              </div>
              <Link
                href="/contact"
                className="btn-secondary text-xs px-4 py-2 shrink-0 flex items-center gap-1.5 font-bold whitespace-nowrap"
              >
                <span>プラン追加のお問い合わせ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {!isAdmin && allowedPlan === "credit" && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                      PLAN UPGRADE
                    </span>
                    <span className="text-xs text-slate-400">|</span>
                    <h3 className="text-sm font-bold text-slate-900">
                      採用・就業トラブル防止「人物情報プラン」を追加しませんか？
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    採用前のバックグラウンド確認や、無断欠勤・損害トラブル等の人物データベースをご利用いただけます。
                  </p>
                </div>
              </div>
              <Link
                href="/contact"
                className="btn-secondary text-xs px-4 py-2 shrink-0 flex items-center gap-1.5 font-bold whitespace-nowrap"
              >
                <span>プラン追加のお問い合わせ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* セクション 3: システム設定 & サポート */}
          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              設定 & サポート
            </h3>
            <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3">
              {/* アカウント設定 */}
              <UtilityCard
                title="アカウント設定"
                description="パスワード変更やユーザー情報の確認"
                icon={<Settings className="w-4 h-4 text-slate-600" />}
                onClick={() => router.push("/settings")}
              />

              {/* お問い合わせ */}
              <UtilityCard
                title="お問い合わせ"
                description="システムの要望・プラン変更等のご相談"
                icon={<Mail className="w-4 h-4 text-slate-600" />}
                onClick={() => router.push("/contact")}
              />

              {/* 管理者メニュー */}
              {isAdmin && (
                <UtilityCard
                  title="管理者メニュー"
                  description="申請の承認・企業登録・ユーザー管理"
                  badge="Admin"
                  icon={<ShieldAlert className="w-4 h-4 text-slate-900" />}
                  onClick={() => router.push("/admin")}
                />
              )}
            </div>
          </div>

        </div>
        )}
      </div>
    </RequireAuth>
  );
}

// メインアクションカード
function MenuCard({
  title,
  description,
  badge,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 transition-all duration-200 flex flex-col h-full relative cursor-pointer shadow-2xs hover:shadow-xs hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between w-full mb-4">
        <div className="p-2.5 rounded-lg bg-slate-100 text-slate-800 group-hover:bg-slate-200/80 transition-colors">
          {icon}
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
          {badge}
        </span>
      </div>

      <h3 className="text-base font-bold mb-1.5 flex items-center justify-between text-slate-900 group-hover:text-blue-600 transition-colors">
        <span>{title}</span>
        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-blue-600" />
      </h3>
      <p className="text-xs leading-relaxed mt-auto text-slate-600">
        {description}
      </p>
    </button>
  );
}

// 設定・サポート用小型カード
function UtilityCard({
  title,
  description,
  badge,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  badge?: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between shadow-2xs cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-200 transition-colors">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              {title}
            </span>
            {badge && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-900 text-white">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
            {description}
          </p>
        </div>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
    </button>
  );
}
