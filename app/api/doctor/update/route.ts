import { NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";
import { createClient } from "@supabase/supabase-js";

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL as string;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function fail(code: string, status: number = 500) {
  return NextResponse.json({ ok: false, code }, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const res = await fetch(GAS_INTAKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "doctor_update", ...body }),
    });

    const text = await res.text().catch(() => "");
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      console.error("[doctor/update] GAS response is not JSON:", text);
      return fail("GAS_NON_JSON", 500);
    }

    console.log("[doctor/update] GAS response:", json);

    if (!res.ok || json?.ok !== true) {
      console.error("[doctor/update] GAS error:", { status: res.status, json });
      return fail("GAS_ERROR", 500);
    }

    // ★ GASから返されたpatient_idでキャッシュを無効化（多層防御）
    // GAS側でも無効化しているが、ネットワークエラー等で失敗する可能性があるため
    const patientId = json.patientId;
    if (patientId) {
      try {
        await invalidateDashboardCache(patientId);
        console.log(`[doctor/update] Cache invalidated for patient_id=${patientId}`);
      } catch (cacheError) {
        console.error("[doctor/update] Failed to invalidate cache:", cacheError);
      }
    } else {
      // ★ Fallback: GASのレスポンスにpatient_idがない場合はSupabaseから取得
      console.warn("[doctor/update] No patient_id in GAS response, querying Supabase");
      if (body.reserveId) {
        try {
          const { data } = await supabase
            .from("intake")
            .select("patient_id")
            .eq("reserve_id", body.reserveId)
            .single();

          if (data?.patient_id) {
            await invalidateDashboardCache(data.patient_id);
            console.log(`[doctor/update] Cache invalidated (fallback) for patient_id=${data.patient_id}`);
          }
        } catch (fallbackError) {
          console.error("[doctor/update] Fallback cache invalidation failed:", fallbackError);
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    console.error("doctor_update error");
    return fail("INTERNAL_ERROR", 500);
  }
}
