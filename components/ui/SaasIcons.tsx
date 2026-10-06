import React from "react";

/**
 * 国産大手SaaS（Smaregi / SmartHR）準拠
 * デュオトーン アブストラクト・幾何学ベクターSVGアイコン集（全14種 + 拡張）
 *
 * 汎用の単色Lucideアイコンや安っぽい塗りを排除し、
 * プロフェッショナルなB2B SaaS水準の幾何学ベクターグラフィックを提供します。
 */

// 1. 勤怠管理・人物照会 (スマホ打刻・WEB打刻・人物スキャン)
export function IcAttendance({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* スマホ外枠 */}
      <rect x="14" y="6" width="36" height="52" rx="7" fill="#f8fafc" stroke="#64748b" strokeWidth="2.5" />
      {/* スマホ画面 */}
      <rect x="18" y="13" width="28" height="38" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
      {/* 上部スピーカーバー */}
      <line x1="28" y1="9.5" x2="36" y2="9.5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      {/* パルス波紋 (打刻・照会感知) */}
      <circle cx="32" cy="32" r="14" stroke="#bfdbfe" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* 打刻メインボタン (鮮やかなブルー) */}
      <circle cx="32" cy="32" r="9" fill="#2563eb" />
      {/* ボタン内部のチェックマーク */}
      <path d="M28.5 32L31 34.5L35.5 29.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* 時刻表示ミニドット */}
      <circle cx="24" cy="18" r="1.5" fill="#3b82f6" />
      <circle cx="28" cy="18" r="1.5" fill="#3b82f6" />
      <circle cx="32" cy="18" r="1.5" fill="#cbd5e1" />
      <circle cx="36" cy="18" r="1.5" fill="#cbd5e1" />
    </svg>
  );
}

// 2. シフト管理 (カレンダー＆シフト帯)
export function IcShift({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* カレンダーベース */}
      <rect x="8" y="12" width="48" height="42" rx="6" fill="#f8fafc" stroke="#64748b" strokeWidth="2.5" />
      {/* カレンダーヘッダー */}
      <path d="M8 18C8 14.6863 10.6863 12 14 12H50C53.3137 12 56 14.6863 56 18V22H8V18Z" fill="#e2e8f0" />
      {/* バインダーリング */}
      <line x1="20" y1="8" x2="20" y2="14" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="44" y1="8" x2="44" y2="14" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      {/* シフトバー1 (早番・ブルー) */}
      <rect x="14" y="27" width="22" height="7" rx="3.5" fill="#2563eb" />
      <circle cx="18" cy="30.5" r="1.8" fill="#ffffff" />
      <line x1="22" y1="30.5" x2="31" y2="30.5" stroke="#bfdbfe" strokeWidth="1.5" strokeLinecap="round" />
      {/* シフトバー2 (遅番・スカイブルー) */}
      <rect x="28" y="38" width="22" height="7" rx="3.5" fill="#60a5fa" />
      <circle cx="32" cy="41.5" r="1.8" fill="#ffffff" />
      <line x1="36" y1="41.5" x2="45" y2="41.5" stroke="#dbeafe" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 3. 休暇管理 (有休・振休・リフレッシュ)
export function IcHoliday({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 日めくりシート */}
      <rect x="10" y="10" width="44" height="44" rx="6" fill="#ffffff" stroke="#64748b" strokeWidth="2.5" />
      {/* ヘッダーカラー帯 */}
      <path d="M10 16C10 12.6863 12.6863 10 16 10H48C51.3137 10 54 12.6863 54 16V22H10V16Z" fill="#3b82f6" />
      {/* 吊り下げホール */}
      <circle cx="32" cy="16" r="2.5" fill="#ffffff" />
      {/* 太陽の幾何学シンボル (リフレッシュ休暇) */}
      <circle cx="32" cy="37" r="7" fill="#fbbf24" />
      {/* サンレイ */}
      <line x1="32" y1="26" x2="32" y2="28" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="46" x2="32" y2="48" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <line x1="21" y1="37" x2="23" y2="37" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <line x1="41" y1="37" x2="43" y2="37" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      {/* 右下の承認チェックバッジ */}
      <circle cx="46" cy="46" r="6" fill="#10b981" />
      <path d="M43.5 46L45.5 48L49 44.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 4. 労務アラート・信用ウォッチ (スピードメーター＆警告針)
export function IcWorkAlert({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* メーター外周アーチ */}
      <path d="M12 44C12 28.536 24.536 16 40 16C46.8839 16 53.1895 18.4777 58 22.6" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
      {/* 安全ゾーン (ブルー) */}
      <path d="M12 44C12 34 16 26 23 20" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
      {/* 警告危険ゾーン (アンバー〜レッド) */}
      <path d="M47 17.5C51 20 54.5 23.5 57 28" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
      {/* メーターセンター基点 */}
      <circle cx="36" cy="44" r="5" fill="#334155" />
      {/* 指針ニードル (上限手前を指す) */}
      <line x1="36" y1="44" x2="47" y2="24" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      <circle cx="36" cy="44" r="2" fill="#ffffff" />
      {/* 警告エクスクラメーションバッジ */}
      <g transform="translate(10, 8)">
        <polygon points="12,2 22,20 2,20" fill="#f59e0b" />
        <line x1="12" y1="8" x2="12" y2="13" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="17" r="1" fill="#ffffff" />
      </g>
    </svg>
  );
}

// 5. 変形労働時間制・設定 (フレキシブルスライダーレール)
export function IcVariableHours({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 外枠バックプレート */}
      <rect x="8" y="14" width="48" height="36" rx="6" fill="#f8fafc" stroke="#64748b" strokeWidth="2.5" />
      {/* 上段レール (繁忙期シフト) */}
      <line x1="16" y1="25" x2="48" y2="25" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
      {/* 繁忙期アクティブ区間 */}
      <line x1="20" y1="25" x2="44" y2="25" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      <circle cx="44" cy="25" r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
      {/* 下段レール (閑散期シフト) */}
      <line x1="16" y1="39" x2="48" y2="39" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
      {/* 閑散期アクティブ区間 */}
      <line x1="16" y1="39" x2="32" y2="39" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="39" r="4.5" fill="#60a5fa" stroke="#ffffff" strokeWidth="1.5" />
      {/* 調整インジケーターマーク */}
      <path d="M38 36L41 39L38 42" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M46 36L49 39L46 42" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 6. 給与計算・債権照会 (明細書・自動算出グラフ・通貨)
export function IcPayroll({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 伝票シート */}
      <rect x="12" y="8" width="40" height="48" rx="5" fill="#ffffff" stroke="#64748b" strokeWidth="2.5" />
      {/* シート上部タイトルバー */}
      <line x1="18" y1="16" x2="32" y2="16" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
      {/* 項目ライン */}
      <line x1="18" y1="23" x2="38" y2="23" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="29" x2="46" y2="29" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="35" x2="42" y2="35" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" />
      {/* 給与即時確定の円形コインバッジ */}
      <circle cx="38" cy="42" r="10" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
      {/* 円マーク / 通貨記号 */}
      <path d="M34 37L38 43L42 37M38 43V47M35 42H41M35 45H41" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 7. 年末調整・書類確認 (年調申告書・受領スタンプ)
export function IcYearEnd({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* ドキュメントフォルダ */}
      <path d="M10 14C10 11.7909 11.7909 10 14 10H26L30 15H50C52.2091 15 54 16.7909 54 19V50C54 52.2091 52.2091 54 50 54H14C11.7909 54 10 52.2091 10 50V14Z" fill="#f8fafc" stroke="#64748b" strokeWidth="2.5" />
      {/* 書類ペーパーが少し覗く */}
      <rect x="18" y="22" width="28" height="24" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
      <line x1="22" y1="28" x2="38" y2="28" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="33" x2="42" y2="33" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="38" x2="32" y2="38" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
      {/* 電子控除・完了チェックスタンプ */}
      <circle cx="44" cy="42" r="9" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
      <path d="M40 42L43 45L48 39" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 8. 人時売上高・生産性・信用度分析 (時計半円＆売上上昇棒グラフ)
export function IcManHourSales({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 座標軸ライン */}
      <path d="M10 52H54" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
      {/* バーチャート 1 (低) */}
      <rect x="14" y="38" width="8" height="14" rx="2" fill="#cbd5e1" />
      {/* バーチャート 2 (中) */}
      <rect x="26" y="28" width="8" height="24" rx="2" fill="#60a5fa" />
      {/* バーチャート 3 (高・人時売上トップ) */}
      <rect x="38" y="16" width="8" height="36" rx="2" fill="#2563eb" />
      {/* 生産性上昇トレンド矢印 */}
      <path d="M16 32L28 22L42 10M42 10H34M42 10V18" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* トレンドピークドット */}
      <circle cx="42" cy="10" r="2.5" fill="#2563eb" />
    </svg>
  );
}

// 9. 法定三帳簿・登録データ一覧 (3重公式帳簿シート＆公印)
export function IcStatutoryLedgers({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 3枚目の紙 (奥) */}
      <rect x="20" y="8" width="34" height="42" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
      {/* 2枚目の紙 (中) */}
      <rect x="15" y="13" width="34" height="42" rx="4" fill="#f1f5f9" stroke="#64748b" strokeWidth="1.5" />
      {/* 1枚目の紙 (手前・法定出勤簿/事故台帳) */}
      <rect x="10" y="18" width="34" height="42" rx="4" fill="#ffffff" stroke="#334155" strokeWidth="2" />
      {/* 罫線と記録行 */}
      <line x1="16" y1="26" x2="38" y2="26" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="32" x2="38" y2="32" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="37" x2="38" y2="37" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="42" x2="30" y2="42" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
      {/* 労基署対応・公式承認印 (赤・朱肉風) */}
      <circle cx="36" cy="46" r="6" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 1" />
      <path d="M34 46H38M36 44V48" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 10. 離職率・定着分析・人物信用組織 (従業員ピクト＆定着ベース)
export function IcTurnoverRate({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 定着ベースプレート */}
      <rect x="8" y="46" width="48" height="6" rx="3" fill="#e2e8f0" />
      {/* 左スタッフ */}
      <circle cx="18" cy="22" r="4.5" fill="#94a3b8" />
      <path d="M12 38C12 32.5 14.5 30 18 30C21.5 30 24 32.5 24 38" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      {/* 中央キースタッフ (定着・ブルー) */}
      <circle cx="32" cy="18" r="6" fill="#2563eb" />
      <path d="M23 38C23 31 27 28 32 28C37 28 41 31 41 38" fill="#2563eb" />
      {/* 右スタッフ */}
      <circle cx="46" cy="22" r="4.5" fill="#94a3b8" />
      <path d="M40 38C40 32.5 42.5 30 46 30C49.5 30 52 32.5 52 38" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
      {/* 定着率向上バッジ */}
      <circle cx="46" cy="12" r="5" fill="#10b981" />
      <path d="M46 9.5V14.5M43.5 12H48.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 11. 日報管理・トラブル新規登録 (クリップボード＆業務進捗チェック)
export function IcDailyReport({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* クリップボード台板 */}
      <rect x="12" y="12" width="40" height="46" rx="5" fill="#f8fafc" stroke="#64748b" strokeWidth="2.5" />
      {/* 上部金具クリップ */}
      <path d="M24 12V8C24 6.89543 24.8954 6 26 6H38C39.1046 6 40 6.89543 40 8V12H24Z" fill="#334155" />
      <circle cx="32" cy="10" r="1.5" fill="#ffffff" />
      {/* チェック行 1 */}
      <circle cx="20" cy="24" r="3" fill="#2563eb" />
      <line x1="27" y1="24" x2="44" y2="24" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
      {/* チェック行 2 */}
      <circle cx="20" cy="34" r="3" fill="#2563eb" />
      <line x1="27" y1="34" x2="44" y2="34" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
      {/* チェック行 3 */}
      <circle cx="20" cy="44" r="3" fill="#60a5fa" />
      <line x1="27" y1="44" x2="38" y2="44" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 12. プロジェクト管理・企業信用モニタリング (ガントチャート・タイムライン)
export function IcProject({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* モニター外枠 */}
      <rect x="8" y="10" width="48" height="42" rx="6" fill="#f8fafc" stroke="#64748b" strokeWidth="2.5" />
      {/* タイムライングリッド縦線 */}
      <line x1="22" y1="16" x2="22" y2="46" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="2 2" />
      <line x1="36" y1="16" x2="36" y2="46" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="2 2" />
      {/* タスクバー 1 */}
      <rect x="14" y="19" width="18" height="6" rx="3" fill="#2563eb" />
      {/* タスクバー 2 (接続) */}
      <rect x="26" y="29" width="22" height="6" rx="3" fill="#60a5fa" />
      {/* タスクバー 3 (マイルストーン) */}
      <rect x="20" y="39" width="16" height="6" rx="3" fill="#38bdf8" />
      {/* マイルストーンダイヤモンド */}
      <polygon points="44,39 47,42 44,45 41,42" fill="#f59e0b" />
    </svg>
  );
}

// 13. ワークフロー・遅延未払い申請 (申請〜承認印スタンプフロー)
export function IcWorkflow({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 申請ドキュメント (左上) */}
      <rect x="10" y="12" width="22" height="26" rx="3" fill="#ffffff" stroke="#64748b" strokeWidth="2" />
      <line x1="15" y1="18" x2="25" y2="18" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="24" x2="27" y2="24" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15" y1="29" x2="22" y2="29" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
      {/* 承認ルート進行矢印 */}
      <path d="M26 38L32 44H40" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* 承認印鑑スタンプ (右下・二重丸) */}
      <circle cx="44" cy="38" r="12" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
      <circle cx="44" cy="38" r="9.5" stroke="#2563eb" strokeWidth="1" strokeDasharray="2 1" />
      {/* 承認印文字「承認」の幾何学的表現 */}
      <path d="M40 35L43 38L48 33" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="41" y="40" width="6" height="2" rx="1" fill="#2563eb" />
    </svg>
  );
}

// 14. セキュリティ監査・内部統制 (強固なシールド＆デジタルロック)
export function IcSecurityAudit({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 堅牢なセキュリティシールド */}
      <path d="M32 8L50 15V32C50 44 42 52 32 56C22 52 14 44 14 32V15L32 8Z" fill="#f8fafc" stroke="#64748b" strokeWidth="2.5" strokeLinejoin="round" />
      {/* シールド右半分シャドウ（立体感） */}
      <path d="M32 9V55C41 51 48.5 43.5 48.5 32V15.5L32 9Z" fill="#e2e8f0" opacity="0.6" />
      {/* 南京錠ボディ */}
      <rect x="25" y="28" width="14" height="12" rx="2.5" fill="#2563eb" />
      {/* 南京錠シャックル (掛け金) */}
      <path d="M28 28V23C28 20.7909 29.7909 19 32 19C34.2091 19 36 20.7909 36 23V28" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
      {/* 鍵穴 */}
      <circle cx="32" cy="33" r="1.5" fill="#ffffff" />
      <path d="M32 34.5V37" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 15. 企業信用ビルディング（B2B SaaS 企業照会・ビルディング＆リサーチピクト）
export function IcCorporateTrust({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 後方ビル */}
      <rect x="12" y="22" width="18" height="34" rx="2" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" />
      <line x1="17" y1="28" x2="25" y2="28" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="17" y1="34" x2="25" y2="34" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="17" y1="40" x2="25" y2="40" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

      {/* メイン本社タワービル */}
      <rect x="26" y="10" width="24" height="46" rx="3" fill="#ffffff" stroke="#334155" strokeWidth="2.5" />
      {/* 最上部アンテナ */}
      <line x1="38" y1="5" x2="38" y2="10" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
      {/* 窓グリッド */}
      <rect x="31" y="17" width="5" height="5" rx="1" fill="#bfdbfe" />
      <rect x="40" y="17" width="5" height="5" rx="1" fill="#bfdbfe" />
      <rect x="31" y="26" width="5" height="5" rx="1" fill="#2563eb" />
      <rect x="40" y="26" width="5" height="5" rx="1" fill="#2563eb" />
      <rect x="31" y="35" width="5" height="5" rx="1" fill="#bfdbfe" />
      <rect x="40" y="35" width="5" height="5" rx="1" fill="#bfdbfe" />
      {/* エントランス */}
      <path d="M35 56V48H41V56" fill="#334155" />

      {/* 信用照会虫眼鏡バッジ (右下) */}
      <circle cx="46" cy="46" r="8" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
      <circle cx="45" cy="45" r="4" stroke="#ffffff" strokeWidth="1.5" />
      <line x1="48" y1="48" x2="51" y2="51" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 16. 人物信用スキャン（人物プロファイル＋照会虫眼鏡・デューデリジェンス）
export function IcPersonSearch({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* プロファイルIDカードベース */}
      <rect x="10" y="10" width="44" height="44" rx="7" fill="#ffffff" stroke="#64748b" strokeWidth="2.5" />
      {/* 上部ヘッダーカラー */}
      <path d="M10 17C10 13.134 13.134 10 17 10H47C50.866 10 54 13.134 54 17V21H10V17Z" fill="#e2e8f0" />
      {/* ストラップスリット */}
      <rect x="27" y="13" width="10" height="3" rx="1.5" fill="#94a3b8" />
      
      {/* 人物アバター */}
      <circle cx="24" cy="31" r="5" fill="#334155" />
      <path d="M16 45C16 40.5 19.5 38.5 24 38.5C28.5 38.5 32 40.5 32 45" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* プロファイル情報ライン */}
      <line x1="36" y1="29" x2="46" y2="29" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
      <line x1="36" y1="35" x2="44" y2="35" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="36" y1="41" x2="42" y2="41" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />

      {/* 照会虫眼鏡バッジ (右下) */}
      <circle cx="46" cy="46" r="9" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
      <circle cx="44.5" cy="44.5" r="4" stroke="#ffffff" strokeWidth="1.5" />
      <line x1="47.5" y1="47.5" x2="51" y2="51" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
