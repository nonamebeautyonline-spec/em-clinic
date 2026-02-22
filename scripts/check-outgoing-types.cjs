/**
 * outgoing メッセージの内訳を詳しく確認
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // outgoing の event_type × message_type の分布
  const { data: all } = await supabase
    .from("message_log")
    .select("id, event_type, message_type, content, direction")
    .eq("direction", "outgoing")
    .not("content", "is", null);

  console.log(`全outgoing: ${all.length}件\n`);

  // event_type × message_type の分布
  const dist = {};
  for (const msg of all) {
    const key = `${msg.event_type} / ${msg.message_type}`;
    if (!dist[key]) dist[key] = { count: 0, samples: [] };
    dist[key].count++;
    if (dist[key].samples.length < 3) {
      dist[key].samples.push(msg.content.substring(0, 80));
    }
  }

  console.log("=== event_type / message_type 分布 ===");
  for (const [key, val] of Object.entries(dist).sort((a, b) => b[1].count - a[1].count)) {
    console.log(`\n${key}: ${val.count}件`);
    for (const s of val.samples) {
      console.log(`  例: ${s}`);
    }
  }

  // 自動通知以外のユニークな返信パターンを見る
  const autoPatterns = [
    /【発送完了】/,
    /【予約確定】/,
    /【予約変更】/,
    /【予約キャンセル】/,
    /追跡番号:/,
    /診療のご予約がございます/,
  ];

  const manual = all.filter(msg => !autoPatterns.some(p => p.test(msg.content)));
  console.log(`\n\n=== 自動通知以外のoutgoing: ${manual.length}件 ===`);

  // ユニーク内容を確認
  const unique = new Map();
  for (const msg of manual) {
    const key = msg.content.substring(0, 50);
    if (!unique.has(key)) {
      unique.set(key, { content: msg.content, count: 1, eventType: msg.event_type, msgType: msg.message_type });
    } else {
      unique.get(key).count++;
    }
  }

  console.log(`ユニーク返信パターン: ${unique.size}件\n`);
  const sorted = [...unique.values()].sort((a, b) => b.count - a.count);
  for (let i = 0; i < Math.min(sorted.length, 30); i++) {
    const u = sorted[i];
    console.log(`[${u.count}回] (${u.eventType}/${u.msgType}) ${u.content.substring(0, 200)}`);
    console.log("");
  }
}

main().catch(console.error);
