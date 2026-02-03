"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Doctor = {
  doctor_id: string;
  doctor_name: string;
  is_active: boolean;
  sort_order: number;
  color?: string;
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Doctor | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, []);

  async function loadDoctors() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/schedule?start=2000-01-01&end=2000-01-01", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.ok) {
        setDoctors(json.doctors || []);
      }
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(doctor: Doctor) {
    setEditingId(doctor.doctor_id);
    setDraft({ ...doctor });
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function startNew() {
    const newDoctor: Doctor = {
      doctor_id: "",
      doctor_name: "",
      is_active: true,
      sort_order: doctors.length,
      color: "",
    };
    setEditingId("__new__");
    setDraft(newDoctor);
    setMsg(null);
  }

  async function saveDraft() {
    if (!draft) return;
    if (!draft.doctor_id.trim()) {
      setMsg({ type: "error", text: "医師IDを入力してください" });
      return;
    }
    if (!draft.doctor_name.trim()) {
      setMsg({ type: "error", text: "医師名を入力してください" });
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctor: draft }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "save_failed");
      setMsg({ type: "success", text: "保存しました" });
      await loadDoctors();
      cancelEdit();
    } catch (e: any) {
      setMsg({ type: "error", text: `保存エラー: ${e?.message || e}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* パンくず */}
      <div className="text-sm text-slate-500 mb-4">
        <Link href="/admin/schedule" className="hover:text-slate-700">
          予約枠管理
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">医師マスタ</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">医師マスタ</h1>
          <p className="text-sm text-slate-600 mt-1">
            予約枠を設定する医師の管理。通常は「dr_default」1名で共通枠として使用します。
          </p>
        </div>
        <button
          onClick={startNew}
          disabled={editingId !== null}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50 hover:bg-slate-800"
        >
          + 新規追加
        </button>
      </div>

      {/* メッセージ */}
      {msg && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm ${
            msg.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* テーブル */}
      <div className="mt-6 border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-slate-600">ID</th>
              <th className="px-4 py-3 text-left text-slate-600">名前</th>
              <th className="px-4 py-3 text-center text-slate-600 w-20">有効</th>
              <th className="px-4 py-3 text-center text-slate-600 w-20">順序</th>
              <th className="px-4 py-3 text-center text-slate-600 w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  読み込み中...
                </td>
              </tr>
            ) : doctors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  医師データがありません
                </td>
              </tr>
            ) : (
              doctors.map((d) =>
                editingId === d.doctor_id ? (
                  <tr key={d.doctor_id} className="border-t bg-blue-50">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="border rounded px-2 py-1 text-sm w-full bg-slate-100"
                        value={draft?.doctor_id || ""}
                        disabled
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="border rounded px-2 py-1 text-sm w-full"
                        value={draft?.doctor_name || ""}
                        onChange={(e) => setDraft(draft ? { ...draft, doctor_name: e.target.value } : null)}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={draft?.is_active || false}
                        onChange={(e) => setDraft(draft ? { ...draft, is_active: e.target.checked } : null)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 text-sm w-16 text-center"
                        value={draft?.sort_order || 0}
                        onChange={(e) => setDraft(draft ? { ...draft, sort_order: Number(e.target.value) } : null)}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={saveDraft}
                        disabled={saving}
                        className="text-blue-600 hover:underline text-sm mr-2"
                      >
                        保存
                      </button>
                      <button onClick={cancelEdit} className="text-slate-500 hover:underline text-sm">
                        取消
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={d.doctor_id} className="border-t">
                    <td className="px-4 py-3 font-mono text-slate-700">{d.doctor_id}</td>
                    <td className="px-4 py-3">{d.doctor_name}</td>
                    <td className="px-4 py-3 text-center">
                      {d.is_active ? (
                        <span className="text-green-600">有効</span>
                      ) : (
                        <span className="text-slate-400">無効</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{d.sort_order}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => startEdit(d)}
                        disabled={editingId !== null}
                        className="text-blue-600 hover:underline text-sm disabled:opacity-50"
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                )
              )
            )}

            {/* 新規追加行 */}
            {editingId === "__new__" && draft && (
              <tr className="border-t bg-green-50">
                <td className="px-4 py-3">
                  <input
                    type="text"
                    className="border rounded px-2 py-1 text-sm w-full"
                    value={draft.doctor_id}
                    onChange={(e) => setDraft({ ...draft, doctor_id: e.target.value })}
                    placeholder="dr_xxx"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    className="border rounded px-2 py-1 text-sm w-full"
                    value={draft.doctor_name}
                    onChange={(e) => setDraft({ ...draft, doctor_name: e.target.value })}
                    placeholder="医師名"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    className="border rounded px-2 py-1 text-sm w-16 text-center"
                    value={draft.sort_order}
                    onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    className="text-green-600 hover:underline text-sm mr-2"
                  >
                    追加
                  </button>
                  <button onClick={cancelEdit} className="text-slate-500 hover:underline text-sm">
                    取消
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 説明 */}
      <div className="mt-4 text-xs text-slate-500">
        <p>・通常は「dr_default」で共通の予約枠として運用します</p>
        <p>・複数医師で別々の予約枠を管理したい場合は追加してください</p>
        <p>・「有効」をオフにすると、その医師の予約枠設定が無効になります</p>
      </div>
    </div>
  );
}
