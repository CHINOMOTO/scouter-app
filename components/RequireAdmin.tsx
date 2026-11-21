"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type RequireAdminProps = {
  children: ReactNode;
};

export function RequireAdmin({ children }: RequireAdminProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/");
          return;
        }

        // JWT の古いメタデータではなく、必ず DB の最新 role / is_approved で判定
        const { data: appUser } = await supabase
          .from("app_users")
          .select("role, is_approved")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!mounted) return;

        if (!appUser || appUser.is_approved !== true) {
          router.replace("/pending-approval");
          setAllowed(false);
          return;
        }

        if (appUser.role !== "admin") {
          router.replace("/dashboard");
          setAllowed(false);
          return;
        }

        setAllowed(true);
      } catch (err) {
        console.error("RequireAdmin check error:", err);
        if (mounted) {
          router.replace("/dashboard");
          setAllowed(false);
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex items-center justify-center flex-col gap-3">
        <div className="animate-spin h-8 w-8 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
        <p className="text-sm text-slate-600 font-medium">
          管理者権限を確認しています...
        </p>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
