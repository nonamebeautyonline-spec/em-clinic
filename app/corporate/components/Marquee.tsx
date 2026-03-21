"use client";

/* 無限横スクロールマーキー */

const ITEMS = [
  "Next.js", "React", "TypeScript", "Supabase", "Vercel",
  "LINE API", "PostgreSQL", "Redis", "OpenAI", "Stripe",
  "Tailwind CSS", "Node.js", "REST API", "WebSocket", "CI/CD",
];

export default function Marquee() {
  const list = [...ITEMS, ...ITEMS]; // 2倍にしてシームレスループ

  return (
    <div className="relative w-full overflow-hidden py-6">
      {/* 左右フェードマスク */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#050608] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#050608] to-transparent" />

      <div className="flex w-max animate-[marquee_30s_linear_infinite]">
        {list.map((item, i) => (
          <span
            key={i}
            className="mx-5 whitespace-nowrap font-mono text-[13px] font-medium tracking-wide text-slate-600"
          >
            {item}
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
