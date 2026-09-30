"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function SignUpPage() {
    const [companyName, setCompanyName] = useState("");
    const [corporateNumber, setCorporateNumber] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [planType, setPlanType] = useState<"full" | "employment" | "credit">("full");
    const [notes, setNotes] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg(null);

        // 電話番号のバリデーション（数字とハイフンのみ）
        const phoneRegex = /^[0-9-]+$/;
        if (!phoneRegex.test(phoneNumber.trim())) {
            setErrorMsg("電話番号は半角数字とハイフンのみで入力してください。");
            setIsSubmitting(false);
            return;
        }

        // 法人番号のバリデーション（必須・13桁数字）
        const cleanCorpNum = corporateNumber.trim().replace(/[^0-9]/g, "");
        if (!cleanCorpNum || cleanCorpNum.length !== 13) {
            setErrorMsg("法人番号（13桁の半角数字）を必ず入力してください。");
            setIsSubmitting(false);
            return;
        }

        const planLabels: Record<string, string> = {
            full: "両方セット（就業情報 ＋ ミエリスクレジット / 月額30,000円）",
            employment: "就業情報プランのみ（月額18,000円）",
            credit: "ミエリスクレジットのみ（月額15,000円）"
        };

        const inquiryMessage = `【新規利用お申し込み】
希望プラン: ${planLabels[planType]}
法人番号: ${cleanCorpNum || "未入力"}
会社名: ${companyName.trim()}
担当者名: ${displayName.trim()}
メール: ${email.trim()}
電話番号: ${phoneNumber.trim()}
備考・ご質問:
${notes.trim() || "なし"}`;

        try {
            // お問い合わせ・お申し込みテーブルに保存
            const { error: insertError } = await supabase
                .from("contact_inquiries")
                .insert({
                    company_name: companyName.trim(),
                    user_name: displayName.trim(),
                    email: email.trim(),
                    phone_number: phoneNumber.trim(),
                    category: "account",
                    message: inquiryMessage,
                    status: "unread"
                });

            if (insertError) {
                console.error("Application insert error:", insertError);
                // テーブル保存エラーでもメールAPIやLINE通知へフォールバック
            }

            // LINE通知の送信（管理者へ通知）
            try {
                await fetch("/api/notify/line", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "signup",
                        data: {
                            name: `${displayName.trim()}（希望プラン: ${planType}）`,
                            company: companyName.trim(),
                            email: `${email.trim()} / TEL: ${phoneNumber.trim()}`
                        }
                    })
                });
            } catch (notifyErr) {
                console.warn("LINE notify skipped or failed:", notifyErr);
            }

            setIsSuccess(true);

        } catch (err: any) {
            setErrorMsg(err.message || "お申し込みの送信に失敗しました。");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-between p-4 bg-[#f8fafc]">
            <div className="h-4"></div>

            <main className="w-full max-w-[540px] flex flex-col items-center justify-center py-6">

                {/* ヘッダーロゴ */}
                <div className="text-center mb-6 flex flex-col items-center">
                    <Link href="/" className="flex flex-col items-center group">
                        <img 
                            src="/logo-brand.png" 
                            alt="MIERIS ミエリス" 
                            className="w-36 h-auto object-contain select-none pointer-events-none mb-1" 
                        />
                        <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] uppercase">
                            ミエリス
                        </p>
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-3">
                        利用お申し込み・資料請求
                    </h1>
                    <p className="text-xs text-slate-600 mt-1">
                        MIERISは完全事前審査制です。お申し込み後、管理者がアカウントを発行いたします。
                    </p>
                </div>

                {/* 完了画面 */}
                {isSuccess ? (
                    <div className="w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl text-center animate-fade-in">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">
                            お申し込みを受け付けました
                        </h2>
                        <p className="text-sm text-slate-600 leading-relaxed mb-6">
                            MIERIS（ミエリス）へのお申し込みありがとうございます。<br />
                            運営管理者（株式会社ミヤエモン / 株式会社宇井建設）にて内容を確認の上、通常1〜2営業日以内にアカウント発行のご案内をお送りいたします。
                        </p>

                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left text-xs text-slate-700 space-y-2 mb-8">
                            <div className="font-bold text-slate-900 mb-1">【今後の流れ】</div>
                            <div>1. 運営事務局にて会社情報・ご利用プランの確認</div>
                            <div>2. 担当者様へ利用規約および初期ログイン情報（ID/PW）の送付</div>
                            <div>3. ログイン後、すぐにご利用を開始いただけます</div>
                        </div>

                        <Link href="/" className="btn-primary w-full py-3.5 inline-block text-center font-bold">
                            ログイン画面へ戻る
                        </Link>
                    </div>
                ) : (
                    /* フォーム入力画面 */
                    <div className="w-full bg-white rounded-3xl p-8 sm:p-9 border border-slate-200 shadow-xl">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            {/* プラン選択 */}
                            <div className="space-y-2.5">
                                <label className="block text-sm font-bold text-slate-800">
                                    ご希望のプラン <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <label className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${planType === 'full' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="planType"
                                            value="full"
                                            checked={planType === 'full'}
                                            onChange={() => setPlanType('full')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-xs">両方セット</div>
                                        <div className="text-xs font-bold text-blue-600">30,000円/月</div>
                                        <div className="text-[10px] text-slate-500 mt-1">就業 ＋ 未払い企業</div>
                                    </label>

                                    <label className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${planType === 'employment' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="planType"
                                            value="employment"
                                            checked={planType === 'employment'}
                                            onChange={() => setPlanType('employment')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-xs">就業情報のみ</div>
                                        <div className="text-xs font-bold text-slate-700">18,000円/月</div>
                                        <div className="text-[10px] text-slate-500 mt-1">人物トラブル対策</div>
                                    </label>

                                    <label className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${planType === 'credit' ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input
                                            type="radio"
                                            name="planType"
                                            value="credit"
                                            checked={planType === 'credit'}
                                            onChange={() => setPlanType('credit')}
                                            className="sr-only"
                                        />
                                        <div className="font-bold text-slate-900 text-xs">クレジットのみ</div>
                                        <div className="text-xs font-bold text-slate-700">15,000円/月</div>
                                        <div className="text-[10px] text-slate-500 mt-1">未払い企業情報</div>
                                    </label>
                                </div>
                            </div>

                            {/* 会社名 */}
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                                    会社名（商号） <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="input-field"
                                    placeholder="例: 株式会社〇〇建設"
                                />
                            </div>

                            {/* 法人番号 */}
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                                    法人番号（13桁） <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength={13}
                                    value={corporateNumber}
                                    onChange={(e) => setCorporateNumber(e.target.value.replace(/[^0-9]/g, ""))}
                                    className="input-field font-mono"
                                    placeholder="例: 1234567890123"
                                />
                            </div>

                            {/* ご担当者名 */}
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                                    ご担当者様 氏名 <span className="text-red-500">*</span>
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
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                                    ご連絡用メールアドレス <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input-field"
                                    placeholder="yamada@company.co.jp"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    ※アカウント発行のご案内をこちらのアドレス宛にお送りいたします。
                                </p>
                            </div>

                            {/* 電話番号 */}
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                                    お電話番号 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="input-field font-mono"
                                    placeholder="03-1234-5678"
                                />
                            </div>

                            {/* 備考・ご質問 */}
                            <div>
                                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                                    ご質問・ご要望（任意）
                                </label>
                                <textarea
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="input-field py-2 resize-none text-sm"
                                    placeholder="導入時期のご希望や、ご不明点等があればご記入ください。"
                                />
                            </div>

                            {errorMsg && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-700 text-xs">
                                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn-primary w-full py-4 text-base font-bold tracking-wider rounded-xl shadow-md"
                                >
                                    {isSubmitting ? "送信中..." : "お申し込み内容を送信する"}
                                </button>
                            </div>
                        </form>

                        <div className="text-center mt-6 border-t border-slate-100 pt-5 text-sm">
                            <span className="text-slate-600 font-medium">既にアカウントをお持ちの方は </span>
                            <Link href="/" className="text-slate-900 hover:text-blue-600 font-bold underline underline-offset-2 ml-1">
                                ログイン画面へ
                            </Link>
                        </div>
                    </div>
                )}
            </main>

            {/* フッター */}
            <footer className="w-full text-center text-slate-500 text-xs py-6">
                <p>&copy; 2026 MIERIS. 株式会社ミヤエモン / 株式会社宇井建設</p>
            </footer>
        </div>
    );
}
