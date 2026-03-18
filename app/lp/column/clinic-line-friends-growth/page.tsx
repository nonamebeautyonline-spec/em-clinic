import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, BarChart, ComparisonTable, FlowSteps, ResultCard, DonutChart } from "../_components/article-layout";

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
  dateModified: self.date,
  image: `${SITE_URL}/lp/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
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
        <h2 id="why-friends-matter" className="text-xl font-bold text-gray-800">なぜ友だち数がクリニック経営に直結するのか</h2>
        <p>LINE公式アカウントの運用効果は、シンプルに<strong>「リーチ率 × 友だち数 = 売上インパクト」</strong>という構造で決まります。どれだけ良い配信コンテンツを用意しても、友だち数が少なければ届く母数が限られ、予約・来院につながる件数も小さくなります。</p>

        <Callout type="point" title="友だち数は売上のレバレッジ">
          友だち数500人で予約転換率5%なら予約は25件。友だち数2,000人なら同じ転換率で100件の予約が生まれます。友だち数の差が、そのまま売上の差に直結します。
        </Callout>

        <StatGrid stats={[
          { value: "500", unit: "人", label: "友だち数（例A）" },
          { value: "5", unit: "%", label: "予約転換率" },
          { value: "25", unit: "件", label: "予約数" },
        ]} />

        <StatGrid stats={[
          { value: "2,000", unit: "人", label: "友だち数（例B）" },
          { value: "5", unit: "%", label: "予約転換率" },
          { value: "100", unit: "件", label: "予約数" },
        ]} />

        <p>さらに、友だち数が増えるとセグメント配信の精度も向上します。母数が多いほどセグメントごとのサンプル数が確保でき、配信効果の検証・改善サイクルが回しやすくなるためです。</p>
      </section>

      <section>
        <h2 id="strategy-1" className="text-xl font-bold text-gray-800">施策1: 院内POPとQRコード</h2>
        <p>最も確実に友だちを増やせるのが、来院患者へのアプローチです。受付カウンター・待合室・診察室・会計窓口など、<strong>患者が滞在するすべてのポイントにQRコードを設置</strong>しましょう。</p>

        <FlowSteps steps={[
          { title: "受付カウンター", desc: "A4サイズのスタンドPOP。「LINE登録で次回予約がスムーズに」と具体的メリットを記載" },
          { title: "待合室テーブル", desc: "待ち時間に目に入るA5サイズのテーブルPOP" },
          { title: "診察室", desc: "医師のデスク横に小さなカード。診察後の説明時に自然に目に入る" },
          { title: "会計窓口", desc: "会計待ちの時間を活用。「LINEで次回予約できます」と導線を用意" },
          { title: "トイレ・パウダールーム", desc: "意外と滞在時間が長く、QRコード読み取り率が高い" },
        ]} />

        <Callout type="success" title="POPデザインのポイント">
          「友だち追加で何ができるか」を明確に伝えましょう。「LINEで予約確認・変更ができます」「診察結果をLINEで受け取れます」など、患者にとっての具体的なメリットを打ち出すことが重要です。
        </Callout>
      </section>

      <section>
        <h2 id="strategy-2" className="text-xl font-bold text-gray-800">施策2: 受付スタッフからの声かけ</h2>
        <p>POPだけでは気づかない患者も多いため、受付スタッフからの直接的な声かけが有効です。声かけのタイミングとトークスクリプトを統一することで、<strong>登録率を大幅に引き上げ</strong>られます。</p>

        <ComparisonTable
          headers={["ポイント", "内容"]}
          rows={[
            ["タイミング", "会計時が最適。診察が終わり、次回予約を考えるタイミングと重なる"],
            ["トーク例", "「LINE登録で、次回からスマホで予約・変更ができて便利です」"],
            ["ハードル低減", "「QRコード読み取りだけで、30秒で完了します」"],
            ["特典の訴求", "「今なら登録特典として○○をお渡ししています」"],
          ]}
        />

        <Callout type="info" title="スタッフ負担を軽減するコツ">
          声かけは全患者ではなく、初診患者・再来院から間が空いた患者に絞るのも一つの方法です。すでに登録済みかどうかは、LINE IDとの紐付けで判別できます。
        </Callout>
      </section>

      <section>
        <h2 id="strategy-3" className="text-xl font-bold text-gray-800">施策3: 友だち追加特典（初回割引・次回予約優先等）</h2>
        <p>友だち追加の動機を強化するために、<strong>登録インセンティブ</strong>を用意しましょう。医療機関では過度な値引きは避けるべきですが、以下のような特典は効果的です。</p>

        <ComparisonTable
          headers={["特典タイプ", "内容", "効果"]}
          rows={[
            ["初回カウンセリング無料", "美容クリニック・自費診療で有効", "新規患者の獲得"],
            ["次回予約の優先枠", "人気の時間帯を優先的に予約", "リピート促進"],
            ["スキンケアサンプル", "実コスト低 × 満足度高", "ブランド体験"],
            ["健康情報コンテンツ", "疾患別セルフケア情報", "信頼構築"],
            ["待ち時間短縮", "LINE事前問診で来院時ゼロ待ち", "即時メリット"],
          ]}
        />

        <Callout type="success" title="特典の即時提供がカギ">
          友だち追加後の自動応答メッセージで即時配信しましょう。「友だち追加ありがとうございます。こちらのクーポンを次回来院時にご提示ください」のように、即座に特典を受け取れる体験が重要です。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="strategy-4" className="text-xl font-bold text-gray-800">施策4: Webサイト・Googleマップからの導線</h2>
        <p>院外からの友だち獲得には、Web上の導線設計が欠かせません。患者がクリニックを探す際の主要タッチポイントすべてにLINE友だち追加の導線を設置しましょう。</p>

        <FlowSteps steps={[
          { title: "クリニック公式サイト", desc: "ヘッダー・フッター・サイドバーにLINE友だち追加ボタンを常設。スマホではフローティングバナーが効果的" },
          { title: "予約ページ", desc: "「LINEで簡単予約」ボタンを目立つ位置に配置" },
          { title: "Googleビジネスプロフィール", desc: "「メッセージ」機能やウェブサイトURLからLINEへ誘導" },
          { title: "Googleマップ口コミ返信", desc: "「詳細はLINEでお問い合わせください」と記載" },
          { title: "ブログ・コラム記事", desc: "記事下にLINE登録CTAを設置。健康情報の読者を友だちに転換" },
        ]} />

        <Callout type="point" title="コンバージョン率を上げるコツ">
          単に「LINE友だち追加」ではなく、「LINEで24時間予約受付中」「LINE問診で待ち時間ゼロ」のようなメリット訴求が効果的です。
        </Callout>
      </section>

      <section>
        <h2 id="strategy-5" className="text-xl font-bold text-gray-800">施策5: SNS（Instagram・Facebook）からの導線</h2>
        <p>Instagram・FacebookなどのSNSは、潜在患者との接点として非常に有効です。SNSのフォロワーをLINE友だちに転換することで、<strong>より深い関係構築と予約への導線</strong>を確保できます。</p>

        <ComparisonTable
          headers={["チャネル", "施策", "ポイント"]}
          rows={[
            ["Instagramプロフィール", "リンクにLINE友だち追加URL設定", "「予約はLINEから」と記載"],
            ["Instagramストーリーズ", "リンクスタンプでLINE追加に誘導", "症例写真の後に「詳しくはLINEで」"],
            ["Instagram投稿", "キャプションに案内文", "「プロフィールのリンクから」"],
            ["Facebook広告", "LINE友だち追加を目的とした配信", "地域ターゲティングで周辺に配信"],
          ]}
        />

        <Callout type="info" title="SNS流入は潜在患者が中心">
          LINEに登録してもらった後は、ステップ配信でクリニックの魅力や症例実績を段階的に伝え、初回来院につなげるナーチャリングが重要です。
        </Callout>
      </section>

      <section>
        <h2 id="strategy-6" className="text-xl font-bold text-gray-800">施策6: チラシ・ショップカード</h2>
        <p>オフラインのタッチポイントとして、チラシやショップカードも根強い効果があります。特に<strong>地域密着型のクリニック</strong>では、周辺住民へのリーチ手段として有効です。</p>

        <ComparisonTable
          headers={["ツール", "活用シーン", "ポイント"]}
          rows={[
            ["名刺サイズのショップカード", "受付で全患者に手渡し", "財布に入るサイズで保管されやすい"],
            ["ポスティングチラシ", "開業時・新メニュー開始時", "QRコード付きで配布"],
            ["連携施設への設置", "提携薬局・美容室・ジム", "ショップカードを設置依頼"],
            ["院内配布物への印刷", "診察券・お薬手帳・処方箋袋", "QRコードを印刷"],
          ]}
        />

        <Callout type="warning" title="QRコードだけでは不十分">
          チラシ・カードには必ず「LINE限定特典」や「LINE登録で○○」といった具体的なメリットを記載しましょう。QRコードだけでは読み取る動機が生まれません。
        </Callout>
      </section>

      <section>
        <h2 id="strategy-7" className="text-xl font-bold text-gray-800">施策7: 既存患者へのSMS・メール案内</h2>
        <p>すでにメールアドレスや電話番号を保有している既存患者に対して、<strong>SMSやメールでLINE友だち追加を案内</strong>する方法です。既存患者はクリニックとの関係性があるため、高い登録率が期待できます。</p>

        <ComparisonTable
          headers={["手段", "メッセージ例", "特徴"]}
          rows={[
            ["SMS一斉送信", "「当院のLINEが開設。予約・問い合わせが可能に」", "到達率・開封率が高い"],
            ["メールマガジン", "「今後のお知らせはLINEで配信します」", "既存リストを活用"],
            ["予約確認メール", "フッターにLINE友だち追加リンクを常設", "自然な導線"],
            ["定期検診リマインドメール", "「LINEでリマインドをお届けします」", "実用性を訴求"],
          ]}
        />

        <Callout type="info" title="SMSは送信コストに注意">
          SMSは到達率・開封率ともに高く効果的ですが、送信コストがかかります。一斉送信は初回の告知1〜2回に限定し、その後は個別の予約確認時に案内するのが効率的です。
        </Callout>
      </section>

      <section>
        <h2 id="kpi-design" className="text-xl font-bold text-gray-800">月100人ペースで増やすためのKPI設計</h2>
        <p>「月100人増」を達成するには、各施策の貢献度を見積もり、KPIを設計することが重要です。以下は一般的なクリニック（1日来院数40〜60人）での目安です。</p>

        <BarChart
          data={[
            { label: "院内POP+声かけ", value: 55, color: "bg-sky-500" },
            { label: "Webサイト導線", value: 18, color: "bg-emerald-500" },
            { label: "SNS導線", value: 12, color: "bg-violet-500" },
            { label: "SMS・メール", value: 12, color: "bg-amber-500" },
            { label: "チラシ・カード", value: 8, color: "bg-rose-400" },
          ]}
          unit="人/月"
        />

        <ComparisonTable
          headers={["施策", "月間目標", "KPI"]}
          rows={[
            ["院内POP+声かけ", "50〜60人", "来院患者の登録率 40%以上"],
            ["Webサイト導線", "15〜20人", "サイト訪問者のCVR 3%以上"],
            ["SNS導線", "10〜15人", "プロフィールリンクCTR 5%以上"],
            ["チラシ・カード", "5〜10人", "配布数に対する登録率 2%以上"],
            ["SMS・メール案内", "10〜15人", "送信数に対する登録率 15%以上"],
          ]}
        />

        <Callout type="point" title="最優先は院内施策">
          毎日来院する患者は確実なリーチ対象であり、ここでの取りこぼしが最も大きな機会損失です。まず院内施策を徹底し、その上でWeb・SNSの導線を強化する順番が効率的です。
        </Callout>

        <p>KPIは週次で確認し、目標に届いていない施策があれば原因を分析して改善を繰り返しましょう。友だち追加数はLINE公式アカウントの管理画面やLオペのダッシュボードでリアルタイムに確認できます。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: 7つの施策を組み合わせて友だち数を最大化</h2>

        <DonutChart percentage={80} label="来院患者のLINE登録率" sublabel="院内施策の徹底で目指す目標値" />

        <p>LINE友だち数はクリニックの売上を左右する最重要指標の一つです。院内施策（POP・声かけ・特典）を軸に、Web・SNS・オフラインの導線を組み合わせることで、<strong>月100人以上のペースで友だちを増やす</strong>ことが可能です。</p>

        <Callout type="success" title="成功のポイント">
          一つの施策に頼るのではなく、複数の施策を同時に運用し、それぞれのKPIを追いかけること。友だち数が1,000人、2,000人と積み上がるにつれて、セグメント配信の効果も増幅し、クリニック経営の安定基盤が築かれます。
        </Callout>

        <p>Lオペ for CLINICでは、友だち追加の経路分析・QRコード生成・自動応答メッセージの設定まで、友だち集めに必要な機能をワンストップで提供しています。</p>
      </section>
    </ArticleLayout>
  );
}
