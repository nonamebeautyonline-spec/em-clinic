import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "キャンセル・解約ポリシー | Lオペ for CLINIC",
  description:
    "Lオペ for CLINIC のキャンセル・解約ポリシーについてご案内します。解約手続き、最低契約期間、データ取扱い、返金ポリシー等をご確認ください。",
  alternates: { canonical: "https://l-ope.jp/lp/cancel" },
};

export default function CancelPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-br from-blue-600 to-sky-500 px-5 py-16 text-center">
        <h1 className="text-2xl font-extrabold text-white md:text-3xl">
          キャンセル・解約ポリシー
        </h1>
        <p className="mt-2 text-sm text-blue-100">Lオペ for CLINIC</p>
      </div>

      {/* 本文 */}
      <div className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-sm leading-relaxed text-slate-600">
          本ポリシーは、株式会社株式会社ORDIX（以下「当社」）が提供するクリニック特化LINE運用プラットフォーム「Lオペ
          for
          CLINIC」（以下「本サービス」）のキャンセル・解約に関する条件を定めるものです。ご契約前に必ずご確認ください。
        </p>

        {/* 1. 解約手続きの方法 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          1. 解約手続きの方法
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          本サービスの解約は、以下のいずれかの方法でお手続きいただけます。
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-600">
          <li>
            <span className="font-semibold text-slate-700">管理画面から</span>
            ：管理画面の「アカウント設定」→「契約情報」→「解約申請」より、画面の案内に沿って手続きを行ってください。
          </li>
          <li>
            <span className="font-semibold text-slate-700">
              サポート窓口へ連絡
            </span>
            ：メールまたはLINE公式アカウントのチャットから、ご契約者名・クリニック名・解約希望月をお伝えください。担当者が手続きをご案内いたします。
          </li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          解約申請の受領後、当社より確認メールをお送りします。確認メールの送信をもって解約申請の受付完了といたします。
        </p>

        {/* 2. 最低契約期間 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          2. 最低契約期間
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          本サービスの最低契約期間は、ご利用開始日から
          <span className="font-semibold text-slate-700">6ヶ月間</span>
          です。最低契約期間中の解約はできません。
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          最低契約期間満了後は、1ヶ月単位での自動更新となります。解約の申請がない限り、契約は自動的に更新されます。
        </p>

        {/* 3. 解約通知期間 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          3. 解約通知期間
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          解約をご希望の場合は、解約希望月の
          <span className="font-semibold text-slate-700">前月末日まで</span>
          に解約申請を完了してください。
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          例：4月末での解約をご希望の場合は、3月31日までに解約申請が必要です。期日を過ぎた場合は翌月末日での解約となります。
        </p>

        {/* 4. 解約時のデータ取扱い */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          4. 解約時のデータ取扱い
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          解約後のデータは、以下のとおり取り扱います。
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-600">
          <li>
            解約日から
            <span className="font-semibold text-slate-700">30日間</span>
            は、全データを当社サーバーに保持します。この期間内であれば、再契約時にデータの復元が可能です。
          </li>
          <li>
            30日間の保持期間終了後、患者情報・予約データ・トーク履歴・カルテデータ等すべてのデータを
            <span className="font-semibold text-slate-700">完全に削除</span>
            します。削除後のデータ復元はできません。
          </li>
          <li>
            データのエクスポートをご希望の場合は、解約申請前に管理画面のエクスポート機能をご利用いただくか、サポート窓口までご連絡ください。
          </li>
        </ul>

        {/* 5. 返金ポリシー */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          5. 返金ポリシー
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          返金に関する条件は以下のとおりです。
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-600">
          <li>
            <span className="font-semibold text-slate-700">月額利用料</span>
            ：月途中での解約の場合でも、日割りでの返金は行いません。解約月末日までサービスをご利用いただけます。
          </li>
          <li>
            <span className="font-semibold text-slate-700">初期費用</span>
            ：導入支援を含む初期費用は、サービス提供開始後の返金はいたしかねます。契約締結前のキャンセルについては、着手状況に応じて個別に対応いたします。
          </li>
        </ul>

        {/* 6. プラン変更・ダウングレード */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          6. プラン変更・ダウングレード
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          プランの変更やダウングレードは、管理画面またはサポート窓口からお申し込みいただけます。
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-600">
          <li>
            プラン変更は申請月の
            <span className="font-semibold text-slate-700">翌月1日</span>
            から適用されます。
          </li>
          <li>
            プラン変更月における差額の精算（日割り計算・差額返金）は行いません。
          </li>
          <li>
            ダウングレードにより利用可能な機能やデータ容量が変更になる場合があります。事前に管理画面でご確認ください。
          </li>
        </ul>

        {/* 7. アカウント一時停止 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          7. アカウント一時停止
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          一時的にサービスのご利用を休止されたい場合、アカウントの一時停止が可能です。
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-relaxed text-slate-600">
          <li>
            一時停止期間は最大
            <span className="font-semibold text-slate-700">3ヶ月間</span>
            です。
          </li>
          <li>
            一時停止中は月額利用料の
            <span className="font-semibold text-slate-700">50%</span>
            （¥25,000/月）でアカウントとデータを維持します。
          </li>
          <li>
            一時停止中はサービスの全機能（LINE配信・予約管理・トーク機能等）が停止されます。患者様への自動応答やリマインド配信も停止となります。
          </li>
          <li>
            一時停止期間終了後は自動的に通常契約に復帰します。延長をご希望の場合は、期間終了前にサポート窓口までご連絡ください。
          </li>
          <li>
            3ヶ月を超えて利用休止をご希望の場合は、一度解約のうえ再契約の手続きをお願いいたします。
          </li>
        </ul>

        {/* 8. お問い合わせ窓口 */}
        <h2 className="mt-10 mb-3 text-lg font-bold text-slate-800">
          8. お問い合わせ窓口
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          キャンセル・解約に関するご質問やご相談は、以下の窓口までお気軽にお問い合わせください。
        </p>
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-700">
            Lオペ for CLINIC サポート窓口
          </p>
          <p className="mt-2 text-sm text-slate-600">
            運営：株式会社ORDIX
          </p>
          <p className="mt-1 text-sm text-slate-600">
            メール：contact@l-ope.jp
          </p>
          <p className="mt-1 text-sm text-slate-600">
            受付時間：平日 10:00〜18:00（土日祝日・年末年始を除く）
          </p>
        </div>

        {/* 施行日 */}
        <div className="mt-12 border-t border-slate-200 pt-6">
          <p className="text-right text-xs text-slate-400">
            制定日：2026年3月10日
          </p>
        </div>

        {/* フッター：LPへの戻りリンク */}
        <div className="mt-10 text-center">
          <Link
            href="/lp"
            className="inline-block rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
