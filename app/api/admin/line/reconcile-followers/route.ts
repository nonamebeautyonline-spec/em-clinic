// app/api/admin/line/reconcile-followers/route.ts
// LINE フォロワーID一覧APIでDBに未登録のフォロワーを一括補完する復旧用エンドポイント
// 使い方: GET /api/admin/line/reconcile-followers
//
// 処理内容:
// 1. LINE Get Follower IDs API で全フォロワーのuser IDを取得
// 2. patients テーブルの line_id と突合
// 3. 未登録者は患者+intake レコードを自動作成
// 4. friend_summaries にフォローイベントを追加
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // フォロワー5000+なのでタイムアウト延長

// LINE フォロワーID一覧取得（ページネーション対応）
async function getAllFollowerIds(token: string): Promise<string[]> {
  const allIds: string[] = [];
  let next: string | undefined;

  do {
    const url = next
      ? `https://api.line.me/v2/bot/followers/ids?start=${next}`
      : "https://api.line.me/v2/bot/followers/ids";

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LINE API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (data.userIds && Array.isArray(data.userIds)) {
      allIds.push(...data.userIds);
    }
    next = data.next || undefined;
  } while (next);

  return allIds;
}

// LINEプロフィール取得
async function getLineProfile(lineUid: string, token: string) {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${lineUid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { displayName: "", pictureUrl: "" };
    const profile = await res.json();
    return {
      displayName: profile.displayName || "",
      pictureUrl: profile.pictureUrl || "",
    };
  } catch {
    return { displayName: "", pictureUrl: "" };
  }
}

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const lineToken = await getSettingOrEnv(
    "line", "channel_access_token",
    "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN",
    tenantId ?? undefined
  ) || "";

  if (!lineToken) {
    return NextResponse.json({ error: "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN not configured" }, { status: 500 });
  }

  // dryRun=true でDB変更なしのプレビューモード
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";

  console.log("[reconcile-followers] 開始: LINE フォロワーID一覧取得中...");

  // Step 1: LINE APIから全フォロワーID取得
  const followerIds = await getAllFollowerIds(lineToken);
  console.log(`[reconcile-followers] LINE フォロワー数: ${followerIds.length}`);

  // Step 2: DB上の全 line_id を取得
  const { data: existingPatients } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("line_id, patient_id"),
    tenantId
  );

  const existingLineIds = new Set(
    (existingPatients || [])
      .filter(p => p.line_id)
      .map(p => p.line_id as string)
  );

  // Step 3: DB未登録のフォロワーを特定
  const missingIds = followerIds.filter(id => !existingLineIds.has(id));
  console.log(`[reconcile-followers] DB未登録フォロワー: ${missingIds.length}人`);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      lineFollowers: followerIds.length,
      dbPatients: existingLineIds.size,
      missing: missingIds.length,
      missingIds: missingIds.slice(0, 50), // プレビュー用に先頭50件
    });
  }

  // Step 4: 未登録者を一括作成
  const results: { lineUid: string; patientId: string; displayName: string; status: string }[] = [];
  const now = new Date().toISOString();

  for (const lineUid of missingIds) {
    try {
      // LINEプロフィール取得
      const profile = await getLineProfile(lineUid, lineToken);
      const displayName = profile.displayName || `LINE_${lineUid.slice(-6)}`;
      const patientId = `LINE_${lineUid.slice(-8)}`;

      // RPC でアトミックに作成（webhook と同じロジック）
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
        "find_or_create_patient",
        {
          p_line_uid: lineUid,
          p_display_name: profile.displayName || null,
          p_picture_url: profile.pictureUrl || null,
          p_tenant_id: tenantId,
        }
      );

      let finalPatientId = patientId;

      if (!rpcError && rpcResult?.ok) {
        finalPatientId = rpcResult.patient_id;
        if (rpcResult.created) {
          results.push({ lineUid, patientId: finalPatientId, displayName, status: "created_rpc" });
        } else {
          results.push({ lineUid, patientId: finalPatientId, displayName, status: "existed_rpc" });
        }
      } else {
        // RPCフォールバック: 手動で作成
        const [{ error: intakeErr }, { error: patientsErr }] = await Promise.all([
          supabaseAdmin.from("intake").insert({
            ...tenantPayload(tenantId),
            patient_id: patientId,
          }),
          supabaseAdmin.from("patients").insert({
            ...tenantPayload(tenantId),
            patient_id: patientId,
            line_id: lineUid,
            line_display_name: profile.displayName || null,
            line_picture_url: profile.pictureUrl || null,
          }),
        ]);

        if (patientsErr?.code === "23505") {
          // UNIQUE違反 = 既存レコードあり
          results.push({ lineUid, patientId, displayName, status: "already_exists" });
        } else if (patientsErr) {
          results.push({ lineUid, patientId, displayName, status: `error: ${patientsErr.message}` });
          continue;
        } else {
          finalPatientId = patientId;
          results.push({ lineUid, patientId, displayName, status: "created_fallback" });
        }
      }

      // friend_summaries にフォローイベントを追加（左カラムに表示されるように）
      await supabaseAdmin
        .from("friend_summaries")
        .upsert(
          {
            patient_id: finalPatientId,
            tenant_id: tenantId,
            last_incoming_at: now,
            last_event_content: "友だち追加（復旧補完）",
            last_event_at: now,
            last_event_type: "follow",
          },
          { onConflict: "patient_id", ignoreDuplicates: false }
        );

      // message_log にもフォローイベントを記録
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tenantId),
        patient_id: finalPatientId,
        line_uid: lineUid,
        direction: "incoming",
        event_type: "follow",
        message_type: "event",
        content: "友だち追加（復旧補完）",
        status: "received",
      });

      // LINE APIレートリミット対策（100ms待機）
      await new Promise(r => setTimeout(r, 100));

    } catch (e) {
      results.push({
        lineUid,
        patientId: "",
        displayName: "",
        status: `exception: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  const created = results.filter(r => r.status.startsWith("created")).length;
  const existed = results.filter(r => r.status === "existed_rpc" || r.status === "already_exists").length;
  const errors = results.filter(r => r.status.startsWith("error") || r.status.startsWith("exception")).length;

  console.log(`[reconcile-followers] 完了: ${created} 新規作成, ${existed} 既存, ${errors} エラー`);

  return NextResponse.json({
    ok: true,
    lineFollowers: followerIds.length,
    dbPatientsBefore: existingLineIds.size,
    missing: missingIds.length,
    created,
    existed,
    errors,
    results,
  });
}
