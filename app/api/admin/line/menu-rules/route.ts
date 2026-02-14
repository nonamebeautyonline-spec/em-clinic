// app/api/admin/line/menu-rules/route.ts — メニュー自動切替ルール管理
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import {
  loadMenuRules,
  saveMenuRules,
  evaluateMenuRulesForMany,
  type MenuAutoRule,
} from "@/lib/menu-auto-rules";
import { supabaseAdmin } from "@/lib/supabase";

// ルール一覧取得
export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rules = await loadMenuRules();
  return NextResponse.json({ rules });
}

// ルール作成・更新
export async function POST(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { rule } = body as { rule: Partial<MenuAutoRule> };
  if (!rule?.name || !rule?.target_menu_id) {
    return NextResponse.json({ error: "名前と対象メニューは必須です" }, { status: 400 });
  }

  const rules = await loadMenuRules();

  if (rule.id) {
    // 更新
    const idx = rules.findIndex(r => r.id === rule.id);
    if (idx === -1) return NextResponse.json({ error: "ルールが見つかりません" }, { status: 404 });
    rules[idx] = { ...rules[idx], ...rule } as MenuAutoRule;
  } else {
    // 新規作成
    const newRule: MenuAutoRule = {
      id: crypto.randomUUID(),
      name: rule.name,
      enabled: rule.enabled !== false,
      conditions: rule.conditions || [],
      conditionOperator: rule.conditionOperator || "AND",
      target_menu_id: rule.target_menu_id,
      priority: rule.priority ?? rules.length,
      created_at: new Date().toISOString(),
    };
    rules.push(newRule);
  }

  const saved = await saveMenuRules(rules);
  if (!saved) return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  return NextResponse.json({ ok: true, rules });
}

// ルール削除
export async function DELETE(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "idは必須です" }, { status: 400 });

  const rules = await loadMenuRules();
  const filtered = rules.filter(r => r.id !== id);
  await saveMenuRules(filtered);
  return NextResponse.json({ ok: true });
}

// 一括適用（PUT）
export async function PUT(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 全LINE連携済み患者を取得
  const { data: patients } = await supabaseAdmin
    .from("patients")
    .select("patient_id")
    .not("line_id", "is", null);

  const ids = (patients || []).map(p => p.patient_id);
  if (ids.length === 0) return NextResponse.json({ ok: true, evaluated: 0 });

  await evaluateMenuRulesForMany(ids);
  return NextResponse.json({ ok: true, evaluated: ids.length });
}
