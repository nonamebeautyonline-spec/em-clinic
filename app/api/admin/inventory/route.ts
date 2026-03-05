// app/api/admin/inventory/route.ts — 棚卸し記録 API
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getProducts } from "@/lib/products";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { getSetting } from "@/lib/settings";
import { parseBody } from "@/lib/validations/helpers";
import { inventorySchema } from "@/lib/validations/admin-operations";

const DEFAULT_LOCATIONS = ["本院"];

async function getLocations(tenantId?: string): Promise<string[]> {
  const raw = await getSetting("general", "inventory_locations", tenantId);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* パース失敗時はデフォルト */ }
  }
  return DEFAULT_LOCATIONS;
}

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (date) {
    let query = supabaseAdmin
      .from("inventory_logs")
      .select("id, product_id, item_key, section, location, logged_date, box_count, shipped_count, received_count, note")
      .eq("logged_date", date)
      .order("location");

    query = withTenant(query, tenantId);
    const { data: logs, error } = await query;
    if (error) {
      console.error("[inventory API] GET error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const products = await getProducts(tenantId ?? undefined);
    const locations = await getLocations(tenantId ?? undefined);

    // 最終更新日時を取得
    let lastUpdatedQuery = supabaseAdmin
      .from("inventory_logs")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);
    lastUpdatedQuery = withTenant(lastUpdatedQuery, tenantId);
    const { data: lastRow } = await lastUpdatedQuery;
    const lastUpdatedAt = lastRow?.[0]?.updated_at ?? null;

    // 前回の台帳データ（選択日より前の最新 logged_date）を取得
    let prevDateQuery = supabaseAdmin
      .from("inventory_logs")
      .select("logged_date")
      .lt("logged_date", date)
      .order("logged_date", { ascending: false })
      .limit(1);
    prevDateQuery = withTenant(prevDateQuery, tenantId);
    const { data: prevDateRow } = await prevDateQuery;
    const prevDate = prevDateRow?.[0]?.logged_date ?? null;

    let prevLogs: typeof logs = [];
    if (prevDate) {
      let prevLogsQuery = supabaseAdmin
        .from("inventory_logs")
        .select("id, product_id, item_key, section, location, logged_date, box_count, shipped_count, received_count, note")
        .eq("logged_date", prevDate)
        .order("location");
      prevLogsQuery = withTenant(prevLogsQuery, tenantId);
      const { data: prevData } = await prevLogsQuery;
      prevLogs = prevData ?? [];
    }

    return NextResponse.json({ logs: logs ?? [], products, locations, lastUpdatedAt, prevDate, prevLogs });
  }

  if (from && to) {
    let query = supabaseAdmin
      .from("inventory_logs")
      .select("item_key, section, location, logged_date, box_count, shipped_count, received_count")
      .gte("logged_date", from)
      .lte("logged_date", to)
      .order("logged_date", { ascending: false });

    query = withTenant(query, tenantId);
    const { data: logs, error } = await query;
    if (error) {
      console.error("[inventory API] GET history error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // シードデータ: 台帳データ（packaged.box_count > 0）のある最新日から from 前日までの全データ
    // ランニングバランスの起算点として台帳アンカー日が必要。直前1日だけでは
    // 台帳未入力日がシードになると期首在庫が0から始まり数値が崩壊する。
    let anchorQuery = supabaseAdmin
      .from("inventory_logs")
      .select("logged_date")
      .lt("logged_date", from)
      .eq("section", "packaged")
      .gt("box_count", 0)
      .order("logged_date", { ascending: false })
      .limit(1);
    anchorQuery = withTenant(anchorQuery, tenantId);
    const { data: anchorRow } = await anchorQuery;
    const anchorDate = anchorRow?.[0]?.logged_date ?? null;

    let seedLogs: typeof logs = [];
    if (anchorDate) {
      let seedLogsQuery = supabaseAdmin
        .from("inventory_logs")
        .select("item_key, section, location, logged_date, box_count, shipped_count, received_count")
        .gte("logged_date", anchorDate)
        .lt("logged_date", from);
      seedLogsQuery = withTenant(seedLogsQuery, tenantId);
      const { data: seedData } = await seedLogsQuery;
      seedLogs = seedData ?? [];
    }

    return NextResponse.json({ logs: logs ?? [], seedLogs });
  }

  return NextResponse.json({ error: "date または from/to パラメータが必要です" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, inventorySchema);
  if ("error" in parsed) return parsed.error;
  const { date, entries } = parsed.data;

  const rows = entries.map((e) => ({
    ...tenantPayload(tenantId),
    product_id: e.product_id || null,
    item_key: e.item_key,
    section: e.section || "packaged",
    location: e.location,
    logged_date: date,
    box_count: e.box_count ?? 0,
    shipped_count: e.shipped_count ?? 0,
    received_count: e.received_count ?? 0,
    note: e.note || null,
    updated_at: new Date().toISOString(),
  }));

  // delete+insert（upsert は NULL tenant_id で壊れるため）
  let delQuery = supabaseAdmin
    .from("inventory_logs")
    .delete()
    .eq("logged_date", date);
  delQuery = withTenant(delQuery, tenantId);
  const { error: delError } = await delQuery;
  if (delError) {
    console.error("[inventory API] DELETE error:", delError.message);
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from("inventory_logs")
    .insert(rows)
    .select();

  if (error) {
    console.error("[inventory API] INSERT error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: data?.length ?? 0 });
}
