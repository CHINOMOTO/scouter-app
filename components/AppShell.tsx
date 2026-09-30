"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || "";
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoading(false);
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    // サイドバーを表示しない公開ページ判定
    const isPublicPage = 
        pathname === "/" || 
        pathname === "/signup" || 
        pathname === "/login" || 
        pathname === "/demo" || 
        pathname === "/forgot-password" || 
        pathname === "/update-password" || 
        pathname === "/pending-approval";

    const showSidebar = !isPublicPage && !!session;

    if (!showSidebar) {
        // 通常の全幅表示（ログイン画面、デモページ等）
        return (
            <div className="min-h-screen flex flex-col">
                <main className="relative z-10 flex-grow">{children}</main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* 左サイドバー ＆ モバイルヘッダー */}
            <Navigation />

            {/* 右メインコンテンツエリア（サイドバー分インデント） */}
            <div className="flex-1 flex flex-col min-w-0 md:pl-64">
                <main className="relative z-10 flex-grow">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
}
