// app/api/square/backfill/route.ts
// ★ GAS連携撤去済み: このAPIはGASへの決済データ転送が主目的だったため、現在は不要
// 必要に応じて Supabase orders テーブルのバックフィル用に書き換え可能
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "このAPIはGAS連携廃止に伴い無効化されました" },
    { status: 410 }
  );
}
