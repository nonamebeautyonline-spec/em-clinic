"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Section, Label, Title, Sub, MockWindow, ComingSoonBadge } from "./shared";
import { FadeIn, StaggerChildren, StaggerItem, GlowBorder, SalonCard } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   機能紹介 — サロン6機能を実際のUI風モックで表現
   各機能にインタラクティブなモックUIを配置
   ═══════════════════════════════════════════════════════════════════════════ */

/* ──── 予約管理モック ──── */
function BookingMock() {
  const slots = [
    { time: "10:00", stylist: "田中", menu: "カット+カラー", status: "confirmed" },
    { time: "11:30", stylist: "鈴木", menu: "パーマ", status: "confirmed" },
    { time: "13:00", stylist: "田中", menu: "トリートメント", status: "pending" },
    { time: "14:00", stylist: "佐藤", menu: "カット", status: "confirmed" },
    { time: "15:30", stylist: "鈴木", menu: "カラー+トリートメント", status: "confirmed" },
  ];
  return (
    <MockWindow title="予約カレンダー — 4月5日（土）">
      <div className="space-y-1.5">
        {slots.map((s) => (
          <div key={s.time} className="flex items-center gap-2 rounded-lg bg-slate-50/80 px-3 py-2">
            <span className="w-10 shrink-0 text-[11px] font-bold text-slate-600">{s.time}</span>
            <span className="w-10 shrink-0 rounded bg-pink-100 px-1.5 py-0.5 text-center text-[9px] font-bold text-pink-600">{s.stylist}</span>
            <span className="flex-1 text-[11px] text-slate-600">{s.menu}</span>
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${s.status === "confirmed" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
              {s.status === "confirmed" ? "確定" : "仮予約"}
            </span>
          </div>
        ))}
      </div>
    </MockWindow>
  );
}

/* ──── 顧客管理モック（来店履歴タイムライン） ──── */
function CustomerMock() {
  const visits = [
    { date: "3/28", menu: "カット+カラー", stylist: "田中", note: "アッシュベージュ希望" },
    { date: "2/15", menu: "カット+トリートメント", stylist: "田中", note: "毛先のダメージケア" },
    { date: "1/8", menu: "カット+パーマ", stylist: "鈴木", note: "ゆるふわウェーブ" },
  ];
  return (
    <MockWindow title="顧客カルテ — 山田 花子 様">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-rose-400 text-[14px] font-bold text-white">花</div>
        <div>
          <div className="text-[12px] font-bold text-slate-700">山田 花子</div>
          <div className="flex gap-2 text-[9px] text-slate-400">
            <span>来店 12回</span>
            <span>担当: 田中</span>
            <span className="rounded bg-pink-100 px-1 font-bold text-pink-600">VIP</span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {visits.map((v) => (
          <div key={v.date} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="h-2 w-2 rounded-full bg-pink-400" />
              <div className="h-full w-px bg-pink-200/60" />
            </div>
            <div className="pb-2">
              <div className="text-[10px] font-bold text-pink-600">{v.date}</div>
              <div className="text-[11px] font-medium text-slate-600">{v.menu}（{v.stylist}）</div>
              <div className="text-[10px] text-slate-400">{v.note}</div>
            </div>
          </div>
        ))}
      </div>
    </MockWindow>
  );
}

/* ──── セグメント配信モック ──── */
function SegmentMock() {
  return (
    <MockWindow title="セグメント配信 — 新規作成">
      <div className="space-y-2">
        <div className="rounded-lg bg-pink-50/60 p-2.5">
          <div className="text-[10px] font-bold text-pink-600">配信条件</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {["来店3回以上", "最終来店30日以内", "カラーメニュー利用"].map((tag) => (
              <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-[9px] font-medium text-slate-600 ring-1 ring-pink-200">{tag}</span>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-slate-500">対象: <span className="font-bold text-pink-600">847名</span></div>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-2.5">
          <div className="text-[10px] font-bold text-slate-600">メッセージプレビュー</div>
          <div className="mt-1.5 rounded-lg bg-emerald-50 p-2 text-[10px] leading-relaxed text-emerald-800">
            いつもありがとうございます!<br />
            春の新色カラーが入荷しました。<br />
            4月限定20%OFFクーポン付き
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

/* ──── リッチメニューモック ──── */
function RichMenuMock() {
  const menuItems = [
    { label: "予約する", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "from-pink-400 to-rose-400" },
    { label: "メニュー", icon: "M4 6h16M4 12h16M4 18h7", color: "from-violet-400 to-purple-400" },
    { label: "スタンプ", icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z", color: "from-amber-400 to-orange-400" },
    { label: "クーポン", icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z", color: "from-emerald-400 to-teal-400" },
    { label: "ショップ", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z", color: "from-sky-400 to-blue-400" },
    { label: "お問合せ", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "from-fuchsia-400 to-pink-400" },
  ];
  return (
    <MockWindow title="リッチメニュー — ビルダー">
      <div className="rounded-lg border-2 border-dashed border-pink-200 bg-pink-50/30 p-3">
        <div className="grid grid-cols-3 gap-2">
          {menuItems.map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-1 rounded-lg bg-white p-2 shadow-sm">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${m.color}`}>
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={m.icon} /></svg>
              </div>
              <span className="text-[9px] font-medium text-slate-600">{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </MockWindow>
  );
}

/* ──── スタンプカードモック ──── */
function StampMock() {
  const stamps = Array.from({ length: 10 }, (_, i) => i < 7);
  return (
    <MockWindow title="スタンプカード — 山田 花子 様">
      <div className="rounded-xl bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4 ring-1 ring-pink-100">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-bold text-slate-700">ビューティスタンプ</span>
          <span className="text-[10px] text-pink-600 font-semibold">7 / 10</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {stamps.map((filled, i) => (
            <div
              key={i}
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                filled
                  ? "bg-gradient-to-br from-pink-400 to-rose-400 shadow-sm shadow-pink-300/40"
                  : "border-2 border-dashed border-pink-200 bg-white"
              }`}
            >
              {filled ? (
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              ) : (
                <span className="text-[9px] font-bold text-pink-300">{i + 1}</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-1.5 text-center text-[10px] font-semibold text-amber-700">
          あと3回で「トリートメント1回無料」特典!
        </div>
      </div>
    </MockWindow>
  );
}

/* ──── 物販・ECモック ──── */
function ShopMock() {
  const products = [
    { name: "モイスチャーシャンプー", price: "3,200", stock: 24 },
    { name: "ダメージリペアオイル", price: "2,800", stock: 18 },
    { name: "カラーケアトリートメント", price: "3,500", stock: 12 },
  ];
  return (
    <MockWindow title="LINE物販 — 商品管理">
      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.name} className="flex items-center gap-3 rounded-lg bg-slate-50/80 px-3 py-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-100 to-pink-100">
              <svg className="h-5 w-5 text-pink-500" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-medium text-slate-700">{p.name}</div>
              <div className="flex gap-2 text-[10px] text-slate-400">
                <span className="font-bold text-pink-600">{p.price}円</span>
                <span>在庫 {p.stock}個</span>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-600">販売中</span>
          </div>
        ))}
      </div>
    </MockWindow>
  );
}

/* ──── メイン機能データ ──── */
const features = [
  {
    id: "booking",
    title: "予約管理",
    desc: "LINE上で予約の受付・変更・キャンセルが完結。施術者ごとのカレンダー表示で予約状況を一目で把握。リマインド自動配信で無断キャンセルを防止。",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    color: "from-pink-400 to-rose-400",
    bgLight: "bg-pink-50",
    mock: <BookingMock />,
  },
  {
    id: "customer",
    title: "顧客管理",
    desc: "来店回数・施術履歴・担当スタッフ・好みのメニューを顧客カルテに一元管理。次回来店時のパーソナルな提案で顧客満足度を最大化。",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    color: "from-violet-400 to-purple-400",
    bgLight: "bg-violet-50",
    mock: <CustomerMock />,
  },
  {
    id: "segment",
    title: "セグメント配信",
    desc: "来店回数・メニュー・担当スタッフ・最終来店日でターゲットを精密に絞り込み。リピート促進や休眠顧客の掘り起こしを自動化。",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    color: "from-amber-400 to-orange-400",
    bgLight: "bg-amber-50",
    mock: <SegmentMock />,
  },
  {
    id: "richmenu",
    title: "リッチメニュー管理",
    desc: "ノーコードビルダーで直感的にメニューを設計。予約・クーポン・スタンプカードへの導線をLINE画面に常時表示。",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z",
    color: "from-sky-400 to-blue-400",
    bgLight: "bg-sky-50",
    mock: <RichMenuMock />,
  },
  {
    id: "stamp",
    title: "スタンプカード",
    desc: "紙のポイントカードをLINEでデジタル化。来店ごとに自動スタンプ付与。特典設定でリピート来店を強力に促進。",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    color: "from-emerald-400 to-teal-400",
    bgLight: "bg-emerald-50",
    mock: <StampMock />,
  },
  {
    id: "shop",
    title: "物販・EC機能",
    desc: "サロン専売品やホームケア商品をLINE上で販売。在庫管理・発送管理まで一元化。施術後のクロスセルで客単価アップ。",
    icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
    color: "from-rose-400 to-fuchsia-400",
    bgLight: "bg-rose-50",
    mock: <ShopMock />,
  },
];

export default function Features() {
  const [activeId, setActiveId] = useState("booking");
  const active = features.find((f) => f.id === activeId)!;

  return (
    <Section id="features" className="relative overflow-hidden bg-gradient-to-b from-white via-pink-50/20 to-white">
      <div className="text-center">
        <Label>FEATURES</Label>
        <Title>
          サロン運営に必要な機能を
          <br className="md:hidden" />
          オールインワンで
        </Title>
        <Sub>
          予約管理から物販まで。Lオペ for SALONなら1つの管理画面でサロンのLINE運用がすべて完結します。
        </Sub>
      </div>

      {/* タブナビゲーション */}
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {features.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveId(f.id)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold transition-all ${
              activeId === f.id
                ? "bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-lg shadow-pink-500/20"
                : "bg-white text-slate-500 ring-1 ring-slate-200 hover:ring-pink-200 hover:text-pink-600"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d={f.icon} />
            </svg>
            {f.title}
          </button>
        ))}
      </div>

      {/* アクティブ機能の詳細表示 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="grid items-center gap-10 lg:grid-cols-2"
        >
          {/* 左: 説明 */}
          <div>
            <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${active.color} shadow-lg`}>
              <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d={active.icon} />
              </svg>
            </div>
            <h3 className="mb-3 text-2xl font-extrabold text-slate-800">{active.title}</h3>
            <p className="mb-6 text-[15px] leading-[1.8] text-slate-500">{active.desc}</p>
            <ComingSoonBadge />
          </div>

          {/* 右: モックUI */}
          <div>{active.mock}</div>
        </motion.div>
      </AnimatePresence>

      {/* カード一覧（モバイル向けグリッド表示） */}
      <StaggerChildren className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <StaggerItem key={f.id}>
            <motion.button
              onClick={() => setActiveId(f.id)}
              className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-all ${
                activeId === f.id
                  ? "border-pink-200 bg-pink-50/50 shadow-md shadow-pink-100/30"
                  : "border-slate-100 bg-white hover:border-pink-200 hover:shadow-sm"
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${f.color}`}>
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={f.icon} /></svg>
              </div>
              <div>
                <h4 className="text-[14px] font-bold text-slate-800">{f.title}</h4>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-400 line-clamp-2">{f.desc}</p>
              </div>
            </motion.button>
          </StaggerItem>
        ))}
      </StaggerChildren>
    </Section>
  );
}
