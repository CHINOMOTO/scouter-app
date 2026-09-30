"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
    LayoutDashboard, 
    Users, 
    Building2, 
    HelpCircle, 
    ShieldCheck, 
    User, 
    LogOut, 
    Menu, 
    X,
    ChevronRight,
    ExternalLink
} from "lucide-react";

export default function Navigation() {
    const pathname = usePathname() || "";
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [notificationCount, setNotificationCount] = useState(0);
    const [allowedPlan, setAllowedPlan] = useState<string>("full");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // 画面遷移時にモバイルメニューを閉じる
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        const fetchNotifications = async (userId: string) => {
            const { count: userCount } = await supabase
                .from("app_users")
                .select("*", { count: "exact", head: true })
                .eq("is_approved", false);
            const { count: caseCount } = await supabase
                .from("blacklist_cases")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending");
            setNotificationCount((userCount || 0) + (caseCount || 0));
        };

        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);

            if (session?.user) {
                const role = session.user.app_metadata?.role;
                const isUserAdmin = role === 'admin';
                setIsAdmin(isUserAdmin);

                if (isUserAdmin) {
                    fetchNotifications(session.user.id);
                }
            } else {
                setIsAdmin(false);
                setUserName(null);
                setCompanyName(null);
                setNotificationCount(0);
            }
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            if (event === 'SIGNED_OUT') {
                setIsAdmin(false);
                setUserName(null);
                setCompanyName(null);
                setSession(null);
                setNotificationCount(0);
                return;
            }

            if (session?.user) {
                const role = session.user.app_metadata?.role;
                const isUserAdmin = role === 'admin';
                setIsAdmin(isUserAdmin);

                if (isUserAdmin) {
                    fetchNotifications(session.user.id);
                }
            } else {
                setIsAdmin(false);
                setUserName(null);
                setCompanyName(null);
                setNotificationCount(0);
            }
        });

        return () => subscription.unsubscribe();
    }, [pathname]);

    // 会社名+登録名および契約プランを取得する
    useEffect(() => {
        if (!session?.user?.id) return;
        let cancelled = false;

        const fetchUserProfile = async () => {
            try {
                const { data: appUser } = await supabase
                    .from("app_users")
                    .select("display_name, company_id, allowed_plan")
                    .eq("id", session.user.id)
                    .maybeSingle();
                if (cancelled || !appUser) return;

                if (appUser.allowed_plan) {
                    setAllowedPlan(appUser.allowed_plan);
                }

                const displayName = (appUser.display_name as string) || "User";
                setUserName(displayName);

                if (appUser.company_id) {
                    const { data: company } = await supabase
                        .from("companies")
                        .select("name")
                        .eq("id", appUser.company_id)
                        .maybeSingle();
                    if (cancelled) return;
                    if (company?.name) {
                        setCompanyName(company.name);
                    }
                }
            } catch {
                // エラー時は何もしない
            }
        };

        fetchUserProfile();
        return () => { cancelled = true; };
    }, [session?.user?.id]);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            setSession(null);
            setIsAdmin(false);
            setUserName(null);
            setCompanyName(null);
            window.location.href = "/";
        }
    };

    // ログイン・サインアップ・デモ等の公開ページでは非表示
    const isPublicPage = 
        pathname === "/" || 
        pathname === "/signup" || 
        pathname === "/login" || 
        pathname === "/demo" || 
        pathname === "/forgot-password" || 
        pathname === "/update-password" || 
        pathname === "/pending-approval";

    if (isPublicPage || !session) return null;

    // プラン別の権限判定
    const canViewPerson = isAdmin || allowedPlan === "full" || allowedPlan === "employment";
    const canViewCredit = isAdmin || allowedPlan === "full" || allowedPlan === "credit";

    // プラン名表示
    const getPlanLabel = () => {
        if (isAdmin) return "管理者";
        if (allowedPlan === "full") return "両方セット";
        if (allowedPlan === "employment") return "応募者照会";
        if (allowedPlan === "credit") return "企業信用";
        return "スタンダード";
    };

    return (
        <>
            {/* モバイル用トップバー (md未満で表示) */}
            <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 z-30 px-4 flex items-center justify-between shadow-2xs">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <img src="/logo-mark.png" alt="MIERIS" className="w-7 h-7 object-contain" />
                    <span className="font-extrabold text-base text-slate-900 tracking-wider">MIERIS</span>
                </Link>

                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none"
                    aria-label="メニューを開く"
                >
                    <Menu className="w-5 h-5" />
                    {notificationCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse ring-2 ring-white" />
                    )}
                </button>
            </div>

            {/* モバイル用背景オーバーレイ */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden animate-fade-in transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* 左サイドバー本体 (デスクトップは左固定常時表示、モバイルはスライドイン) */}
            <aside 
                className={`fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 shadow-xs md:shadow-none ${
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                {/* 1. ブランドヘッダー */}
                <div className="h-16 px-5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
                    <Link href="/dashboard" className="flex items-center gap-2.5 group">
                        <img src="/logo-mark.png" alt="MIERIS" className="w-8 h-8 object-contain" />
                        <div className="flex flex-col">
                            <span className="font-extrabold text-lg text-slate-900 tracking-wider leading-none group-hover:text-blue-600 transition-colors">
                                MIERIS
                            </span>
                            <span className="text-[9px] text-slate-500 tracking-widest leading-none mt-0.5 font-bold">
                                ミエリス
                            </span>
                        </div>
                    </Link>

                    {/* モバイル用 閉じるボタン */}
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        aria-label="メニューを閉じる"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 2. 会社・プラン情報バッジ */}
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 shrink-0">
                    <div className="text-[11px] font-bold text-slate-800 truncate" title={companyName || "所属企業"}>
                        {companyName || "所属企業"}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                            {getPlanLabel()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">利用中</span>
                    </div>
                </div>

                {/* 3. ナビゲーションメニュー一覧 */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                    {/* メインメニュー */}
                    <div>
                        <div className="px-3 mb-2 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase font-mono">
                            業務メニュー
                        </div>
                        <nav className="space-y-1">
                            {/* ダッシュボード */}
                            <SidebarLink 
                                href="/dashboard" 
                                active={pathname === "/dashboard"}
                                icon={<LayoutDashboard className="w-4 h-4" />}
                                label="ダッシュボード"
                            />

                            {/* 応募者照会 */}
                            {canViewPerson && (
                                <SidebarLink 
                                    href="/search" 
                                    active={pathname.startsWith("/search") || pathname.startsWith("/cases")}
                                    icon={<Users className="w-4 h-4" />}
                                    label="応募者照会"
                                />
                            )}

                            {/* 企業信用照会 */}
                            {canViewCredit && (
                                <SidebarLink 
                                    href="/credit" 
                                    active={pathname.startsWith("/credit")}
                                    icon={<Building2 className="w-4 h-4" />}
                                    label="企業信用照会"
                                />
                            )}

                            {/* お問い合わせ */}
                            <SidebarLink 
                                href="/contact" 
                                active={pathname === "/contact"}
                                icon={<HelpCircle className="w-4 h-4" />}
                                label="お問い合わせ"
                            />
                        </nav>
                    </div>

                    {/* 管理者メニュー（管理者のみ） */}
                    {isAdmin && (
                        <div>
                            <div className="px-3 mb-2 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase font-mono flex items-center justify-between">
                                <span>システム管理</span>
                                {notificationCount > 0 && (
                                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                                        {notificationCount}
                                    </span>
                                )}
                            </div>
                            <nav className="space-y-1">
                                <SidebarLink 
                                    href="/admin" 
                                    active={pathname.startsWith("/admin")}
                                    icon={<ShieldCheck className="w-4 h-4" />}
                                    label="管理メニュー"
                                    badge={notificationCount > 0 ? `${notificationCount}件` : undefined}
                                    isSpecial
                                />
                            </nav>
                        </div>
                    )}
                </div>

                {/* 4. フッターエリア（ユーザー情報・ログアウト） */}
                <div className="p-3 border-t border-slate-200/80 bg-slate-50/70 shrink-0 space-y-2">
                    {/* プロフィールへのリンクカード */}
                    <Link
                        href="/profile"
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200/80 transition-all group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                            <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-900 truncate">
                                {userName || "ユーザー"}
                            </span>
                            <span className="text-[10px] text-slate-500 truncate">
                                設定・登録情報
                            </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>

                    {/* ログアウトボタン */}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50/80 rounded-lg transition-colors text-left"
                    >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span>ログアウト</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

function SidebarLink({ 
    href, 
    active, 
    icon, 
    label, 
    badge,
    isSpecial 
}: { 
    href: string; 
    active: boolean; 
    icon: React.ReactNode; 
    label: string; 
    badge?: string;
    isSpecial?: boolean;
}) {
    return (
        <Link
            href={href}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                active 
                    ? "bg-slate-900 text-white shadow-xs" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <span className={`shrink-0 ${active ? "text-white" : isSpecial ? "text-blue-600" : "text-slate-500"}`}>
                    {icon}
                </span>
                <span className="truncate">{label}</span>
            </div>

            {badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold tabular-nums shrink-0 ${
                    active ? "bg-white/20 text-white" : "bg-red-500 text-white animate-pulse"
                }`}>
                    {badge}
                </span>
            )}
        </Link>
    );
}
