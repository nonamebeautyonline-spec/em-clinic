// 分野選択ページ — マルチ分野モード時に問診の前に表示
"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";

interface MedicalFieldItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  color_theme: string;
}

interface FieldsResponse {
  multiFieldEnabled: boolean;
  fields: MedicalFieldItem[];
  defaultFieldId: string | null;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  emerald: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700" },
  blue: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700" },
  pink: { bg: "bg-pink-50", border: "border-pink-300", text: "text-pink-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700" },
  rose: { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-700" },
  teal: { bg: "bg-teal-50", border: "border-teal-300", text: "text-teal-700" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-300", text: "text-indigo-700" },
  orange: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700" },
};

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export default function FieldSelectPage() {
  const router = useRouter();
  const { data, isLoading } = useSWR<FieldsResponse>(
    "/api/mypage/medical-fields",
    fetcher
  );

  // 単一分野モードの場合は直接問診ページへ
  if (data && !data.multiFieldEnabled) {
    const defaultId = data.defaultFieldId;
    router.replace(defaultId ? `/intake?fieldId=${defaultId}` : "/intake");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const fields = data?.fields ?? [];

  const handleSelect = (fieldId: string) => {
    router.push(`/intake?fieldId=${fieldId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">診療分野を選択</h1>
        <p className="text-xs text-gray-500 mt-0.5">受診したい分野をお選びください</p>
      </header>

      <main className="flex-1 px-4 py-6 space-y-3">
        {fields.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            利用可能な分野がありません
          </p>
        )}

        {fields.map((field) => {
          const colors = COLOR_MAP[field.color_theme] ?? COLOR_MAP.emerald;
          return (
            <button
              key={field.id}
              onClick={() => handleSelect(field.id)}
              className={`w-full text-left p-4 rounded-xl border-2 ${colors.border} ${colors.bg} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center gap-3">
                {field.icon_url ? (
                  <img src={field.icon_url} alt="" className="w-8 h-8 rounded" />
                ) : (
                  <div className={`w-8 h-8 rounded-lg ${colors.text} bg-white/60 flex items-center justify-center text-lg font-bold`}>
                    {field.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className={`text-base font-semibold ${colors.text}`}>{field.name}</p>
                  {field.description && (
                    <p className="text-xs text-gray-600 mt-0.5">{field.description}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </main>

      <footer className="px-4 py-3 border-t bg-white">
        <button
          onClick={() => router.push("/mypage")}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          マイページに戻る
        </button>
      </footer>
    </div>
  );
}
