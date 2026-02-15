// lib/flex-message/types.ts — FLEX通知メッセージ設定の型定義

/** 共通色設定 */
export interface FlexColorConfig {
  headerBg: string;      // ヘッダー背景色
  headerText: string;    // ヘッダー文字色
  accentColor: string;   // 強調色（日時・追跡番号）
  bodyText: string;      // 本文テキスト色
  buttonColor: string;   // ボタン色
}

/** 予約通知テキスト設定 */
export interface FlexReservationTexts {
  createdHeader: string;       // 予約確定ヘッダー
  createdPhoneNotice: string;  // 電話案内
  createdNote: string;         // 補足文言
  changedHeader: string;       // 予約変更ヘッダー
  changedPhoneNotice: string;  // 変更時電話案内
  canceledHeader: string;      // キャンセルヘッダー
  canceledNote: string;        // キャンセル後案内
}

/** 発送通知テキスト設定 */
export interface FlexShippingTexts {
  header: string;            // ヘッダー
  deliveryNotice1: string;   // 日時指定案内1
  deliveryNotice2: string;   // 日時指定案内2
  storageNotice1: string;    // 保管案内1
  storageNotice2: string;    // 保管案内2
  buttonLabel: string;       // ボタンラベル
  footerNote: string;        // フッター補足
  truckImageUrl: string;     // トラック画像URL
  progressBarUrl: string;    // プログレスバー画像URL
}

/** FLEX設定全体 */
export interface FlexMessageConfig {
  colors: FlexColorConfig;
  reservation: FlexReservationTexts;
  shipping: FlexShippingTexts;
}

/** デフォルト設定（現在のハードコード値と一致） */
export const DEFAULT_FLEX_CONFIG: FlexMessageConfig = {
  colors: {
    headerBg: "#ec4899",
    headerText: "#ffffff",
    accentColor: "#be185d",
    bodyText: "#666666",
    buttonColor: "#ec4899",
  },
  reservation: {
    createdHeader: "予約が確定しました",
    createdPhoneNotice: "診療は予約時間枠の間に「090-」から始まる番号よりお電話いたします。",
    createdNote: "変更・キャンセルはマイページからお手続きください。",
    changedHeader: "予約日時が変更されました",
    changedPhoneNotice: "診療は予約時間枠の間に「090-」から始まる番号よりお電話いたします。",
    canceledHeader: "予約がキャンセルされました",
    canceledNote: "再度ご予約を希望される場合は、マイページから新しい日時をお選びください。",
  },
  shipping: {
    header: "発送完了のお知らせ",
    deliveryNotice1: "ヤマト運輸からの発送が開始されると日時指定が可能となります。",
    deliveryNotice2: "日時指定を希望される場合はボタンより変更をしてください。",
    storageNotice1: "お届け後、マンジャロは冷蔵保管をするようにお願いいたします。",
    storageNotice2: "冷凍保存を行うと薬液が凍結したり効果が下がってしまいますのでご注意ください。",
    buttonLabel: "配送状況を確認",
    footerNote: "マイページからも確認が可能です",
    truckImageUrl: "https://app.noname-beauty.jp/images/truck-delivery.png",
    progressBarUrl: "https://app.noname-beauty.jp/images/progress-bar.png",
  },
};
