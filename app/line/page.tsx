import type { Metadata } from "next";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Problems from "./components/Problems";
import Features from "./components/Features";
import Strengths from "./components/Strengths";
import UseCases from "./components/UseCases";
import { MidCTA } from "./components/MidCTA";
import { MobileCTA } from "./components/MobileCTA";
import { Flow } from "./components/Flow";
import { Pricing } from "./components/Pricing";
import { FAQ } from "./components/FAQ";
import { FinalCTA } from "./components/FinalCTA";
import { Footer } from "./components/Footer";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://l-ope.jp/line",
  },
};

export default function LineLPPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-800" style={{ fontFeatureSettings: "'palt'" }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:bg-[#06C755] focus:px-4 focus:py-2 focus:text-white focus:shadow-lg">メインコンテンツへスキップ</a>
      <Nav />
      <main id="main-content">
        {/* パンくずリスト */}
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-5 pt-[90px] md:pt-[72px] pb-0">
          <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
            <li><a href="https://l-ope.jp" className="hover:text-[#06C755] transition">ホーム</a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-slate-600 font-medium">Lオペ for LINE</li>
          </ol>
        </nav>
        <Hero />
        <Problems />
        <Features />
        <MidCTA title="これだけの機能がオールインワン" sub="セグメント配信・シナリオ配信・リッチメニュー・予約・フォーム・分析まで。複数ツールの月額を大幅に削減できます。" />
        <Strengths />
        <MidCTA title="まずは無料で始めてみませんか？" sub="月間5,000通まで完全無料。クレジットカード不要で今すぐお試しいただけます。" />
        <UseCases />
        <MidCTA title="あなたの業種でも成果を出しませんか？" sub="業種別のテンプレートと導入事例をもとに、最適な活用方法をご提案します。" />
        <Flow />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <MobileCTA />
      <Footer />
    </div>
  );
}
