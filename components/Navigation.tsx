"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Navigation() {
    const pathname = usePathname() || "";
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);
    const [notificationCount, setNotificationCount] = useState(0);

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
                setNotificationCount(0);
            }
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            if (event === 'SIGNED_OUT') {
                setIsAdmin(false);
                setUserName(null);
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
                setNotificationCount(0);
            }
        });

        return () => subscription.unsubscribe();
    }, [pathname]); // pathnameが変わるたびにも再チェック（通知数更新のため）

    // 会社名+登録名を取得する（認証フローとは独立、ユーザーIDが変わった時だけ実行）
    useEffect(() => {
        if (!session?.user?.id) return;
        let cancelled = false;

        const fetchDisplayName = async () => {
            try {
                const { data: appUser } = await supabase
                    .from("app_users")
                    .select("display_name, company_id")
                    .eq("id", session.user.id)
                    .maybeSingle();
                if (cancelled || !appUser) return;
                const displayName = (appUser.display_name as string) || "User";
                if (!appUser.company_id) {
                    setUserName(displayName);
                    return;
                }
                const { data: company } = await supabase
                    .from("companies")
                    .select("name")
                    .eq("id", appUser.company_id)
                    .maybeSingle();
                if (cancelled) return;
                const companyName = (company as { name: string } | null)?.name;
                setUserName(companyName ? `${companyName} ${displayName}` : displayName);
            } catch {
                // エラーが起きても何もしない（既存のdisplay_nameが表示される）
            }
        };

        fetchDisplayName();
        return () => { cancelled = true; };
    }, [session?.user?.id]); // ユーザーIDが変わった時のみ実行

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            // ステートをクリア
            setSession(null);
            setIsAdmin(false);
            setUserName(null);

            // 確実にログイン画面へ遷移させる（ハードリダイレクト推奨）
            // Router.pushだとステート残存の可能性があるため
            window.location.href = "/";
        }
    };

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // ログイン・サインアップページではナビゲーションバーを表示しない（セッションがあっても非表示）
    if (pathname === "/" || pathname === "/signup" || pathname === "/login") return null;

    // セッションがない場合は表示しない
    if (!session) return null;

    return (
        <nav className="fixed top-0 w-full z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center justify-between w-full md:w-auto">
                        <Link href={session ? "/dashboard" : "/"} className="flex-shrink-0 flex items-center gap-2 font-bold text-xl text-[#00e5ff] group tracking-widest uppercase orbitron" onClick={() => setIsMobileMenuOpen(false)}>
                            <span className="text-2xl group-hover:rotate-45 transition-transform duration-300">⌖</span>
                            <span className="-[0_0_5px_rgba(0,255,65,0.8)]">SCOUTER</span>
                        </Link>

                        {/* Mobile menu button */}
                        {session && (
                            <div className="flex md:hidden">
                                <button
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                    className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
                                >
                                    <span className="sr-only">Open main menu</span>
                                    {isMobileMenuOpen ? (
                                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    ) : (
                                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {session && (
                        <div className="hidden md:block">
                            <div className="ml-6 flex items-baseline space-x-1">
                                <NavLink href="/dashboard" active={pathname === "/dashboard"}>
                                    ダッシュボード
                                </NavLink>
                                <NavLink href="/search" active={pathname === "/search"}>
                                    検索
                                </NavLink>
                                <NavLink href="/cases" active={pathname.startsWith("/cases") && pathname !== "/cases/new"}>
                                    登録データ一覧
                                </NavLink>
                                <NavLink href="/cases/new" active={pathname === "/cases/new"}>
                                    新規登録
                                </NavLink>
                                <NavLink href="/contact" active={pathname === "/contact"}>
                                    お問い合わせ
                                </NavLink>
                                {isAdmin && (
                                    <div className="relative inline-block">
                                        <Link
                                            href="/admin"
                                            className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all uppercase tracking-wider whitespace-nowrap ${pathname.startsWith("/admin") ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"}`}
                                        >
                                            管理メニュー
                                        </Link>
                                        {notificationCount > 0 && (
                                            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse ring-2 ring-black">
                                                {notificationCount}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="hidden md:block">
                        <div className="ml-4 flex items-center md:ml-6 gap-4">
                            {session && userName && (
                                <Link
                                    href="/profile"
                                    className="text-xs text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 tracking-wide hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer whitespace-nowrap max-w-[200px] truncate font-semibold"
                                >
                                    <span className="font-bold">{userName}</span>
                                </Link>
                            )}
                            {session && (
                                <button
                                    onClick={handleLogout}
                                    className="text-slate-500 hover:text-red-600 text-xs px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-100 transition-all tracking-wide font-medium"
                                >
                                    ログアウト
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {session && isMobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl animate-fade-in shadow-lg">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {userName && (
                            <Link
                                href="/profile"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block px-3 py-2 text-xs font-mono tracking-wider text-[#00e5ff]/60 border-b border-slate-700/30 mb-2 hover:bg-[#00e5ff]/10 transition-colors"
                            >
                                LOGGED IN AS: <span className="text-[#00e5ff] font-bold ml-2">{userName}</span>
                            </Link>
                        )}
                        <MobileNavLink href="/dashboard" active={pathname === "/dashboard"} onClick={() => setIsMobileMenuOpen(false)}>
                            ダッシュボード
                        </MobileNavLink>
                        <MobileNavLink href="/search" active={pathname === "/search"} onClick={() => setIsMobileMenuOpen(false)}>
                            検索
                        </MobileNavLink>
                        <MobileNavLink href="/cases" active={pathname.startsWith("/cases") && pathname !== "/cases/new"} onClick={() => setIsMobileMenuOpen(false)}>
                            登録データ一覧
                        </MobileNavLink>
                        <MobileNavLink href="/cases/new" active={pathname === "/cases/new"} onClick={() => setIsMobileMenuOpen(false)}>
                            新規登録
                        </MobileNavLink>
                        <MobileNavLink href="/contact" active={pathname === "/contact"} onClick={() => setIsMobileMenuOpen(false)}>
                            お問い合わせ
                        </MobileNavLink>
                        {isAdmin && (
                            <MobileNavLink href="/admin" active={pathname.startsWith("/admin")} onClick={() => setIsMobileMenuOpen(false)} isSpecial>
                                管理メニュー {notificationCount > 0 && `(${notificationCount})`}
                            </MobileNavLink>
                        )}
                        <button
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                handleLogout();
                            }}
                            className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 mt-4 border-t border-red-500/20 pt-4"
                        >
                            ログアウト
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}

function NavLink({ href, children, active }: { href: string, children: React.ReactNode, active: boolean }) {
    return (
        <Link
            href={href}
            className={`px-3 py-2 rounded-none text-sm font-bold tracking-wider transition-all duration-200 border-b-2 whitespace-nowrap ${active ? "border-[#00e5ff] text-[#00e5ff] bg-[#00e5ff]/10 shadow-[0_0_8px_rgba(0,255,65,0.2)]" : "border-transparent text-[#00e5ff]/60 hover:text-[#00e5ff] hover:bg-[#00e5ff]/5" }`}
        >
            {children}
        </Link>
    )
}

function MobileNavLink({ href, children, active, onClick, isSpecial }: { href: string, children: React.ReactNode, active: boolean, onClick: () => void, isSpecial?: boolean }) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${active ? "bg-[#00e5ff]/20 text-[#00e5ff]" : "text-slate-300 hover:bg-[#00e5ff]/10 hover:text-[#00e5ff]" } ${isSpecial ? "border border-slate-700/30 text-[#00e5ff]" : ""}`}
        >
            {children}
        </Link>
    );
}
