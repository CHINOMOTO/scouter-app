"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="relative w-full max-w-lg glass-panel rounded-2xl p-10 text-center animate-fade-in border-t border-slate-600/50">

                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-[#0f172a]/30">
                    <span className="text-4xl">⏳</span>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
                    承認待ちです
                </h1>

                <p className="text-slate-700 mb-8 leading-relaxed">
                    アカウント登録の申請を受け付けました。<br />
                    現在、管理者による確認を行っております。
                </p>

                <div className="bg-white rounded-xl p-6 text-left mb-8 border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-widest">Next Steps</h3>
                    <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
                        <li>管理者があなたの所属情報を確認します</li>
                        <li>確認メールが送られましたので、認証リンクをクリックしてください</li>
                        <li>承認後、本システムを利用可能になります</li>
                    </ul>
                </div>

                <button
                    onClick={handleLogout}
                    className="btn-secondary w-full"
                >
                    一度ログアウトして待機する
                </button>
            </div>
        </div>
    );
}
