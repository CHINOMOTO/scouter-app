export const calculateCombatPower = (text: string): number => {
    let power = 0;

    // ベース戦闘力
    power += 5; // 一般人の戦闘力は5

    if (!text) return power;

    // キーワードボーナス
    const keywords: { [key: string]: number } = {
        "横領": 530000, // フリーザ様(第一形態)級
        "着服": 530000,
        "逮捕": 530000,
        "暴行": 120000, // ギニュー隊長級
        "傷害": 120000,
        "恐喝": 100000,
        "詐欺": 80000,
        "窃盗": 60000,
        "情報漏洩": 50000,
        "無断欠勤": 18000, // キュイ級
        "バックレ": 18000,
        "飛んだ": 18000,
        "パワハラ": 15000,
        "セクハラ": 15000,
        "酒": 4000, // ナッパ(平常時)級
        "飲酒": 4000,
        "遅刻": 1500, // ラディッツ級
        "口論": 1200, // サイバイマン級
        "サボり": 1000,
        "虚偽": 3000,
        "嘘": 3000,
    };

    Object.entries(keywords).forEach(([keyword, score]) => {
        if (text.includes(keyword)) {
            power += score;
        }
    });

    // 文字数ボーナス (詳細に書かれているほど高い)
    // 1文字あたり10ポイント (最大10000ポイント)
    power += Math.min(text.length * 10, 10000);

    return power;
};

export const getMierisColor = (power: number): string => {
    if (power >= 530000) return "text-purple-500 shadow-purple-500/50"; // ヤバい
    if (power >= 100000) return "text-red-500 shadow-red-500/50"; // 危険
    if (power >= 10000) return "text-orange-500 shadow-orange-500/50"; // 注意
    if (power >= 1000) return "text-yellow-400 shadow-yellow-400/50"; // 警戒
    return "text-emerald-400 shadow-emerald-400/50"; // 安全圏
};
