import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const channelSecret = process.env.LINE_CHANNEL_SECRET;
        const signature = request.headers.get('x-line-signature');
        const rawBody = await request.text();

        // LINE Webhook 署名検証（偽装イベントの防止）
        if (!channelSecret || !signature) {
            return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 });
        }

        const expectedSignature = crypto
            .createHmac('sha256', channelSecret)
            .update(rawBody)
            .digest('base64');

        const sigBuf = Buffer.from(signature);
        const expectedBuf = Buffer.from(expectedSignature);
        if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
            return NextResponse.json({ error: "Invalid LINE signature" }, { status: 401 });
        }

        const body = JSON.parse(rawBody);
        const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

        if (!token) {
            return NextResponse.json({ success: true, message: "No token configured" });
        }

        if (!body.events || body.events.length === 0) {
            return NextResponse.json({ success: true });
        }

        for (const event of body.events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const userMessage = event.message.text.trim().toUpperCase();

                if (userMessage === 'ID' || userMessage === 'ＩＤ') {
                    const sourceId = event.source.groupId || event.source.userId;

                    let replyText = `あなたのユーザーIDはこちらです：\n\n${sourceId}\n\nこの文字列をコピーして管理者に伝えてください。`;

                    if (event.source.type === 'group') {
                        replyText = `このグループのIDはこちらです：\n\n${sourceId}\n\nこの文字列をコピーしてシステム（Vercel）に登録してください。`;
                    }

                    await fetch('https://api.line.me/v2/bot/message/reply', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            replyToken: event.replyToken,
                            messages: [{ type: "text", text: replyText }]
                        })
                    });
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
