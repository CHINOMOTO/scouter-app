"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Inbox } from "lucide-react";
import { RequireAdmin } from "@/components/RequireAdmin";

type Inquiry = {
    id: string;
    user_name: string;
    company_name: string;
    email: string;
    phone_number: string | null;
    category: string;
    message: string;
    status: string;
    created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
    bug: "システム不具合の報告",
    feature: "機能の追加・改善要望",
    account: "アカウントに関する相談",
    other: "その他",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    unread: { label: "未読", className: "bg-red-50 text-red-700 border-red-200 font-bold" },
    in_progress: { label: "対応中", className: "bg-amber-50 text-amber-800 border-amber-200 font-bold" },
    resolved: { label: "対応済み", className: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold" },
};

export default function AdminInquiriesPage() {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

    useEffect(() => {
        const fetchInquiries = async () => {
            const { data, error } = await supabase
                .from("contact_inquiries")
                .select("*")
                .order("created_at", { ascending: false });

            if (!error && data) {
                setInquiries(data);
            }
            setLoading(false);
        };
        fetchInquiries();
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from("contact_inquiries")
            .update({ status: newStatus })
            .eq("id", id);

        if (!error) {
            setInquiries(prev =>
                prev.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq)
            );
            if (selectedInquiry?.id === id) {
                setSelectedInquiry(prev => prev ? { ...prev, status: newStatus } : null);
            }
        }
    };

    return (
        <RequireAdmin>
            <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                <div className="max-w-5xl w-full relative z-10">
                    {/* ヘッダー */}
                    <div className="flex items-center justify-between mb-8 animate-fade-in">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
                                お問い合わせ管理
                            </h1>
                            <p className="text-slate-600">
                                ユーザーからのお問い合わせを確認・管理します
                            </p>
                        </div>
                        <Link href="/admin" className="btn-secondary text-xs px-4 py-2.5">
                            管理者メニューへ戻る
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900"></div>
                        </div>
                    ) : inquiries.length === 0 ? (
                        <div className="glass-panel rounded-3xl p-10 text-center animate-fade-in border border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4"><Inbox className="w-8 h-8" /></div>
                            <p className="text-slate-600 font-medium">お問い合わせはまだありません。</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            {inquiries.map((inq) => (
                                <button
                                    key={inq.id}
                                    onClick={() => setSelectedInquiry(inq)}
                                    className={`w-full text-left glass-panel rounded-2xl p-5 border transition-all hover:-translate-y-0.5 ${inq.status === 'unread' ? 'border-red-500/30 hover:border-red-500/50' : 'border-slate-200 hover:border-slate-200' }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${STATUS_LABELS[inq.status]?.className || ''}`}>
                                                {STATUS_LABELS[inq.status]?.label || inq.status}
                                            </span>
                                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                {CATEGORY_LABELS[inq.category] || inq.category}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500 font-mono">
                                            {new Date(inq.created_at).toLocaleString("ja-JP")}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mb-2">
                                        <span className="text-sm text-slate-700 font-bold">{inq.company_name}</span>
                                        <span className="text-sm text-slate-600">{inq.user_name}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 line-clamp-2">
                                        {inq.message}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 詳細モーダル */}
            {selectedInquiry && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in"
                    onClick={() => setSelectedInquiry(null)}
                >
                    <div
                        className="glass-panel rounded-3xl p-8 max-w-xl w-full mx-4 border border-slate-200 max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ステータスバッジ */}
                        <div className="flex items-center justify-between mb-6">
                            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${STATUS_LABELS[selectedInquiry.status]?.className || ''}`}>
                                {STATUS_LABELS[selectedInquiry.status]?.label || selectedInquiry.status}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                                {new Date(selectedInquiry.created_at).toLocaleString("ja-JP")}
                            </span>
                        </div>

                        {/* 情報 */}
                        <div className="space-y-4 mb-6">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">お問い合わせ種類</p>
                                <p className="text-sm text-slate-900 font-bold">{CATEGORY_LABELS[selectedInquiry.category] || selectedInquiry.category}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">

                                <div>
                                    <p className="text-xs text-slate-500 mb-1">電話番号</p>
                                    <p className="text-sm text-slate-800 font-mono">{selectedInquiry.phone_number || "未入力"}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-slate-500 mb-1">会社名</p>
                                    <p className="text-sm text-slate-800">{selectedInquiry.company_name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">ユーザー名</p>
                                    <p className="text-sm text-slate-800">{selectedInquiry.user_name}</p>
                                </div>
                            </div>
                            
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">メールアドレス</p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-slate-800 font-mono">{selectedInquiry.email}</p>
                                        <a 
                                            href={`mailto:${selectedInquiry.email}?subject=【MIERIS】お問い合わせの件について&body=${selectedInquiry.company_name}%0D%0A${selectedInquiry.user_name} 様%0D%0A%0D%0Aお問い合わせありがとうございます。%0D%0A%0D%0A%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%0D%0A【お問い合わせ内容】%0D%0A${selectedInquiry.message}%0D%0A%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%3D%0D%0A%0D%0A`}
                                            className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded hover:bg-slate-100 transition-colors border border-slate-300 flex items-center gap-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                            メールで返信
                                        </a>
                                    </div>
                                </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">お問い合わせ内容</p>
                                <div className="bg-white rounded-xl p-4 border border-slate-200">
                                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{selectedInquiry.message}</p>
                                </div>
                            </div>
                        </div>

                        {/* ステータス変更ボタン */}
                        <div className="border-t border-slate-200 pt-5">
                            <p className="text-xs text-slate-500 mb-3">ステータスを変更</p>
                            <div className="flex gap-2">
                                {Object.entries(STATUS_LABELS).map(([key, val]) => (
                                    <button
                                        key={key}
                                        onClick={() => updateStatus(selectedInquiry.id, key)}
                                        disabled={selectedInquiry.status === key}
                                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${selectedInquiry.status === key
                                            ? `${val.className} opacity-100`
                                            : 'border-slate-200 text-slate-600 hover:border-slate-500'
                                            } disabled:cursor-not-allowed`}
                                    >
                                        {val.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 閉じる */}
                        <button
                            onClick={() => setSelectedInquiry(null)}
                            className="w-full mt-5 py-3 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-500 rounded-xl transition-all"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}
        </RequireAdmin>
    );
}
