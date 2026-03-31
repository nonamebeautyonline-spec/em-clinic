"use client";

import { motion, useScroll, useTransform } from "motion/react";

/* ═══════════════════════════════════════════════════════════════════════════
   モバイル固定CTA — スクロールで出現するフローティングバー
   ═══════════════════════════════════════════════════════════════════════════ */

export function MobileCTA() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [500, 650], [0, 1]);
  const y = useTransform(scrollY, [500, 650], [20, 0]);

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      style={{ opacity, y }}
      initial={{ opacity: 0, y: 20 }}
    >
      <a
        href="/line/contact?ref=line"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#06C755] to-[#00B900] py-3.5 text-center text-[13px] font-bold text-white shadow-lg shadow-[#06C755]/20 transition hover:shadow-xl"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.93 1.95 5.5 4.86 7.08-.17.62-.64 2.3-.73 2.65-.12.46.17.45.35.33.14-.1 2.19-1.47 3.08-2.07.47.07.95.11 1.44.11 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" /></svg>
        無料で始める
      </a>
    </motion.div>
  );
}
