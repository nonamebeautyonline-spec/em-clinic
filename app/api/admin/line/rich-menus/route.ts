import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { createLineRichMenu, uploadRichMenuImage, setDefaultRichMenu } from "@/lib/line-richmenu";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { createRichMenuSchema } from "@/lib/validations/line-common";
import { getSettingOrEnv } from "@/lib/settings";

// リッチメニュー一覧（各メニューの表示人数付き）
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req);
    const simple = req.nextUrl.searchParams.get("simple") === "true";

    const { data, error } = await strictWithTenant(
      supabaseAdmin.from("rich_menus").select("*").order("created_at", { ascending: false }),
      tenantId
    );

    if (error) return serverError(error.message);

    // simple=true: id/name/is_active のみ返す（メニュー自動切替ページ等の軽量取得用）
    if (simple) {
      const menus = (data || []).map((m: { id: number; name: string; is_active: boolean }) => ({ id: m.id, name: m.name, is_active: m.is_active }));
      return NextResponse.json({ menus });
    }

    // メニューごとの表示人数を計算
    // 1. LINE連携済み患者数2種（並列）
    const [registeredRes, allLineRes] = await Promise.all([
      strictWithTenant(
        supabaseAdmin.from("patients").select("patient_id", { count: "exact", head: true })
          .not("line_id", "is", null).not("patient_id", "like", "LINE_%"),
        tenantId
      ),
      strictWithTenant(
        supabaseAdmin.from("patients").select("patient_id", { count: "exact", head: true })
          .not("line_id", "is", null),
        tenantId
      ),
    ]);
    const registeredCount = registeredRes.count || 0;
    const allLineCount = allLineRes.count || 0;

    // 2. 注文がある患者のpatient_idを取得（ページネーション）
    const orderPids = new Set<string>();
    let offset = 0;
    while (true) {
      const { data: orders } = await strictWithTenant(
        supabaseAdmin.from("orders").select("patient_id").range(offset, offset + 4999),
        tenantId
      );
      if (!orders || orders.length === 0) break;
      for (const o of orders) orderPids.add(o.patient_id);
      if (orders.length < 5000) break;
      offset += 5000;
    }

    // 3. 注文患者のうちLINE連携済みの人数（並列チャンクで高速化）
    let rxCount = 0;
    const pidArr = [...orderPids];
    if (pidArr.length > 0) {
      const CHUNK = 500;
      const chunks: string[][] = [];
      for (let i = 0; i < pidArr.length; i += CHUNK) {
        chunks.push(pidArr.slice(i, i + CHUNK));
      }
      const chunkResults = await Promise.all(
        chunks.map(chunk =>
          strictWithTenant(
            supabaseAdmin.from("patients").select("patient_id", { count: "exact", head: true })
              .in("patient_id", chunk).not("line_id", "is", null),
            tenantId
          )
        )
      );
      for (const r of chunkResults) rxCount += r.count || 0;
    }

    // 個人情報入力後 = 登録済み（LINE_除外）かつ注文なし
    const noRxCount = registeredCount - rxCount;
    // 個人情報入力前 = LINE友だち全体 − 登録済み（デフォルトメニューが表示される未登録者）
    const preRegCount = allLineCount - registeredCount;

    // メニュー名に基づいてカウントをマッピング
    const menus = (data || []).map((menu: Record<string, unknown>) => {
      let user_count = 0;
      if (menu.name === "処方後") {
        user_count = rxCount;
      } else if (menu.name === "個人情報入力後") {
        user_count = noRxCount;
      } else if (menu.name === "個人情報入力前" || menu.selected) {
        user_count = preRegCount;
      }
      return { ...menu, user_count };
    });

    return NextResponse.json({ menus });
  } catch (e) {
    console.error("[Rich Menu GET] Unhandled error:", (e as Error).message || e);
    return serverError("サーバーエラーが発生しました");
  }
}

// リッチメニュー作成 + LINE API登録
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req);

    const parsed = await parseBody(req, createRichMenuSchema);
    if ("error" in parsed) return parsed.error;
    const { name, chat_bar_text, selected, size_type, areas, image_url, ai_prompt, ai_generated } = parsed.data;

    // 1. DBに保存
    const { data, error } = await supabaseAdmin
      .from("rich_menus")
      .insert({
        ...tenantPayload(tenantId),
        name: name.trim(),
        chat_bar_text: chat_bar_text || "メニュー",
        selected: selected ?? false,
        size_type: size_type || "full",
        areas: areas || [],
        image_url: image_url || null,
        ...(ai_prompt ? { ai_prompt } : {}),
        ...(ai_generated != null ? { ai_generated } : {}),
      })
      .select()
      .single();

    if (error) return serverError(error.message);

    // 2. 画像がある場合、LINE API登録をバックグラウンドで実行
    if (image_url) {
      const origin = req.headers.get("origin") || (await getSettingOrEnv("general", "app_base_url", "APP_BASE_URL", tenantId ?? undefined)) || "";
      after(async () => {
        try {
          const lineRichMenuId = await createLineRichMenu(data, origin, tenantId ?? undefined);
          if (!lineRichMenuId) {
            console.error("[Rich Menu POST after] LINE menu create failed");
            return;
          }

          const imageOk = await uploadRichMenuImage(lineRichMenuId, image_url, 3, tenantId ?? undefined);
          if (!imageOk) {
            console.error("[Rich Menu POST after] Image upload failed");
            return;
          }

          await strictWithTenant(
            supabaseAdmin.from("rich_menus").update({ line_rich_menu_id: lineRichMenuId, is_active: true }).eq("id", data.id),
            tenantId
          );

          if (selected) {
            await setDefaultRichMenu(lineRichMenuId, tenantId ?? undefined);
          }

          console.log("[Rich Menu POST after] LINE menu created:", lineRichMenuId);
        } catch (e) {
          console.error("[Rich Menu POST after] Error:", e);
        }
      });
    }

    return NextResponse.json({ menu: data });
  } catch (e) {
    console.error("[Rich Menu POST] Unhandled error:", (e as Error).message || e);
    return serverError("サーバーエラーが発生しました");
  }
}
