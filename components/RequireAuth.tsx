"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { AlertCircle } from "lucide-react";

type RequireAuthProps = {
    children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [checking, setChecking] = useState(true);
    const [isAuthed, setIsAuthed] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const [statusMessage, setStatusMessage] = useState("認証初期化中...");

    useEffect(() => {
        let mounted = true;
        let timer: NodeJS.Timeout;

        setStatusMessage("認証イベントリスナーを登録中...");

        // タイムアウト監視（DBアクセスしないので短めでOKだが念のため）
        timer = setTimeout(() => {
            if (mounted && checking) {
                console.error("RequireAuth: Timeout detected.");
                setAuthError("認証確認がタイムアウトしました。");
                setChecking(false);
            }
        }, 10000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            console.log(`RequireAuth: Auth Event fired: ${event}`);
            setStatusMessage(`認証イベント受信: ${event}`);

            if (event === 'SIGNED_OUT' || !session) {
                setStatusMessage("セッションなし。ログインへ遷移します...");
                clearTimeout(timer);
                router.replace("/");
                return;
            }

            verifyUserFromClaims(session);
        });

        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (!error && session) {
                verifyUserFromClaims(session);
            }
        });

        // DBを見に行かず、トークンの中身（Claims）だけで判断する高速・安定版
        const verifyUserFromClaims = (session: any) => {
            if (!mounted) return;
            setStatusMessage("ユーザー情報を確認中(Token)...");

            try {
                // app_metadata から権限情報を取得
                const appMetadata = session.user?.app_metadata || {};
                const isApproved = appMetadata.is_approved;

                console.log("RequireAuth: Reviewing claims:", appMetadata);

                if (isApproved === true) {
                    // 承認済み
                    if (pathname === "/pending-approval") {
                        router.replace("/dashboard");
                    }
                    setIsAuthed(true);
                } else {
                    // 未承認（またはデータなし）
                    if (pathname !== "/pending-approval") {
                        router.replace("/pending-approval");
                    }
                    setIsAuthed(false);
                }

                setChecking(false);
                clearTimeout(timer);

            } catch (err: any) {
                console.error("RequireAuth Error:", err);
                setAuthError("認証情報の確認中にエラーが発生しました");
                setChecking(false);
                clearTimeout(timer);
            }
        };

        return () => {
            mounted = false;
            clearTimeout(timer);
            subscription.unsubscribe();
            console.log("RequireAuth: Unsubscribed.");
        };
    }, [router, pathname]);

    if (checking) {
        return (
            <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center flex-col gap-4">
                <div className="animate-spin h-8 w-8 border-4 border-slate-300 rounded-full border-t-slate-900"></div>
                <p className="text-sm text-slate-600 font-medium">認証情報を確認して(Token)...</p>
                <p className="text-xs text-slate-500 font-mono animate-pulse">{statusMessage}</p>
            </div>
        );
    }

    if (authError) {
        return (
            <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-4">
                <div className="bg-red-950/30 border border-red-500/50 rounded-lg p-6 max-w-md w-full text-center">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-6 h-6" /></div>
                    <h2 className="text-xl font-bold text-red-700 mb-2">認証エラー</h2>
                    <p className="text-sm text-red-700 mb-6">{authError}</p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut();
                                window.location.href = "/";
                            }}
                            className="btn-primary px-6 py-2 w-full"
                        >
                            一度ログアウトする（推奨）
                        </button>
                        <p className="text-xs text-slate-500">※権限情報を更新するため、再ログインしてください</p>
                    </div>
                </div>
            </div>
        )
    }

    if (!isAuthed) {
        return null;
    }

    return <>{children}</>;
}
