// app/s/[code]/route.ts — 流入経路トラッキング中間リダイレクトページ
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const tenantId = resolveTenantId(req);
  const now = new Date().toISOString();

  // 流入経路を取得
  const { data: source } = await withTenant(
    supabaseAdmin
      .from("tracking_sources")
      .select("id, destination_url, is_active, valid_from, valid_until, utm_defaults, custom_params, html_head_tags, html_body_tags")
      .eq("code", code),
    tenantId
  ).maybeSingle();

  // 無効・未存在・期間外の場合はLINE友だち追加URLへフォールバック
  if (!source || !source.is_active) {
    return NextResponse.json({ error: "リンクが見つかりません" }, { status: 404 });
  }

  if (source.valid_from && now < source.valid_from) {
    return NextResponse.json({ error: "有効期間前です" }, { status: 404 });
  }
  if (source.valid_until && now > source.valid_until) {
    return NextResponse.json({ error: "有効期間を過ぎています" }, { status: 404 });
  }

  // URLからUTMパラメータ取得（URLパラメータ > デフォルト値）
  const searchParams = new URL(req.url).searchParams;
  const utmDefaults = (source.utm_defaults || {}) as Record<string, string>;
  const utmSource = searchParams.get("utm_source") || utmDefaults.utm_source || "";
  const utmMedium = searchParams.get("utm_medium") || utmDefaults.utm_medium || "";
  const utmCampaign = searchParams.get("utm_campaign") || utmDefaults.utm_campaign || "";
  const utmTerm = searchParams.get("utm_term") || utmDefaults.utm_term || "";
  const utmContent = searchParams.get("utm_content") || utmDefaults.utm_content || "";

  // カスタムパラメータ取得
  const customParamDefs = (source.custom_params || []) as { key: string; field: string }[];
  const customParams: Record<string, string> = {};
  for (const def of customParamDefs) {
    const val = searchParams.get(def.key);
    if (val) customParams[def.key] = val;
  }

  // 広告クリックID取得（gclid/fbclid/ttclid/twclid）
  const gclid = searchParams.get("gclid") || null;
  const fbclid = searchParams.get("fbclid") || null;
  const ttclid = searchParams.get("ttclid") || null;
  const twclid = searchParams.get("twclid") || null;

  // 訪問記録
  const ua = req.headers.get("user-agent") || "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const referrer = req.headers.get("referer") || "";

  const { data: visit } = await supabaseAdmin
    .from("tracking_visits")
    .insert({
      ...tenantPayload(tenantId),
      source_id: source.id,
      user_agent: ua.slice(0, 500),
      ip_address: ip,
      referrer: referrer.slice(0, 500),
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      utm_term: utmTerm || null,
      utm_content: utmContent || null,
      custom_params: Object.keys(customParams).length > 0 ? customParams : {},
      gclid,
      fbclid,
      ttclid,
      twclid,
    })
    .select("id")
    .single();

  const visitId = visit?.id ? String(visit.id) : "";
  const destinationUrl = source.destination_url.replace(/[<>"'&]/g, "");
  const headTags = source.html_head_tags || "";
  const bodyTags = source.html_body_tags || "";

  // HTML返却方式（LINE内ブラウザでCookieを確実に保存するため）
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="1;url=${destinationUrl}">
<title>リダイレクト中</title>
${headTags}
</head><body>
<p>リダイレクト中...</p>
${bodyTags}
<script>
document.cookie="tracking_visit_id=${visitId};path=/;max-age=7776000;SameSite=Lax";
document.cookie="tracking_source_code=${code};path=/;max-age=7776000;SameSite=Lax";
window.location.href="${destinationUrl}";
</script>
</body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
