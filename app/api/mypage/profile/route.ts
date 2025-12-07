// app/api/mypage/profile/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  // サーバー側の cookie ストアを取得（Promise なので await）
  const cookieStore = await cookies();

  // 初回登録でセットしている想定の cookie
  const patientId = cookieStore.get("patient_id")?.value;
  const name      = cookieStore.get("patient_name")?.value;

  if (!patientId || !name) {
    // cookie が揃っていなければ「未連携」とみなして 401 を返す
    return NextResponse.json(
      { ok: false, message: "not_linked" },
      { status: 401 }
    );
  }

  // 正常時は pid と名前を返す
  return NextResponse.json({
    ok: true,
    patientId,
    name,
  });
}
