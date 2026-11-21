"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export type AllowedPlan = "full" | "employment" | "credit" | "none";

const normalizePlan = (plan: unknown, isAdminRole: boolean): AllowedPlan => {
    if (plan === "full" || plan === "employment" || plan === "credit") {
        return plan;
    }
    return isAdminRole ? "full" : "none";
};

type PlanContextType = {
    allowedPlan: AllowedPlan;
    isAdmin: boolean;
    companyId: string | null;
    companyName: string | null;
    displayName: string | null;
    isApproved: boolean;
    loading: boolean;
    refreshPlan: () => Promise<void>;
};

const PlanContext = createContext<PlanContextType>({
    allowedPlan: "none",
    isAdmin: false,
    companyId: null,
    companyName: null,
    displayName: null,
    isApproved: false,
    loading: true,
    refreshPlan: async () => {},
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
    const [allowedPlan, setAllowedPlan] = useState<AllowedPlan>("none");
    const [isAdmin, setIsAdmin] = useState(false);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [isApproved, setIsApproved] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchCurrentPlan = useCallback(async (userId?: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUserId = userId || session?.user?.id;
            if (!currentUserId) {
                setAllowedPlan("none");
                setIsAdmin(false);
                setCompanyId(null);
                setCompanyName(null);
                setDisplayName(null);
                setIsApproved(false);
                setLoading(false);
                return;
            }

            // まずサーバーAPI（/api/profile・Service Role経由）で厳格化RLS下でも確実に会社名・プランを取得
            if (session?.access_token) {
                const profileRes = await fetch("/api/profile", {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                });
                if (profileRes.ok) {
                    const profileData = await profileRes.json().catch(() => null);
                    const p = profileData?.profile;
                    if (p) {
                        const adminFlag = p.role === "admin";
                        setAllowedPlan(normalizePlan(p.allowedPlan, adminFlag));
                        setIsAdmin(adminFlag);
                        setCompanyId(p.companyId || null);
                        setCompanyName(p.companyName || null);
                        setDisplayName(p.displayName === "未設定" ? null : (p.displayName || null));
                        setIsApproved(p.isApproved === true);
                        return;
                    }
                }
            }

            // 未承認ユーザー（/api/profile が 403）や一時フォールバック時は自身の app_users を参照
            const { data: appUser } = await supabase
                .from("app_users")
                .select("allowed_plan, role, company_id, display_name, is_approved")
                .eq("id", currentUserId)
                .maybeSingle();

            if (appUser) {
                const adminFlag = appUser.role === "admin";
                setAllowedPlan(normalizePlan(appUser.allowed_plan, adminFlag));
                setIsAdmin(adminFlag);
                setCompanyId(appUser.company_id || null);
                setDisplayName(appUser.display_name || null);
                setIsApproved(appUser.is_approved === true);
                setCompanyName(null);
            } else {
                setAllowedPlan("none");
                setIsAdmin(false);
                setIsApproved(false);
                setCompanyId(null);
                setCompanyName(null);
                setDisplayName(null);
            }
        } catch (err) {
            console.error("fetchCurrentPlan error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let activeUserId: string | null = null;

        const initAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                activeUserId = session.user.id;
                await fetchCurrentPlan(session.user.id);
            } else {
                setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "SIGNED_OUT" || !session?.user?.id) {
                setAllowedPlan("none");
                setIsAdmin(false);
                setCompanyId(null);
                setCompanyName(null);
                setDisplayName(null);
                setIsApproved(false);
                activeUserId = null;
                setLoading(false);
            } else if (session.user.id !== activeUserId) {
                activeUserId = session.user.id;
                setLoading(true);
                await fetchCurrentPlan(session.user.id);
            }
        });

        // Supabase Realtime: 自身の app_users レコードの更新（プラン変更・権限変更・利用停止等）を即時購読
        const channel = supabase
            .channel("realtime-app-user-plan")
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "app_users",
                },
                (payload: any) => {
                    if (payload.new && activeUserId && payload.new.id === activeUserId) {
                        if (payload.new.allowed_plan) {
                            setAllowedPlan(payload.new.allowed_plan as AllowedPlan);
                        }
                        if (payload.new.role !== undefined) {
                            setIsAdmin(payload.new.role === "admin");
                        }
                        if (payload.new.is_approved !== undefined) {
                            setIsApproved(payload.new.is_approved === true);
                        }
                        if (payload.new.display_name !== undefined) {
                            setDisplayName(payload.new.display_name || null);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            authSub.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, [fetchCurrentPlan]);

    return (
        <PlanContext.Provider
            value={{
                allowedPlan,
                isAdmin,
                companyId,
                companyName,
                displayName,
                isApproved,
                loading,
                refreshPlan: () => fetchCurrentPlan(),
            }}
        >
            {children}
        </PlanContext.Provider>
    );
}

export function usePlan() {
    return useContext(PlanContext);
}
