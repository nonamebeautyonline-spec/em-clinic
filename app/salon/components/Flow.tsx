"use client";

import { Section, Label, Title, Sub } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

export function Flow() {
  const steps = [
    { num: "01", title: "無料相談・ヒアリング", desc: "サロンの業態・規模・課題をヒアリング。最適なプランと活用方法をご提案します。LINE公式アカウント未開設の場合も代行サポート。" },
    { num: "02", title: "初期設定・構築", desc: "リッチメニュー・スタンプカード・配信シナリオなどをサロンに合わせて構築。テンプレートとサポートチームの代行で負担はほぼゼロ。" },
    { num: "03", title: "運用開始", desc: "予約管理・顧客管理・配信・物販をスタート。操作に困ったらチャットサポートがすぐに対応。リピート率改善の提案も定期的に実施します。" },
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
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-400 text-[12px] font-bold text-white shadow-lg shadow-pink-500/20" aria-hidden="true">{s.num}</div>
                  {i < steps.length - 1 && <div className="my-1 h-full w-px bg-pink-200/60" />}
                </div>
                <div className={i < steps.length - 1 ? "pb-10" : ""}><h3 className="mb-1 text-[15px] font-bold">{s.title}</h3><p className="text-[13px] leading-relaxed text-slate-400">{s.desc}</p></div>
              </li>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </ol>
      <div className="mt-12 text-center"><span className="inline-block rounded-full border border-pink-200 bg-pink-50 px-6 py-2.5 text-[12px] font-semibold text-pink-700">最短3日で導入完了 / 初期設定代行あり</span></div>
    </Section>
  );
}
