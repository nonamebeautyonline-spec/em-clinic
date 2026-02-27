"use client";

import type { BlockAction } from "@/lib/flex-editor/block-types";

interface ActionEditorProps {
  action: BlockAction;
  onChange: (action: BlockAction) => void;
}

export function ActionEditor({ action, onChange }: ActionEditorProps) {
  return (
    <div className="space-y-2">
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">アクション</label>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          {[
            { value: "url" as const, label: "URL" },
            { value: "message" as const, label: "メッセージ" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...action, type: opt.value })}
              className={`flex-1 px-3 py-1.5 text-[11px] font-medium transition-colors ${
                action.type === opt.value
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">
          {action.type === "url" ? "URL" : "メッセージ内容"}
        </label>
        <input
          type="text"
          value={action.value}
          onChange={(e) => onChange({ ...action, value: e.target.value })}
          placeholder={action.type === "url" ? "https://..." : "送信するテキスト"}
          className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
        />
      </div>
    </div>
  );
}
