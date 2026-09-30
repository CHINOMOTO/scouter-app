import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: '認証情報がありません' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ error: 'ユーザー情報を取得できませんでした' }, { status: 401 });
        }

        const body = await request.json();
        const { category, message, companyName, userName, phoneNumber } = body;

        if (!category || !message) {
            return NextResponse.json({ error: 'お問い合わせ種類と内容は必須です' }, { status: 400 });
        }

        if (message.length > 2000) {
            return NextResponse.json({ error: 'お問い合わせ内容は2000文字以内で入力してください' }, { status: 400 });
        }

        // Supabaseに保存
        const { error: insertError } = await supabase
            .from('contact_inquiries')
            .insert({
                user_id: user.id,
                company_name: companyName || '未所属',
                user_name: userName || '不明',
                email: user.email || '',
                phone_number: phoneNumber || null,
                category,
                message: message.trim(),
                status: 'unread',
            });

        if (insertError) {
            console.error('Contact insert error:', insertError);
            return NextResponse.json({ error: 'お問い合わせの保存に失敗しました' }, { status: 500 });
        }

        // カテゴリの日本語ラベル
        const categoryLabels: Record<string, string> = {
            'bug': 'システム不具合の報告',
            'feature': '機能の追加・改善要望',
            'account': 'アカウントに関する相談',
            'other': 'その他',
        };

        // LINE通知を送信
        try {
            const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
            const adminUserId = process.env.LINE_ADMIN_USER_ID;

            if (lineToken && adminUserId) {
                const messageText = `【MIERIS システム通知】\n\nお問い合わせが届きました\n\n種類：${categoryLabels[category] || category}\n会社名：${companyName || '未所属'}\n氏名：${userName || '不明'}\n電話番号：${phoneNumber || '未入力'}\n\n【お問い合わせ内容】\n${message.trim().substring(0, 200)}${message.trim().length > 200 ? '...' : ''}\n\n管理画面でご確認ください。`;

                const targetIds = adminUserId.split(',').map((id: string) => id.trim()).filter((id: string) => id);

                await Promise.all(targetIds.map((targetId: string) =>
                    fetch('https://api.line.me/v2/bot/message/push', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${lineToken}`
                        },
                        body: JSON.stringify({
                            to: targetId,
                            messages: [{ type: "text", text: messageText }]
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
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
