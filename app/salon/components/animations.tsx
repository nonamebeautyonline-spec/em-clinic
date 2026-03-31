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
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export function StaggerChildren({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <motion.div className={className} variants={staggerItem}>{children}</motion.div>;
}

/* ──── カウントアップ ──── */
export function CountUp({ to, duration = 2, prefix = "", suffix = "", className = "", decimals = 0 }: {
  to: number; duration?: number; prefix?: string; suffix?: string; className?: string; decimals?: number;
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

  return <span ref={ref} className={className}>{prefix}{display}{suffix}</span>;
}

/* ──── テキストリビール ──── */
export function TextReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
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

/* ──── 背景Blob浮遊 ──── */
export function AnimatedBlob({ className = "", color = "bg-pink-100/40", size = 500 }: {
  className?: string; color?: string; size?: number;
}) {
  return (
    <motion.div
      className={`pointer-events-none absolute rounded-full blur-[100px] ${color} ${className}`}
      style={{ width: size, height: size }}
      animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0], scale: [1, 1.1, 0.95, 1] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ──── グロー付きパルスボタン ──── */
export function PulseGlow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={`relative ${className}`} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
      <motion.div
        className="absolute inset-0 rounded-xl bg-pink-500/20 blur-xl"
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.1, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

/* ──── スライドイン ──── */
export function SlideIn({ children, className = "", from = "left", delay = 0 }: {
  children: React.ReactNode; className?: string; from?: "left" | "right"; delay?: number;
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

/* ──── スケールイン ──── */
export function ScaleIn({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
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
