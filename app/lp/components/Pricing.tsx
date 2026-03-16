"use client";

import Link from "next/link";
import { Section, Label, Title, Sub } from "./shared";
import { ScaleIn } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   料金プラン
   ═══════════════════════════════════════════════════════════════════════════ */

export function Pricing() {
  /* ── 機能プラン ── */
  const funcPlans = [
    { name: "スタンダード", price: "¥71,500", init: "初期費用 ¥330,000", desc: "予約・カルテ・問診まで診療業務をカバー", pop: true },
    { name: "プロ", price: "¥121,000", init: "初期費用 ¥550,000", desc: "決済・配送・分析まで業務をまるごとDX化" },
  ];
  /* ── メッセージ通数プラン ── */
  const msgPlans = [
    { name: "5,000通", price: "¥4,400", per: "¥1.1/通" },
    { name: "30,000通", price: "¥18,700", per: "¥0.77/通", pop: true },
    { name: "50,000通", price: "¥30,800", per: "¥0.62/通" },
    { name: "100,000通", price: "¥77,000", per: "¥0.55/通" },
  ];
  const bigMsgPlans = [
    { name: "300,000通", price: "¥115,500", per: "¥0.44/通" },
    { name: "500,000通", price: "¥126,500", per: "¥0.33/通" },
    { name: "1,000,000通", price: "¥173,800", per: "¥0.22/通" },
  ];
  /* ── AIオプション ── */
  const aiOptions = [
    { name: "AI自動返信", price: "¥22,000", desc: "AIによるLINE自動返信" },
    { name: "音声カルテ", price: "¥16,500", desc: "音声→SOAPカルテ自動生成" },
  ];
  /* ── 構築オプション ── */
  const buildOptions = [
    { name: "LINE公式アカウント初期構築", price: "¥110,000" },
    { name: "リッチメニュー作成", price: "¥27,500" },
    { name: "データ移行", price: "¥110,000" },
  ];
  return (
    <Section id="pricing" className="bg-gradient-to-b from-white to-blue-50/20">
      <div className="text-center"><Label>PRICING</Label><Title>料金プラン</Title><Sub>機能プラン＋メッセージ通数の組み合わせで、貴院に最適な料金を。全プラン全機能利用可。</Sub></div>

      {/* 機能プラン */}
      <div className="mx-auto mt-10 max-w-3xl">
        <h3 className="mb-4 text-center text-[15px] font-bold text-slate-700">機能プラン（月額）</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {funcPlans.map((p, i) => (
            <ScaleIn key={p.name} delay={i * 0.08}>
              <div className={`rounded-2xl border-2 bg-white p-6 text-center shadow-sm transition hover:shadow-lg ${p.pop ? "border-blue-500 shadow-blue-100/40 relative" : "border-slate-200"}`}>
                {p.pop && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white">人気</span>}
                <h3 className="text-[15px] font-bold text-slate-800">{p.name}</h3>
                <p className="mt-1 text-[11px] text-slate-400">{p.desc}</p>
                <div className="mt-4 text-3xl font-extrabold text-blue-600">{p.price}<span className="text-sm font-normal text-slate-400">/月</span></div>
                <p className="mt-1 text-[11px] text-slate-400">{p.init}</p>
              </div>
            </ScaleIn>
          ))}
        </div>
      </div>

      {/* メッセージ通数プラン */}
      <div className="mx-auto mt-12 max-w-5xl">
        <h3 className="mb-4 text-center text-[15px] font-bold text-slate-700">メッセージ通数プラン（月額追加）</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {msgPlans.map((p, i) => (
            <ScaleIn key={p.name} delay={i * 0.08}>
              <div className={`rounded-2xl border-2 bg-white p-6 text-center shadow-sm transition hover:shadow-lg ${p.pop ? "border-blue-500 shadow-blue-100/40 relative" : "border-slate-200"}`}>
                {p.pop && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white">人気</span>}
                <h3 className="text-[15px] font-bold text-slate-800">{p.name}</h3>
                <div className="mt-3 text-2xl font-extrabold text-blue-600">{p.price}<span className="text-sm font-normal text-slate-400">/月</span></div>
                <p className="mt-1 text-[11px] text-slate-400">超過分 {p.per}</p>
              </div>
            </ScaleIn>
          ))}
        </div>

        {/* 大量送信プラン */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-slate-50">{["大量送信プラン", "込み通数", "月額（税込）", "超過単価"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500">{h}</th>)}</tr></thead>
            <tbody>
              {bigMsgPlans.map((p) => (
                <tr key={p.name} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{p.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.name}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">{p.price}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.per}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AIオプション */}
      <div className="mx-auto mt-12 max-w-3xl">
        <h3 className="mb-4 text-center text-[15px] font-bold text-slate-700">AIオプション（月額追加）</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {aiOptions.map((o) => (
            <div key={o.name} className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <h4 className="text-[14px] font-bold text-slate-800">{o.name}</h4>
              <p className="mt-1 text-[11px] text-slate-400">{o.desc}</p>
              <div className="mt-3 text-xl font-extrabold text-blue-600">+{o.price}<span className="text-sm font-normal text-slate-400">/月</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* 構築オプション */}
      <div className="mx-auto mt-12 max-w-3xl">
        <h3 className="mb-4 text-center text-[15px] font-bold text-slate-700">構築オプション（初期費用）</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {buildOptions.map((o) => (
            <div key={o.name} className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <h4 className="text-[13px] font-bold text-slate-800">{o.name}</h4>
              <div className="mt-3 text-lg font-extrabold text-blue-600">{o.price}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-[11px] text-slate-400 text-center">※ 表示価格はすべて税込です。</p>

      <div className="mt-8 text-center">
        <Link href="/lp/entry-BYagL-x_JX2JSAeN" className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-10 py-4 text-[13px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl">お申し込み・お問い合わせ</Link>
      </div>
    </Section>
  );
}
