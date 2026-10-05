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
  Users,
  Settings, 
  Mail, 
  ShieldAlert, 
  Building2, 
  FilePlus2, 
  ArrowRight,
  Sparkles,
  Lock,
  Building,
  Bell,
  AlertTriangle,
  BookmarkCheck
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
  const [watchlistAlertCount, setWatchlistAlertCount] = useState<number>(0);
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

    const loadWatchlistAlerts = async () => {
      try {
        const session = (await supabase.auth.getSession()).data.session;
        if (!session) return;

        const res = await fetch("/api/credit/watchlist", {
          headers: {
            "Authorization": `Bearer ${session.access_token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.warning_count === "number") {
            setWatchlistAlertCount(data.warning_count);
          }
        }
      } catch {
        // ignore silently
      }
    };

    loadUserData();
    loadAnnouncements();
    loadWatchlistAlerts();
  }, []);

  // プラン権限の判定
  const canViewPerson = isAdmin || allowedPlan === "full" || allowedPlan === "employment";
  const canViewCredit = isAdmin || allowedPlan === "full" || allowedPlan === "credit";

  return (
    <RequireAuth>
      <div className="min-h-screen pt-16 sm:pt-20 md:pt-10 pb-16 px-3.5 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-32 gap-3">
            <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
            <p className="text-sm text-slate-600 font-medium">ダッシュボードを読み込み中...</p>
          </div>
        ) : (
          <div className="max-w-5xl w-full animate-fade-in relative z-10">

          {/* ヘッダーエリア */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-slate-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                ダッシュボード
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">
                ご利用のプランに応じた各種照会・登録メニューをご案内します。
              </p>
            </div>
          </div>

          {/* 取引先ウォッチ警告バナー（未払い発生時） */}
          {watchlistAlertCount > 0 && (
            <div className="mb-6 sm:mb-8 bg-red-50/90 border border-red-200/90 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-extrabold text-red-600 uppercase tracking-widest font-mono">
                      WATCHLIST ALERT
                    </span>
                    <span className="text-xs text-red-300">|</span>
                    <h3 className="text-sm font-bold text-red-950">
                      取引先ウォッチ: 監視中企業に未払いトラブルが発生しています（{watchlistAlertCount}社）
                    </h3>
                  </div>
                  <p className="text-xs text-red-800/90 leading-relaxed">
                    貴社がウォッチリストに登録している取引先企業について、他社から未払い・遅延の事故情報が報告されました。至急ご確認ください。
                  </p>
                </div>
              </div>
              <Link
                href="/credit/watchlist?filter=warning"
                className="btn-primary bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 shrink-0 flex items-center gap-1.5 font-bold whitespace-nowrap shadow-xs"
              >
                <span>対象企業を確認する</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* お知らせ・システム通知 */}
          {announcements.length > 0 && (
            <div className="mb-6 sm:mb-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
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
                  <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/40 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                      <span className="text-[11px] sm:text-xs text-slate-500 font-mono shrink-0">
                        {new Date(item.created_at).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
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

          {/* セクション 1: 👤 応募者照会・就業管理（大型コンテナ） */}
          {canViewPerson && (
            <div className="mb-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              {/* セクションヘッダー帯 */}
              <div className="px-4.5 py-4 sm:px-6 sm:py-4.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest font-mono">
                        MIERIS WORK
                      </span>
                      <span className="text-[10px] bg-slate-700/80 text-slate-200 px-2 py-0.5 rounded-full font-semibold border border-slate-600">
                        人物信用管理
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-white mt-0.5">
                      応募者照会・就業トラブル防止
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Link
                    href="/cases/new"
                    className="bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs px-3.5 py-2 rounded-lg font-bold border border-white/20 flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>＋ トラブル新規登録</span>
                  </Link>
                </div>
              </div>

              {/* 内部カードエリア */}
              <div className="p-4 sm:p-6 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                  {/* 応募者検索・照会 (主機能ハイライト) */}
                  <MenuCard
                    title="応募者 検索・照会"
                    description="氏名・カナ・生年月日等から過去のトラブルや問題行動の記録を照会します。"
                    badge="主機能"
                    isPrimary
                    actionText="照会画面を開く"
                    icon={<Search className="w-5 h-5 text-slate-900" />}
                    onClick={() => router.push("/search")}
                  />

                  {/* 登録データ一覧 */}
                  <MenuCard
                    title="登録データ一覧"
                    description="現在データベースに登録・共有されているトラブル人材の一覧を確認します。"
                    badge="一覧"
                    actionText="一覧を見る"
                    icon={<ClipboardList className="w-5 h-5 text-slate-700" />}
                    onClick={() => router.push("/cases")}
                  />

                  {/* 人物を新規登録 */}
                  <MenuCard
                    title="トラブル情報を新規登録"
                    description="就業トラブルを起こした従業員や応募者の事実を新規登録し、共有申請を行います。"
                    badge="登録申請"
                    actionText="登録フォームへ"
                    icon={<UserPlus className="w-5 h-5 text-slate-700" />}
                    onClick={() => router.push("/cases/new")}
                  />
                </div>
              </div>
            </div>
          )}

          {/* セクション 2: 🏢 企業信用管理（大型コンテナ） */}
          {canViewCredit && (
            <div className="mb-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              {/* セクションヘッダー帯 */}
              <div className="px-4.5 py-4 sm:px-6 sm:py-4.5 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-blue-200 uppercase tracking-widest font-mono">
                        MIERIS CREDIT
                      </span>
                      <span className="text-[10px] bg-blue-500/50 text-white px-2 py-0.5 rounded-full font-semibold border border-blue-400/40">
                        企業信用・未払い防止
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-white mt-0.5">
                      企業信用管理・取引先モニタリング
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Link
                    href="/credit/new"
                    className="bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs px-3.5 py-2 rounded-lg font-bold border border-white/20 flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>＋ 遅延・未払いを登録</span>
                  </Link>
                </div>
              </div>

              {/* 内部カードエリア */}
              <div className="p-4 sm:p-6 bg-slate-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                  {/* 企業信用照会 (主機能ハイライト) */}
                  <MenuCard
                    title="企業信用 検索・照会"
                    description="法人番号から未払い金額や過去の支払遅延記録を照会し、貸倒れを防ぎます。"
                    badge="法人照会"
                    isPrimary
                    theme="blue"
                    actionText="照会を実行"
                    icon={<Building2 className="w-5 h-5 text-blue-600" />}
                    onClick={() => router.push("/credit")}
                  />

                  {/* 取引先ウォッチ */}
                  <MenuCard
                    title="取引先ウォッチ"
                    description="主要取引先を登録して継続モニタリング。他社で未払いが発生した際に自動検知します。"
                    badge={watchlistAlertCount > 0 ? `${watchlistAlertCount}件警告` : "監視中"}
                    badgeVariant={watchlistAlertCount > 0 ? "danger" : "success"}
                    actionText="リストを確認"
                    icon={<BookmarkCheck className="w-5 h-5 text-blue-600" />}
                    onClick={() => router.push("/credit/watchlist")}
                  />

                  {/* 登録データ一覧 */}
                  <MenuCard
                    title="登録データ一覧"
                    description="現在データベースに登録・共有されている取引先企業の遅延・未払いデータの一覧を確認します。"
                    badge="一覧"
                    actionText="一覧を見る"
                    icon={<ClipboardList className="w-5 h-5 text-slate-700" />}
                    onClick={() => router.push("/credit/cases")}
                  />

                  {/* 遅延・未払いを新規登録 */}
                  <MenuCard
                    title="遅延・未払いを新規登録"
                    description="期日を過ぎても支払いがない取引先企業の事実を登録し、信用情報として共有申請します。"
                    badge="情報登録"
                    actionText="登録フォームへ"
                    icon={<FilePlus2 className="w-5 h-5 text-slate-700" />}
                    onClick={() => router.push("/credit/new")}
                  />
                </div>
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
  isPrimary = false,
  theme = "slate",
  badgeVariant = "default",
  actionText = "画面を開く",
}: {
  title: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  onClick: () => void;
  isPrimary?: boolean;
  theme?: "slate" | "blue";
  badgeVariant?: "default" | "success" | "danger";
  actionText?: string;
}) {
  const badgeClasses = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
    danger: "bg-red-50 text-red-700 border-red-200 animate-pulse font-extrabold",
  }[badgeVariant];

  const borderClasses = isPrimary
    ? theme === "blue"
      ? "border-2 border-blue-600/30 hover:border-blue-600 shadow-xs"
      : "border-2 border-slate-900/20 hover:border-slate-900 shadow-xs"
    : "border border-slate-200 hover:border-slate-300 shadow-2xs";

  return (
    <button
      onClick={onClick}
      className={`group text-left p-4.5 sm:p-5 rounded-xl bg-white hover:bg-slate-50/90 active:scale-[0.98] transition-all duration-150 flex flex-col justify-between h-full relative cursor-pointer hover:shadow-xs hover:-translate-y-0.5 ${borderClasses}`}
    >
      <div>
        <div className="flex items-start justify-between w-full mb-3">
          <div className="p-2 sm:p-2.5 rounded-lg bg-slate-100 text-slate-800 group-hover:bg-slate-200/80 transition-colors">
            {icon}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeClasses}`}>
            {badge}
          </span>
        </div>

        <h3 className="text-sm sm:text-base font-bold mb-1.5 flex items-center justify-between text-slate-900 group-hover:text-blue-600 transition-colors">
          <span>{title}</span>
        </h3>
        <p className="text-xs leading-relaxed text-slate-600">
          {description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-blue-600 transition-colors w-full">
        <span>{actionText}</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
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
      className="group text-left p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] transition-all flex items-center justify-between shadow-2xs cursor-pointer"
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
