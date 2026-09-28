"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
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
                    <div className="animate-spin h-10 w-10 border-4 border-white/40 rounded-full border-t-transparent mx-auto"></div>
                </div>
            </RequireAuth>
        );
    }

    return (
        <RequireAuth>
            <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                <div className="max-w-3xl w-full relative z-10">

                    <div className="flex items-center justify-between mb-8 animate-fade-in">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">アカウント設定</h1>
                            <p className="text-slate-600">登録情報やパスワードの変更を行います</p>
                        </div>
                        <Link href="/dashboard" className="btn-secondary text-xs backdrop-blur-md bg-white/5 border-white/10 hover:bg-white/10">
                            ダッシュボードへ戻る
                        </Link>
                    </div>

                    <div className="space-y-8 animate-fade-in delay-100">
                        {/* 基本情報設定 */}
                        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-200 relative overflow-hidden">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="text-slate-900">👤</span> 基本情報
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
                                    <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${profileMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        <span className="pt-0.5">{profileMsg.type === 'success' ? '✅' : '⚠️'}</span>
                                        <p>{profileMsg.text}</p>
                                    </div>
                                )}

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingProfile}
                                        className="px-6 py-2.5 rounded-xl text-white font-bold bg-[#008299] hover:bg-[#00e5ff] hover:text-black transition-all text-sm shadow-[0_0_15px_rgba(0,229,255,0.2)] disabled:opacity-50"
                                    >
                                        {isSavingProfile ? "保存中..." : "プロフィールを更新"}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* パスワード設定 */}
                        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-200 relative overflow-hidden">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <span className="text-slate-900">🔒</span> パスワード変更
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
                                    <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${passwordMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        <span className="pt-0.5">{passwordMsg.type === 'success' ? '✅' : '⚠️'}</span>
                                        <p>{passwordMsg.text}</p>
                                    </div>
                                )}

                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isSavingPassword}
                                        className="px-6 py-2.5 rounded-xl text-white font-bold bg-[#008299] hover:bg-[#00e5ff] hover:text-black transition-all text-sm shadow-[0_0_15px_rgba(0,229,255,0.2)] disabled:opacity-50"
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
