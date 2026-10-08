"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/profile");
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
            <div className="flex flex-col items-center gap-3">
                <div className="animate-spin h-8 w-8 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                <p className="text-xs text-slate-500 font-medium">アカウント設定へ移動中...</p>
            </div>
        </div>
    );
}
