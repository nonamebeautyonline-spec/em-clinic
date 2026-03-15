"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════════════
   モバイル固定CTAバー（スクロール600px以降で表示）
   ═══════════════════════════════════════════════════════════════════════════ */

export function MobileCTA() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [500, 650], [0, 1]);
  const y = useTransform(scrollY, [500, 650], [20, 0]);

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      style={{ opacity, y }}
      /* pointer-events を opacity に連動（非表示時はクリック不可） */
      initial={{ opacity: 0, y: 20 }}
    >
      <Link
        href="/lp/entry-BYagL-x_JX2JSAeN"
        className="block w-full rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 py-3.5 text-center text-[13px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl"
      >
        お問い合わせ
      </Link>
    </motion.div>
  );
}
