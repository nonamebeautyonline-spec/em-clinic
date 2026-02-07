import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const token = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN;

// LINEプロフィール取得
async function getLineProfile(lineUid) {
  if (!token) return null;
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 1. patient_id が null の message_log から一意な line_uid を取得
const { data: orphanLogs } = await sb
  .from("message_log")
  .select("line_uid")
  .is("patient_id", null)
  .not("line_uid", "is", null);

const uniqueUids = [...new Set(orphanLogs.map((r) => r.line_uid))];
console.log(`orphan line_uids: ${uniqueUids.length}件`);

for (const lineUid of uniqueUids) {
  // 既にintakeにあるか確認
  const { data: existing } = await sb
    .from("intake")
    .select("patient_id")
    .eq("line_id", lineUid)
    .maybeSingle();

  let patientId;
  if (existing) {
    patientId = existing.patient_id;
    console.log(`  ${lineUid} -> 既存 intake: ${patientId}`);
  } else {
    // LINEプロフィール取得してintake作成
    const profile = await getLineProfile(lineUid);
    const displayName = profile?.displayName || `LINE_${lineUid.slice(-6)}`;
    patientId = `LINE_${lineUid.slice(-8)}`;

    const { error } = await sb.from("intake").upsert(
      {
        patient_id: patientId,
        patient_name: displayName,
        line_id: lineUid,
        line_display_name: profile?.displayName || null,
        line_picture_url: profile?.pictureUrl || null,
      },
      { onConflict: "patient_id" }
    );

    if (error) {
      console.log(`  ${lineUid} -> intake作成エラー: ${error.message}`);
      continue;
    }
    console.log(`  ${lineUid} -> intake作成: ${patientId} (${displayName})`);
  }

  // message_log を更新
  const { count, error: updateError } = await sb
    .from("message_log")
    .update({ patient_id: patientId })
    .eq("line_uid", lineUid)
    .is("patient_id", null);

  if (updateError) {
    console.log(`    message_log更新エラー: ${updateError.message}`);
  } else {
    console.log(`    message_log更新: ${count ?? "?"}件`);
  }
}

// 確認
const { data: verify } = await sb
  .from("intake")
  .select("patient_id, patient_name, line_id")
  .like("patient_id", "LINE_%")
  .order("created_at", { ascending: false });

console.log("\n=== LINE_ prefix patients ===");
for (const p of verify) {
  console.log(`  ${p.patient_id} "${p.patient_name}" line_id=${p.line_id}`);
}

const { count: remainingOrphans } = await sb
  .from("message_log")
  .select("*", { count: "exact", head: true })
  .is("patient_id", null)
  .not("line_uid", "is", null);

console.log(`\norphan message_logs remaining: ${remainingOrphans}件`);
