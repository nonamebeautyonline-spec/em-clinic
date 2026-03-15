"use client";

import { Section, Label, Title, Sub } from "./shared";
import { StaggerChildren, StaggerItem } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   導入の流れ
   ═══════════════════════════════════════════════════════════════════════════ */

export function Flow() {
  const steps = [
    { num: "01", title: "お問い合わせ", desc: "フォームまたはLINEからご相談。デモ画面をお見せしながら貴院の課題をヒアリングします。" },
    { num: "02", title: "プラン決定", desc: "貴院の規模・診療科・運用体制に合わせた最適プランをご提案。ご契約後、導入準備を開始。" },
    { num: "03", title: "環境構築・設定代行", desc: "LINE連携・リッチメニュー初期構築・問診フォーム作成・患者データ移行をサポートチームが代行。" },
    { num: "04", title: "運用開始", desc: "スタッフ向け操作研修を実施し運用開始。導入後も専任担当が活用提案をサポートします。" },
  ];
  return (
    <Section id="flow">
      <div className="text-center"><Label>FLOW</Label><Title>導入の流れ</Title><Sub>お問い合わせから最短2週間で運用開始。初期設定はサポートチームが代行するため、現場の負担はほぼゼロです。</Sub></div>
      <StaggerChildren className="mx-auto max-w-3xl">
        {steps.map((s, i) => (
          <StaggerItem key={s.num}>
            <div className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 text-[12px] font-bold text-white shadow-lg shadow-blue-500/20">{s.num}</div>
                {i < steps.length - 1 && <div className="my-1 h-full w-px bg-blue-200/60" />}
              </div>
              <div className={i < steps.length - 1 ? "pb-10" : ""}><h4 className="mb-1 text-[15px] font-bold">{s.title}</h4><p className="text-[13px] leading-relaxed text-slate-400">{s.desc}</p></div>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>
      <div className="mt-12 text-center"><span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-6 py-2.5 text-[12px] font-semibold text-amber-700">最短2週間で導入完了 / 初期設定代行あり</span></div>
    </Section>
  );
}
