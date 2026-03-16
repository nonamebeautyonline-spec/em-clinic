import Nav from "./components/Nav";
import Hero from "./components/Hero";

import Problems from "./components/Problems";
import About from "./components/About";
import Features from "./components/Features";
import Strengths from "./components/Strengths";
import { MidCTA } from "./components/MidCTA";
import { MobileCTA } from "./components/MobileCTA";
import UseCases from "./components/UseCases";
import { Flow } from "./components/Flow";
import { Pricing } from "./components/Pricing";
import { FAQ } from "./components/FAQ";
import { FinalCTA } from "./components/FinalCTA";
import { Footer } from "./components/Footer";

export default function LPPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800" style={{ fontFeatureSettings: "'palt'" }}>
      <Nav />
      <main>
        <Hero />
        <Problems />
        <About />
        <Features />
        <MidCTA title="これだけの機能をオールインワンで" sub="予約・問診・LINE配信・決済・配送管理まで、すべて込み。複数ツールの月額を大幅に削減できます。" />
        <Strengths />
        <MidCTA title="まずは無料で資料請求" sub="貴院の課題に合わせたデモのご案内も可能です。お気軽にお問い合わせください。" />
        <UseCases />
        <MidCTA title="貴院でも同じ効果を実現しませんか？" sub="導入クリニックの業務効率化事例をもとに、最適なプランをご提案します。" />
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
