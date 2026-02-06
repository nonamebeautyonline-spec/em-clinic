// app/layoutTransition.tsx
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

export default function LayoutTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // /admin 配下はAdminLayout側で遷移制御するためアニメーション無効
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <div className="h-full">{children}</div>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
