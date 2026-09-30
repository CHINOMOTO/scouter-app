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
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        setChecking(false);
        return;
      }

      // DBを使わず、Token内のメタデータで判定
      const role = session.user.app_metadata?.role;

      if (role !== "admin") {
        console.warn("Access denied: User is not admin (Token check)");
        router.push("/dashboard");
        setAllowed(false);
      } else {
        setAllowed(true);
      }
      setChecking(false);
    };

    check();
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
