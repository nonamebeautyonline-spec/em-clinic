import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { jwtVerify } from "jose";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || "fallback-secret";

async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get("admin_session")?.value;
  if (sessionCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(sessionCookie, secret);
      return true;
    } catch { /* 次の方式を試す */ }
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    if (authHeader.substring(7) === process.env.ADMIN_TOKEN) return true;
  }
  return false;
}

// ファネルステータスの型
export interface FunnelData {
  label: string;
  count: number;
}

export interface PrescriptionData {
  newPrescription: number;
  rePrescription: number;
}

export interface PaymentMethodData {
  creditCard: number;
  bankTransfer: number;
  creditCardAmount: number;
  bankTransferAmount: number;
}

export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdminAuth(request))) return unauthorized();
    const tenantId = resolveTenantIdOrThrow(request);

    // 3つの集計を並列実行
    const [funnelResult, prescriptionResult, paymentMethodResult] = await Promise.all([
      getFunnelData(tenantId),
      getPrescriptionData(tenantId),
      getPaymentMethodData(tenantId),
    ]);

    return NextResponse.json({
      funnel: funnelResult,
      prescription: prescriptionResult,
      paymentMethod: paymentMethodResult,
    });
  } catch (error) {
    console.error("[dashboard-pie-charts] Error:", error);
    return serverError(error instanceof Error ? error.message : "Internal server error");
  }
}

// 患者ファネル（全期間、各ステップで止まっている人数）
async function getFunnelData(tenantId: string): Promise<FunnelData[]> {
  // 決済済み患者ID
  const { data: paidRows } = await supabaseAdmin
    .from("orders")
    .select("patient_id")
    .eq("tenant_id", tenantId)
    .not("paid_at", "is", null)
    .limit(100000);
  const paidPatientIds = new Set((paidRows || []).map(r => r.patient_id));

  // 全intake取得（各患者の最も進んだ状態を判定）
  const { data: intakeRows } = await supabaseAdmin
    .from("intake")
    .select("patient_id, answers, reserve_id, status")
    .eq("tenant_id", tenantId)
    .limit(100000);

  // 患者ごとに最も進んだintakeステータスを集約
  const intakeMap = new Map<string, { hasAnswers: boolean; hasReserve: boolean; hasStatus: boolean }>();
  for (const row of intakeRows || []) {
    const existing = intakeMap.get(row.patient_id);
    const hasAnswers = row.answers !== null && row.answers !== undefined;
    const hasReserve = !!row.reserve_id;
    const hasStatus = row.status === "OK" || row.status === "NG";
    if (!existing) {
      intakeMap.set(row.patient_id, { hasAnswers, hasReserve, hasStatus });
    } else {
      // 最も進んだ状態を保持
      if (hasAnswers) existing.hasAnswers = true;
      if (hasReserve) existing.hasReserve = true;
      if (hasStatus) existing.hasStatus = true;
    }
  }

  // 全患者取得
  const { data: patientRows } = await supabaseAdmin
    .from("patients")
    .select("patient_id, tel, name")
    .eq("tenant_id", tenantId)
    .limit(100000);

  let lineOnly = 0;
  let personalInfo = 0;
  let telVerified = 0;
  let answered = 0;
  let reserved = 0;
  let consulted = 0;
  let paid = 0;

  for (const p of patientRows || []) {
    const intake = intakeMap.get(p.patient_id);

    // 最も進んだステップから逆順に判定
    if (paidPatientIds.has(p.patient_id)) {
      paid++;
    } else if (intake?.hasStatus) {
      consulted++;
    } else if (intake?.hasReserve) {
      reserved++;
    } else if (intake?.hasAnswers) {
      answered++;
    } else if (p.tel) {
      telVerified++;
    } else if (p.patient_id && !p.patient_id.startsWith("LINE_")) {
      // 正式IDに統合済み = 個人情報入力済み
      personalInfo++;
    } else {
      lineOnly++;
    }
  }

  return [
    { label: "LINE追加のみ", count: lineOnly },
    { label: "個人情報入力済み", count: personalInfo },
    { label: "電話番号認証済み", count: telVerified },
    { label: "問診済み", count: answered },
    { label: "予約済み", count: reserved },
    { label: "診察済み", count: consulted },
    { label: "決済済み", count: paid },
  ];
}

// 今月の新規処方 vs 再処方
async function getPrescriptionData(tenantId: string): Promise<PrescriptionData> {
  // 今月の範囲（JST）
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0) - jstOffset);
  const monthEnd = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0) - jstOffset);

  // 今月の決済済み注文
  const { data: thisMonthOrders } = await supabaseAdmin
    .from("orders")
    .select("patient_id, paid_at")
    .eq("tenant_id", tenantId)
    .not("paid_at", "is", null)
    .gte("paid_at", monthStart.toISOString())
    .lt("paid_at", monthEnd.toISOString())
    .limit(100000);

  // 今月より前の決済済み患者ID
  const { data: prevOrders } = await supabaseAdmin
    .from("orders")
    .select("patient_id")
    .eq("tenant_id", tenantId)
    .not("paid_at", "is", null)
    .lt("paid_at", monthStart.toISOString())
    .limit(100000);
  const prevPaidIds = new Set((prevOrders || []).map(r => r.patient_id));

  let newPrescription = 0;
  let rePrescription = 0;
  // 今月の注文を患者単位でユニーク処理
  const thisMonthPatientIds = new Set<string>();
  for (const order of thisMonthOrders || []) {
    if (thisMonthPatientIds.has(order.patient_id)) continue;
    thisMonthPatientIds.add(order.patient_id);
    if (prevPaidIds.has(order.patient_id)) {
      rePrescription++;
    } else {
      newPrescription++;
    }
  }

  return { newPrescription, rePrescription };
}

// 今月の決済方法内訳
async function getPaymentMethodData(tenantId: string): Promise<PaymentMethodData> {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0) - jstOffset);
  const monthEnd = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0) - jstOffset);

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("payment_method, amount")
    .eq("tenant_id", tenantId)
    .not("paid_at", "is", null)
    .gte("paid_at", monthStart.toISOString())
    .lt("paid_at", monthEnd.toISOString())
    .limit(100000);

  let creditCard = 0;
  let bankTransfer = 0;
  let creditCardAmount = 0;
  let bankTransferAmount = 0;

  for (const o of orders || []) {
    const amount = o.amount || 0;
    if (o.payment_method === "bank_transfer") {
      bankTransfer++;
      bankTransferAmount += amount;
    } else {
      // credit_card またはその他はクレジットカードとして扱う
      creditCard++;
      creditCardAmount += amount;
    }
  }

  return { creditCard, bankTransfer, creditCardAmount, bankTransferAmount };
}
