"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle2, ArrowLeft, Plus, Clock, UserX } from "lucide-react";
import { RequireAdmin } from "@/components/RequireAdmin";

type AppUser = {
    id: string;
    role: string;
    display_name: string | null;
    companies: {
        id: string;
        name: string;
    } | null;
    is_approved: boolean; // boolean
    email?: string; // joinで取ってくるのは難しいが、authからは取れないのであきらめるか、別途取得
    // note: Supabaseでauth.usersとpublicテーブルをjoinするのはセキュリティ上難しいので、
    // ここではpublic.app_usersの情報だけで表示する。Emailが必要ならEdge Functionが必要。
    created_at?: string;
};

export default function AdminUsersPage() {
    const [pendingUsers, setPendingUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPendingUsers = async () => {
        setLoading(true);
        // 未承認(is_approved = false)のユーザーを取得
        const { data, error } = await supabase
            .from("app_users")
            .select(`
        id,
        role,
        display_name,
        is_approved,
        companies ( id, name )
      `)
            .eq("is_approved", false);

        if (error) {
            console.error(error);
        } else {
            setPendingUsers((data as any) || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const handleApprove = async (userId: string) => {
        const { error } = await supabase
            .from("app_users")
            .update({ is_approved: true })
            .eq("id", userId);

        if (!error) {
            // リストから削除して更新
            setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
        } else {
            alert("承認に失敗しました: " + error.message);
        }
    };

    return (
        <RequireAdmin>
            <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                <div className="max-w-5xl w-full">

                    <div className="flex items-center justify-between mb-8 animate-fade-in">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">新規ユーザー承認</h1>
                            <p className="text-slate-600">新規利用申請の確認と承認を行います</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href="/admin" className="btn-secondary text-xs h-10 px-4 flex items-center">
                                管理メニューへ戻る
                            </Link>
                            <Link href="/admin/users/new" className="btn-primary flex items-center gap-2 px-5 py-2.5 hover:-translate-y-0.5 transition-all rounded-xl font-bold text-sm">
                                <Plus className="w-4 h-4" /> <span>アカウント新規発行</span>
                            </Link>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                        </div>
                    ) : pendingUsers.length === 0 ? (
                        <div className="glass-panel p-10 text-center rounded-2xl animate-fade-in">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600"><CheckCircle2 className="w-8 h-8" /></div>
                            <p className="text-slate-700">現在、未承認のユーザーはいません。</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 animate-fade-in delay-100">
                            {pendingUsers.map((user) => (
                                <div key={user.id} className="glass-panel p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 card-hover">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold text-slate-900">{user.display_name || "名無し"}</h3>
                                            <span className="px-2 py-0.5 inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                                                PENDING
                                            </span>
                                        </div>
                                        <div className="text-slate-600 text-sm flex items-center gap-2">
                                            <span className="text-slate-500">所属:</span>
                                            {user.companies?.name || "未所属"}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 w-full md:w-auto">
                                        <button
                                            onClick={() => {
                                                if (confirm("このユーザーを承認しますか？")) handleApprove(user.id);
                                            }}
                                            className="btn-primary flex-grow md:flex-grow-0 whitespace-nowrap"
                                        >
                                            承認する
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (confirm("本当にこの申請を却下（削除）しますか？\n※この操作は取り消せません。")) {
                                                    const { error } = await supabase
                                                        .from("app_users")
                                                        .delete()
                                                        .eq("id", user.id);

                                                    if (!error) {
                                                        setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
                                                    } else {
                                                        alert("却下に失敗しました: " + error.message);
                                                    }
                                                }
                                            }}
                                            className="px-4 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all text-sm font-bold whitespace-nowrap"
                                        >
                                            却下
                                        </button>
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
