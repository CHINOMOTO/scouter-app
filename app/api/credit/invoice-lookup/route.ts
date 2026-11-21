import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/apiAuth';

// 国税庁 法人番号/インボイス番号のモジュラス9/11 チェックディジット検証
// 法人番号・インボイス番号は「最左端の1桁（検査数字）」＋「基礎番号12桁」で構成
function verifyCorporateChecksum(num13: string): boolean {
    if (!/^\d{13}$/.test(num13)) return false;

    const digits = num13.split('').map(Number);
    const checkDigit = digits[0]; // 1桁目（検査数字）
    const baseDigits = digits.slice(1); // 2〜13桁目（12桁）

    // 奇数番目(P=1,3,...): 係数1, 偶数番目(P=2,4,...): 係数2
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const factor = (i % 2 === 0) ? 1 : 2;
        sum += baseDigits[11 - i] * factor;
    }

    const remainder = sum % 9;
    const expectedCheck = 9 - remainder;

    return checkDigit === expectedCheck;
}

// GET: インボイス登録番号（T+13桁 または 13桁数字）の形式検証・法人実在照会API
export async function GET(request: Request) {
    try {
        // 認証・承認・CREDITプランチェック
        const auth = await authenticateApiRequest(request, { requirePlan: 'credit' });
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(request.url);
        let rawNumber = (searchParams.get('number') || searchParams.get('invoice_number') || '').trim();

        // "T" プレフィックスの除去
        if (rawNumber.startsWith('T') || rawNumber.startsWith('t')) {
            rawNumber = rawNumber.slice(1);
        }
        const number = rawNumber.replace(/[^0-9]/g, '');

        if (number.length !== 13) {
            return NextResponse.json({
                valid: false,
                checksum_verified: false,
                error: 'インボイス登録番号は「T」＋13桁の半角数字で入力してください。'
            }, { status: 400 });
        }

        // 1. 国税庁アルゴリズムによるチェックディジット検査
        const isChecksumValid = verifyCorporateChecksum(number);

        // チェックディジット不一致の場合は有効（valid: true）とせずエラーを返す
        if (!isChecksumValid) {
            return NextResponse.json({
                valid: false,
                invoice_number: `T${number}`,
                number,
                checksum_verified: false,
                error: '検査数字（チェックディジット）が国税庁アルゴリズムと一致しません。入力内容をご確認ください。'
            });
        }

        // 2. gBizINFO APIで法人としての実在・企業情報を自動照会
        const gbizToken = process.env.GBIZINFO_API_TOKEN;
        let corporateData: any = null;

        if (gbizToken) {
            try {
                const gbizUrl = `https://info.gbiz.go.jp/hojin/v1/hojin/${number}`;
                const gbizRes = await fetch(gbizUrl, {
                    headers: {
                        'Accept': 'application/json',
                        'X-hojinInfo-api-token': gbizToken,
                        'User-Agent': 'MIERIS-Invoice-Checker/1.0'
                    },
                    signal: AbortSignal.timeout(4500)
                });

                if (gbizRes.ok) {
                    const data = await gbizRes.json();
                    corporateData = data['hojin-infos']?.[0] || data;
                }
            } catch (err) {
                console.warn('gBizINFO lookup error during invoice check:', err);
            }
        }

        const isCorporate = !!(corporateData && (corporateData.name || corporateData.corporate_number));

        return NextResponse.json({
            valid: true,
            invoice_number: `T${number}`,
            number: number,
            business_type: isCorporate ? 'corporate' : 'sole_proprietor_or_other',
            business_type_label: isCorporate ? '法人番号確認済み（形式適合）' : '個人事業主・その他（形式適合）',
            checksum_verified: true,
            corporate_profile: isCorporate ? {
                name: corporateData.name,
                location: corporateData.location,
                representative_name: corporateData.representative_name,
                status: corporateData.status || '確認済み'
            } : null,
            verification_note: isCorporate
                ? 'チェックディジット照合および経済産業省gBizINFOでの法人実在を確認しました。※適格請求書発行事業者（インボイス）の登録有無・有効性は国税庁公表サイトにてご確認ください。'
                : 'チェックディジット（モジュラス9/11）の形式要件を満たしています。※適格請求書発行事業者の登録有無・有効性は国税庁公表サイトにてご確認ください。'
        });

    } catch (e: unknown) {
        console.error('Invoice verification error:', e);
        return NextResponse.json({
            valid: false,
            error: 'インボイス番号の検証中にエラーが発生しました。'
        }, { status: 500 });
    }
}
