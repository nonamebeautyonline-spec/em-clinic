"use client";

import { useRef, useEffect, useState } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  useScroll,
  animate,
  type Variants,
} from "motion/react";

/* ═══════════════════════════════════════════════════════════════════════════
   Lオペ for EC — LP アニメーション共通コンポーネント
   ダークネイビー＋ゴールド基調のEC特化デザイン
   ═══════════════════════════════════════════════════════════════════════════ */

/* ──── フェードイン (スクロール登場時) ──── */
export function FadeIn({
  children,
  className = "",
  delay = 0,
  direction = "up",
  duration = 0.6,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  duration?: number;
}) {
  const offset = 40;
  const initial: Record<string, number> = { opacity: 0 };
  if (direction === "up") initial.y = offset;
  if (direction === "down") initial.y = -offset;
  if (direction === "left") initial.x = offset;
  if (direction === "right") initial.x = -offset;

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* ──── スタッガー子要素 ──── */
const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function StaggerChildren({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

/* ──── カウントアップ ──── */
export function CountUp({
  to,
  duration = 2,
  prefix = "",
  suffix = "",
  className = "",
  decimals = 0,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const motionVal = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionVal, to, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    });
    return controls.stop;
  }, [inView, to, duration, decimals, motionVal]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ──── パララックスセクション ──── */
export function ParallaxBg({
  children,
  className = "",
  speed = 0.3,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [`${speed * -100}px`, `${speed * 100}px`]);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div style={{ y }} className="absolute inset-0">
        {children}
      </motion.div>
    </div>
  );
}

/* ──── 浮遊アニメーション ──── */
export function FloatingElement({
  children,
  className = "",
  amplitude = 10,
  duration = 4,
}: {
  children: React.ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -amplitude, 0] }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

/* ──── スケールイン ──── */
export function ScaleIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* ──── テキストの1行ずつフェードイン ──── */
export function TextReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* ──── グロー付きパルスボタン（ゴールドグロー） ──── */
export function PulseGlow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="absolute inset-0 rounded-xl bg-amber-500/20 blur-xl"
        animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.15, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

/* ──── スライドイン（左右交互用） ──── */
export function SlideIn({
  children,
  className = "",
  from = "left",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  from?: "left" | "right";
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: from === "left" ? -60 : 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* ──── 背景Blob浮遊（ダークテーマ用） ──── */
export function AnimatedBlob({
  className = "",
  color = "bg-amber-500/10",
  size = 500,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <motion.div
      className={`pointer-events-none absolute rounded-full blur-[100px] ${color} ${className}`}
      style={{ width: size, height: size }}
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -25, 15, 0],
        scale: [1, 1.1, 0.95, 1],
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EC独自アニメーション
   ═══════════════════════════════════════════════════════════════════════════ */

/* ──── 注文タイムライン: ステップが順番にアクティブになる ──── */
export function OrderTimeline({
  steps,
  className = "",
}: {
  steps: { label: string; icon: string; sub?: string }[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    function runSequence() {
      if (cancelled) return;
      let i = 0;
      const interval = setInterval(() => {
        if (cancelled) { clearInterval(interval); return; }
        setActiveStep(i);
        i++;
        if (i >= steps.length) {
          clearInterval(interval);
          setTimeout(() => {
            if (!cancelled) {
              setActiveStep(-1);
              setTimeout(() => { if (!cancelled) runSequence(); }, 400);
            }
          }, 2500);
        }
      }, 600);
    }
    runSequence();
    return () => { cancelled = true; };
  }, [inView, steps.length]);

  return (
    <div ref={ref} className={`flex items-center gap-0 ${className}`}>
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <motion.div
            className="flex flex-col items-center gap-1.5"
            animate={{
              scale: activeStep >= i ? 1 : 0.85,
              opacity: activeStep >= i ? 1 : 0.4,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                activeStep >= i
                  ? "border-amber-400 bg-amber-500/20 text-amber-400"
                  : "border-slate-600 bg-slate-700/50 text-slate-500"
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={step.icon} /></svg>
            </div>
            <span className={`text-[10px] font-semibold whitespace-nowrap transition-colors duration-300 ${activeStep >= i ? "text-amber-400" : "text-slate-500"}`}>{step.label}</span>
          </motion.div>
          {i < steps.length - 1 && (
            <motion.div
              className="mx-1 h-0.5 w-5 rounded-full md:mx-1.5 md:w-8"
              animate={{
                backgroundColor: activeStep > i ? "#F59E0B" : "#334155",
              }}
              transition={{ duration: 0.3 }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ──── 売上カウンター: リアルタイム風カウントアップ ──── */
export function SalesCounter({
  className = "",
}: {
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const controls = animate(0, 3247800, {
      duration: 2.5,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate: (v) => { if (!cancelled) setAmount(Math.round(v)); },
    });
    const timeout = setTimeout(() => {
      if (cancelled) return;
      const interval = setInterval(() => {
        if (cancelled) { clearInterval(interval); return; }
        setAmount((prev) => prev + Math.floor(Math.random() * 3000) + 500);
      }, 2000);
    }, 3000);
    return () => {
      cancelled = true;
      controls.stop();
      clearTimeout(timeout);
    };
  }, [inView]);

  return (
    <div ref={ref} className={className}>
      <div className="text-[11px] font-semibold text-amber-400/70 tracking-wider">TODAY&apos;S SALES</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-[10px] text-amber-400/50">&yen;</span>
        <motion.span
          key={amount}
          initial={{ y: -5, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-3xl font-black text-amber-400 tabular-nums md:text-4xl"
        >
          {amount.toLocaleString()}
        </motion.span>
      </div>
    </div>
  );
}

/* ──── カゴ落ち回収フロー: 3ステップが矢印でつながるアニメーション ──── */
export function CartRecoveryFlow({
  className = "",
}: {
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [step, setStep] = useState(-1);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    function runSequence() {
      if (cancelled) return;
      const steps = [0, 1, 2];
      let i = 0;
      const interval = setInterval(() => {
        if (cancelled) { clearInterval(interval); return; }
        setStep(steps[i]);
        i++;
        if (i >= steps.length) {
          clearInterval(interval);
          setTimeout(() => {
            if (!cancelled) {
              setStep(-1);
              setTimeout(() => { if (!cancelled) runSequence(); }, 400);
            }
          }, 2500);
        }
      }, 800);
    }
    runSequence();
    return () => { cancelled = true; };
  }, [inView]);

  const flowSteps = [
    { label: "カート放棄", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
    { label: "LINE通知", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
    { label: "購入完了", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  ];

  return (
    <div ref={ref} className={`flex items-center justify-center gap-2 ${className}`}>
      {flowSteps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <motion.div
            className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-3 ${step >= i ? s.bg : "border-slate-700 bg-slate-800/50"}`}
            animate={{
              scale: step >= i ? 1.05 : 0.95,
              opacity: step >= i ? 1 : 0.4,
            }}
            transition={{ duration: 0.4 }}
          >
            <svg className={`h-6 w-6 ${step >= i ? s.color : "text-slate-600"}`} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={s.icon} /></svg>
            <span className={`text-[10px] font-bold ${step >= i ? s.color : "text-slate-600"}`}>{s.label}</span>
          </motion.div>
          {i < flowSteps.length - 1 && (
            <motion.div
              animate={{ opacity: step > i ? 1 : 0.2, scale: step > i ? 1 : 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <svg className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ──── ゴールドシマー: ゴールドの光沢が流れるエフェクト ──── */
export function GoldShimmer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={`relative overflow-hidden ${className}`}>
      {children}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
      />
    </motion.div>
  );
}
