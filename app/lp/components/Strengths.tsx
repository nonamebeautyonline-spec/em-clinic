"use client";

import { Section } from "./shared";
import { SlideIn } from "./animations";

/* ═══════════════════════════════════════════════════════════ STRENGTHS ═══ */
export default function Strengths() {
  const cards = [
    { num: "01", title: "院長＋事務1人で全業務完結", sub: "人件費を最小化しながら最大の成果を", points: ["カルテ・予約・LINE配信・CRM・決済・配送…すべてが1つの管理画面に集約。事務スタッフ1人ですべて回せる", "自動リマインド・自動フォローアップ・AI自動返信で、手作業の連絡業務をほぼゼロに", "ITに詳しくないスタッフでもノーコードで操作完結。エンジニア不要、外注費ゼロ"] },
    { num: "02", title: "ツール代＋人件費まるごと削減", sub: "vs. カルテ・予約・CRMを個別契約", points: ["カルテ（月5〜10万）＋予約システム（月3〜5万）＋LINE配信/CRM（月5〜10万）…個別導入で月額15〜30万。Lオペなら月15〜20万でオールインワン", "複数ツールの管理に必要だった人員が不要に。人件費も含めたトータルコストで大幅削減", "1つのツールを覚えるだけ。スタッフの学習コスト・ツール間の二重入力もゼロ"] },
    { num: "03", title: "すべてがLINEで自動化", sub: "通知も業務連携もすべて自動", points: ["予約確定・リマインド・決済完了・発送通知・追跡番号…すべてのステータス変化がLINEに自動通知。電話・メールの取りこぼしゼロ", "患者はLINEを見るだけで自分の状況を把握。問い合わせ電話が激減し、受付業務を大幅削減", "リッチメニュー・配信・自動アクションもGUIで即設定。管理画面から院長自身がすぐ反映"] },
    { num: "04", title: "スマホでどこからでも管理", sub: "LINE通知bot + モバイル管理画面", points: ["LINE通知botが予約・決済・AI返信の状況をリアルタイムにプッシュ通知。外出先でも状況を即把握", "スマホのブラウザからトーク画面を操作し、AI返信の承認・メッセージ送信・決済確認が可能", "PCがなくても患者対応が止まらない。休憩中・移動中でもワンタップで対応完了"] },
  ];

  return (
    <Section id="strengths" className="bg-slate-900 text-white">
      <div className="text-center">
        <span className="mb-4 inline-block rounded-full bg-blue-500/10 px-4 py-1.5 text-[11px] font-semibold tracking-[.18em] text-blue-400 uppercase">STRENGTHS</span>
        <h2 className="mb-5 text-[1.7rem] font-extrabold leading-snug tracking-tight text-white md:text-4xl">Lオペ for CLINIC が選ばれる<br className="md:hidden" />4つの理由</h2>
        <p className="mx-auto mb-16 max-w-2xl text-[14px] leading-relaxed text-slate-400">院長と事務スタッフ1人だけで、カルテ・予約・LINE配信・CRM・決済・配送まですべて回せる。複数ツールの契約も追加人員も不要にする「少人数クリニック起点」の設計思想が、Lオペ最大の差別化です。</p>
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
