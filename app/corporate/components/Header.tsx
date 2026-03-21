"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "About", sub: "会社概要", href: "/corporate/about" },
  { label: "Business", sub: "事業内容", href: "/corporate/business" },
  { label: "Product", sub: "プロダクト", href: "/corporate/product" },
  { label: "Contact", sub: "お問い合わせ", href: "/corporate/contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isTop = pathname === "/corporate";

  useEffect(() => { setOpen(false); }, [pathname]);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    fn();
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const transparent = isTop && !scrolled && !open;

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-700 ${
          transparent
            ? "bg-transparent"
            : "bg-white/[0.97] shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-xl"
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6 md:px-10">
          <Link
            href="/corporate"
            className={`text-[15px] font-black tracking-[0.15em] transition-colors duration-500 ${
              transparent ? "text-white" : "text-slate-900"
            }`}
            data-cursor-hover
          >
            ORDIX
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 ${
              transparent
                ? "text-white/70 hover:bg-white/10"
                : "text-slate-400 hover:bg-slate-100"
            }`}
            aria-label="メニュー"
            aria-expanded={open}
            data-cursor-hover
          >
            <div className="relative h-4 w-5">
              <span
                className="absolute left-0 block h-[1.5px] w-5 rounded-full bg-current transition-all duration-500"
                style={{
                  top: open ? "7px" : "0px",
                  transform: open ? "rotate(45deg)" : "none",
                }}
              />
              <span
                className="absolute left-0 top-[7px] block h-[1.5px] w-5 rounded-full bg-current transition-all duration-300"
                style={{ opacity: open ? 0 : 1, transform: open ? "translateX(8px)" : "none" }}
              />
              <span
                className="absolute left-0 block h-[1.5px] w-5 rounded-full bg-current transition-all duration-500"
                style={{
                  top: open ? "7px" : "14px",
                  transform: open ? "rotate(-45deg)" : "none",
                }}
              />
            </div>
          </button>
        </div>
      </header>

      {/* ── フルスクリーンメニュー ── */}
      <div
        className={`fixed inset-0 z-40 bg-[#050608] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        style={{
          clipPath: open
            ? "circle(150% at calc(100% - 40px) 36px)"
            : "circle(0% at calc(100% - 40px) 36px)",
        }}
      >
        <div className="flex h-full flex-col items-start justify-center px-10 md:px-20">
          <nav className="space-y-2">
            {NAV_ITEMS.map((item, i) => (
              <div
                key={item.href}
                style={{
                  opacity: open ? 1 : 0,
                  transform: open ? "translateY(0)" : "translateY(30px)",
                  transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${open ? 300 + i * 100 : 0}ms`,
                }}
              >
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-baseline gap-6 py-4"
                  data-cursor-hover
                >
                  <span className="text-4xl font-black text-white transition-colors duration-300 group-hover:text-blue-400 md:text-6xl">
                    {item.label}
                  </span>
                  <span className="text-sm text-slate-600 transition-colors duration-300 group-hover:text-slate-400">
                    {item.sub}
                  </span>
                </Link>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
