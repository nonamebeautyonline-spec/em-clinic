"use client";

import { motion, useScroll, useTransform } from "motion/react";

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
        href="/salon/contact?ref=salon"
        className="block w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 py-3.5 text-center text-[13px] font-bold text-white shadow-lg shadow-pink-500/20 transition hover:shadow-xl"
      >
        事前登録はこちら
      </a>
    </motion.div>
  );
}
