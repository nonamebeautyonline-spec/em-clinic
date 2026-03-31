"use client";

import { Section, Label, Title, Sub } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

export function Flow() {
  const steps = [
    { num: "01", title: "無料相談・ヒアリング", desc: "お問い合わせフォームから簡単にご相談。ECサイトの課題や目標をヒアリングし、最適なプランをご提案します。" },
    { num: "02", title: "ECカート連携・初期設定", desc: "Shopify・BASE・STORES等との連携設定と、カゴ落ち対策・発送通知・配信シナリオのテンプレート構築を代行します。" },
    { num: "03", title: "運用開始・効果改善", desc: "配信・分析・改善のサイクルをスタート。専任担当が売上データをもとに配信戦略の最適化を継続的にサポートします。" },
  ];
  return (
    <Section id="flow">
      <div className="text-center"><Label>FLOW</Label><Title>導入の流れ</Title><Sub>最短3日で運用開始。ECカートとの連携設定や配信シナリオの構築はサポートチームが代行します。</Sub></div>
      <ol className="mx-auto max-w-3xl list-none p-0 m-0">
        <StaggerChildren className="">
          {steps.map((s, i) => (
            <StaggerItem key={s.num}>
              <li className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-stone-700 to-amber-700 text-[12px] font-bold text-white shadow-lg shadow-stone-500/20" aria-hidden="true">{s.num}</div>
                  {i < steps.length - 1 && <div className="my-1 h-full w-px bg-stone-200/60" />}
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
