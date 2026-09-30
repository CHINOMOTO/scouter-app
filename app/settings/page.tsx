"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { User, Lock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";

export default function SettingsPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    
    // Password state
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                setEmail(user.email || "");

                const { data: appUser } = await supabase
                    .from("app_users")
                    .select("display_name, phone_number, companies(name)")
                    .eq("id", user.id)
                    .single();

                if (appUser) {
                    setDisplayName(appUser.display_name || "");
                    setPhoneNumber(appUser.phone_number || "");
                    setCompanyName((appUser.companies as any)?.name || "未所属");
                }
            }
            setIsLoading(false);
        };
        fetchProfile();
    }, []);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setIsSavingProfile(true);
        setProfileMsg(null);

        try {
            const { error } = await supabase
                .from("app_users")
                .update({ display_name: displayName, phone_number: phoneNumber })
                .eq("id", userId);

            if (error) throw error;
            
            // auth側のメタデータも更新（表示名同期のため）
            await supabase.auth.updateUser({
                data: { display_name: displayName }
            });

            setProfileMsg({ type: 'success', text: "プロフィール情報を更新しました。" });
        } catch (err: any) {
            setProfileMsg({ type: 'error', text: err.message || "更新に失敗しました。" });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingPassword(true);
        setPasswordMsg(null);

        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: "パスワードが一致しません。" });
            setIsSavingPassword(false);
            return;
        }

        if (newPassword.length < 8) {
            setPasswordMsg({ type: 'error', text: "パスワードは8文字以上で入力してください。" });
            setIsSavingPassword(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setPasswordMsg({ type: 'success', text: "パスワードを更新しました。" });
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            setPasswordMsg({ type: 'error', text: err.message || "更新に失敗しました。" });
        } finally {
            setIsSavingPassword(false);
        }
    };

    if (isLoading) {
        return (
            <RequireAuth>
                <div className="min-h-screen flex items-center justify-center p-4">
                    <div className="animate-spin h-10 w-10 border-4 border-slate-200 rounded-full border-t-slate-900 mx-auto"></div>
                </div>
            </RequireAuth>
        );
    }

    return (
        <RequireAuth>
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-3xl w-full relative z-10">

                    <div className="flex items-center justify-between mb-8 animate-fade-in flex-wrap sm:flex-nowrap gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">アカウント設定</h1>
                            <p className="text-slate-600 text-sm mt-1">登録情報やパスワードの変更を行います</p>
                        </div>
                        <Link href="/dashboard" className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors shrink-0">
                            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                            <span>ダッシュボードへ戻る</span>
                        </Link>
                    </div>

                    <div className="space-y-8 animate-fade-in delay-100">
                        {/* 基本情報設定 */}
                        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-200 relative overflow-hidden">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <User className="w-4 h-4 inline mr-1 text-slate-700" /> 基本情報
                            </h2>

                            <form onSubmit={handleUpdateProfile} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 ml-1">
                                        所属会社
                                    </label>
                                    <input
                                        type="text"
                                        disabled
                                        value={companyName}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-600 cursor-not-allowed text-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1 ml-1">※所属会社はシステム管理者のみ変更可能です。</p>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 ml-1">
                                        メールアドレス
                                    </label>
                                    <input
                                        type="email"
                                        disabled
                                        value={email}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-600 cursor-not-allowed font-mono text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 ml-1">
                                        表示名（氏名）
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-slate-200 focus:ring-1 focus:ring-white/30 transition-all text-sm"
                                    />
                                </div>

                                {profileMsg && (
                                    <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                        <span className="pt-0.5">{profileMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}</span>
                                        <p>{profileMsg.text}</p>
                                    </div>
                                )}

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingProfile}
                                        className="btn-primary"
                                    >
                                        {isSavingProfile ? "保存中..." : "プロフィールを更新"}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* パスワード設定 */}
                        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-200 relative overflow-hidden">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Lock className="w-4 h-4 inline mr-1 text-slate-700" /> パスワード変更
                            </h2>

                            <form onSubmit={handleUpdatePassword} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 ml-1">
                                        新しいパスワード
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="8文字以上"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-slate-200 focus:ring-1 focus:ring-white/30 transition-all font-mono text-sm"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 ml-1">
                                        新しいパスワード（確認用）
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="もう一度入力してください"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-slate-200 focus:ring-1 focus:ring-white/30 transition-all font-mono text-sm"
                                    />
                                </div>

                                {passwordMsg && (
                                    <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${passwordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                        <span className="pt-0.5">{passwordMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}</span>
                                        <p>{passwordMsg.text}</p>
                                    </div>
                                )}

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingPassword}
                                        className="btn-primary"
                                    >
                                        {isSavingPassword ? "更新中..." : "パスワードを変更"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </RequireAuth>
    );
}
