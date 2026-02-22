import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { weeklyRulesSchema } from "@/lib/validations/admin-operations";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  try {
    const parsed = await parseBody(req, weeklyRulesSchema);
    if ("error" in parsed) return parsed.error;
    const { doctor_id, rules } = parsed.data;

    const now = new Date().toISOString();
    const savedRules = [];

    for (const rule of rules) {
      const weekday = Number(rule.weekday);
      if (isNaN(weekday) || weekday < 0 || weekday > 6) {
        continue;
      }

      const record = {
        ...tenantPayload(tenantId),
        doctor_id,
        weekday,
        enabled: rule.enabled === true,
        start_time: rule.start_time || null,
        end_time: rule.end_time || null,
        slot_minutes: Number(rule.slot_minutes) || 15,
        capacity: Number(rule.capacity) || 2,
        updated_at: now,
      };

      const { error } = await supabaseAdmin
        .from("doctor_weekly_rules")
        .upsert(record, { onConflict: "doctor_id,weekday" });

      if (error) {
        console.error(`weekly_rules upsert error (weekday=${weekday}):`, error);
      } else {
        savedRules.push(record);
      }
    }

    return NextResponse.json({ ok: true, rules: savedRules });
  } catch (error) {
    console.error("weekly_rules API error:", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
