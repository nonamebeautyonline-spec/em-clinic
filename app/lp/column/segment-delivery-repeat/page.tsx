import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";

const SITE_URL = "https://l-ope.jp";
const self = articles[4];

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
          <li aria-current="page" className="text-slate-600 font-medium">セグメント配信</li>
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
            <h2 className="text-xl font-bold text-slate-800">なぜ一斉配信ではリピート率が上がらないのか</h2>
            <p>多くのクリニックがLINE公式アカウントで一斉配信を行っていますが、全患者に同じメッセージを送っても効果は限定的です。20代の美容目的の患者と、60代の慢性疾患の患者では、必要な情報もフォローのタイミングも全く異なります。</p>
            <p>セグメント配信とは、患者を属性や行動データで分類し、<strong>それぞれのグループに最適なメッセージを届ける</strong>手法です。これにより開封率・クリック率・再来院率が大幅に向上します。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">クリニックで使える5つのセグメント</h2>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">1. 最終来院日ベース</h3>
            <p>最も基本的で効果の高いセグメントです。</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>3ヶ月以上未来院</strong> → 再診促進メッセージ「その後の体調はいかがですか？」</li>
              <li><strong>6ヶ月以上未来院</strong> → 定期検診リマインド「健康チェックの時期です」</li>
              <li><strong>1年以上未来院</strong> → 復帰促進「お変わりございませんか？新メニューのご案内」</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">2. 診療科・施術内容ベース</h3>
            <p>過去に受けた診療内容でセグメント。美容皮膚科なら「前回のレーザー治療から1ヶ月経ちました。経過はいかがですか？」のようにパーソナルなフォローが可能。</p>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">3. タグ・属性ベース</h3>
            <p>年齢層・性別・関心領域でタグ分け。「40代女性 × エイジングケア関心」のようなセグメントを作り、ターゲットに合ったキャンペーンを案内。</p>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">4. 来院回数ベース</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>初回来院後</strong> → 「ご来院ありがとうございました」+ 次回予約促進</li>
              <li><strong>3回以上来院</strong> → ロイヤル患者として特別オファー</li>
              <li><strong>VIP（10回以上）</strong> → 先行案内・優先予約などの特典</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">5. 行動トリガーベース</h3>
            <p>「予約したがキャンセルした」「問診を開始したが未完了」「配信リンクをクリックした」などの行動をトリガーに、適切なフォローメッセージを自動送信。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">セグメント配信の効果を最大化する3つのコツ</h2>
            <ol className="list-decimal pl-6 space-y-3">
              <li>
                <strong>配信タイミングを最適化する</strong>
                <p>クリニックの患者は平日日中は仕事をしていることが多いため、<strong>平日18時〜20時</strong>または<strong>土日の午前中</strong>が開封率が高い傾向。セグメントごとに最適な時間帯をテストしましょう。</p>
              </li>
              <li>
                <strong>メッセージをパーソナルにする</strong>
                <p>「〇〇様」の名前挿入だけでなく、「前回ご来院の△△から3ヶ月が経ちました」のように、<strong>患者固有の情報を含める</strong>ことで反応率が大幅に向上します。</p>
              </li>
              <li>
                <strong>配信結果を分析・改善する</strong>
                <p>開封率・クリック率・予約転換率を計測し、効果の高いメッセージテンプレートを蓄積。PDCAを回すことで、配信の精度が継続的に向上します。</p>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">実際の成果: セグメント配信 vs 一斉配信</h2>
            <div className="overflow-x-auto mt-4">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-left">
                    <th className="py-3 pr-4 font-bold text-slate-700">指標</th>
                    <th className="py-3 pr-4 font-bold text-slate-500">一斉配信</th>
                    <th className="py-3 font-bold text-blue-700">セグメント配信</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ["開封率", "60〜70%", "80〜90%"],
                    ["クリック率", "3〜5%", "10〜15%"],
                    ["予約転換率", "1〜2%", "5〜8%"],
                    ["ブロック率", "3〜5%/月", "0.5〜1%/月"],
                    ["患者満足度", "「また営業か…」", "「自分に合った情報で助かる」"],
                  ].map(([metric, mass, segment]) => (
                    <tr key={metric}>
                      <td className="py-2.5 pr-4 font-medium text-slate-700">{metric}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{mass}</td>
                      <td className="py-2.5 font-medium text-blue-700">{segment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4">特に注目すべきは<strong>ブロック率の差</strong>です。一斉配信は「自分に関係ない情報」が多くなるためブロックされやすく、友だち数が減少していきます。セグメント配信なら、患者に必要な情報だけを届けるためブロック率を低く抑えられます。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">まとめ: セグメント配信でリピート率向上を実現</h2>
            <p>セグメント配信は、クリニックのLINE活用において<strong>最もROIが高い施策</strong>の一つです。一斉配信からセグメント配信に切り替えるだけで、再来院率が20〜30%向上するケースも珍しくありません。</p>
            <p>Lオペ for CLINICなら、来院履歴・予約・決済データと連動したセグメント配信が標準機能として搭載。クリニックに最適化されたセグメント設計を簡単に実現できます。</p>
          </section>
        </article>

        <div className="mt-16 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 p-8 text-center text-white">
          <h2 className="text-xl font-extrabold">セグメント配信でリピート率を向上させませんか？</h2>
          <p className="mt-2 text-[13px] text-blue-100">Lオペ for CLINICで、データドリブンなLINE配信を実現。</p>
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
