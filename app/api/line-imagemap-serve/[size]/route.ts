import { NextRequest, NextResponse } from "next/server";

/**
 * LINE Imagemap 画像サーブ用の公開エンドポイント
 *
 * LINE は imagemap メッセージの baseUrl に /{size} を付けて画像を取得する。
 * 例: GET /api/line-imagemap-serve/1040?url=https%3A%2F%2F...
 *
 * このルートは url パラメータで指定された画像をプロキシして返す。
 * 認証不要（LINE のサーバーからアクセスされるため）。
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const imageUrl = req.nextUrl.searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // size は 240, 300, 460, 700, 1040 のいずれか
  const validSizes = ["240", "300", "460", "700", "1040"];
  if (!validSizes.includes(size)) {
    return new NextResponse("Invalid size", { status: 400 });
  }

  try {
    // 元画像をフェッチ（Supabase Storage等のHTTPS URL）
    const res = await fetch(imageUrl, {
      headers: { Accept: "image/*" },
    });

    if (!res.ok) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await res.arrayBuffer();

    // そのまま返す（LINE クライアント側でリサイズされる）
    // 本番環境ではsharp等でリサイズすることを推奨
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch image", { status: 500 });
  }
}
