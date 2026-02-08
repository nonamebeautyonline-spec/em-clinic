import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { createLineRichMenu, uploadRichMenuImage, setDefaultRichMenu } from "@/lib/line-richmenu";

// リッチメニュー一覧（各メニューの表示人数付き）
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("rich_menus")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // メニューごとの表示人数を計算
    // 1. LINE連携済み患者の総数
    const { count: totalLine } = await supabaseAdmin
      .from("intake")
      .select("patient_id", { count: "exact", head: true })
      .not("line_id", "is", null);

    // 2. 注文がある患者（処方後メニュー対象）のpatient_idを取得
    const orderPids = new Set<string>();
    let offset = 0;
    while (true) {
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("patient_id")
        .range(offset, offset + 4999);
      if (!orders || orders.length === 0) break;
      for (const o of orders) orderPids.add(o.patient_id);
      if (orders.length < 5000) break;
      offset += 5000;
    }

    // 3. 注文患者のうちLINE連携済みの人数
    let rxCount = 0;
    const pidArr = [...orderPids];
    for (let i = 0; i < pidArr.length; i += 100) {
      const chunk = pidArr.slice(i, i + 100);
      const { count } = await supabaseAdmin
        .from("intake")
        .select("patient_id", { count: "exact", head: true })
        .in("patient_id", chunk)
        .not("line_id", "is", null);
      rxCount += count || 0;
    }

    const total = totalLine || 0;
    const noRxCount = total - rxCount;

    // メニュー名に基づいてカウントをマッピング
    const menus = (data || []).map((menu: any) => {
      let user_count = 0;
      if (menu.name === "処方後") {
        user_count = rxCount;
      } else if (menu.name === "個人情報入力後") {
        user_count = noRxCount;
      } else if (menu.name === "個人情報入力前" || menu.selected) {
        user_count = total;
      }
      return { ...menu, user_count };
    });

    return NextResponse.json({ menus });
  } catch (e: any) {
    console.error("[Rich Menu GET] Unhandled error:", e?.message || e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

// リッチメニュー作成 + LINE API登録
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, chat_bar_text, selected, size_type, areas, image_url } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
    }

    // 1. DBに保存
    const { data, error } = await supabaseAdmin
      .from("rich_menus")
      .insert({
        name: name.trim(),
        chat_bar_text: chat_bar_text || "メニュー",
        selected: selected ?? false,
        size_type: size_type || "full",
        areas: areas || [],
        image_url: image_url || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 2. 画像がある場合、LINE API登録をバックグラウンドで実行
    if (image_url) {
      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "";
      after(async () => {
        try {
          const lineRichMenuId = await createLineRichMenu(data, origin);
          if (!lineRichMenuId) {
            console.error("[Rich Menu POST after] LINE menu create failed");
            return;
          }

          const imageOk = await uploadRichMenuImage(lineRichMenuId, image_url);
          if (!imageOk) {
            console.error("[Rich Menu POST after] Image upload failed");
            return;
          }

          await supabaseAdmin
            .from("rich_menus")
            .update({ line_rich_menu_id: lineRichMenuId, is_active: true })
            .eq("id", data.id);

          if (selected) {
            await setDefaultRichMenu(lineRichMenuId);
          }

          console.log("[Rich Menu POST after] LINE menu created:", lineRichMenuId);
        } catch (e) {
          console.error("[Rich Menu POST after] Error:", e);
        }
      });
    }

    return NextResponse.json({ menu: data });
  } catch (e: any) {
    console.error("[Rich Menu POST] Unhandled error:", e?.message || e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
