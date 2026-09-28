"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";

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

export default function RegisteredUsersPage() {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);

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
            alert("ユーザーを削除しました。");
        } catch (e: any) {
            alert("削除に失敗しました: " + e.message);
        }
    };

    return (
        <RequireAdmin>
            <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                <div className="max-w-5xl w-full">

                    <div className="flex items-center justify-between mb-8 animate-fade-in">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">登録済みユーザー一覧</h1>
                            <p className="text-slate-600">現在システムに登録されているユーザーの一覧です</p>
                        </div>
                        <Link href="/admin" className="btn-secondary text-xs">
                            管理者メニューへ戻る
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin h-10 w-10 border-4 border-white/40 rounded-full border-t-transparent"></div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="glass-panel p-10 text-center rounded-2xl animate-fade-in">
                            <p className="text-slate-700">登録ユーザーはいません。</p>
                        </div>
                    ) : (
                        <div className="space-y-3 animate-fade-in delay-100">
                            {users.map((user) => (
                                <div key={user.id} className="glass-panel rounded-2xl border border-white/10 hover:border-slate-200 transition-all p-5">
                                    <div className="flex items-center justify-between gap-4">
                                        {/* 左側：ユーザー情報 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1.5">
                                                <h3 className="text-slate-900 font-bold text-base truncate">
                                                    {user.display_name || "未設定"}
                                                </h3>
                                                <span className={`shrink-0 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === 'admin' ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" }`}>
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
                                                        alert("権限を更新しました。");
                                                    } catch (err: any) {
                                                        alert("更新に失敗しました: " + err.message);
                                                    }
                                                }}
                                                className="whitespace-nowrap text-xs text-slate-600 hover:text-white border border-slate-600 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
                                                title={user.role === 'admin' ? "一般ユーザーに降格" : "管理者に昇格"}
                                            >
                                                権限変更
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="whitespace-nowrap text-xs text-red-400 hover:text-white border border-red-500/30 hover:bg-red-500 px-3 py-1.5 rounded-lg transition-colors font-bold"
                                            >
                                                削除
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </RequireAdmin>
    );
}
