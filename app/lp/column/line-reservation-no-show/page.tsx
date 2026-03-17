import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";

const SITE_URL = "https://l-ope.jp";
const self = articles[3];

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
          <li aria-current="page" className="text-slate-600 font-medium">予約管理</li>
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
            <h2 className="text-xl font-bold text-slate-800">無断キャンセルがクリニック経営に与える影響</h2>
            <p>無断キャンセル（ノーショー）は、クリニック経営における大きな課題の一つです。予約枠が空いたまま他の患者を入れることもできず、<strong>年間で数百万円の機会損失</strong>に繋がることも珍しくありません。</p>
            <p>一般的なクリニックの無断キャンセル率は5〜15%と言われています。月200件の予約があるクリニックであれば、月10〜30件の無断キャンセルが発生している計算です。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">電話リマインドの限界</h2>
            <p>多くのクリニックでは、受付スタッフが予約前日に電話でリマインドしています。しかし、この方法には深刻な課題があります。</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>患者が電話に出ない（日中は仕事中）ケースが50%以上</li>
              <li>留守電を聞いてくれない</li>
              <li>スタッフの作業負荷が大きい（1件あたり平均3分 × 20件 = 1時間）</li>
              <li>かけ直しが必要で、業務を圧迫</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">LINE予約管理で無断キャンセルを削減する5つの施策</h2>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">施策1: 前日自動リマインド</h3>
            <p>予約日の前日に、LINEで自動リマインドメッセージを送信。患者が最も確認しやすい18時〜20時に配信設定することで、確認率が最大化します。LINEの開封率は80%超のため、電話よりも確実に情報が届きます。</p>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">施策2: ワンタップ変更・キャンセル</h3>
            <p>リマインドメッセージ内に「予約変更」「キャンセル」ボタンを設置。患者が電話せずにLINE上で簡単に変更できるため、<strong>「キャンセルしたいけど電話が面倒」</strong>で無断キャンセルになるケースを防止します。</p>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">施策3: キャンセル待ち自動通知</h3>
            <p>キャンセルが発生したら、キャンセル待ちの患者にLINEで自動通知。空き枠を即座に埋めることで、キャンセルによる売上損失を最小化します。</p>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">施策4: 予約確定時の即時通知</h3>
            <p>予約確定時にLINEでその場で確認メッセージを送信。日時・場所・注意事項を明記し、患者側の記憶違いによるノーショーを防止。リッチメニューに「次回の予約を確認」ボタンを設置しておくと効果的です。</p>

            <h3 className="text-lg font-semibold text-slate-700 mt-6">施策5: 再来院促進配信</h3>
            <p>無断キャンセルした患者にも、一定期間後にフォローメッセージを配信。「次回のご予約はいかがですか？」と丁寧にアプローチすることで、離脱した患者の再来院を促します。</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">LINE予約管理の導入効果</h2>
            <p>LINE予約管理を導入したクリニックでは、以下のような効果が報告されています。</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>無断キャンセル率: 10% → <strong>2%以下</strong></li>
              <li>電話リマインド作業: 1日1時間 → <strong>ゼロ</strong>（完全自動化）</li>
              <li>キャンセル待ち→予約確定率: <strong>60%以上</strong></li>
              <li>患者満足度: 「LINEで変更できて便利」の声多数</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800">まとめ</h2>
            <p>無断キャンセル対策の本質は、<strong>患者が「面倒くさい」と感じるハードルを徹底的に下げる</strong>ことです。LINEという日常的に使うツール上で、予約確認・変更・キャンセルをワンタップで完結させることが最も効果的です。</p>
          </section>
        </article>

        <div className="mt-16 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 p-8 text-center text-white">
          <h2 className="text-xl font-extrabold">無断キャンセルをゼロに近づけませんか？</h2>
          <p className="mt-2 text-[13px] text-blue-100">Lオペ for CLINICのLINE予約管理で、自動リマインド・簡単変更・キャンセル待ち管理を実現。</p>
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
