import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";

const SITE_URL = "https://l-ope.jp";
const self = articles[1];

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: {
    title: self.title,
    description: self.description,
    url: `${SITE_URL}/lp/column/${self.slug}`,
    type: "article",
    publishedTime: self.date,
  },
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
          <li aria-current="page" className="text-slate-600 font-medium">ツール比較</li>
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
            <h2 className="text-xl font-bold text-slate-800">クリニックがLINE配信ツールを選ぶ際の落とし穴</h2>
            <p>「LINE公式アカウントをもっと活用したい」と考えたとき、まず候補に上がるのがLステップやLinyなどの汎用LINE配信ツールです。これらは飲食・EC・美容サロンなど幅広い業種に対応しており、高機能なツールです。</p>
            <p>しかし、クリニックには医療特有の業務フローがあり、<strong>汎用ツールでは対応しきれない領域</strong>が多く存在します。ここでは、具体的にどこが違うのかを徹底比較します。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">比較表: 汎用ツール vs クリニック専用ツール</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-left">
                    <th className="py-3 pr-4 font-bold text-slate-700">比較項目</th>
                    <th className="py-3 pr-4 font-bold text-slate-700">Lステップ・Liny等</th>
                    <th className="py-3 font-bold text-blue-700">Lオペ for CLINIC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ["対象業種", "飲食・EC・サロン等 汎用", "クリニック専用設計"],
                    ["患者CRM", "顧客管理（汎用）", "患者CRM（来院履歴・処方・タグ）"],
                    ["オンライン問診", "フォーム作成のみ", "医療問診 → 予約 → 来院フロー統合"],
                    ["予約管理", "外部連携 or なし", "LINE上で予約完結＋自動リマインド"],
                    ["カルテ管理", "非対応", "SOAP形式カルテ＋音声カルテ"],
                    ["決済管理", "非対応", "Square/GMO連携オンライン決済"],
                    ["配送管理", "非対応", "処方薬配送CSV＋追跡番号自動通知"],
                    ["AI自動返信", "チャットボット（ルールベース）", "AI返信＋スタッフ修正学習"],
                    ["リッチメニュー", "テンプレート選択", "ノーコードビルダー＋患者状態連動切替"],
                    ["セグメント配信", "タグ・属性ベース", "来院履歴・予約・決済データ連動"],
                    ["導入サポート", "オンラインマニュアル中心", "専任担当のワンストップ伴走"],
                  ].map(([item, generic, lope]) => (
                    <tr key={item}>
                      <td className="py-2.5 pr-4 font-medium text-slate-700">{item}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{generic}</td>
                      <td className="py-2.5 font-medium text-blue-700">{lope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">Lステップ・Linyが向いているケース</h2>
            <p>汎用ツールが有効なのは以下のようなケースです。</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>飲食・EC・サロンなど、予約→来店で完結するビジネス</li>
              <li>LINE配信（メッセージマーケティング）が主目的</li>
              <li>決済・配送・カルテなどの業務管理は別システムで完結している</li>
              <li>既にLステップのシナリオ構築に習熟したスタッフがいる</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">クリニック専用ツールが必要な理由</h2>
            <p>クリニックの業務フローは「<strong>問診→予約→診察→処方→決済→配送→フォロー</strong>」という長いチェーンです。汎用ツールはこのチェーンの一部（配信・タグ管理）にしか対応できません。</p>
            <p>クリニック専用ツールを使うべき決定的な理由は3つです。</p>
            <ol className="list-decimal pl-6 space-y-2">
              <li><strong>データが分断されない</strong> — LINE上の問い合わせ、予約状況、来院履歴、決済情報、配送状態がすべて1つの画面で連携。患者対応の抜け漏れがゼロに</li>
              <li><strong>複数SaaSの費用を集約</strong> — 予約システム＋LINE配信ツール＋決済サービス＋配送管理を個別契約すると月額10万円超。オールインワンで大幅コスト削減</li>
              <li><strong>医療特化の自動化シナリオ</strong> — 「友だち追加→問診→予約→リマインド→決済→配送→再診促進」が自動フロー。汎用ツールでは実現困難</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">費用の違い: 複数SaaS vs オールインワン</h2>
            <p>クリニックが汎用ツール＋各種SaaSを組み合わせた場合と、クリニック専用オールインワンツールを使った場合の費用を比較します。</p>
            <div className="rounded-xl border border-slate-200 p-5 mt-4">
              <h3 className="text-lg font-semibold text-slate-700">汎用ツール組み合わせ（月額概算）</h3>
              <ul className="mt-2 space-y-1 text-[13px] text-slate-500">
                <li>LINE配信ツール（Lステップ等）: 月額1〜3万円</li>
                <li>予約管理システム: 月額1〜2万円</li>
                <li>オンライン問診システム: 月額1〜2万円</li>
                <li>決済サービス手数料: 別途</li>
                <li>配送管理: 手作業 or 別途ツール</li>
                <li className="font-bold text-slate-700 pt-2">合計: 月額3〜7万円+（機能が分断）</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-5 mt-4">
              <h3 className="text-lg font-semibold text-blue-700">Lオペ for CLINIC（オールインワン）</h3>
              <p className="mt-2 text-[13px] text-slate-600">上記すべての機能を1プランに集約。データ連携済み・学習コストも最小。詳細は<a href="/lp/contact" className="text-blue-600 underline">お問い合わせ</a>ください。</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">まとめ: クリニックには専用ツールを選ぶべき</h2>
            <p>Lステップ・Linyは優れたLINE配信ツールですが、クリニックの業務フロー全体をカバーするには力不足です。<strong>LINE配信だけでなく、予約・問診・カルテ・決済・配送まで統合管理</strong>したいクリニックには、専用設計のツールが最適解です。</p>
          </section>
        </article>

        <div className="mt-16 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 p-8 text-center text-white">
          <h2 className="text-xl font-extrabold">汎用ツールからの乗り換えもサポート</h2>
          <p className="mt-2 text-[13px] text-blue-100">Lステップ等からの移行・データ移行もお任せください。</p>
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
