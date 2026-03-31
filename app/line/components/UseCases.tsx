"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Section, Label, Title, Sub, MockPhone, LineChatHeader } from "./shared";
import { FadeIn, MessageBubble } from "./animations";

/* ═══════════════════════════════════════════════════════════════════════════
   業種別活用事例 — タブ切替 + LINE画面モック
   CLINICとは異なるタブ式インタラクティブUI
   ═══════════════════════════════════════════════════════════════════════════ */

const useCases = [
  {
    id: "restaurant",
    industry: "飲食店",
    icon: "🍽️",
    color: "bg-orange-50 border-orange-200",
    activeColor: "bg-orange-500 text-white",
    headline: "来店後フォローで再訪率1.5倍",
    desc: "来店後のサンクスメッセージ、曜日別クーポン配信、常連向けの限定メニュー案内まで。顧客との関係を自動で深耕します。",
    chat: [
      { text: "本日はご来店ありがとうございました！次回使える10%OFFクーポンをお送りします。", from: "other" as const },
      { text: "ありがとうございます！また行きます！", from: "me" as const },
      { text: "来週の限定メニュー「松茸の土瓶蒸し」のご案内です。ご予約はこちらから。", from: "other" as const },
    ],
    features: ["来店後サンクスメッセージ自動配信", "曜日・時間帯別クーポン配信", "ランチ/ディナーのセグメント配信", "予約リマインド自動通知"],
  },
  {
    id: "beauty",
    industry: "美容サロン",
    icon: "✨",
    color: "bg-pink-50 border-pink-200",
    activeColor: "bg-pink-500 text-white",
    headline: "リピート予約率を30%向上",
    desc: "施術後のフォローアップ、次回来店のベストタイミングでのリマインド、スタイリスト指名予約まで一元管理。",
    chat: [
      { text: "カラーの仕上がりはいかがですか？2週間後にカラーケアのご案内をお送りしますね。", from: "other" as const },
      { text: "すごく気に入ってます！ケア方法も知りたいです", from: "me" as const },
      { text: "ヘアケアTipsをお送りします。次回のご予約は45日後がおすすめです。ご予約はこちら。", from: "other" as const },
    ],
    features: ["施術後フォローアップ自動配信", "リピート促進シナリオ配信", "スタイリスト指名予約", "クーポン配信による来店促進"],
  },
  {
    id: "ec",
    industry: "ECショップ",
    icon: "🛒",
    color: "bg-emerald-50 border-emerald-200",
    activeColor: "bg-emerald-500 text-white",
    headline: "カゴ落ち回収でCV率20%改善",
    desc: "購入後レビュー依頼、カゴ落ちリマインド、新商品・セール情報のセグメント配信で売上を最大化。",
    chat: [
      { text: "カートに商品が残っています。今なら送料無料キャンペーン中です！", from: "other" as const },
      { text: "あ、忘れてた！購入します", from: "me" as const },
      { text: "ご注文ありがとうございます！発送したらお知らせしますね。", from: "other" as const },
    ],
    features: ["購入後レビュー依頼の自動配信", "カゴ落ちリマインド", "新商品・セール情報のセグメント配信", "配送状況のLINE通知"],
  },
  {
    id: "realestate",
    industry: "不動産",
    icon: "🏠",
    color: "bg-blue-50 border-blue-200",
    activeColor: "bg-blue-500 text-white",
    headline: "内見予約の無断キャンセルを80%削減",
    desc: "物件の条件マッチ配信、内見予約のリマインド、契約後のアフターフォローまで自動化。",
    chat: [
      { text: "ご希望条件に合う新着物件が出ました！駅徒歩5分・2LDK・ペット可。詳細はこちら。", from: "other" as const },
      { text: "気になります！内見したいです", from: "me" as const },
      { text: "内見予約を承りました。明日14:00にお待ちしております。持ち物リストをお送りします。", from: "other" as const },
    ],
    features: ["内見予約リマインド配信", "新着物件の条件マッチ配信", "契約後アフターフォロー自動化", "重要事項のLINE配信"],
  },
  {
    id: "school",
    industry: "教育・スクール",
    icon: "📚",
    color: "bg-violet-50 border-violet-200",
    activeColor: "bg-violet-500 text-white",
    headline: "体験レッスンからの入会率2倍",
    desc: "体験レッスン後のフォローシナリオ、授業リマインド、保護者向け一斉連絡まで一元管理。",
    chat: [
      { text: "体験レッスンのご参加ありがとうございました！入会特典のご案内です。", from: "other" as const },
      { text: "子どもがすごく楽しかったみたいです！", from: "me" as const },
      { text: "嬉しいお言葉ありがとうございます！今月中の入会で入会金50%OFFです。", from: "other" as const },
    ],
    features: ["体験レッスン後フォローシナリオ", "授業リマインド自動配信", "保護者向け一斉連絡", "月謝リマインド通知"],
  },
];

export default function UseCases() {
  const [activeId, setActiveId] = useState("restaurant");
  const active = useCases.find((uc) => uc.id === activeId)!;

  return (
    <Section id="usecases" className="bg-slate-50/50">
      <div className="text-center">
        <Label>USE CASES</Label>
        <Title>業種別の活用事例</Title>
        <Sub>飲食・美容・EC・不動産・教育など、あらゆる業種でLINE運用の成果を最大化できます。</Sub>
      </div>

      {/* 業種タブ */}
      <FadeIn>
        <div className="mx-auto mb-10 flex max-w-2xl flex-wrap justify-center gap-2">
          {useCases.map((uc) => (
            <button
              key={uc.id}
              onClick={() => setActiveId(uc.id)}
              className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
                activeId === uc.id
                  ? "bg-[#06C755] text-white shadow-md shadow-[#06C755]/20"
                  : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span className="mr-1.5">{uc.icon}</span>
              {uc.industry}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* コンテンツエリア */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="mx-auto max-w-5xl"
        >
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
            {/* 左: テキスト */}
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#06C755]/10 px-4 py-1.5 text-[12px] font-semibold text-[#06C755]">
                <span className="text-lg">{active.icon}</span>
                {active.industry}の活用例
              </div>
              <h3 className="mb-3 text-xl font-extrabold text-slate-900 md:text-2xl">{active.headline}</h3>
              <p className="mb-6 text-[14px] leading-relaxed text-slate-500">{active.desc}</p>
              <ul className="space-y-2.5">
                {active.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-[13px] text-slate-600">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#06C755]/10 text-[10px] text-[#06C755]">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* 右: LINEチャットモック */}
            <div className="flex justify-center">
              <MockPhone>
                <LineChatHeader name={`${active.industry}公式`} />
                <div className="bg-[#7DBBAB]/15 px-3 py-4" style={{ minHeight: 260 }}>
                  <div className="mb-3 text-center text-[10px] text-slate-400">活用イメージ</div>
                  <div className="space-y-3">
                    {active.chat.map((msg, i) => (
                      <MessageBubble key={`${activeId}-${i}`} text={msg.text} from={msg.from} delay={i * 0.6} />
                    ))}
                  </div>
                </div>
              </MockPhone>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Section>
  );
}
