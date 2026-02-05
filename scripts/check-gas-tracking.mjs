import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

async function main() {
  console.log("=== GASから追跡番号データを探索 ===\n");

  // 1. GAS_ADMIN_URL から「のなめマスター」データを取得
  const adminUrl = envVars.GAS_ADMIN_URL;
  if (adminUrl) {
    console.log("1. GAS_ADMIN_URL を確認中...");
    try {
      // type=getNonameMaster などのパラメータを試す
      const res = await fetch(`${adminUrl}?type=getNonameMaster`, {
        method: "GET",
        redirect: "follow",
      });
      const text = await res.text();
      console.log("   Response (先頭500文字):", text.slice(0, 500));
    } catch (e) {
      console.log("   エラー:", e.message);
    }
  }

  // 2. GAS_SQUARE_WEBHOOK_URL から全データ取得（list_all）
  const squareUrl = envVars.GAS_SQUARE_WEBHOOK_URL;
  if (squareUrl) {
    console.log("\n2. GAS_SQUARE_WEBHOOK_URL を確認中...");
    try {
      const res = await fetch(squareUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "list_all" }),
      });
      const data = await res.json();
      const rows = data.rows || [];
      console.log(`   取得件数: ${rows.length}件`);

      // 追跡番号カラムがあるか確認
      if (rows.length > 0) {
        const sample = rows[0];
        console.log("   カラム数:", sample.length);
        console.log("   サンプル行:", JSON.stringify(sample));

        // tracking_numberが含まれている行を探す
        const withTracking = rows.filter(row => {
          return row.some(cell => String(cell).match(/^\d{4}-\d{4}-\d{4}$/) || String(cell).match(/^\d{12}$/));
        });
        console.log("   追跡番号パターンを含む行:", withTracking.length);
      }
    } catch (e) {
      console.log("   エラー:", e.message);
    }
  }

  // 3. GAS_MYPAGE_ORDERS_URL から注文データを取得
  const mypageOrdersUrl = envVars.GAS_MYPAGE_ORDERS_URL;
  if (mypageOrdersUrl) {
    console.log("\n3. GAS_MYPAGE_ORDERS_URL を確認中...");
    try {
      const res = await fetch(`${mypageOrdersUrl}?type=list`, {
        method: "GET",
        redirect: "follow",
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.log("   Response (JSON解析失敗):", text.slice(0, 500));
        return;
      }
      console.log("   Response keys:", Object.keys(data));
      if (data.orders) {
        console.log("   注文数:", data.orders.length);
        // 追跡番号ありの注文
        const withTracking = data.orders.filter(o => o.tracking_number);
        console.log("   追跡番号あり:", withTracking.length);
        if (withTracking.length > 0) {
          console.log("   最新5件:");
          withTracking.slice(-5).forEach((o, i) => {
            console.log(`     ${i+1}. ${o.tracking_number} | ${o.shipping_date || '-'}`);
          });
        }
      }
    } catch (e) {
      console.log("   エラー:", e.message);
    }
  }

  // 4. GAS_UPSERT_URL でのなめマスターデータを取得
  const upsertUrl = envVars.GAS_UPSERT_URL;
  if (upsertUrl) {
    console.log("\n4. GAS_UPSERT_URL を確認中...");
    try {
      const res = await fetch(upsertUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "getOrders" }),
      });
      const text = await res.text();
      console.log("   Response (先頭500文字):", text.slice(0, 500));
    } catch (e) {
      console.log("   エラー:", e.message);
    }
  }
}

main().catch(console.error);
