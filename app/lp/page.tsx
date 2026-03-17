import dynamic from "next/dynamic";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Problems from "./components/Problems";
import About from "./components/About";

/* ATF（Above The Fold）以外は遅延読み込みで初期JS削減 */
const Features = dynamic(() => import("./components/Features"));
const Strengths = dynamic(() => import("./components/Strengths"));
const MidCTA = dynamic(() => import("./components/MidCTA").then((m) => ({ default: m.MidCTA })));
const MobileCTA = dynamic(() => import("./components/MobileCTA").then((m) => ({ default: m.MobileCTA })));
const UseCases = dynamic(() => import("./components/UseCases"));
const Flow = dynamic(() => import("./components/Flow").then((m) => ({ default: m.Flow })));
const Pricing = dynamic(() => import("./components/Pricing").then((m) => ({ default: m.Pricing })));
const FAQ = dynamic(() => import("./components/FAQ").then((m) => ({ default: m.FAQ })));
const FinalCTA = dynamic(() => import("./components/FinalCTA").then((m) => ({ default: m.FinalCTA })));
const Footer = dynamic(() => import("./components/Footer").then((m) => ({ default: m.Footer })));

export default function LPPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800" style={{ fontFeatureSettings: "'palt'" }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg">メインコンテンツへスキップ</a>
      <Nav />
      <main id="main-content">
        {/* パンくずリスト（視覚表示） */}
        <nav aria-label="パンくずリスト" className="mx-auto max-w-6xl px-5 pt-[72px] pb-0">
          <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
            <li><a href="https://l-ope.jp" className="hover:text-blue-600 transition">ホーム</a></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-slate-600 font-medium">Lオペ for CLINIC</li>
          </ol>
        </nav>
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
