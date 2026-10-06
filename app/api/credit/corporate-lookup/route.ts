import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET: 法人番号（13桁）から企業名を検索・取得するAPI
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const number = (searchParams.get('number') || '').trim().replace(/[^0-9]/g, '');

        if (number.length !== 13) {
            return NextResponse.json({ error: '法人番号は13桁の半角数字を指定してください' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

        // 1. システム内部（credit_cases）に該当の法人番号が存在するか確認
        const { data: creditCase } = await supabase
            .from('credit_cases')
            .select('company_name')
            .eq('corporate_number', number)
            .limit(1)
            .maybeSingle();

        if (creditCase?.company_name) {
            return NextResponse.json({
                found: true,
                name: creditCase.company_name,
                source: 'internal_db'
            });
        }

        // 2. companies テーブルに該当の法人番号が存在するか確認
        const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('corporate_number', number)
            .limit(1)
            .maybeSingle();

        if (company?.name) {
            return NextResponse.json({
                found: true,
                name: company.name,
                source: 'internal_db'
            });
        }

        // 3. 国税庁 Web-API の呼び出し（環境変数に NTA_APP_ID がある場合）
        const ntaAppId = process.env.NTA_APP_ID;
        if (ntaAppId) {
            try {
                const ntaRes = await fetch(`https://api.houjin-bangou.nta.go.jp/4/num?id=${ntaAppId}&number=${number}&type=12&history=0`, {
                    headers: { 'User-Agent': 'MIERIS-System/1.0' }
                });
                if (ntaRes.ok) {
                    const xml = await ntaRes.text();
                    const match = xml.match(/<name>(.*?)<\/name>/);
                    if (match && match[1]) {
                        return NextResponse.json({
                            found: true,
                            name: match[1],
                            source: 'nta_api'
                        });
                    }
                }
            } catch (err) {
                console.error('NTA API server request error:', err);
            }
        }

        // 見つからなかった場合
        return NextResponse.json({
            found: false,
            message: '該当する企業情報が見つかりませんでした。企業名を手動で入力してください。'
        });
    } catch (e: any) {
        console.error('Corporate lookup error:', e);
        return NextResponse.json({ error: '企業情報の取得中にエラーが発生しました' }, { status: 500 });
    }
}
