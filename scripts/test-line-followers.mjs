import { readFileSync } from "fs";
import { resolve } from "path";
import fetch from "node-fetch";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

console.log('=== LINE友だち数 テスト ===\n');

const url = `${envVars.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/line/followers`;

console.log('API URL:', url);
console.log('');

const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${envVars.ADMIN_TOKEN}`,
  },
});

console.log('Response status:', response.status);
console.log('');

const data = await response.json();

if (response.ok) {
  console.log('✅ 取得成功');
  console.log('');
  console.log('■ LINE友だち統計:');
  console.log(`  友だち数: ${data.followers}人`);
  console.log(`  ターゲットリーチ: ${data.targetedReaches}人`);
  console.log(`  ブロック数: ${data.blocks}人`);
  console.log(`  データ日付: ${data.date}`);
  console.log(`  ステータス: ${data.status}`);
} else {
  console.log('❌ 取得失敗');
  console.log('');
  console.log('エラー:', data.error);
  if (data.details) {
    console.log('詳細:', data.details);
  }
  console.log('');
  console.log('📝 セットアップ手順:');
  console.log('1. LINE Developersコンソールにアクセス');
  console.log('2. Messaging APIチャネルを選択');
  console.log('3. "Messaging API設定"タブを開く');
  console.log('4. "チャネルアクセストークン"を発行');
  console.log('5. .env.localに以下を追加:');
  console.log('   LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN=<取得したトークン>');
}
