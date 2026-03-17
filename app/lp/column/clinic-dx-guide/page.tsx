import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";

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

export default function Page() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="パンくずリスト" className="mx-auto max-w-3xl px-5 pt-20 pb-0">
        <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
          <li><a href="https://l-ope.jp" className="hover:text-blue-600 transition">ホーム</a></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/lp" className="hover:text-blue-600 transition">Lオペ for CLINIC</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/lp/column" className="hover:text-blue-600 transition">コラム</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-600 font-medium">DXガイド</li>
        </ol>
      </nav>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <div className="flex items-center gap-3 text-[11px]">
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700">{self.category}</span>
          <time className="text-slate-400">{self.date}</time>
          <span className="text-slate-400">{self.readTime}</span>
        </div>

        <h1 className="mt-4 text-2xl font-extrabold leading-snug tracking-tight md:text-3xl">{self.title}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-500">{self.description}</p>

        <article className="prose-article mt-12 space-y-10 text-[15px] leading-[1.9] text-slate-600">

          <section>
            <h2 className="text-xl font-bold text-slate-800">クリニックDXとは何か</h2>
            <p>DX（デジタルトランスフォーメーション）とは、デジタル技術を活用して業務プロセスやサービス提供の方法を根本的に変革することです。クリニックにおけるDXとは、紙やExcel、電話に頼っていた業務をデジタル化し、<strong>患者体験の向上と業務効率化を同時に実現</strong>することを指します。</p>
            <p>しかし、「何から始めればいいのか分からない」という声も多く聞かれます。このガイドでは、LINE公式アカウントを起点にした段階的なDXの進め方を解説します。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">なぜLINE公式アカウントがDXの起点として最適なのか</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>患者の利用率が圧倒的</strong> — 日本のLINEユーザーは9,700万人超。新しいアプリをインストールしてもらう必要がない</li>
              <li><strong>メール・電話より確実に届く</strong> — 開封率80%超。SMSと同等の到達率でコストは大幅に低い</li>
              <li><strong>双方向コミュニケーション</strong> — 患者からの問い合わせもLINE上で完結。電話の取りこぼしがゼロに</li>
              <li><strong>段階的に機能を拡張できる</strong> — まずは配信から始め、予約・問診・決済と段階的にDX領域を広げられる</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">クリニックDXの5つのステップ</h2>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">ステップ1: LINE公式アカウント開設（1日目）</h3>
            <p>まずはLINE公式アカウントを開設し、Messaging APIを設定します。院内にQRコードを掲示し、来院患者に友だち追加を促します。この段階ではLINEを「連絡手段」として活用するだけでもOK。</p>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">ステップ2: リッチメニュー+自動応答の設定（1週間目）</h3>
            <p>患者がLINEを開いた時に表示されるリッチメニューを設定。「予約する」「問診票を記入」「アクセス」などのボタンを配置し、よくある質問にはAI自動返信を設定。これだけで電話問い合わせが大幅に減少します。</p>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">ステップ3: オンライン問診+予約管理（2週間目）</h3>
            <p>紙の問診票をLINE上のフォームに移行。来院前に問診を完了してもらうことで、待ち時間を短縮。予約もLINE上で完結させ、前日に自動リマインドを送信。無断キャンセルが激減します。</p>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">ステップ4: セグメント配信+患者CRM（1ヶ月目）</h3>
            <p>来院履歴・診療科・タグなどのデータが蓄積されてきたら、セグメント配信を開始。再診促進・キャンペーン告知・定期検診リマインドなど、患者ごとに最適なメッセージを配信。リピート率が大幅に向上します。</p>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">ステップ5: 決済・配送・分析の統合（2ヶ月目〜）</h3>
            <p>オンライン決済を導入し、LINE上で決済完了。処方薬やサプリメントの配送管理も統合。ダッシュボードで売上・予約数・リピート率・LTVなどのKPIをリアルタイムで確認。データに基づいた経営判断が可能に。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">DXで失敗しないために</h2>
            <p>クリニックDXでよくある失敗パターンと対策です。</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>一度にすべてをやろうとする</strong> → 段階的に導入。まずはステップ1-2から始め、現場が慣れてから拡張</li>
              <li><strong>スタッフの理解を得られない</strong> → 「電話対応が減る」「手作業が減る」という具体的メリットを示す</li>
              <li><strong>ツール選びを間違える</strong> → 汎用ツールの組み合わせは管理が煩雑に。クリニック専用のオールインワンツールを選ぶ</li>
              <li><strong>運用が続かない</strong> → 自動化できる部分は徹底的に自動化。手動作業を残さない設計にする</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">まとめ: LINE公式アカウントからDXを始めよう</h2>
            <p>クリニックDXは、LINE公式アカウントという「患者がすでに使っているチャネル」から始めるのが最も効果的です。紙→デジタル、電話→LINE、手作業→自動化を段階的に進めることで、<strong>スタッフの業務負担を削減しながら患者満足度を向上</strong>させることができます。</p>
            <p>Lオペ for CLINICは、この5ステップをすべてワンストップで実現できるクリニック専用プラットフォームです。</p>
          </section>
        </article>

        <div className="mt-16 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 p-8 text-center text-white">
          <h2 className="text-xl font-extrabold">クリニックDXを始めませんか？</h2>
          <p className="mt-2 text-[13px] text-blue-100">初期設定サポート無料。最短2週間で運用開始可能です。</p>
          <a href="/lp/contact" className="mt-4 inline-block rounded-xl bg-white px-8 py-3 text-[13px] font-bold text-blue-600 shadow-lg transition hover:shadow-xl">無料で資料請求</a>
        </div>

        <div className="mt-12">
          <h2 className="text-lg font-bold text-slate-800">関連記事</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {articles.filter((a) => a.slug !== self.slug).slice(0, 4).map((a) => (
              <Link key={a.slug} href={`/lp/column/${a.slug}`} className="rounded-xl border border-slate-100 p-4 text-[13px] font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-600">
                {a.title}
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-[12px] text-slate-400">
        <Link href="/lp" className="hover:text-blue-600">← Lオペ for CLINIC トップに戻る</Link>
      </footer>
    </div>
  );
}
