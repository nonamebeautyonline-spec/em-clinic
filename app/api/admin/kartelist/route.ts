// カルテ一覧API（ページネーション付き）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "10")));
    const q = (req.nextUrl.searchParams.get("q") || "").trim();
    const date = req.nextUrl.searchParams.get("date"); // YYYY-MM-DD: その日に更新されたカルテのみ

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 検索クエリがある場合、まず対象patient_idを特定
    let filterPatientIds: string[] | null = null;
    if (q) {
      const searchPattern = `%${q.replace(/[\s　]/g, "%")}%`;
      const normalizedQuery = q.replace(/[\s　]/g, "").toLowerCase();

      // answerers.name で検索
      const { data: answererHits } = await supabaseAdmin
        .from("answerers")
        .select("patient_id, name")
        .ilike("name", searchPattern)
        .limit(100);

      const fromAnswerers = (answererHits || [])
        .filter(a => a.name && a.name.replace(/[\s　]/g, "").toLowerCase().includes(normalizedQuery))
        .map(a => a.patient_id)
        .filter(Boolean);

      // intake.patient_name で検索
      const { data: intakeHits } = await supabaseAdmin
        .from("intake")
        .select("patient_id, patient_name")
        .not("patient_id", "is", null)
        .ilike("patient_name", searchPattern)
        .limit(100);

      const fromIntake = (intakeHits || [])
        .filter(i => i.patient_name && i.patient_name.replace(/[\s　]/g, "").toLowerCase().includes(normalizedQuery))
        .map(i => i.patient_id)
        .filter(Boolean);

      // patient_id 直接検索
      const { data: pidHits } = await supabaseAdmin
        .from("intake")
        .select("patient_id")
        .not("patient_id", "is", null)
        .ilike("patient_id", `%${q}%`)
        .limit(100);

      const fromPid = (pidHits || []).map(p => p.patient_id).filter(Boolean);

      filterPatientIds = [...new Set([...fromAnswerers, ...fromIntake, ...fromPid])];

      if (filterPatientIds.length === 0) {
        return NextResponse.json({ ok: true, items: [], total: 0, page, limit });
      }
    }

    // トータル件数
    let countQuery = supabaseAdmin
      .from("intake")
      .select("id", { count: "exact", head: true })
      .not("patient_id", "is", null);
    if (filterPatientIds) {
      countQuery = countQuery.in("patient_id", filterPatientIds);
    }
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // その日の予約患者を表示（Drがこれから入力するため入力済み条件は不要）
      countQuery = countQuery.eq("reserved_date", date);
    }
    const { count } = await countQuery;
    const total = count || 0;

    // ページネーション取得
    let dataQuery = supabaseAdmin
      .from("intake")
      .select("id, patient_id, patient_name, reserved_date, reserved_time, created_at, updated_at, status, prescription_menu, note")
      .not("patient_id", "is", null)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (filterPatientIds) {
      dataQuery = dataQuery.in("patient_id", filterPatientIds);
    }
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      dataQuery = dataQuery.eq("reserved_date", date);
    }
    const { data: intakes, error: dataError } = await dataQuery;

    if (dataError) {
      return NextResponse.json({ ok: false, message: dataError.message }, { status: 500 });
    }

    // answerers から追加情報取得
    const patientIds = [...new Set((intakes || []).map(i => i.patient_id).filter(Boolean))];
    const answererMap = new Map<string, { name: string; tel: string; sex: string; birthday: string }>();

    if (patientIds.length > 0) {
      const { data: answerers } = await supabaseAdmin
        .from("answerers")
        .select("patient_id, name, tel, sex, birthday")
        .in("patient_id", patientIds);

      for (const a of answerers || []) {
        answererMap.set(a.patient_id, {
          name: a.name || "",
          tel: a.tel || "",
          sex: a.sex || "",
          birthday: a.birthday || "",
        });
      }
    }

    const items = (intakes || []).map(row => {
      const a = answererMap.get(row.patient_id);
      return {
        id: row.id,
        patientId: row.patient_id || "",
        patientName: a?.name || row.patient_name || "",
        tel: a?.tel || "",
        sex: a?.sex || "",
        birthday: a?.birthday || "",
        reservedDate: row.reserved_date || "",
        reservedTime: row.reserved_time || "",
        createdAt: row.created_at || "",
        updatedAt: row.updated_at || "",
        status: row.status || null,
        prescriptionMenu: row.prescription_menu || "",
        hasNote: !!row.note,
      };
    });

    return NextResponse.json({ ok: true, items, total, page, limit });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message: "server_error", detail: msg }, { status: 500 });
  }
}
