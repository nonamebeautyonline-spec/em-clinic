"use client";

import { useRef, useEffect, useState, useCallback } from "react";
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
   Lオペ LP アニメーション共通コンポーネント
   LINE緑テーマ / framer-motion v12 スクロール連動アニメーション群
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
      viewport={{ once: true, margin: "0px" }}
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
    <motion.div className={className} variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: "0px" }}>
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
  const inView = useInView(ref, { once: true, margin: "0px" });
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
      viewport={{ once: true, margin: "0px" }}
      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
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
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/* ──── 背景Blob浮遊 ──── */
export function AnimatedBlob({ className = "", color = "bg-emerald-100/40", size = 500 }: {
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
        className="absolute inset-0 rounded-xl bg-[#06C755]/20 blur-xl"
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
      viewport={{ once: true, margin: "0px" }}
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
      viewport={{ once: true, margin: "0px" }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LINE特有のアニメーション
   ═══════════════════════════════════════════════════════════════════════════ */

/* ──── メッセージバブル: LINEの吹き出しがタイプライター的に表示 ──── */
export function MessageBubble({
  text,
  from = "other",
  delay = 0,
  className = "",
  children,
}: {
  text?: string;
  from?: "me" | "other";
  delay?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  const [displayed, setDisplayed] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const showTimer = setTimeout(() => {
      setShowBubble(true);
      if (text) {
        setTyping(true);
        let i = 0;
        const interval = setInterval(() => {
          i++;
          setDisplayed(text.slice(0, i));
          if (i >= text.length) {
            clearInterval(interval);
            setTyping(false);
          }
        }, 30);
        return () => clearInterval(interval);
      }
    }, delay * 1000);
    return () => clearTimeout(showTimer);
  }, [inView, text, delay]);

  const isMe = from === "me";

  return (
    <div ref={ref} className={`flex ${isMe ? "justify-end" : "justify-start"} ${className}`}>
      {showBubble ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={`relative max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
            isMe
              ? "rounded-br-md bg-[#06C755] text-white"
              : "rounded-bl-md bg-white text-slate-700 shadow-sm"
          }`}
        >
          {children || (
            <>
              {displayed}
              {typing && <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-current" />}
            </>
          )}
        </motion.div>
      ) : (
        /* タイピングインジケータ（表示前） */
        inView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`rounded-2xl px-4 py-3 ${isMe ? "rounded-br-md bg-[#06C755]/10" : "rounded-bl-md bg-white shadow-sm"}`}
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className={`h-2 w-2 rounded-full ${isMe ? "bg-[#06C755]/40" : "bg-slate-300"}`}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </motion.div>
        )
      )}
    </div>
  );
}

/* ──── ChatFlow: 会話のやりとりがスクロールで順番に出現 ──── */
export function ChatFlow({
  messages,
  className = "",
}: {
  messages: { text?: string; from: "me" | "other"; children?: React.ReactNode }[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px" });

  return (
    <div ref={ref} className={`space-y-3 ${className}`}>
      {messages.map((msg, i) => (
        <MessageBubble
          key={i}
          text={msg.text}
          from={msg.from}
          delay={inView ? i * 0.8 : 999}
        >
          {msg.children}
        </MessageBubble>
      ))}
    </div>
  );
}

/* ──── フローティングLINEアイコン装飾 ──── */
export function FloatingLineIcons({ className = "" }: { className?: string }) {
  const icons = [
    { x: "10%", y: "15%", size: 24, delay: 0, opacity: 0.08 },
    { x: "85%", y: "25%", size: 32, delay: 1, opacity: 0.06 },
    { x: "75%", y: "70%", size: 20, delay: 2, opacity: 0.07 },
    { x: "15%", y: "80%", size: 28, delay: 0.5, opacity: 0.05 },
    { x: "50%", y: "10%", size: 22, delay: 1.5, opacity: 0.06 },
    { x: "40%", y: "85%", size: 26, delay: 2.5, opacity: 0.07 },
  ];

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {icons.map((icon, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: icon.x, top: icon.y, opacity: icon.opacity }}
          animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: icon.delay }}
        >
          <svg width={icon.size} height={icon.size} viewBox="0 0 24 24" fill="#06C755">
            <path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.93 1.95 5.5 4.86 7.08-.17.62-.64 2.3-.73 2.65-.12.46.17.45.35.33.14-.1 2.19-1.47 3.08-2.07.47.07.95.11 1.44.11 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

/* ──── GradientText: グラデーション付きテキスト ──── */
export function GradientText({
  children,
  className = "",
  from = "#06C755",
  to = "#00B900",
}: {
  children: React.ReactNode;
  className?: string;
  from?: string;
  to?: string;
}) {
  return (
    <span
      className={`bg-clip-text text-transparent ${className}`}
      style={{ backgroundImage: `linear-gradient(to right, ${from}, ${to})` }}
    >
      {children}
    </span>
  );
}

/* ──── NumberTicker: 数値がスクロール時にティッカー表示 ──── */
export function NumberTicker({
  value,
  className = "",
  suffix = "",
  prefix = "",
}: {
  value: string;
  className?: string;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px" });

  return (
    <div ref={ref} className={`inline-flex items-baseline ${className}`}>
      {prefix && <span>{prefix}</span>}
      <motion.span
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {value}
      </motion.span>
      {suffix && <span>{suffix}</span>}
    </div>
  );
}
