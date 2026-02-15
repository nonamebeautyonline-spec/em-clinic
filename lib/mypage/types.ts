// lib/mypage/types.ts — マイページ設定の型定義

/** 色設定 */
export interface MypageColorConfig {
  primary: string;       // メインカラー（ボタン、リンク等）
  primaryHover: string;  // ホバー色
  primaryLight: string;  // 薄い背景色
  pageBg: string;        // ページ全体の背景色
  primaryText: string;   // 強調テキスト色
}

/** セクション表示/非表示 */
export interface MypageSectionConfig {
  showIntakeStatus: boolean;  // 問診ステータス + 予約ボタン
  showReservation: boolean;   // 次回予約ブロック
  showOrders: boolean;        // 注文/発送状況
  showReorder: boolean;       // 再処方申請
  showHistory: boolean;       // 処方履歴
  showSupport: boolean;       // サポート
}

/** コンテンツ設定 */
export interface MypageContentConfig {
  clinicName: string;          // ヘッダーに表示するクリニック名（空ならロゴ優先）
  logoUrl: string;             // ヘッダーロゴURL（空なら既存画像）
  supportMessage: string;      // サポートセクション本文
  supportUrl: string;          // LINE問い合わせURL
  supportButtonLabel: string;  // 問い合わせボタンラベル
  supportNote: string;         // 注釈テキスト
}

/** 文言設定（ボタン・セクションタイトル等） */
export interface MypageLabelsConfig {
  intakeButtonLabel: string;       // 問診ボタン
  intakeCompleteText: string;      // 問診完了時テキスト
  intakeGuideText: string;         // 問診完了時ガイド
  intakeNoteText: string;          // 問診ボタン下の注記
  reserveButtonLabel: string;      // 予約ボタン
  purchaseButtonLabel: string;     // 初回購入ボタン
  reorderButtonLabel: string;      // 再処方申請ボタン
  reservationTitle: string;        // 予約セクションタイトル
  ordersTitle: string;             // 注文セクションタイトル
  historyTitle: string;            // 処方歴セクションタイトル
  supportTitle: string;            // サポートセクションタイトル
  noOrdersText: string;            // 注文なし時テキスト
  noHistoryText: string;           // 処方歴なし時テキスト
  phoneNotice: string;             // 電話案内文言
  cancelNotice: string;            // 予約変更キャンセル注記
}

/** マイページ設定全体 */
export interface MypageConfig {
  colors: MypageColorConfig;
  sections: MypageSectionConfig;
  content: MypageContentConfig;
  labels: MypageLabelsConfig;
}

/** デフォルト設定（現在のハードコード値と一致） */
export const DEFAULT_MYPAGE_CONFIG: MypageConfig = {
  colors: {
    primary: "#ec4899",
    primaryHover: "#db2777",
    primaryLight: "#fdf2f8",
    pageBg: "#FFF8FB",
    primaryText: "#be185d",
  },
  sections: {
    showIntakeStatus: true,
    showReservation: true,
    showOrders: true,
    showReorder: true,
    showHistory: true,
    showSupport: true,
  },
  content: {
    clinicName: "",
    logoUrl: "",
    supportMessage: "予約やお薬、体調についてご不安な点があれば、LINEからいつでもご相談いただけます。",
    supportUrl: "https://lin.ee/BlKX38U",
    supportButtonLabel: "LINEで問い合わせる",
    supportNote: "※ 診察中・夜間など、返信までお時間をいただく場合があります。",
  },
  labels: {
    intakeButtonLabel: "問診に進む",
    intakeCompleteText: "問診はすでに完了しています",
    intakeGuideText: "問診の入力は不要です。このまま予約にお進みください。",
    intakeNoteText: "※ 問診の入力が終わると、診察予約画面に進みます。",
    reserveButtonLabel: "予約に進む",
    purchaseButtonLabel: "マンジャロを購入する（初回）",
    reorderButtonLabel: "再処方を申請する",
    reservationTitle: "次回のご予約",
    ordersTitle: "注文／申請・発送状況",
    historyTitle: "これまでの処方歴",
    supportTitle: "お困りの方へ",
    noOrdersText: "現在、発送状況の確認が必要なお薬はありません。",
    noHistoryText: "まだ処方の履歴はありません。",
    phoneNotice: "上記時間内に、090-からはじまる電話番号より携帯電話へお電話いたします。\n必ずしも開始時刻ちょうどではなく、予約枠（例：12:00〜12:15）の間に医師より順次ご連絡します。\n前の診療状況により、前後15分程度お時間が前後する場合があります。あらかじめご了承ください。",
    cancelNotice: "※ 予約の変更・キャンセルは診察予定時刻の1時間前まで可能です。",
  },
};
