import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "認証トークンが不足しています" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceRoleKey) {
            return NextResponse.json({ error: "サーバー設定エラー: Service Role Key が未設定です" }, { status: 500 });
        }

        // 呼び出し元のユーザー認証 & 管理者チェック
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: { user: caller }, error: callerError } = await supabaseUser.auth.getUser();
        if (callerError || !caller) {
            return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data: callerProfile } = await supabaseAdmin
            .from("app_users")
            .select("role")
            .eq("id", caller.id)
            .single();

        if (!callerProfile || callerProfile.role !== "admin") {
            return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
        }

        // リクエストボディの取得
        const body = await request.json();
        const { email, password, displayName, companyId, allowedPlan, role } = body;

        if (!email || !password || !displayName || !companyId) {
            return NextResponse.json({ error: "メールアドレス、パスワード、担当者名、所属会社は必須です" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "パスワードは6文字以上で設定してください" }, { status: 400 });
        }

        // 1. Supabase Auth でユーザーを直接作成 (メール確認済み & 即時承認)
        const { data: authResult, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
            email: email.trim(),
            password: password,
            email_confirm: true,
            user_metadata: {
                display_name: displayName.trim(),
                role: role || "user"
            },
            app_metadata: {
                role: role || "user",
                is_approved: true
            }
        });

        if (createAuthError || !authResult.user) {
            console.error("Auth create error:", createAuthError);
            return NextResponse.json({ error: createAuthError?.message || "アカウントの作成に失敗しました" }, { status: 400 });
        }

        const newUserId = authResult.user.id;

        // 2. app_users にプロフィールと企業紐付けを登録
        const userPayload: any = {
            id: newUserId,
            company_id: companyId,
            display_name: displayName.trim(),
            role: role || "user",
            is_approved: true, // 管理者発行なので即時承認
            is_active: true
        };

        if (allowedPlan) {
            userPayload.allowed_plan = allowedPlan;
        }

        let { error: insertError } = await supabaseAdmin
            .from("app_users")
            .insert([userPayload]);

        // もし allowed_plan カラムがまだ未マイグレーションの場合のフォールバック
        if (insertError && insertError.message.includes("allowed_plan")) {
            console.warn("Falling back without allowed_plan:", insertError.message);
            delete userPayload.allowed_plan;
            const { error: retryError } = await supabaseAdmin
                .from("app_users")
                .insert([userPayload]);
            if (retryError) {
                // auth ユーザーをロールバック削除
                await supabaseAdmin.auth.admin.deleteUser(newUserId);
                throw retryError;
            }
        } else if (insertError) {
            // auth ユーザーをロールバック削除
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            throw insertError;
        }

        return NextResponse.json({
            success: true,
            user: {
                id: newUserId,
                email: email.trim(),
                displayName: displayName.trim(),
                companyId: companyId,
                allowedPlan: allowedPlan || "full"
            }
        });

    } catch (error: any) {
        console.error("Admin user create API error:", error);
        return NextResponse.json({ error: error.message || "予期せぬエラーが発生しました" }, { status: 500 });
    }
}
