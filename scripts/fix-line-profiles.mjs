// 既存患者のLINEプロフィール（アイコン・表示名）を一括取得・保存するスクリプト
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fzfkgemtaxsrocbucmza.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LINE_TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchAll(query) {
  const all = [];
  let offset = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await query().range(offset, offset + pageSize - 1);
    if (error) { console.error("fetchAll error:", error.message); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function main() {
  console.log("=== LINEプロフィール一括取得 ===\n");

  // line_idあり & line_picture_urlなしの患者を取得
  const patients = await fetchAll(() =>
    supabase.from("intake")
      .select("patient_id, line_id, line_picture_url")
      .not("line_id", "is", null)
      .is("line_picture_url", null)
  );

  console.log(`対象患者数: ${patients.length}\n`);

  let successCount = 0;
  let failCount = 0;
  let noPicCount = 0;

  // 5件ずつ並列処理
  for (let i = 0; i < patients.length; i += 5) {
    const batch = patients.slice(i, i + 5);
    await Promise.all(batch.map(async (p) => {
      try {
        const res = await fetch(`https://api.line.me/v2/bot/profile/${p.line_id}`, {
          headers: { Authorization: `Bearer ${LINE_TOKEN}` },
        });

        if (!res.ok) {
          failCount++;
          return;
        }

        const profile = await res.json();
        const displayName = profile.displayName || null;
        const pictureUrl = profile.pictureUrl || null;

        if (!pictureUrl && !displayName) {
          noPicCount++;
          return;
        }

        await supabase.from("intake").update({
          line_display_name: displayName,
          line_picture_url: pictureUrl,
        }).eq("patient_id", p.patient_id);

        successCount++;
      } catch {
        failCount++;
      }
    }));

    // 進捗表示（100件ごと）
    if ((i + 5) % 100 === 0 || i + 5 >= patients.length) {
      console.log(`  処理済み: ${Math.min(i + 5, patients.length)}/${patients.length} (成功: ${successCount}, 失敗: ${failCount})`);
    }
  }

  console.log(`\n=== 完了 ===`);
  console.log(`プロフィール更新: ${successCount}人`);
  console.log(`プロフィールなし: ${noPicCount}人`);
  console.log(`取得失敗（ブロック等）: ${failCount}人`);
}

main().catch(console.error);
