import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  StatGrid,
  FlowSteps,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "doxy-pep-std-prevention")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/clinic/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/clinic/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "ドキシペップ（Doxy-PEP）とははオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
  { q: "副作用が出た場合はどうすればいいですか？", a: "軽度の副作用であれば経過観察で改善することが多いですが、症状が強い場合は速やかに処方医に相談してください。LINEでの個別相談に対応しているクリニックであれば、気軽に症状を報告できます。" },
  { q: "オンラインクリニックでの処方薬の配送はどうなりますか？", a: "多くのオンラインクリニックでは決済後、最短翌日〜数日で発送されます。温度管理が必要な薬剤はクール便での配送に対応しているクリニックを選びましょう。Lオペ for CLINICでは配送管理・追跡番号の自動配信機能も搭載しています。" },
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
  "ドキシペップは性行為後72時間以内にドキシサイクリン200mgを服用するSTI予防法",
  "臨床試験では梅毒87%減・クラミジア88%減という高い効果が確認されている",
  "日本では公式ガイドラインはまだないが、自費診療での提供が始まっている",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「性感染症は予防できないもの」——そう思っていませんか？ 実は海外では、<strong>性行為の"あと"に抗生物質を飲んで感染リスクを大幅に下げる</strong>という新しい予防法が注目されています。それが<strong>ドキシペップ（Doxy-PEP）</strong>です。この記事では、ドキシペップの仕組み・エビデンス・注意点を、できるだけわかりやすく解説します。
      </p>

      {/* ── セクション1: ドキシペップとは ── */}
      <section>
        <h2 id="what-is-doxypep" className="text-xl font-bold text-gray-800">ドキシペップとは？ — 「事後予防」という新しい考え方</h2>

        <p>ドキシペップ（Doxy-PEP）は<strong>Doxycycline Post-Exposure Prophylaxis</strong>の略。日本語にすると「ドキシサイクリンによる曝露後予防」です。ものすごく簡単に言えば、<strong>性行為のあとに抗生物質を1回飲んで、性感染症にかかるリスクを下げる</strong>という方法です。</p>

        <p>使うのは<strong>ドキシサイクリン</strong>という古くからあるテトラサイクリン系の抗生物質。ニキビ治療やマラリア予防にも使われる、医療現場ではお馴染みの薬です。これを性行為後72時間以内に200mg（100mg錠を2錠）服用します。たったこれだけ。</p>

        <FlowSteps steps={[
          { title: "性行為", desc: "コンドームを使用しなかった、または破損した場合などにリスクが生じる。" },
          { title: "72時間以内に服用", desc: "ドキシサイクリン200mg（100mg×2錠）を1回服用。24時間以内が理想的。" },
          { title: "細菌の増殖を阻止", desc: "ドキシサイクリンが感染初期の細菌のタンパク質合成を阻害し、定着を防ぐ。" },
          { title: "感染リスクが大幅に低下", desc: "梅毒・クラミジアのリスクを約80〜90%低減。淋病への効果は限定的。" },
        ]} />

        <p>考え方としては、HIVの<strong>PEP（曝露後予防）</strong>に近いものがあります。HIVでは性行為後72時間以内に抗ウイルス薬を飲む方法がすでに確立されていますよね。ドキシペップはこれを<strong>梅毒・クラミジアなどの細菌性STI</strong>に応用したものと理解するとわかりやすいです。HIVの事前予防（PrEP）について詳しくは<Link href="/clinic/column/hiv-prep-prevention-guide" className="text-sky-600 underline hover:text-sky-800">HIV PrEP予防ガイド</Link>をご覧ください。</p>
      </section>

      {/* ── セクション2: なぜ今注目されているのか ── */}
      <section>
        <h2 id="why-now" className="text-xl font-bold text-gray-800">なぜ今、ドキシペップが世界的に注目されているのか</h2>

        <p>背景にあるのは、<strong>梅毒の爆発的な増加</strong>です。日本でも2023年に梅毒の報告数が<strong>過去最多の14,906件</strong>を記録。2013年の約1,200件から10年で12倍以上に急増しています。これは日本だけの問題ではなく、米国・欧州でも同様の傾向が見られます。梅毒の症状・検査・治療については<Link href="/clinic/column/syphilis-diagnosis-treatment-guide" className="text-sky-600 underline hover:text-sky-800">梅毒の診断・治療ガイド</Link>で詳しくまとめています。</p>

        <StatGrid stats={[
          { value: "14,906", unit: "件", label: "日本の梅毒報告数（2023年・過去最多）" },
          { value: "12", unit: "倍", label: "2013年比での増加率" },
          { value: "66", unit: "%減", label: "DoxyPEP試験でのSTI発症率低下" },
        ]} />

        <p>こうした状況を受けて、<strong>米国CDC（疾病対策予防センター）は2024年、ドキシペップのガイドラインを正式に発表</strong>しました。対象はMSM（男性と性行為をする男性）およびトランスジェンダー女性で、過去12か月以内にSTIの既往がある方に推奨するという内容です。</p>

        <p>つまり、コンドームの使用啓発だけでは感染拡大を止められない現実があり、<strong>「もう一つの予防手段」としてドキシペップが必要とされている</strong>のです。</p>
      </section>

      {/* ── セクション3: 臨床エビデンス ── */}
      <section>
        <h2 id="clinical-evidence" className="text-xl font-bold text-gray-800">臨床データが示す「驚きの予防効果」</h2>

        <p>ドキシペップのエビデンスを一気に押し上げたのが、2023年にNEJM（New England Journal of Medicine）に掲載された<strong>DoxyPEP試験</strong>です。米国で実施されたこの大規模RCT（ランダム化比較試験）では、MSMおよびトランスジェンダー女性を対象に、性行為後のドキシサイクリン服用の効果を検証しました。</p>

        <ComparisonTable
          headers={["感染症", "リスク低下率", "エビデンスの強さ", "補足"]}
          rows={[
            ["梅毒", "87%減", "強い", "最も高い予防効果が確認された"],
            ["クラミジア", "88%減", "強い", "ドキシサイクリン感受性が高い"],
            ["淋病", "有意差なし", "限定的", "テトラサイクリン耐性率が高く効果不十分"],
            ["STI全体", "66%減", "強い", "3感染症の合計での発症率低下"],
          ]}
        />

        <p>梅毒87%減、クラミジア88%減——これはかなりインパクトのある数字です。ただし注目すべきは、<strong>淋病には効果が限定的だった</strong>という点。淋菌はテトラサイクリン系抗生物質への耐性を持つ株が多く、ドキシサイクリンだけでは太刀打ちできないケースが多いのです。</p>

        <Callout type="info" title="淋病に効かない理由">
          淋菌（Neisseria gonorrhoeae）のテトラサイクリン耐性率は地域によって<strong>50〜80%</strong>にも達します。耐性菌に対しては、ドキシサイクリンでタンパク質合成を阻害しようとしても効果が出ません。淋病の予防には、引き続き<strong>コンドームの使用と定期的な検査</strong>が最も重要です。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション4: 服用方法 ── */}
      <section>
        <h2 id="how-to-take" className="text-xl font-bold text-gray-800">服用はシンプル — タイミングだけは絶対に守って</h2>

        <p>ドキシペップの服用方法は非常にシンプルです。難しいレジメンはありません。</p>

        <ComparisonTable
          headers={["項目", "内容"]}
          rows={[
            ["薬剤", "ドキシサイクリン 200mg（100mg錠×2錠）"],
            ["服用タイミング", "性行為後できるだけ早く（24時間以内が理想）"],
            ["服用期限", "性行為後72時間以内"],
            ["服用回数", "1回の性行為につき1回（72時間以内に複数回の場合も200mgで十分）"],
            ["最大用量", "24時間あたり200mgを超えない"],
          ]}
        />

        <p>ここで大切なのは<strong>「早ければ早いほど効果が高い」</strong>ということ。72時間以内であれば効果は期待できますが、24時間以内の服用がベストです。感染初期の細菌がまだ少ないうちに叩くことで、定着を防ぐ確率が上がります。</p>

        <Callout type="point" title="服用時の注意">
          ドキシサイクリンは<strong>乳製品やカルシウム・鉄・マグネシウムを含むサプリメント</strong>と一緒に飲むと吸収が低下します。水またはお茶で服用してください。また、服用後に横にならず、<strong>食道への刺激を避けるために十分な水で飲む</strong>ことも大切です。
        </Callout>
      </section>

      {/* ── セクション5: 注意点・限界 ── */}
      <section>
        <h2 id="limitations" className="text-xl font-bold text-gray-800">万能ではない — 知っておくべき限界と注意点</h2>

        <p>ドキシペップは画期的な予防法ですが、<strong>完璧な方法ではありません</strong>。いくつかの重要な限界を理解しておく必要があります。</p>

        <p>まず、<strong>シスジェンダー女性でのエビデンスが不十分</strong>です。ケニアで実施されたdoxy PEP試験では、シスジェンダー女性を対象にした結果、STI予防に有意差が出ませんでした。膣内の薬物動態が異なる可能性や、服用アドヒアランスの問題が指摘されていますが、現時点では<strong>CDCのガイドラインもMSMとトランスジェンダー女性に限定</strong>しています。</p>

        <p>次に、最も議論されているのが<strong>抗菌薬耐性（AMR）への懸念</strong>です。ドキシサイクリンを広く予防的に使うことで、ドキシサイクリン耐性菌が増えるのではないか——これは公衆衛生上の非常に重要な論点です。</p>

        <ComparisonTable
          headers={["懸念事項", "詳細", "現時点での対応"]}
          rows={[
            ["淋菌の耐性", "テトラサイクリン耐性率が既に高く効果が限定的", "淋病予防はコンドーム＋定期検査で対応"],
            ["新たな耐性獲得", "広範な予防使用で耐性菌が増える可能性", "長期モニタリング研究が進行中"],
            ["女性でのデータ不足", "シスジェンダー女性での有効性が未確認", "追加の臨床試験が必要"],
            ["他の感染症への影響", "腸内細菌叢やマイコプラズマへの影響", "研究データの蓄積を待つ段階"],
          ]}
        />

        <p>そして何より強調しておきたいのが、<strong>ドキシペップは定期的なSTI検査の代わりにはならない</strong>ということ。予防効果が100%ではない以上、3か月ごとの検査を併用することがCDCガイドラインでも強く推奨されています。</p>
      </section>

      <InlineCTA />

      {/* ── セクション6: 日本での位置づけ ── */}
      <section>
        <h2 id="japan-status" className="text-xl font-bold text-gray-800">日本ではどうなっている？ — 自費診療での新しい選択肢</h2>

        <p>率直に言うと、日本ではまだ<strong>ドキシペップに関する公式ガイドラインはありません</strong>。日本性感染症学会や厚生労働省からの推奨も出ていない状態です。</p>

        <p>しかし現場では、一部のクリニックが<strong>自費診療</strong>としてドキシペップの処方を始めています。ドキシサイクリン自体は日本で承認済みの薬剤であり、適応外使用として処方すること自体に法的な問題はありません。</p>

        <Callout type="info" title="コンドームが第一選択であることは変わらない">
          ドキシペップはあくまで<strong>「追加の予防手段」</strong>です。最も効果的なSTI予防は引き続きコンドームの正しい使用であり、ドキシペップはそれを補完するものです。「ドキシペップがあるからコンドームは不要」という考え方は危険であり、<strong>HIV・HPV・ヘルペスなどウイルス性STIにはドキシペップは一切効果がありません</strong>。
        </Callout>

        <p>オンライン診療の普及により、こうした<strong>自費の予防的処方へのアクセスは確実に広がっています</strong>。患者さんが正しい知識を持ったうえで医師と相談し、自分に合った予防戦略を選べる環境づくりが重要です。</p>
      </section>

      {/* ── セクション7: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — ドキシペップは「知っておくべき選択肢」</h2>

        <p>ドキシペップは、性行為後にドキシサイクリンを1回服用するだけで<strong>梅毒・クラミジアのリスクを約80〜90%下げられる</strong>、エビデンスに基づいた予防法です。CDCがガイドラインを発表したことで、世界的に認知が広がりつつあります。</p>

        <p>ただし、淋病への効果は限定的であること、シスジェンダー女性でのデータが不十分であること、そして抗菌薬耐性の問題は引き続き注視が必要です。<strong>コンドームの使用＋定期的なSTI検査＋ドキシペップ</strong>という多層的な予防アプローチが、現時点でのベストプラクティスと言えるでしょう。</p>

        <Callout type="point" title="クリニック運営者の方へ">
          梅毒・STIの急増に伴い、予防医療への関心は高まっています。ドキシペップのようなエビデンスに基づく予防的処方は、<strong>オンライン診療との相性が非常に良い</strong>分野です。LINE公式アカウントを活用した予約・服薬フォロー・定期検査のリマインドなど、患者さんの継続的な予防行動をサポートする仕組みづくりが重要になってきます。STDオンライン診療の立ち上げ方については<Link href="/clinic/column/std-online-clinic-lope" className="text-sky-600 underline hover:text-sky-800">STDオンライン診療の始め方</Link>もあわせてお読みください。
        </Callout>
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
