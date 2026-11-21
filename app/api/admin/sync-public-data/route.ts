import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";
const { syncOfficialData } = require("@/scripts/sync_official_data.js");

export async function POST(request: Request) {
    try {
        const auth = await authenticateApiRequest(request, { requireAdmin: true });
        if (!auth.ok) return auth.response;

        // バッチ処理を実行
        const result = await syncOfficialData();

        return NextResponse.json({
            success: true,
            message: "公的ネガティブデータの同期が完了しました。",
            ...result
        });
    } catch (e) {
        console.error("Admin sync error:", e);
        return NextResponse.json({
            success: false,
            error: "データ同期中にエラーが発生しました。"
        }, { status: 500 });
    }
}
