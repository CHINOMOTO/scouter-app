import { NextResponse } from "next/server";
import { authenticateApiRequest, isValidUserEvidencePath, isSafeStorageEvidencePath } from "@/lib/apiAuth";

type EvidenceFile = {
    path: string;
    signedUrl: string;
    type: "image" | "other";
    name: string;
};

async function buildSignedEvidenceFiles(
    supabaseAdmin: any,
    paths: string[]
): Promise<EvidenceFile[]> {
    const files: EvidenceFile[] = [];
    for (const path of paths) {
        if (typeof path !== "string") continue;
        const cleanPath = path.trim();
        if (!cleanPath || cleanPath.includes("..") || cleanPath.includes("\\") || /^https?:\/\//i.test(cleanPath)) continue;
        const { data: signedData } = await supabaseAdmin.storage
            .from("case-evidence")
            .createSignedUrl(cleanPath, 3600); // 1時間有効

        if (signedData?.signedUrl) {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(cleanPath);
            files.push({
                path: cleanPath,
                signedUrl: signedData.signedUrl,
                type: isImage ? "image" : "other",
                name: cleanPath.split("/").pop() || "file",
            });
        }
    }
    return files;
}

// GET: 就業トラブル案件の詳細取得（RLS厳格化対応・他社データ秘匿制御）
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        const auth = await authenticateApiRequest(request, { requirePlan: "employment" });
        if (!auth.ok) return auth.response;

        const { user, appUser, isAdmin, supabaseAdmin } = auth;

        const { data, error } = await supabaseAdmin
            .from("blacklist_cases")
            .select(
                "id, full_name, full_name_kana, gender, birth_date, phone_last4, city, occurrence_date, reason_text, status, rejected_reason, created_at, approved_at, evidence_urls, registered_company_id, registered_by_user_id, companies:registered_company_id ( id, name )"
            )
            .eq("id", id)
            .maybeSingle();

        if (error || !data) {
            return NextResponse.json({ error: "該当するデータが見つかりません。" }, { status: 404 });
        }

        const isOwnCompany = Boolean(appUser.company_id && data.registered_company_id === appUser.company_id);
        const isApproved = data.status === "approved";
        const isAdminOrOwner = isAdmin || isOwnCompany;

        if (!isAdminOrOwner && !isApproved) {
            return NextResponse.json(
                { error: "アクセス権限がありません。他社の審査中・却下データは閲覧できません。" },
                { status: 403 }
            );
        }

        const companyName = (data.companies as any)?.name || null;
        const canViewRawEvidence = isAdminOrOwner;
        const canUploadEvidence = isAdmin || (isOwnCompany && data.status !== "approved");

        let registrantName: string | null = null;
        let evidenceFiles: EvidenceFile[] = [];

        if (isAdminOrOwner) {
            if (data.registered_by_user_id) {
                const { data: registrant } = await supabaseAdmin
                    .from("app_users")
                    .select("display_name, company_id")
                    .eq("id", data.registered_by_user_id)
                    .maybeSingle();
                const matchesCompany = !data.registered_company_id || registrant?.company_id === data.registered_company_id;
                if (registrant?.display_name && matchesCompany) {
                    registrantName = registrant.display_name;
                }
            }

            if (Array.isArray(data.evidence_urls) && data.evidence_urls.length > 0) {
                evidenceFiles = await buildSignedEvidenceFiles(supabaseAdmin, data.evidence_urls);
            }
        }

        const { companies: _companies, ...caseFields } = data as any;
        const sanitizedCase = isAdminOrOwner
            ? caseFields
            : {
                ...caseFields,
                evidence_urls: [],
                registered_by_user_id: null,
            };

        return NextResponse.json({
            case: sanitizedCase,
            companyName,
            registrantName,
            evidenceFiles,
            canViewRawEvidence,
            canUploadEvidence,
        });
    } catch (error) {
        console.error("Case detail GET error:", error);
        return NextResponse.json({ error: "データの取得中にエラーが発生しました。" }, { status: 500 });
    }
}

// PATCH: 追加資料の保存・却下案件の再審査申請（RLS厳格化対応）
export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        const auth = await authenticateApiRequest(request, { requirePlan: "employment" });
        if (!auth.ok) return auth.response;

        const { user, appUser, isAdmin, supabaseAdmin } = auth;

        const { data: caseDetail, error: fetchError } = await supabaseAdmin
            .from("blacklist_cases")
            .select("id, registered_company_id, status, evidence_urls")
            .eq("id", id)
            .maybeSingle();

        if (fetchError || !caseDetail) {
            return NextResponse.json({ error: "対象データが見つかりません。" }, { status: 404 });
        }

        const isOwnCompany = Boolean(appUser.company_id) && caseDetail.registered_company_id === appUser.company_id;
        if (!isAdmin && !isOwnCompany) {
            return NextResponse.json({ error: "自社が登録した案件のみ更新できます。" }, { status: 403 });
        }
        if (!isAdmin && caseDetail.status === "approved") {
            return NextResponse.json(
                { error: "承認済み（公開中）の案件は編集できません。修正が必要な場合は運営事務局へお問い合わせください。" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const addedEvidenceUrls: string[] = Array.isArray(body?.addedEvidenceUrls)
            ? body.addedEvidenceUrls.filter((u: unknown): u is string => typeof u === "string" && u.trim().length > 0)
            : [];

        if (addedEvidenceUrls.length === 0) {
            return NextResponse.json({ error: "追加する資料ファイルが指定されていません。" }, { status: 400 });
        }
        const hasInvalidEvidence = addedEvidenceUrls.some((u: string) =>
            isAdmin ? !isSafeStorageEvidencePath(u) : !isValidUserEvidencePath(u, user.id)
        );
        if (hasInvalidEvidence) {
            return NextResponse.json({ error: "添付資料のファイルパスが不正です。再度アップロードしてください。" }, { status: 400 });
        }

        const existingUrls = Array.isArray(caseDetail.evidence_urls) ? caseDetail.evidence_urls : [];
        const mergedUrls = [...existingUrls, ...addedEvidenceUrls];
        if (mergedUrls.length > 10) {
            return NextResponse.json({ error: "添付資料は合計10件までです。" }, { status: 400 });
        }

        const isRejectedResubmit = caseDetail.status === "rejected";
        const updatePayload: Record<string, any> = {
            evidence_urls: mergedUrls,
        };
        if (isRejectedResubmit) {
            updatePayload.status = "pending";
            updatePayload.rejected_reason = null;
        }

        const { data: updatedCase, error: updateError } = await supabaseAdmin
            .from("blacklist_cases")
            .update(updatePayload)
            .eq("id", id)
            .select("id, status, rejected_reason, evidence_urls")
            .single();

        if (updateError) {
            console.error("Case update error:", updateError);
            return NextResponse.json({ error: "データの更新に失敗しました。" }, { status: 500 });
        }

        const addedEvidence = await buildSignedEvidenceFiles(supabaseAdmin, addedEvidenceUrls);

        return NextResponse.json({
            success: true,
            case: updatedCase,
            addedEvidence,
            resubmitted: isRejectedResubmit,
        });
    } catch (error) {
        console.error("Case detail PATCH error:", error);
        return NextResponse.json({ error: "更新処理中にエラーが発生しました。" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        // 1. 認証・承認・WORKプランチェック
        const auth = await authenticateApiRequest(request, { requirePlan: "employment" });
        if (!auth.ok) return auth.response;

        const { user, appUser, isAdmin, supabaseAdmin } = auth;

        // 2. 削除対象のケースを取得して登録会社・ステータスを確認
        const { data: caseDetail } = await supabaseAdmin
            .from("blacklist_cases")
            .select("registered_company_id, status")
            .eq("id", id)
            .maybeSingle();

        if (!caseDetail) {
            return NextResponse.json({ error: "対象データが見つかりません。" }, { status: 404 });
        }

        // 3. 権限チェック: 管理者か、自社が登録したデータのみ削除可能（null === null 対策含む）
        const isOwnCompany = Boolean(appUser.company_id) && caseDetail.registered_company_id === appUser.company_id;
        if (!isAdmin && !isOwnCompany) {
            return NextResponse.json({ error: "自社が登録した案件のみ削除できます。" }, { status: 403 });
        }

        // 4. 承認済み案件の削除ガード（一般ユーザーは審査中・却下案件のみ削除可能）
        if (!isAdmin && caseDetail.status === "approved") {
            return NextResponse.json(
                { error: "承認済み（公開中）の案件は削除できません。修正・削除が必要な場合は運営事務局へお問い合わせください。" },
                { status: 403 }
            );
        }

        // 5. データの削除
        const { error: deleteError } = await supabaseAdmin
            .from("blacklist_cases")
            .delete()
            .eq("id", id);

        if (deleteError) {
            console.error("Case delete DB error:", deleteError);
            return NextResponse.json({ error: "データの削除に失敗しました。" }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Case delete error:", error);
        return NextResponse.json({ error: "削除処理中にサーバーエラーが発生しました。" }, { status: 500 });
    }
}
