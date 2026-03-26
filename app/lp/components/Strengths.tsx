"use client";

import { Section } from "./shared";
import { SlideIn } from "./animations";

/* ═══════════════════════════════════════════════════════════ STRENGTHS ═══ */
export default function Strengths() {
  const cards = [
    { num: "01", title: "院長＋事務1人で全業務完結", sub: "ツール代も人件費もまるごと削減", points: ["カルテ・予約・LINE配信・CRM・決済・配送…すべてが1つの管理画面に集約。事務スタッフ1人ですべて回せる", "カルテ＋予約＋LINE配信を個別契約すると月15〜30万。Lオペならオールインワンで複数ツール不要、人件費も含めたトータルコストを大幅削減", "自動リマインド・自動フォローアップ・AI自動返信で手作業の連絡業務をほぼゼロに。ITに詳しくないスタッフでもノーコードで操作完結"] },
    { num: "02", title: "使うほど賢くなるプラットフォーム", sub: "AIがクリニック固有のナレッジを自動学習", points: ["スタッフが修正した返信・手動で送ったメッセージをAIが自動で学習。クリニックごとの言い回し・対応方針を日々習得し、返信のトーンまで忠実に再現する", "使い込むほどAI返信の精度が向上。導入直後と3ヶ月後では対応品質が大きく変わる。よくある質問はAIが自動で対応完了し、スタッフの確認作業が激減する", "学習データは管理画面から確認・編集・削除が可能。AIの学習内容を常にコントロールでき、不適切な学習があればワンクリックで除外。ナレッジベースの直接編集にも対応"] },
    { num: "03", title: "すべてがLINEで自動化", sub: "通知も業務連携もすべて自動", points: ["予約確定・リマインド・決済完了・発送通知・追跡番号…すべてのステータス変化がLINEに自動通知。電話・メールの取りこぼしゼロで、患者満足度の向上にもつながる", "患者はLINEを見るだけで予約・決済・配送の状況を把握。問い合わせ電話が激減し、受付業務を大幅に削減できる。再処方の案内も自動配信でリピート率がアップ", "リッチメニュー・セグメント配信・自動アクションもGUIで即設定。管理画面から院長自身がすぐ反映できる。フロービルダーでステップ配信やA/Bテストも簡単に構築可能"] },
    { num: "04", title: "スマホでどこからでも管理", sub: "LINE通知bot + モバイル管理画面", points: ["LINE通知botが予約・決済・AI返信の状況をリアルタイムにプッシュ通知。外出先・自宅・移動中どこにいても状況を即把握でき、対応漏れを確実に防止できる", "スマホのブラウザからトーク画面を操作し、AI返信の承認・メッセージ送信・決済確認まですべて可能。タブレットでも快適に動作するレスポンシブ設計で端末を選ばない", "PCがなくても患者対応が止まらない。休憩中・移動中でもワンタップで対応完了。急ぎの問い合わせにもすぐ対応でき、院長1人体制のクリニックでも安心して運用できる"] },
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
            <div className="flex h-full flex-col rounded-2xl border border-slate-700/50 bg-slate-800/40 p-7 backdrop-blur">
              <div className="mb-3 bg-gradient-to-r from-blue-400 to-sky-400 bg-clip-text text-3xl font-black text-transparent">{s.num}</div>
              <h3 className="mb-1 min-h-[3.5rem] text-lg font-bold">{s.title}</h3>
              <p className="mb-5 text-[11px] font-semibold text-blue-400">{s.sub}</p>
              <ul className="flex-1 space-y-3">{s.points.map((p, pi) => <li key={pi} className="flex gap-3 text-[12px] leading-relaxed text-slate-300"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[8px] text-blue-400">&#10003;</span>{p}</li>)}</ul>
            </div>
          </SlideIn>
        ))}
      </div>
    </Section>
  );
}
