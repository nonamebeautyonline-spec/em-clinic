import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  ResultCard,
  StatGrid,
  BarChart,
  Callout,
  FlowSteps,
  ComparisonTable,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-seo-complete-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "「地域名×診療科」のキーワード戦略でローカル検索を攻略する方法",
  "タイトル・メタ・構造化データなど内部SEOの基本を網羅的に解説",
  "MEOとの連携で検索結果の「上位表示×地図表示」のダブル効果を狙う",
];

const toc = [
  { id: "why-seo", label: "クリニックにSEOが必要な理由" },
  { id: "keyword-strategy", label: "キーワード戦略（地域×診療科）" },
  { id: "on-page-seo", label: "内部SEOの基本" },
  { id: "content-seo", label: "コンテンツSEO（ブログ・コラム戦略）" },
  { id: "off-page-seo", label: "外部SEO（被リンク獲得）" },
  { id: "technical-seo", label: "技術SEO（表示速度・モバイル）" },
  { id: "meo-integration", label: "MEOとの連携" },
  { id: "measurement", label: "効果測定とPDCA" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="マーケティング" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「地域名＋診療科」で検索した患者が最初に目にするのは、<strong>Googleの検索結果</strong>です。ホームページが検索上位に表示されなければ、どれだけ良い診療を提供していても新患が増えることはありません。本記事では、クリニック経営者・マーケティング担当者が<strong>今日から実践できるSEO対策</strong>を、キーワード選定から技術SEOまで網羅的に解説します。
      </p>

      {/* ── クリニックにSEOが必要な理由 ── */}
      <section>
        <h2 id="why-seo" className="text-xl font-bold text-gray-800">クリニックにSEOが必要な理由</h2>

        <p>クリニックを受診する患者の行動は、ここ数年で大きく変化しています。かつては「知人の紹介」や「自宅に近い」という理由で受診先を決める患者が多数派でしたが、現在は<strong>患者の72%が「まずGoogleで検索する」</strong>と回答しています（日本医療マーケティング研究会調べ、2025年）。</p>

        <p>特に自費診療では、患者は複数のクリニックを比較検討する傾向が強く、検索結果の1ページ目に表示されないクリニックは「存在しないのと同じ」と言っても過言ではありません。Google検索結果の1位は全クリック数の<strong>28.5%</strong>を獲得し、2位は15.7%、3位は11.0%と急激に低下します。10位（1ページ目の最下段）でも2.5%に過ぎません。</p>

        <BarChart
          data={[
            { label: "Google自然検索", value: 42, color: "bg-sky-500" },
            { label: "Googleマップ（MEO）", value: 23, color: "bg-green-500" },
            { label: "口コミサイト", value: 15, color: "bg-yellow-500" },
            { label: "SNS（Instagram等）", value: 11, color: "bg-pink-500" },
            { label: "知人・紹介", value: 9, color: "bg-gray-500" },
          ]}
          unit="%"
        />

        <p>上のグラフが示す通り、Google自然検索はクリニックへの流入チャネルとして<strong>最大のシェア</strong>を占めています。広告に依存しない「自然流入」を安定的に獲得できれば、広告費を削減しながら新患を増やし続けることが可能です。</p>

        <p>さらに、SEOはストック型の資産です。広告を止めれば流入はゼロになりますが、SEOで築いた検索順位は（適切なメンテナンスを続ける限り）長期間にわたって集患効果を発揮し続けます。初期投資はかかりますが、中長期で見れば<strong>最も費用対効果の高いマーケティング施策</strong>です。</p>
      </section>

      {/* ── キーワード戦略 ── */}
      <section>
        <h2 id="keyword-strategy" className="text-xl font-bold text-gray-800">キーワード戦略（地域×診療科）</h2>

        <p>クリニックのSEOにおいて、最も重要なのがキーワード選定です。一般的なSEOでは検索ボリュームの大きいキーワードを狙いがちですが、クリニックの場合は<strong>「地域名＋診療科」の複合キーワード</strong>が主戦場になります。</p>

        <p>たとえば「皮膚科」という単一キーワードの検索ボリュームは月間約22万回ですが、競合が多すぎて上位表示は困難です。一方「渋谷 皮膚科」は月間約2,400回ですが、検索意図が明確（=来院意欲が高い）で、かつ競合が地域内のクリニックに限定されるため、上位表示が現実的です。</p>

        <p>キーワード選定の基本戦略は以下の3層構造です。第1層は「地域名＋診療科」（例: 新宿 AGAクリニック）。第2層は「地域名＋症状・治療名」（例: 渋谷 ニキビ治療）。第3層は「症状＋疑問系」（例: AGA治療 費用 相場）。第1層と第2層を最優先で対策し、第3層はブログ・コラムで攻略します。</p>

        <Callout type="info" title="キーワード調査ツール">
          Google キーワードプランナー（無料）、ラッコキーワード（無料）、Ubersuggest（一部無料）などを活用して、ターゲットキーワードの検索ボリュームと競合度を調査しましょう。自院の診療圏（半径3〜5km）の地域名と組み合わせたキーワードリストを作成することが出発点です。
        </Callout>

        <p>MEOとの連携によるキーワード戦略については<Link href="/lp/column/self-pay-clinic-google-meo" className="text-sky-600 underline hover:text-sky-800">自費クリニックのGoogleマップ・MEO対策</Link>でも詳しく解説しています。</p>
      </section>

      {/* ── 内部SEOの基本 ── */}
      <section>
        <h2 id="on-page-seo" className="text-xl font-bold text-gray-800">内部SEOの基本</h2>

        <p>内部SEO（オンページSEO）は、自院のホームページ内で完結する施策です。外部リンクの獲得などと異なり、<strong>自分でコントロールできる</strong>ため、最優先で取り組むべき領域です。</p>

        <p><strong>タイトルタグ（titleタグ）</strong>は、SEOにおいて最も重要な要素です。各ページのタイトルに「地域名＋診療科＋クリニック名」を含め、30〜40文字以内に収めるのが基本です。たとえば「渋谷の皮膚科 | ニキビ・シミ治療 | ○○クリニック」のような構成が効果的です。</p>

        <p><strong>メタディスクリプション</strong>は直接的な順位要因ではありませんが、検索結果のクリック率（CTR）に大きく影響します。120文字以内で、ページの内容を端的に説明し、「予約受付中」「初診からオンライン対応」などのアクションを促す文言を含めます。</p>

        <p><strong>見出し構造（h1〜h3）</strong>は、ページの情報構造をGoogleに伝える重要なシグナルです。h1はページに1つだけ設定し、メインキーワードを含めます。h2・h3で下位トピックを階層的に整理し、関連キーワードを自然に盛り込みます。</p>

        <p><strong>構造化データ（Schema.org）</strong>の実装も効果的です。クリニックの場合は「MedicalClinic」タイプを使い、住所・電話番号・診療時間・診療科目をマークアップします。これにより、検索結果にリッチスニペット（営業時間・評価星・住所など）が表示され、クリック率が向上します。</p>
      </section>

      {/* ── コンテンツSEO ── */}
      <section>
        <h2 id="content-seo" className="text-xl font-bold text-gray-800">コンテンツSEO（ブログ・コラム戦略）</h2>

        <p>コンテンツSEOは、ブログやコラム記事を通じて検索流入を増やす戦略です。「地域名＋診療科」のキーワードだけでは獲得できない<strong>潜在層（まだ来院を決めていないが情報収集している層）</strong>にリーチするために不可欠です。</p>

        <p>クリニックのコンテンツSEOで最も効果が高いのは、「患者の疑問に答える記事」です。たとえば「AGA治療 費用 相場」「ニキビ治療 保険 自費 違い」「ピル オンライン処方 安全性」など、患者が実際に検索するキーワードに対して、医師の監修に基づく信頼性の高いコンテンツを提供します。</p>

        <p>記事の品質においてGoogleが重視するのは<strong>E-E-A-T</strong>（Experience、Expertise、Authoritativeness、Trustworthiness = 経験・専門性・権威性・信頼性）です。医療コンテンツは「YMYL（Your Money or Your Life）」カテゴリに分類されるため、特に厳格な基準が適用されます。医師の実名・経歴を記事に明記し、エビデンスに基づいた正確な情報を発信することが不可欠です。</p>

        <p>投稿頻度は月4〜8本が理想です。毎週1本のコラムを継続的に公開し、半年で24本、1年で48本のコンテンツ資産を蓄積すれば、ロングテールキーワードからの安定した流入が期待できます。ただし、質の低い記事を大量に公開するのは逆効果です。1本あたり3,000〜5,000文字、読了時間5〜10分の充実した内容を心がけましょう。</p>

        <StatGrid stats={[
          { value: "48", unit: "本/年", label: "推奨コンテンツ公開数" },
          { value: "3,000", unit: "文字〜", label: "1記事あたりの推奨文字数" },
          { value: "6", unit: "ヶ月", label: "SEO効果が出始める目安" },
          { value: "3", unit: "倍", label: "コンテンツSEOによる流入増加（1年後）" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── 外部SEO ── */}
      <section>
        <h2 id="off-page-seo" className="text-xl font-bold text-gray-800">外部SEO（被リンク獲得）</h2>

        <p>外部SEO（オフページSEO）の核心は、他のウェブサイトから自院のホームページへの<strong>被リンク（バックリンク）</strong>を獲得することです。Googleのアルゴリズムは、質の高い被リンクが多いサイトを「信頼性が高い」と評価し、検索順位を引き上げます。</p>

        <p>クリニックが被リンクを獲得する現実的な方法としては、以下が挙げられます。第一に、<strong>地域の医療関連団体・医師会のウェブサイト</strong>への掲載です。正式な会員登録に基づくリンクは高品質な被リンクとして評価されます。</p>

        <p>第二に、<strong>医療系ポータルサイトへの登録</strong>です。EPARK、CalooRなどの医療機関検索サイトに正確な情報を登録し、自院ホームページへのリンクを設置します。第三に、<strong>地元メディアへの情報提供</strong>です。地域の健康イベントへの参加、新しい治療法の導入などをプレスリリースとして配信することで、地元ニュースサイトからの被リンクを獲得できます。</p>

        <Callout type="warning" title="被リンク購入は厳禁">
          リンクの売買はGoogleのガイドライン違反であり、ペナルティ（検索順位の大幅低下）の対象です。「被リンク○本保証」などをうたうSEO業者のサービスには手を出さないでください。自然な形で獲得した被リンクだけが、長期的なSEO効果を発揮します。
        </Callout>
      </section>

      {/* ── 技術SEO ── */}
      <section>
        <h2 id="technical-seo" className="text-xl font-bold text-gray-800">技術SEO（表示速度・モバイル）</h2>

        <p>技術SEO（テクニカルSEO）は、ホームページの技術的な品質を改善する施策です。Googleは2021年からCore Web Vitalsをランキング要因に組み込んでおり、<strong>表示速度・操作の応答性・視覚的な安定性</strong>が検索順位に直接影響します。</p>

        <p>クリニックのホームページで特に注意すべきは<strong>モバイル対応</strong>です。患者の検索行動の<strong>78%がスマートフォンから</strong>行われているため、モバイルでの表示品質が検索順位を左右します。Googleのモバイルフレンドリーテスト（https://search.google.com/test/mobile-friendly）で自院サイトの対応状況を確認してください。</p>

        <p>表示速度の改善では、画像の最適化が最もインパクトが大きい施策です。施術写真や院内写真のファイルサイズを圧縮し、WebP形式に変換するだけで、ページの読み込み時間を40〜60%短縮できるケースがあります。Google PageSpeed Insights（https://pagespeed.web.dev/）でスコアを確認し、80点以上を目指しましょう。</p>

        <p>SSL（HTTPS）対応も必須です。未対応のサイトはChromeで「保護されていない通信」と警告が表示され、患者の離脱率が大幅に上昇します。レンタルサーバーの多くは無料SSL証明書（Let&apos;s Encrypt）を提供しているため、未対応のクリニックは早急に対応してください。</p>
      </section>

      {/* ── MEOとの連携 ── */}
      <section>
        <h2 id="meo-integration" className="text-xl font-bold text-gray-800">MEOとの連携</h2>

        <p>MEO（Map Engine Optimization = Googleマップ対策）は、SEOと密接に関連する施策です。「地域名＋診療科」で検索すると、通常の検索結果の上にGoogleマップの「ローカルパック」（上位3件の地図表示）が表示されます。このローカルパックは検索結果の最も目立つ位置にあるため、<strong>SEOとMEOの両方で上位表示されること</strong>が理想的です。</p>

        <p>MEOの基本はGoogleビジネスプロフィール（旧Googleマイビジネス）の最適化です。クリニック名・住所・電話番号・診療時間・診療科目を正確に登録し、定期的に投稿（お知らせ・写真）を追加します。口コミの数と評価スコアもMEOの重要な順位要因であるため、来院患者へのレビュー依頼の仕組みを構築しましょう。</p>

        <p>SEOとMEOを連携させるポイントは、<strong>NAP情報（Name・Address・Phone）の一致</strong>です。ホームページ、Googleビジネスプロフィール、医療系ポータルサイト、SNSなど、すべての媒体でクリニック名・住所・電話番号が完全に一致していることが重要です。表記ゆれ（「丁目」と「-」の混在など）もGoogleは別情報として扱うため、統一を徹底してください。</p>

        <p>MEO対策の詳細は<Link href="/lp/column/self-pay-clinic-google-meo" className="text-sky-600 underline hover:text-sky-800">自費クリニックのGoogleマップ・MEO対策完全ガイド</Link>をご覧ください。</p>
      </section>

      {/* ── 効果測定とPDCA ── */}
      <section>
        <h2 id="measurement" className="text-xl font-bold text-gray-800">効果測定とPDCA</h2>

        <p>SEO対策は「やって終わり」ではなく、<strong>効果を測定し、改善を繰り返すPDCAサイクル</strong>が不可欠です。以下のKPIを月次で追跡し、施策の効果を定量的に評価します。</p>

        <FlowSteps steps={[
          { title: "検索順位の追跡", desc: "ターゲットキーワードの検索順位をGoogle Search Consoleで月次確認。主要キーワード10〜20個の順位変動をモニタリングし、低下したキーワードの原因を分析。" },
          { title: "オーガニック流入数の計測", desc: "Google Analyticsで自然検索からの流入数・セッション数・新規ユーザー数を確認。月次の増減トレンドと流入元キーワードの内訳を分析。" },
          { title: "コンバージョンの計測", desc: "予約フォームの送信数、電話発信ボタンのクリック数、LINE友だち追加数など、実際の集患につながったアクション数を計測。" },
          { title: "改善施策の実行と再測定", desc: "分析結果に基づいてタイトルの修正、コンテンツの追加・更新、内部リンクの最適化を実施。改善後のデータと比較して効果を検証。" },
        ]} />

        <p>SEOの効果が本格的に表れるまでには<strong>3〜6ヶ月</strong>かかるのが一般的です。短期間で結果を求めるのではなく、半年〜1年のスパンで成果を評価する姿勢が重要です。一方、マーケティング全体の戦略については<Link href="/lp/column/self-pay-clinic-marketing-guide" className="text-sky-600 underline hover:text-sky-800">自費クリニックのマーケティング完全ガイド</Link>も参考にしてください。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="クリニックSEO対策のポイント">
          <ul className="mt-1 space-y-1">
            <li>「地域名×診療科」のキーワード戦略がクリニックSEOの最重要施策</li>
            <li>タイトル・メタ・見出し・構造化データの内部SEOは自分でコントロール可能</li>
            <li>医師監修のコンテンツSEOでE-E-A-Tを高め、潜在層を獲得</li>
            <li>技術SEO（表示速度・モバイル対応）は検索順位に直接影響</li>
            <li>SEOとMEOの両輪対策で「検索結果＋地図」のダブル露出を実現</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、LINE公式アカウントを通じた患者とのコミュニケーション基盤を提供し、SEOで獲得した新規流入を確実に予約・来院へとつなげます。検索上位表示で認知を獲得し、LINEで関係を深めるマーケティング導線の構築に、ぜひお役立てください。口コミ対策との連携は<Link href="/lp/column/clinic-google-review" className="text-sky-600 underline hover:text-sky-800">Google口コミ対策のLINE活用</Link>、SNS広告のコンプライアンスは<Link href="/lp/column/clinic-listing-sns-ad-compliance" className="text-sky-600 underline hover:text-sky-800">リスティング・SNS広告コンプライアンスガイド</Link>もあわせてご確認ください。</p>
      </section>
    </ArticleLayout>
  );
}
