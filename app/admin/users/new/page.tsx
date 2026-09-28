"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";
import { 
    ArrowLeft, 
    RefreshCw, 
    AlertCircle, 
    CheckCircle2, 
    Copy, 
    Check, 
    Plus,
    UserCheck
} from "lucide-react";

type Company = {
    id: string;
    name: string;
    corporate_number?: string | null;
    plan_type?: "employment" | "credit" | "full" | null;
};

export default function NewUserPage() {
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [allowedPlan, setAllowedPlan] = useState<"employment" | "credit" | "full">("full");
    const [role, setRole] = useState<"user" | "admin">("user");
    
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdUser, setCreatedUser] = useState<{ email: string; pass: string; name: string; companyName: string } | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchCompanies = async () => {
            const { data, error } = await supabase
                .from("companies")
                .select("id, name, corporate_number, plan_type")
                .order("name", { ascending: true });

            if (!error && data) {
                setCompanies(data as any);
                if (data.length > 0) {
                    setSelectedCompanyId(data[0].id);
                    setAllowedPlan((data[0] as any).plan_type || "full");
                }
            }
            setLoadingCompanies(false);
        };
        fetchCompanies();
        generateRandomPassword();
    }, []);

    // 会社が選択されたら、その会社の契約プランをデフォルト設定
    const handleCompanyChange = (companyId: string) => {
        setSelectedCompanyId(companyId);
        const comp = companies.find(c => c.id === companyId);
        if (comp && comp.plan_type) {
            setAllowedPlan(comp.plan_type);
        }
    };

    // 安全な初期パスワードのランダム生成
    const generateRandomPassword = () => {
        const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#$@";
        let newPass = "";
        for (let i = 0; i < 10; i++) {
            newPass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(newPass);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) throw new Error("認証セッションがありません");

            const res = await fetch("/api/admin/users/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password: password,
                    displayName: displayName.trim(),
                    companyId: selectedCompanyId,
                    allowedPlan: allowedPlan,
                    role: role
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "アカウント作成に失敗しました");
            }

            const comp = companies.find(c => c.id === selectedCompanyId);
            setCreatedUser({
                email: email.trim(),
                pass: password,
                name: displayName.trim(),
                companyName: comp?.name || "登録会社"
            });

        } catch (err: any) {
            setError(err.message || "アカウント作成エラー");
        } finally {
            setSubmitting(false);
        }
    };

    const copyCredentials = () => {
        if (!createdUser) return;
        const text = `【MIERIS（ミエリス）アカウント情報のご案内】\n\n会社名: ${createdUser.companyName}\nお名前: ${createdUser.name} 様\nログインURL: https://blacklist-app-nine.vercel.app/\nメールアドレス: ${createdUser.email}\n初期パスワード: ${createdUser.pass}\n\n※初回ログイン後、アカウント設定よりパスワードの変更をお願いいたします。`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <RequireAdmin>
            <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                <div className="max-w-2xl w-full">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 animate-fade-in">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">アカウント新規発行</h1>
                            <p className="text-slate-600 text-sm mt-1">お申し込み企業のアカウントを発行し、プラン権限を割り当てます</p>
                        </div>
                        <div className="shrink-0">
                            <Link 
                                href="/admin/registered-users" 
                                className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>ユーザー一覧へ戻る</span>
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white p-7 sm:p-9 rounded-xl border border-slate-200 shadow-2xs animate-fade-in delay-100">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* 所属会社の選択 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-slate-800">
                                        所属会社 <span className="text-red-500">*</span>
                                    </label>
                                    <Link href="/admin/companies/new" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>新しい会社を追加</span>
                                    </Link>
                                </div>
                                {loadingCompanies ? (
                                    <div className="text-xs text-slate-500 py-2">会社一覧を読み込み中...</div>
                                ) : companies.length === 0 ? (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                                        会社がまだ登録されていません。先に「会社管理」から会社を登録してください。
                                    </div>
                                ) : (
                                    <select
                                        required
                                        value={selectedCompanyId}
                                        onChange={(e) => handleCompanyChange(e.target.value)}
                                        className="input-field"
                                    >
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.corporate_number ? `(法人番号: ${c.corporate_number})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* 担当者名 */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-800">
                                    担当者名（表示名） <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="input-field"
                                    placeholder="例: 山田 太郎"
                                />
                            </div>

                            {/* メールアドレス */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-800">
                                    ログイン用メールアドレス <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field"
                                    placeholder="example@client-company.jp"
                                />
                            </div>

                            {/* 初期パスワード */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-slate-800">
                                        初期パスワード <span className="text-red-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={generateRandomPassword}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 transition-colors"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>パスワード再生成</span>
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field font-mono"
                                    placeholder="初期パスワード"
                                />
                                <p className="text-xs text-slate-500">※管理者が安全なパスワードを自動発行しています。顧客へそのまま案内できます。</p>
                            </div>

                            {/* アカウントの権限プラン */}
                            <div className="space-y-3 pt-2">
                                <label className="text-sm font-bold text-slate-800 block">
                                    アカウント利用プラン権限 <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${allowedPlan === 'full' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="allowedPlan"
                                            value="full"
                                            checked={allowedPlan === 'full'}
                                            onChange={() => setAllowedPlan('full')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-sm mb-1">両方セット</div>
                                        <div className="text-xs font-bold text-blue-600 mb-1">月額 30,000円</div>
                                        <div className="text-[11px] text-slate-600 leading-tight">就業情報 ＋ 未払い企業情報</div>
                                    </label>

                                    <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${allowedPlan === 'employment' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="allowedPlan"
                                            value="employment"
                                            checked={allowedPlan === 'employment'}
                                            onChange={() => setAllowedPlan('employment')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-sm mb-1">就業情報のみ</div>
                                        <div className="text-xs font-bold text-slate-700 mb-1">月額 18,000円</div>
                                        <div className="text-[11px] text-slate-600 leading-tight">人物トラブル共有のみ</div>
                                    </label>

                                    <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${allowedPlan === 'credit' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="allowedPlan"
                                            value="credit"
                                            checked={allowedPlan === 'credit'}
                                            onChange={() => setAllowedPlan('credit')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-sm mb-1">クレジットのみ</div>
                                        <div className="text-xs font-bold text-slate-700 mb-1">月額 15,000円</div>
                                        <div className="text-[11px] text-slate-600 leading-tight">未払い企業共有のみ</div>
                                    </label>
                                </div>
                            </div>

                            {/* 管理者権限チェック（通常はuser） */}
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                                <input
                                    type="checkbox"
                                    id="isAdminRole"
                                    checked={role === "admin"}
                                    onChange={(e) => setRole(e.target.checked ? "admin" : "user")}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                <label htmlFor="isAdminRole" className="cursor-pointer">
                                    <span className="block text-sm font-semibold text-slate-800">システム管理者権限（Admin）を付与する</span>
                                    <span className="block text-xs text-slate-500">※通常はチェック不要です（宇井建設・ミヤエモンの運営担当者のみ）</span>
                                </label>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting || companies.length === 0}
                                    className="btn-primary w-full py-3.5 text-base shadow-md"
                                >
                                    {submitting ? "アカウント発行中..." : "アカウントを発行する"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* 発行完了モーダル */}
                {createdUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 text-center mb-1">
                                アカウントを発行しました
                            </h3>
                            <p className="text-xs text-slate-500 text-center mb-6">
                                以下のログイン情報を顧客へ案内してください。
                            </p>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm font-mono space-y-2 mb-6">
                                <div><span className="text-slate-500 text-xs block">会社名:</span> {createdUser.companyName}</div>
                                <div><span className="text-slate-500 text-xs block">担当者:</span> {createdUser.name} 様</div>
                                <div><span className="text-slate-500 text-xs block">ログインID (Email):</span> <span className="font-bold text-slate-900">{createdUser.email}</span></div>
                                <div><span className="text-slate-500 text-xs block">初期パスワード:</span> <span className="font-bold text-blue-600">{createdUser.pass}</span></div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={copyCredentials}
                                    className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 text-emerald-400" />
                                            <span>案内用テキストをコピーしました！</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            <span>案内テキストをコピー</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setCreatedUser(null);
                                        router.push("/admin/registered-users");
                                    }}
                                    className="btn-secondary w-full py-2.5 text-xs"
                                >
                                    ユーザー一覧へ進む
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RequireAdmin>
    );
}
