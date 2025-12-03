"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function MyPageInner() {
  const searchParams = useSearchParams();

  const name = searchParams.get("name") || "（nameパラメータなし）";
  const customerId =
    searchParams.get("customer_id") || "（customer_idなし）";
  const kana = searchParams.get("kana") || "（kanaなし）";
  const sex = searchParams.get("sex") || "（sexなし）";
  const birth = searchParams.get("birth") || "（birthなし）";
  const phone = searchParams.get("phone") || "（phoneなし）";

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
        mypage デバッグ表示
      </h1>
      <p>URL から受け取ったパラメータをそのまま表示します。</p>
      <ul style={{ marginTop: 16, lineHeight: 1.7 }}>
        <li>
          <b>name:</b> {name}
        </li>
        <li>
          <b>customer_id:</b> {customerId}
        </li>
        <li>
          <b>kana:</b> {kana}
        </li>
        <li>
          <b>sex:</b> {sex}
        </li>
        <li>
          <b>birth:</b> {birth}
        </li>
        <li>
          <b>phone:</b> {phone}
        </li>
      </ul>
    </div>
  );
}

export default function MyPagePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            padding: 24,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          読み込み中です…
        </div>
      }
    >
      <MyPageInner />
    </Suspense>
  );
}
