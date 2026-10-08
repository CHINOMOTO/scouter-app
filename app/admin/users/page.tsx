"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Toast, ToastMessage } from "@/components/Toast";
import { Pagination } from "@/components/Pagination";
import { 
    Users, 
    UserCheck, 
    Clock, 
    Search, 
    Plus, 
    CheckCircle2, 
    ArrowLeft, 
    ShieldCheck, 
    UserX 
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
        case 'employment': return "就業情報のみ";
        case 'credit': return "クレジットのみ";
        case 'full':
        default: return "両方セット";
    }
};

const getPlanBadge = (allowedPlan?: string | null, companyPlan?: string | null) => {
    const plan = allowedPlan || companyPlan || 'full';
    switch (plan) {
        case 'employment':
            return (
                <span className="shrink-0 inline-flex items-center text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-300">
                    就業情報のみ
                </span>
            );
        case 'credit':
            return (
                <span className="shrink-0 inline-flex items-center text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-200">
                    クレジットのみ
                </span>
            );
        case 'full':
        default:
            return (
                <span className="shrink-0 inline-flex items-center text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200">
                    両方セット
                </span>
            );
    }
};

function AdminUsersManagementContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialTab = searchParams.get("tab") === "pending" ? "pending" : "active";

    const [activeTab, setActiveTab] = useState<"active" | "pending">(initialTab);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    // 承認済みユーザー
    const [approvedUsers, setApprovedUsers] = useState<AppUser[]>([]);
    const [approvedLoading, setApprovedLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [approvedPage, setApprovedPage] = useState(1);

    // 未承認ユーザー
    const [pendingUsers, setPendingUsers] = useState<AppUser[]>([]);
    const [pendingLoading, setPendingLoading] = useState(true);
    const [pendingPage, setPendingPage] = useState(1);

    // 承認済みユーザー取得 (/api/admin/users は is_approved = true を返す)
    const fetchApprovedUsers = async () => {
        setApprovedLoading(true);
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

            setApprovedUsers(data.users || []);
        } catch (error) {
            console.error("fetchApprovedUsers error:", error);
        }
        setApprovedLoading(false);
    };

    // 未承認ユーザー取得 (is_approved = false)
    const fetchPendingUsers = async () => {
        setPendingLoading(true);
        try {
            const { data, error } = await supabase
                .from("app_users")
                .select(`
                    id,
                    role,
                    display_name,
                    is_approved,
                    allowed_plan,
                    created_at,
                    companies ( id, name, plan_type )
                `)
                .eq("is_approved", false)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setPendingUsers((data as any) || []);
        } catch (error) {
            console.error("fetchPendingUsers error:", error);
        }
        setPendingLoading(false);
    };

    useEffect(() => {
        fetchApprovedUsers();
        fetchPendingUsers();
    }, []);

    // タブ切り替え時にURLパラメータも同期
    const handleTabChange = (tab: "active" | "pending") => {
        setActiveTab(tab);
        const url = new URL(window.location.href);
        if (tab === "pending") {
            url.searchParams.set("tab", "pending");
        } else {
            url.searchParams.delete("tab");
        }
        window.history.replaceState({}, "", url.toString());
    };

    // 承認アクション
    const handleApprove = async (userId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error("認証セッションが見つかりません。");

            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ is_approved: true })
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || "承認処理に失敗しました");
            }

            // 未承認リストから削除し、承認済みリストを再取得
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
            fetchApprovedUsers();
            setToast({ type: "success", text: "ユーザーを承認しました（ログイン権限が有効化されました）。" });
        } catch (err: any) {
            setToast({ type: "error", text: "承認に失敗しました: " + err.message });
        }
    };

    // 却下（削除）アクション（未承認）
    const handleReject = async (userId: string) => {
        if (!confirm("本当にこの申請を却下（削除）しますか？\n※この操作は取り消せません。")) return;

        try {
            const { error } = await supabase
                .from("app_users")
                .delete()
                .eq("id", userId);

            if (error) throw error;

            setPendingUsers(prev => prev.filter(u => u.id !== userId));
            setToast({ type: "success", text: "申請を却下（削除）しました。" });
        } catch (error: any) {
            setToast({ type: "error", text: "却下に失敗しました: " + error.message });
        }
    };

    // ユーザー削除（登録済み）
    const handleDeleteApprovedUser = async (userId: string) => {
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

            setApprovedUsers(prev => prev.filter(u => u.id !== userId));
            setToast({ type: "success", text: "ユーザーを削除しました。" });
        } catch (e: any) {
            setToast({ type: "error", text: "削除に失敗しました: " + e.message });
        }
    };

    // 権限変更アクション
    const handleToggleRole = async (user: AppUser) => {
        if (user.role === 'admin') {
            const adminCount = approvedUsers.filter(u => u.role === 'admin').length;
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

            setApprovedUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
            setToast({ type: "success", text: `権限を「${newRole === 'admin' ? '管理者' : '一般ユーザー'}」に更新しました。` });
        } catch (err: any) {
            setToast({ type: "error", text: "更新に失敗しました: " + err.message });
        }
    };

    // 検索フィルタリング
    const filteredApprovedUsers = useMemo(() => {
        if (!searchTerm.trim()) return approvedUsers;
        const q = searchTerm.trim().toLowerCase();
        return approvedUsers.filter(u => {
            const name = (u.display_name || "").toLowerCase();
            const email = (u.email || "").toLowerCase();
            const comp = (u.companies?.name || "").toLowerCase();
            const role = (u.role || "").toLowerCase();
            const plan = (u.allowed_plan || u.companies?.plan_type || "").toLowerCase();
            const planLabel = getPlanName(u.allowed_plan, u.companies?.plan_type).toLowerCase();
            return name.includes(q) || email.includes(q) || comp.includes(q) || role.includes(q) || plan.includes(q) || planLabel.includes(q);
        });
    }, [approvedUsers, searchTerm]);

    const totalApprovedPages = Math.ceil(filteredApprovedUsers.length / PAGE_SIZE) || 1;
    const paginatedApprovedUsers = useMemo(() => {
        const start = (approvedPage - 1) * PAGE_SIZE;
        return filteredApprovedUsers.slice(start, start + PAGE_SIZE);
    }, [filteredApprovedUsers, approvedPage]);

    const totalPendingPages = Math.ceil(pendingUsers.length / PAGE_SIZE) || 1;
    const paginatedPendingUsers = useMemo(() => {
        const start = (pendingPage - 1) * PAGE_SIZE;
        return pendingUsers.slice(start, start + PAGE_SIZE);
    }, [pendingUsers, pendingPage]);

    return (
        <RequireAdmin>
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-5xl w-full">

                    {/* ページヘッダー */}
                    <div className="flex items-center justify-between mb-6 animate-fade-in flex-wrap sm:flex-nowrap gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ユーザー管理</h1>
                                {pendingUsers.length > 0 && (
                                    <span className="text-xs font-bold text-white bg-rose-500 px-2.5 py-0.5 rounded-full font-mono animate-pulse">
                                        承認待ち {pendingUsers.length} 件
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-600 text-sm mt-1">登録ユーザーの権限・所属企業管理、および新規利用申請の承認を行います</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/admin" className="btn-secondary text-xs h-10 px-4 flex items-center font-bold">
                                管理者メニューへ戻る
                            </Link>
                            <Link href="/admin/users/new" className="btn-primary flex items-center gap-2 px-5 py-2.5 hover:-translate-y-0.5 transition-all rounded-xl font-bold text-sm">
                                <Plus className="w-4 h-4" />
                                <span>アカウント新規発行</span>
                            </Link>
                        </div>
                    </div>

                    {/* タブナビゲーション */}
                    <div className="flex border-b border-slate-200 mb-6 gap-2">
                        <button
                            type="button"
                            onClick={() => handleTabChange("active")}
                            className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                                activeTab === "active"
                                    ? "border-slate-900 text-slate-900"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <UserCheck className="w-4 h-4" />
                            <span>登録ユーザー一覧</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                                activeTab === "active" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                            }`}>
                                {approvedUsers.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleTabChange("pending")}
                            className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors relative ${
                                activeTab === "pending"
                                    ? "border-slate-900 text-slate-900"
                                    : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            <Clock className="w-4 h-4" />
                            <span>承認待ち申請</span>
                            {pendingUsers.length > 0 ? (
                                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500 text-white">
                                    {pendingUsers.length}
                                </span>
                            ) : (
                                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-100 text-slate-600">
                                    0
                                </span>
                            )}
                        </button>
                    </div>

                    {/* TAB 1: 登録ユーザー一覧 */}
                    {activeTab === "active" && (
                        <div>
                            {/* 検索バー */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs mb-6 animate-fade-in">
                                <div className="relative w-full max-w-md">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setApprovedPage(1);
                                        }}
                                        placeholder="名前・メールアドレス・所属企業名・プラン名で絞り込み..."
                                        style={{ paddingLeft: '2.5rem' }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            {approvedLoading ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                                </div>
                            ) : approvedUsers.length === 0 ? (
                                <div className="glass-panel p-10 text-center rounded-2xl animate-fade-in">
                                    <p className="text-slate-700">登録ユーザーはいません。</p>
                                </div>
                            ) : filteredApprovedUsers.length === 0 ? (
                                <div className="glass-panel p-10 text-center rounded-2xl animate-fade-in">
                                    <p className="text-slate-700">該当するユーザーが見つかりませんでした。</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-3 animate-fade-in">
                                        {paginatedApprovedUsers.map((user) => (
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
                                                            onClick={() => handleDeleteApprovedUser(user.id)}
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
                                        currentPage={approvedPage}
                                        totalPages={totalApprovedPages}
                                        totalItems={filteredApprovedUsers.length}
                                        pageSize={PAGE_SIZE}
                                        onPageChange={setApprovedPage}
                                        className="bg-white rounded-xl border border-slate-200 px-4 shadow-2xs"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: 承認待ち申請 */}
                    {activeTab === "pending" && (
                        <div>
                            {pendingLoading ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                                </div>
                            ) : pendingUsers.length === 0 ? (
                                <div className="glass-panel p-10 text-center rounded-2xl animate-fade-in">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-slate-900 font-bold mb-1">未承認の申請はありません</h3>
                                    <p className="text-slate-500 text-xs">新規ユーザーからの利用申請が届くとここに表示されます。</p>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="space-y-3">
                                        {paginatedPendingUsers.map((user) => (
                                            <div key={user.id} className="glass-panel rounded-2xl border border-amber-200 bg-amber-50/20 p-5">
                                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                            <h3 className="text-slate-900 font-bold text-base truncate">
                                                                {user.display_name || "名無し"}
                                                            </h3>
                                                            <span className="px-2 py-0.5 inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-bold rounded border border-amber-200 uppercase tracking-wider">
                                                                承認待ち
                                                            </span>
                                                            {getPlanBadge(user.allowed_plan, user.companies?.plan_type)}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-slate-600">
                                                            <span className="font-medium">所属: {user.companies?.name || "未所属"}</span>
                                                            <span className="text-slate-400">|</span>
                                                            <span className="font-mono">{user.email || "—"}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 w-full md:w-auto shrink-0">
                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`「${user.display_name}」を承認しますか？`)) {
                                                                    handleApprove(user.id);
                                                                }
                                                            }}
                                                            className="btn-primary flex-1 md:flex-initial text-xs h-9 px-4 rounded-lg font-bold"
                                                        >
                                                            承認する
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(user.id)}
                                                            className="px-3.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all text-xs font-bold whitespace-nowrap"
                                                        >
                                                            却下
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Pagination
                                        currentPage={pendingPage}
                                        totalPages={totalPendingPages}
                                        totalItems={pendingUsers.length}
                                        pageSize={PAGE_SIZE}
                                        onPageChange={setPendingPage}
                                        className="bg-white rounded-xl border border-slate-200 px-4 shadow-2xs"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </RequireAdmin>
    );
}

export default function AdminUsersManagementPage() {
    return (
        <Suspense fallback={
            <RequireAdmin>
                <div className="min-h-screen pt-20 flex justify-center items-center bg-[#f8fafc]">
                    <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                </div>
            </RequireAdmin>
        }>
            <AdminUsersManagementContent />
        </Suspense>
    );
}
