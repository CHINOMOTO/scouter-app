"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Toast, ToastMessage } from "@/components/Toast";
import { Pagination } from "@/components/Pagination";
import { 
    Users, 
    Search, 
    Plus, 
    ArrowLeft,
    Filter,
    RotateCcw,
    Building2,
    Shield
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
    const [currentPage, setCurrentPage] = useState(1);
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
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setUsers(data.users || []);
        } catch (error) {
            console.error("fetchUsers error:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // ユーザー削除
    const handleDeleteUser = async (userId: string) => {
        if (!confirm("本当にこのユーザーを削除しますか？\n※投稿データは保持されますが、ログインできなくなります。\nこの操作は取り消せません。")) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setUsers(prev => prev.filter(u => u.id !== userId));
            setToast({ type: "success", text: "ユーザーを削除しました。" });
        } catch (e: any) {
            setToast({ type: "error", text: "削除に失敗しました: " + e.message });
        }
    };

    // 権限変更
    const handleToggleRole = async (user: AppUser) => {
        if (user.role === 'admin') {
            const adminCount = users.filter(u => u.role === 'admin').length;
            if (adminCount <= 1) {
                alert("エラー: 最後の管理者は降格できません。\n少なくとも1人の管理者が存在する必要があります。");
                return;
            }
        }

        const newRole = user.role === 'admin' ? 'viewer' : 'admin';
        if (!confirm(`「${user.display_name}」の権限を【${newRole === 'admin' ? '管理者' : '一般ユーザー'}】に変更しますか？`)) return;

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
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
            setToast({ type: "success", text: `権限を「${newRole === 'admin' ? '管理者' : '一般ユーザー'}」に更新しました。` });
        } catch (err: any) {
            setToast({ type: "error", text: "更新に失敗しました: " + err.message });
        }
    };

    // 複合フィルタリング（プラン別・会社別・権限別・キーワード）
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
    }, [users, searchTerm, planFilter, companyFilter, roleFilter]);

    const hasActiveFilters = searchTerm.trim() !== "" || planFilter !== "all" || companyFilter !== "all" || roleFilter !== "all";

    const resetFilters = () => {
        setSearchTerm("");
        setPlanFilter("all");
        setCompanyFilter("all");
        setRoleFilter("all");
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE) || 1;
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredUsers.slice(start, start + PAGE_SIZE);
    }, [filteredUsers, currentPage]);

    return (
        <RequireAdmin>
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-5xl w-full">

                    {/* ページヘッダー */}
                    <div className="flex items-center justify-between mb-8 animate-fade-in flex-wrap sm:flex-nowrap gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ユーザー管理</h1>
                                {!loading && (
                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                                        {hasActiveFilters ? `該当 ${filteredUsers.length} 件 / 全 ${users.length} 件` : `全 ${users.length} 件`}
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-600 text-sm mt-1">登録ユーザーの利用プラン・権限確認、所属企業の管理を行います</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/admin" className="btn-secondary text-xs h-10 px-4 flex items-center font-bold">
                                管理者メニューへ戻る
                            </Link>
                            <Link href="/admin/users/new" className="btn-primary flex items-center gap-2 px-5 py-2.5 hover:-translate-y-0.5 transition-all rounded-xl font-bold text-sm shadow-xs">
                                <Plus className="w-4 h-4" />
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
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                                {/* プラン別フィルター */}
                                <div className="relative min-w-[150px] flex-1 sm:flex-initial">
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
                                <div className="relative min-w-[170px] flex-1 sm:flex-initial">
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
                                <div className="relative min-w-[130px] flex-1 sm:flex-initial">
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

                                {/* フィルターリセットボタン */}
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="shrink-0 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 px-3 py-2.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
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
                                {paginatedUsers.map((user) => (
                                    <div key={user.id} className="glass-panel rounded-2xl border border-slate-200 hover:border-slate-300 transition-all p-5">
                                        <div className="flex items-center justify-between gap-4">
                                            {/* 左側：ユーザー情報 */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                    <h3 className="text-slate-900 font-bold text-base truncate">
                                                        {user.display_name || "未設定"}
                                                    </h3>
                                                    <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-slate-100 text-slate-700 border border-slate-200" }`}>
                                                        {user.role}
                                                    </span>
                                                    {getPlanBadge(user.allowed_plan, user.companies?.plan_type)}
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-slate-600">
                                                    <span>{user.companies?.name || "未所属"}</span>
                                                    <span className="text-slate-400">|</span>
                                                    <span className="font-mono">{user.email || "—"}</span>
                                                </div>
                                            </div>

                                            {/* 右側：操作ボタン */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleToggleRole(user)}
                                                    className="whitespace-nowrap text-xs text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                                                    title={user.role === 'admin' ? "一般ユーザーに降格" : "管理者に昇格"}
                                                >
                                                    権限変更
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="whitespace-nowrap text-xs text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-600 px-3 py-1.5 rounded-lg transition-colors font-bold"
                                                >
                                                    削除
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
