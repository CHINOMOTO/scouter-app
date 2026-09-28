import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, data } = body;

        const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        const adminUserId = process.env.LINE_ADMIN_USER_ID;

        // もしLINEの環境変数が設定されていなければスキップ（画面操作を止めないようにエラーにはしない）
        if (!token || !adminUserId) {
            console.log("LINE notification skipped: LINE_CHANNEL_ACCESS_TOKEN or LINE_ADMIN_USER_ID is missing.");
            return NextResponse.json({ success: true, skipped: true });
        }

        let messageText = "【MIERIS システム通知】";

        if (type === 'signup') {
            messageText += `\n\n🔔 新規アカウントの登録申請がありました。\n\n👤 氏名: ${data.name || "不明"}\n🏢 会社: ${data.company || "不明"}\n✉️ Email: ${data.email || "不明"}\n\n管理画面にログインして承認・拒否を行ってください。`;
        } else if (type === 'new_case') {
            messageText += `\n\n🚨 新規のケース情報が登録されました。\n\n👤 対象者: ${data.targetName || "不明"}\n\n管理画面にログインして内容の確認と承認を行ってください。`;
        } else {
            return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
        }

        const targetIds = adminUserId.split(',').map(id => id.trim()).filter(id => id);

        const pushPromises = targetIds.map(targetId => {
            return fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    to: targetId,
                    messages: [{ type: "text", text: messageText }]
                })
            });
        });

        const results = await Promise.all(pushPromises);
        
        for (const res of results) {
            if (!res.ok) {
                const errText = await res.text();
                console.error("LINE API Error:", errText);
                // 1つでも失敗したらエラーを返すかログだけ残すか。ここでは全体としては止めないようにする。
            }
        }

        return NextResponse.json({ success: true });

    } catch (e: unknown) {
        console.error("Notify API Error:", e);
        const msg = e instanceof Error ? e.message : "Unknown error";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
