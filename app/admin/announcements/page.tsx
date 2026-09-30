"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAdmin } from "@/components/RequireAdmin";
import { supabase } from "@/lib/supabaseClient";
import { Bell, Plus, Trash2, Power, PowerOff, ArrowLeft, ShieldCheck } from "lucide-react";

type Announcement = {
    id: string;
    title: string;
    content: string;
    is_active: boolean;
    created_at: string;
};

export default function AdminAnnouncements() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isPosting, setIsPosting] = useState(false);

    const fetchAnnouncements = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const res = await fetch("/api/admin/announcements", {
                headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                const json = await res.json();
                setAnnouncements(json.data || []);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;
        setIsPosting(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await fetch("/api/admin/announcements", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ title, content, is_active: true })
            });
            setTitle("");
            setContent("");
            fetchAnnouncements();
        }
        setIsPosting(false);
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await fetch(`/api/admin/announcements/${id}`, {
                method: "PATCH",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            fetchAnnouncements();
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("本当に削除しますか？")) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await fetch(`/api/admin/announcements/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${session.access_token}` }
            });
            fetchAnnouncements();
        }
    };

    return (
        <RequireAdmin>
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-4xl w-full space-y-8">
                    {/* ヘッダーエリア */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white tracking-wider">
                                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                    ADMIN CONSOLE
                                </span>
                            </div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                お知らせ管理
                            </h1>
                            <p className="text-slate-600 text-sm mt-1">
                                システムメンテナンスや重要なお知らせの作成・管理を行います。
                            </p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <Link
                                href="/admin"
                                className="btn-secondary text-xs h-10 px-4 rounded-xl flex items-center gap-1.5 font-bold transition-colors whitespace-nowrap shadow-2xs"
                            >
                                <ArrowLeft className="w-4 h-4 shrink-0" />
                                <span>管理者メニューへ戻る</span>
                            </Link>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10">
                            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-slate-900" />
                                新規お知らせ作成
                            </h2>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-slate-600 font-bold mb-2">タイトル</label>
                                    <input 
                                        type="text" 
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="input-field" 
                                        placeholder="例: システムメンテナンスのお知らせ"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 font-bold mb-2">本文</label>
                                    <textarea 
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="input-field h-32 resize-none" 
                                        placeholder="例: 〇月〇日にメンテナンスを実施します..."
                                        required
                                    />
                                </div>
                                <button type="submit" disabled={isPosting} className="btn-primary w-full flex items-center justify-center gap-2">
                                    {isPosting ? "投稿中..." : "お知らせを投稿する"}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                                <p className="text-sm text-slate-600 font-medium">お知らせを読み込み中...</p>
                            </div>
                        ) : announcements.length === 0 ? (
                            <p className="text-center text-slate-600 py-8">お知らせはありません。</p>
                        ) : (
                            announcements.map((item) => (
                                <div key={item.id} className="glass-panel p-6 rounded-3xl relative overflow-hidden">
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${item.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                    {item.is_active ? '公開中' : '非公開'}
                                                </span>
                                                <span className="text-slate-600 text-sm">
                                                    {new Date(item.created_at).toLocaleString('ja-JP')}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 mb-1">{item.title}</h3>
                                            <p className="text-slate-600 text-sm whitespace-pre-wrap">{item.content}</p>
                                        </div>
                                        <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                                            <button 
                                                onClick={() => toggleStatus(item.id, item.is_active)}
                                                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${item.is_active ? 'border-amber-300 text-amber-700 hover:bg-amber-50' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}
                                            >
                                                {item.is_active ? '非公開にする' : '公開にする'}
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(item.id)}
                                                className="px-4 py-2 rounded-xl text-sm font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </RequireAdmin>
    );
}
