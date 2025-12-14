// app/api/checkout/route.ts
"use server";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

type ProductCode =
  | "MJL_2.5mg_1m"
  | "MJL_2.5mg_2m"
  | "MJL_2.5mg_3m"
  | "MJL_5mg_1m"
  | "MJL_5mg_2m"
  | "MJL_5mg_3m"
  | "MJL_7.5mg_1m"
  | "MJL_7.5mg_2m"
  | "MJL_7.5mg_3m";

type Mode = "current" | "first" | "reorder";

type Product = {
  code: ProductCode;
  title: string;
  mg: "2.5mg" | "5mg" | "7.5mg";
  months: 1 | 2 | 3;
  shots: number;
  price: number; // JPY
};

const PRODUCTS: Product[] = [
  // 2.5mg
  {
    code: "MJL_2.5mg_1m",
    title: "マンジャロ 2.5mg 1ヶ月",
    mg: "2.5mg",
    months: 1,
    shots: 4,
    price: 13000,
  },
  {
    code: "MJL_2.5mg_2m",
    title: "マンジャロ 2.5mg 2ヶ月",
    mg: "2.5mg",
    months: 2,
    shots: 8,
    price: 25500,
  },
  {
    code: "MJL_2.5mg_3m",
    title: "マンジャロ 2.5mg 3ヶ月",
    mg: "2.5mg",
    months: 3,
    shots: 12,
    price: 35000,
  },
  // 5mg
  {
    code: "MJL_5mg_1m",
    title: "マンジャロ 5mg 1ヶ月",
    mg: "5mg",
    months: 1,
    shots: 4,
    price: 23000,
  },
  {
    code: "MJL_5mg_2m",
    title: "マンジャロ 5mg 2ヶ月",
    mg: "5mg",
    months: 2,
    shots: 8,
    price: 45500,
  },
  {
    code: "MJL_5mg_3m",
    title: "マンジャロ 5mg 3ヶ月",
    mg: "5mg",
    months: 3,
    shots: 12,
    price: 63000,
  },
  // 7.5mg
  {
    code: "MJL_7.5mg_1m",
    title: "マンジャロ 7.5mg 1ヶ月",
    mg: "7.5mg",
    months: 1,
    shots: 4,
    price: 34000,
  },
  {
    code: "MJL_7.5mg_2m",
    title: "マンジャロ 7.5mg 2ヶ月",
    mg: "7.5mg",
    months: 2,
    shots: 8,
    price: 65000,
  },
  {
    code: "MJL_7.5mg_3m",
    title: "マンジャロ 7.5mg 3ヶ月",
    mg: "7.5mg",
    months: 3,
    shots: 12,
    price: 96000,
  },
];

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
const APP_BASE_URL = process.env.APP_BASE_URL; // 例: https://em-clinic.vercel.app
const SQUARE_ENV = process.env.SQUARE_ENV || "production"; // "sandbox" or "production"

const SQUARE_BASE_URL =
  SQUARE_ENV === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

export async function POST(req: NextRequest) {
  try {
    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID || !APP_BASE_URL) {
      return NextResponse.json(
        {
          error:
            "Server configuration error. Missing SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, or APP_BASE_URL.",
        },
        { status: 500 }
      );
    }

    const body = (await req.json()) as {
      productCode?: ProductCode;
      mode?: Mode;
      patientId?: string;
      reorderId?: string | null; // ★ 再処方行のID（行番号）
    };

    const { productCode, mode, patientId, reorderId } = body;

    if (!productCode) {
      return NextResponse.json(
        { error: "productCode is required." },
        { status: 400 }
      );
    }

    const product = PRODUCTS.find((p) => p.code === productCode);
    if (!product) {
      return NextResponse.json(
        { error: "Invalid productCode." },
        { status: 400 }
      );
    }

    const validModes: Mode[] = ["current", "first", "reorder"];
    if (mode && !validModes.includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Use current | first | reorder." },
        { status: 400 }
      );
    }

    const idempotencyKey = randomUUID();

    // 決済完了後のリダイレクト先
    const redirectUrl = `${APP_BASE_URL}/mypage/purchase/complete?code=${product.code}`;

    // Square CreatePaymentLink（Quick Pay）
    const res = await fetch(
      `${SQUARE_BASE_URL}/v2/online-checkout/payment-links`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
          "Square-Version": "2024-04-17",
        },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          quick_pay: {
            name: product.title,
            price_money: {
              amount: product.price,
              currency: "JPY",
            },
            location_id: SQUARE_LOCATION_ID,
          },
          checkout_options: {
            redirect_url: redirectUrl,
            ask_for_shipping_address: true, 
          },
          // ★ PatientID / product / mode / 再処方行ID を note に埋め込む
          // 例: "PID:20251200006;Product:MJL_5mg_3m (reorder);Reorder:12"
          payment_note: `PID:${patientId ?? "UNKNOWN"};Product:${product.code}${
            mode ? ` (${mode})` : ""
          }${reorderId ? `;Reorder:${reorderId}` : ""}`,
        }),
      }
    );

if (!res.ok) {
  // text をログしない（PII/識別子混入回避）
  console.error("Square CreatePaymentLink failed:", res.status);
  return NextResponse.json(
    { error: "Failed to create checkout link." },
    { status: 500 }
  );
}


    const json = (await res.json()) as {
      payment_link?: { url?: string };
      errors?: any;
    };

    const checkoutUrl = json?.payment_link?.url;
if (!checkoutUrl) {
  console.error("Square response missing url");
  return NextResponse.json(
    { error: "Square did not return a payment link URL." },
    { status: 500 }
  );
}

    return NextResponse.json({ checkoutUrl });
  } catch (err: any) {
    console.error("Checkout API error:", err);
    return NextResponse.json(
      {
        error:
          "決済リンクの作成中にエラーが発生しました。時間をおいて再度お試しください。",
      },
      { status: 500 }
    );
  }
}
