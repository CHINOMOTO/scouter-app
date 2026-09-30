"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
    const pathname = usePathname() || "";

    // デモページでは共通フッターを表示しない（デモページ専用フッターがあるため）
    if (pathname === "/demo") {
        return null;
    }

    return (
        <footer className="relative z-10 py-10 text-center text-slate-500 text-xs border-t border-slate-200 bg-white mt-16">
            <div className="max-w-7xl mx-auto px-4 space-y-2">
                <p className="font-bold text-slate-700">MIERIS - 雑工・荷揚げ・警備・運送 就業情報共有システム</p>
                <p className="text-slate-500">運営: 株式会社ミヤエモン / 開発: 株式会社宇井建設</p>
                <p className="text-slate-600 font-mono text-[11px]">&copy; 2026 MIERIS. ALL RIGHTS RESERVED.</p>
            </div>
        </footer>
    );
}
