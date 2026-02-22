// デモ用モックデータ

export interface DemoPatient {
  id: string;
  name: string;
  kana: string;
  gender: "男性" | "女性";
  age: number;
  birthDate: string;
  tel: string;
  email: string;
  lineDisplayName: string;
  linePictureUrl: string | null;
  tags: { name: string; color: string }[];
  mark: string;
  lastVisit: string;
  memo: string;
  // 医療情報
  allergies: string;
  medHistory: string;
  glp1History: string;
  currentMeds: string;
  // 住所
  postalCode: string;
  address: string;
  // リッチメニュー
  richMenuName: string;
}

export interface DemoMessage {
  id: number;
  content: string;
  direction: "incoming" | "outgoing";
  sentAt: string;
  type: "text" | "image" | "stamp";
}

export interface DemoReservation {
  id: string;
  patientId: string;
  patientName: string;
  patientKana: string;
  patientGender: "男性" | "女性";
  patientAge: number;
  patientBirthDate: string;
  date: string;
  time: string;
  menu: string;
  status: "未診" | "OK" | "NG" | "キャンセル";
  karteNote?: string;
  allergies: string;
  medHistory: string;
  glp1History: string;
  currentMeds: string;
}

export interface DemoBroadcast {
  id: string;
  title: string;
  body: string;
  segment: string;
  sentAt: string;
  targetCount: number;
  openRate: number;
  clickRate: number;
}

export interface DemoShipment {
  id: string;
  patientName: string;
  product: string;
  paymentMethod: string;
  paidAt: string;
  status: "発送待ち" | "発送済み" | "配達完了";
  trackingNumber: string | null;
  address: string;
}

export interface DemoOrder {
  id: string;
  patientId: string;
  product: string;
  amount: number;
  paymentMethod: "カード" | "銀行振込";
  paidAt: string;
  status: "完了" | "返金済み";
  trackingNumber: string | null;
}

export interface DemoReorder {
  id: string;
  patientId: string;
  patientName: string;
  product: string;
  previousProduct: string;
  requestedAt: string;
  status: "申請中" | "承認済み" | "決済済み" | "発送済み" | "拒否";
  karteNote?: string;
}

export interface DemoTagDefinition {
  id: string;
  name: string;
  color: string;
  count: number;
  description: string;
}

export interface DemoRichMenu {
  id: string;
  name: string;
  description: string;
  userCount: number;
  isDefault: boolean;
  areas: { label: string; action: string }[];
}

export interface DemoFullTemplate {
  id: string;
  title: string;
  body: string;
  category: string;
  usageCount: number;
  lastUsed: string;
}

// 今日の日付を基準にした日付ヘルパー
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysLater(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// 患者データ（20人）
export const DEMO_PATIENTS: DemoPatient[] = [
  { id: "P001", name: "田中 美咲", kana: "タナカ ミサキ", gender: "女性", age: 32, birthDate: "1993-08-15", tel: "090-1234-5678", email: "tanaka@example.com", lineDisplayName: "みさき", linePictureUrl: null, tags: [{ name: "VIP", color: "#8B5CF6" }, { name: "GLP-1", color: "#3B82F6" }], mark: "◎", lastVisit: daysAgo(2), memo: "マンジャロ5mg継続", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ5mg 3ヶ月", currentMeds: "なし", postalCode: "150-0001", address: "東京都渋谷区神宮前1-2-3", richMenuName: "リピーター用メニュー" },
  { id: "P002", name: "佐藤 健太", kana: "サトウ ケンタ", gender: "男性", age: 45, birthDate: "1980-11-03", tel: "080-2345-6789", email: "sato@example.com", lineDisplayName: "けんた", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }], mark: "○", lastVisit: daysAgo(5), memo: "マンジャロ2.5mg初回", allergies: "なし", medHistory: "脂質異常症", glp1History: "マンジャロ2.5mg 1ヶ月", currentMeds: "ロスバスタチン5mg", postalCode: "160-0022", address: "東京都新宿区新宿3-4-5", richMenuName: "初回用メニュー" },
  { id: "P003", name: "鈴木 花子", kana: "スズキ ハナコ", gender: "女性", age: 28, birthDate: "1997-04-22", tel: "070-3456-7890", email: "suzuki@example.com", lineDisplayName: "はなちゃん", linePictureUrl: null, tags: [{ name: "新規", color: "#10B981" }], mark: "△", lastVisit: daysAgo(1), memo: "初回問診完了", allergies: "なし", medHistory: "特になし", glp1History: "未経験", currentMeds: "なし", postalCode: "106-0032", address: "東京都港区六本木6-7-8", richMenuName: "初回用メニュー" },
  { id: "P004", name: "高橋 大輔", kana: "タカハシ ダイスケ", gender: "男性", age: 38, birthDate: "1987-12-10", tel: "090-4567-8901", email: "takahashi@example.com", lineDisplayName: "だいすけ", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }, { name: "リピーター", color: "#F59E0B" }], mark: "◎", lastVisit: daysAgo(7), memo: "マンジャロ7.5mg 3回目", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ7.5mg 3ヶ月", currentMeds: "なし", postalCode: "530-0001", address: "大阪府大阪市北区梅田4-5-6", richMenuName: "リピーター用メニュー" },
  { id: "P005", name: "伊藤 さくら", kana: "イトウ サクラ", gender: "女性", age: 25, birthDate: "2000-03-05", tel: "080-5678-9012", email: "ito@example.com", lineDisplayName: "さくら🌸", linePictureUrl: null, tags: [{ name: "新規", color: "#10B981" }], mark: "○", lastVisit: daysAgo(0), memo: "本日予約あり", allergies: "なし", medHistory: "特になし", glp1History: "未経験", currentMeds: "なし", postalCode: "153-0064", address: "東京都目黒区下目黒9-10-11", richMenuName: "初回用メニュー" },
  { id: "P006", name: "渡辺 誠", kana: "ワタナベ マコト", gender: "男性", age: 52, birthDate: "1973-07-18", tel: "090-6789-0123", email: "watanabe@example.com", lineDisplayName: "まこと", linePictureUrl: null, tags: [{ name: "VIP", color: "#8B5CF6" }, { name: "リピーター", color: "#F59E0B" }], mark: "◎", lastVisit: daysAgo(3), memo: "マンジャロ5mg 5回目", allergies: "なし", medHistory: "糖尿病予備軍", glp1History: "マンジャロ5mg 5ヶ月", currentMeds: "メトホルミン250mg", postalCode: "460-0008", address: "愛知県名古屋市中区栄7-8-9", richMenuName: "リピーター用メニュー" },
  { id: "P007", name: "山本 結衣", kana: "ヤマモト ユイ", gender: "女性", age: 35, birthDate: "1990-09-28", tel: "070-7890-1234", email: "yamamoto@example.com", lineDisplayName: "ゆい", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }], mark: "○", lastVisit: daysAgo(10), memo: "マンジャロ2.5mg 2回目", allergies: "花粉症", medHistory: "特になし", glp1History: "マンジャロ2.5mg 2ヶ月", currentMeds: "アレグラ（季節性）", postalCode: "060-0042", address: "北海道札幌市中央区大通13-14-15", richMenuName: "リピーター用メニュー" },
  { id: "P008", name: "中村 翔太", kana: "ナカムラ ショウタ", gender: "男性", age: 41, birthDate: "1984-06-14", tel: "080-8901-2345", email: "nakamura@example.com", lineDisplayName: "しょうた", linePictureUrl: null, tags: [{ name: "リピーター", color: "#F59E0B" }], mark: "○", lastVisit: daysAgo(14), memo: "マンジャロ5mg継続", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ5mg 2ヶ月", currentMeds: "なし", postalCode: "810-0001", address: "福岡県福岡市中央区天神12-13-14", richMenuName: "リピーター用メニュー" },
  { id: "P009", name: "小林 真由美", kana: "コバヤシ マユミ", gender: "女性", age: 48, birthDate: "1977-01-30", tel: "090-9012-3456", email: "kobayashi@example.com", lineDisplayName: "まゆみ", linePictureUrl: null, tags: [{ name: "VIP", color: "#8B5CF6" }, { name: "GLP-1", color: "#3B82F6" }], mark: "◎", lastVisit: daysAgo(4), memo: "マンジャロ7.5mg 4回目", allergies: "甲殻類", medHistory: "高血圧（内服治療中）", glp1History: "マンジャロ7.5mg 4ヶ月", currentMeds: "アムロジピン5mg", postalCode: "812-0011", address: "福岡県福岡市博多区博多駅前10-11-12", richMenuName: "リピーター用メニュー" },
  { id: "P010", name: "加藤 拓也", kana: "カトウ タクヤ", gender: "男性", age: 33, birthDate: "1992-10-08", tel: "070-0123-4567", email: "kato@example.com", lineDisplayName: "たくや", linePictureUrl: null, tags: [{ name: "新規", color: "#10B981" }], mark: "△", lastVisit: daysAgo(0), memo: "問診未完了", allergies: "花粉症", medHistory: "特になし", glp1History: "未経験", currentMeds: "アレグラ", postalCode: "330-0846", address: "埼玉県さいたま市大宮区大門町15-16-17", richMenuName: "初回用メニュー" },
  { id: "P011", name: "吉田 麻衣", kana: "ヨシダ マイ", gender: "女性", age: 29, birthDate: "1996-05-20", tel: "080-1111-2222", email: "yoshida@example.com", lineDisplayName: "まい", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }], mark: "○", lastVisit: daysAgo(8), memo: "マンジャロ2.5mg継続", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ2.5mg 2ヶ月", currentMeds: "なし", postalCode: "220-0012", address: "神奈川県横浜市西区みなとみらい16-17-18", richMenuName: "リピーター用メニュー" },
  { id: "P012", name: "山田 太郎", kana: "ヤマダ タロウ", gender: "男性", age: 56, birthDate: "1969-02-14", tel: "090-3333-4444", email: "yamada@example.com", lineDisplayName: "たろう", linePictureUrl: null, tags: [{ name: "リピーター", color: "#F59E0B" }], mark: "○", lastVisit: daysAgo(6), memo: "マンジャロ5mg 3回目", allergies: "なし", medHistory: "痛風（治療中）", glp1History: "マンジャロ5mg 3ヶ月", currentMeds: "フェブキソスタット20mg", postalCode: "604-8134", address: "京都府京都市中京区烏丸19-20-21", richMenuName: "リピーター用メニュー" },
  { id: "P013", name: "松本 彩", kana: "マツモト アヤ", gender: "女性", age: 31, birthDate: "1994-11-25", tel: "070-5555-6666", email: "matsumoto@example.com", lineDisplayName: "あや", linePictureUrl: null, tags: [{ name: "新規", color: "#10B981" }], mark: "△", lastVisit: daysAgo(1), memo: "カウンセリング予定", allergies: "なし", medHistory: "特になし", glp1History: "未経験", currentMeds: "なし", postalCode: "650-0021", address: "兵庫県神戸市中央区三宮22-23-24", richMenuName: "初回用メニュー" },
  { id: "P014", name: "井上 浩二", kana: "イノウエ コウジ", gender: "男性", age: 44, birthDate: "1981-08-07", tel: "080-7777-8888", email: "inoue@example.com", lineDisplayName: "こうじ", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }, { name: "リピーター", color: "#F59E0B" }], mark: "◎", lastVisit: daysAgo(3), memo: "マンジャロ7.5mg 6回目", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ7.5mg 6ヶ月", currentMeds: "なし", postalCode: "220-0012", address: "神奈川県横浜市西区みなとみらい16-17-18", richMenuName: "リピーター用メニュー" },
  { id: "P015", name: "木村 優子", kana: "キムラ ユウコ", gender: "女性", age: 37, birthDate: "1988-04-12", tel: "090-9999-0000", email: "kimura@example.com", lineDisplayName: "ゆうこ", linePictureUrl: null, tags: [{ name: "VIP", color: "#8B5CF6" }], mark: "◎", lastVisit: daysAgo(2), memo: "マンジャロ5mg 4回目", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ5mg 4ヶ月", currentMeds: "なし", postalCode: "542-0076", address: "大阪府大阪市中央区難波25-26-27", richMenuName: "リピーター用メニュー" },
  { id: "P016", name: "林 大地", kana: "ハヤシ ダイチ", gender: "男性", age: 27, birthDate: "1998-12-01", tel: "070-1212-3434", email: "hayashi@example.com", lineDisplayName: "だいち", linePictureUrl: null, tags: [{ name: "新規", color: "#10B981" }], mark: "○", lastVisit: daysAgo(0), memo: "本日初診予約", allergies: "なし", medHistory: "特になし", glp1History: "未経験", currentMeds: "なし", postalCode: "980-0811", address: "宮城県仙台市青葉区一番町28-29-30", richMenuName: "初回用メニュー" },
  { id: "P017", name: "清水 里奈", kana: "シミズ リナ", gender: "女性", age: 42, birthDate: "1983-06-30", tel: "080-5656-7878", email: "shimizu@example.com", lineDisplayName: "りな", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }], mark: "○", lastVisit: daysAgo(12), memo: "マンジャロ2.5mg→5mgへ増量検討", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ2.5mg 1ヶ月", currentMeds: "なし", postalCode: "730-0035", address: "広島県広島市中区本通31-32-33", richMenuName: "リピーター用メニュー" },
  { id: "P018", name: "森 慎一", kana: "モリ シンイチ", gender: "男性", age: 50, birthDate: "1975-09-15", tel: "090-7878-9090", email: "mori@example.com", lineDisplayName: "しんいち", linePictureUrl: null, tags: [{ name: "リピーター", color: "#F59E0B" }], mark: "○", lastVisit: daysAgo(9), memo: "マンジャロ5mg継続", allergies: "ペニシリン", medHistory: "特になし", glp1History: "マンジャロ5mg 3ヶ月", currentMeds: "なし", postalCode: "760-0019", address: "香川県高松市サンポート34-35-36", richMenuName: "リピーター用メニュー" },
  { id: "P019", name: "池田 あかり", kana: "イケダ アカリ", gender: "女性", age: 26, birthDate: "1999-07-22", tel: "070-2323-4545", email: "ikeda@example.com", lineDisplayName: "あかり✨", linePictureUrl: null, tags: [{ name: "新規", color: "#10B981" }, { name: "GLP-1", color: "#3B82F6" }], mark: "△", lastVisit: daysAgo(1), memo: "初回処方完了", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ2.5mg 初回", currentMeds: "ピル", postalCode: "862-0950", address: "熊本県熊本市中央区水前寺37-38-39", richMenuName: "初回用メニュー" },
  { id: "P020", name: "岡田 裕介", kana: "オカダ ユウスケ", gender: "男性", age: 39, birthDate: "1986-03-18", tel: "080-6767-8989", email: "okada@example.com", lineDisplayName: "ゆうすけ", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }, { name: "VIP", color: "#8B5CF6" }], mark: "◎", lastVisit: daysAgo(4), memo: "マンジャロ7.5mg 5回目", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ7.5mg 5ヶ月", currentMeds: "なし", postalCode: "650-0021", address: "兵庫県神戸市中央区三宮22-23-24", richMenuName: "リピーター用メニュー" },
];

// メッセージログ（友だちごと）
export const DEMO_MESSAGES: Record<string, DemoMessage[]> = {
  P001: [
    { id: 1, content: "こんにちは！予約の確認をしたいのですが", direction: "incoming", sentAt: `${daysAgo(2)} 10:30`, type: "text" },
    { id: 2, content: "田中様、こんにちは。2月22日 14:00のご予約を承っております。", direction: "outgoing", sentAt: `${daysAgo(2)} 10:32`, type: "text" },
    { id: 3, content: "ありがとうございます！時間変更は可能ですか？", direction: "incoming", sentAt: `${daysAgo(2)} 10:35`, type: "text" },
    { id: 4, content: "はい、可能です。ご希望のお時間はございますか？", direction: "outgoing", sentAt: `${daysAgo(2)} 10:36`, type: "text" },
    { id: 5, content: "15:00に変更をお願いしたいです", direction: "incoming", sentAt: `${daysAgo(2)} 10:38`, type: "text" },
    { id: 6, content: "15:00に変更いたしました。当日お待ちしております。", direction: "outgoing", sentAt: `${daysAgo(2)} 10:40`, type: "text" },
    { id: 7, content: "ありがとうございます😊", direction: "incoming", sentAt: `${daysAgo(2)} 10:41`, type: "text" },
  ],
  P002: [
    { id: 1, content: "初めまして。GLP-1ダイエットについて質問があります", direction: "incoming", sentAt: `${daysAgo(5)} 14:00`, type: "text" },
    { id: 2, content: "佐藤様、はじめまして。GLP-1ダイエットにご興味いただきありがとうございます。どのようなご質問でしょうか？", direction: "outgoing", sentAt: `${daysAgo(5)} 14:05`, type: "text" },
    { id: 3, content: "副作用が心配なのですが、どのようなものがありますか？", direction: "incoming", sentAt: `${daysAgo(5)} 14:10`, type: "text" },
    { id: 4, content: "主な副作用として、軽い吐き気や食欲低下がございます。多くの方は1-2週間で軽減されます。詳しくは診察時にご説明いたします。", direction: "outgoing", sentAt: `${daysAgo(5)} 14:12`, type: "text" },
    { id: 5, content: "わかりました。予約をお願いします", direction: "incoming", sentAt: `${daysAgo(5)} 14:15`, type: "text" },
  ],
  P003: [
    { id: 1, content: "問診フォームの入力が完了しました", direction: "incoming", sentAt: `${daysAgo(1)} 09:00`, type: "text" },
    { id: 2, content: "鈴木様、問診フォームのご入力ありがとうございます。内容を確認いたします。", direction: "outgoing", sentAt: `${daysAgo(1)} 09:05`, type: "text" },
    { id: 3, content: "よろしくお願いします！", direction: "incoming", sentAt: `${daysAgo(1)} 09:06`, type: "text" },
  ],
  P004: [
    { id: 1, content: "次回の処方について相談したいです", direction: "incoming", sentAt: `${daysAgo(7)} 11:00`, type: "text" },
    { id: 2, content: "高橋様、承知しました。現在マンジャロ7.5mgをご使用ですね。体調はいかがですか？", direction: "outgoing", sentAt: `${daysAgo(7)} 11:05`, type: "text" },
    { id: 3, content: "体調は良好です。体重も順調に減っています", direction: "incoming", sentAt: `${daysAgo(7)} 11:08`, type: "text" },
    { id: 4, content: "それは素晴らしいですね！次回も同量で継続されますか？", direction: "outgoing", sentAt: `${daysAgo(7)} 11:10`, type: "text" },
    { id: 5, content: "はい、同じでお願いします", direction: "incoming", sentAt: `${daysAgo(7)} 11:12`, type: "text" },
    { id: 6, content: "承知しました。再処方の手続きを進めます。", direction: "outgoing", sentAt: `${daysAgo(7)} 11:13`, type: "text" },
  ],
  P005: [
    { id: 1, content: "本日の予約時間を確認したいです", direction: "incoming", sentAt: `${today()} 08:30`, type: "text" },
    { id: 2, content: "伊藤様、おはようございます。本日13:00のご予約です。お気をつけてお越しください。", direction: "outgoing", sentAt: `${today()} 08:32`, type: "text" },
    { id: 3, content: "ありがとうございます！よろしくお願いします", direction: "incoming", sentAt: `${today()} 08:33`, type: "text" },
  ],
};

// 予約データ（今日を中心に生成）
export const DEMO_RESERVATIONS: DemoReservation[] = [
  { id: "R001", patientId: "P005", patientName: "伊藤 さくら", patientKana: "イトウ サクラ", patientGender: "女性", patientAge: 25, patientBirthDate: "2000-03-05", date: today(), time: "10:00", menu: "GLP-1 初回診察", status: "未診", allergies: "なし", medHistory: "特になし", glp1History: "未経験", currentMeds: "なし" },
  { id: "R002", patientId: "P010", patientName: "加藤 拓也", patientKana: "カトウ タクヤ", patientGender: "男性", patientAge: 33, patientBirthDate: "1992-10-08", date: today(), time: "10:30", menu: "GLP-1 初回診察", status: "未診", allergies: "花粉症", medHistory: "特になし", glp1History: "未経験", currentMeds: "アレグラ" },
  { id: "R003", patientId: "P016", patientName: "林 大地", patientKana: "ハヤシ ダイチ", patientGender: "男性", patientAge: 27, patientBirthDate: "1998-12-01", date: today(), time: "11:00", menu: "GLP-1 初回診察", status: "未診", allergies: "なし", medHistory: "特になし", glp1History: "未経験", currentMeds: "なし" },
  { id: "R004", patientId: "P001", patientName: "田中 美咲", patientKana: "タナカ ミサキ", patientGender: "女性", patientAge: 32, patientBirthDate: "1993-08-15", date: today(), time: "14:00", menu: "GLP-1 再診", status: "未診", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ5mg 3ヶ月", currentMeds: "なし" },
  { id: "R005", patientId: "P009", patientName: "小林 真由美", patientKana: "コバヤシ マユミ", patientGender: "女性", patientAge: 48, patientBirthDate: "1977-01-30", date: today(), time: "15:00", menu: "GLP-1 再診", status: "未診", allergies: "甲殻類", medHistory: "高血圧（内服治療中）", glp1History: "マンジャロ7.5mg 4ヶ月", currentMeds: "アムロジピン5mg" },
  { id: "R006", patientId: "P003", patientName: "鈴木 花子", patientKana: "スズキ ハナコ", patientGender: "女性", patientAge: 28, patientBirthDate: "1997-04-22", date: daysAgo(1), time: "10:00", menu: "GLP-1 初回診察", status: "OK", allergies: "なし", medHistory: "特になし", glp1History: "未経験", currentMeds: "なし", karteNote: "副作用がなく、継続使用のため処方。マンジャロ2.5mgを処方。" },
  { id: "R007", patientId: "P019", patientName: "池田 あかり", patientKana: "イケダ アカリ", patientGender: "女性", patientAge: 26, patientBirthDate: "1999-07-22", date: daysAgo(1), time: "11:00", menu: "GLP-1 初回診察", status: "OK", allergies: "なし", medHistory: "特になし", glp1History: "未経験", currentMeds: "ピル", karteNote: "副作用がなく、継続使用のため処方。マンジャロ2.5mgを処方。ピル併用OK。" },
  { id: "R008", patientId: "P013", patientName: "松本 彩", patientKana: "マツモト アヤ", patientGender: "女性", patientAge: 31, patientBirthDate: "1994-11-25", date: daysAgo(1), time: "14:00", menu: "カウンセリング", status: "OK", allergies: "なし", medHistory: "特になし", glp1History: "未経験", currentMeds: "なし" },
  { id: "R009", patientId: "P004", patientName: "高橋 大輔", patientKana: "タカハシ ダイスケ", patientGender: "男性", patientAge: 38, patientBirthDate: "1987-12-10", date: daysLater(1), time: "10:00", menu: "GLP-1 再診", status: "未診", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ7.5mg 3ヶ月", currentMeds: "なし" },
  { id: "R010", patientId: "P007", patientName: "山本 結衣", patientKana: "ヤマモト ユイ", patientGender: "女性", patientAge: 35, patientBirthDate: "1990-09-28", date: daysLater(1), time: "11:00", menu: "GLP-1 再診", status: "未診", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ2.5mg 2ヶ月", currentMeds: "なし" },
  { id: "R011", patientId: "P017", patientName: "清水 里奈", patientKana: "シミズ リナ", patientGender: "女性", patientAge: 42, patientBirthDate: "1983-06-30", date: daysLater(1), time: "14:00", menu: "GLP-1 再診", status: "未診", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ2.5mg 1ヶ月", currentMeds: "なし" },
  { id: "R012", patientId: "P006", patientName: "渡辺 誠", patientKana: "ワタナベ マコト", patientGender: "男性", patientAge: 52, patientBirthDate: "1973-07-18", date: daysLater(2), time: "10:00", menu: "GLP-1 再診", status: "未診", allergies: "なし", medHistory: "糖尿病予備軍", glp1History: "マンジャロ5mg 5ヶ月", currentMeds: "メトホルミン250mg" },
];

// 患者別注文履歴
export const DEMO_ORDERS: Record<string, DemoOrder[]> = {
  P001: [
    { id: "O001", patientId: "P001", product: "マンジャロ 5mg", amount: 29800, paymentMethod: "カード", paidAt: `${daysAgo(2)} 15:30`, status: "完了", trackingNumber: "4912-8888-1111" },
    { id: "O002", patientId: "P001", product: "マンジャロ 5mg", amount: 29800, paymentMethod: "カード", paidAt: `${daysAgo(32)} 14:00`, status: "完了", trackingNumber: "4912-7777-2222" },
    { id: "O003", patientId: "P001", product: "マンジャロ 2.5mg", amount: 19800, paymentMethod: "カード", paidAt: `${daysAgo(62)} 11:00`, status: "完了", trackingNumber: "4912-6666-3333" },
  ],
  P004: [
    { id: "O004", patientId: "P004", product: "マンジャロ 7.5mg", amount: 39800, paymentMethod: "カード", paidAt: `${daysAgo(7)} 16:00`, status: "完了", trackingNumber: "4912-5555-4444" },
    { id: "O005", patientId: "P004", product: "マンジャロ 7.5mg", amount: 39800, paymentMethod: "カード", paidAt: `${daysAgo(37)} 12:00`, status: "完了", trackingNumber: "4912-4444-5555" },
    { id: "O006", patientId: "P004", product: "マンジャロ 5mg", amount: 29800, paymentMethod: "銀行振込", paidAt: `${daysAgo(67)} 10:00`, status: "完了", trackingNumber: "4912-3333-6666" },
  ],
  P006: [
    { id: "O007", patientId: "P006", product: "マンジャロ 5mg", amount: 29800, paymentMethod: "銀行振込", paidAt: `${daysAgo(3)} 10:00`, status: "完了", trackingNumber: null },
    { id: "O008", patientId: "P006", product: "マンジャロ 5mg", amount: 29800, paymentMethod: "カード", paidAt: `${daysAgo(33)} 14:30`, status: "完了", trackingNumber: "4912-2222-7777" },
  ],
  P009: [
    { id: "O009", patientId: "P009", product: "マンジャロ 7.5mg", amount: 39800, paymentMethod: "カード", paidAt: `${daysAgo(4)} 14:30`, status: "完了", trackingNumber: "4912-3456-7890" },
    { id: "O010", patientId: "P009", product: "マンジャロ 5mg", amount: 29800, paymentMethod: "カード", paidAt: `${daysAgo(34)} 11:00`, status: "完了", trackingNumber: "4912-1111-8888" },
  ],
  P014: [
    { id: "O011", patientId: "P014", product: "マンジャロ 7.5mg", amount: 39800, paymentMethod: "カード", paidAt: `${daysAgo(3)} 15:00`, status: "完了", trackingNumber: "4912-1234-5678" },
    { id: "O012", patientId: "P014", product: "マンジャロ 7.5mg", amount: 39800, paymentMethod: "銀行振込", paidAt: `${daysAgo(33)} 10:00`, status: "返金済み", trackingNumber: null },
  ],
  P020: [
    { id: "O013", patientId: "P020", product: "マンジャロ 7.5mg", amount: 39800, paymentMethod: "カード", paidAt: `${daysAgo(4)} 10:30`, status: "完了", trackingNumber: "4912-9012-3456" },
  ],
};

// 再処方申請
export const DEMO_REORDERS: DemoReorder[] = [
  { id: "RO001", patientId: "P004", patientName: "高橋 大輔", product: "マンジャロ 7.5mg", previousProduct: "マンジャロ 7.5mg", requestedAt: `${daysAgo(0)} 09:00`, status: "申請中" },
  { id: "RO002", patientId: "P006", patientName: "渡辺 誠", product: "マンジャロ 5mg", previousProduct: "マンジャロ 5mg", requestedAt: `${daysAgo(0)} 10:30`, status: "申請中" },
  { id: "RO003", patientId: "P014", patientName: "井上 浩二", product: "マンジャロ 7.5mg", previousProduct: "マンジャロ 7.5mg", requestedAt: `${daysAgo(1)} 14:00`, status: "承認済み", karteNote: "副作用がなく、継続使用のため処方。マンジャロ7.5mgを処方。" },
  { id: "RO004", patientId: "P001", patientName: "田中 美咲", product: "マンジャロ 5mg", previousProduct: "マンジャロ 5mg", requestedAt: `${daysAgo(2)} 11:00`, status: "決済済み", karteNote: "副作用がなく、継続使用のため処方。マンジャロ5mgを処方。" },
  { id: "RO005", patientId: "P009", patientName: "小林 真由美", product: "マンジャロ 7.5mg", previousProduct: "マンジャロ 5mg", requestedAt: `${daysAgo(4)} 09:30`, status: "発送済み", karteNote: "副作用がなく、効果を感じづらくなり増量処方。マンジャロ7.5mgを処方。" },
  { id: "RO006", patientId: "P020", patientName: "岡田 裕介", product: "マンジャロ 7.5mg", previousProduct: "マンジャロ 7.5mg", requestedAt: `${daysAgo(5)} 16:00`, status: "発送済み", karteNote: "副作用がなく、継続使用のため処方。マンジャロ7.5mgを処方。" },
];

// タグ定義
export const DEMO_TAG_DEFINITIONS: DemoTagDefinition[] = [
  { id: "TG001", name: "VIP", color: "#8B5CF6", count: 5, description: "上位顧客（リピート3回以上）" },
  { id: "TG002", name: "GLP-1", color: "#3B82F6", count: 12, description: "GLP-1ダイエット利用中" },
  { id: "TG003", name: "新規", color: "#10B981", count: 6, description: "初回来院から30日以内" },
  { id: "TG004", name: "リピーター", color: "#F59E0B", count: 7, description: "2回以上来院" },
  { id: "TG005", name: "問診完了", color: "#06B6D4", count: 18, description: "問診フォーム提出済み" },
  { id: "TG006", name: "要フォロー", color: "#EF4444", count: 3, description: "フォローアップ対象" },
  { id: "TG007", name: "紹介あり", color: "#EC4899", count: 4, description: "既存患者からの紹介" },
  { id: "TG008", name: "銀行振込", color: "#78716C", count: 3, description: "銀行振込での決済" },
];

// リッチメニュー定義
export const DEMO_RICH_MENUS: DemoRichMenu[] = [
  {
    id: "RM001", name: "初回用メニュー", description: "初回来院前の患者向け。予約・問診への導線を配置。", userCount: 845, isDefault: true,
    areas: [
      { label: "予約する", action: "予約ページへ" },
      { label: "問診入力", action: "問診フォームへ" },
      { label: "料金を見る", action: "料金ページへ" },
      { label: "アクセス", action: "地図を表示" },
      { label: "よくある質問", action: "FAQページへ" },
      { label: "お問い合わせ", action: "トークで連絡" },
    ],
  },
  {
    id: "RM002", name: "リピーター用メニュー", description: "来院済み患者向け。再処方・マイページへの導線を配置。", userCount: 1650,isDefault: false,
    areas: [
      { label: "再処方申請", action: "再処方ページへ" },
      { label: "マイページ", action: "マイページへ" },
      { label: "次回予約", action: "予約ページへ" },
      { label: "お薬の説明", action: "薬剤説明ページへ" },
      { label: "配送状況", action: "配送追跡ページへ" },
      { label: "お問い合わせ", action: "トークで連絡" },
    ],
  },
  {
    id: "RM003", name: "キャンペーン用メニュー", description: "キャンペーン期間中に表示。特別オファーを前面に。", userCount: 352, isDefault: false,
    areas: [
      { label: "キャンペーン詳細", action: "キャンペーンページへ" },
      { label: "今すぐ予約", action: "予約ページへ" },
      { label: "友だち紹介", action: "紹介ページへ" },
      { label: "マイページ", action: "マイページへ" },
      { label: "よくある質問", action: "FAQページへ" },
      { label: "お問い合わせ", action: "トークで連絡" },
    ],
  },
];

// テンプレート（拡充版）
export const DEMO_TEMPLATES: DemoFullTemplate[] = [
  { id: "T001", title: "予約確認", body: "ご予約ありがとうございます。\n○月○日 ○時のご予約を承りました。\n当日お待ちしております。", category: "予約", usageCount: 342, lastUsed: daysAgo(0) },
  { id: "T002", title: "問診リマインド", body: "問診フォームのご入力がまだお済みでないようです。\n診察日までにご入力をお願いいたします。\n▼問診フォーム\nhttps://example.com/intake", category: "問診", usageCount: 156, lastUsed: daysAgo(1) },
  { id: "T003", title: "発送完了通知", body: "お薬を発送いたしました。\n追跡番号: ○○○○-○○○○-○○○○\nお届けまで1〜2日程度かかります。", category: "発送", usageCount: 289, lastUsed: daysAgo(0) },
  { id: "T004", title: "初回来院の案内", body: "{name}様\n\nこの度はご予約いただきありがとうございます。\n\n【持ち物】\n・本人確認書類\n・保険証（任意）\n\n【場所】\n○○クリニック 〒xxx-xxxx\n\nご不明点がございましたらお気軽にご連絡ください。", category: "予約", usageCount: 98, lastUsed: daysAgo(3) },
  { id: "T005", title: "再診のご案内", body: "前回の診察から1ヶ月が経過しました。\nお薬の効果はいかがでしょうか？\n\n次回の診察予約はマイページから簡単にお取りいただけます。\n▼マイページ\nhttps://example.com/mypage", category: "フォロー", usageCount: 178, lastUsed: daysAgo(2) },
  { id: "T006", title: "決済完了通知", body: "{name}様\n\nお支払いが完了いたしました。\n\n【注文内容】\n{product}\n【金額】¥{amount}\n\n発送準備が整い次第、追跡番号をお知らせいたします。", category: "決済", usageCount: 234, lastUsed: daysAgo(0) },
  { id: "T007", title: "副作用の確認", body: "{name}様\n\nお薬の使用を開始されてから数日が経ちました。\n体調に変化はございませんか？\n\n気になる症状がございましたら、お気軽にご相談ください。\n医師が適切にアドバイスいたします。", category: "フォロー", usageCount: 67, lastUsed: daysAgo(5) },
  { id: "T008", title: "キャンセル確認", body: "{name}様\n\nご予約のキャンセルを承りました。\n\n再度ご予約を希望される場合は、マイページからお手続きください。\nまたのご来院をお待ちしております。", category: "予約", usageCount: 45, lastUsed: daysAgo(7) },
  { id: "T009", title: "銀行振込案内", body: "{name}様\n\n以下の口座へお振込みをお願いいたします。\n\n【振込先】\n○○銀行 ○○支店\n普通 1234567\n\n【金額】¥{amount}\n【期限】○月○日まで\n\nご入金確認後、発送手続きを開始いたします。", category: "決済", usageCount: 89, lastUsed: daysAgo(1) },
  { id: "T010", title: "増量のご提案", body: "{name}様\n\n現在の用量での効果が薄れてきた場合、増量をご検討いただけます。\n\n次回の診察時に医師にご相談いただくか、再処方申請フォームからお手続きください。\n▼再処方申請\nhttps://example.com/reorder", category: "フォロー", usageCount: 34, lastUsed: daysAgo(10) },
];

// ダッシュボード統計
export const DEMO_STATS = {
  todayReservations: 5,
  lineFriends: 2847,
  monthlyRevenue: 4280000,
  repeatRate: 78.5,
  weeklyReservations: [8, 12, 6, 10, 14, 5, 9],
  weekLabels: (() => {
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
    return labels;
  })(),
  pending: { unreplied: 3, waitingConsult: 5, waitingShip: 8 },
  notifications: [
    { id: 1, text: "伊藤 さくら様が予約を完了しました", time: "5分前", type: "reservation" as const },
    { id: 2, text: "田中 美咲様からメッセージが届きました", time: "12分前", type: "message" as const },
    { id: 3, text: "加藤 拓也様の問診が完了しました", time: "30分前", type: "intake" as const },
    { id: 4, text: "高橋 大輔様の再処方申請が届きました", time: "1時間前", type: "reorder" as const },
    { id: 5, text: "佐藤 健太様のカード決済が完了しました", time: "2時間前", type: "payment" as const },
  ],
};

// 配信履歴
export const DEMO_BROADCASTS: DemoBroadcast[] = [
  { id: "B001", title: "2月キャンペーンのお知らせ", body: "いつもご利用ありがとうございます。2月限定で初回診察料が無料になるキャンペーンを実施中です！お友だち紹介でさらにお得に。詳しくはマイページをご確認ください。", segment: "全員", sentAt: `${daysAgo(3)} 10:00`, targetCount: 2847, openRate: 68.2, clickRate: 12.5 },
  { id: "B002", title: "再診のご案内", body: "前回の診察から1ヶ月が経過しました。お薬の効果はいかがでしょうか？次回の診察予約はマイページから簡単にお取りいただけます。", segment: "来院1ヶ月以内", sentAt: `${daysAgo(7)} 14:00`, targetCount: 342, openRate: 82.1, clickRate: 35.8 },
  { id: "B003", title: "年末年始の診療時間について", body: "年末年始の診療スケジュールをお知らせいたします。12/29〜1/3は休診となります。お薬が不足しないよう、早めのご予約をお願いいたします。", segment: "全員", sentAt: `${daysAgo(14)} 09:00`, targetCount: 2650, openRate: 72.5, clickRate: 8.3 },
  { id: "B004", title: "問診未完了のお知らせ", body: "問診フォームのご入力がまだお済みでないようです。診察日までにご入力をお願いいたします。ご不明点がございましたらお気軽にご連絡ください。", segment: "未予約患者", sentAt: `${daysAgo(10)} 11:00`, targetCount: 85, openRate: 55.3, clickRate: 42.1 },
  { id: "B005", title: "新メニューのご案内", body: "新しい用量オプション（マンジャロ10mg/15mg）の取り扱いを開始しました。現在の用量で効果が薄れてきた方は、医師にご相談ください。", segment: "来院1ヶ月以内", sentAt: `${daysAgo(21)} 10:00`, targetCount: 520, openRate: 75.8, clickRate: 22.4 },
];

// 発送データ
export const DEMO_SHIPMENTS: DemoShipment[] = [
  { id: "S001", patientName: "田中 美咲", product: "マンジャロ 5mg", paymentMethod: "カード", paidAt: `${daysAgo(1)} 15:30`, status: "発送待ち", trackingNumber: null, address: "東京都渋谷区神宮前1-2-3" },
  { id: "S002", patientName: "高橋 大輔", product: "マンジャロ 7.5mg", paymentMethod: "カード", paidAt: `${daysAgo(1)} 16:00`, status: "発送待ち", trackingNumber: null, address: "大阪府大阪市北区梅田4-5-6" },
  { id: "S003", patientName: "渡辺 誠", product: "マンジャロ 5mg", paymentMethod: "銀行振込", paidAt: `${daysAgo(2)} 10:00`, status: "発送待ち", trackingNumber: null, address: "愛知県名古屋市中区栄7-8-9" },
  { id: "S004", patientName: "小林 真由美", product: "マンジャロ 7.5mg", paymentMethod: "カード", paidAt: `${daysAgo(2)} 14:30`, status: "発送済み", trackingNumber: "4912-3456-7890", address: "福岡県福岡市博多区博多駅前10-11-12" },
  { id: "S005", patientName: "山本 結衣", product: "マンジャロ 2.5mg", paymentMethod: "カード", paidAt: `${daysAgo(3)} 11:00`, status: "発送済み", trackingNumber: "4912-2345-6789", address: "北海道札幌市中央区大通13-14-15" },
  { id: "S006", patientName: "井上 浩二", product: "マンジャロ 7.5mg", paymentMethod: "銀行振込", paidAt: `${daysAgo(4)} 09:00`, status: "配達完了", trackingNumber: "4912-1234-5678", address: "神奈川県横浜市西区みなとみらい16-17-18" },
  { id: "S007", patientName: "木村 優子", product: "マンジャロ 5mg", paymentMethod: "カード", paidAt: `${daysAgo(4)} 13:00`, status: "配達完了", trackingNumber: "4912-0123-4567", address: "京都府京都市中京区烏丸19-20-21" },
  { id: "S008", patientName: "岡田 裕介", product: "マンジャロ 7.5mg", paymentMethod: "カード", paidAt: `${daysAgo(5)} 10:30`, status: "配達完了", trackingNumber: "4912-9012-3456", address: "兵庫県神戸市中央区三宮22-23-24" },
];

// 分析データ
export const DEMO_ANALYTICS = {
  friendsGrowth: (() => {
    const data: { date: string; total: number; added: number }[] = [];
    let total = 2700;
    for (let i = 29; i >= 0; i--) {
      const added = Math.floor(Math.random() * 8) + 2;
      total += added;
      data.push({ date: daysAgo(i), total, added });
    }
    return data;
  })(),
  messageStats: (() => {
    const data: { date: string; sent: number; received: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      data.push({
        date: daysAgo(i),
        sent: Math.floor(Math.random() * 30) + 10,
        received: Math.floor(Math.random() * 50) + 15,
      });
    }
    return data;
  })(),
  revenueByMonth: [
    { month: "9月", revenue: 3120000 },
    { month: "10月", revenue: 3450000 },
    { month: "11月", revenue: 3680000 },
    { month: "12月", revenue: 3920000 },
    { month: "1月", revenue: 4050000 },
    { month: "2月", revenue: 4280000 },
  ],
  topMenus: [
    { name: "マンジャロ 2.5mg", count: 45, revenue: 891000 },
    { name: "マンジャロ 5mg", count: 78, revenue: 2324400 },
    { name: "マンジャロ 7.5mg", count: 34, revenue: 1353200 },
    { name: "マンジャロ 10mg", count: 12, revenue: 598800 },
    { name: "マンジャロ 15mg", count: 5, revenue: 299000 },
  ],
  tagDistribution: [
    { name: "GLP-1", count: 1842, percentage: 64.7 },
    { name: "リピーター", count: 1250, percentage: 43.9 },
    { name: "VIP", count: 385, percentage: 13.5 },
    { name: "新規", count: 420, percentage: 14.7 },
    { name: "問診完了", count: 2100, percentage: 73.8 },
    { name: "要フォロー", count: 95, percentage: 3.3 },
  ],
};

// カレンダー用：月間の予約数マップを生成
export function getMonthReservationCounts(year: number, month: number): Record<string, number> {
  const counts: Record<string, number> = {};
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    if (dayOfWeek === 0) {
      counts[dateStr] = 0;
    } else if (dayOfWeek === 6) {
      counts[dateStr] = Math.floor(Math.random() * 5) + 1;
    } else {
      counts[dateStr] = Math.floor(Math.random() * 10) + 3;
    }
  }
  const todayStr = today();
  if (counts[todayStr] !== undefined) {
    counts[todayStr] = DEMO_RESERVATIONS.filter((r) => r.date === todayStr).length;
  }
  return counts;
}

// 患者の次回予約を取得
export function getNextReservation(patientId: string): DemoReservation | undefined {
  const todayStr = today();
  return DEMO_RESERVATIONS
    .filter((r) => r.patientId === patientId && r.date >= todayStr && r.status === "未診")
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
}

// 患者の再処方を取得
export function getPatientReorders(patientId: string): DemoReorder[] {
  return DEMO_REORDERS.filter((r) => r.patientId === patientId);
}

// キーワード自動返信ルール
export interface DemoKeywordRule {
  id: string;
  name: string;
  keyword: string;
  matchType: "部分一致" | "完全一致" | "正規表現";
  priority: number;
  response: string;
  isEnabled: boolean;
}

export const DEMO_KEYWORD_RULES: DemoKeywordRule[] = [
  { id: "KR001", name: "予約確認", keyword: "予約", matchType: "部分一致", priority: 10, response: "ご予約はマイページからお手続きいただけます。\n▼マイページ\nhttps://example.com/mypage", isEnabled: true },
  { id: "KR002", name: "料金案内", keyword: "料金|値段|価格|いくら", matchType: "正規表現", priority: 20, response: "料金についてはこちらをご確認ください。\n▼料金表\nhttps://example.com/price\n\nご不明点がございましたらスタッフにお申し付けください。", isEnabled: true },
  { id: "KR003", name: "営業時間", keyword: "営業時間|何時|開いて", matchType: "正規表現", priority: 30, response: "営業時間は以下の通りです。\n月〜金: 10:00〜19:00\n土: 10:00〜17:00\n日・祝: 休診", isEnabled: true },
  { id: "KR004", name: "住所案内", keyword: "住所|場所|アクセス|行き方", matchType: "正規表現", priority: 40, response: "〒150-0001 東京都渋谷区神宮前1-2-3\n最寄り駅: JR渋谷駅 徒歩5分\n▼Googleマップ\nhttps://maps.google.com/example", isEnabled: true },
  { id: "KR005", name: "副作用相談", keyword: "副作用", matchType: "部分一致", priority: 5, response: "副作用についてご心配をおかけしております。\n症状の詳細をお聞かせください。医師が確認し、折り返しご連絡いたします。\n\n緊急の場合はお電話ください: 03-XXXX-XXXX", isEnabled: true },
];

// 商品マスター
export interface DemoProduct {
  code: string;
  name: string;
  drugName: string;
  dosage: string;
  duration: string;
  quantity: number;
  price: number;
  category: "注射" | "内服";
  isActive: boolean;
  sortOrder: number;
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  { code: "MJL_2.5mg_1m", name: "マンジャロ 2.5mg（1ヶ月）", drugName: "チルゼパチド", dosage: "2.5mg", duration: "1ヶ月", quantity: 4, price: 19800, category: "注射", isActive: true, sortOrder: 1 },
  { code: "MJL_5mg_1m", name: "マンジャロ 5mg（1ヶ月）", drugName: "チルゼパチド", dosage: "5mg", duration: "1ヶ月", quantity: 4, price: 29800, category: "注射", isActive: true, sortOrder: 2 },
  { code: "MJL_7.5mg_1m", name: "マンジャロ 7.5mg（1ヶ月）", drugName: "チルゼパチド", dosage: "7.5mg", duration: "1ヶ月", quantity: 4, price: 39800, category: "注射", isActive: true, sortOrder: 3 },
  { code: "MJL_10mg_1m", name: "マンジャロ 10mg（1ヶ月）", drugName: "チルゼパチド", dosage: "10mg", duration: "1ヶ月", quantity: 4, price: 49800, category: "注射", isActive: true, sortOrder: 4 },
  { code: "MJL_15mg_1m", name: "マンジャロ 15mg（1ヶ月）", drugName: "チルゼパチド", dosage: "15mg", duration: "1ヶ月", quantity: 4, price: 59800, category: "注射", isActive: false, sortOrder: 5 },
];

// 設定データ（デモ表示用）
export const DEMO_SETTINGS = {
  general: [
    { key: "clinic_name", label: "クリニック名", value: "デモクリニック", source: "db" as const },
    { key: "representative", label: "代表者名", value: "山田 太郎", source: "db" as const },
    { key: "address", label: "住所", value: "東京都渋谷区神宮前1-2-3", source: "db" as const },
    { key: "tel", label: "電話番号", value: "03-1234-5678", source: "db" as const },
    { key: "app_base_url", label: "App Base URL", value: "https://demo.l-ope.jp", source: "env" as const },
  ],
  payment: [
    { key: "provider", label: "決済プロバイダー", value: "square", source: "db" as const },
    { key: "access_token", label: "Access Token", value: "EAAAl...●●●●●●", source: "db" as const },
    { key: "location_id", label: "Location ID", value: "LB2K...●●●●", source: "db" as const },
    { key: "env", label: "環境", value: "sandbox", source: "db" as const },
  ],
  line: [
    { key: "channel_id", label: "Channel ID", value: "2001...●●●●", source: "env" as const },
    { key: "channel_secret", label: "Channel Secret", value: "a8f2...●●●●●●", source: "env" as const },
    { key: "channel_access_token", label: "Channel Access Token", value: "xJ9k...●●●●●●●●", source: "env" as const },
    { key: "admin_group_id", label: "管理グループID", value: "C4a2...●●●●", source: "db" as const },
  ],
  sms: [
    { key: "account_sid", label: "Account SID", value: "AC89...●●●●●●", source: "env" as const },
    { key: "auth_token", label: "Auth Token", value: "b2e1...●●●●●●", source: "env" as const },
    { key: "verify_sid", label: "Verify SID", value: "VA34...●●●●", source: "env" as const },
  ],
  ehr: [
    { key: "provider", label: "連携プロバイダー", value: "none", source: "db" as const },
    { key: "sync_direction", label: "同期方向", value: "bidirectional", source: "db" as const },
    { key: "auto_sync", label: "自動同期", value: "false", source: "db" as const },
  ],
};
