import React from "react";
import { ShieldCheck, ExternalLink, Info, AlertCircle } from "lucide-react";

interface OfficialDataNoticeProps {
    className?: string;
    compact?: boolean;
}

/**
 * 政府標準利用規約2.0（第2.0版）および各省庁・国税庁API利用規約準拠コンポーネント
 * 1. 出典元の明記
 * 2. 独自加工・非認証の明示（国が直接作成・認証したと誤認させることの禁止）
 * 3. 免責事項（公的機関は内容・最新性を保証しない、損害について免責）
 * 4. 公表時点・最新状況確認に関する注意喚起
 */
export function OfficialDataNotice({ className = "", compact = false }: OfficialDataNoticeProps) {
    if (compact) {
        return (
            <div className={`text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed ${className}`}>
                <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>公的オープンデータ・出典および利用規約に関する表記</span>
                </div>
                <p>
                    本システム上の公的記録は、関係各省庁・裁判所が公開する一次公表情報をもとにMIERISが独自に抽出・加工して提供しているものです（政府標準利用規約2.0準拠）。
                    国・各省庁が本サービスや掲載内容を直接保証・認証したものではありません。最新の処分状況や是正完了の有無等は、各公表元機関へ直接ご確認ください。
                </p>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4 ${className}`}>
            <div className="flex items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            公的データ・一次公表ソースの利用方針および出典明記
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            政府標準利用規約（第2.0版）および各省庁オープンデータ規約に基づき適正に運用しています
                        </p>
                    </div>
                </div>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full shrink-0">
                    政府標準利用規約2.0準拠
                </span>
            </div>

            {/* 出典元リスト */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <a
                    href="https://www.mlit.go.jp/nega-inf/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 transition-colors flex items-center justify-between group"
                >
                    <div className="truncate pr-2">
                        <span className="font-bold text-slate-800 block truncate">国土交通省 ネガティブ情報等検索システム</span>
                        <span className="text-[10px] text-slate-500 block truncate">宅地建物取引業法・建設業法等に基づく監督処分情報</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </a>

                <a
                    href="https://www.mhlw.go.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 transition-colors flex items-center justify-between group"
                >
                    <div className="truncate pr-2">
                        <span className="font-bold text-slate-800 block truncate">厚生労働省 労働基準関係法令違反公表事案</span>
                        <span className="text-[10px] text-slate-500 block truncate">各都道府県労働局・労働基準監督署による送検公表記録</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </a>

                <a
                    href="https://info.gbiz.go.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 transition-colors flex items-center justify-between group"
                >
                    <div className="truncate pr-2">
                        <span className="font-bold text-slate-800 block truncate">経済産業省 gBizINFO（Web-API）</span>
                        <span className="text-[10px] text-slate-500 block truncate">法人公的プロフィール・行政処分・届出公表データベース</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </a>

                <a
                    href="https://www.houjin-bangou.nta.go.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 transition-colors flex items-center justify-between group"
                >
                    <div className="truncate pr-2">
                        <span className="font-bold text-slate-800 block truncate">国税庁 法人番号公表サイト / インボイス公表システム</span>
                        <span className="text-[10px] text-slate-500 block truncate">登記法人基本3情報（商号・所在地・法人番号）・適格請求書登録</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </a>
            </div>

            {/* 法定注意事項・免責条項 */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>ご利用にあたっての法的留意事項（免責事項）</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-600">
                    <li>
                        <strong className="text-slate-700">独自抽出・加工の明示:</strong> 本サービスに掲載されている公的記録は、各省庁が公表する公開データをもとにMIERISが独自に抽出・編集したものであり、国・各省庁が本サービスや掲載内容を直接認証・保証したものではありません。
                    </li>
                    <li>
                        <strong className="text-slate-700">公表時点と最新状況:</strong> 各データは各機関における公表時点の記録です。処分期間の満了、改善報告の受理、不服申立て、是正措置の完了等により現在の営業状態や是正状況が更新されている場合があります。最新の正確な情報は、必ず各公表元の一次資料または管轄行政機関へ直接ご確認ください。
                    </li>
                    <li>
                        <strong className="text-slate-700">免責条項:</strong> 国および公的データ提供機関、ならびに本サービス運営者は、利用者が本公的データを用いて行う一切の判断・行為およびそれによって生じた損害について、何ら責任を負うものではありません。
                    </li>
                </ul>
            </div>
        </div>
    );
}
