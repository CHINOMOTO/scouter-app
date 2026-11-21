"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { usePlan } from "@/contexts/PlanContext";
import { AlertCircle } from "lucide-react";

type RequireAuthProps = {
    children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { isApproved: contextApproved, loading: planLoading } = usePlan();
    const [checking, setChecking] = useState(true);
    const [isAuthed, setIsAuthed] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // リアルタイムで利用停止 (is_approved = false) された場合は即座に遮断
    useEffect(() => {
        if (!checking && !planLoading && isAuthed && !contextApproved) {
            setIsAuthed(false);
            if (pathname !== "/pending-approval") {
                router.replace("/pending-approval");
            }
        }
    }, [checking, planLoading, isAuthed, contextApproved, pathname, router]);

    useEffect(() => {
        let mounted = true;
        let resolved = false;

        const timer = setTimeout(() => {
            if (mounted && !resolved) {
                setAuthError("認証情報の確認がタイムアウトしました。通信環境をご確認のうえ再読み込みしてください。");
                setChecking(false);
            }
        }, 12000);

        const verifySessionAgainstDb = async (session: any) => {
            if (!mounted) return;
            try {
                if (!session?.user?.id) {
                    resolved = true;
                    clearTimeout(timer);
                    setIsAuthed(false);
                    setChecking(false);
                    router.replace("/");
                    return;
                }

                // 必ず DB の最新の is_approved を確認（JWTキャッシュによる利用停止すり抜けを防止）
                const { data: appUser, error: dbError } = await supabase
                    .from("app_users")
                    .select("is_approved")
                    .eq("id", session.user.id)
                    .maybeSingle();

                if (!mounted) return;
                if (dbError) {
                    throw dbError;
                }

                resolved = true;
                clearTimeout(timer);

                if (appUser?.is_approved === true) {
                    if (pathname === "/pending-approval") {
                        router.replace("/dashboard");
                    }
                    setIsAuthed(true);
                } else {
                    setIsAuthed(false);
                    if (pathname !== "/pending-approval") {
                        router.replace("/pending-approval");
                    }
                }
                setChecking(false);
            } catch (err) {
                console.error("RequireAuth Error:", err);
                if (!mounted) return;
                resolved = true;
                clearTimeout(timer);
                setAuthError("認証情報の確認中にエラーが発生しました。時間をおいて再度お試しください。");
                setChecking(false);
            }
        };

        // 注意: onAuthStateChange 内で直接 supabase クエリを await すると Auth ロック競合が起きるため setTimeout(..., 0) でロック解放後に実行
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;
            if (event === "SIGNED_OUT" || !session) {
                resolved = true;
                clearTimeout(timer);
                setIsAuthed(false);
                setChecking(false);
                router.replace("/");
                return;
            }
            setTimeout(() => {
                if (mounted && !resolved) {
                    verifySessionAgainstDb(session);
                }
            }, 0);
        });

        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (!mounted) return;
            if (error || !session) {
                resolved = true;
                clearTimeout(timer);
                setIsAuthed(false);
                setChecking(false);
                router.replace("/");
                return;
            }
            verifySessionAgainstDb(session);
        });

        return () => {
            mounted = false;
            clearTimeout(timer);
            subscription.unsubscribe();
        };
    }, [router, pathname]);

    if (checking) {
        return (
            <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center flex-col gap-4">
                <div className="animate-spin h-8 w-8 border-4 border-slate-300 rounded-full border-t-slate-900"></div>
                <p className="text-sm text-slate-600 font-medium">認証情報を確認しています...</p>
            </div>
        );
    }

    if (authError) {
        return (
            <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center p-4">
                <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md w-full text-center shadow-sm">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-red-700 mb-2">認証エラー</h2>
                    <p className="text-sm text-slate-700 mb-6 leading-relaxed">{authError}</p>
                    <div className="flex flex-col gap-2.5">
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    // Authロック競合時でも確実にセッションを破棄できるようストレージを直接クリア＋タイムアウト付きsignOut
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
                                    console.error("Force signOut error:", e);
                                } finally {
                                    window.location.replace("/");
                                }
                            }}
                            className="btn-primary px-6 py-2.5 w-full font-bold text-sm cursor-pointer"
                        >
                            一度ログアウトする（推奨）
                        </button>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="btn-secondary px-6 py-2.5 w-full font-bold text-xs cursor-pointer"
                        >
                            ページを再読み込みする
                        </button>
                        <p className="text-xs text-slate-500">※権限情報を更新するため、再ログインしてください</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthed) {
        return null;
    }

    return <>{children}</>;
}
