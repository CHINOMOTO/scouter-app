import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
        // 1. リクエスト元のユーザーを認証
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // 2. 権限（admin）チェック
        const { data: appUser } = await supabaseAdmin
            .from('app_users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (appUser?.role !== 'admin') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const resolvedParams = await Promise.resolve(params);
        const userId = resolvedParams.userId;

        // 自分自身は削除できないように保護
        if (user.id === userId) {
            return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
        }

        // 3. app_usersテーブルから削除
        const { error: appUserError } = await supabaseAdmin
            .from('app_users')
            .delete()
            .eq('id', userId);

        if (appUserError) {
            console.error("app_users delete error:", appUserError);
            // 続行する
        }

        // 4. Auth(Supabase認証)からユーザー削除
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Delete user API error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        // 1. リクエスト元のユーザーを認証
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // 2. 権限（admin）チェック
        const { data: appUser } = await supabaseAdmin
            .from('app_users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (appUser?.role !== 'admin') {
            return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
        }

        const resolvedParams = await Promise.resolve(params);
        const userId = resolvedParams.userId;

        const body = await request.json();
        const { is_approved, allowed_plan } = body;

        const updatePayload: Record<string, any> = {};
        if (typeof is_approved === 'boolean') {
            updatePayload.is_approved = is_approved;
        }
        if (allowed_plan) {
            updatePayload.allowed_plan = allowed_plan;
        }

        if (Object.keys(updatePayload).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        // 3. app_users テーブルの更新
        const { error: updateError } = await supabaseAdmin
            .from('app_users')
            .update(updatePayload)
            .eq('id', userId);

        if (updateError) {
            console.error("app_users update error:", updateError);
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        // 4. is_approved の変更がある場合、Auth(Supabase認証)の app_metadata も同期
        if (typeof is_approved === 'boolean') {
            const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
            const currentAppMetadata = existingUser?.user?.app_metadata || {};

            const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                app_metadata: {
                    ...currentAppMetadata,
                    is_approved: is_approved
                }
            });

            if (authUpdateError) {
                console.warn("auth app_metadata sync warning:", authUpdateError.message);
            }
        }

        return NextResponse.json({ success: true, updated: updatePayload });

    } catch (e: any) {
        console.error("Update user API error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
