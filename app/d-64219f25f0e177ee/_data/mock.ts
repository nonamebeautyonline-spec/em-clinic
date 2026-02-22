// デモ用モックデータ

export interface DemoPatient {
  id: string;
  name: string;
  kana: string;
  gender: "男性" | "女性";
  age: number;
  birthDate: string;
  tel: string;
  lineDisplayName: string;
  linePictureUrl: string | null;
  tags: { name: string; color: string }[];
  mark: string;
  lastVisit: string;
  memo: string;
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
  { id: "P001", name: "田中 美咲", kana: "タナカ ミサキ", gender: "女性", age: 32, birthDate: "1993-08-15", tel: "090-1234-5678", lineDisplayName: "みさき", linePictureUrl: null, tags: [{ name: "VIP", color: "#8B5CF6" }, { name: "GLP-1", color: "#3B82F6" }], mark: "◎", lastVisit: daysAgo(2), memo: "マンジャロ5mg継続" },
  { id: "P002", name: "佐藤 健太", kana: "サトウ ケンタ", gender: "男性", age: 45, birthDate: "1980-11-03", tel: "080-2345-6789", lineDisplayName: "けんた", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }], mark: "○", lastVisit: daysAgo(5), memo: "マンジャロ2.5mg初回" },
  { id: "P003", name: "鈴木 花子", kana: "スズキ ハナコ", gender: "女性", age: 28, birthDate: "1997-04-22", tel: "070-3456-7890", lineDisplayName: "はなちゃん", linePictureUrl: null, tags: [{ name: "新規", color: "#10B981" }], mark: "△", lastVisit: daysAgo(1), memo: "初回問診完了" },
  { id: "P004", name: "高橋 大輔", kana: "タカハシ ダイスケ", gender: "男性", age: 38, birthDate: "1987-12-10", tel: "090-4567-8901", lineDisplayName: "だいすけ", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }, { name: "リピーター", color: "#F59E0B" }], mark: "◎", lastVisit: daysAgo(7), memo: "マンジャロ7.5mg 3回目" },
  { id: "P005", name: "伊藤 さくら", kana: "イトウ サクラ", gender: "女性", age: 25, birthDate: "2000-03-05", tel: "080-5678-9012", lineDisplayName: "さくら🌸", linePictureUrl: null, tags: [{ name: "新規", color: "#10B981" }], mark: "○", lastVisit: daysAgo(0), memo: "本日予約あり" },
  { id: "P006", name: "渡辺 誠", kana: "ワタナベ マコト", gender: "男性", age: 52, birthDate: "1973-07-18", tel: "090-6789-0123", lineDisplayName: "まこと", linePictureUrl: null, tags: [{ name: "VIP", color: "#8B5CF6" }, { name: "リピーター", color: "#F59E0B" }], mark: "◎", lastVisit: daysAgo(3), memo: "マンジャロ5mg 5回目" },
  { id: "P007", name: "山本 結衣", kana: "ヤマモト ユイ", gender: "女性", age: 35, birthDate: "1990-09-28", tel: "070-7890-1234", lineDisplayName: "ゆい", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }], mark: "○", lastVisit: daysAgo(10), memo: "マンジャロ2.5mg 2回目" },
  { id: "P008", name: "中村 翔太", kana: "ナカムラ ショウタ", gender: "男性", age: 41, birthDate: "1984-06-14", tel: "080-8901-2345", lineDisplayName: "しょうた", linePictureUrl: null, tags: [{ name: "リピーター", color: "#F59E0B" }], mark: "○", lastVisit: daysAgo(14), memo: "マンジャロ5mg継続" },
  { id: "P009", name: "小林 真由美", kana: "コバヤシ マユミ", gender: "女性", age: 48, birthDate: "1977-01-30", tel: "090-9012-3456", lineDisplayName: "まゆみ", linePictureUrl: null, tags: [{ name: "VIP", color: "#8B5CF6" }, { name: "GLP-1", color: "#3B82F6" }], mark: "◎", lastVisit: daysAgo(4), memo: "マンジャロ7.5mg 4回目" },
  { id: "P010", name: "加藤 拓也", kana: "カトウ タクヤ", gender: "男性", age: 33, birthDate: "1992-10-08", tel: "070-0123-4567", lineDisplayName: "たくや", linePictureUrl: null, tags: [{ name: "新規", color: "#10B981" }], mark: "△", lastVisit: daysAgo(0), memo: "問診未完了" },
  { id: "P011", name: "吉田 麻衣", kana: "ヨシダ マイ", gender: "女性", age: 29, birthDate: "1996-05-20", tel: "080-1111-2222", lineDisplayName: "まい", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }], mark: "○", lastVisit: daysAgo(8), memo: "マンジャロ2.5mg継続" },
  { id: "P012", name: "山田 太郎", kana: "ヤマダ タロウ", gender: "男性", age: 56, birthDate: "1969-02-14", tel: "090-3333-4444", lineDisplayName: "たろう", linePictureUrl: null, tags: [{ name: "リピーター", color: "#F59E0B" }], mark: "○", lastVisit: daysAgo(6), memo: "マンジャロ5mg 3回目" },
  { id: "P013", name: "松本 彩", kana: "マツモト アヤ", gender: "女性", age: 31, birthDate: "1994-11-25", tel: "070-5555-6666", lineDisplayName: "あや", linePictureUrl: null, tags: [{ name: "新規", color: "#10B981" }], mark: "△", lastVisit: daysAgo(1), memo: "カウンセリング予定" },
  { id: "P014", name: "井上 浩二", kana: "イノウエ コウジ", gender: "男性", age: 44, birthDate: "1981-08-07", tel: "080-7777-8888", lineDisplayName: "こうじ", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }, { name: "リピーター", color: "#F59E0B" }], mark: "◎", lastVisit: daysAgo(3), memo: "マンジャロ7.5mg 6回目" },
  { id: "P015", name: "木村 優子", kana: "キムラ ユウコ", gender: "女性", age: 37, birthDate: "1988-04-12", tel: "090-9999-0000", lineDisplayName: "ゆうこ", linePictureUrl: null, tags: [{ name: "VIP", color: "#8B5CF6" }], mark: "◎", lastVisit: daysAgo(2), memo: "マンジャロ5mg 4回目" },
  { id: "P016", name: "林 大地", kana: "ハヤシ ダイチ", gender: "男性", age: 27, birthDate: "1998-12-01", tel: "070-1212-3434", lineDisplayName: "だいち", linePictureUrl: null, tags: [{ name: "新規", color: "#10B981" }], mark: "○", lastVisit: daysAgo(0), memo: "本日初診予約" },
  { id: "P017", name: "清水 里奈", kana: "シミズ リナ", gender: "女性", age: 42, birthDate: "1983-06-30", tel: "080-5656-7878", lineDisplayName: "りな", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }], mark: "○", lastVisit: daysAgo(12), memo: "マンジャロ2.5mg→5mgへ増量検討" },
  { id: "P018", name: "森 慎一", kana: "モリ シンイチ", gender: "男性", age: 50, birthDate: "1975-09-15", tel: "090-7878-9090", lineDisplayName: "しんいち", linePictureUrl: null, tags: [{ name: "リピーター", color: "#F59E0B" }], mark: "○", lastVisit: daysAgo(9), memo: "マンジャロ5mg継続" },
  { id: "P019", name: "池田 あかり", kana: "イケダ アカリ", gender: "女性", age: 26, birthDate: "1999-07-22", tel: "070-2323-4545", lineDisplayName: "あかり✨", linePictureUrl: null, tags: [{ name: "新規", color: "#10B981" }, { name: "GLP-1", color: "#3B82F6" }], mark: "△", lastVisit: daysAgo(1), memo: "初回処方完了" },
  { id: "P020", name: "岡田 裕介", kana: "オカダ ユウスケ", gender: "男性", age: 39, birthDate: "1986-03-18", tel: "080-6767-8989", lineDisplayName: "ゆうすけ", linePictureUrl: null, tags: [{ name: "GLP-1", color: "#3B82F6" }, { name: "VIP", color: "#8B5CF6" }], mark: "◎", lastVisit: daysAgo(4), memo: "マンジャロ7.5mg 5回目" },
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
  // 昨日の予約（完了済み）
  { id: "R006", patientId: "P003", patientName: "鈴木 花子", patientKana: "スズキ ハナコ", patientGender: "女性", patientAge: 28, patientBirthDate: "1997-04-22", date: daysAgo(1), time: "10:00", menu: "GLP-1 初回診察", status: "OK", allergies: "なし", medHistory: "特になし", glp1History: "未経験", currentMeds: "なし", karteNote: "副作用がなく、継続使用のため処方。マンジャロ2.5mgを処方。" },
  { id: "R007", patientId: "P019", patientName: "池田 あかり", patientKana: "イケダ アカリ", patientGender: "女性", patientAge: 26, patientBirthDate: "1999-07-22", date: daysAgo(1), time: "11:00", menu: "GLP-1 初回診察", status: "OK", allergies: "なし", medHistory: "特になし", glp1History: "未経験", currentMeds: "ピル", karteNote: "副作用がなく、継続使用のため処方。マンジャロ2.5mgを処方。ピル併用OK。" },
  { id: "R008", patientId: "P013", patientName: "松本 彩", patientKana: "マツモト アヤ", patientGender: "女性", patientAge: 31, patientBirthDate: "1994-11-25", date: daysAgo(1), time: "14:00", menu: "カウンセリング", status: "OK", allergies: "なし", medHistory: "特になし", glp1History: "未経験", currentMeds: "なし" },
  // 明日の予約
  { id: "R009", patientId: "P004", patientName: "高橋 大輔", patientKana: "タカハシ ダイスケ", patientGender: "男性", patientAge: 38, patientBirthDate: "1987-12-10", date: daysLater(1), time: "10:00", menu: "GLP-1 再診", status: "未診", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ7.5mg 3ヶ月", currentMeds: "なし" },
  { id: "R010", patientId: "P007", patientName: "山本 結衣", patientKana: "ヤマモト ユイ", patientGender: "女性", patientAge: 35, patientBirthDate: "1990-09-28", date: daysLater(1), time: "11:00", menu: "GLP-1 再診", status: "未診", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ2.5mg 2ヶ月", currentMeds: "なし" },
  { id: "R011", patientId: "P017", patientName: "清水 里奈", patientKana: "シミズ リナ", patientGender: "女性", patientAge: 42, patientBirthDate: "1983-06-30", date: daysLater(1), time: "14:00", menu: "GLP-1 再診", status: "未診", allergies: "なし", medHistory: "特になし", glp1History: "マンジャロ2.5mg 1ヶ月", currentMeds: "なし" },
  // 2日後
  { id: "R012", patientId: "P006", patientName: "渡辺 誠", patientKana: "ワタナベ マコト", patientGender: "男性", patientAge: 52, patientBirthDate: "1973-07-18", date: daysLater(2), time: "10:00", menu: "GLP-1 再診", status: "未診", allergies: "なし", medHistory: "糖尿病予備軍", glp1History: "マンジャロ5mg 5ヶ月", currentMeds: "メトホルミン250mg" },
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

// デモ用テンプレートメッセージ
export const DEMO_TEMPLATES = [
  { id: "T001", title: "予約確認", body: "ご予約ありがとうございます。\n○月○日 ○時のご予約を承りました。\n当日お待ちしております。" },
  { id: "T002", title: "問診リマインド", body: "問診フォームのご入力がまだお済みでないようです。\n診察日までにご入力をお願いいたします。\n▼問診フォーム\nhttps://example.com/intake" },
  { id: "T003", title: "発送完了通知", body: "お薬を発送いたしました。\n追跡番号: ○○○○-○○○○-○○○○\nお届けまで1〜2日程度かかります。" },
];

// カレンダー用：月間の予約数マップを生成
export function getMonthReservationCounts(year: number, month: number): Record<string, number> {
  const counts: Record<string, number> = {};
  // 今月のランダムな予約数を生成（再現性あり）
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    // 日曜は0件、土曜は少なめ
    if (dayOfWeek === 0) {
      counts[dateStr] = 0;
    } else if (dayOfWeek === 6) {
      counts[dateStr] = Math.floor(Math.random() * 5) + 1;
    } else {
      counts[dateStr] = Math.floor(Math.random() * 10) + 3;
    }
  }
  // 今日の分は実データの件数で上書き
  const todayStr = today();
  if (counts[todayStr] !== undefined) {
    counts[todayStr] = DEMO_RESERVATIONS.filter((r) => r.date === todayStr).length;
  }
  return counts;
}
