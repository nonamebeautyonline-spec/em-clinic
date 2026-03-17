import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[2];

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: self.title,
  description: self.description,
  datePublished: self.date,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "クリニックDXをLINE公式アカウントから始める段階的なロードマップ",
  "5ステップで予約・問診・会計・配送をデジタル化する方法",
  "DX導入で失敗しないためのポイントと対策",
];

const toc = [
  { id: "what-is-dx", label: "クリニックDXとは" },
  { id: "why-line", label: "LINE公式アカウントが最適な理由" },
  { id: "five-steps", label: "5つのステップ" },
  { id: "avoid-failure", label: "DXで失敗しないために" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="DXガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h2 id="what-is-dx" className="text-xl font-bold text-slate-800">クリニックDXとは何か</h2>
        <p>DX（デジタルトランスフォーメーション）とは、デジタル技術を活用して業務プロセスやサービス提供の方法を根本的に変革することです。クリニックにおけるDXとは、紙やExcel、電話に頼っていた業務をデジタル化し、<strong>患者体験の向上と業務効率化を同時に実現</strong>することを指します。</p>
        <p>しかし、「何から始めればいいのか分からない」という声も多く聞かれます。このガイドでは、LINE公式アカウントを起点にした段階的なDXの進め方を解説します。</p>
      </section>

      <section>
        <h2 id="why-line" className="text-xl font-bold text-slate-800">なぜLINE公式アカウントがDXの起点として最適なのか</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>患者の利用率が圧倒的</strong> — 日本のLINEユーザーは9,700万人超。新しいアプリをインストールしてもらう必要がない</li>
          <li><strong>メール・電話より確実に届く</strong> — 開封率80%超。SMSと同等の到達率でコストは大幅に低い</li>
          <li><strong>双方向コミュニケーション</strong> — 患者からの問い合わせもLINE上で完結。電話の取りこぼしがゼロに</li>
          <li><strong>段階的に機能を拡張できる</strong> — まずは配信から始め、予約・問診・決済と段階的にDX領域を広げられる</li>
        </ul>
      </section>

      <section>
        <h2 id="five-steps" className="text-xl font-bold text-slate-800">クリニックDXの5つのステップ</h2>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">ステップ1: LINE公式アカウント開設（1日目）</h3>
        <p>まずはLINE公式アカウントを開設し、Messaging APIを設定します。院内にQRコードを掲示し、来院患者に友だち追加を促します。この段階ではLINEを「連絡手段」として活用するだけでもOK。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">ステップ2: リッチメニュー+自動応答の設定（1週間目）</h3>
        <p>患者がLINEを開いた時に表示されるリッチメニューを設定。「予約する」「問診票を記入」「アクセス」などのボタンを配置し、よくある質問にはAI自動返信を設定。これだけで電話問い合わせが大幅に減少します。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">ステップ3: オンライン問診+予約管理（2週間目）</h3>
        <p>紙の問診票をLINE上のフォームに移行。来院前に問診を完了してもらうことで、待ち時間を短縮。予約もLINE上で完結させ、前日に自動リマインドを送信。無断キャンセルが激減します。</p>

        <InlineCTA />

        <h3 className="text-lg font-semibold text-slate-700 mt-6">ステップ4: セグメント配信+患者CRM（1ヶ月目）</h3>
        <p>来院履歴・診療科・タグなどのデータが蓄積されてきたら、セグメント配信を開始。再診促進・キャンペーン告知・定期検診リマインドなど、患者ごとに最適なメッセージを配信。リピート率が大幅に向上します。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">ステップ5: 決済・配送・分析の統合（2ヶ月目〜）</h3>
        <p>オンライン決済を導入し、LINE上で決済完了。処方薬やサプリメントの配送管理も統合。ダッシュボードで売上・予約数・リピート率・LTVなどのKPIをリアルタイムで確認。データに基づいた経営判断が可能に。</p>
      </section>

      <section>
        <h2 id="avoid-failure" className="text-xl font-bold text-slate-800">DXで失敗しないために</h2>
        <p>クリニックDXでよくある失敗パターンと対策です。</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>一度にすべてをやろうとする</strong> → 段階的に導入。まずはステップ1-2から始め、現場が慣れてから拡張</li>
          <li><strong>スタッフの理解を得られない</strong> → 「電話対応が減る」「手作業が減る」という具体的メリットを示す</li>
          <li><strong>ツール選びを間違える</strong> → 汎用ツールの組み合わせは管理が煩雑に。クリニック専用のオールインワンツールを選ぶ</li>
          <li><strong>運用が続かない</strong> → 自動化できる部分は徹底的に自動化。手動作業を残さない設計にする</li>
        </ul>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-slate-800">まとめ: LINE公式アカウントからDXを始めよう</h2>
        <p>クリニックDXは、LINE公式アカウントという「患者がすでに使っているチャネル」から始めるのが最も効果的です。紙→デジタル、電話→LINE、手作業→自動化を段階的に進めることで、<strong>スタッフの業務負担を削減しながら患者満足度を向上</strong>させることができます。</p>
        <p>Lオペ for CLINICは、この5ステップをすべてワンストップで実現できるクリニック専用プラットフォームです。</p>
      </section>
    </ArticleLayout>
  );
}
