// カルテ一覧API（ページネーション付き）
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

    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "100")));
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
      const { data: answererHits } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name")
          .ilike("name", searchPattern)
          .limit(100),
        tenantId
      );

      const fromAnswerers = (answererHits || [])
        .filter(a => a.name && a.name.replace(/[\s　]/g, "").toLowerCase().includes(normalizedQuery))
        .map(a => a.patient_id)
        .filter(Boolean);

      // patient_id 直接検索
      const { data: pidHits } = await withTenant(
        supabaseAdmin
          .from("intake")
          .select("patient_id")
          .not("patient_id", "is", null)
          .ilike("patient_id", `%${q}%`)
          .limit(100),
        tenantId
      );

      const fromPid = (pidHits || []).map(p => p.patient_id).filter(Boolean);

      filterPatientIds = [...new Set([...fromAnswerers, ...fromPid])];

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
      // その日の予約患者を表示（reservationsからpatient_idを取得）
      const { data: dateResvCount } = await withTenant(
        supabaseAdmin
          .from("reservations")
          .select("patient_id")
          .eq("reserved_date", date),
        tenantId
      );
      const datePidsCount = [...new Set((dateResvCount || []).map(r => r.patient_id).filter(Boolean))];
      if (datePidsCount.length > 0) {
        countQuery = countQuery.in("patient_id", datePidsCount);
      } else {
        return NextResponse.json({ ok: true, items: [], total: 0, page, limit });
      }
    }
    const { count } = await withTenant(countQuery, tenantId);
    const total = count || 0;

    // ページネーション取得
    let dataQuery = supabaseAdmin
      .from("intake")
      .select("id, patient_id, reserve_id, created_at, updated_at, status, note")
      .not("patient_id", "is", null)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (filterPatientIds) {
      dataQuery = dataQuery.in("patient_id", filterPatientIds);
    }
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // 日付フィルタはreservationsテーブルの予約に基づくため、対象patient_idを先に取得
      const { data: dateResv } = await withTenant(
        supabaseAdmin
          .from("reservations")
          .select("patient_id")
          .eq("reserved_date", date),
        tenantId
      );
      const datePids = [...new Set((dateResv || []).map(r => r.patient_id).filter(Boolean))];
      if (datePids.length === 0) {
        return NextResponse.json({ ok: true, items: [], total: 0, page, limit });
      }
      dataQuery = dataQuery.in("patient_id", datePids);
    }
    const { data: intakes, error: dataError } = await withTenant(dataQuery, tenantId);

    if (dataError) {
      return NextResponse.json({ ok: false, message: dataError.message }, { status: 500 });
    }

    // patients から追加情報取得（patient_name, line_id, tel, sex, birthday）
    const patientIds = [...new Set((intakes || []).map(i => i.patient_id).filter(Boolean))];
    const answererMap = new Map<string, { name: string; tel: string; sex: string; birthday: string }>();

    if (patientIds.length > 0) {
      const { data: answerers } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name, tel, sex, birthday")
          .in("patient_id", patientIds),
        tenantId
      );

      for (const a of answerers || []) {
        answererMap.set(a.patient_id, {
          name: a.name || "",
          tel: a.tel || "",
          sex: a.sex || "",
          birthday: a.birthday || "",
        });
      }
    }

    // reservationsから reserved_date, reserved_time, prescription_menu を取得
    const reserveIds = (intakes || []).map(i => i.reserve_id).filter(Boolean);
    const resvMap = new Map<string, { reserved_date: string; reserved_time: string; prescription_menu: string }>();
    if (reserveIds.length > 0) {
      const { data: resvData } = await withTenant(
        supabaseAdmin
          .from("reservations")
          .select("reserve_id, reserved_date, reserved_time, prescription_menu")
          .in("reserve_id", reserveIds),
        tenantId
      );
      for (const r of resvData || []) {
        if (r.reserve_id && !resvMap.has(r.reserve_id)) {
          resvMap.set(r.reserve_id, {
            reserved_date: r.reserved_date || "",
            reserved_time: r.reserved_time || "",
            prescription_menu: r.prescription_menu || "",
          });
        }
      }
    }

    const items = (intakes || []).map(row => {
      const a = answererMap.get(row.patient_id);
      const resv = resvMap.get(row.reserve_id);
      return {
        id: row.id,
        patientId: row.patient_id || "",
        patientName: a?.name || "",
        tel: a?.tel || "",
        sex: a?.sex || "",
        birthday: a?.birthday || "",
        reservedDate: resv?.reserved_date || "",
        reservedTime: resv?.reserved_time || "",
        createdAt: row.created_at || "",
        updatedAt: row.updated_at || "",
        status: row.status || null,
        prescriptionMenu: resv?.prescription_menu || "",
        hasNote: !!row.note,
      };
    });

    // 予約日時の降順（新しい予約が上）でソート
    items.sort((a, b) => {
      const dateA = a.reservedDate || "0000-00-00";
      const dateB = b.reservedDate || "0000-00-00";
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = a.reservedTime || "00:00";
      const timeB = b.reservedTime || "00:00";
      return timeA.localeCompare(timeB);
    });

    return NextResponse.json({ ok: true, items, total, page, limit });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message: "server_error", detail: msg }, { status: 500 });
  }
}
