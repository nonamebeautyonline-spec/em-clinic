// lib/shipping/japanpost.ts — 日本郵便ゆうパックCSVフォーマッター
import type { OrderData, JapanPostConfig } from "./types";
import { normalizePostal, normalizePhoneForYamato as normalizePhone, splitAddressForYamato as splitAddress } from "@/utils/yamato-b2-formatter";

/**
 * 日本郵便ゆうパックプリントR用CSVヘッダー（主要30列）
 * ゆうパックプリントRの「差出情報CSV取込」形式
 */
export const JAPANPOST_HEADER = [
  "お届け先郵便番号",     // 1
  "お届け先住所1",        // 2
  "お届け先住所2",        // 3
  "お届け先住所3",        // 4
  "お届け先名称",         // 5
  "お届け先敬称",         // 6
  "お届け先電話番号",     // 7
  "ご依頼主郵便番号",     // 8
  "ご依頼主住所1",        // 9
  "ご依頼主住所2",        // 10
  "ご依頼主住所3",        // 11
  "ご依頼主名称",         // 12
  "ご依頼主電話番号",     // 13
  "品名1",               // 14
  "品名2",               // 15
  "品名3",               // 16
  "品名4",               // 17
  "摘要欄",              // 18
  "取扱注意1",           // 19
  "取扱注意2",           // 20
  "着払い",              // 21
  "代金引換額",          // 22
  "代金引換送金先口座",   // 23
  "配達希望日",          // 24
  "配達時間帯",          // 25
  "お届け通知メール",     // 26
  "お届け通知メールアドレス", // 27
  "お客様管理番号",       // 28
  "発送予定日",          // 29
  "個数",               // 30
];

/** CSV行生成 */
export function generateJapanPostRow(order: OrderData, config: JapanPostConfig, shipDate: string): string[] {
  const postal = normalizePostal(order.postal);
  const phone = normalizePhone(order.phone);
  const { addr1, addr2 } = splitAddress(order.address);
  const senderPhone = normalizePhone(config.senderPhone);

  return [
    postal,                          // 1: お届け先郵便番号
    addr1,                           // 2: お届け先住所1
    addr2,                           // 3: お届け先住所2
    "",                              // 4: お届け先住所3
    order.name,                      // 5: お届け先名称
    "様",                            // 6: お届け先敬称
    phone,                           // 7: お届け先電話番号
    config.senderPostal,             // 8: ご依頼主郵便番号
    config.senderAddress,            // 9: ご依頼主住所1
    "",                              // 10: ご依頼主住所2
    "",                              // 11: ご依頼主住所3
    config.senderName,               // 12: ご依頼主名称
    senderPhone,                     // 13: ご依頼主電話番号
    config.itemName,                 // 14: 品名1
    "",                              // 15: 品名2
    "",                              // 16: 品名3
    "",                              // 17: 品名4
    "",                              // 18: 摘要欄
    "",                              // 19: 取扱注意1
    "",                              // 20: 取扱注意2
    "0",                             // 21: 着払い（0=元払い）
    "",                              // 22: 代金引換額
    "",                              // 23: 代金引換送金先口座
    "",                              // 24: 配達希望日
    "",                              // 25: 配達時間帯
    "0",                             // 26: お届け通知メール
    order.email,                     // 27: お届け通知メールアドレス
    order.payment_id,                // 28: お客様管理番号
    shipDate,                        // 29: 発送予定日
    "1",                             // 30: 個数
  ];
}

/** CSV生成（ヘッダー付き） */
export function generateJapanPostCsv(orders: OrderData[], config: JapanPostConfig, shipDate: string): string {
  const rows: string[] = [];
  rows.push(toCsvRow(JAPANPOST_HEADER));
  for (const order of orders) {
    rows.push(toCsvRow(generateJapanPostRow(order, config, shipDate)));
  }
  return rows.join("\r\n");
}

function toCsvRow(cols: string[]): string {
  return cols
    .map(cell => {
      const v = cell === null || cell === undefined ? "" : String(cell);
      return `"${v.replace(/"/g, '""')}"`;
    })
    .join(",");
}
