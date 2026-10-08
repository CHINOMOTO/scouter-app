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
    Send,
    Eye,
    EyeOff,
    Edit3,
    RotateCcw,
    ExternalLink
} from "lucide-react";

type Company = {
    id: string;
    name: string;
    corporate_number?: string | null;
    plan_type?: "employment" | "credit" | "full" | null;
};

const planLabels: Record<string, string> = {
    full: "FULLプラン（就業照会 ＆ 企業信用管理）",
    employment: "MIERIS WORK（就業トラブル防止）",
    credit: "MIERIS CREDIT（企業信用・未払い防止）"
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

    // 確認画面モーダルの状態
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [emailSubject, setEmailSubject] = useState("【MIERIS】アカウント発行およびログイン情報のご案内");
    const [emailBody, setEmailBody] = useState("");
    const [isEditingBody, setIsEditingBody] = useState(false);
    const [showPasswordInModal, setShowPasswordInModal] = useState(true);

    // 発行完了モーダルの状態
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

    // 案内メール本文の自動生成
    const buildDefaultEmailBody = (targetEmail: string, pass: string, name: string, compName: string, plan: string) => {
        const origin = typeof window !== "undefined" && window.location.origin 
            ? window.location.origin 
            : "https://www.m-m-m-mieris0610.com";
        const planName = planLabels[plan] || "FULLプラン";

        return `${compName}
${name} 様

いつも「MIERIS（ミエリス）」をご利用いただき、誠にありがとうございます。
システムのご利用アカウントが発行されましたので、下記のログイン情報をご確認ください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ ログイン情報
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
・ログインURL: ${origin}/
・ログインID（メールアドレス）: ${targetEmail}
・初期パスワード: ${pass}
・ご契約プラン: ${planName}

※初回ログイン後、画面右上のアカウント設定（プロフィール）よりパスワードの変更を推奨いたします。
※本メールにお心当たりがない場合は、お手数ですが管理者までご連絡ください。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【MIERIS 運営事務局】
お問い合わせ: ${origin}/contact
公式サイト: ${origin}/
`;
    };

    // フォーム送信時：まずは確認モーダルを開く
    const handleOpenConfirmModal = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email.trim() || !password || !displayName.trim() || !selectedCompanyId) {
            setError("すべての必須項目を入力してください。");
            return;
        }

        if (password.length < 6) {
            setError("パスワードは6文字以上で設定してください。");
            return;
        }

        const comp = companies.find(c => c.id === selectedCompanyId);
        const defaultBody = buildDefaultEmailBody(
            email.trim(), 
            password, 
            displayName.trim(), 
            comp?.name || "ご契約企業", 
            allowedPlan
        );
        setEmailBody(defaultBody);
        setEmailSubject("【MIERIS】アカウント発行およびログイン情報のご案内");
        setIsEditingBody(false);
        setShowConfirmModal(true);
    };

    // 確認画面から確定発行を実行
    const handleConfirmSubmit = async () => {
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

    // 案内用テキストのクリップボードコピー
    const copyCredentials = () => {
        if (!createdUser) return;
        const text = emailBody || buildDefaultEmailBody(
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

    // メーラー起動用の mailto リンク
    const getMailtoUrl = () => {
        if (!createdUser) return "#";
        const subject = encodeURIComponent(emailSubject);
        const body = encodeURIComponent(emailBody || buildDefaultEmailBody(
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
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 animate-fade-in">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">アカウント新規発行</h1>
                            <p className="text-slate-600 text-sm mt-1">加盟企業のアカウントを発行し、プラン権限の割り当てとメール案内を行います</p>
                        </div>
                        <div className="shrink-0">
                            <Link 
                                href="/admin/users" 
                                className="btn-secondary text-xs h-9 px-3.5 rounded-lg flex items-center gap-1.5 font-medium transition-colors whitespace-nowrap"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>ユーザー管理へ戻る</span>
                            </Link>
                        </div>
                    </div>

                    <div className="bg-white p-7 sm:p-9 rounded-2xl border border-slate-200 shadow-2xs animate-fade-in delay-100">
                        <form onSubmit={handleOpenConfirmModal} className="space-y-6">
                            {/* 所属会社の選択 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-slate-800">
                                        所属会社 <span className="text-red-500">*</span>
                                    </label>
                                    <Link href="/admin/companies/new" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium">
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
                                <p className="text-xs text-slate-500">※アカウント作成後、このメールアドレス宛てにログイン案内を送信できます。</p>
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
                                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
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
                                <p className="text-xs text-slate-500">※管理者が安全なパスワードを自動発行しています（6文字以上）。</p>
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
                                        <div className="font-bold text-slate-900 text-sm mb-1">FULLプラン</div>
                                        <div className="text-xs font-bold text-blue-600 mb-1">月額 30,000円</div>
                                        <div className="text-[11px] text-slate-600 leading-tight">MIERIS WORK ＋ CREDIT</div>
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
                                        <div className="font-bold text-slate-900 text-sm mb-1">MIERIS WORK</div>
                                        <div className="text-xs font-bold text-slate-700 mb-1">月額 18,000円</div>
                                        <div className="text-[11px] text-slate-600 leading-tight">就業情報・人物トラブル共有のみ</div>
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
                                        <div className="font-bold text-slate-900 text-sm mb-1">MIERIS CREDIT</div>
                                        <div className="text-xs font-bold text-slate-700 mb-1">月額 15,000円</div>
                                        <div className="text-[11px] text-slate-600 leading-tight">企業信用・未払い企業共有のみ</div>
                                    </label>
                                </div>
                            </div>

                            {/* 管理者権限チェックボックス */}
                            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <input
                                    type="checkbox"
                                    id="isAdminRole"
                                    checked={role === "admin"}
                                    onChange={(e) => setRole(e.target.checked ? "admin" : "viewer")}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                />
                                <label htmlFor="isAdminRole" className="cursor-pointer select-none">
                                    <span className="block text-sm font-semibold text-slate-800">システム管理者権限（Admin）を付与する</span>
                                    <span className="block text-xs text-slate-500">※通常はチェック不要です（運営担当者のみ）</span>
                                </label>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={submitting || companies.length === 0}
                                    className="btn-primary w-full py-3.5 text-base shadow-sm font-bold flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 transition-all"
                                >
                                    <Mail className="w-4 h-4" />
                                    <span>確認画面へ進む（メール送信確認）</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* 1. 送信前確認モーダル（「下記内容でメールを送信しますか？」） */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-200 my-8">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                                        アカウント発行・メール送信の確認
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        下記の内容でアカウントを発行し、登録メールアドレス宛てに送信しますか？
                                    </p>
                                </div>
                            </div>

                            {/* 発行アカウント情報カード */}
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2 mb-5">
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                    <span className="text-slate-500 font-medium">所属会社:</span>
                                    <span className="font-bold text-slate-900">{compSelected?.name || "未指定"}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                    <span className="text-slate-500 font-medium">担当者名:</span>
                                    <span className="font-bold text-slate-900">{displayName} 様</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                    <span className="text-slate-500 font-medium">登録メール（送信先）:</span>
                                    <span className="font-bold text-slate-900 font-mono">{email}</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                    <span className="text-slate-500 font-medium">初期パスワード:</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-blue-600 font-mono text-sm">
                                            {showPasswordInModal ? password : "••••••••••"}
                                        </span>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                                            className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                            title={showPasswordInModal ? "パスワードを隠す" : "パスワードを表示"}
                                        >
                                            {showPasswordInModal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                                    <span className="text-slate-500 font-medium">割り当てプラン:</span>
                                    <span className="font-bold text-slate-900">{planLabels[allowedPlan]}</span>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-slate-500 font-medium">システム権限:</span>
                                    <span className="font-bold text-slate-900">{role === 'admin' ? "管理者（Admin）" : "一般ユーザー（Viewer）"}</span>
                                </div>
                            </div>

                            {/* メール送信オプション */}
                            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/70 mb-4 flex items-center justify-between">
                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={sendEmail}
                                        onChange={(e) => setSendEmail(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-slate-800">
                                        登録メールアドレスへログイン案内メールを送信する
                                    </span>
                                </label>
                                <span className="text-[10px] text-blue-700 font-bold bg-blue-100/70 px-2 py-0.5 rounded-full">
                                    {sendEmail ? "送信 ON" : "送信 OFF"}
                                </span>
                            </div>

                            {/* メール本文プレビュー（送信ONの場合） */}
                            {sendEmail && (
                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                            <span>送信メールの件名・本文プレビュー</span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {!isEditingBody ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditingBody(true)}
                                                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                    <span>本文を微調整する</span>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const defaultBody = buildDefaultEmailBody(
                                                            email.trim(), 
                                                            password, 
                                                            displayName.trim(), 
                                                            compSelected?.name || "ご契約企業", 
                                                            allowedPlan
                                                        );
                                                        setEmailBody(defaultBody);
                                                        setIsEditingBody(false);
                                                    }}
                                                    className="text-[11px] text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    <span>初期文面に戻す</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* 件名入力 */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
                                        <span className="text-slate-400 font-bold mr-2">件名:</span>
                                        {isEditingBody ? (
                                            <input
                                                type="text"
                                                value={emailSubject}
                                                onChange={(e) => setEmailSubject(e.target.value)}
                                                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs w-full mt-1 font-medium text-slate-900"
                                            />
                                        ) : (
                                            <span className="font-bold text-slate-800">{emailSubject}</span>
                                        )}
                                    </div>

                                    {/* 本文エリア */}
                                    {isEditingBody ? (
                                        <textarea
                                            value={emailBody}
                                            onChange={(e) => setEmailBody(e.target.value)}
                                            rows={8}
                                            className="w-full text-xs font-mono bg-white border border-slate-300 rounded-xl p-3 focus:outline-none focus:border-slate-500 text-slate-800"
                                            placeholder="メール本文を入力..."
                                        />
                                    ) : (
                                        <div className="max-h-40 overflow-y-auto bg-slate-50/70 border border-slate-200 rounded-xl p-3 text-[11px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                                            {emailBody}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* モーダル下部のアクションボタン */}
                            <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    disabled={submitting}
                                    className="btn-secondary w-full sm:w-auto py-2.5 px-5 text-xs font-bold cursor-pointer"
                                >
                                    戻って修正する
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmSubmit}
                                    disabled={submitting}
                                    className="btn-primary flex-1 w-full py-2.5 px-6 text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                                >
                                    {submitting ? (
                                        <>
                                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>発行＆送信処理中...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-3.5 h-3.5" />
                                            <span>{sendEmail ? "確定してアカウント発行 ＆ メール送信" : "確定してアカウントを発行"}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. 発行完了モーダル */}
                {createdUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
                        <div className="bg-white rounded-3xl p-7 sm:p-9 max-w-lg w-full shadow-2xl border border-slate-200 my-8">
                            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600 border border-emerald-100">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 text-center mb-1">
                                アカウントを発行しました
                            </h3>
                            <p className="text-xs text-slate-500 text-center mb-4">
                                {createdUser.companyName}（{createdUser.name} 様）のアカウント発行が完了しました。
                            </p>

                            {/* メール送信結果の通知 */}
                            {emailDeliveryResult && emailDeliveryResult.attempted && (
                                <div className={`p-3 rounded-xl border text-xs mb-5 flex items-start gap-2.5 ${
                                    emailDeliveryResult.sent 
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                                        : "bg-amber-50 border-amber-200 text-amber-800"
                                }`}>
                                    {emailDeliveryResult.sent ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <span className="font-bold block">
                                            {emailDeliveryResult.sent ? "案内メールを送信完了" : "案内メールの送信保留"}
                                        </span>
                                        <span className="text-[11px] leading-relaxed block mt-0.5">
                                            {emailDeliveryResult.sent 
                                                ? `宛先: ${createdUser.email} にログイン案内を送信しました。`
                                                : `${emailDeliveryResult.message}。下記のメーラー起動または案内文コピーから送信いただけます。`}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* ログイン情報サマリー */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono space-y-2 mb-6">
                                <div><span className="text-slate-500 text-[10px] block">所属会社:</span> <span className="font-sans font-bold text-slate-900">{createdUser.companyName}</span></div>
                                <div><span className="text-slate-500 text-[10px] block">担当者:</span> <span className="font-sans font-bold text-slate-900">{createdUser.name} 様</span></div>
                                <div><span className="text-slate-500 text-[10px] block">ログインID (Email):</span> <span className="font-bold text-slate-900">{createdUser.email}</span></div>
                                <div><span className="text-slate-500 text-[10px] block">初期パスワード:</span> <span className="font-bold text-blue-600">{createdUser.pass}</span></div>
                                <div><span className="text-slate-500 text-[10px] block">利用プラン:</span> <span className="font-sans text-slate-800">{planLabels[createdUser.plan]}</span></div>
                            </div>

                            <div className="space-y-2.5">
                                {/* メーラー起動ボタン */}
                                <a
                                    href={getMailtoUrl()}
                                    className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                                >
                                    <Mail className="w-4 h-4" />
                                    <span>メールソフトを起動して送信（Outlook/Gmail等）</span>
                                    <ExternalLink className="w-3 h-3 text-blue-200" />
                                </a>

                                {/* 案内テキストコピーボタン */}
                                <button
                                    onClick={copyCredentials}
                                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 text-emerald-400" />
                                            <span>案内用テキストをコピーしました！</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            <span>案内用テキストをコピー</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        setCreatedUser(null);
                                        router.push("/admin/users");
                                    }}
                                    className="btn-secondary w-full py-2.5 text-xs font-bold cursor-pointer"
                                >
                                    ユーザー管理一覧へ進む
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RequireAdmin>
    );
}
