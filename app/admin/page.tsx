"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, UserCheck, Building, Users, MessageSquare, Mail, FileSpreadsheet, Activity, Sparkles, Box } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";

export default function AdminDashboardPage() {
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [pendingCreditCount, setPendingCreditCount] = useState<number | null>(null);
    const [approvedUserCount, setApprovedUserCount] = useState<number | null>(null);
    const [companyCount, setCompanyCount] = useState<number | null>(null);
    const [inquiryCount, setInquiryCount] = useState<number | null>(null);
    const [auditCount, setAuditCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCounts = async () => {
            setLoading(true);

            // 企業信用審査待ち件数
            const creditQuery = supabase
                .from("credit_cases")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending");

            // ケースの承認待ち件数
            const casesQuery = supabase
                .from("blacklist_cases")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending");

            // 登録ユーザー件数
            const approvedUsersQuery = supabase
                .from("app_users")
                .select("*", { count: "exact", head: true });

            // 会社の総数
            const companiesQuery = supabase
                .from("companies")
                .select("*", { count: "exact", head: true });

            // お問い合わせ未読件数
            const inquiriesQuery = supabase
                .from("contact_inquiries")
                .select("*", { count: "exact", head: true })
                .eq("status", "unread");

            // 監査ログ件数
            const auditQuery = supabase
                .from("audit_logs")
                .select("*", { count: "exact", head: true });

            const [creditResult, casesResult, approvedUsersResult, companiesResult, inquiriesResult, auditResult] = await Promise.all([
                creditQuery,
                casesQuery,
                approvedUsersQuery,
                companiesQuery,
                inquiriesQuery,
                auditQuery
            ]);

            if (!creditResult.error) setPendingCreditCount(creditResult.count);
            if (!casesResult.error) setPendingCount(casesResult.count);
            if (!approvedUsersResult.error) setApprovedUserCount(approvedUsersResult.count);
            if (!companiesResult.error) setCompanyCount(companiesResult.count);
            if (!inquiriesResult.error) setInquiryCount(inquiriesResult.count);
            if (!auditResult.error) setAuditCount(auditResult.count);
            setLoading(false);
        };

        fetchCounts();
    }, []);

    return (
        <RequireAdmin>
            <div className="min-h-screen text-slate-900 flex flex-col items-center pt-16 sm:pt-20 md:pt-10 pb-16 px-3.5 sm:px-6">
                <div className="max-w-5xl w-full">
                    <div className="mb-6 sm:mb-10">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1.5 sm:mb-2 tracking-tight">
                            管理者ダッシュボード
                        </h1>
                        <p className="text-slate-600 text-xs sm:text-sm font-medium">システムの各種管理と設定を行います</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {/* 未払い企業審査タイル */}
                        <Link
                            href="/admin/credit-cases"
                            className="block group relative p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 transition-all duration-200 glass-panel hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] flex flex-col overflow-hidden shadow-2xs"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-200">
                                        <FileSpreadsheet className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                                    </div>
                                    <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold rounded-lg border uppercase tracking-wider shadow-xs ${
                                        (pendingCreditCount || 0) > 0
                                            ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                                            : "bg-slate-100 text-slate-800 border-slate-200"
                                    }`}>
                                        {(pendingCreditCount || 0) > 0 ? `${pendingCreditCount}件 審査待ち` : "Credit Review"}
                                    </span>
                                </div>
                                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1.5 sm:mb-2 group-hover:text-blue-600 transition-colors duration-200">
                                    企業信用 審査
                                </h2>
                                <p className="text-slate-600 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
                                    加盟企業から申請された企業信用（遅延・未払い）情報およびエビデンス資料の審査を行います。
                                </p>

                                <div className="mt-auto">
                                    <div className="text-3xl sm:text-5xl font-bold text-slate-900">
                                        {loading ? (
                                            <span className="text-xl sm:text-2xl text-slate-600 animate-pulse">...</span>
                                        ) : (
                                            <>
                                                {pendingCreditCount || 0}
                                                <span className="text-sm sm:text-lg text-slate-500 font-normal ml-2 tracking-widest">
                                                    CASE
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* 承認待ちタイル */}
                        <Link
                            href="/admin/cases"
                            className="block group relative p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 transition-all duration-200 glass-panel hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] flex flex-col overflow-hidden shadow-2xs"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-200">
                                        <ClipboardCheck className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                                    </div>
                                    <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-slate-100 text-slate-800 text-[10px] sm:text-xs font-bold rounded-lg border border-slate-200 uppercase tracking-wider shadow-xs">
                                        Action Required
                                    </span>
                                </div>

                                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1.5 sm:mb-2 group-hover:text-blue-600 transition-colors duration-200">
                                    就業トラブル 審査
                                </h2>
                                <p className="text-slate-600 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
                                    加盟企業から申請された就業トラブル情報およびエビデンス資料の審査を行います。
                                </p>

                                <div className="mt-auto">
                                    <div className="text-3xl sm:text-5xl font-bold text-slate-900">
                                        {loading ? (
                                            <span className="text-xl sm:text-2xl text-slate-600 animate-pulse">...</span>
                                        ) : (
                                            <>
                                                {pendingCount}
                                                <span className="text-sm sm:text-lg text-slate-500 font-normal ml-2 tracking-widest">
                                                    CASE
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* ユーザー管理タイル */}
                        <Link
                            href="/admin/users"
                            className="block group relative p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 transition-all duration-200 glass-panel hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] flex flex-col overflow-hidden shadow-2xs"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-200">
                                        <Users className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                                    </div>
                                    <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold rounded-lg border uppercase tracking-wider shadow-xs bg-slate-100 text-slate-800 border-slate-200">
                                        Users
                                    </span>
                                </div>

                                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1.5 sm:mb-2 group-hover:text-blue-600 transition-colors duration-200">
                                    ユーザー管理
                                </h2>
                                <p className="text-slate-600 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
                                    登録ユーザーの権限変更・削除、新規アカウント発行を行います。
                                </p>

                                <div className="mt-auto flex items-baseline justify-between pt-2 border-t border-slate-100">
                                    <div className="text-3xl sm:text-4xl font-bold text-slate-900">
                                        {loading ? (
                                            <span className="text-xl sm:text-2xl text-slate-600 animate-pulse">...</span>
                                        ) : (
                                            <>
                                                <span>{approvedUserCount ?? 0}</span>
                                                <span className="text-xs sm:text-sm text-slate-500 font-normal ml-1.5 tracking-wider">
                                                    名
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
                            className="block group relative p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 transition-all duration-200 glass-panel hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] flex flex-col overflow-hidden shadow-2xs"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-200">
                                        <Building className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                                    </div>
                                    <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-slate-100 text-slate-800 text-[10px] sm:text-xs font-bold rounded-lg border border-slate-200 uppercase tracking-wider shadow-xs">
                                        System
                                    </span>
                                </div>

                                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1.5 sm:mb-2 group-hover:text-blue-600 transition-colors duration-200">
                                    会社管理
                                </h2>
                                <p className="text-slate-600 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
                                    利用会社（グループ会社）の追加・編集を行います。
                                </p>

                                <div className="mt-auto">
                                    <div className="text-3xl sm:text-5xl font-bold text-slate-900">
                                        {loading ? (
                                            <span className="text-xl sm:text-2xl text-slate-600 animate-pulse">...</span>
                                        ) : (
                                            <>
                                                <span>
                                                    {companyCount ?? 0}
                                                </span>
                                                <span className="text-sm sm:text-lg text-slate-500 font-normal ml-2 tracking-widest">
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
                            className="block group relative p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 transition-all duration-200 glass-panel hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] flex flex-col overflow-hidden shadow-2xs"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-200">
                                        <Mail className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                                    </div>
                                    <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-slate-100 text-slate-800 text-[10px] sm:text-xs font-bold rounded-lg border border-slate-200 uppercase tracking-wider shadow-xs">
                                        Support
                                    </span>
                                </div>

                                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1.5 sm:mb-2 group-hover:text-blue-600 transition-colors duration-200">
                                    お問い合わせ管理
                                </h2>
                                <p className="text-slate-600 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
                                    ユーザーからのお問い合わせを確認・管理します。
                                </p>

                                <div className="mt-auto">
                                    <div className="text-3xl sm:text-5xl font-bold text-slate-900">
                                        {loading ? (
                                            <span className="text-xl sm:text-2xl text-slate-600 animate-pulse">...</span>
                                        ) : (
                                            <>
                                                <span className={inquiryCount && inquiryCount > 0 ? "text-amber-500 font-extrabold" : "group-hover:text-blue-600 transition-colors"}>
                                                    {inquiryCount ?? 0}
                                                </span>
                                                <span className="text-sm sm:text-lg text-slate-500 font-normal ml-2 tracking-widest">
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
                            className="block group relative p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 transition-all duration-200 glass-panel hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] flex flex-col overflow-hidden shadow-2xs"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-8 sm:h-8"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                                    </div>
                                    <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-slate-100 text-slate-800 text-[10px] sm:text-xs font-bold rounded-lg border border-slate-200 uppercase tracking-wider shadow-xs">
                                        News
                                    </span>
                                </div>
                                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1.5 sm:mb-2 group-hover:text-blue-600 transition-colors duration-200">
                                    お知らせ管理
                                </h2>
                                <p className="text-slate-600 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
                                    ダッシュボードに表示するお知らせの作成・公開を行います。
                                </p>
                            </div>
                        </Link>

                        {/* 監査ログ・照会履歴タイル */}
                        <Link
                            href="/admin/audit"
                            className="block group relative p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 transition-all duration-200 glass-panel hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] flex flex-col overflow-hidden shadow-2xs"
                        >
                            <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-200">
                                        <Activity className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                                    </div>
                                    <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-slate-100 text-slate-800 text-[10px] sm:text-xs font-bold rounded-lg border border-slate-200 uppercase tracking-wider shadow-xs">
                                        Audit & Security
                                    </span>
                                </div>
                                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 mb-1.5 sm:mb-2 group-hover:text-blue-600 transition-colors duration-200">
                                    監査ログ・照会履歴
                                </h2>
                                <p className="text-slate-600 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
                                    個人情報保護法遵守のため、全ユーザーの検索・照会・閲覧アクティビティを監査します。
                                </p>

                                <div className="mt-auto">
                                    <div className="text-3xl sm:text-5xl font-bold text-slate-900">
                                        {loading ? (
                                            <span className="text-xl sm:text-2xl text-slate-600 animate-pulse">...</span>
                                        ) : (
                                            <>
                                                <span>
                                                    {auditCount ?? 0}
                                                </span>
                                                <span className="text-sm sm:text-lg text-slate-500 font-normal ml-2 tracking-widest">
                                                    LOGS
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {/* test タイル */}
                        <Link
                            href="/admin/test"
                            className="block group relative p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-indigo-200/80 transition-all duration-200 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/40 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-md active:scale-[0.98] flex flex-col overflow-hidden shadow-2xs"
                        >
                            <div className="absolute inset-0 bg-indigo-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4 sm:mb-6">
                                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-indigo-600 text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
                                        <Box className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
                                    </div>
                                    <span className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-0.5 sm:py-1 bg-indigo-100 text-indigo-800 text-[10px] sm:text-xs font-bold rounded-lg border border-indigo-200 uppercase tracking-wider shadow-xs">
                                        <Sparkles className="w-3 h-3 text-indigo-600" />
                                        <span>test</span>
                                    </span>
                                </div>
                                <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 mb-1.5 sm:mb-2 group-hover:text-indigo-600 transition-colors duration-200">
                                    test
                                </h2>
                                <p className="text-slate-600 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
                                    3Dインタラクティブテスト
                                </p>

                                <div className="mt-auto">
                                    <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                                        <span>開く →</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </RequireAdmin>
    );
}
