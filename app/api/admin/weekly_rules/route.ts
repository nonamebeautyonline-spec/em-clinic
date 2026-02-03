import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doctor_id, rules } = body;

    if (!doctor_id) {
      return NextResponse.json({ ok: false, error: "doctor_id required" }, { status: 400 });
    }

    if (!Array.isArray(rules)) {
      return NextResponse.json({ ok: false, error: "rules must be array" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const savedRules = [];

    for (const rule of rules) {
      const weekday = Number(rule.weekday);
      if (isNaN(weekday) || weekday < 0 || weekday > 6) {
        continue;
      }

      const record = {
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
