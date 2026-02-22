// lib/voice/default-vocabulary.ts — 診療科別デフォルト医療辞書
// テナント初期セットアップ時に medical_vocabulary テーブルに一括 INSERT する

export type VocabEntry = {
  term: string;
  reading?: string;
  category: "drug" | "symptom" | "procedure" | "anatomy" | "lab" | "general";
  boost_weight: number;
};

/** 診療科カテゴリ */
export type Specialty =
  | "common"
  | "beauty"
  | "internal"
  | "surgery"
  | "orthopedics"
  | "dermatology";

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  common: "共通（全科）",
  beauty: "美容（自由診療）",
  internal: "内科",
  surgery: "外科",
  orthopedics: "整形外科",
  dermatology: "皮膚科",
};

/** カテゴリラベル */
export const CATEGORY_LABELS: Record<VocabEntry["category"], string> = {
  drug: "薬剤",
  symptom: "症状",
  procedure: "処置・検査",
  anatomy: "解剖",
  lab: "検査値",
  general: "その他",
};

// ================================================================
// 共通（全科）— 全テナントに必ず適用
// ================================================================
const COMMON: VocabEntry[] = [
  // バイタル・基本
  { term: "バイタルサイン", category: "general", boost_weight: 1.5 },
  { term: "血圧", reading: "けつあつ", category: "lab", boost_weight: 1.5 },
  { term: "脈拍", reading: "みゃくはく", category: "lab", boost_weight: 1.5 },
  { term: "体温", reading: "たいおん", category: "lab", boost_weight: 1.5 },
  { term: "SpO2", category: "lab", boost_weight: 2.0 },
  { term: "BMI", category: "lab", boost_weight: 1.5 },
  // 問診基本
  { term: "既往歴", reading: "きおうれき", category: "general", boost_weight: 1.5 },
  { term: "現病歴", reading: "げんびょうれき", category: "general", boost_weight: 1.5 },
  { term: "家族歴", reading: "かぞくれき", category: "general", boost_weight: 1.5 },
  { term: "アレルギー", category: "general", boost_weight: 1.5 },
  { term: "副作用", reading: "ふくさよう", category: "general", boost_weight: 1.5 },
  { term: "禁忌", reading: "きんき", category: "general", boost_weight: 1.5 },
  { term: "アナフィラキシー", category: "symptom", boost_weight: 2.0 },
  // 処方関連
  { term: "処方", reading: "しょほう", category: "general", boost_weight: 1.5 },
  { term: "用量", reading: "ようりょう", category: "general", boost_weight: 1.5 },
  { term: "用法", reading: "ようほう", category: "general", boost_weight: 1.5 },
  { term: "増量", reading: "ぞうりょう", category: "general", boost_weight: 1.5 },
  { term: "減量", reading: "げんりょう", category: "general", boost_weight: 1.5 },
  { term: "投与", reading: "とうよ", category: "general", boost_weight: 1.5 },
  { term: "経口", reading: "けいこう", category: "general", boost_weight: 1.5 },
  { term: "外用", reading: "がいよう", category: "general", boost_weight: 1.5 },
  { term: "頓服", reading: "とんぷく", category: "general", boost_weight: 1.5 },
  // 単位
  { term: "mg", category: "general", boost_weight: 1.0 },
  { term: "mL", category: "general", boost_weight: 1.0 },
  { term: "錠", reading: "じょう", category: "general", boost_weight: 1.0 },
  { term: "カプセル", category: "general", boost_weight: 1.0 },
  // カルテ用語
  { term: "主訴", reading: "しゅそ", category: "general", boost_weight: 1.5 },
  { term: "所見", reading: "しょけん", category: "general", boost_weight: 1.5 },
  { term: "経過観察", reading: "けいかかんさつ", category: "general", boost_weight: 1.5 },
  { term: "再診", reading: "さいしん", category: "general", boost_weight: 1.5 },
  { term: "初診", reading: "しょしん", category: "general", boost_weight: 1.5 },
  { term: "紹介状", reading: "しょうかいじょう", category: "general", boost_weight: 1.5 },
  { term: "同意書", reading: "どういしょ", category: "general", boost_weight: 1.0 },
  { term: "インフォームドコンセント", category: "general", boost_weight: 1.5 },
];

// ================================================================
// 美容（自由診療）
// ================================================================
const BEAUTY: VocabEntry[] = [
  // GLP-1 / ダイエット
  { term: "マンジャロ", category: "drug", boost_weight: 2.0 },
  { term: "チルゼパチド", category: "drug", boost_weight: 2.0 },
  { term: "オゼンピック", category: "drug", boost_weight: 2.0 },
  { term: "セマグルチド", category: "drug", boost_weight: 2.0 },
  { term: "リベルサス", category: "drug", boost_weight: 2.0 },
  { term: "サクセンダ", category: "drug", boost_weight: 2.0 },
  { term: "GLP-1", category: "drug", boost_weight: 2.0 },
  { term: "GLP-1受容体作動薬", reading: "じーえるぴーわんじゅようたいさどうやく", category: "drug", boost_weight: 2.0 },
  // AGA / 薄毛
  { term: "フィナステリド", category: "drug", boost_weight: 2.0 },
  { term: "デュタステリド", category: "drug", boost_weight: 2.0 },
  { term: "ミノキシジル", category: "drug", boost_weight: 2.0 },
  { term: "プロペシア", category: "drug", boost_weight: 2.0 },
  { term: "ザガーロ", category: "drug", boost_weight: 2.0 },
  { term: "AGA", category: "symptom", boost_weight: 2.0 },
  { term: "FAGA", category: "symptom", boost_weight: 2.0 },
  { term: "薄毛", reading: "うすげ", category: "symptom", boost_weight: 1.5 },
  { term: "脱毛", reading: "だつもう", category: "symptom", boost_weight: 1.5 },
  // 美容注射・施術
  { term: "ボトックス", category: "drug", boost_weight: 2.0 },
  { term: "ボツリヌストキシン", category: "drug", boost_weight: 2.0 },
  { term: "ヒアルロン酸", reading: "ひあるろんさん", category: "drug", boost_weight: 2.0 },
  { term: "ジュビダーム", category: "drug", boost_weight: 2.0 },
  { term: "レスチレン", category: "drug", boost_weight: 2.0 },
  { term: "水光注射", reading: "すいこうちゅうしゃ", category: "procedure", boost_weight: 1.5 },
  { term: "ダーマペン", category: "procedure", boost_weight: 1.5 },
  { term: "ピーリング", category: "procedure", boost_weight: 1.5 },
  { term: "ハイフ", category: "procedure", boost_weight: 2.0 },
  { term: "HIFU", category: "procedure", boost_weight: 2.0 },
  { term: "フォトフェイシャル", category: "procedure", boost_weight: 1.5 },
  { term: "IPL", category: "procedure", boost_weight: 1.5 },
  { term: "レーザートーニング", category: "procedure", boost_weight: 1.5 },
  // 肌・症状
  { term: "シミ", category: "symptom", boost_weight: 1.5 },
  { term: "しわ", category: "symptom", boost_weight: 1.5 },
  { term: "たるみ", category: "symptom", boost_weight: 1.5 },
  { term: "ニキビ", category: "symptom", boost_weight: 1.5 },
  { term: "ニキビ跡", reading: "にきびあと", category: "symptom", boost_weight: 1.5 },
  { term: "毛穴", reading: "けあな", category: "symptom", boost_weight: 1.5 },
  { term: "肝斑", reading: "かんぱん", category: "symptom", boost_weight: 2.0 },
  { term: "色素沈着", reading: "しきそちんちゃく", category: "symptom", boost_weight: 1.5 },
  // GLP-1 副作用
  { term: "嘔気", reading: "おうき", category: "symptom", boost_weight: 1.5 },
  { term: "嘔吐", reading: "おうと", category: "symptom", boost_weight: 1.5 },
  { term: "低血糖", reading: "ていけっとう", category: "symptom", boost_weight: 1.5 },
  { term: "下痢", reading: "げり", category: "symptom", boost_weight: 1.5 },
  { term: "便秘", reading: "べんぴ", category: "symptom", boost_weight: 1.5 },
  { term: "腹痛", reading: "ふくつう", category: "symptom", boost_weight: 1.5 },
  { term: "食欲不振", reading: "しょくよくふしん", category: "symptom", boost_weight: 1.5 },
  // 美容皮膚科
  { term: "トレチノイン", category: "drug", boost_weight: 2.0 },
  { term: "ハイドロキノン", category: "drug", boost_weight: 2.0 },
  { term: "ビタミンC誘導体", reading: "びたみんしーゆうどうたい", category: "drug", boost_weight: 1.5 },
  { term: "エラスチン", category: "general", boost_weight: 1.5 },
  { term: "コラーゲン", category: "general", boost_weight: 1.5 },
  { term: "プラセンタ", category: "drug", boost_weight: 1.5 },
  // ED
  { term: "シルデナフィル", category: "drug", boost_weight: 2.0 },
  { term: "タダラフィル", category: "drug", boost_weight: 2.0 },
  { term: "バルデナフィル", category: "drug", boost_weight: 2.0 },
  { term: "ED", category: "symptom", boost_weight: 1.5 },
  // ピル
  { term: "低用量ピル", reading: "ていようりょうぴる", category: "drug", boost_weight: 2.0 },
  { term: "マーベロン", category: "drug", boost_weight: 2.0 },
  { term: "トリキュラー", category: "drug", boost_weight: 2.0 },
  { term: "ファボワール", category: "drug", boost_weight: 2.0 },
];

// ================================================================
// 内科
// ================================================================
const INTERNAL: VocabEntry[] = [
  // 糖尿病
  { term: "糖尿病", reading: "とうにょうびょう", category: "symptom", boost_weight: 2.0 },
  { term: "HbA1c", category: "lab", boost_weight: 2.0 },
  { term: "血糖値", reading: "けっとうち", category: "lab", boost_weight: 1.5 },
  { term: "インスリン", category: "drug", boost_weight: 2.0 },
  { term: "メトホルミン", category: "drug", boost_weight: 2.0 },
  { term: "SGLT2阻害薬", reading: "えすじーえるてぃーつーそがいやく", category: "drug", boost_weight: 2.0 },
  { term: "DPP-4阻害薬", reading: "でぃーぴーぴーよんそがいやく", category: "drug", boost_weight: 2.0 },
  // 高血圧
  { term: "高血圧", reading: "こうけつあつ", category: "symptom", boost_weight: 2.0 },
  { term: "降圧薬", reading: "こうあつやく", category: "drug", boost_weight: 1.5 },
  { term: "ARB", category: "drug", boost_weight: 2.0 },
  { term: "ACE阻害薬", reading: "えーすそがいやく", category: "drug", boost_weight: 2.0 },
  { term: "Ca拮抗薬", reading: "かるしうむきっこうやく", category: "drug", boost_weight: 2.0 },
  { term: "アムロジピン", category: "drug", boost_weight: 2.0 },
  { term: "オルメサルタン", category: "drug", boost_weight: 2.0 },
  // 脂質異常
  { term: "脂質異常症", reading: "ししついじょうしょう", category: "symptom", boost_weight: 2.0 },
  { term: "LDLコレステロール", category: "lab", boost_weight: 2.0 },
  { term: "HDLコレステロール", category: "lab", boost_weight: 2.0 },
  { term: "中性脂肪", reading: "ちゅうせいしぼう", category: "lab", boost_weight: 1.5 },
  { term: "スタチン", category: "drug", boost_weight: 2.0 },
  { term: "ロスバスタチン", category: "drug", boost_weight: 2.0 },
  // 消化器
  { term: "逆流性食道炎", reading: "ぎゃくりゅうせいしょくどうえん", category: "symptom", boost_weight: 2.0 },
  { term: "PPI", category: "drug", boost_weight: 2.0 },
  { term: "ランソプラゾール", category: "drug", boost_weight: 2.0 },
  { term: "ヘリコバクターピロリ", category: "symptom", boost_weight: 2.0 },
  { term: "胃カメラ", reading: "いかめら", category: "procedure", boost_weight: 1.5 },
  { term: "大腸カメラ", reading: "だいちょうかめら", category: "procedure", boost_weight: 1.5 },
  // 呼吸器
  { term: "喘息", reading: "ぜんそく", category: "symptom", boost_weight: 2.0 },
  { term: "COPD", category: "symptom", boost_weight: 2.0 },
  { term: "吸入薬", reading: "きゅうにゅうやく", category: "drug", boost_weight: 1.5 },
  // 循環器
  { term: "心電図", reading: "しんでんず", category: "procedure", boost_weight: 1.5 },
  { term: "心エコー", reading: "しんえこー", category: "procedure", boost_weight: 1.5 },
  { term: "心房細動", reading: "しんぼうさいどう", category: "symptom", boost_weight: 2.0 },
  { term: "不整脈", reading: "ふせいみゃく", category: "symptom", boost_weight: 1.5 },
  { term: "ワーファリン", category: "drug", boost_weight: 2.0 },
  { term: "DOAC", category: "drug", boost_weight: 2.0 },
  // 検査値
  { term: "AST", category: "lab", boost_weight: 1.5 },
  { term: "ALT", category: "lab", boost_weight: 1.5 },
  { term: "γ-GTP", category: "lab", boost_weight: 1.5 },
  { term: "クレアチニン", category: "lab", boost_weight: 1.5 },
  { term: "eGFR", category: "lab", boost_weight: 2.0 },
  { term: "BUN", category: "lab", boost_weight: 1.5 },
  { term: "CRP", category: "lab", boost_weight: 1.5 },
  { term: "白血球", reading: "はっけっきゅう", category: "lab", boost_weight: 1.5 },
  { term: "ヘモグロビン", category: "lab", boost_weight: 1.5 },
  { term: "血小板", reading: "けっしょうばん", category: "lab", boost_weight: 1.5 },
  { term: "尿酸", reading: "にょうさん", category: "lab", boost_weight: 1.5 },
  { term: "TSH", category: "lab", boost_weight: 2.0 },
  { term: "FT3", category: "lab", boost_weight: 1.5 },
  { term: "FT4", category: "lab", boost_weight: 1.5 },
];

// ================================================================
// 外科
// ================================================================
const SURGERY: VocabEntry[] = [
  { term: "縫合", reading: "ほうごう", category: "procedure", boost_weight: 2.0 },
  { term: "切開", reading: "せっかい", category: "procedure", boost_weight: 1.5 },
  { term: "切除", reading: "せつじょ", category: "procedure", boost_weight: 1.5 },
  { term: "ドレーン", category: "procedure", boost_weight: 2.0 },
  { term: "デブリードマン", category: "procedure", boost_weight: 2.0 },
  { term: "局所麻酔", reading: "きょくしょますい", category: "procedure", boost_weight: 1.5 },
  { term: "全身麻酔", reading: "ぜんしんますい", category: "procedure", boost_weight: 1.5 },
  { term: "キシロカイン", category: "drug", boost_weight: 2.0 },
  { term: "リドカイン", category: "drug", boost_weight: 2.0 },
  { term: "創部", reading: "そうぶ", category: "anatomy", boost_weight: 1.5 },
  { term: "瘢痕", reading: "はんこん", category: "symptom", boost_weight: 2.0 },
  { term: "ケロイド", category: "symptom", boost_weight: 2.0 },
  { term: "膿瘍", reading: "のうよう", category: "symptom", boost_weight: 2.0 },
  { term: "蜂窩織炎", reading: "ほうかしきえん", category: "symptom", boost_weight: 2.0 },
  { term: "CT", category: "procedure", boost_weight: 1.5 },
  { term: "エコー", category: "procedure", boost_weight: 1.5 },
  { term: "生検", reading: "せいけん", category: "procedure", boost_weight: 2.0 },
  { term: "病理", reading: "びょうり", category: "procedure", boost_weight: 1.5 },
  { term: "術前", reading: "じゅつぜん", category: "general", boost_weight: 1.0 },
  { term: "術後", reading: "じゅつご", category: "general", boost_weight: 1.0 },
  { term: "抜糸", reading: "ばっし", category: "procedure", boost_weight: 1.5 },
  { term: "消毒", reading: "しょうどく", category: "procedure", boost_weight: 1.0 },
  { term: "ガーゼ", category: "general", boost_weight: 1.0 },
  { term: "止血", reading: "しけつ", category: "procedure", boost_weight: 1.5 },
  { term: "バイポーラ", category: "procedure", boost_weight: 1.5 },
  { term: "腹腔鏡", reading: "ふくくうきょう", category: "procedure", boost_weight: 2.0 },
  { term: "開腹", reading: "かいふく", category: "procedure", boost_weight: 1.5 },
  { term: "虫垂炎", reading: "ちゅうすいえん", category: "symptom", boost_weight: 2.0 },
  { term: "ヘルニア", category: "symptom", boost_weight: 2.0 },
  { term: "胆嚢摘出", reading: "たんのうてきしゅつ", category: "procedure", boost_weight: 2.0 },
];

// ================================================================
// 整形外科
// ================================================================
const ORTHOPEDICS: VocabEntry[] = [
  // 検査
  { term: "MRI", category: "procedure", boost_weight: 2.0 },
  { term: "レントゲン", category: "procedure", boost_weight: 1.5 },
  { term: "X線", reading: "えっくすせん", category: "procedure", boost_weight: 1.5 },
  { term: "骨密度", reading: "こつみつど", category: "lab", boost_weight: 2.0 },
  { term: "DEXA", category: "procedure", boost_weight: 2.0 },
  // 疾患
  { term: "骨折", reading: "こっせつ", category: "symptom", boost_weight: 2.0 },
  { term: "捻挫", reading: "ねんざ", category: "symptom", boost_weight: 1.5 },
  { term: "脱臼", reading: "だっきゅう", category: "symptom", boost_weight: 2.0 },
  { term: "靭帯損傷", reading: "じんたいそんしょう", category: "symptom", boost_weight: 2.0 },
  { term: "半月板", reading: "はんげつばん", category: "anatomy", boost_weight: 2.0 },
  { term: "椎間板ヘルニア", reading: "ついかんばんへるにあ", category: "symptom", boost_weight: 2.0 },
  { term: "脊柱管狭窄症", reading: "せきちゅうかんきょうさくしょう", category: "symptom", boost_weight: 2.0 },
  { term: "変形性膝関節症", reading: "へんけいせいしつかんせつしょう", category: "symptom", boost_weight: 2.0 },
  { term: "変形性股関節症", reading: "へんけいせいこかんせつしょう", category: "symptom", boost_weight: 2.0 },
  { term: "腱鞘炎", reading: "けんしょうえん", category: "symptom", boost_weight: 2.0 },
  { term: "ばね指", reading: "ばねゆび", category: "symptom", boost_weight: 1.5 },
  { term: "手根管症候群", reading: "しゅこんかんしょうこうぐん", category: "symptom", boost_weight: 2.0 },
  { term: "骨粗鬆症", reading: "こつそしょうしょう", category: "symptom", boost_weight: 2.0 },
  // 処置
  { term: "関節鏡", reading: "かんせつきょう", category: "procedure", boost_weight: 2.0 },
  { term: "ギプス", category: "procedure", boost_weight: 1.5 },
  { term: "シーネ", category: "procedure", boost_weight: 1.5 },
  { term: "リハビリ", category: "procedure", boost_weight: 1.5 },
  { term: "関節注射", reading: "かんせつちゅうしゃ", category: "procedure", boost_weight: 1.5 },
  { term: "トリガーポイント", category: "procedure", boost_weight: 1.5 },
  { term: "ブロック注射", reading: "ぶろっくちゅうしゃ", category: "procedure", boost_weight: 1.5 },
  // 薬剤
  { term: "ロキソニン", category: "drug", boost_weight: 2.0 },
  { term: "ロキソプロフェン", category: "drug", boost_weight: 2.0 },
  { term: "セレコキシブ", category: "drug", boost_weight: 2.0 },
  { term: "NSAIDs", category: "drug", boost_weight: 2.0 },
  { term: "ビスホスホネート", category: "drug", boost_weight: 2.0 },
  { term: "デノスマブ", category: "drug", boost_weight: 2.0 },
  // 解剖
  { term: "頸椎", reading: "けいつい", category: "anatomy", boost_weight: 1.5 },
  { term: "胸椎", reading: "きょうつい", category: "anatomy", boost_weight: 1.5 },
  { term: "腰椎", reading: "ようつい", category: "anatomy", boost_weight: 1.5 },
  { term: "仙骨", reading: "せんこつ", category: "anatomy", boost_weight: 1.5 },
  { term: "前十字靭帯", reading: "ぜんじゅうじじんたい", category: "anatomy", boost_weight: 2.0 },
  { term: "ACL", category: "anatomy", boost_weight: 2.0 },
  { term: "アキレス腱", reading: "あきれすけん", category: "anatomy", boost_weight: 1.5 },
  { term: "大腿骨", reading: "だいたいこつ", category: "anatomy", boost_weight: 1.5 },
  { term: "脛骨", reading: "けいこつ", category: "anatomy", boost_weight: 1.5 },
  { term: "腓骨", reading: "ひこつ", category: "anatomy", boost_weight: 1.5 },
];

// ================================================================
// 皮膚科
// ================================================================
const DERMATOLOGY: VocabEntry[] = [
  // 疾患
  { term: "アトピー性皮膚炎", reading: "あとぴーせいひふえん", category: "symptom", boost_weight: 2.0 },
  { term: "湿疹", reading: "しっしん", category: "symptom", boost_weight: 1.5 },
  { term: "蕁麻疹", reading: "じんましん", category: "symptom", boost_weight: 2.0 },
  { term: "帯状疱疹", reading: "たいじょうほうしん", category: "symptom", boost_weight: 2.0 },
  { term: "白癬", reading: "はくせん", category: "symptom", boost_weight: 2.0 },
  { term: "水虫", reading: "みずむし", category: "symptom", boost_weight: 1.5 },
  { term: "乾癬", reading: "かんせん", category: "symptom", boost_weight: 2.0 },
  { term: "脂漏性皮膚炎", reading: "しろうせいひふえん", category: "symptom", boost_weight: 2.0 },
  { term: "接触性皮膚炎", reading: "せっしょくせいひふえん", category: "symptom", boost_weight: 2.0 },
  { term: "尋常性ざ瘡", reading: "じんじょうせいざそう", category: "symptom", boost_weight: 2.0 },
  { term: "酒さ", reading: "しゅさ", category: "symptom", boost_weight: 2.0 },
  { term: "円形脱毛症", reading: "えんけいだつもうしょう", category: "symptom", boost_weight: 2.0 },
  { term: "粉瘤", reading: "ふんりゅう", category: "symptom", boost_weight: 2.0 },
  { term: "脂肪腫", reading: "しぼうしゅ", category: "symptom", boost_weight: 2.0 },
  { term: "疣贅", reading: "ゆうぜい", category: "symptom", boost_weight: 2.0 },
  { term: "イボ", category: "symptom", boost_weight: 1.5 },
  { term: "ホクロ", category: "symptom", boost_weight: 1.5 },
  { term: "基底細胞癌", reading: "きていさいぼうがん", category: "symptom", boost_weight: 2.0 },
  { term: "悪性黒色腫", reading: "あくせいこくしょくしゅ", category: "symptom", boost_weight: 2.0 },
  // 薬剤
  { term: "ステロイド外用", reading: "すてろいどがいよう", category: "drug", boost_weight: 2.0 },
  { term: "デルモベート", category: "drug", boost_weight: 2.0 },
  { term: "アンテベート", category: "drug", boost_weight: 2.0 },
  { term: "リンデロン", category: "drug", boost_weight: 2.0 },
  { term: "プロトピック", category: "drug", boost_weight: 2.0 },
  { term: "タクロリムス", category: "drug", boost_weight: 2.0 },
  { term: "デュピクセント", category: "drug", boost_weight: 2.0 },
  { term: "デュピルマブ", category: "drug", boost_weight: 2.0 },
  { term: "ヒルドイド", category: "drug", boost_weight: 2.0 },
  { term: "ヘパリン類似物質", reading: "へぱりんるいじぶっしつ", category: "drug", boost_weight: 1.5 },
  { term: "保湿剤", reading: "ほしつざい", category: "drug", boost_weight: 1.0 },
  { term: "抗ヒスタミン薬", reading: "こうひすたみんやく", category: "drug", boost_weight: 1.5 },
  { term: "アレグラ", category: "drug", boost_weight: 1.5 },
  { term: "ザイザル", category: "drug", boost_weight: 1.5 },
  // 処置
  { term: "光線療法", reading: "こうせんりょうほう", category: "procedure", boost_weight: 1.5 },
  { term: "ナローバンドUVB", category: "procedure", boost_weight: 2.0 },
  { term: "液体窒素", reading: "えきたいちっそ", category: "procedure", boost_weight: 2.0 },
  { term: "凍結療法", reading: "とうけつりょうほう", category: "procedure", boost_weight: 1.5 },
  { term: "パッチテスト", category: "procedure", boost_weight: 1.5 },
  { term: "ダーモスコピー", category: "procedure", boost_weight: 2.0 },
  { term: "皮膚生検", reading: "ひふせいけん", category: "procedure", boost_weight: 2.0 },
];

// ================================================================
// エクスポート
// ================================================================
export const DEFAULT_VOCABULARY: Record<Specialty, VocabEntry[]> = {
  common: COMMON,
  beauty: BEAUTY,
  internal: INTERNAL,
  surgery: SURGERY,
  orthopedics: ORTHOPEDICS,
  dermatology: DERMATOLOGY,
};

/** 指定された診療科のデフォルト辞書を取得（共通 + 選択科の合算） */
export function getDefaultVocabulary(specialties: Specialty[]): VocabEntry[] {
  const result: VocabEntry[] = [...COMMON];
  const added = new Set(COMMON.map((v) => v.term));

  for (const sp of specialties) {
    if (sp === "common") continue;
    const entries = DEFAULT_VOCABULARY[sp];
    if (!entries) continue;
    for (const entry of entries) {
      if (!added.has(entry.term)) {
        result.push(entry);
        added.add(entry.term);
      }
    }
  }

  return result;
}

/** 全診療科の用語数サマリー */
export function getVocabularySummary(): Record<Specialty, number> {
  return Object.fromEntries(
    Object.entries(DEFAULT_VOCABULARY).map(([key, entries]) => [key, entries.length])
  ) as Record<Specialty, number>;
}
