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
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Megaphone,
  Globe
} from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

type PartnerCompanyPR = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  websiteUrl: string;
  location?: string;
  logoColor?: string;
  logoSvg?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowedPlan, setAllowedPlan] = useState<string>("full");
  const [companyName, setCompanyName] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [watchlistAlertCount, setWatchlistAlertCount] = useState<number>(0);
  const [partnerCompanies, setPartnerCompanies] = useState<PartnerCompanyPR[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // お知らせモーダル用 state
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showAllAnnouncementsModal, setShowAllAnnouncementsModal] = useState(false);

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

    const loadPartnerCompanies = async () => {
      try {
        const dummyPartners: PartnerCompanyPR[] = [
          {
            id: "p-1",
            name: "大和総合建設",
            category: "総合建設・ゼネコン",
            tagline: "安心安全の現場品質と先端施工技術",
            websiteUrl: "https://example.com/yamato",
            logoSvg: "yamato"
          },
          {
            id: "p-2",
            name: "日本キャタピラー",
            category: "重機・建設機械",
            tagline: "現場を支える強靭なマシンとサポート",
            websiteUrl: "https://example.com/cat",
            logoSvg: "cat"
          },
          {
            id: "p-3",
            name: "TOTO 工営",
            category: "住宅設備・衛生機器",
            tagline: "快適な水まわり空間と確かな施工技術",
            websiteUrl: "https://example.com/toto",
            logoSvg: "toto"
          },
          {
            id: "p-4",
            name: "TOYOTA L&F",
            category: "物流システム・フォークリフト",
            tagline: "物流現場の安全と最適な自動化ソリューション",
            websiteUrl: "https://example.com/toyota",
            logoSvg: "toyota"
          },
          {
            id: "p-5",
            name: "日総エンジニアリング",
            category: "施工管理・技術者派遣",
            tagline: "プロフェッショナルな現場管理スタッフの派遣",
            websiteUrl: "https://example.com/nisso",
            logoSvg: "mitsubishi"
          },
          {
            id: "p-6",
            name: "東日本ロジネット",
            category: "幹線輸送・重量物運送",
            tagline: "迅速・確実な全国配送ネットワークを展開",
            websiteUrl: "https://example.com/sompo",
            logoSvg: "sompo"
          },
          {
            id: "p-7",
            name: "テレ東メディアワークス",
            category: "映像音響・PR広報",
            tagline: "企業の魅力を発信する先端コンテンツ制作",
            websiteUrl: "https://example.com/tvtokyo",
            logoSvg: "tvtokyo"
          },
          {
            id: "p-8",
            name: "野村建設不動産",
            category: "都市開発・不動産管理",
            tagline: "豊かな都市空間の創造と不動産総合管理",
            websiteUrl: "https://example.com/nomura",
            logoSvg: "nomura"
          }
        ];

        const { data } = await supabase
          .from("companies")
          .select("id, name, corporate_number")
          .order("created_at", { ascending: false })
          .limit(8);

        if (data && data.length > 0) {
          const formatted: PartnerCompanyPR[] = data.map((c, idx) => ({
            id: c.id,
            name: c.name,
            category: dummyPartners[idx % dummyPartners.length].category,
            tagline: dummyPartners[idx % dummyPartners.length].tagline,
            websiteUrl: "https://www.google.com/search?q=" + encodeURIComponent(c.name),
            logoSvg: dummyPartners[idx % dummyPartners.length].logoSvg
          }));
          setPartnerCompanies(formatted.concat(dummyPartners.slice(formatted.length)));
        } else {
          setPartnerCompanies(dummyPartners);
        }
      } catch (err) {
        console.error("Partner companies fetch error:", err);
      }
    };

    loadUserData();
    loadAnnouncements();
    loadWatchlistAlerts();
    loadPartnerCompanies();
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

          {/* 画面上部: 提携・契約企業ロゴスライダー（ユーザー画像仕様: 白背景・本物感のあるコーポレートロゴ） */}
          <div className="mb-6 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* 上部ヘッダー帯 */}
            <div className="px-4 py-2 border-b border-slate-100 bg-white flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                <span className="font-extrabold text-[10px] sm:text-[11px] text-slate-800 tracking-wider font-mono">
                  PARTNER COMPANIES
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600 font-medium text-[11px]">参画・利用企業一覧</span>
              </div>
              <Link 
                href="/contact?category=feature" 
                className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 transition-colors shrink-0"
              >
                <span>掲載について</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>

            {/* 白背景で流れるロゴトラック */}
            <div className="py-3 bg-white overflow-hidden relative group">
              {/* 左右のフェードグラデーション */}
              <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

              <div className="animate-marquee flex items-center gap-3 sm:gap-4 pl-4">
                {[...partnerCompanies, ...partnerCompanies].map((comp, idx) => (
                  <a
                    key={`${comp.id}-${idx}`}
                    href={comp.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 sm:h-14 px-4 sm:px-6 rounded-lg bg-white border border-slate-200/90 hover:border-slate-400 hover:shadow-xs transition-all shrink-0 flex items-center justify-center group/item cursor-pointer"
                    title={`${comp.name} (${comp.category})`}
                  >
                    {/* SVG / タイポグラフィ ロゴレンダリング */}
                    {comp.logoSvg === "toto" ? (
                      <div className="flex items-center tracking-tighter font-black text-xl sm:text-2xl text-[#004098] font-sans select-none">
                        TOTO
                      </div>
                    ) : comp.logoSvg === "cat" ? (
                      <div className="flex items-center bg-[#FFCD11] text-black px-2.5 py-1 rounded-sm gap-1.5 select-none font-black text-xs sm:text-sm">
                        <span className="text-[11px] sm:text-xs tracking-tight">日本キャタピラー</span>
                        <span className="bg-black text-[#FFCD11] px-1 py-0.2 text-[10px] font-black rounded-xs tracking-widest">CAT</span>
                      </div>
                    ) : comp.logoSvg === "toyota" ? (
                      <div className="flex items-center tracking-wider font-extrabold text-base sm:text-lg text-[#EB0A1E] font-sans select-none">
                        TOYOTA
                      </div>
                    ) : comp.logoSvg === "mitsubishi" ? (
                      <div className="flex items-center gap-1.5 select-none">
                        {/* スリーダイヤマーク */}
                        <div className="w-4 h-4 relative flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 bg-[#E60012] rotate-45 transform mb-2" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight leading-none">MITSUBISHI</span>
                          <span className="text-[7px] text-slate-500 italic scale-90 -ml-1">Changes for the Better</span>
                        </div>
                      </div>
                    ) : comp.logoSvg === "sompo" ? (
                      <div className="flex items-center gap-1.5 select-none">
                        <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-[#981424] to-[#C8102E] border border-[#780e1a] shrink-0" />
                        <span className="text-[11px] sm:text-xs font-bold text-slate-900 tracking-tight">
                          SOMPOホールディングス
                        </span>
                      </div>
                    ) : comp.logoSvg === "tvtokyo" ? (
                      <div className="flex items-center font-black select-none text-base sm:text-lg">
                        <span className="text-[#E6002D] font-extrabold mr-0.5">テレ</span>
                        <span className="text-[#002B7F] font-black tracking-tight">東</span>
                      </div>
                    ) : comp.logoSvg === "yamato" ? (
                      <div className="flex items-center gap-1.5 select-none">
                        <div className="w-5 h-5 rounded-sm bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                          大
                        </div>
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
                          大和総合建設
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 select-none">
                        <div className="w-5 h-5 rounded-sm bg-[#0f2d59] text-white font-black text-[10px] flex items-center justify-center">
                          野
                        </div>
                        <span className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                          野村建設不動産
                        </span>
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>

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

          {/* お知らせ・ニュース（最新の1件を表示） */}
          {announcements.length > 0 && (
            <div className="mb-6 sm:mb-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 text-xs animate-fade-in">
              <div 
                className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 cursor-pointer group"
                onClick={() => setSelectedAnnouncement(announcements[0])}
                title="クリックしてお知らせ全文を表示"
              >
                <div className="flex items-center gap-2 shrink-0">
                  <div className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-extrabold text-[10px] sm:text-[11px] text-blue-700 uppercase tracking-widest font-mono">
                    NEWS
                  </span>
                  <span className="text-slate-300 hidden sm:inline">|</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {new Date(announcements[0].created_at).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </span>
                <span className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                  {announcements[0].title}
                </span>
                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 shrink-0 hidden md:inline group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  詳細を見る
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAllAnnouncementsModal(true)}
                  className="text-[10px] sm:text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 transition-colors whitespace-nowrap"
                >
                  一覧
                </button>
                {isAdmin && (
                  <Link
                    href="/admin/announcements"
                    className="text-[10px] sm:text-[11px] font-bold text-slate-500 hover:text-slate-900 hidden lg:inline whitespace-nowrap"
                  >
                    管理 →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* セクション 1: 👤 応募者照会・就業管理（大型コンテナ） */}
          {canViewPerson && (
            <div className="mb-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              {/* セクションヘッダー帯 (単色フラット) */}
              <div className="px-4.5 py-4 sm:px-6 sm:py-4.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest font-mono">
                        MIERIS WORK
                      </span>
                      <span className="text-[10px] bg-slate-700 text-slate-200 px-2 py-0.5 rounded-full font-semibold border border-slate-600">
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
                  {/* 応募者検索・照会 */}
                  <MenuCard
                    title="応募者 検索・照会"
                    description="氏名・カナ・生年月日等から過去のトラブルや問題行動の記録を照会します。"
                    badge="照会"
                    actionText="照会画面を開く"
                    icon={<Search className="w-5 h-5 text-slate-700" />}
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
              {/* セクションヘッダー帯 (ネイビー) */}
              <div className="px-4.5 py-4 sm:px-6 sm:py-4.5 bg-blue-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-blue-200 uppercase tracking-widest font-mono">
                        MIERIS CREDIT
                      </span>
                      <span className="text-[10px] bg-blue-800 text-blue-100 px-2 py-0.5 rounded-full font-semibold border border-blue-700/60">
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
                  {/* 企業信用照会 */}
                  <MenuCard
                    title="企業信用 検索・照会"
                    description="法人番号から未払い金額や過去の支払遅延記録を照会し、貸倒れを防ぎます。"
                    badge="信用照会"
                    theme="blue"
                    actionText="照会を実行"
                    icon={<Building2 className="w-5 h-5 text-slate-700" />}
                    onClick={() => router.push("/credit")}
                  />

                  {/* 取引先ウォッチ */}
                  <MenuCard
                    title="取引先ウォッチ"
                    description="主要取引先を登録して継続モニタリング。他社で未払いが発生した際に自動検知します。"
                    badge={watchlistAlertCount > 0 ? `${watchlistAlertCount}件警告` : "監視中"}
                    badgeVariant={watchlistAlertCount > 0 ? "danger" : "default"}
                    theme="blue"
                    actionText="リストを確認"
                    icon={<BookmarkCheck className="w-5 h-5 text-slate-700" />}
                    onClick={() => router.push("/credit/watchlist")}
                  />

                  {/* 登録データ一覧 */}
                  <MenuCard
                    title="登録データ一覧"
                    description="現在データベースに登録・共有されている取引先企業の遅延・未払いデータの一覧を確認します。"
                    badge="一覧"
                    theme="blue"
                    actionText="一覧を見る"
                    icon={<ClipboardList className="w-5 h-5 text-slate-700" />}
                    onClick={() => router.push("/credit/cases")}
                  />

                  {/* 遅延・未払いを新規登録 */}
                  <MenuCard
                    title="遅延・未払いを新規登録"
                    description="期日を過ぎても支払いがない取引先企業の事実を登録し、信用情報として共有申請します。"
                    badge="情報登録"
                    theme="blue"
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



          {/* セクション 4: システム設定 & サポート */}
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

          {/* お知らせ詳細モーダル */}
          {selectedAnnouncement && (
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
              onClick={() => setSelectedAnnouncement(null)}
            >
              <div 
                className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scale-up"
                onClick={(e) => e.stopPropagation()}
              >
                {/* モーダルヘッダー */}
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      お知らせ・システム通知
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAnnouncement(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* モーダル本文 */}
                <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 border border-slate-200">
                      {new Date(selectedAnnouncement.created_at).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {selectedAnnouncement.title}
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    {selectedAnnouncement.content}
                  </div>
                </div>

                {/* モーダルフッター */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedAnnouncement(null)}
                    className="btn-secondary text-xs px-4 py-2 rounded-xl font-bold"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* お知らせ全件一覧モーダル */}
          {showAllAnnouncementsModal && (
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
              onClick={() => setShowAllAnnouncementsModal(false)}
            >
              <div 
                className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scale-up"
                onClick={(e) => e.stopPropagation()}
              >
                {/* モーダルヘッダー */}
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      お知らせ・システム通知一覧（全{announcements.length}件）
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllAnnouncementsModal(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* お知らせ一覧 */}
                <div className="divide-y divide-slate-100 max-h-[65vh] overflow-y-auto">
                  {announcements.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => {
                        setShowAllAnnouncementsModal(false);
                        setSelectedAnnouncement(item);
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(item.created_at).toLocaleDateString("ja-JP", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  ))}
                </div>

                {/* モーダルフッター */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  {isAdmin ? (
                    <Link
                      href="/admin/announcements"
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      お知らせ管理画面を開く →
                    </Link>
                  ) : <span />}
                  <button
                    type="button"
                    onClick={() => setShowAllAnnouncementsModal(false)}
                    className="btn-secondary text-xs px-4 py-2 rounded-xl font-bold"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          )}

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
  theme = "slate",
  badgeVariant = "default",
  actionText = "画面を開く",
}: {
  title: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  onClick: () => void;
  theme?: "slate" | "blue";
  badgeVariant?: "default" | "success" | "danger";
  actionText?: string;
}) {
  const badgeClasses = {
    default: "bg-slate-100 text-slate-600 border-slate-200",
    success: "bg-slate-100 text-slate-600 border-slate-200",
    danger: "bg-red-50 text-red-700 border-red-200 animate-pulse font-extrabold",
  }[badgeVariant];

  const hoverBorderClass = theme === "blue" 
    ? "hover:border-blue-400 hover:shadow-xs" 
    : "hover:border-slate-400 hover:shadow-xs";

  const hoverIconClass = theme === "blue"
    ? "group-hover:bg-blue-50 group-hover:text-blue-700"
    : "group-hover:bg-slate-200 group-hover:text-slate-900";

  const hoverTextClass = theme === "blue"
    ? "group-hover:text-blue-700"
    : "group-hover:text-slate-900";

  return (
    <button
      onClick={onClick}
      className={`group text-left p-4.5 sm:p-5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50/80 active:scale-[0.98] transition-all duration-150 flex flex-col justify-between h-full relative cursor-pointer hover:-translate-y-0.5 ${hoverBorderClass}`}
    >
      <div>
        <div className="flex items-start justify-between w-full mb-3">
          <div className={`p-2 sm:p-2.5 rounded-lg bg-slate-100 text-slate-700 transition-colors ${hoverIconClass}`}>
            {icon}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors ${badgeClasses}`}>
            {badge}
          </span>
        </div>

        <h3 className={`text-sm sm:text-base font-bold mb-1.5 flex items-center justify-between text-slate-900 transition-colors ${hoverTextClass}`}>
          <span>{title}</span>
        </h3>
        <p className="text-xs leading-relaxed text-slate-600">
          {description}
        </p>
      </div>

      <div className={`mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 transition-colors w-full ${hoverTextClass}`}>
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
