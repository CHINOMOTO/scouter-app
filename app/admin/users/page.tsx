"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Toast, ToastMessage } from "@/components/Toast";
import { Pagination } from "@/components/Pagination";
import { translateErrorMessage } from "@/lib/errorMessage";
import { 
    Search, 
    Plus, 
    Filter,
    RotateCcw,
    Building2,
    Shield,
    Mail,
    CheckCircle2,
    Ban
} from "lucide-react";

type AppUser = {
    id: string;
    role: string;
    display_name: string | null;
    companies: {
        id: string;
        name: string;
        plan_type?: string;
    } | null;
    is_approved: boolean;
    email?: string;
    created_at?: string;
    allowed_plan?: string | null;
};

const PAGE_SIZE = 15;

const getPlanName = (allowedPlan?: string | null, companyPlan?: string | null) => {
    const plan = allowedPlan || companyPlan || 'full';
    switch (plan) {
        case 'employment': return "MIERIS WORK";
        case 'credit': return "MIERIS CREDIT";
        case 'full':
        default: return "FULLプラン";
    }
};

const getPlanBadge = (allowedPlan?: string | null, companyPlan?: string | null) => {
    const plan = allowedPlan || companyPlan || 'full';
    switch (plan) {
        case 'employment':
            return (
                <span className="shrink-0 inline-flex items-center text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-300">
                    MIERIS WORK
                </span>
            );
        case 'credit':
            return (
                <span className="shrink-0 inline-flex items-center text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-200">
                    MIERIS CREDIT
                </span>
            );
        case 'full':
        default:
            return (
                <span className="shrink-0 inline-flex items-center text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200">
                    FULLプラン
                </span>
            );
    }
};

export default function AdminUsersManagementPage() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [planFilter, setPlanFilter] = useState<string>("all");
    const [companyFilter, setCompanyFilter] = useState<string>("all");
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
    const [togglingStatusUserId, setTogglingStatusUserId] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    // 所属企業の一覧（重複排除＆五十音ソート）
    const uniqueCompanies = useMemo(() => {
        const map = new Map<string, string>();
        users.forEach(u => {
            if (u.companies?.id && u.companies?.name) {
                map.set(u.companies.id, u.companies.name);
            }
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, "ja"));
    }, [users]);

    // 登録ユーザー一覧取得
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch("/api/admin/users", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error) throw new Error(data.error || "ユーザー一覧の取得に失敗しました。");

            setUsers(data.users || []);
        } catch (error: unknown) {
            console.error("fetchUsers error:", error);
            setToast({ type: "error", text: translateErrorMessage(error, "ユーザー一覧の取得に失敗しました。") });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // 利用停止・有効化（承認状態の切り替え）
    const handleToggleApproval = async (user: AppUser) => {
        if (togglingStatusUserId || deletingUserId || updatingRoleUserId) return;
        const nextApproved = !user.is_approved;
        const label = nextApproved ? "有効化（利用再開）" : "利用停止";

        if (!confirm(`「${user.display_name || user.email || "対象ユーザー"}」のアカウントを【${label}】しますか？${!nextApproved ? "\n※停止すると直ちにシステムへのアクセスが制限されます。" : ""}`)) {
            return;
        }

        setTogglingStatusUserId(user.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ is_approved: nextApproved })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error) throw new Error(data.error || "ステータスの更新に失敗しました。");

            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_approved: nextApproved } : u));
            setToast({
                type: "success",
                text: nextApproved
                    ? "アカウントを有効化（承認済み）しました。"
                    : "アカウントを利用停止にしました。"
            });
        } catch (e: unknown) {
            setToast({ type: "error", text: translateErrorMessage(e, "ステータスの更新に失敗しました。") });
        } finally {
            setTogglingStatusUserId(null);
        }
    };

    // ユーザー削除
    const handleDeleteUser = async (userId: string) => {
        if (deletingUserId || togglingStatusUserId || updatingRoleUserId) return;
        if (!confirm("本当にこのユーザーを削除しますか？\n※投稿データ・監査ログは保持されますが、ログインできなくなります。\nこの操作は取り消せません。")) return;

        setDeletingUserId(userId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error) throw new Error(data.error || "削除に失敗しました。");

            setUsers(prev => prev.filter(u => u.id !== userId));
            setToast({ type: "success", text: "ユーザーを削除しました。" });
        } catch (e: unknown) {
            setToast({ type: "error", text: translateErrorMessage(e, "削除に失敗しました。") });
        } finally {
            setDeletingUserId(null);
        }
    };

    // 権限変更
    const handleToggleRole = async (user: AppUser) => {
        if (updatingRoleUserId || deletingUserId || togglingStatusUserId) return;
        if (user.role === 'admin') {
            const activeAdminCount = users.filter(u => u.role === 'admin' && u.is_approved).length;
            if (activeAdminCount <= 1 && user.is_approved) {
                setToast({
                    type: "error",
                    text: "最後の有効な管理者は降格できません。少なくとも1人の管理者が存在する必要があります。"
                });
                return;
            }
        }

        const newRole = user.role === 'admin' ? 'viewer' : 'admin';
        if (!confirm(`「${user.display_name || "未設定"}」の権限を【${newRole === 'admin' ? '管理者' : '一般ユーザー'}】に変更しますか？`)) return;

        setUpdatingRoleUserId(user.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`/api/admin/users/${user.id}/role`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.error) throw new Error(data.error || "権限の更新に失敗しました。");

            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
            setToast({ type: "success", text: `権限を「${newRole === 'admin' ? '管理者' : '一般ユーザー'}」に更新しました。` });
        } catch (err: unknown) {
            setToast({ type: "error", text: translateErrorMessage(err, "更新に失敗しました。") });
        } finally {
            setUpdatingRoleUserId(null);
        }
    };

    // 複合フィルタリング（プラン別・会社別・権限別・状態別・キーワード）
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            // プラン判定
            const effectivePlan = u.allowed_plan || u.companies?.plan_type || "full";
            if (planFilter !== "all" && effectivePlan !== planFilter) {
                return false;
            }

            // 所属会社判定
            if (companyFilter !== "all" && u.companies?.id !== companyFilter) {
                return false;
            }

            // 権限判定
            if (roleFilter !== "all" && u.role !== roleFilter) {
                return false;
            }

            // アカウント状態判定
            if (statusFilter === "approved" && !u.is_approved) {
                return false;
            }
            if (statusFilter === "suspended" && u.is_approved) {
                return false;
            }

            // キーワード検索
            if (searchTerm.trim()) {
                const q = searchTerm.trim().toLowerCase();
                const name = (u.display_name || "").toLowerCase();
                const email = (u.email || "").toLowerCase();
                const comp = (u.companies?.name || "").toLowerCase();
                const role = (u.role || "").toLowerCase();
                const plan = effectivePlan.toLowerCase();
                const planLabel = getPlanName(u.allowed_plan, u.companies?.plan_type).toLowerCase();
                if (!name.includes(q) && !email.includes(q) && !comp.includes(q) && !role.includes(q) && !plan.includes(q) && !planLabel.includes(q)) {
                    return false;
                }
            }

            return true;
        });
    }, [users, searchTerm, planFilter, companyFilter, roleFilter, statusFilter]);

    const hasActiveFilters = searchTerm.trim() !== "" || planFilter !== "all" || companyFilter !== "all" || roleFilter !== "all" || statusFilter !== "all";

    const resetFilters = () => {
        setSearchTerm("");
        setPlanFilter("all");
        setCompanyFilter("all");
        setRoleFilter("all");
        setStatusFilter("all");
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE) || 1;

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const paginatedUsers = useMemo(() => {
        const safePage = Math.min(currentPage, totalPages);
        const start = (safePage - 1) * PAGE_SIZE;
        return filteredUsers.slice(start, start + PAGE_SIZE);
    }, [filteredUsers, currentPage, totalPages]);

    return (
        <RequireAdmin>
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-5xl w-full">

                    {/* ページヘッダー */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 animate-fade-in gap-4">
                        <div>
                            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">ユーザー管理</h1>
                                {!loading && (
                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                                        {hasActiveFilters ? `該当 ${filteredUsers.length} 件 / 全 ${users.length} 件` : `全 ${users.length} 件`}
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-600 text-xs sm:text-sm mt-1">登録ユーザーの利用プラン・権限・利用状態の管理を行います</p>
                        </div>
                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                            <Link href="/admin" className="flex-1 sm:flex-initial btn-secondary text-xs h-10 px-3.5 sm:px-4 flex items-center justify-center font-bold">
                                管理者メニュー
                            </Link>
                            <Link href="/admin/users/new" className="flex-1 sm:flex-initial btn-primary flex items-center justify-center gap-1.5 px-4 sm:px-5 h-10 hover:-translate-y-0.5 transition-all rounded-xl font-bold text-xs sm:text-sm shadow-xs whitespace-nowrap">
                                <Plus className="w-4 h-4 shrink-0" />
                                <span>アカウント新規発行</span>
                            </Link>
                        </div>
                    </div>

                    {/* 検索・フィルターバー */}
                    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs mb-6 animate-fade-in space-y-3.5">
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
                            {/* キーワード検索 */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    placeholder="名前・メールアドレス・所属企業名等で検索..."
                                    style={{ paddingLeft: '2.5rem' }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all placeholder:text-slate-400"
                                />
                            </div>

                            {/* フィルターセレクト群 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2.5">
                                {/* プラン別フィルター */}
                                <div className="relative flex-1 lg:min-w-[140px]">
                                    <select
                                        value={planFilter}
                                        onChange={(e) => {
                                            setPlanFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl pl-3.5 pr-8 py-2.5 cursor-pointer focus:outline-none focus:border-slate-500 transition-colors"
                                    >
                                        <option value="all">すべてのプラン</option>
                                        <option value="full">FULLプラン</option>
                                        <option value="employment">MIERIS WORK</option>
                                        <option value="credit">MIERIS CREDIT</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                                        <Filter className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                                {/* 会社別フィルター */}
                                <div className="relative flex-1 lg:min-w-[160px]">
                                    <select
                                        value={companyFilter}
                                        onChange={(e) => {
                                            setCompanyFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl pl-3.5 pr-8 py-2.5 cursor-pointer focus:outline-none focus:border-slate-500 transition-colors truncate"
                                    >
                                        <option value="all">すべての所属会社</option>
                                        {uniqueCompanies.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                                        <Building2 className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                                {/* 権限別フィルター */}
                                <div className="relative flex-1 lg:min-w-[125px]">
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => {
                                            setRoleFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl pl-3.5 pr-8 py-2.5 cursor-pointer focus:outline-none focus:border-slate-500 transition-colors"
                                    >
                                        <option value="all">すべての権限</option>
                                        <option value="admin">管理者のみ</option>
                                        <option value="viewer">一般ユーザー</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                                        <Shield className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                                {/* 状態別フィルター */}
                                <div className="relative flex-1 lg:min-w-[140px]">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl pl-3.5 pr-8 py-2.5 cursor-pointer focus:outline-none focus:border-slate-500 transition-colors"
                                    >
                                        <option value="all">すべての状態</option>
                                        <option value="approved">承認済み（有効）</option>
                                        <option value="suspended">承認待ち・停止中</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    </div>
                                </div>

                                {/* フィルターリセットボタン */}
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="col-span-1 sm:col-span-2 lg:col-span-1 shrink-0 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 px-3 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                                        title="絞り込み条件をリセット"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>リセット</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ユーザー一覧 */}
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="glass-panel p-10 text-center rounded-2xl animate-fade-in">
                            <p className="text-slate-700">登録ユーザーはいません。</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="glass-panel p-10 text-center rounded-2xl animate-fade-in">
                            <p className="text-slate-700">該当するユーザーが見つかりませんでした。</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-3 animate-fade-in">
                                {paginatedUsers.map((user) => {
                                    const isBusy =
                                        deletingUserId === user.id ||
                                        updatingRoleUserId === user.id ||
                                        togglingStatusUserId === user.id;
                                    return (
                                        <div
                                            key={user.id}
                                            className={`glass-panel rounded-2xl border transition-all p-4 sm:p-5 ${
                                                user.is_approved
                                                    ? "border-slate-200 hover:border-slate-300"
                                                    : "border-rose-200 bg-rose-50/30 hover:border-rose-300"
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                                {/* 左側：ユーザー情報 */}
                                                <div className="flex-1 min-w-0">
                                                    {/* 上段：ユーザー名 & 権限・プラン・利用状態バッジ */}
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <h3 className="text-slate-900 font-bold text-base truncate">
                                                            {user.display_name || "未設定"}
                                                        </h3>
                                                        <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                                            user.role === 'admin' 
                                                                ? "bg-purple-50 text-purple-700 border border-purple-200" 
                                                                : "bg-slate-100 text-slate-700 border border-slate-200" 
                                                        }`}>
                                                            {user.role === 'admin' ? "管理者" : "一般ユーザー"}
                                                        </span>
                                                        {getPlanBadge(user.allowed_plan, user.companies?.plan_type)}
                                                        {user.is_approved ? (
                                                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                <span>有効</span>
                                                            </span>
                                                        ) : (
                                                            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold border border-rose-200">
                                                                <Ban className="w-3 h-3" />
                                                                <span>承認待ち・停止中</span>
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* 中段：所属会社 & メールアドレス */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs text-slate-600">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            <span className="font-semibold text-slate-800 break-words">{user.companies?.name || "未所属"}</span>
                                                        </div>
                                                        <span className="hidden sm:inline text-slate-300">|</span>
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            <span className="font-mono text-slate-500 break-all">{user.email || "—"}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 操作ボタン */}
                                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                                                    <button
                                                        onClick={() => handleToggleApproval(user)}
                                                        disabled={isBusy}
                                                        className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg transition-colors font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border ${
                                                            user.is_approved
                                                                ? "text-amber-700 hover:text-amber-900 border-amber-200 bg-amber-50/70 hover:bg-amber-100"
                                                                : "text-emerald-700 hover:text-white border-emerald-200 bg-emerald-50/70 hover:bg-emerald-600"
                                                        }`}
                                                        title={user.is_approved ? "アカウントを利用停止にする" : "アカウントを有効化（承認）する"}
                                                    >
                                                        {togglingStatusUserId === user.id ? (
                                                            <>
                                                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                <span>更新中...</span>
                                                            </>
                                                        ) : (
                                                            <span>{user.is_approved ? "利用停止" : "有効化"}</span>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleRole(user)}
                                                        disabled={isBusy}
                                                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 bg-white px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg transition-colors font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                                        title={user.role === 'admin' ? "一般ユーザーに変更" : "管理者に昇格"}
                                                    >
                                                        {updatingRoleUserId === user.id ? (
                                                            <>
                                                                <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                                                <span>変更中...</span>
                                                            </>
                                                        ) : (
                                                            <span>権限変更</span>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        disabled={isBusy}
                                                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-600 bg-rose-50/50 px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg transition-colors font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        {deletingUserId === user.id ? (
                                                            <>
                                                                <span className="w-3 h-3 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                                                                <span>削除中...</span>
                                                            </>
                                                        ) : (
                                                            <span>削除</span>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filteredUsers.length}
                                pageSize={PAGE_SIZE}
                                onPageChange={setCurrentPage}
                                className="bg-white rounded-xl border border-slate-200 px-4 shadow-2xs"
                            />
                        </div>
                    )}

                </div>
            </div>
        </RequireAdmin>
    );
}
