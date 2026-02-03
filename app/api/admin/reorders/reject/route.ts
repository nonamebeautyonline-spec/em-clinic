import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const GAS_REORDER_URL = process.env.GAS_REORDER_URL;

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!GAS_REORDER_URL) {
      return NextResponse.json(
        { error: "GAS_REORDER_URL is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { id, patient_id } = body; // patient_idも受け取る

    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // ★ GASで却下（既存処理）
    const gasRes = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reject",
        id: id,
      }),
      cache: "no-store",
    });

    const gasText = await gasRes.text().catch(() => "");
    let gasJson: any = {};
    try {
      gasJson = gasText ? JSON.parse(gasText) : {};
    } catch {
      gasJson = {};
    }

    if (!gasRes.ok || gasJson.ok === false) {
      console.error("GAS reorder reject error:", gasJson.error || gasRes.status);
      return NextResponse.json(
        { error: gasJson.error || "GAS error" },
        { status: 500 }
      );
    }

    // ★ Supabaseも更新（gas_row_numberでマッチング + patient_idも条件に追加）
    try {
      let query = supabaseAdmin
        .from("reorders")
        .update({
          status: "rejected",
          rejected_at: new Date().toISOString(),
        })
        .eq("gas_row_number", Number(id));

      // patient_idがあれば追加条件として使用（安全性向上）
      if (patient_id) {
        query = query.eq("patient_id", patient_id);
      }

      const { error: dbError } = await query;

      if (dbError) {
        console.error("[admin/reorders/reject] Supabase update error:", dbError);
      } else {
        console.log(`[admin/reorders/reject] Supabase update success, row=${id}`);
      }
    } catch (dbErr) {
      console.error("[admin/reorders/reject] Supabase exception:", dbErr);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
