#!/usr/bin/env node
// EMオンラインクリニック商品一括登録スクリプト
// 使い方: node scripts/em-products-seed.js

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// .env.local読み込み
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z_0-9]*)=["']?([^"']*)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(
  /https:\/\/([^.]+)\.supabase\.co/,
  "$1"
);

const EM_TENANT_ID = "bfd0a329-ba40-456d-9c28-c7d32d4ef666";

// 全商品データ（配送料抜き価格）
const products = [
  // ===================== マンジャロ 2.5mg =====================
  // 通常便
  { code: "MJL_2.5mg_1m_std", title: "マンジャロ2.5mg 1ヶ月 通常便", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 1, price: 15500, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 100 },
  { code: "MJL_2.5mg_2m_std", title: "マンジャロ2.5mg 2ヶ月 通常便", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 2, price: 32000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 101 },
  { code: "MJL_2.5mg_3m_std", title: "マンジャロ2.5mg 3ヶ月 通常便", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 3, price: 48000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 102 },
  { code: "MJL_2.5mg_4m_std", title: "マンジャロ2.5mg 4ヶ月 通常便", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 4, price: 64000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 103 },
  { code: "MJL_2.5mg_5m_std", title: "マンジャロ2.5mg 5ヶ月 通常便", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 5, price: 80000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 104 },
  { code: "MJL_2.5mg_6m_std", title: "マンジャロ2.5mg 6ヶ月 通常便", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 6, price: 96000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 105 },
  // 予約便
  { code: "MJL_2.5mg_1m_rsv", title: "マンジャロ2.5mg 1ヶ月 予約便", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 1, price: 12500, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 110 },
  { code: "MJL_2.5mg_2m_rsv", title: "マンジャロ2.5mg 2ヶ月 予約便", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 2, price: 26000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 111 },
  { code: "MJL_2.5mg_3m_rsv", title: "マンジャロ2.5mg 3ヶ月 予約便", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 3, price: 39000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 112 },
  { code: "MJL_2.5mg_4m_rsv", title: "マンジャロ2.5mg 4ヶ月 予約便", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 4, price: 52000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 113 },
  { code: "MJL_2.5mg_5m_rsv", title: "マンジャロ2.5mg 5ヶ月 予約便", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 5, price: 65000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 114 },
  { code: "MJL_2.5mg_6m_rsv", title: "マンジャロ2.5mg 6ヶ月 予約便", drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 6, price: 78000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 115 },

  // ===================== マンジャロ 移行プラン① =====================
  { code: "MJL_trans1_std", title: "マンジャロ移行プラン① 通常便", drug_name: "マンジャロ", dosage: "移行①", duration_months: 1, price: 22000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 200 },
  { code: "MJL_trans1_rsv", title: "マンジャロ移行プラン① 予約便", drug_name: "マンジャロ", dosage: "移行①", duration_months: 1, price: 19500, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 201 },

  // ===================== マンジャロ 5mg =====================
  // 通常便
  { code: "MJL_5mg_1m_std", title: "マンジャロ5mg 1ヶ月 通常便", drug_name: "マンジャロ", dosage: "5mg", duration_months: 1, price: 27500, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 300 },
  { code: "MJL_5mg_2m_std", title: "マンジャロ5mg 2ヶ月 通常便", drug_name: "マンジャロ", dosage: "5mg", duration_months: 2, price: 55000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 301 },
  { code: "MJL_5mg_3m_std", title: "マンジャロ5mg 3ヶ月 通常便", drug_name: "マンジャロ", dosage: "5mg", duration_months: 3, price: 81000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 302 },
  { code: "MJL_5mg_4m_std", title: "マンジャロ5mg 4ヶ月 通常便", drug_name: "マンジャロ", dosage: "5mg", duration_months: 4, price: 105000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 303 },
  { code: "MJL_5mg_5m_std", title: "マンジャロ5mg 5ヶ月 通常便", drug_name: "マンジャロ", dosage: "5mg", duration_months: 5, price: 130000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 304 },
  { code: "MJL_5mg_6m_std", title: "マンジャロ5mg 6ヶ月 通常便", drug_name: "マンジャロ", dosage: "5mg", duration_months: 6, price: 155000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 305 },
  // 予約便（3ヶ月以上はVol.ディスカウント）
  { code: "MJL_5mg_1m_rsv", title: "マンジャロ5mg 1ヶ月 予約便", drug_name: "マンジャロ", dosage: "5mg", duration_months: 1, price: 24500, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 310 },
  { code: "MJL_5mg_2m_rsv", title: "マンジャロ5mg 2ヶ月 予約便", drug_name: "マンジャロ", dosage: "5mg", duration_months: 2, price: 49000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 311 },
  { code: "MJL_5mg_3m_rsv", title: "マンジャロ5mg 3ヶ月 予約便", drug_name: "マンジャロ", dosage: "5mg", duration_months: 3, price: 70000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 312 },
  { code: "MJL_5mg_4m_rsv", title: "マンジャロ5mg 4ヶ月 予約便", drug_name: "マンジャロ", dosage: "5mg", duration_months: 4, price: 94000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 313 },
  { code: "MJL_5mg_5m_rsv", title: "マンジャロ5mg 5ヶ月 予約便", drug_name: "マンジャロ", dosage: "5mg", duration_months: 5, price: 117000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 314 },
  { code: "MJL_5mg_6m_rsv", title: "マンジャロ5mg 6ヶ月 予約便", drug_name: "マンジャロ", dosage: "5mg", duration_months: 6, price: 140000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 315 },

  // ===================== マンジャロ 移行プラン② =====================
  { code: "MJL_trans2_std", title: "マンジャロ移行プラン② 通常便", drug_name: "マンジャロ", dosage: "移行②", duration_months: 1, price: 35500, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 400 },
  { code: "MJL_trans2_rsv", title: "マンジャロ移行プラン② 予約便", drug_name: "マンジャロ", dosage: "移行②", duration_months: 1, price: 32500, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 401 },

  // ===================== マンジャロ 7.5mg =====================
  // 通常便
  { code: "MJL_7.5mg_1m_std", title: "マンジャロ7.5mg 1ヶ月 通常便", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 1, price: 42000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 500 },
  { code: "MJL_7.5mg_2m_std", title: "マンジャロ7.5mg 2ヶ月 通常便", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 2, price: 84000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 501 },
  { code: "MJL_7.5mg_3m_std", title: "マンジャロ7.5mg 3ヶ月 通常便", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 3, price: 126000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 502 },
  { code: "MJL_7.5mg_4m_std", title: "マンジャロ7.5mg 4ヶ月 通常便", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 4, price: 168000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 503 },
  { code: "MJL_7.5mg_5m_std", title: "マンジャロ7.5mg 5ヶ月 通常便", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 5, price: 210000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 504 },
  { code: "MJL_7.5mg_6m_std", title: "マンジャロ7.5mg 6ヶ月 通常便", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 6, price: 252000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 505 },
  // 予約便
  { code: "MJL_7.5mg_1m_rsv", title: "マンジャロ7.5mg 1ヶ月 予約便", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 1, price: 39000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 510 },
  { code: "MJL_7.5mg_2m_rsv", title: "マンジャロ7.5mg 2ヶ月 予約便", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 2, price: 78000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 511 },
  { code: "MJL_7.5mg_3m_rsv", title: "マンジャロ7.5mg 3ヶ月 予約便", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 3, price: 117000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 512 },
  { code: "MJL_7.5mg_4m_rsv", title: "マンジャロ7.5mg 4ヶ月 予約便", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 4, price: 156000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 513 },
  { code: "MJL_7.5mg_5m_rsv", title: "マンジャロ7.5mg 5ヶ月 予約便", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 5, price: 195000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 514 },
  { code: "MJL_7.5mg_6m_rsv", title: "マンジャロ7.5mg 6ヶ月 予約便", drug_name: "マンジャロ", dosage: "7.5mg", duration_months: 6, price: 234000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 515 },

  // ===================== マンジャロ 10mg =====================
  // 通常便
  { code: "MJL_10mg_1m_std", title: "マンジャロ10mg 1ヶ月 通常便", drug_name: "マンジャロ", dosage: "10mg", duration_months: 1, price: 64000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 600 },
  { code: "MJL_10mg_2m_std", title: "マンジャロ10mg 2ヶ月 通常便", drug_name: "マンジャロ", dosage: "10mg", duration_months: 2, price: 128000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 601 },
  { code: "MJL_10mg_3m_std", title: "マンジャロ10mg 3ヶ月 通常便", drug_name: "マンジャロ", dosage: "10mg", duration_months: 3, price: 192000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 602 },
  { code: "MJL_10mg_4m_std", title: "マンジャロ10mg 4ヶ月 通常便", drug_name: "マンジャロ", dosage: "10mg", duration_months: 4, price: 256000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 603 },
  { code: "MJL_10mg_5m_std", title: "マンジャロ10mg 5ヶ月 通常便", drug_name: "マンジャロ", dosage: "10mg", duration_months: 5, price: 320000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 604 },
  { code: "MJL_10mg_6m_std", title: "マンジャロ10mg 6ヶ月 通常便", drug_name: "マンジャロ", dosage: "10mg", duration_months: 6, price: 384000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 605 },
  // 予約便
  { code: "MJL_10mg_1m_rsv", title: "マンジャロ10mg 1ヶ月 予約便", drug_name: "マンジャロ", dosage: "10mg", duration_months: 1, price: 60000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 610 },
  { code: "MJL_10mg_2m_rsv", title: "マンジャロ10mg 2ヶ月 予約便", drug_name: "マンジャロ", dosage: "10mg", duration_months: 2, price: 120000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 611 },
  { code: "MJL_10mg_3m_rsv", title: "マンジャロ10mg 3ヶ月 予約便", drug_name: "マンジャロ", dosage: "10mg", duration_months: 3, price: 180000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 612 },
  { code: "MJL_10mg_4m_rsv", title: "マンジャロ10mg 4ヶ月 予約便", drug_name: "マンジャロ", dosage: "10mg", duration_months: 4, price: 240000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 613 },
  { code: "MJL_10mg_5m_rsv", title: "マンジャロ10mg 5ヶ月 予約便", drug_name: "マンジャロ", dosage: "10mg", duration_months: 5, price: 300000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 614 },
  { code: "MJL_10mg_6m_rsv", title: "マンジャロ10mg 6ヶ月 予約便", drug_name: "マンジャロ", dosage: "10mg", duration_months: 6, price: 360000, shipping_delay_days: 10, cool_type: "chilled", category: "injection", sort_order: 615 },

  // ===================== マンジャロ 12.5mg（通常/予約区別なし） =====================
  { code: "MJL_12.5mg_1m", title: "マンジャロ12.5mg 1ヶ月", drug_name: "マンジャロ", dosage: "12.5mg", duration_months: 1, price: 80000, shipping_delay_days: 0, cool_type: "chilled", category: "injection", sort_order: 700 },

  // ===================== リベルサス（定期なし・配送タイプなし） =====================
  { code: "RBL_3mg_1m", title: "リベルサス3mg 1ヶ月", drug_name: "リベルサス", dosage: "3mg", duration_months: 1, price: 8700, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 800 },
  { code: "RBL_3mg_2m", title: "リベルサス3mg 2ヶ月", drug_name: "リベルサス", dosage: "3mg", duration_months: 2, price: 17440, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 801 },
  { code: "RBL_3mg_3m", title: "リベルサス3mg 3ヶ月", drug_name: "リベルサス", dosage: "3mg", duration_months: 3, price: 24600, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 802 },
  // 移行プラン①（3mg→7mg）
  { code: "RBL_trans1", title: "リベルサス移行プラン①（3mg→7mg）", drug_name: "リベルサス", dosage: "移行①", duration_months: 1, price: 13450, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 810 },
  // 7mg
  { code: "RBL_7mg_1m", title: "リベルサス7mg 1ヶ月", drug_name: "リベルサス", dosage: "7mg", duration_months: 1, price: 15000, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 820 },
  { code: "RBL_7mg_2m", title: "リベルサス7mg 2ヶ月", drug_name: "リベルサス", dosage: "7mg", duration_months: 2, price: 30000, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 821 },
  { code: "RBL_7mg_3m", title: "リベルサス7mg 3ヶ月", drug_name: "リベルサス", dosage: "7mg", duration_months: 3, price: 45000, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 822 },
  // 移行プラン②（7mg→14mg）
  { code: "RBL_trans2", title: "リベルサス移行プラン②（7mg→14mg）", drug_name: "リベルサス", dosage: "移行②", duration_months: 1, price: 19000, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 830 },
  // 移行プラン③（7mg10日+14mg20日）
  { code: "RBL_trans3", title: "リベルサス移行プラン③（7mg10日+14mg20日）", drug_name: "リベルサス", dosage: "移行③", duration_months: 1, price: 23000, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 831 },
  // 14mg
  { code: "RBL_14mg_1m", title: "リベルサス14mg 1ヶ月", drug_name: "リベルサス", dosage: "14mg", duration_months: 1, price: 25450, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 840 },
  { code: "RBL_14mg_2m", title: "リベルサス14mg 2ヶ月", drug_name: "リベルサス", dosage: "14mg", duration_months: 2, price: 50000, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 841 },
  { code: "RBL_14mg_3m", title: "リベルサス14mg 3ヶ月", drug_name: "リベルサス", dosage: "14mg", duration_months: 3, price: 75000, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 842 },

  // ===================== 低用量ピル =====================
  { code: "PIL_1m", title: "低用量ピル 1ヶ月", drug_name: "低用量ピル", dosage: null, duration_months: 1, price: 2700, shipping_delay_days: 0, cool_type: "normal", category: "pill", sort_order: 900 },
  { code: "PIL_3m", title: "低用量ピル 3ヶ月", drug_name: "低用量ピル", dosage: null, duration_months: 3, price: 8100, shipping_delay_days: 0, cool_type: "normal", category: "pill", sort_order: 901 },
  { code: "PIL_6m", title: "低用量ピル 6ヶ月", drug_name: "低用量ピル", dosage: null, duration_months: 6, price: 15000, shipping_delay_days: 0, cool_type: "normal", category: "pill", sort_order: 902 },
  { code: "PIL_12m", title: "低用量ピル 12ヶ月", drug_name: "低用量ピル", dosage: null, duration_months: 12, price: 28000, shipping_delay_days: 0, cool_type: "normal", category: "pill", sort_order: 903 },

  // ===================== アフターピル =====================
  { code: "AP_levo", title: "レボノルゲストレル（国内後発品・72時間以内）", drug_name: "レボノルゲストレル", dosage: null, duration_months: null, price: 8000, shipping_delay_days: 0, cool_type: "normal", category: "pill", sort_order: 1000 },
  { code: "AP_norle", title: "ノルレボ（国内先発品・72時間以内）", drug_name: "ノルレボ", dosage: null, duration_months: null, price: 15000, shipping_delay_days: 0, cool_type: "normal", category: "pill", sort_order: 1001 },

  // ===================== 美容内服 =====================
  { code: "BW_3set", title: "美白セット3種", drug_name: "美白セット", dosage: "3種", duration_months: 1, price: 3450, shipping_delay_days: 0, cool_type: "normal", category: "supplement", sort_order: 1100 },
  { code: "BW_4set", title: "美白セット4種", drug_name: "美白セット", dosage: "4種", duration_months: 1, price: 4700, shipping_delay_days: 0, cool_type: "normal", category: "supplement", sort_order: 1101 },

  // ===================== 漢方薬 =====================
  { code: "KANPO_bofu", title: "防風通聖散", drug_name: "防風通聖散", dosage: null, duration_months: 1, price: 4500, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 1200 },

  // ===================== メトホルミン =====================
  { code: "MET_250mg", title: "メトホルミン250mg 90錠", drug_name: "メトホルミン", dosage: "250mg", duration_months: null, price: 4500, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 1300 },
  { code: "MET_500mg", title: "メトホルミン500mg 90錠", drug_name: "メトホルミン", dosage: "500mg", duration_months: null, price: 6000, shipping_delay_days: 0, cool_type: "normal", category: "oral", sort_order: 1301 },

  // ===================== 再送料 =====================
  { code: "RESEND_normal", title: "再送料（常温便）", drug_name: "", dosage: null, duration_months: null, price: 550, shipping_delay_days: 0, cool_type: "normal", category: "fee", sort_order: 9000 },
  { code: "RESEND_cool", title: "再送料（クール便）", drug_name: "", dosage: null, duration_months: null, price: 1000, shipping_delay_days: 0, cool_type: "chilled", category: "fee", sort_order: 9001 },
];

async function main() {
  const client = new Client({
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    user: `postgres.${projectRef}`,
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  // 既存EM商品数確認
  const { rows: existing } = await client.query(
    "SELECT count(*) as cnt FROM products WHERE tenant_id = $1",
    [EM_TENANT_ID]
  );
  console.log(`既存EM商品数: ${existing[0].cnt}`);

  let inserted = 0;
  for (const p of products) {
    try {
      await client.query(
        `INSERT INTO products (tenant_id, code, title, drug_name, dosage, duration_months, price, shipping_delay_days, cool_type, category, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
         ON CONFLICT (tenant_id, code) DO UPDATE SET
           title = EXCLUDED.title,
           drug_name = EXCLUDED.drug_name,
           dosage = EXCLUDED.dosage,
           duration_months = EXCLUDED.duration_months,
           price = EXCLUDED.price,
           shipping_delay_days = EXCLUDED.shipping_delay_days,
           cool_type = EXCLUDED.cool_type,
           category = EXCLUDED.category,
           sort_order = EXCLUDED.sort_order,
           updated_at = now()`,
        [EM_TENANT_ID, p.code, p.title, p.drug_name, p.dosage, p.duration_months, p.price, p.shipping_delay_days, p.cool_type, p.category, p.sort_order]
      );
      inserted++;
    } catch (e) {
      console.error(`Error inserting ${p.code}:`, e.message);
    }
  }

  console.log(`${inserted}件の商品を登録しました`);

  // 確認
  const { rows: final } = await client.query(
    "SELECT count(*) as cnt FROM products WHERE tenant_id = $1",
    [EM_TENANT_ID]
  );
  console.log(`EM商品数（最終）: ${final[0].cnt}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
