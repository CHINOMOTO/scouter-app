import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';

const ALLOWED_CATEGORIES = ['bug', 'feature', 'account', 'other'] as const;

const CATEGORY_LABELS: Record<string, string> = {
    bug: 'システム不具合の報告',
    feature: '機能の追加・改善要望',
    account: 'アカウントに関する相談',
    other: 'その他',
};

export async function POST(request: Request) {
    try {
        // 認証・承認チェック（未承認・利用停止ユーザーや未認証アクセスを遮断）
        const auth = await authenticateApiRequest(request);
        if (!auth.ok) return auth.response;

        const { user, supabaseAdmin } = auth;

        const body = await request.json();
        const category = typeof body?.category === 'string' ? body.category.trim() : '';
        const message = typeof body?.message === 'string' ? body.message.trim() : '';

        if (!ALLOWED_CATEGORIES.includes(category as any)) {
            return NextResponse.json({ error: 'お問い合わせ種類を正しく選択してください。' }, { status: 400 });
        }

        if (!message) {
            return NextResponse.json({ error: 'お問い合わせ内容を入力してください。' }, { status: 400 });
        }

        if (message.length > 2000) {
            return NextResponse.json({ error: 'お問い合わせ内容は2000文字以内で入力してください。' }, { status: 400 });
        }

        // クライアントからの偽装を防ぐため、会社名・氏名・電話番号はサーバー側DBから取得
        const { data: profile } = await supabaseAdmin
            .from('app_users')
            .select('display_name, phone_number, companies(name)')
            .eq('id', user.id)
            .maybeSingle();

        const companyName = (profile?.companies as any)?.name || '未所属';
        const userName = profile?.display_name || '不明';
        const phoneNumber = profile?.phone_number || null;

        // Service Role 経由で保存（RLS厳格化後も確実に保存）
        const { error: insertError } = await supabaseAdmin
            .from('contact_inquiries')
            .insert({
                user_id: user.id,
                company_name: companyName,
                user_name: userName,
                email: user.email || '',
                phone_number: phoneNumber,
                category,
                message,
                status: 'unread',
            });

        if (insertError) {
            console.error('Contact insert error:', insertError);
            return NextResponse.json({ error: 'お問い合わせの保存に失敗しました。時間をおいて再度お試しください。' }, { status: 500 });
        }

        // LINE通知を送信
        try {
            const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
            const adminUserId = process.env.LINE_ADMIN_USER_ID;

            if (lineToken && adminUserId) {
                const messageText = `【MIERIS システム通知】\n\nお問い合わせが届きました\n\n種類：${CATEGORY_LABELS[category] || category}\n会社名：${companyName}\n氏名：${userName}\n電話番号：${phoneNumber || '未入力'}\n\n【お問い合わせ内容】\n${message.substring(0, 200)}${message.length > 200 ? '...' : ''}\n\n管理画面でご確認ください。`;

                const targetIds = adminUserId.split(',').map((id: string) => id.trim()).filter((id: string) => id);

                await Promise.allSettled(targetIds.map((targetId: string) =>
                    fetch('https://api.line.me/v2/bot/message/push', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${lineToken}`
                        },
                        body: JSON.stringify({
                            to: targetId,
                            messages: [{ type: 'text', text: messageText }]
                        })
                    })
                ));
            }
        } catch (lineError) {
            console.error('LINE notification error:', lineError);
        }

        return NextResponse.json({ success: true });

    } catch (e: unknown) {
        console.error('Contact API error:', e);
        return NextResponse.json({ error: 'お問い合わせの送信中にサーバーエラーが発生しました。' }, { status: 500 });
    }
}
