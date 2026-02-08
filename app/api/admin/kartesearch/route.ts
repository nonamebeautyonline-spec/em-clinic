// カルテ検索API（Supabase直接検索）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const searchType = req.nextUrl.searchParams.get("type") || "name";

    if (!q) return NextResponse.json({ ok: true, candidates: [] });

    let patientIds: string[] = [];

    if (searchType === "pid") {
      const { data } = await supabaseAdmin
        .from("intake")
        .select("patient_id")
        .not("patient_id", "is", null)
        .ilike("patient_id", `%${q}%`)
        .order("id", { ascending: false })
        .limit(50);
      patientIds = [...new Set((data || []).map(r => r.patient_id).filter(Boolean))].slice(0, 20);

    } else if (searchType === "tel") {
      const digits = q.replace(/[^\d]/g, "");
      if (digits.length >= 3) {
        const { data } = await supabaseAdmin
          .from("answerers")
          .select("patient_id")
          .ilike("tel", `%${digits}%`)
          .limit(20);
        patientIds = [...new Set((data || []).map(r => r.patient_id).filter(Boolean))];
      }

    } else {
      // 氏名検索: answerers.name → フォールバックで intake.patient_name
      const normalizedQuery = q.replace(/[\s　]/g, "").toLowerCase();
      const searchPattern = `%${q.replace(/[\s　]/g, "%")}%`;

      const { data: answererHits } = await supabaseAdmin
        .from("answerers")
        .select("patient_id, name")
        .ilike("name", searchPattern)
        .limit(50);

      const fromAnswerers = (answererHits || [])
        .filter(a => a.name && a.name.replace(/[\s　]/g, "").toLowerCase().includes(normalizedQuery))
        .map(a => a.patient_id)
        .filter(Boolean);

      const { data: intakeHits } = await supabaseAdmin
        .from("intake")
        .select("patient_id, patient_name")
        .not("patient_id", "is", null)
        .ilike("patient_name", searchPattern)
        .order("id", { ascending: false })
        .limit(50);

      const fromIntake = (intakeHits || [])
        .filter(i => i.patient_name && i.patient_name.replace(/[\s　]/g, "").toLowerCase().includes(normalizedQuery))
        .map(i => i.patient_id)
        .filter(Boolean);

      patientIds = [...new Set([...fromAnswerers, ...fromIntake])].slice(0, 20);
    }

    if (patientIds.length === 0) {
      return NextResponse.json({ ok: true, candidates: [] });
    }

    // answerers から基本情報
    const { data: answererData } = await supabaseAdmin
      .from("answerers")
      .select("patient_id, name, tel, sex, birthday")
      .in("patient_id", patientIds);

    const answererMap = new Map<string, { name: string; tel: string; sex: string; birthday: string }>();
    for (const a of answererData || []) {
      answererMap.set(a.patient_id, { name: a.name || "", tel: a.tel || "", sex: a.sex || "", birthday: a.birthday || "" });
    }

    // intake から最終問診日と件数
    const { data: intakeData } = await supabaseAdmin
      .from("intake")
      .select("patient_id, patient_name, created_at")
      .in("patient_id", patientIds)
      .order("id", { ascending: false });

    const intakeMap = new Map<string, { name: string; lastAt: string; count: number }>();
    for (const row of intakeData || []) {
      if (!row.patient_id) continue;
      const existing = intakeMap.get(row.patient_id);
      if (existing) {
        existing.count++;
      } else {
        intakeMap.set(row.patient_id, { name: row.patient_name || "", lastAt: row.created_at || "", count: 1 });
      }
    }

    const candidates = patientIds.map(pid => {
      const a = answererMap.get(pid);
      const i = intakeMap.get(pid);
      return {
        patientId: pid,
        name: a?.name || i?.name || "",
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
