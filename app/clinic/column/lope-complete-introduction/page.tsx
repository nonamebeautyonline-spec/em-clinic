import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  ResultCard,
  StatGrid,
  BarChart,
  ComparisonTable,
  Callout,
  FlowSteps,
  DonutChart,
  InlineCTA,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "lope-complete-introduction")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "Lオペ for CLINIC完全ガイドの導入にどのくらいの期間がかかりますか？", a: "基本的な設定は1〜2週間で完了します。LINE公式アカウントの開設からリッチメニュー設計・自動メッセージ設定まで、Lオペ for CLINICなら初期設定サポート付きで最短2週間で運用開始できます。" },
  { q: "Lオペ for CLINIC完全ガイドでスタッフの負荷は増えませんか？", a: "むしろ減ります。電話対応・手動での予約管理・問診確認などの定型業務を自動化することで、スタッフの作業時間を月40時間以上削減できた事例もあります。導入初月はサポートを受けながら進めれば、2ヶ月目以降はスムーズに運用できます。" },
  { q: "小規模クリニックでも導入効果はありますか？", a: "はい、むしろ小規模クリニックほど効果を実感しやすいです。スタッフ数が限られる分、業務自動化によるインパクトが大きく、受付1名分の工数を削減できた事例もあります。" },
];

/* FAQPage JSON-LD（Article JSON-LDはArticleLayoutで自動生成） */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const keyPoints = [
  "Lオペ for CLINICの全9機能と患者フローの仕組み",
  "3つの診療科での導入事例と具体的な成果データ",
  "料金体系・他社ツール比較・導入の流れまで網羅的に解説",
];

const toc = [
  { id: "what-is-lope", label: "Lオペ for CLINICとは" },
  { id: "features", label: "主要機能一覧" },
  { id: "case-studies", label: "導入事例と成果" },
  { id: "pricing", label: "料金体系" },
  { id: "comparison", label: "他社ツールとの比較" },
  { id: "onboarding", label: "導入の流れ" },
  { id: "faq", label: "よくある質問" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「LINE公式アカウントを導入したいけれど、ツールが多すぎて選べない」「予約・問診・配信をバラバラのツールで管理していて非効率」――そんなクリニックの悩みを一気に解決するのが<strong>Lオペ for CLINIC</strong>です。本記事では、Lオペ for CLINICの機能一覧・料金体系・導入事例・他社比較・導入フローまでを網羅的に解説します。この1本を読めば、Lオペがクリニック経営にどう貢献するかがすべてわかります。
      </p>

      {/* ── セクション1: Lオペ for CLINICとは ── */}
      <section>
        <h2 id="what-is-lope" className="text-xl font-bold text-gray-800">Lオペ for CLINICとは</h2>

        <p>
          Lオペ for CLINICは、クリニック経営に特化したLINE運用プラットフォームです。LINE公式アカウントを活用した予約管理・オンライン問診・セグメント配信・AI自動返信・決済連携・配送管理といった機能を<strong>オールインワン</strong>で提供します。
        </p>

        <p>
          汎用的なLINE配信ツール（Lステップ・Linyなど）は、業種を問わず広く使えるように設計されています。しかし、クリニックには「問診→予約→診察→処方→フォロー」という医療特有の患者フローがあり、汎用ツールだけではカバーしきれない業務が数多く存在します。Lオペ for CLINICはこの医療業務フローを最初から組み込んでいるため、追加開発やカスタマイズなしですぐに運用を開始できます。
        </p>

        <Callout type="info" title="「クリニック専用設計」だからこそできること">
          Lオペは、患者CRM・問診フォーム・問診データの一元管理・処方管理・配送追跡といった医療業務に必要な機能を標準搭載。汎用ツールでは別途開発や外部連携が必要な機能が、最初からすべて揃っています。
        </Callout>

        <ComparisonTable
          headers={["比較項目", "Lオペ for CLINIC", "汎用LINEツール"]}
          rows={[
            ["予約管理連携", true, "外部ツールが必要"],
            ["オンライン問診", true, "別途フォーム作成"],
            ["問診データ一元管理", true, false],
            ["医療用語対応AI", true, false],
            ["処方・配送管理", true, false],
            ["セグメント配信", true, true],
            ["リッチメニュー管理", true, true],
            ["クリニック専用テンプレート", true, false],
          ]}
        />

        <p>
          汎用ツールとの詳しい機能比較は<Link href="/clinic/column/lstep-vs-clinic-tool" className="text-emerald-700 underline">Lステップ・Liny vs クリニック専用ツール徹底比較</Link>でも解説しています。
        </p>
      </section>

      {/* ── セクション2: 主要機能一覧 ── */}
      <section>
        <h2 id="features" className="text-xl font-bold text-gray-800">主要機能一覧</h2>

        <p>
          Lオペ for CLINICは、クリニック運営に必要なLINE活用機能を9つのカテゴリに整理して提供しています。それぞれが連携して動作するため、ツール間の手動連携は不要です。
        </p>

        <StatGrid stats={[
          { value: "患者", unit: "CRM", label: "患者情報を一元管理" },
          { value: "予約", unit: "管理", label: "LINE上で予約受付" },
          { value: "問診", unit: "自動化", label: "オンライン問診フォーム" },
          { value: "配信", unit: "機能", label: "セグメント配信" },
          { value: "AI", unit: "返信", label: "24時間自動応答" },
          { value: "メニュー", unit: "管理", label: "リッチメニュー切替" },
          { value: "決済", unit: "連携", label: "LINE上でカード決済" },
          { value: "配送", unit: "管理", label: "追跡番号自動通知" },
          { value: "分析", unit: "機能", label: "ダッシュボード" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">患者の来院フロー</h3>
        <p>
          Lオペ for CLINICでは、患者がLINEで友だち追加してから来院後のフォローアップまで、すべてのステップをLINE上で完結できます。
        </p>

        <FlowSteps steps={[
          { title: "友だち追加", desc: "QRコードやリンクからLINE友だち追加。自動で挨拶メッセージと問診フォームを配信" },
          { title: "オンライン問診", desc: "LINE上で問診に回答。回答内容は患者CRMとカルテに自動反映" },
          { title: "予約", desc: "問診完了後、空き枠カレンダーから予約。リマインドも自動配信" },
          { title: "来院・診察", desc: "来院時に問診内容がカルテに反映済み。受付の手間ゼロ" },
          { title: "フォロー・再診促進", desc: "診察後のフォローメッセージやセグメント配信で再診を促進" },
        ]} />

        <p>
          各機能の詳細は<Link href="/clinic/features" className="text-sky-600 underline hover:text-sky-800">機能一覧ページ</Link>をご覧ください。クリニックDXの全体像を知りたい方は<Link href="/clinic/column/clinic-dx-complete-guide" className="text-emerald-700 underline">クリニックDX完全ガイド</Link>も参考になります。
        </p>
      </section>

      {/* ── セクション3: 導入事例と成果 ── */}
      <section>
        <h2 id="case-studies" className="text-xl font-bold text-gray-800">導入事例と成果</h2>

        <p>
          Lオペ for CLINICを導入したクリニックでは、業務効率化・患者満足度向上・売上増加といった具体的な成果が出ています。ここでは3つの診療科の事例をご紹介します。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">美容皮膚科: 予約管理工数70%削減、リピート率1.5倍</h3>
        <p>
          受付スタッフ2名が電話予約対応に追われていた美容皮膚科クリニック。Lオペ for CLINICの導入後、LINE上での自動予約受付とリマインド配信により、予約関連の業務工数を70%削減。さらにセグメント配信による施術後フォローでリピート率が1.5倍に向上しました。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">内科: 問診自動化で待ち時間15分短縮</h3>
        <p>
          来院後の紙問診に平均15分かかっていた内科クリニック。Lオペのオンライン問診機能を導入し、来院前にLINEで問診を完了させることで、院内待ち時間を15分短縮。患者満足度が大幅に改善しました。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">歯科: 定期検診リマインドで来院率1.6倍</h3>
        <p>
          定期検診の離脱率が高かった歯科クリニック。Lオペ for CLINICのセグメント配信で「前回の検診から6ヶ月経過した患者」を自動抽出し、リマインドメッセージを配信。来院率が1.6倍に向上し、予防歯科の売上基盤が安定しました。
        </p>

        <ResultCard
          before="月80時間"
          after="月24時間"
          metric="業務工数を70%削減"
          description="受付・電話対応・配信作業などのLINE関連業務を大幅に効率化"
        />

        <BarChart
          data={[
            { label: "美容皮膚科（予約工数）", value: 70, color: "bg-sky-500" },
            { label: "内科（待ち時間）", value: 60, color: "bg-emerald-500" },
            { label: "歯科（来院率）", value: 60, color: "bg-violet-500" },
          ]}
          unit="% 改善"
        />

        <DonutChart percentage={96} label="導入クリニック満足度 96%" sublabel="Lオペ for CLINIC利用クリニックのアンケート結果" />

        <p>
          さらに多くの活用事例を<Link href="/clinic/column/clinic-line-case-studies" className="text-emerald-700 underline">クリニックのLINE公式アカウント活用事例5選</Link>で紹介しています。
        </p>
      </section>

      <InlineCTA />

      {/* ── セクション4: 料金体系 ── */}
      <section>
        <h2 id="pricing" className="text-xl font-bold text-gray-800">料金体系</h2>

        <p>
          Lオペ for CLINICは、LINE配信通数に応じた月額制の料金プランを採用しています。初期費用・設定サポートは無料。複数の外部ツールを組み合わせるよりも、Lオペ1つにまとめることでトータルコストを大幅に削減できます。
        </p>

        <Callout type="point" title="複数ツールを1つにまとめてコスト削減">
          予約管理ツール・問診フォーム・LINE配信ツール・CRMをそれぞれ契約すると月額10万円以上になることも。Lオペ for CLINICならすべてがオールインワンのため、ツール費用の一本化でコスト最適化が可能です。
        </Callout>

        <StatGrid stats={[
          { value: "10", unit: "万円〜", label: "複数ツール合計の月額目安" },
          { value: "大幅", unit: "削減", label: "Lオペで一本化した場合" },
          { value: "0", unit: "円", label: "初期費用・設定サポート" },
        ]} />

        <p>
          詳しい料金プランや見積もりは<Link href="/clinic/contact" className="text-sky-600 underline hover:text-sky-800">お問い合わせページ</Link>からお気軽にご相談ください。
        </p>
      </section>

      {/* ── セクション5: 他社ツールとの比較 ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">他社ツールとの比較</h2>

        <p>
          クリニックがLINE運用ツールを選定する際、よく比較対象に挙がるのがLステップ、メディカルフォース、汎用CRMです。Lオペ for CLINICと各ツールの違いを一覧で比較します。
        </p>

        <ComparisonTable
          headers={["比較項目", "Lオペ for CLINIC", "Lステップ", "メディカルフォース", "汎用CRM"]}
          rows={[
            ["クリニック特化設計", true, false, true, false],
            ["LINE配信・自動応答", true, true, false, false],
            ["オンライン問診", true, false, true, false],
            ["予約管理", true, false, true, "外部連携"],
            ["患者CRM", true, "タグ管理のみ", true, true],
            ["AI自動返信（医療対応）", true, false, false, false],
            ["オンライン決済", true, false, "一部対応", false],
            ["配送管理・追跡通知", true, false, false, false],
            ["リッチメニュー自動切替", true, true, false, false],
            ["初期費用", "無料", "有料", "有料", "有料"],
          ]}
        />

        <Callout type="info" title="クリニックに必要な機能が「最初から全部入り」">
          Lステップは汎用LINE配信に強みがありますが、問診・カルテ・決済・配送には非対応。メディカルフォースは電子カルテ中心でLINE配信機能が弱い。Lオペ for CLINICは、LINE運用と医療業務の両方をカバーするクリニック特化のオールインワンツールです。
        </Callout>

        <p>
          Lステップとの詳しい比較は<Link href="/clinic/column/lstep-vs-clinic-tool" className="text-emerald-700 underline">Lステップ・Liny vs クリニック専用ツール徹底比較</Link>をご覧ください。
        </p>
      </section>

      {/* ── セクション6: 導入の流れ ── */}
      <section>
        <h2 id="onboarding" className="text-xl font-bold text-gray-800">導入の流れ</h2>

        <p>
          Lオペ for CLINICの導入は、お問い合わせから最短2週間で運用開始が可能です。初期設定はすべて専任スタッフがサポートするため、ITに詳しくないスタッフでも安心して始められます。
        </p>

        <FlowSteps steps={[
          { title: "お問い合わせ", desc: "Webフォームまたはお電話でお気軽にお問い合わせください" },
          { title: "ヒアリング", desc: "クリニックの課題・運用フローをヒアリングし、最適なプランをご提案" },
          { title: "初期設定（無料サポート）", desc: "LINE公式アカウントとの連携・問診フォーム・リッチメニューなどの初期設定を代行" },
          { title: "運用開始", desc: "スタッフ向け操作研修を実施し、運用をスタート" },
          { title: "継続サポート", desc: "運用開始後も専任担当が配信戦略・機能活用をサポート" },
        ]} />

        <InlineCTA />

        <StatGrid stats={[
          { value: "最短2", unit: "週間", label: "導入期間" },
          { value: "0", unit: "円", label: "初期設定サポート費用" },
          { value: "無制限", unit: "", label: "導入後サポート" },
        ]} />
      </section>

      {/* ── セクション7: よくある質問 ── */}
      <section>
        <h2 id="faq" className="text-xl font-bold text-gray-800">よくある質問</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Q. 既存のLINE公式アカウントはそのまま使えますか？</h3>
            <p>
              はい、そのまま使えます。Lオペ for CLINICは既存のLINE公式アカウントに連携する形で導入するため、友だちリストやトーク履歴を引き継いだまま運用を開始できます。アカウントの作り直しは不要です。
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-800">Q. スタッフのITスキルが低くても使えますか？</h3>
            <p>
              はい、問題ありません。Lオペ for CLINICは、普段LINEを使っている方であれば直感的に操作できるUI設計になっています。また、導入時にはスタッフ向けの操作研修を実施し、運用開始後も継続的にサポートします。
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-800">Q. 契約期間の縛りはありますか？</h3>
            <p>
              いいえ、最低契約期間の縛りはありません。月額制のため、必要な期間だけご利用いただけます。
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-800">Q. 他ツールからのデータ移行は可能ですか？</h3>
            <p>
              はい、可能です。既存の患者データや予約データの移行をサポートしています。CSV取り込みやAPI連携など、クリニックの状況に合わせた移行方法をご提案します。
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-gray-800">Q. セキュリティ対策は万全ですか？</h3>
            <p>
              Lオペ for CLINICは、医療情報を扱うことを前提にセキュリティ設計されています。データの暗号化・アクセス制御・監査ログなど、医療機関に求められるセキュリティ基準を満たしています。
            </p>
          </div>
        </div>
      </section>

      {/* ── セクション8: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: Lオペ for CLINICが選ばれる理由</h2>

        <p>
          本記事では、Lオペ for CLINICの機能・料金・導入事例・他社比較・導入フローを網羅的に解説しました。最後に、Lオペがクリニックに選ばれる3つの理由を整理します。
        </p>

        <Callout type="success" title="Lオペ for CLINICが選ばれる3つの理由">
          <ol className="mt-2 space-y-2 list-decimal pl-4">
            <li><strong>クリニック専用設計のオールインワン</strong> — 予約・問診・配信・AI返信・決済・配送まで、1つのツールで完結。複数ツールの契約・連携・管理が不要</li>
            <li><strong>導入・運用のハードルが低い</strong> — 初期費用ゼロ・最短2週間で導入・ITスキル不要の直感的UI。専任サポートで安心して始められる</li>
            <li><strong>データに基づく成果</strong> — 導入クリニックの96%が満足と回答。業務工数の平均70%削減、リピート率1.5倍といった実績</li>
          </ol>
        </Callout>

        <BarChart
          data={[
            { label: "業務工数削減", value: 70, color: "bg-sky-500" },
            { label: "リピート率向上", value: 50, color: "bg-emerald-500" },
            { label: "患者満足度向上", value: 40, color: "bg-violet-500" },
            { label: "ツールコスト削減", value: 60, color: "bg-amber-500" },
          ]}
          unit="% 改善"
        />

        <p>
          LINE公式アカウントを使ったクリニック経営の効率化に興味がある方は、ぜひLオペ for CLINICをご検討ください。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">関連コラム</h3>
        <ul className="list-disc pl-5 space-y-1 text-[14px]">
          <li><Link href="/clinic/column/lstep-vs-clinic-tool" className="text-emerald-700 underline">Lステップ・Liny vs クリニック専用ツール徹底比較</Link></li>
          <li><Link href="/clinic/column/clinic-line-case-studies" className="text-emerald-700 underline">クリニックのLINE公式アカウント活用事例5選</Link></li>
          <li><Link href="/clinic/column/clinic-line-revenue-growth" className="text-emerald-700 underline">LINE公式アカウントでクリニックの売上を伸ばす方法</Link></li>
          <li><Link href="/clinic/column/clinic-dx-complete-guide" className="text-emerald-700 underline">クリニックDX完全ガイド</Link></li>
        </ul>

        <p className="mt-4">
          Lオペ for CLINICの詳細は<Link href="/clinic/about" className="text-sky-600 underline hover:text-sky-800">サービス紹介ページ</Link>、導入のご相談は<Link href="/clinic/contact" className="text-sky-600 underline hover:text-sky-800">お問い合わせページ</Link>からお気軽にどうぞ。
        </p>
      </section>
    
      {/* ── FAQ ── */}
      <section id="faq">
        <h2 className="text-2xl font-bold mt-12 mb-6">よくある質問</h2>
        {faqItems.map((item, i) => (
          <div key={i} className="mb-6 rounded-lg border border-gray-200 p-5">
            <h3 className="font-bold text-lg mb-2">Q. {item.q}</h3>
            <p className="text-gray-700 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </section>
    </ArticleLayout>
  );
}
