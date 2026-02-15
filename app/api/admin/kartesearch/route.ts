// カルテ検索API（Supabase直接検索）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = resolveTenantId(req);

    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const searchType = req.nextUrl.searchParams.get("type") || "name";

    if (!q) return NextResponse.json({ ok: true, candidates: [] });

    let patientIds: string[] = [];

    if (searchType === "pid") {
      const { data } = await withTenant(
        supabaseAdmin
          .from("intake")
          .select("patient_id")
          .not("patient_id", "is", null)
          .ilike("patient_id", `%${q}%`)
          .order("id", { ascending: false })
          .limit(50),
        tenantId
      );
      patientIds = [...new Set((data || []).map(r => r.patient_id).filter(Boolean))].slice(0, 20);

    } else {
      // 氏名検索: answerers.name → フォールバックで intake.patient_name
      const normalizedQuery = q.replace(/[\s　]/g, "").toLowerCase();
      const searchPattern = `%${q.replace(/[\s　]/g, "%")}%`;

      const { data: answererHits } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name")
          .ilike("name", searchPattern)
          .limit(50),
        tenantId
      );

      const fromAnswerers = (answererHits || [])
        .filter(a => a.name && a.name.replace(/[\s　]/g, "").toLowerCase().includes(normalizedQuery))
        .map(a => a.patient_id)
        .filter(Boolean);

      patientIds = [...new Set([...fromAnswerers])].slice(0, 20);
    }

    if (patientIds.length === 0) {
      return NextResponse.json({ ok: true, candidates: [] });
    }

    // answerers から基本情報
    const { data: answererData } = await withTenant(
      supabaseAdmin
        .from("patients")
        .select("patient_id, name, tel, sex, birthday")
        .in("patient_id", patientIds),
      tenantId
    );

    const answererMap = new Map<string, { name: string; tel: string; sex: string; birthday: string }>();
    for (const a of answererData || []) {
      answererMap.set(a.patient_id, { name: a.name || "", tel: a.tel || "", sex: a.sex || "", birthday: a.birthday || "" });
    }

    // intake から最終問診日と件数
    const { data: intakeData } = await withTenant(
      supabaseAdmin
        .from("intake")
        .select("patient_id, created_at")
        .in("patient_id", patientIds)
        .order("id", { ascending: false }),
      tenantId
    );

    const intakeMap = new Map<string, { lastAt: string; count: number }>();
    for (const row of intakeData || []) {
      if (!row.patient_id) continue;
      const existing = intakeMap.get(row.patient_id);
      if (existing) {
        existing.count++;
      } else {
        intakeMap.set(row.patient_id, { lastAt: row.created_at || "", count: 1 });
      }
    }

    const candidates = patientIds.map(pid => {
      const a = answererMap.get(pid);
      const i = intakeMap.get(pid);
      return {
        patientId: pid,
        name: a?.name || "",
        phone: a?.tel || "",
        sex: a?.sex || "",
        birth: a?.birthday || "",
        lastSubmittedAt: i?.lastAt || "",
        intakeCount: i?.count || 0,
      };
    }).filter(c => c.name);

    return NextResponse.json({ ok: true, candidates });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message: "server_error", detail: msg }, { status: 500 });
  }
}
