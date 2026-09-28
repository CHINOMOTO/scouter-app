"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, UserCheck, Building, Users, MessageSquare, Mail } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";

export default function AdminDashboardPage() {
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [pendingUserCount, setPendingUserCount] = useState<number | null>(null);
    const [approvedUserCount, setApprovedUserCount] = useState<number | null>(null);
    const [companyCount, setCompanyCount] = useState<number | null>(null);
    const [inquiryCount, setInquiryCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCounts = async () => {
            setLoading(true);

            // ケースの承認待ち件数
            const casesQuery = supabase
                .from("blacklist_cases")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending");

            // ユーザーの承認待ち件数
            const usersQuery = supabase
                .from("app_users")
                .select("*", { count: "exact", head: true })
                .eq("is_approved", false);

            // 登録済み（承認済み）ユーザー件数
            const approvedUsersQuery = supabase
                .from("app_users")
                .select("*", { count: "exact", head: true })
                .eq("is_approved", true);

            // 会社の総数
            const companiesQuery = supabase
                .from("companies")
                .select("*", { count: "exact", head: true });

            // お問い合わせ未読件数
            const inquiriesQuery = supabase
                .from("contact_inquiries")
                .select("*", { count: "exact", head: true })
                .eq("status", "unread");

            const [casesResult, usersResult, approvedUsersResult, companiesResult, inquiriesResult] = await Promise.all([
                casesQuery,
                usersQuery,
                approvedUsersQuery,
                companiesQuery,
                inquiriesQuery
            ]);

            if (!casesResult.error) setPendingCount(casesResult.count);
            if (!usersResult.error) setPendingUserCount(usersResult.count);
            if (!approvedUsersResult.error) setApprovedUserCount(approvedUsersResult.count);
            if (!companiesResult.error) setCompanyCount(companiesResult.count);
            if (!inquiriesResult.error) setInquiryCount(inquiriesResult.count);
            setLoading(false);
        };

        fetchCounts();
    }, []);

    return (
        <RequireAdmin>
            <div className="min-h-screen text-slate-900 flex items-center justify-center pt-24 pb-12">
                <div className="max-w-5xl w-full mx-4">
                    <div className="mb-12">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
                            管理者ダッシュボード
                        </h1>
                        <p className="text-slate-600 font-medium">システムの各種管理と設定を行います</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* 承認待ちタイル */}
                        <Link
                            href="/admin/cases"
                            className="block group relative p-8 rounded-3xl border border-slate-200 transition-all duration-300 glass-panel hover:-translate-y-2 hover:border-slate-300/50 hover:bg-slate-50 flex flex-col overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="p-3 rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
     <ClipboardCheck className="w-8 h-8" strokeWidth={1.5} />
   </div>
                                    <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 uppercase tracking-wider shadow-sm">
                                        Action Required
                                    </span>
                                </div>

                                <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                                    承認待ちリスト
                                </h2>
                                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                                    新規登録された応募者属性リストの審査を行います。
                                </p>

                                <div className="mt-auto">
                                    <div className="text-5xl font-bold text-slate-900">
                                        {loading ? (
                                            <span className="text-2xl text-slate-600 animate-pulse">...</span>
                                        ) : (
                                            <>
                                                {pendingCount}
                                                <span className="text-lg text-slate-500 font-normal ml-2 tracking-widest">
                                                    CASE
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* ユーザー承認タイル */}
                        <Link
                            href="/admin/users"
                            className="block group relative p-8 rounded-3xl border border-slate-200 transition-all duration-300 glass-panel hover:-translate-y-2 hover:border-slate-300/50 hover:bg-slate-50 flex flex-col overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="p-3 rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
     <UserCheck className="w-8 h-8" strokeWidth={1.5} />
   </div>
                                    <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 uppercase tracking-wider shadow-sm">
                                        Review
                                    </span>
                                </div>

                                <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                                    新規ユーザー承認
                                </h2>
                                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                                    アカウント利用申請を確認し、利用を許可します。
                                </p>

                                <div className="mt-auto">
                                    <div className="text-5xl font-bold text-slate-900">
                                        {loading ? (
                                            <span className="text-2xl text-slate-600 animate-pulse">...</span>
                                        ) : (
                                            <>
                                                <span className={pendingUserCount && pendingUserCount > 0 ? "text-slate-900" : ""}>
                                                    {pendingUserCount ?? 0}
                                                </span>
                                                <span className="text-lg text-slate-500 font-normal ml-2 tracking-widest">
                                                    USER
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* 登録済みユーザー一覧タイル */}
                        <Link
                            href="/admin/registered-users"
                            className="block group relative p-8 rounded-3xl border border-slate-200 transition-all duration-300 glass-panel hover:-translate-y-2 hover:border-slate-300/50 hover:bg-slate-50 flex flex-col overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="p-3 rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
     <Users className="w-8 h-8" strokeWidth={1.5} />
   </div>
                                    <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 uppercase tracking-wider shadow-sm">
                                        Member
                                    </span>
                                </div>

                                <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                                    登録ユーザー一覧
                                </h2>
                                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                                    現在承認されている全ユーザーを確認します。
                                </p>

                                <div className="mt-auto">
                                    <div className="text-5xl font-bold text-slate-900">
                                        {loading ? (
                                            <span className="text-2xl text-slate-600 animate-pulse">...</span>
                                        ) : (
                                            <>
                                                <span>
                                                    {approvedUserCount ?? 0}
                                                </span>
                                                <span className="text-lg text-slate-500 font-normal ml-2 tracking-widest">
                                                    ACTIVE
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* 会社管理タイル */}
                        <Link
                            href="/admin/companies"
                            className="block group relative p-8 rounded-3xl border border-slate-200 transition-all duration-300 glass-panel hover:-translate-y-2 hover:border-slate-300/50 hover:bg-slate-50 flex flex-col overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="p-3 rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
     <Building className="w-8 h-8" strokeWidth={1.5} />
   </div>
                                    <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 uppercase tracking-wider shadow-sm">
                                        System
                                    </span>
                                </div>

                                <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                                    会社管理
                                </h2>
                                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                                    利用会社（グループ会社）の追加・編集を行います。
                                </p>

                                <div className="mt-auto">
                                    <div className="text-5xl font-bold text-slate-900">
                                        {loading ? (
                                            <span className="text-2xl text-slate-600 animate-pulse">...</span>
                                        ) : (
                                            <>
                                                <span>
                                                    {companyCount ?? 0}
                                                </span>
                                                <span className="text-lg text-slate-500 font-normal ml-2 tracking-widest">
                                                    CORP
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* お問い合わせ管理タイル */}
                        <Link
                            href="/admin/inquiries"
                            className="block group relative p-8 rounded-3xl border border-slate-200 transition-all duration-300 glass-panel hover:-translate-y-2 hover:border-slate-300/50 hover:bg-slate-50 flex flex-col overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="p-3 rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
     <Mail className="w-8 h-8" strokeWidth={1.5} />
   </div>
                                    <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 uppercase tracking-wider shadow-sm">
                                        Support
                                    </span>
                                </div>

                                <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                                    お問い合わせ管理
                                </h2>
                                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                                    ユーザーからのお問い合わせを確認・管理します。
                                </p>

                                <div className="mt-auto">
                                    <div className="text-5xl font-bold text-slate-900">
                                        {loading ? (
                                            <span className="text-2xl text-slate-600 animate-pulse">...</span>
                                        ) : (
                                            <>
                                                <span className={inquiryCount && inquiryCount > 0 ? "text-amber-400" : "group-hover:text-blue-600 transition-colors"}>
                                                    {inquiryCount ?? 0}
                                                </span>
                                                <span className="text-lg text-slate-500 font-normal ml-2 tracking-widest">
                                                    未読
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>


                    
                        {/* お知らせ管理タイル */}
                        <Link
                            href="/admin/announcements"
                            className="block group relative p-8 rounded-3xl border border-slate-200 transition-all duration-300 glass-panel hover:-translate-y-2 hover:border-slate-300/50 hover:bg-slate-50 flex flex-col overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="p-3 rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                                    </div>
                                    <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 uppercase tracking-wider shadow-sm">
                                        News
                                    </span>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                                    お知らせ管理
                                </h2>
                                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                                    ダッシュボードに表示するお知らせの作成・公開を行います。
                                </p>
                            </div>
                        </Link>

                    </div>
                </div>
            </div>
        </RequireAdmin>
    );
}
