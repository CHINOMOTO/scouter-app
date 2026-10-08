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
    Mail,
    Eye,
    EyeOff,
    ExternalLink
} from "lucide-react";

type Company = {
    id: string;
    name: string;
    corporate_number?: string | null;
    plan_type?: "employment" | "credit" | "full" | null;
};

const SITE_URL = "https://www.m-m-m-mieris0610.com";

const planLabels: Record<string, string> = {
    full: "FULLプラン",
    employment: "MIERIS WORK",
    credit: "MIERIS CREDIT"
};

export default function NewUserPage() {
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [allowedPlan, setAllowedPlan] = useState<"employment" | "credit" | "full">("full");
    const [role, setRole] = useState<"viewer" | "admin">("viewer");
    
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 確認画面モーダル
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [emailSubject, setEmailSubject] = useState("【MIERIS】アカウント発行およびログイン情報のご案内");
    const [emailBody, setEmailBody] = useState("");
    const [showPasswordInModal, setShowPasswordInModal] = useState(false);

    // 発行完了モーダル
    const [createdUser, setCreatedUser] = useState<{ 
        email: string; 
        pass: string; 
        name: string; 
        companyName: string;
        plan: string;
    } | null>(null);
    const [emailDeliveryResult, setEmailDeliveryResult] = useState<{ 
        attempted: boolean; 
        sent: boolean; 
        message: string 
    } | null>(null);
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

    const handleCompanyChange = (companyId: string) => {
        setSelectedCompanyId(companyId);
        const comp = companies.find(c => c.id === companyId);
        if (comp && comp.plan_type) {
            setAllowedPlan(comp.plan_type);
        }
    };

    const generateRandomPassword = () => {
        const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#$@";
        let newPass = "";
        for (let i = 0; i < 10; i++) {
            newPass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(newPass);
    };

    // 案内メール本文の生成（メインURL: https://www.m-m-m-mieris0610.com に統一）
    const buildEmailBody = (targetEmail: string, pass: string, name: string, compName: string, plan: string) => {
        const planName = planLabels[plan] || "FULLプラン";

        return `${compName}
${name} 様

いつも「MIERIS（ミエリス）」をご利用いただき、誠にありがとうございます。
システムのご利用アカウントが発行されましたので、下記のログイン情報をご確認ください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ ログイン情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
・ログインURL: ${SITE_URL}/
・ログインID（メールアドレス）: ${targetEmail}
・初期パスワード: ${pass}
・ご契約プラン: ${planName}

※初回ログイン後、アカウント設定よりパスワードの変更をお願いいたします。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【MIERIS 運営事務局】
お問い合わせ: ${SITE_URL}/contact
公式サイト: ${SITE_URL}/`;
    };

    // 確認画面を開く
    const handleOpenConfirm = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !password || !displayName.trim() || !selectedCompanyId) {
            setError("必須項目をすべて入力してください。");
            return;
        }

        if (password.length < 6) {
            setError("パスワードは6文字以上で設定してください。");
            return;
        }

        const comp = companies.find(c => c.id === selectedCompanyId);
        const body = buildEmailBody(
            email.trim(), 
            password, 
            displayName.trim(), 
            comp?.name || "ご契約企業", 
            allowedPlan
        );
        setEmailBody(body);
        setEmailSubject("【MIERIS】アカウント発行およびログイン情報のご案内");
        setShowConfirmModal(true);
    };

    // アカウント発行実行
    const handleExecuteCreate = async () => {
        setSubmitting(true);
        setError(null);

        try {
            const session = (await supabase.auth.getSession()).data.session;
            if (!session) throw new Error("認証セッションがありません");

            const comp = companies.find(c => c.id === selectedCompanyId);

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
                    role: role,
                    sendEmail: sendEmail,
                    emailSubject: emailSubject.trim(),
                    emailBody: emailBody
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "アカウント作成に失敗しました");
            }

            setShowConfirmModal(false);
            setCreatedUser({
                email: email.trim(),
                pass: password,
                name: displayName.trim(),
                companyName: comp?.name || "登録会社",
                plan: allowedPlan
            });
            setEmailDeliveryResult(data.emailDelivery || null);

        } catch (err: any) {
            setError(err.message || "アカウント作成エラー");
            setShowConfirmModal(false);
        } finally {
            setSubmitting(false);
        }
    };

    const copyCredentials = () => {
        if (!createdUser) return;
        const text = emailBody || buildEmailBody(
            createdUser.email, 
            createdUser.pass, 
            createdUser.name, 
            createdUser.companyName, 
            createdUser.plan
        );
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const getMailtoUrl = () => {
        if (!createdUser) return "#";
        const subject = encodeURIComponent(emailSubject);
        const body = encodeURIComponent(emailBody || buildEmailBody(
            createdUser.email, 
            createdUser.pass, 
            createdUser.name, 
            createdUser.companyName, 
            createdUser.plan
        ));
        return `mailto:${createdUser.email}?subject=${subject}&body=${body}`;
    };

    const compSelected = companies.find(c => c.id === selectedCompanyId);

    return (
        <RequireAdmin>
            <div className="min-h-screen pt-20 md:pt-10 pb-12 px-4 sm:px-6 bg-[#f8fafc] flex flex-col items-center">
                <div className="max-w-2xl w-full">
                    {/* ヘッダー */}
                    <div className="flex items-center justify-between mb-8 animate-fade-in gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">アカウント新規発行</h1>
                            <p className="text-slate-500 text-xs sm:text-sm mt-1">加盟企業のアカウントを発行します</p>
                        </div>
                        <Link 
                            href="/admin/users" 
                            className="btn-secondary text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 font-medium transition-colors shrink-0"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>戻る</span>
                        </Link>
                    </div>

                    {/* 入力フォーム */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xs animate-fade-in">
                        <form onSubmit={handleOpenConfirm} className="space-y-5">
                            {/* 所属会社 */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700">
                                        所属会社 <span className="text-red-500">*</span>
                                    </label>
                                    <Link href="/admin/companies/new" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium">
                                        <Plus className="w-3 h-3" />
                                        <span>会社を追加</span>
                                    </Link>
                                </div>
                                {loadingCompanies ? (
                                    <div className="text-xs text-slate-400 py-2">読み込み中...</div>
                                ) : (
                                    <select
                                        required
                                        value={selectedCompanyId}
                                        onChange={(e) => handleCompanyChange(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all"
                                    >
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.corporate_number ? `(${c.corporate_number})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* 担当者名 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    担当者名 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all"
                                    placeholder="例: 山田 太郎"
                                />
                            </div>

                            {/* メールアドレス */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    ログイン用メールアドレス <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all"
                                    placeholder="example@company.jp"
                                />
                            </div>

                            {/* 初期パスワード */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700">
                                        初期パスワード <span className="text-red-500">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={generateRandomPassword}
                                        className="text-xs text-slate-500 hover:text-slate-800 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        <span>再生成</span>
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-500 focus:bg-white transition-all"
                                    placeholder="初期パスワード"
                                />
                            </div>

                            {/* プラン選択 */}
                            <div className="space-y-2 pt-1">
                                <label className="text-xs font-bold text-slate-700 block">
                                    プラン <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <label className={`p-3 rounded-xl border cursor-pointer transition-all ${allowedPlan === 'full' ? 'border-slate-900 bg-slate-50 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="allowedPlan"
                                            value="full"
                                            checked={allowedPlan === 'full'}
                                            onChange={() => setAllowedPlan('full')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-xs">FULLプラン</div>
                                        <div className="text-[11px] text-blue-600 font-semibold mt-0.5">30,000円/月</div>
                                        <div className="text-[10px] text-slate-500 mt-1">WORK ＋ CREDIT</div>
                                    </label>

                                    <label className={`p-3 rounded-xl border cursor-pointer transition-all ${allowedPlan === 'employment' ? 'border-slate-900 bg-slate-50 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="allowedPlan"
                                            value="employment"
                                            checked={allowedPlan === 'employment'}
                                            onChange={() => setAllowedPlan('employment')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-xs">MIERIS WORK</div>
                                        <div className="text-[11px] text-slate-700 font-semibold mt-0.5">18,000円/月</div>
                                        <div className="text-[10px] text-slate-500 mt-1">就業トラブル対策</div>
                                    </label>

                                    <label className={`p-3 rounded-xl border cursor-pointer transition-all ${allowedPlan === 'credit' ? 'border-slate-900 bg-slate-50 shadow-xs' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="allowedPlan"
                                            value="credit"
                                            checked={allowedPlan === 'credit'}
                                            onChange={() => setAllowedPlan('credit')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-xs">MIERIS CREDIT</div>
                                        <div className="text-[11px] text-slate-700 font-semibold mt-0.5">15,000円/月</div>
                                        <div className="text-[10px] text-slate-500 mt-1">未払い企業情報</div>
                                    </label>
                                </div>
                            </div>

                            {/* 管理者権限 */}
                            <div className="flex items-center gap-2.5 pt-1">
                                <input
                                    type="checkbox"
                                    id="isAdminRole"
                                    checked={role === "admin"}
                                    onChange={(e) => setRole(e.target.checked ? "admin" : "viewer")}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                />
                                <label htmlFor="isAdminRole" className="text-xs text-slate-700 cursor-pointer select-none">
                                    システム管理者権限（Admin）を付与する
                                </label>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting || companies.length === 0}
                                    className="btn-primary w-full py-3 text-sm font-bold shadow-xs cursor-pointer"
                                >
                                    確認へ進む
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* 1. 送信前確認モーダル */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
                        <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-xl border border-slate-200 my-8">
                            <h3 className="text-lg font-bold text-slate-900 mb-1">
                                アカウント発行の確認
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                下記の内容でアカウントを発行します。内容をご確認ください。
                            </p>

                            {/* 登録情報サマリー */}
                            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs space-y-2 mb-4">
                                <div className="flex justify-between py-0.5">
                                    <span className="text-slate-500">所属会社:</span>
                                    <span className="font-bold text-slate-900">{compSelected?.name}</span>
                                </div>
                                <div className="flex justify-between py-0.5">
                                    <span className="text-slate-500">担当者名:</span>
                                    <span className="font-bold text-slate-900">{displayName} 様</span>
                                </div>
                                <div className="flex justify-between py-0.5">
                                    <span className="text-slate-500">メールアドレス:</span>
                                    <span className="font-mono font-bold text-slate-900">{email}</span>
                                </div>
                                <div className="flex justify-between py-0.5 items-center">
                                    <span className="text-slate-500">初期パスワード:</span>
                                    <div className="flex items-center gap-1.5 font-mono font-bold text-blue-600">
                                        <span>{showPasswordInModal ? password : "••••••••••"}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                                            className="text-slate-400 hover:text-slate-600 cursor-pointer ml-1"
                                            title={showPasswordInModal ? "隠す" : "表示"}
                                        >
                                            {showPasswordInModal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between py-0.5">
                                    <span className="text-slate-500">プラン:</span>
                                    <span className="font-bold text-slate-900">{planLabels[allowedPlan]}</span>
                                </div>
                                <div className="flex justify-between py-0.5">
                                    <span className="text-slate-500">権限:</span>
                                    <span className="font-medium text-slate-800">{role === 'admin' ? "管理者" : "一般ユーザー"}</span>
                                </div>
                            </div>

                            {/* メール送信チェック */}
                            <div className="mb-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800">
                                    <input
                                        type="checkbox"
                                        checked={sendEmail}
                                        onChange={(e) => setSendEmail(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span>登録メールアドレス宛てに案内メールを送信する</span>
                                </label>
                            </div>

                            {/* メール本文プレビュー（送信ON時） */}
                            {sendEmail && (
                                <div className="space-y-1.5 mb-5">
                                    <div className="text-[11px] text-slate-500 font-bold">
                                        メール本文（必要に応じて編集できます）
                                    </div>
                                    <textarea
                                        value={emailBody}
                                        onChange={(e) => setEmailBody(e.target.value)}
                                        rows={7}
                                        className="w-full text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 leading-relaxed focus:bg-white focus:outline-none focus:border-slate-400"
                                    />
                                </div>
                            )}

                            {/* モーダルボタン */}
                            <div className="flex items-center justify-end gap-2.5 pt-1 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    disabled={submitting}
                                    className="btn-secondary py-2.5 px-4 text-xs font-bold cursor-pointer"
                                >
                                    戻る
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecuteCreate}
                                    disabled={submitting}
                                    className="btn-primary py-2.5 px-5 text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
                                >
                                    {submitting ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>処理中...</span>
                                        </>
                                    ) : (
                                        <span>{sendEmail ? "アカウント発行・メール送信" : "アカウント発行"}</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. 発行完了モーダル */}
                {createdUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
                        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-slate-200 my-8 text-center">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">
                                アカウントを発行しました
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                {createdUser.companyName}（{createdUser.name} 様）
                            </p>

                            {/* メール送信状況の案内 */}
                            {emailDeliveryResult && emailDeliveryResult.attempted && (
                                <div className={`p-2.5 rounded-xl border text-xs mb-4 text-left ${
                                    emailDeliveryResult.sent 
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                                        : "bg-amber-50 border-amber-200 text-amber-800"
                                }`}>
                                    <span className="font-bold block">
                                        {emailDeliveryResult.sent ? "案内メールを送信しました" : "※メール自動送信未完了"}
                                    </span>
                                    <span className="text-[11px] block mt-0.5">
                                        {emailDeliveryResult.sent 
                                            ? `宛先: ${createdUser.email}`
                                            : "設定が未完了のため、下記のボタンから送信してください。"}
                                    </span>
                                </div>
                            )}

                            {/* ログイン情報 */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-mono text-left space-y-1.5 mb-5">
                                <div><span className="text-slate-400">ログインID:</span> <span className="font-bold text-slate-900">{createdUser.email}</span></div>
                                <div><span className="text-slate-400">初期パスワード:</span> <span className="font-bold text-blue-600">{createdUser.pass}</span></div>
                                <div><span className="text-slate-400">プラン:</span> <span className="font-sans text-slate-800">{planLabels[createdUser.plan]}</span></div>
                            </div>

                            <div className="space-y-2">
                                <a
                                    href={getMailtoUrl()}
                                    className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>メールソフトで送信</span>
                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>

                                <button
                                    onClick={copyCredentials}
                                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>案内文をコピーしました</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>案内文をコピー</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        setCreatedUser(null);
                                        router.push("/admin/users");
                                    }}
                                    className="btn-secondary w-full py-2 text-xs font-medium cursor-pointer"
                                >
                                    ユーザー一覧へ戻る
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RequireAdmin>
    );
}
