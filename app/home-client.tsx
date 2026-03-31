"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

import {
  motion,
  useScroll,
  useTransform,
} from "motion/react";

/* ═══════════════════════════════════════════════════════════════════════════
   Lオペ 統合トップページ — リッチデザイン + ミニモック + モーション
   ═══════════════════════════════════════════════════════════════════════════ */

/* ------------------------------------------------------------------ */
/*  FadeIn ラッパー                                                     */
/* ------------------------------------------------------------------ */
function FadeIn({
  children,
  delay = 0,
  className = "",
  y = 24,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  SVGアイコン                                                         */
/* ------------------------------------------------------------------ */

function LineIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M12 2C6.48 2 2 5.82 2 10.5c0 4.21 3.74 7.74 8.79 8.4.34.07.81.23.93.52.1.27.07.68.03.95l-.15.91c-.05.27-.21 1.07.94.58 1.14-.49 6.17-3.63 8.42-6.22C22.86 13.46 22 11.82 22 10.5 22 5.82 17.52 2 12 2zm-3.5 11a.5.5 0 01-.5-.5v-4a.5.5 0 011 0v3.5H10a.5.5 0 010 1H8.5zm2 0a.5.5 0 01-.5-.5v-4a.5.5 0 011 0v4a.5.5 0 01-.5.5zm4 0a.5.5 0 01-.42-.23L12.5 10.6v1.9a.5.5 0 01-1 0v-4a.5.5 0 01.92-.27L14 10.4V8.5a.5.5 0 011 0v4a.5.5 0 01-.5.5zm3-.5a.5.5 0 010 1h-2a.5.5 0 01-.5-.5v-4a.5.5 0 01.5-.5h2a.5.5 0 010 1H16v1h1.5a.5.5 0 010 1H16v1h1.5z" />
    </svg>
  );
}

function ClinicIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-3 10h-2v2a2 2 0 01-4 0v-2H8a2 2 0 010-4h2V7a2 2 0 014 0v2h2a2 2 0 010 4z" />
    </svg>
  );
}

function SalonIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64a4 4 0 10-8 0 4 4 0 003.67 3.98L12 16.31l6.33-6.33A4 4 0 0022 6a4 4 0 00-8 0c0 .59.13 1.14.36 1.64L12 10l-2.36-2.36zM6 8a2 2 0 110-4 2 2 0 010 4zm12 0a2 2 0 110-4 2 2 0 010 4zM12 14l-1.41-1.41L12 11.17l1.41 1.42L12 14zm-4.29 3.29a1.5 1.5 0 10-2.12 2.12 1.5 1.5 0 002.12-2.12zm6.58 0l2.12 2.12a1.5 1.5 0 002.12-2.12l-2.12-2.12L14.29 17.29z" />
    </svg>
  );
}

function EcIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
      <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" />
    </svg>
  );
}

function IndustryIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 20h20M5 20V8l5 3V8l5 3V4h4v16" />
    </svg>
  );
}

function BrainIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
      <path d="M9 22h6M10 17v-3.34M14 17v-3.34" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  サービスデータ                                                      */
/* ------------------------------------------------------------------ */
type Service = {
  key: string;
  name: string;
  subtitle: string;
  href: string;
  color: string;
  colorLight: string;
  description: string;
  features: string[];
  catchphrase: string;
  comingSoon?: boolean;
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  cta: string;
};

const services: Service[] = [
  {
    key: "line",
    name: "Lオペ for LINE",
    subtitle: "LINE運用プラットフォーム",
    href: "/line/",
    color: "#06C755",
    colorLight: "rgba(6,199,85,0.08)",
    description:
      "あらゆる業種のLINE公式アカウント運用を、ひとつの管理画面で。",
    features: [
      "届けたい人だけに配信",
      "タップで予約完了",
      "AIが自動で返信",
    ],
    catchphrase: "届けたい人に、届くLINE。",
    Icon: LineIcon,
    cta: "LINE運用を見る",
  },
  {
    key: "clinic",
    name: "Lオペ for CLINIC",
    subtitle: "クリニック特化",
    href: "/clinic/",
    color: "#3b82f6",
    colorLight: "rgba(59,130,246,0.08)",
    description:
      "予約・問診・カルテ・決済をLINEに集約。月60時間の事務作業を削減。",
    features: [
      "LINEで問診を完結",
      "AIが返信を下書き",
      "処方・配送まで一気通貫",
    ],
    catchphrase: "患者対応を、LINEで完結。",
    Icon: ClinicIcon,
    cta: "クリニック向けを見る",
  },
  {
    key: "salon",
    name: "Lオペ for SALON",
    subtitle: "サロン特化",
    href: "/salon/",
    color: "#ec4899",
    colorLight: "rgba(236,72,153,0.08)",
    description:
      "施術者ごとの予約管理とリマインドで、リピート率を最大化。",
    features: [
      "LINEからそのまま予約",
      "施術履歴を自動で記録",
      "来店後にクーポン配信",
    ],
    catchphrase: "予約もリピートも、LINEで。",
    comingSoon: true,
    Icon: SalonIcon,
    cta: "準備中",
  },
  {
    key: "ec",
    name: "Lオペ for EC",
    subtitle: "EC・小売特化",
    href: "/ec/",
    color: "#8B7355",
    colorLight: "rgba(139,115,85,0.08)",
    description: "購買データと連動した配信で、LTVを引き上げる。",
    features: [
      "購入後に自動フォロー",
      "カゴ落ちをリマインド",
      "売上レポートを自動生成",
    ],
    catchphrase: "購入後もつながる、LINE。",
    comingSoon: true,
    Icon: EcIcon,
    cta: "準備中",
  },
];

/* ------------------------------------------------------------------ */
/*  特徴データ                                                          */
/* ------------------------------------------------------------------ */
const features = [
  {
    Icon: IndustryIcon,
    title: "業種別に最適化",
    description:
      "汎用ツールでは対応しきれない業種固有の業務フローに合わせて設計。導入初日から成果につながる。",
  },
  {
    Icon: BrainIcon,
    title: "AIが学習し続ける",
    description:
      "スタッフの修正内容から自動で学習し、返信精度が日々向上。運用するほど業務負荷が下がる。",
  },
  {
    Icon: ShieldIcon,
    title: "医療レベルのセキュリティ",
    description:
      "暗号化・監査ログ・アクセス制御を標準搭載。個人情報を扱う業種でも安心して運用できる。",
  },
];

/* ------------------------------------------------------------------ */
/*  ヒーローアイコンナビ                                                  */
/* ------------------------------------------------------------------ */
const heroIcons = [
  { label: "for LINE", color: "#06C755", bg: "rgba(6,199,85,0.10)", Icon: LineIcon },
  { label: "for CLINIC", color: "#3b82f6", bg: "rgba(59,130,246,0.10)", Icon: ClinicIcon },
  { label: "for SALON", color: "#ec4899", bg: "rgba(236,72,153,0.10)", Icon: SalonIcon },
  { label: "for EC", color: "#8B7355", bg: "rgba(139,115,85,0.10)", Icon: EcIcon },
];

/* ------------------------------------------------------------------ */
/*  サービスカード                                                      */
/* ------------------------------------------------------------------ */
function ServiceCard({
  service,
  index,
}: {
  service: Service;
  index: number;
}) {
  const { Icon } = service;
  return (
    <FadeIn delay={index * 0.12}>
      <a
        href={service.href}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-400 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-slate-200/60"
      >
        {/* 上端テーマカラーグラデーションライン */}
        <div
          className="h-[3px]"
          style={{
            background: `linear-gradient(90deg, ${service.color}, ${service.color}88)`,
          }}
        />

        {/* Coming Soonバッジ */}
        {service.comingSoon && (
          <span className="absolute top-5 right-5 z-10 rounded-full border border-slate-200 bg-slate-50/90 px-3 py-0.5 text-[10px] font-medium text-slate-400 backdrop-blur-sm">
            Coming Soon
          </span>
        )}

        <div className="flex flex-1 flex-col p-7 md:p-8">
          {/* カード上部のビジュアル */}
          <div
            className="mb-6 rounded-xl p-6 text-center"
            style={{
              background: `linear-gradient(135deg, ${service.color}15, ${service.color}08)`,
            }}
          >
            <Icon
              className="mx-auto h-10 w-10"
              style={{ color: service.color }}
            />
            <p
              className="mt-3 text-[15px] font-bold"
              style={{ color: service.color }}
            >
              {service.catchphrase}
            </p>
          </div>

          {/* アイコン + サービス名 */}
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: service.colorLight }}
            >
              <Icon
                className="h-5 w-5"
                style={{ color: service.color }}
              />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-slate-900">
                {service.name}
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                {service.subtitle}
              </p>
            </div>
          </div>

          {/* 説明 */}
          <p className="mb-5 text-[13px] leading-relaxed text-slate-500">
            {service.description}
          </p>

          {/* 機能リスト */}
          <ul className="flex-1 space-y-2">
            {service.features.map((f) => (
              <li
                key={f}
                className="flex items-center gap-2.5 text-[13px] text-slate-600"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: service.color }}
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="8"
                    fill="currentColor"
                    opacity="0.15"
                  />
                  <path
                    d="M5 8l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="mt-6 flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-all duration-300 group-hover:gap-3 group-hover:text-slate-700">
            {service.cta}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
            >
              <path
                d="M3 8h10m-4-4 4 4-4 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </a>
    </FadeIn>
  );
}

/* ================================================================== */
/*  メインコンポーネント                                                */
/* ================================================================== */
export default function HomeClient() {
  const [visible, setVisible] = useState(false);

  /* ヒーローアイコン浮遊用のスクロール値 */
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const iconY = useTransform(scrollYProgress, [0, 1], [0, -30]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="min-h-screen bg-white text-slate-900"
      style={{ fontFeatureSettings: "'palt'" }}
    >
      {/* ═══════════ ヒーロー ═══════════ */}
      <section
        ref={heroRef}
        className="relative flex min-h-[100dvh] items-center overflow-hidden"
      >
        {/* 背景装飾 */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-blue-100/40 blur-[120px]" />
          <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-slate-100/60 blur-[100px]" />
          <div className="absolute top-1/3 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-green-50/40 blur-[100px]" />
        </div>

        {/* グラデーション */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-white to-slate-50" />

        {/* コンテンツ */}
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-32 text-center md:py-0">
          {/* ロゴ */}
          <div
            className="mx-auto mb-4 transition-all duration-700"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
            }}
          >
            <Image
              src="/icon.png"
              alt="Lオペ"
              width={64}
              height={64}
              className="mx-auto rounded-2xl"
              priority
            />
          </div>

          {/* サービス名 */}
          <div
            className="mb-8 transition-all duration-700"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transitionDelay: "200ms",
            }}
          >
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">Lオペ</h1>
          </div>

          {/* メインキャッチコピー */}
          <div
            className="transition-all duration-1000"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transitionDelay: "400ms",
            }}
          >
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.3] tracking-tight text-slate-900">
              業種に最適化された
              <br />
              LINE運用プラットフォーム
            </h2>
          </div>

          {/* サブテキスト */}
          <div
            className="mt-6 transition-all duration-1000"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
              transitionDelay: "650ms",
            }}
          >
            <p className="mx-auto max-w-lg text-[16px] leading-relaxed text-slate-400">
              クリニック・サロン・EC。
              <br className="sm:hidden" />
              それぞれの業務フローに合わせて設計された、
              <br className="hidden sm:block" />
              LINE公式アカウント運用ツール。
            </p>
          </div>

          {/* 4サービスアイコンナビ */}
          <motion.div
            className="mx-auto mt-10"
            style={{ y: iconY }}
          >
            <div className="flex items-center justify-center gap-5 sm:gap-8">
              {heroIcons.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={visible ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full shadow-sm sm:h-12 sm:w-12"
                    style={{ backgroundColor: item.bg }}
                  >
                    <item.Icon
                      className="h-5 w-5"
                      style={{ color: item.color }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-semibold sm:text-[11px]"
                    style={{ color: item.color }}
                  >
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* スクロールインジケーター */}
          <motion.div
            className="mt-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            <motion.div
              className="mx-auto h-10 w-px bg-gradient-to-b from-slate-300 to-transparent"
              animate={{ scaleY: [0.6, 1, 0.6] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ originY: 0 }}
            />
          </motion.div>
        </div>
      </section>

      {/* ═══════════ サービスカード ═══════════ */}
      <section className="bg-slate-50/50 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="mb-16">
            <p className="text-[12px] font-medium tracking-[0.2em] text-slate-400">
              SERVICES
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
              あなたの業種に合ったプランを
            </h2>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-2">
            {services.map((s, i) => (
              <ServiceCard key={s.key} service={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 特徴セクション ═══════════ */}
      <section className="bg-white px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <FadeIn className="mb-16">
            <p className="text-[12px] font-medium tracking-[0.2em] text-slate-400">
              WHY L-OPE
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
              選ばれる理由
            </h2>
          </FadeIn>

          <div className="grid gap-12 md:grid-cols-3 md:gap-8">
            {features.map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.12}>
                <div className="border-t border-slate-200 pt-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <item.Icon className="h-5 w-5 text-slate-600" />
                  </div>
                  <h3 className="mb-3 text-[16px] font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-slate-400">
                    {item.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ フッター ═══════════ */}
      <footer className="border-t border-slate-100 bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-10 md:flex-row md:items-start md:justify-between">
            {/* ロゴ・運営 */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center gap-2.5 md:justify-start">
                <Image
                  src="/icon.png"
                  alt="Lオペ"
                  width={28}
                  height={28}
                  className="rounded-lg"
                />
                <span className="text-[15px] font-bold text-slate-900">
                  Lオペ
                </span>
              </div>
              <p className="mt-3 text-[12px] text-slate-400">
                運営:{" "}
                <a
                  href="https://ordix.co.jp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-slate-600"
                >
                  株式会社ORDIX
                </a>
              </p>
            </div>

            {/* サービスリンク */}
            <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[13px] text-slate-400">
              {services.map((s) => (
                <a
                  key={s.key}
                  href={s.href}
                  className="transition-colors hover:text-slate-700"
                >
                  {s.name}
                </a>
              ))}
              <a
                href="https://ordix.co.jp"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-slate-700"
              >
                法人サイト
              </a>
            </nav>
          </div>

          {/* パートナー募集 */}
          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-[12px] font-semibold text-slate-500">連携・代理店パートナー募集</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Lオペとの連携・代理店についてのご相談は
              <a href="mailto:partner@l-ope.jp" className="text-blue-600 underline ml-1">partner@l-ope.jp</a>
              までお問い合わせください。
            </p>
          </div>

          <div className="mt-12 border-t border-slate-200 pt-8 text-center text-[11px] text-slate-400">
            &copy; {new Date().getFullYear()} 株式会社ORDIX. All rights
            reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
