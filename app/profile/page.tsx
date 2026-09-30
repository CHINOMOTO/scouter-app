"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";
import { User, ArrowLeft } from "lucide-react";

type UserProfile = {
    email: string;
    displayName: string;
    companyName: string | null;
    role: string;
    isApproved: boolean;
    createdAt: string;
};

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: appUser } = await supabase
                    .from("app_users")
                    .select("display_name, company_id, role, is_approved, created_at")
                    .eq("id", user.id)
                    .maybeSingle();

                let companyName: string | null = null;
                if (appUser?.company_id) {
                    const { data: company } = await supabase
                        .from("companies")
                        .select("name")
                        .eq("id", appUser.company_id)
                        .maybeSingle();
                    companyName = company?.name || null;
                }

                setProfile({
                    email: user.email || "",
                    displayName: appUser?.display_name || user.user_metadata?.display_name || "未設定",
                    companyName,
                    role: appUser?.role || "viewer",
                    isApproved: appUser?.is_approved ?? false,
                    createdAt: appUser?.created_at || user.created_at || "",
                });
            } catch (err) {
                console.error("Profile fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const roleLabel = (role: string) => {
        switch (role) {
            case "admin": return "管理者";
            case "viewer": return "一般ユーザー";
            default: return role;
        }
    };

    return (
        <RequireAuth>
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 flex flex-col items-center">
                <div className="max-w-2xl w-full">

                    <div className="mb-6 animate-fade-in">
                        <Link 
                            href="/dashboard" 
                            className="btn-secondary text-xs h-9 px-3.5 rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                            <span>ダッシュボードへ戻る</span>
                        </Link>
                    </div>

                    <div className="glass-panel rounded-2xl p-8 animate-fade-in delay-100">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <span className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></span>
                            </div>
                        ) : !profile ? (
                            <p className="text-slate-600 text-center py-8">プロフィール情報を取得できませんでした。</p>
                        ) : (
                            <div className="space-y-8">
                                {/* Header */}
                                <div className="text-center pb-6 border-b border-slate-200">
                                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
                                        <User className="w-8 h-8 text-slate-600" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-slate-900 mb-1">{profile.displayName}</h1>
                                    {profile.companyName && (
                                        <p className="text-slate-900/70 font-medium">{profile.companyName}</p>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="space-y-1">
                                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">
                                        アカウント情報
                                    </h2>
                                    <dl className="space-y-4 text-sm">
                                        <div className="grid grid-cols-[140px_1fr] items-center py-3 px-4 rounded-lg bg-white border border-slate-200">
                                            <dt className="text-slate-600 font-medium">氏名</dt>
                                            <dd className="text-slate-900 font-bold">{profile.displayName}</dd>
                                        </div>
                                        <div className="grid grid-cols-[140px_1fr] items-center py-3 px-4 rounded-lg bg-white border border-slate-200">
                                            <dt className="text-slate-600 font-medium">メールアドレス</dt>
                                            <dd className="text-slate-900 font-mono text-xs">{profile.email}</dd>
                                        </div>
                                        <div className="grid grid-cols-[140px_1fr] items-center py-3 px-4 rounded-lg bg-white border border-slate-200">
                                            <dt className="text-slate-600 font-medium">所属会社</dt>
                                            <dd className="text-slate-900 font-bold">{profile.companyName || "未設定"}</dd>
                                        </div>
                                        <div className="grid grid-cols-[140px_1fr] items-center py-3 px-4 rounded-lg bg-white border border-slate-200">
                                            <dt className="text-slate-600 font-medium">権限</dt>
                                            <dd>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${ profile.role === "admin" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-slate-100 text-slate-700 border-slate-200" }`}>
                                                    {roleLabel(profile.role)}
                                                </span>
                                            </dd>
                                        </div>
                                        <div className="grid grid-cols-[140px_1fr] items-center py-3 px-4 rounded-lg bg-white border border-slate-200">
                                            <dt className="text-slate-600 font-medium">アカウント状態</dt>
                                            <dd>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${ profile.isApproved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200" }`}>
                                                    {profile.isApproved ? "承認済み" : "審査中"}
                                                </span>
                                            </dd>
                                        </div>
                                        <div className="grid grid-cols-[140px_1fr] items-center py-3 px-4 rounded-lg bg-white border border-slate-200">
                                            <dt className="text-slate-600 font-medium">登録日</dt>
                                            <dd className="text-slate-900 font-mono text-xs">
                                                {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("ja-JP", {
                                                    year: "numeric", month: "long", day: "numeric"
                                                }) : "-"}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </RequireAuth>
    );
}
