"use client";

import { Section } from "./shared";
import { SlideIn } from "./animations";

/* ═══════════════════════════════════════════════════════════ STRENGTHS ═══ */
export default function Strengths() {
  const cards = [
    { num: "01", title: "クリニック専用設計", sub: "vs. 汎用LINEツール", points: ["Lステップ等は飲食・EC向け。医療特有の「問診→予約→診療→処方→フォロー」導線に未対応", "患者CRM・対応マーク・処方管理・配送追跡まで、クリニック業務フローに完全特化", "友だち追加時の自動問診誘導・診療後の自動フォローなど医療最適シナリオをプリセット"] },
    { num: "02", title: "真のオールインワン", sub: "vs. 単機能SaaS複数利用", points: ["予約＋LINE配信＋会計＋配送管理…月額10万超のツール代を1本に集約", "「LINE登録→問診→予約→来院→決済→配送」まで1画面で追跡。データ分断ゼロ", "スタッフのツール間移動・二重入力がゼロに。学習コストも大幅削減"] },
    { num: "03", title: "すべてがLINEに届く", sub: "vs. メール・電話の取りこぼし", points: ["予約確定・リマインド・決済完了・発送通知・追跡番号…すべてのステータス変化がLINEに自動通知", "患者はLINEを見るだけで自分の状況を把握。電話やメールの確認漏れをゼロに", "スタッフも手動連絡が不要。予約→決済→発送の全フローで通知が自動化され業務負担を大幅削減"] },
    { num: "04", title: "ノーコードで現場完結", sub: "vs. エンジニア依存", points: ["リッチメニュー・フォーム・自動アクションの構築がすべてGUI操作で完結", "「キャンペーン用リッチメニューを差し替えたい」→管理画面から即反映。開発待ちゼロ", "条件分岐・遅延送信・セグメント配信も直感操作。ITに詳しくないスタッフでも運用可能"] },
  ];

  return (
    <Section id="strengths" className="bg-slate-900 text-white">
      <div className="text-center">
        <span className="mb-4 inline-block rounded-full bg-blue-500/10 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-blue-400 uppercase">STRENGTHS</span>
        <h2 className="mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-white md:text-4xl">Lオペ for CLINIC が選ばれる<br className="md:hidden" />4つの理由</h2>
        <p className="mx-auto mb-16 max-w-2xl text-[14px] leading-relaxed text-slate-400">汎用LINEマーケツールでもなく、単なる予約システムでもない。クリニック業務に深く入り込んだ「現場起点」の設計思想が最大の差別化です。</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((s, i) => (
          <SlideIn key={s.num} from={i % 2 === 0 ? "left" : "right"} delay={i * 0.1}>
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-7 backdrop-blur">
              <div className="mb-3 bg-gradient-to-r from-blue-400 to-sky-400 bg-clip-text text-3xl font-black text-transparent">{s.num}</div>
              <h3 className="mb-1 text-lg font-bold">{s.title}</h3>
              <p className="mb-5 text-[11px] font-semibold text-blue-400">{s.sub}</p>
              <ul className="space-y-3">{s.points.map((p, pi) => <li key={pi} className="flex gap-3 text-[12px] leading-relaxed text-slate-300"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[8px] text-blue-400">&#10003;</span>{p}</li>)}</ul>
            </div>
          </SlideIn>
        ))}
      </div>
    </Section>
  );
}
