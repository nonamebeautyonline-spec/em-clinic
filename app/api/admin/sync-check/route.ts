// app/api/admin/sync-check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const GAS_INTAKE_URL = process.env.GAS_INTAKE_LIST_URL as string;
const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL as string;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN as string;

export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const checkType = searchParams.get("type") || "intake"; // "intake" or "reservations"
    const date = searchParams.get("date"); // 特定日付のみチェック（オプション）

    if (checkType === "intake") {
      return await checkIntakeSyncStatus(date);
    } else if (checkType === "reservations") {
      return await checkReservationsSyncStatus(date);
    } else {
      return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
    }
  } catch (err) {
    console.error("[sync-check] Error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

async function checkIntakeSyncStatus(targetDate: string | null) {
  // 1. GASから取得
  const gasResponse = await fetch(GAS_INTAKE_URL, { method: "GET" });
  const gasData = await gasResponse.json();
  const gasRows = gasData.ok ? gasData.rows : gasData;

  // 2. Supabaseから取得
  let query = supabase.from("intake").select("patient_id, patient_name, answerer_id, reserve_id, reserved_date");

  if (targetDate) {
    query = query.eq("reserved_date", targetDate);
  }

  const { data: supabaseRows, error } = await query;

  if (error) {
    console.error("[Supabase] Query error:", error);
    return NextResponse.json({ ok: false, error: "supabase_error" }, { status: 500 });
  }

  // 3. 差分チェック
  const gasByPid = new Map();
  gasRows.forEach((row: any) => {
    const pid = String(row.patient_id || "");
    if (pid) {
      gasByPid.set(pid, {
        patient_id: pid,
        patient_name: row.patient_name || row.name,
        answerer_id: row.answerer_id,
        reserve_id: row.reserveId || row.reserve_id,
        reserved_date: row.reserved_date,
      });
    }
  });

  const supabaseByPid = new Map();
  (supabaseRows || []).forEach((row: any) => {
    const pid = String(row.patient_id || "");
    if (pid) {
      supabaseByPid.set(pid, row);
    }
  });

  // 差分を検出
  const differences = [];
  const missingInSupabase = [];
  const missingInGas = [];

  // GASにあってSupabaseにないもの
  for (const [pid, gasRow] of gasByPid) {
    if (!supabaseByPid.has(pid)) {
      missingInSupabase.push({ patient_id: pid, ...gasRow });
    } else {
      const sbRow = supabaseByPid.get(pid);
      const diffs = [];

      if (gasRow.answerer_id !== sbRow.answerer_id) {
        diffs.push(`answerer_id: GAS="${gasRow.answerer_id}" vs SB="${sbRow.answerer_id}"`);
      }
      if (gasRow.reserve_id !== sbRow.reserve_id) {
        diffs.push(`reserve_id: GAS="${gasRow.reserve_id}" vs SB="${sbRow.reserve_id}"`);
      }
      if (gasRow.reserved_date !== sbRow.reserved_date) {
        diffs.push(`reserved_date: GAS="${gasRow.reserved_date}" vs SB="${sbRow.reserved_date}"`);
      }

      if (diffs.length > 0) {
        differences.push({ patient_id: pid, diffs });
      }
    }
  }

  // Supabaseにあっ てGASにないもの
  for (const [pid, sbRow] of supabaseByPid) {
    if (!gasByPid.has(pid)) {
      missingInGas.push({ patient_id: pid, ...sbRow });
    }
  }

  return NextResponse.json({
    ok: true,
    type: "intake",
    date: targetDate,
    summary: {
      gas_count: gasByPid.size,
      supabase_count: supabaseByPid.size,
      differences_count: differences.length,
      missing_in_supabase_count: missingInSupabase.length,
      missing_in_gas_count: missingInGas.length,
    },
    differences: differences.slice(0, 50), // 最大50件
    missing_in_supabase: missingInSupabase.slice(0, 20),
    missing_in_gas: missingInGas.slice(0, 20),
  });
}

async function checkReservationsSyncStatus(targetDate: string | null) {
  // 予約データの差分チェック（同様のロジック）
  return NextResponse.json({
    ok: true,
    type: "reservations",
    date: targetDate,
    summary: {
      gas_count: 0,
      supabase_count: 0,
      differences_count: 0,
    },
    message: "Not implemented yet",
  });
}
