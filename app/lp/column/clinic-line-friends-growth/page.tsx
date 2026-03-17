import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[5];

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
  "友だち数がクリニック売上に直結する理由",
  "すぐに実践できる7つの友だち獲得施策",
  "月100人ペースを実現するKPI設計の方法",
];

const toc = [
  { id: "why-friends-matter", label: "友だち数が重要な理由" },
  { id: "strategy-1", label: "施策1: 院内POP・QRコード" },
  { id: "strategy-2", label: "施策2: 受付スタッフの声かけ" },
  { id: "strategy-3", label: "施策3: 友だち追加特典" },
  { id: "strategy-4", label: "施策4: Web・Googleマップ導線" },
  { id: "strategy-5", label: "施策5: SNS導線" },
  { id: "strategy-6", label: "施策6: チラシ・ショップカード" },
  { id: "strategy-7", label: "施策7: SMS・メール案内" },
  { id: "kpi-design", label: "月100人のKPI設計" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="友だち集め" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h2 id="why-friends-matter" className="text-xl font-bold text-slate-800">なぜ友だち数がクリニック経営に直結するのか</h2>
        <p>LINE公式アカウントの運用効果は、シンプルに<strong>「リーチ率 × 友だち数 = 売上インパクト」</strong>という構造で決まります。どれだけ良い配信コンテンツを用意しても、友だち数が少なければ届く母数が限られ、予約・来院につながる件数も小さくなります。</p>
        <p>たとえば友だち数500人のクリニックが配信で5%の予約転換率を達成した場合、予約数は25件。一方、友だち数2,000人なら同じ転換率で100件の予約が生まれます。つまり<strong>友だち数は売上のレバレッジ</strong>であり、最優先で増やすべき指標です。</p>
        <p>さらに、友だち数が増えるとセグメント配信の精度も向上します。母数が多いほどセグメントごとのサンプル数が確保でき、配信効果の検証・改善サイクルが回しやすくなるためです。</p>
      </section>

      <section>
        <h2 id="strategy-1" className="text-xl font-bold text-slate-800">施策1: 院内POPとQRコード</h2>
        <p>最も確実に友だちを増やせるのが、来院患者へのアプローチです。受付カウンター・待合室・診察室・会計窓口など、<strong>患者が滞在するすべてのポイントにQRコードを設置</strong>しましょう。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>受付カウンター</strong>: A4サイズのスタンドPOP。「LINE登録で次回予約がスムーズに」と具体的メリットを記載</li>
          <li><strong>待合室テーブル</strong>: 待ち時間に目に入るA5サイズのテーブルPOP</li>
          <li><strong>診察室</strong>: 医師のデスク横に小さなカード。診察後の説明時に自然に目に入る</li>
          <li><strong>会計窓口</strong>: 会計待ちの時間を活用。「LINEで次回予約できます」と導線を用意</li>
          <li><strong>トイレ・パウダールーム</strong>: 意外と滞在時間が長く、QRコード読み取り率が高い</li>
        </ul>
        <p>POPのデザインは「友だち追加で何ができるか」を明確に伝えることが重要です。「LINEで予約確認・変更ができます」「診察結果をLINEで受け取れます」など、<strong>患者にとっての具体的なメリット</strong>を打ち出しましょう。</p>
      </section>

      <section>
        <h2 id="strategy-2" className="text-xl font-bold text-slate-800">施策2: 受付スタッフからの声かけ</h2>
        <p>POPだけでは気づかない患者も多いため、受付スタッフからの直接的な声かけが有効です。声かけのタイミングとトークスクリプトを統一することで、<strong>登録率を大幅に引き上げ</strong>られます。</p>
        <p>効果的な声かけのポイントは以下の通りです。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>タイミング</strong>: 会計時が最適。診察が終わり、次回予約を考えるタイミングと重なる</li>
          <li><strong>トーク例</strong>: 「当院のLINEに登録いただくと、次回からスマホで予約・変更ができて便利ですよ。よろしければ今登録されませんか？」</li>
          <li><strong>ハードル低減</strong>: 「QRコードを読み取っていただくだけで、30秒で完了します」</li>
          <li><strong>特典の訴求</strong>: 「今なら登録特典として〇〇をお渡ししています」</li>
        </ul>
        <p>スタッフの負担を軽減するために、声かけは全患者ではなく<strong>初診患者・再来院から間が空いた患者に絞る</strong>のも一つの方法です。すでに登録済みの患者かどうかは、LINE IDとの紐付けで判別できます。</p>
      </section>

      <section>
        <h2 id="strategy-3" className="text-xl font-bold text-slate-800">施策3: 友だち追加特典（初回割引・次回予約優先等）</h2>
        <p>友だち追加の動機を強化するために、<strong>登録インセンティブ</strong>を用意しましょう。医療機関では過度な値引きは避けるべきですが、以下のような特典は効果的です。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>初回カウンセリング無料</strong>: 美容クリニックや自費診療で特に有効</li>
          <li><strong>次回予約の優先枠</strong>: 人気の時間帯を優先的に予約できる権利</li>
          <li><strong>施術後のスキンケアサンプル</strong>: 実コストが低く患者満足度が高い</li>
          <li><strong>健康情報コンテンツ</strong>: 季節の健康アドバイスや疾患別セルフケア情報</li>
          <li><strong>待ち時間の短縮</strong>: LINE問診を事前に済ませることで来院時の待ち時間を短縮</li>
        </ul>
        <p>特典の告知は友だち追加後の自動応答メッセージで即時配信するのがポイントです。「友だち追加ありがとうございます。こちらのクーポンを次回来院時にご提示ください」のように、<strong>即座に特典を受け取れる体験</strong>が重要です。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="strategy-4" className="text-xl font-bold text-slate-800">施策4: Webサイト・Googleマップからの導線</h2>
        <p>院外からの友だち獲得には、Web上の導線設計が欠かせません。患者がクリニックを探す際の主要タッチポイントすべてにLINE友だち追加の導線を設置しましょう。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>クリニック公式サイト</strong>: ヘッダー・フッター・サイドバーにLINE友だち追加ボタンを常設。特にスマホ表示ではフローティングバナーが効果的</li>
          <li><strong>予約ページ</strong>: 「LINEで簡単予約」ボタンを目立つ位置に配置</li>
          <li><strong>Googleビジネスプロフィール</strong>: 「メッセージ」機能やウェブサイトURLからLINEへ誘導</li>
          <li><strong>Googleマップの口コミ返信</strong>: 口コミへの返信に「詳細はLINEでお問い合わせください」と記載</li>
          <li><strong>ブログ・コラム記事</strong>: 記事下にLINE登録のCTAを設置。健康情報を求めて訪れた読者を友だちに転換</li>
        </ul>
        <p>Webサイトからの導線は、<strong>「LINEで何ができるか」を明確に示す</strong>ことがコンバージョンのポイントです。単に「LINE友だち追加」ではなく、「LINEで24時間予約受付中」「LINE問診で待ち時間ゼロ」のようなメリット訴求が効果的です。</p>
      </section>

      <section>
        <h2 id="strategy-5" className="text-xl font-bold text-slate-800">施策5: SNS（Instagram・Facebook）からの導線</h2>
        <p>Instagram・FacebookなどのSNSは、潜在患者との接点として非常に有効です。SNSのフォロワーをLINE友だちに転換することで、<strong>より深い関係構築と予約への導線</strong>を確保できます。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Instagramプロフィール</strong>: リンクにLINE友だち追加URLを設定。「予約・お問い合わせはLINEから」と記載</li>
          <li><strong>Instagramストーリーズ</strong>: リンクスタンプでLINE追加ページに誘導。症例写真や施術紹介の後に「詳しくはLINEで」</li>
          <li><strong>Instagram投稿</strong>: キャプションに「LINEで無料カウンセリング予約受付中（プロフィールのリンクから）」</li>
          <li><strong>Facebook広告</strong>: LINE友だち追加を目的とした広告配信。地域ターゲティングでクリニック周辺のユーザーにリーチ</li>
        </ul>
        <p>SNSからの流入は「まだ来院していない潜在患者」が中心です。LINEに登録してもらった後は、ステップ配信でクリニックの魅力や症例実績を段階的に伝え、<strong>初回来院につなげるナーチャリング</strong>が重要です。</p>
      </section>

      <section>
        <h2 id="strategy-6" className="text-xl font-bold text-slate-800">施策6: チラシ・ショップカード</h2>
        <p>オフラインのタッチポイントとして、チラシやショップカードも根強い効果があります。特に<strong>地域密着型のクリニック</strong>では、周辺住民へのリーチ手段として有効です。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>名刺サイズのショップカード</strong>: QRコード付き。受付で全患者に手渡し。財布に入るサイズで保管されやすい</li>
          <li><strong>近隣へのポスティング</strong>: 開業時や新メニュー開始時にQRコード付きチラシを配布</li>
          <li><strong>連携施設への設置</strong>: 提携薬局・美容室・フィットネスジムなどにショップカードを設置</li>
          <li><strong>院内配布物への印刷</strong>: 診察券の裏面・お薬手帳カバー・処方箋袋にQRコードを印刷</li>
        </ul>
        <p>チラシ・カードには必ず<strong>「LINE限定特典」や「LINE登録で〇〇」</strong>といった具体的なメリットを記載しましょう。QRコードだけでは読み取る動機が生まれません。</p>
      </section>

      <section>
        <h2 id="strategy-7" className="text-xl font-bold text-slate-800">施策7: 既存患者へのSMS・メール案内</h2>
        <p>すでにメールアドレスや電話番号を保有している既存患者に対して、<strong>SMSやメールでLINE友だち追加を案内</strong>する方法です。既存患者はクリニックとの関係性があるため、高い登録率が期待できます。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>SMS一斉送信</strong>: 「当院のLINE公式アカウントが開設されました。LINEから予約・お問い合わせが可能です」+友だち追加URL</li>
          <li><strong>メールマガジン</strong>: 「今後のお知らせはLINEで配信します。ぜひ友だち追加をお願いします」</li>
          <li><strong>予約確認メール</strong>: 予約確認メールのフッターにLINE友だち追加リンクを常設</li>
          <li><strong>定期検診リマインドメール</strong>: 「次回からLINEでリマインドをお届けします。ぜひご登録ください」</li>
        </ul>
        <p>SMSは到達率・開封率ともに高く、LINE友だち追加の案内手段として非常に効果的です。ただし、送信コストがかかるため、<strong>一斉送信は初回の告知1〜2回に限定</strong>し、その後は個別の予約確認時に案内するのが効率的です。</p>
      </section>

      <section>
        <h2 id="kpi-design" className="text-xl font-bold text-slate-800">月100人ペースで増やすためのKPI設計</h2>
        <p>「月100人増」を達成するには、各施策の貢献度を見積もり、KPIを設計することが重要です。以下は一般的なクリニック（1日来院数40〜60人）での目安です。</p>
        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b-2 border-slate-200 text-left">
                <th className="py-3 pr-4 font-bold text-slate-700">施策</th>
                <th className="py-3 pr-4 font-bold text-slate-700">月間目標</th>
                <th className="py-3 font-bold text-slate-700">KPI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                ["院内POP+声かけ", "50〜60人", "来院患者の登録率 40%以上"],
                ["Webサイト導線", "15〜20人", "サイト訪問者のCVR 3%以上"],
                ["SNS導線", "10〜15人", "プロフィールリンクCTR 5%以上"],
                ["チラシ・カード", "5〜10人", "配布数に対する登録率 2%以上"],
                ["SMS・メール案内", "10〜15人", "送信数に対する登録率 15%以上"],
              ].map(([strategy, target, kpi]) => (
                <tr key={strategy}>
                  <td className="py-2.5 pr-4 font-medium text-slate-700">{strategy}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{target}</td>
                  <td className="py-2.5 text-slate-600">{kpi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4">最も重要なのは<strong>院内での登録率</strong>です。毎日来院する患者は確実なリーチ対象であり、ここでの取りこぼしが最も大きな機会損失になります。まず院内施策を徹底し、その上でWeb・SNSの導線を強化する順番が効率的です。</p>
        <p>KPIは週次で確認し、目標に届いていない施策があれば原因を分析して改善を繰り返しましょう。友だち追加数はLINE公式アカウントの管理画面やLオペのダッシュボードでリアルタイムに確認できます。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-slate-800">まとめ: 7つの施策を組み合わせて友だち数を最大化</h2>
        <p>LINE友だち数はクリニックの売上を左右する最重要指標の一つです。院内施策（POP・声かけ・特典）を軸に、Web・SNS・オフラインの導線を組み合わせることで、<strong>月100人以上のペースで友だちを増やす</strong>ことが可能です。</p>
        <p>重要なのは、一つの施策に頼るのではなく<strong>複数の施策を同時に運用</strong>し、それぞれのKPIを追いかけること。友だち数が1,000人、2,000人と積み上がるにつれて、セグメント配信の効果も増幅し、クリニック経営の安定基盤が築かれていきます。</p>
        <p>Lオペ for CLINICでは、友だち追加の経路分析・QRコード生成・自動応答メッセージの設定まで、友だち集めに必要な機能をワンストップで提供しています。</p>
      </section>
    </ArticleLayout>
  );
}
