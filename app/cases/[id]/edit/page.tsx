"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { RequireAdmin } from "@/components/RequireAdmin";

export default function EditCasePage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Form states
    const [name, setName] = useState("");
    const [nameKana, setNameKana] = useState("");
    const [gender, setGender] = useState("");
    const [birthYear, setBirthYear] = useState("");
    const [birthMonth, setBirthMonth] = useState("");
    const [birthDay, setBirthDay] = useState("");
    const [phoneLast4, setPhoneLast4] = useState("");
    const [city, setCity] = useState("");
    const [occurrenceYear, setOccurrenceYear] = useState("");
    const [occurrenceMonth, setOccurrenceMonth] = useState("");
    const [occurrenceDay, setOccurrenceDay] = useState("");
    const [reason, setReason] = useState("");
    const [status, setStatus] = useState("pending");

    // File states
    type ExistingFile = { path: string; signedUrl: string; name: string };
    const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    useEffect(() => {
        if (!id) return;

        const fetchCase = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("blacklist_cases")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                setErrorMsg("データの取得に失敗しました: " + error.message);
                setLoading(false);
                return;
            }

            if (data) {
                setName(data.full_name);
                setNameKana(data.full_name_kana || "");
                setGender(data.gender || "");
                const [by, bm, bd] = (data.birth_date || "").split("-");
                setBirthYear(by || ""); setBirthMonth(bm || ""); setBirthDay(bd || "");
                setPhoneLast4(data.phone_last4 || "");
                setCity(data.city || "");
                const [oy, om, od] = (data.occurrence_date || "").split("-");
                setOccurrenceYear(oy || ""); setOccurrenceMonth(om || ""); setOccurrenceDay(od || "");
                setReason(data.reason_text);
                setStatus(data.status);

                // Existing files
                if (data.evidence_urls && Array.isArray(data.evidence_urls)) {
                    const loadedFiles: ExistingFile[] = [];
                    for (const path of data.evidence_urls) {
                        const { data: signedData } = await supabase.storage
                            .from('case-evidence')
                            .createSignedUrl(path, 3600);

                        if (signedData) {
                            loadedFiles.push({
                                path,
                                signedUrl: signedData.signedUrl,
                                name: path.split('/').pop() || 'unknown file'
                            });
                        }
                    }
                    setExistingFiles(loadedFiles);
                }
            }
            setLoading(false);
        };

        fetchCase();
    }, [id]);

    // File handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setSelectedFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const removeNewFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const removeExistingFile = (pathToRemove: string) => {
        if (!confirm("保存時にこのファイルは削除されます。リストから除外しますか？")) return;
        setExistingFiles((prev) => prev.filter((f) => f.path !== pathToRemove));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrorMsg(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("セッションが切れました。再ログインしてください。");

            if (nameKana && !/^[ァ-ヶー\s　]*$/.test(nameKana)) {
                throw new Error("氏名（カナ）は全角カタカナで入力してください。");
            }

            // 1. Upload new files
            const newUploadedPaths: string[] = [];
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const { error: uploadError, data: uploadData } = await supabase.storage
                        .from('case-evidence')
                        .upload(fileName, file);

                    if (uploadError) throw new Error(`ファイルアップロード失敗: ${file.name}`);
                    if (uploadData?.path) newUploadedPaths.push(uploadData.path);
                }
            }

            // 2. Combine paths (Existing filtered + New)
            const finalEvidenceUrls = [
                ...existingFiles.map(f => f.path),
                ...newUploadedPaths
            ];

            // 3. Update DB
            const { error } = await supabase
                .from("blacklist_cases")
                .update({
                    full_name: name,
                    full_name_kana: nameKana,
                    gender,
                    birth_date: (birthYear && birthMonth && birthDay)
                        ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
                        : null,
                    phone_last4: phoneLast4 || null,
                    city: city || null,
                    occurrence_date: (occurrenceYear && occurrenceMonth && occurrenceDay)
                        ? `${occurrenceYear}-${occurrenceMonth.padStart(2, '0')}-${occurrenceDay.padStart(2, '0')}`
                        : null,
                    reason_text: reason,
                    status: status,
                    evidence_urls: finalEvidenceUrls
                })
                .eq("id", id);

            if (error) throw error;

            router.push("/cases");
            router.refresh();
        } catch (err: any) {
            setErrorMsg("更新に失敗しました: " + err.message);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <RequireAdmin>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin h-10 w-10 border-4 border-white/40 rounded-full border-t-transparent"></div>
                </div>
            </RequireAdmin>
        );
    }

    return (
        <RequireAdmin>
            <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center">
                <div className="max-w-3xl w-full">

                    <div className="mb-8 text-center animate-fade-in">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">登録情報の編集</h1>
                        <p className="text-slate-400">登録データの編集（管理者のみ）</p>
                    </div>

                    <div className="glass-panel rounded-2xl p-6 md:p-10 animate-fade-in delay-100">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* 基本情報 */}
                            <Section title="基本情報">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label required>氏名</Label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="input-field"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>氏名（カナ）</Label>
                                        <input
                                            type="text"
                                            value={nameKana}
                                            onChange={(e) => setNameKana(e.target.value)}
                                            className="input-field"
                                            placeholder="ヤマダ タロウ"
                                            pattern="^[ァ-ヶー\s　]*$"
                                            title="全角カタカナで入力してください"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>生年月日</Label>
                                        <div className="flex items-center gap-2">
                                            <input type="text" inputMode="numeric" maxLength={4} value={birthYear}
                                                onChange={(e) => { if (/^\d*$/.test(e.target.value)) setBirthYear(e.target.value); }}
                                                className="input-field w-24 text-center" placeholder="0000" />
                                            <span className="text-slate-400">年</span>
                                            <input type="text" inputMode="numeric" maxLength={2} value={birthMonth}
                                                onChange={(e) => { if (/^\d*$/.test(e.target.value)) setBirthMonth(e.target.value); }}
                                                className="input-field w-16 text-center" placeholder="00" />
                                            <span className="text-slate-400">月</span>
                                            <input type="text" inputMode="numeric" maxLength={2} value={birthDay}
                                                onChange={(e) => { if (/^\d*$/.test(e.target.value)) setBirthDay(e.target.value); }}
                                                className="input-field w-16 text-center" placeholder="00" />
                                            <span className="text-slate-400">日</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>性別</Label>
                                        <select
                                            value={gender}
                                            onChange={(e) => setGender(e.target.value)}
                                            className="input-field appearance-none"
                                        >
                                            <option value="">選択してください</option>
                                            <option value="male">男性</option>
                                            <option value="female">女性</option>
                                            <option value="other">その他</option>
                                        </select>
                                    </div>
                                </div>
                            </Section>

                            {/* 詳細情報 */}
                            <Section title="トラブル情報">
                                <div className="grid md:grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-2">
                                        <Label>携帯電話番号（下4桁）</Label>
                                        <input
                                            type="text"
                                            maxLength={4}
                                            value={phoneLast4}
                                            onChange={(e) => setPhoneLast4(e.target.value)}
                                            className="input-field"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>住所（市区町村）</Label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="input-field"
                                            placeholder="例：東京都渋谷区"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>発生日</Label>
                                        <div className="flex items-center gap-2">
                                            <input type="text" inputMode="numeric" maxLength={4} value={occurrenceYear}
                                                onChange={(e) => { if (/^\d*$/.test(e.target.value)) setOccurrenceYear(e.target.value); }}
                                                className="input-field w-24 text-center" placeholder="0000" />
                                            <span className="text-slate-400">年</span>
                                            <input type="text" inputMode="numeric" maxLength={2} value={occurrenceMonth}
                                                onChange={(e) => { if (/^\d*$/.test(e.target.value)) setOccurrenceMonth(e.target.value); }}
                                                className="input-field w-16 text-center" placeholder="00" />
                                            <span className="text-slate-400">月</span>
                                            <input type="text" inputMode="numeric" maxLength={2} value={occurrenceDay}
                                                onChange={(e) => { if (/^\d*$/.test(e.target.value)) setOccurrenceDay(e.target.value); }}
                                                className="input-field w-16 text-center" placeholder="00" />
                                            <span className="text-slate-400">日</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label required>登録理由 / 詳細</Label>
                                    <textarea
                                        required
                                        rows={5}
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="input-field min-h-[120px]"
                                    />
                                </div>

                                {/* FILE UPLOAD SECTION */}
                                <div className="space-y-2 mt-6 border-t border-slate-700/50 pt-6">
                                    <Label>添付資料（画像・PDF等）</Label>

                                    {/* Existing Files */}
                                    {existingFiles.length > 0 && (
                                        <div className="mb-4 space-y-2">
                                            <p className="text-xs text-white font-bold mb-2">登録済みファイル:</p>
                                            {existingFiles.map((file) => (
                                                <div key={file.path} className="flex items-center justify-between bg-slate-800/80 p-3 rounded-lg border border-slate-600">
                                                    <a href={file.signedUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-300 hover:underline truncate max-w-[80%] flex items-center gap-2">
                                                        <span>📄</span>
                                                        {file.name}
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeExistingFile(file.path)}
                                                        className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded text-xs transition-colors"
                                                    >
                                                        削除
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* New File Upload Area */}
                                    <div className="border border-dashed border-slate-600 rounded-lg p-6 text-center hover:bg-slate-800/30 transition-colors relative">
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            accept="image/*,application/pdf"
                                        />
                                        <div className="pointer-events-none">
                                            <span className="text-2xl block mb-2">📁</span>
                                            <p className="text-sm text-slate-400">ファイルをここに追加</p>
                                            <p className="text-xs text-slate-500 mt-1">（クリックまたはドラッグ＆ドロップ）</p>
                                        </div>
                                    </div>

                                    {/* Selected New Files */}
                                    {selectedFiles.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            <p className="text-xs text-yellow-500 font-bold mb-2">追加予定ファイル:</p>
                                            {selectedFiles.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700 text-sm">
                                                    <span className="truncate max-w-[80%] text-slate-300">{file.name} ({(file.size / 1024).toFixed(0)}KB)</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeNewFile(index)}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1 rounded transition-colors"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 mt-4">
                                    <Label>ステータス</Label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="input-field appearance-none bg-slate-800"
                                    >
                                        <option value="pending">審査中 (Pending)</option>
                                        <option value="approved">承認済み (Approved)</option>
                                        <option value="rejected">却下 (Rejected)</option>
                                    </select>
                                </div>
                            </Section>

                            {errorMsg && (
                                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                                    ⚠️ {errorMsg}
                                </div>
                            )}

                            <div className="flex gap-4 pt-4 border-t border-slate-700/50">
                                <Link href="/cases" className="btn-secondary flex-1 text-center py-3">
                                    キャンセル
                                </Link>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary flex-1 py-3 text-base"
                                >
                                    {saving ? "更新中..." : "変更を保存"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </RequireAdmin>
    );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest border-b border-slate-700/30 pb-2">
                {title}
            </h3>
            {children}
        </div>
    )
}

function Label({ children, required }: { children: React.ReactNode, required?: boolean }) {
    return (
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            {children}
            {required ? (
                <span className="text-white text-[10px] border border-slate-700/30 bg-white/5 px-1.5 py-0.5 rounded">
                    必須
                </span>
            ) : (
                <span className="text-slate-500 text-[10px] border border-slate-700 bg-slate-800 px-1.5 py-0.5 rounded">
                    任意
                </span>
            )}
        </label>
    )
}
