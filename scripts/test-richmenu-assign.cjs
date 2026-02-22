// リッチメニュー割り当てテスト + ブロック確認
require("dotenv").config({ path: __dirname + "/../.env.local" });
const TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

const LINE_ID = "U89c0e6f92bdb801017f63d68589991a8";
const MENU_ID = "richmenu-e002a4f2cbcd2063058cd58c55dae129"; // 処方後

(async () => {
  // 1) プロフィール取得でブロック確認
  console.log("=== プロフィール取得（ブロック確認） ===");
  const profileRes = await fetch("https://api.line.me/v2/bot/profile/" + LINE_ID, {
    headers: { Authorization: "Bearer " + TOKEN },
  });
  console.log("status:", profileRes.status);
  if (profileRes.ok) {
    const profile = await profileRes.json();
    console.log("displayName:", profile.displayName);
    console.log("statusMessage:", profile.statusMessage || "(なし)");
  } else {
    const text = await profileRes.text();
    console.log("エラー:", text);
    console.log("→ ブロックされている可能性が高い");
    return;
  }

  // 2) メニュー割り当てテスト
  console.log("\n=== メニュー割り当て（処方後） ===");
  const assignRes = await fetch("https://api.line.me/v2/bot/user/" + LINE_ID + "/richmenu/" + MENU_ID, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + TOKEN,
    },
  });
  console.log("status:", assignRes.status);
  const assignText = await assignRes.text();
  console.log("response:", assignText);

  // 3) 割り当て後に確認
  console.log("\n=== 割り当て後の確認 ===");
  const checkRes = await fetch("https://api.line.me/v2/bot/user/" + LINE_ID + "/richmenu", {
    headers: { Authorization: "Bearer " + TOKEN },
  });
  console.log("status:", checkRes.status);
  const checkText = await checkRes.text();
  console.log("response:", checkText);

  // 4) デフォルトメニュー確認
  console.log("\n=== デフォルトメニュー確認 ===");
  const defaultRes = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
    headers: { Authorization: "Bearer " + TOKEN },
  });
  console.log("status:", defaultRes.status);
  if (defaultRes.ok) {
    const defaultData = await defaultRes.json();
    console.log("デフォルト:", JSON.stringify(defaultData));
  }
})();
