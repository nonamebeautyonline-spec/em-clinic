// scripts/check-vercel-env-from-api.mjs
// 本番APIを叩いて環境変数が設定されているか確認

const productionUrl = "https://app.noname-beauty.jp";

async function checkEnv() {
  console.log("=== Vercel環境変数チェック（本番API経由） ===\n");

  // 簡易的なヘルスチェックAPIを作成する必要があります
  // とりあえず、/api/intake/listを叩いてエラー内容を確認

  try {
    const url = `${productionUrl}/api/intake/list?fromDate=2026-01-29&toDate=2026-01-29`;
    console.log("URL:", url);
    console.log("リクエスト送信中...\n");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const status = response.status;
    const text = await response.text();

    console.log("Status:", status);
    console.log("Response length:", text.length, "bytes\n");

    if (status >= 200 && status < 300) {
      const json = JSON.parse(text);
      console.log("✅ API成功");
      console.log("patients件数:", json.patients?.length || 0);

      if (json.patients && json.patients.length > 0) {
        console.log("\n最初の患者:");
        console.log(JSON.stringify(json.patients[0], null, 2));
      }
    } else {
      console.log("❌ API失敗");
      console.log("Response:", text.substring(0, 500));
    }
  } catch (error) {
    console.error("❌ エラー:", error.message);
  }

  console.log("\n【重要】");
  console.log("Vercel Dashboard → Settings → Environment Variablesで以下を確認:");
  console.log("1. NEXT_PUBLIC_SUPABASE_URL");
  console.log("2. NEXT_PUBLIC_SUPABASE_ANON_KEY");
  console.log("3. これらが「Production」環境に設定されているか");
}

checkEnv();
