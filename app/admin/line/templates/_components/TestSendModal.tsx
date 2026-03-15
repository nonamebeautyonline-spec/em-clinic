"use client";

import type { Template, TestAccount } from "./template-types";
import { fixFlexForSend } from "./template-types";

interface TestSendModalProps {
  template: Template;
  testAccounts: TestAccount[];
  selectedTestIds: string[];
  setSelectedTestIds: (ids: string[]) => void;
  onClose: () => void;
  onSendComplete: (result: { id: number; ok: boolean; message: string }) => void;
}

export function TestSendModal({
  template,
  testAccounts,
  selectedTestIds,
  setSelectedTestIds,
  onClose,
  onSendComplete,
}: TestSendModalProps) {
  const executeTestSend = async () => {
    if (selectedTestIds.length === 0) return;
    onClose();

    const results: string[] = [];
    let allOk = true;
    for (const pid of selectedTestIds) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = { patient_id: pid };
        if (template.message_type === "imagemap" && template.imagemap_actions) {
          body.message_type = "imagemap";
          body.imagemap = {
            imageUrl: template.content,
            altText: template.name,
            data: template.imagemap_actions,
          };
          body.message = "";
          body.template_name = template.name;
        } else if (template.message_type === "flex" && template.flex_content) {
          body.message_type = "flex";
          const fixedContent = fixFlexForSend(template.flex_content);
          body.flex = { type: "flex", altText: template.name, contents: fixedContent };
          body.message = "";
        } else if (template.message_type === "image") {
          body.message_type = "image";
          body.message = template.content;
          body.template_name = template.name;
        } else {
          body.message = template.content;
        }
        const res = await fetch("/api/admin/line/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        const account = testAccounts.find(a => a.patient_id === pid);
        const name = account?.patient_name || pid;
        if (data.ok) {
          results.push(`${name}: 送信完了`);
        } else {
          allOk = false;
          const debugInfo = data._debug ? ` [${data._debug}]` : "";
          const payload = data._payload ? ` payload:${data._payload.substring(0, 200)}` : "";
          results.push(`${name}: ${(data.message || data.error) || "失敗"}${debugInfo}${payload}`);
        }
      } catch {
        allOk = false;
        const account = testAccounts.find(a => a.patient_id === pid);
        results.push(`${account?.patient_name || pid}: 通信エラー`);
      }
    }
    onSendComplete({
      id: template.id,
      ok: allOk,
      message: results.join(" / "),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">テスト送信</h3>
          <p className="text-xs text-gray-500 mt-1">
            「{template.name}」を送信する宛先を選択してください
          </p>
        </div>
        <div className="px-6 py-4 space-y-2 max-h-[300px] overflow-y-auto">
          {testAccounts.map((a) => (
            <label
              key={a.patient_id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                selectedTestIds.includes(a.patient_id)
                  ? "border-amber-300 bg-amber-50"
                  : "border-gray-200 hover:bg-gray-50"
              } ${!a.has_line_uid ? "opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                checked={selectedTestIds.includes(a.patient_id)}
                disabled={!a.has_line_uid}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedTestIds([...selectedTestIds, a.patient_id]);
                  } else {
                    setSelectedTestIds(selectedTestIds.filter(id => id !== a.patient_id));
                  }
                }}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-800">{a.patient_name || a.patient_id}</span>
                {!a.has_line_uid && (
                  <span className="ml-2 text-[10px] text-red-500">LINE未連携</span>
                )}
              </div>
            </label>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={executeTestSend}
            disabled={selectedTestIds.length === 0}
            className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-40 text-sm font-medium transition-colors"
          >
            {selectedTestIds.length}人に送信
          </button>
        </div>
      </div>
    </div>
  );
}
