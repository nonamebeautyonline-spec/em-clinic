"use client";

import Link from "next/link";
import { Section, Label, Title, Sub } from "./shared";
import { ScaleIn } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   料金プラン
   ═══════════════════════════════════════════════════════════════════════════ */

export function Pricing() {
  const plans = [
    { name: "ライト", msgs: "5,000通", price: "¥4,000", per: "¥1.0/通" },
    { name: "スタンダード", msgs: "30,000通", price: "¥17,000", per: "¥0.7/通", pop: true },
    { name: "プロ", msgs: "50,000通", price: "¥26,000", per: "¥0.6/通" },
    { name: "ビジネス", msgs: "100,000通", price: "¥70,000", per: "¥0.5/通" },
  ];
  const bigPlans = [
    { name: "ビジネス30万", msgs: "300,000通", price: "¥105,000", per: "¥0.4/通" },
    { name: "ビジネス50万", msgs: "500,000通", price: "¥115,000", per: "¥0.3/通" },
    { name: "ビジネス100万", msgs: "1,000,000通", price: "¥158,000", per: "¥0.2/通" },
  ];
  const options = [
    { name: "AI返信", price: "¥20,000", desc: "AIによるLINE自動返信" },
    { name: "音声入力", price: "¥15,000", desc: "音声からテキスト変換" },
    { name: "AIカルテ", price: "¥20,000", desc: "AI自動カルテ生成" },
  ];
  return (
    <Section id="pricing" className="bg-gradient-to-b from-white to-blue-50/20">
      <div className="text-center"><Label>PRICING</Label><Title>料金プラン</Title><Sub>メッセージ送信量に応じた従量課金制。メッセージ量に合わせて最適なプランを選べます。全プラン全機能利用可。</Sub></div>

      {/* メッセージプラン */}
      <div className="mx-auto mt-10 max-w-5xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p, i) => (
            <ScaleIn key={p.name} delay={i * 0.08}>
              <div className={`rounded-2xl border-2 bg-white p-6 text-center shadow-sm transition hover:shadow-lg ${p.pop ? "border-blue-500 shadow-blue-100/40 relative" : "border-slate-200"}`}>
                {p.pop && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold text-white">人気</span>}
                <h3 className="text-[15px] font-bold text-slate-800">{p.name}</h3>
                <p className="mt-1 text-[12px] text-slate-400">{p.msgs}/月</p>
                <div className="mt-4 text-3xl font-extrabold text-blue-600">{p.price}<span className="text-sm font-normal text-slate-400">/月</span></div>
                <p className="mt-1 text-[11px] text-slate-400">超過分 {p.per}</p>
              </div>
            </ScaleIn>
          ))}
        </div>

        {/* 大量プラン */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-[12px]">
            <thead><tr className="bg-slate-50">{["大量送信プラン", "込み通数", "月額（税込）", "超過単価"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-semibold text-slate-500">{h}</th>)}</tr></thead>
            <tbody>
              {bigPlans.map((p) => (
                <tr key={p.name} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{p.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{p.msgs}</td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">{p.price}</td>
                  <td className="px-4 py-2.5 text-slate-500">{p.per}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-400 text-center">全プランで全機能利用可 / 初期費用: ¥300,000〜（導入支援込み）</p>
      </div>

      {/* AIオプション */}
      <div className="mx-auto mt-12 max-w-3xl">
        <h3 className="mb-4 text-center text-[15px] font-bold text-slate-700">AIオプション（月額追加）</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((o) => (
            <div key={o.name} className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <h4 className="text-[14px] font-bold text-slate-800">{o.name}</h4>
              <p className="mt-1 text-[11px] text-slate-400">{o.desc}</p>
              <div className="mt-3 text-xl font-extrabold text-blue-600">+{o.price}<span className="text-sm font-normal text-slate-400">/月</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 text-center">
        <Link href="/lp/entry-BYagL-x_JX2JSAeN" className="inline-block rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-10 py-4 text-[13px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl">お申し込み・お問い合わせ</Link>
      </div>
    </Section>
  );
}
