"use client";

import { motion, useScroll, useTransform } from "motion/react";

/* ═══════════════════════════════════════════════════════════════════════════
   モバイル固定CTA — スクロール追従
   ═══════════════════════════════════════════════════════════════════════════ */

export function MobileCTA() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [500, 650], [0, 1]);
  const y = useTransform(scrollY, [500, 650], [20, 0]);

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-pink-100 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(236,72,153,0.1)] backdrop-blur md:hidden"
      style={{ opacity, y }}
      initial={{ opacity: 0, y: 20 }}
    >
      <div className="flex items-center gap-2">
        <a
          href="/salon/contact?ref=salon"
          className="flex-1 block rounded-xl bg-gradient-to-r from-pink-500 via-rose-400 to-fuchsia-400 py-3.5 text-center text-[13px] font-bold text-white shadow-lg shadow-pink-500/20 transition hover:shadow-xl"
        >
          事前登録はこちら
        </a>
        <span className="shrink-0 rounded-full bg-pink-50 px-2 py-1 text-[9px] font-bold text-pink-500 ring-1 ring-pink-200">
          準備中
        </span>
      </div>
    </motion.div>
  );
}
