"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Toast, ToastMessage } from "@/components/Toast";
import { Pagination } from "@/components/Pagination";
import { Search } from "lucide-react";

type AppUser = {
    id: string;
    role: string;
    display_name: string | null;
    companies: {
        id: string;
        name: string;
    } | null;
    is_approved: boolean;
    email?: string;
    created_at?: string;
};

const PAGE_SIZE = 15;

export default function RegisteredUsersPage() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [toast, setToast] = useState<ToastMessage | null>(null);

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
            console.error(error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // 削除機能
    const handleDelete = async (userId: string) => {
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

    const filteredUsers = useMemo(() => {
        if (!searchTerm.trim()) return users;
        const q = searchTerm.trim().toLowerCase();
        return users.filter(u => {
            const name = (u.display_name || "").toLowerCase();
            const email = (u.email || "").toLowerCase();
            const comp = (u.companies?.name || "").toLowerCase();
            const role = (u.role || "").toLowerCase();
            return name.includes(q) || email.includes(q) || comp.includes(q) || role.includes(q);
        });
    }, [users, searchTerm]);

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

                    <div className="flex items-center justify-between mb-8 animate-fade-in flex-wrap sm:flex-nowrap gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">登録済みユーザー一覧</h1>
                                {!loading && (
                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                                        全 {filteredUsers.length} 件
                                    </span>
                                )}
                            </div>
                            <p className="text-slate-600 text-sm mt-1">現在システムに登録されているユーザーの一覧です</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/admin" className="btn-secondary text-xs h-10 px-4 flex items-center font-bold">
                                管理者メニューへ戻る
                            </Link>
                            <Link href="/admin/users/new" className="btn-primary flex items-center gap-2 px-5 py-2.5 hover:-translate-y-0.5 transition-all rounded-xl font-bold text-sm">
                                <span>+</span> アカウント新規発行
                            </Link>
                        </div>
                    </div>

                    {/* 検索コントロールバー */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs mb-6 animate-fade-in">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="名前・メールアドレス・所属企業名で絞り込み..."
                                style={{ paddingLeft: '2.5rem' }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="glass-panel p-10 text-center rounded-2xl animate-fade-in">
                            <p className="text-slate-700">登録ユーザーはいません。</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-3 animate-fade-in delay-100">
                                {paginatedUsers.map((user) => (
                                    <div key={user.id} className="glass-panel rounded-2xl border border-slate-200 hover:border-slate-200 transition-all p-5">
                                        <div className="flex items-center justify-between gap-4">
                                            {/* 左側：ユーザー情報 */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1.5">
                                                    <h3 className="text-slate-900 font-bold text-base truncate">
                                                        {user.display_name || "未設定"}
                                                    </h3>
                                                    <span className={`shrink-0 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-slate-100 text-slate-700 border border-slate-200" }`}>
                                                        {user.role}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-slate-600">
                                                    <span>{user.companies?.name || "未所属"}</span>
                                                    <span className="text-slate-600">|</span>
                                                    <span className="font-mono">{user.email || "—"}</span>
                                                </div>
                                            </div>

                                            {/* 右側：操作ボタン */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={async () => {
                                                        if (user.role === 'admin') {
                                                            const adminCount = users.filter(u => u.role === 'admin').length;
                                                            if (adminCount <= 1) {
                                                                alert("エラー: 最後の管理者は降格できません。\n少なくとも1人の管理者が存在する必要があります。");
                                                                return;
                                                            }
                                                        }

                                                        const newRole = user.role === 'admin' ? 'viewer' : 'admin';
                                                        if (!confirm(`「${user.display_name}」の権限を【${newRole.toUpperCase()}】に変更しますか？`)) return;

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
                                                    }}
                                                    className="whitespace-nowrap text-xs text-slate-600 hover:text-slate-900 border border-slate-600 hover:bg-slate-900 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
                                                    title={user.role === 'admin' ? "一般ユーザーに降格" : "管理者に昇格"}
                                                >
                                                    権限変更
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
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
