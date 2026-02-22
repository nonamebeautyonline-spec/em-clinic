// Undo API — 操作の取り消し
// GET: 直近の取り消し可能な操作一覧
// POST: 取り消し実行
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { executeUndoSchema } from "@/lib/validations/undo";
import { getRecentUndoActions, executeUndo } from "@/lib/undo";

export const dynamic = "force-dynamic";

/** 直近の取り消し可能な操作一覧を取得 */
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    // クエリパラメータから件数上限を取得（デフォルト20件）
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 100) : 20;

    const actions = await getRecentUndoActions(tenantId, limit);

    return NextResponse.json({ ok: true, actions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** 取り消し実行 */
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseBody(req, executeUndoSchema);
    if ("error" in parsed) return parsed.error;
    const { undo_id } = parsed.data;

    const tenantId = resolveTenantId(req);

    const result = await executeUndo(undo_id, tenantId);

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
