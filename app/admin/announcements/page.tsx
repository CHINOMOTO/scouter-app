"use client";

import { useEffect, useState } from "react";
import { RequireAdmin } from "@/components/RequireAdmin";
import { supabase } from "@/lib/supabaseClient";
import { Bell, Plus, Trash2, Power, PowerOff } from "lucide-react";

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
            <div className="min-h-screen pt-24 pb-12 px-4">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 rounded-2xl bg-slate-100 text-slate-900">
                            <Bell className="w-8 h-8" strokeWidth={1.5} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold font-sans tracking-wider text-slate-900">ANNOUNCEMENTS</h1>
                            <p className="text-slate-600">お知らせ管理</p>
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
                                        placeholder="例：システムメンテナンスのお知らせ"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 font-bold mb-2">本文</label>
                                    <textarea 
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="input-field h-32 resize-none" 
                                        placeholder="例：〇月〇日にメンテナンスを実施します..."
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
                            <p className="text-center text-slate-600 py-8">読み込み中...</p>
                        ) : announcements.length === 0 ? (
                            <p className="text-center text-slate-600 py-8">お知らせはありません。</p>
                        ) : (
                            announcements.map((item) => (
                                <div key={item.id} className="glass-panel p-6 rounded-3xl relative overflow-hidden">
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-600'}`}>
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
                                                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${item.is_active ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}
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
