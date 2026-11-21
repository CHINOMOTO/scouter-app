import { NextResponse } from "next/server";
import { authenticateApiRequest, isValidUserEvidencePath, isSafeStorageEvidencePath } from "@/lib/apiAuth";
import { isValidCalendarDate } from "@/lib/dateFormat";

// GET: 就業トラブル登録一覧取得（管理者は全件、一般ユーザーは自社登録案件のみ）
export async function GET(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requirePlan: "employment" });
        if (!auth.ok) return auth.response;

        const { appUser, isAdmin, supabaseAdmin } = auth;

        // 所属企業がない一般ユーザーには空配列を返す
        if (!isAdmin && !appUser.company_id) {
            return NextResponse.json({ cases: [], isAdmin: false });
        }

        let query = supabaseAdmin
            .from("blacklist_cases")
            .select(
                "id, full_name, full_name_kana, birth_date, occurrence_date, phone_last4, reason_text, status, rejected_reason, created_at, registered_company_id"
            )
            .order("created_at", { ascending: false });

        if (!isAdmin && appUser.company_id) {
            query = query.eq("registered_company_id", appUser.company_id);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Cases list GET error:", error);
            return NextResponse.json({ error: "データの取得に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ cases: data || [], isAdmin });
    } catch (error) {
        console.error("Cases GET unexpected error:", error);
        return NextResponse.json({ error: "データ取得中にサーバーエラーが発生しました。" }, { status: 500 });
    }
}

// POST: 就業トラブル情報の新規登録申請（RLS厳格化対応・サーバー側強制バリデーション）
export async function POST(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requirePlan: "employment" });
        if (!auth.ok) return auth.response;

        const { user, appUser, supabaseAdmin } = auth;

        if (!appUser.company_id) {
            return NextResponse.json(
                { error: "所属会社が設定されていません。運営事務局へお問い合わせください。" },
                { status: 400 }
            );
        }

        const body = await request.json();
        const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
        const fullNameKana = typeof body?.fullNameKana === "string" ? body.fullNameKana.trim() : "";
        const gender = typeof body?.gender === "string" ? body.gender.trim() : "";
        const birthDate = typeof body?.birthDate === "string" ? body.birthDate.trim() : "";
        const phoneLast4 = typeof body?.phoneLast4 === "string" ? body.phoneLast4.trim() : "";
        const city = typeof body?.city === "string" ? body.city.trim() : "";
        const occurrenceDate = typeof body?.occurrenceDate === "string" ? body.occurrenceDate.trim() : "";
        const reasonText = typeof body?.reasonText === "string" ? body.reasonText.trim() : "";
        const evidenceUrls: string[] = Array.isArray(body?.evidenceUrls)
            ? body.evidenceUrls.filter((u: unknown): u is string => typeof u === "string" && u.trim().length > 0)
            : [];
        if (evidenceUrls.length > 10) {
            return NextResponse.json({ error: "添付資料は最大10件までです。" }, { status: 400 });
        }
        const hasInvalidEvidence = evidenceUrls.some((u: string) =>
            auth.isAdmin ? !isSafeStorageEvidencePath(u) : !isValidUserEvidencePath(u, user.id)
        );
        if (hasInvalidEvidence) {
            return NextResponse.json({ error: "添付資料のファイルパスが不正です。再度アップロードしてください。" }, { status: 400 });
        }

        if (!fullName || fullName.length > 100) {
            return NextResponse.json({ error: "氏名を100文字以内で入力してください。" }, { status: 400 });
        }
        if (!fullNameKana || !/^[ァ-ヶー\s　]+$/.test(fullNameKana) || fullNameKana.length > 120) {
            return NextResponse.json({ error: "氏名（カナ）は全角カタカナで入力してください。" }, { status: 400 });
        }
        if (!["male", "female", "other"].includes(gender)) {
            return NextResponse.json({ error: "性別を正しく選択してください。" }, { status: 400 });
        }
        if (!isValidCalendarDate(birthDate, { allowFuture: false })) {
            return NextResponse.json({ error: "生年月日を正しい日付（本日以前）で入力してください。" }, { status: 400 });
        }
        if (!/^\d{4}$/.test(phoneLast4)) {
            return NextResponse.json({ error: "携帯電話番号（下4桁）は4桁の半角数字で入力してください。" }, { status: 400 });
        }
        if (!city || city.length > 120) {
            return NextResponse.json({ error: "住所（市区町村）を正しく入力してください。" }, { status: 400 });
        }
        if (!isValidCalendarDate(occurrenceDate, { allowFuture: false })) {
            return NextResponse.json({ error: "トラブル発生日を正しい日付（本日以前）で入力してください。" }, { status: 400 });
        }
        if (!reasonText || reasonText.length > 5000) {
            return NextResponse.json({ error: "トラブル内容・理由を正しく入力してください。" }, { status: 400 });
        }
        if (evidenceUrls.length === 0) {
            return NextResponse.json(
                { error: "添付資料（同意書必須）を1点以上添付してください。" },
                { status: 400 }
            );
        }

        const { data: insertedCase, error: insertError } = await supabaseAdmin
            .from("blacklist_cases")
            .insert([
                {
                    registered_company_id: appUser.company_id,
                    registered_by_user_id: user.id,
                    full_name: fullName,
                    full_name_kana: fullNameKana,
                    gender,
                    birth_date: birthDate,
                    phone_last4: phoneLast4,
                    city,
                    occurrence_date: occurrenceDate,
                    reason_text: reasonText,
                    evidence_urls: evidenceUrls,
                    status: "pending", // 必ず運営管理者の事前審査を通す
                },
            ])
            .select("id")
            .single();

        if (insertError) {
            console.error("Cases POST insert error:", insertError);
            return NextResponse.json({ error: "登録申請の保存に失敗しました。" }, { status: 500 });
        }

        // 管理者へLINE通知（失敗しても登録処理は成功扱いとする）
        try {
            const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
            const adminUserId = process.env.LINE_ADMIN_USER_ID;

            if (lineToken && adminUserId) {
                const { data: profile } = await supabaseAdmin
                    .from("app_users")
                    .select("display_name, companies(name)")
                    .eq("id", user.id)
                    .maybeSingle();

                const companyName = (profile?.companies as any)?.name || "不明";
                const registrantName = profile?.display_name || "不明";
                const messageText = `【MIERIS システム通知】\n\n新規の就業トラブル情報が登録されました。\n\n対象者: ${fullName.slice(0, 100)}\n登録企業: ${companyName}\n担当者: ${registrantName}\n\n管理画面にログインして内容の確認と審査を行ってください。`;

                const targetIds = adminUserId.split(",").map((id) => id.trim()).filter(Boolean);
                await Promise.allSettled(
                    targetIds.map((targetId) =>
                        fetch("https://api.line.me/v2/bot/message/push", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${lineToken}`,
                            },
                            body: JSON.stringify({
                                to: targetId,
                                messages: [{ type: "text", text: messageText }],
                            }),
                        })
                    )
                );
            }
        } catch (lineErr) {
            console.warn("Cases POST LINE notification warning:", lineErr);
        }

        return NextResponse.json({ success: true, id: insertedCase?.id });
    } catch (error) {
        console.error("Cases POST unexpected error:", error);
        return NextResponse.json({ error: "登録処理中にサーバーエラーが発生しました。" }, { status: 500 });
    }
}
