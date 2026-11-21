"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

export default function PendingApprovalPage() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let mounted = true;
        const checkStatus = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    router.replace("/");
                    return;
                }
                const { data: appUser } = await supabase
                    .from("app_users")
                    .select("is_approved")
                    .eq("id", session.user.id)
                    .maybeSingle();

                if (appUser?.is_approved === true) {
                    router.replace("/dashboard");
                    return;
                }
            } finally {
                if (mounted) setChecking(false);
            }
        };
        checkStatus();
        return () => {
            mounted = false;
        };
    }, [router]);

    const handleLogout = async () => {
        try {
            for (const storage of [window.localStorage, window.sessionStorage]) {
                const keysToRemove: string[] = [];
                for (let i = 0; i < storage.length; i++) {
                    const k = storage.key(i);
                    if (k && (k.startsWith("sb-") || k.includes("supabase") || k.includes("auth-token"))) {
                        keysToRemove.push(k);
                    }
                }
                keysToRemove.forEach((k) => storage.removeItem(k));
            }
            await Promise.race([
                supabase.auth.signOut({ scope: "local" }),
                new Promise((resolve) => setTimeout(resolve, 1000)),
            ]);
        } catch (e) {
            console.error("Logout error:", e);
        } finally {
            window.location.replace("/");
        }
    };

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
                <div className="animate-spin h-8 w-8 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc]">
            <div className="relative w-full max-w-lg bg-white rounded-2xl p-8 sm:p-10 text-center animate-fade-in border border-slate-200 shadow-sm">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-200">
                    <Clock className="w-8 h-8" />
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
                    現在ご利用いただけません
                </h1>

                <p className="text-slate-600 text-sm mb-7 leading-relaxed">
                    このアカウントは現在、運営管理者による承認待ち、または一時利用停止の状態です。<br />
                    利用再開・承認状況につきましては運営事務局までお問い合わせください。
                </p>

                <div className="bg-slate-50 rounded-xl p-5 text-left mb-7 border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 mb-2.5 tracking-wider">今後のご案内</h3>
                    <ul className="text-xs sm:text-sm text-slate-600 space-y-2 list-disc list-inside leading-relaxed">
                        <li>新規発行・承認待ちの場合は、運営事務局にて所属情報・契約内容を確認しています</li>
                        <li>利用停止中の場合は、解除手続き完了後に再度ログインが可能となります</li>
                        <li>ご不明な点は運営事務局（mieris0610@uiken.jp）までご連絡ください</li>
                    </ul>
                </div>

                <button
                    onClick={handleLogout}
                    className="btn-secondary w-full py-3 font-bold text-sm"
                >
                    ログアウトしてトップへ戻る
                </button>
            </div>
        </div>
    );
}
