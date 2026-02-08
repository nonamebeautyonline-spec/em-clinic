import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// 回答一覧取得
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format"); // "csv" でCSV出力

  // フォーム情報
  const { data: form } = await supabaseAdmin
    .from("forms")
    .select("id, name, fields")
    .eq("id", parseInt(id))
    .single();

  if (!form) return NextResponse.json({ error: "フォームが見つかりません" }, { status: 404 });

  // 回答一覧（1000行制限回避のためページネーション）
  const allResponses: any[] = [];
  let offset = 0;
  const pageSize = 5000;
  for (;;) {
    const { data: page, error: pageError } = await supabaseAdmin
      .from("form_responses")
      .select("*")
      .eq("form_id", parseInt(id))
      .order("submitted_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (pageError) return NextResponse.json({ error: pageError.message }, { status: 500 });
    if (!page || page.length === 0) break;
    allResponses.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  const responses = allResponses;

  // CSV出力
  if (format === "csv") {
    const fields = (form.fields || []) as Array<{ id: string; label: string; type: string }>;
    const inputFields = fields.filter(f => f.type !== "heading_sm" && f.type !== "heading_md");

    const headers = ["回答ID", "回答日時", "LINE User ID", "回答者名", ...inputFields.map(f => f.label)];
    const rows = (responses || []).map(r => {
      const answers = (r.answers || {}) as Record<string, unknown>;
      return [
        r.id,
        r.submitted_at,
        r.line_user_id || "",
        r.respondent_name || "",
        ...inputFields.map(f => {
          const v = answers[f.id];
          if (Array.isArray(v)) return v.join(", ");
          if (v && typeof v === "object" && "name" in (v as Record<string, unknown>)) return (v as { name: string }).name;
          return v ?? "";
        }),
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const bom = "\uFEFF";
    return new NextResponse(bom + csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="form_${id}_responses.csv"`,
      },
    });
  }

  return NextResponse.json({ responses: responses || [], form });
}
