import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";
import { translateErrorMessage } from "@/lib/errorMessage";
import { createMailTransporter, DEFAULT_FROM_ADDRESS } from "@/lib/mailTransporter";

const VALID_PLANS = ["full", "employment", "credit"] as const;

export async function POST(request: Request) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: "サーバー設定エラーのためアカウントを作成できません。" }, { status: 500 });
        }

        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = auth;

        const body = await request.json();
        const { email, password, displayName, companyId, allowedPlan, role, sendEmail, emailSubject, emailBody } = body;

        if (
            typeof email !== "string" || !email.trim() ||
            typeof password !== "string" || !password ||
            typeof displayName !== "string" || !displayName.trim() ||
            typeof companyId !== "string" || !companyId.trim()
        ) {
            return NextResponse.json({ error: "メールアドレス、パスワード、担当者名、所属会社は必須です。" }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "パスワードは8文字以上で設定してください。" }, { status: 400 });
        }

        // 所属会社の存在確認および契約プランの取得（会社プランを継承し、他ユーザーのプランを意図せず上書きしない）
        const { data: targetCompany, error: companyError } = await supabaseAdmin
            .from("companies")
            .select("id, plan_type")
            .eq("id", companyId)
            .maybeSingle();

        if (companyError || !targetCompany) {
            return NextResponse.json({ error: "指定された所属会社が見つかりません。" }, { status: 404 });
        }

        const companyPlan = VALID_PLANS.includes(targetCompany.plan_type) ? targetCompany.plan_type : null;
        const requestedPlan = VALID_PLANS.includes(allowedPlan) ? allowedPlan : "full";
        const validatedPlan = companyPlan || requestedPlan;
        const targetRole = role === "admin" ? "admin" : "viewer";

        // 1. Supabase Auth でユーザーを作成 (メール確認済み & 即時承認)
        const { data: authResult, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim(),
            password: password,
            email_confirm: true,
            user_metadata: {
                display_name: displayName.trim(),
                role: targetRole
            },
            app_metadata: {
                role: targetRole,
                is_approved: true
            }
        });

        if (createAuthError || !authResult.user) {
            console.error("Auth create error:", createAuthError);
            return NextResponse.json(
                { error: translateErrorMessage(createAuthError) || "アカウントの作成に失敗しました。" },
                { status: 400 }
            );
        }

        const newUserId = authResult.user.id;

        // 2. app_users にプロフィールと企業紐付けを登録
        const userPayload: Record<string, any> = {
            id: newUserId,
            company_id: companyId,
            display_name: displayName.trim(),
            role: targetRole,
            is_approved: true,
            allowed_plan: validatedPlan,
        };

        const { error: insertError } = await supabaseAdmin
            .from("app_users")
            .insert([userPayload]);

        if (insertError && insertError.message.includes("allowed_plan")) {
            console.warn("Falling back without allowed_plan:", insertError.message);
            delete userPayload.allowed_plan;
            const { error: retryError } = await supabaseAdmin
                .from("app_users")
                .insert([userPayload]);
            if (retryError) {
                await supabaseAdmin.auth.admin.deleteUser(newUserId);
                throw retryError;
            }
        } else if (insertError) {
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            throw insertError;
        }

        // 所属会社に plan_type が未設定の場合のみ初期設定する（設定済みの他社ユーザー一括上書きは行わない）
        if (!companyPlan && validatedPlan && companyId) {
            await supabaseAdmin.from("companies").update({ plan_type: validatedPlan }).eq("id", companyId);
        }

        // メール送信の実行（指定されている場合）
        let emailDelivery = {
            attempted: Boolean(sendEmail),
            sent: false,
            message: "メール送信は指定されていません"
        };

        if (sendEmail) {
            const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.m-m-m-mieris0610.com").replace(/\/+$/, "");
            const subject = emailSubject || "【MIERIS】アカウント発行およびログイン情報のご案内";
            const content = emailBody || `アカウントが発行されました。\nログインURL: ${appBaseUrl}/\nメールアドレス: ${email.trim()}`;

            const mailTransporter = createMailTransporter();
            if (mailTransporter) {
                try {
                    const info = await mailTransporter.sendMail({
                        from: DEFAULT_FROM_ADDRESS,
                        to: [email.trim()],
                        subject: subject,
                        text: content,
                    });
                    emailDelivery = {
                        attempted: true,
                        sent: true,
                        message: "メールを正常に送信しました"
                    };
                    console.log(`[SMTP CREATE SENT] Sent invitation to ${email.trim()} messageId: ${info.messageId}`);
                } catch (smtpErr: any) {
                    console.error("SMTP delivery error:", smtpErr);
                    emailDelivery = {
                        attempted: true,
                        sent: false,
                        message: translateErrorMessage(smtpErr, { includeAdminSmtpHint: true })
                    };
                }
            } else {
                const resendApiKey = process.env.RESEND_API_KEY;
                if (resendApiKey) {
                    try {
                        const { Resend } = await import("resend");
                        const resend = new Resend(resendApiKey);
                        const fromEmail = process.env.RESEND_FROM_EMAIL || "MIERIS 運営事務局 <onboarding@resend.dev>";

                        const emailResult = await resend.emails.send({
                            from: fromEmail,
                            to: [email.trim()],
                            subject: subject,
                            text: content,
                        });

                        if (emailResult.error) {
                            console.error("Resend delivery error:", emailResult.error);
                            emailDelivery = {
                                attempted: true,
                                sent: false,
                                message: translateErrorMessage(emailResult.error)
                            };
                        } else {
                            emailDelivery = {
                                attempted: true,
                                sent: true,
                                message: "メールを正常に送信しました"
                            };
                        }
                    } catch (err: any) {
                        console.error("Email send exception:", err);
                        emailDelivery = {
                            attempted: true,
                            sent: false,
                            message: translateErrorMessage(err)
                        };
                    }
                } else {
                    emailDelivery = {
                        attempted: true,
                        sent: false,
                        message: "SMTPおよびメール設定が未完了のため自動送信は保留されました（案内テキストをコピーまたはメーラーから送信可能です）"
                    };
                }
            }
        }

        return NextResponse.json({
            success: true,
            user: {
                id: newUserId,
                email: email.trim(),
                displayName: displayName.trim(),
                companyId: companyId,
                allowedPlan: validatedPlan
            },
            emailDelivery
        });
    } catch (error) {
        console.error("Admin user create API error:", error);
        return NextResponse.json({ error: "アカウント作成中にエラーが発生しました。" }, { status: 500 });
    }
}
