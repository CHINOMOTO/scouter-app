"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

export type AllowedPlan = "full" | "employment" | "credit";

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
    allowedPlan: "full",
    isAdmin: false,
    companyId: null,
    companyName: null,
    displayName: null,
    isApproved: false,
    loading: true,
    refreshPlan: async () => {},
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
    const [allowedPlan, setAllowedPlan] = useState<AllowedPlan>("full");
    const [isAdmin, setIsAdmin] = useState(false);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [companyName, setCompanyName] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [isApproved, setIsApproved] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchCurrentPlan = useCallback(async (userId?: string) => {
        try {
            const currentUserId = userId || (await supabase.auth.getSession()).data.session?.user?.id;
            if (!currentUserId) {
                setLoading(false);
                return;
            }

            const { data: appUser } = await supabase
                .from("app_users")
                .select("allowed_plan, role, company_id, display_name, is_approved")
                .eq("id", currentUserId)
                .maybeSingle();

            if (appUser) {
                const plan = (appUser.allowed_plan as AllowedPlan) || "full";
                setAllowedPlan(plan);
                const adminFlag = appUser.role === "admin";
                setIsAdmin(adminFlag);
                setCompanyId(appUser.company_id || null);
                setDisplayName(appUser.display_name || null);
                setIsApproved(appUser.is_approved ?? false);

                if (appUser.company_id) {
                    const { data: comp } = await supabase
                        .from("companies")
                        .select("name")
                        .eq("id", appUser.company_id)
                        .maybeSingle();
                    if (comp?.name) {
                        setCompanyName(comp.name);
                    }
                }
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

        // 認証状態の変更リスナー
        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "SIGNED_OUT") {
                setAllowedPlan("full");
                setIsAdmin(false);
                setCompanyId(null);
                setCompanyName(null);
                setDisplayName(null);
                setIsApproved(false);
                activeUserId = null;
                setLoading(false);
            } else if (session?.user?.id && session.user.id !== activeUserId) {
                activeUserId = session.user.id;
                await fetchCurrentPlan(session.user.id);
            }
        });

        // Supabase Realtime: 自身の app_users レコードの更新（管理者によるallowed_plan変更・承認等）を即時購読
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
                        console.log("Realtime: User plan updated by admin:", payload.new.allowed_plan);
                        if (payload.new.allowed_plan) {
                            setAllowedPlan(payload.new.allowed_plan as AllowedPlan);
                        }
                        if (payload.new.role !== undefined) {
                            setIsAdmin(payload.new.role === "admin");
                        }
                        if (payload.new.is_approved !== undefined) {
                            setIsApproved(payload.new.is_approved);
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
