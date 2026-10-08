"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAuth } from "@/components/RequireAuth";
import { Toast, ToastMessage } from "@/components/Toast";
import { 
    User, 
    ArrowLeft, 
    Lock, 
    CheckCircle2, 
    AlertCircle, 
    Building2, 
    ShieldCheck, 
    Phone, 
    Mail, 
    KeyRound,
    Save
} from "lucide-react";

type UserProfile = {
    id: string;
    email: string;
    displayName: string;
    phoneNumber: string;
    companyName: string | null;
    role: string;
    isApproved: boolean;
    createdAt: string;
};

export default function ProfileAndSettingsPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    // プロフィール編集用 state
    const [editDisplayName, setEditDisplayName] = useState("");
    const [editPhoneNumber, setEditPhoneNumber] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // パスワード変更用 state
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: appUser } = await supabase
                .from("app_users")
                .select("id, display_name, phone_number, company_id, role, is_approved, created_at, companies ( name )")
                .eq("id", user.id)
                .maybeSingle();

            const dName = appUser?.display_name || user.user_metadata?.display_name || "未設定";
            const pNum = appUser?.phone_number || "";
            const compName = (appUser?.companies as any)?.name || null;

            setProfile({
                id: user.id,
                email: user.email || "",
                displayName: dName,
                phoneNumber: pNum,
                companyName: compName,
                role: appUser?.role || "viewer",
                isApproved: appUser?.is_approved ?? false,
                createdAt: appUser?.created_at || user.created_at || "",
            });

            setEditDisplayName(dName === "未設定" ? "" : dName);
            setEditPhoneNumber(pNum);
        } catch (err) {
            console.error("Profile fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    // 基本情報・表示名の更新
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;
        setIsSavingProfile(true);

        try {
            const { error } = await supabase
                .from("app_users")
                .update({ 
                    display_name: editDisplayName, 
                    phone_number: editPhoneNumber 
                })
                .eq("id", profile.id);

            if (error) throw error;

            // auth側メタデータも更新
            await supabase.auth.updateUser({
                data: { display_name: editDisplayName }
            });

            setProfile(prev => prev ? {
                ...prev,
                displayName: editDisplayName || "未設定",
                phoneNumber: editPhoneNumber
            } : null);

            setToast({ type: "success", text: "基本情報を更新しました。" });
        } catch (err: any) {
            setToast({ type: "error", text: "更新に失敗しました: " + (err.message || "") });
        } finally {
            setIsSavingProfile(false);
        }
    };

    // パスワード変更
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingPassword(true);

        if (newPassword !== confirmPassword) {
            setToast({ type: "error", text: "パスワードが一致しません。" });
            setIsSavingPassword(false);
            return;
        }

        if (newPassword.length < 8) {
            setToast({ type: "error", text: "パスワードは8文字以上で入力してください。" });
            setIsSavingPassword(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setToast({ type: "success", text: "パスワードを更新しました。" });
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setToast({ type: "error", text: "パスワード更新に失敗しました: " + (err.message || "") });
        } finally {
            setIsSavingPassword(false);
        }
    };

    const roleLabel = (role: string) => {
        switch (role) {
            case "admin": return "管理者";
            case "viewer": return "一般ユーザー";
            default: return role;
        }
    };

    return (
        <RequireAuth>
            <Toast toast={toast} onClose={() => setToast(null)} />
            <div className="min-h-screen pt-20 md:pt-10 pb-16 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-3xl w-full">

                    {/* ナビゲーションバー */}
                    <div className="flex items-center justify-between mb-8 animate-fade-in flex-wrap gap-3">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">アカウント設定</h1>
                            <p className="text-slate-600 text-sm mt-1">アカウント情報とセキュリティ設定の確認・変更</p>
                        </div>
                        <Link 
                            href="/dashboard" 
                            className="btn-secondary text-xs h-9 px-3.5 rounded-lg inline-flex items-center gap-1.5 font-bold transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                            <span>ダッシュボードへ戻る</span>
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <span className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></span>
                        </div>
                    ) : !profile ? (
                        <div className="glass-panel p-10 text-center rounded-2xl">
                            <p className="text-slate-600">プロフィール情報を取得できませんでした。</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">

                            {/* 1. アカウント情報サマリーカード */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                                    <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                                        <User className="w-10 h-10" />
                                    </div>
                                    <div className="flex-1 text-center sm:text-left min-w-0">
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                                            <h2 className="text-2xl font-bold text-slate-900 truncate">
                                                {profile.displayName}
                                            </h2>
                                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                                profile.role === "admin" 
                                                    ? "bg-purple-50 text-purple-700 border border-purple-200" 
                                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                            }`}>
                                                {roleLabel(profile.role)}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                                profile.isApproved 
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                            }`}>
                                                {profile.isApproved ? "認証済み" : "審査中"}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-600 mb-3">
                                            <span className="flex items-center gap-1">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                <strong className="text-slate-800">{profile.companyName || "未所属"}</strong>
                                            </span>
                                            <span className="text-slate-300">|</span>
                                            <span className="font-mono text-slate-700 flex items-center gap-1">
                                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                {profile.email}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            登録日: {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }) : "-"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 2. 基本情報の変更フォーム */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8">
                                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">基本情報の変更</h2>
                                        <p className="text-xs text-slate-500">システム上で表示されるお名前・連絡先電話番号を設定します</p>
                                    </div>
                                </div>

                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                表示名（氏名）
                                            </label>
                                            <input
                                                type="text"
                                                value={editDisplayName}
                                                onChange={(e) => setEditDisplayName(e.target.value)}
                                                placeholder="例: 山田 太郎"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all font-medium"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                電話番号
                                            </label>
                                            <input
                                                type="tel"
                                                value={editPhoneNumber}
                                                onChange={(e) => setEditPhoneNumber(e.target.value)}
                                                placeholder="例: 03-1234-5678"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">
                                                ログインメールアドレス（変更不可）
                                            </label>
                                            <input
                                                type="text"
                                                value={profile.email}
                                                disabled
                                                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 font-mono cursor-not-allowed"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">
                                                所属企業（管理者のみ変更可）
                                            </label>
                                            <input
                                                type="text"
                                                value={profile.companyName || "未所属"}
                                                disabled
                                                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-3">
                                        <button
                                            type="submit"
                                            disabled={isSavingProfile}
                                            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:-translate-y-0.5 transition-all"
                                        >
                                            {isSavingProfile ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            <span>基本情報を保存</span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* 3. パスワード変更フォーム */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 sm:p-8">
                                <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                                        <KeyRound className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900">パスワードの変更</h2>
                                        <p className="text-xs text-slate-500">アカウントのセキュリティ保護のため、安全なパスワード（8文字以上）を設定してください</p>
                                    </div>
                                </div>

                                <form onSubmit={handleUpdatePassword} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                新しいパスワード
                                            </label>
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="8文字以上の新しいパスワード"
                                                minLength={8}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all font-mono"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                新しいパスワード（確認用）
                                            </label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="もう一度入力してください"
                                                minLength={8}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all font-mono"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-3">
                                        <button
                                            type="submit"
                                            disabled={isSavingPassword || !newPassword}
                                            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            {isSavingPassword ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Lock className="w-4 h-4" />
                                            )}
                                            <span>パスワードを更新</span>
                                        </button>
                                    </div>
                                </form>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </RequireAuth>
    );
}
