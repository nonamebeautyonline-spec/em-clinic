"use client";

import { Section, Label, Title, Sub } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

export function Flow() {
  const steps = [
    { num: "01", title: "無料アカウント作成", desc: "フォームから簡単登録。LINE公式アカウントとの連携設定もガイドに沿って数分で完了します。" },
    { num: "02", title: "初期設定・構築", desc: "リッチメニュー・配信シナリオ・フォームなどをテンプレートから選んで構築。サポートチームが代行も可能です。" },
    { num: "03", title: "運用開始", desc: "配信・分析・改善のサイクルをスタート。操作に困ったらチャットサポートがすぐに対応します。" },
  ];
  return (
    <Section id="flow">
      <div className="text-center"><Label>FLOW</Label><Title>導入の流れ</Title><Sub>最短3日で運用開始。初期設定はサポートチームが代行するため、現場の負担はほぼゼロです。</Sub></div>
      <ol className="mx-auto max-w-3xl list-none p-0 m-0">
        <StaggerChildren className="">
          {steps.map((s, i) => (
            <StaggerItem key={s.num}>
              <li className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#06C755] to-emerald-500 text-[12px] font-bold text-white shadow-lg shadow-emerald-500/20" aria-hidden="true">{s.num}</div>
                  {i < steps.length - 1 && <div className="my-1 h-full w-px bg-emerald-200/60" />}
                </div>
                <div className={i < steps.length - 1 ? "pb-10" : ""}><h3 className="mb-1 text-[15px] font-bold">{s.title}</h3><p className="text-[13px] leading-relaxed text-slate-400">{s.desc}</p></div>
              </li>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </ol>
      <div className="mt-12 text-center"><span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-6 py-2.5 text-[12px] font-semibold text-amber-700">最短3日で導入完了 / 初期設定代行あり</span></div>
    </Section>
  );
}
