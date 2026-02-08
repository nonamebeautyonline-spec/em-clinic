// 既存患者の処方ずみタグ/個人情報提出ずみタグ + リッチメニュー一括修正スクリプト
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
  console.log("=== 自動タグ＋リッチメニュー一括修正 ===\n");

  // 1. タグ定義取得
  const { data: prescTag } = await supabase.from("tag_definitions").select("id, name").eq("name", "処方ずみ").maybeSingle();
  const { data: infoTag } = await supabase.from("tag_definitions").select("id, name").eq("name", "個人情報提出ずみ").maybeSingle();
  console.log("処方ずみタグ:", prescTag ? `id=${prescTag.id}` : "未定義");
  console.log("個人情報提出ずみタグ:", infoTag ? `id=${infoTag.id}` : "未定義");

  // 2. リッチメニュー取得
  const { data: prescMenu } = await supabase.from("rich_menus").select("line_rich_menu_id, name").eq("name", "処方後").maybeSingle();
  const { data: infoMenu } = await supabase.from("rich_menus").select("line_rich_menu_id, name").eq("name", "個人情報入力後").maybeSingle();
  console.log("処方後メニュー:", prescMenu?.line_rich_menu_id || "未定義");
  console.log("個人情報入力後メニュー:", infoMenu?.line_rich_menu_id || "未定義");
  console.log();

  // 3. データ取得
  const orders = await fetchAll(() => supabase.from("orders").select("patient_id").not("patient_id", "is", null));
  const orderPids = new Set(orders.map(o => o.patient_id));
  console.log(`ordersにある患者数: ${orderPids.size}`);

  const answerers = await fetchAll(() => supabase.from("answerers").select("patient_id, name").not("name", "is", null));
  const answererPids = new Set(answerers.filter(a => a.name?.trim()).map(a => a.patient_id));
  console.log(`answerers(名前あり)の患者数: ${answererPids.size}`);

  const existingTags = await fetchAll(() => supabase.from("patient_tags").select("patient_id, tag_id"));
  const existingTagMap = new Map();
  for (const t of existingTags) {
    if (!existingTagMap.has(t.patient_id)) existingTagMap.set(t.patient_id, new Set());
    existingTagMap.get(t.patient_id).add(t.tag_id);
  }

  const intakes = await fetchAll(() => supabase.from("intake").select("patient_id, line_id").not("line_id", "is", null));
  const lineIdMap = new Map();
  for (const i of intakes) {
    if (i.line_id && !lineIdMap.has(i.patient_id)) lineIdMap.set(i.patient_id, i.line_id);
  }
  console.log(`LINE連携済み患者数: ${lineIdMap.size}\n`);

  // 4. 処方ずみタグ付与
  let prescTagCount = 0;
  if (prescTag) {
    const needsPresc = [...orderPids].filter(pid => !pid.startsWith("LINE_") && !(existingTagMap.get(pid)?.has(prescTag.id)));
    if (needsPresc.length > 0) {
      const rows = needsPresc.map(pid => ({ patient_id: pid, tag_id: prescTag.id, assigned_by: "auto_order" }));
      const { error } = await supabase.from("patient_tags").upsert(rows, { onConflict: "patient_id,tag_id" });
      if (error) console.error("処方ずみタグ付与エラー:", error.message);
      else {
        prescTagCount = needsPresc.length;
        console.log(`✅ 処方ずみタグ付与: ${needsPresc.length}人`);
        needsPresc.forEach(pid => console.log(`   ${pid}`));
      }
    } else {
      console.log("処方ずみタグ: 全員付与済み");
    }
  }

  // 5. 個人情報提出ずみタグ付与（ordersなし & answerers.nameあり）
  let infoTagCount = 0;
  if (infoTag) {
    const needsInfo = [...answererPids].filter(pid =>
      !pid.startsWith("LINE_") && !orderPids.has(pid) && !(existingTagMap.get(pid)?.has(infoTag.id))
    );
    if (needsInfo.length > 0) {
      const rows = needsInfo.map(pid => ({ patient_id: pid, tag_id: infoTag.id, assigned_by: "auto" }));
      const { error } = await supabase.from("patient_tags").upsert(rows, { onConflict: "patient_id,tag_id" });
      if (error) console.error("個人情報提出ずみタグ付与エラー:", error.message);
      else {
        infoTagCount = needsInfo.length;
        console.log(`✅ 個人情報提出ずみタグ付与: ${needsInfo.length}人`);
        needsInfo.forEach(pid => console.log(`   ${pid}`));
      }
    } else {
      console.log("個人情報提出ずみタグ: 全員付与済み");
    }
  }

  // 6. リッチメニュー切り替え（タグベースで対象を決定）
  console.log("\n--- リッチメニュー切り替え ---");
  let menuSwitchCount = 0;

  // 処方ずみタグ付き患者 → 処方後メニュー
  // 個人情報提出ずみタグ付き & orderなし → 個人情報入力後メニュー
  const prescTaggedPids = new Set();
  const infoTaggedPids = new Set();
  for (const t of existingTags) {
    if (prescTag && t.tag_id === prescTag.id) prescTaggedPids.add(t.patient_id);
    if (infoTag && t.tag_id === infoTag.id) infoTaggedPids.add(t.patient_id);
  }
  // 新規付与分も含める
  if (prescTag) {
    for (const pid of orderPids) { if (!pid.startsWith("LINE_")) prescTaggedPids.add(pid); }
  }

  const allTargets = [...new Set([...prescTaggedPids, ...infoTaggedPids])].filter(pid =>
    !pid.startsWith("LINE_") && lineIdMap.has(pid)
  );
  console.log(`対象患者(LINE連携済み): ${allTargets.length}人\n`);

  // 5件ずつ並列処理
  for (let i = 0; i < allTargets.length; i += 5) {
    const batch = allTargets.slice(i, i + 5);
    await Promise.all(batch.map(async (pid) => {
      const lineId = lineIdMap.get(pid);
      if (!lineId) return;

      const targetMenuId = prescTaggedPids.has(pid) ? prescMenu?.line_rich_menu_id : infoMenu?.line_rich_menu_id;
      const targetMenuName = prescTaggedPids.has(pid) ? "処方後" : "個人情報入力後";
      if (!targetMenuId) return;

      try {
        const currentRes = await fetch(`https://api.line.me/v2/bot/user/${lineId}/richmenu`, {
          headers: { Authorization: `Bearer ${LINE_TOKEN}` },
        });
        const current = currentRes.ok ? await currentRes.json() : null;

        if (current?.richMenuId !== targetMenuId) {
          const assignRes = await fetch(`https://api.line.me/v2/bot/user/${lineId}/richmenu/${targetMenuId}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${LINE_TOKEN}` },
          });
          if (assignRes.ok) {
            menuSwitchCount++;
            console.log(`✅ ${pid} → ${targetMenuName} (was: ${current?.richMenuId?.slice(-8) || "none"})`);
          } else {
            console.log(`❌ ${pid} → ${targetMenuName} failed: ${assignRes.status}`);
          }
        }
      } catch (err) {
        console.error(`❌ ${pid} error:`, err.message);
      }
    }));
  }

  console.log(`\n=== 完了 ===`);
  console.log(`処方ずみタグ新規付与: ${prescTagCount}人`);
  console.log(`個人情報提出ずみタグ新規付与: ${infoTagCount}人`);
  console.log(`リッチメニュー切り替え: ${menuSwitchCount}人`);
}

main().catch(console.error);
