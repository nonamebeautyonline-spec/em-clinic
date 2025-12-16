// app/admin/patients/[patientId]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Patient = { id: string; name: string; phone: string } | null;

type IntakeItem = {
  submittedAt: string;
  doctorNote?: string;
  record: Record<string, any>;
};

type KarteNote = { at: string; text: string };

type HistoryItem = {
  paidAt: string;
  productName: string;
  amount: number;
  paymentId: string;
};

function fmtMaybe(v: any) {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export default function PatientDetailPage({
  params,
}: {
  params: { patientId: string };
}) {
  const patientId = decodeURIComponent(params.patientId || "").trim();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [patient, setPatient] = useState<Patient>(null);
  const [intakes, setIntakes] = useState<IntakeItem[]>([]);
  const [karteNotes, setKarteNotes] = useState<KarteNote[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 編集対象：最新doctor_note（基本は最新問診行）
  const latestNote = useMemo(() => {
    const first = intakes?.[0]?.record?.doctor_note;
    return first ? String(first) : "";
  }, [intakes]);

  const [noteDraft, setNoteDraft] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(
          `/api/admin/patientbundle?patientId=${encodeURIComponent(patientId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || "bundle_failed");

        if (!mounted) return;

        setPatient(data.patient ?? null);
        setIntakes(data.intakes ?? []);
        setKarteNotes(data.karteNotes ?? []);
        setHistory(data.history ?? []);
      } catch (e: any) {
        if (!mounted) return;
        setErr(String(e?.message || e));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [patientId]);

  // 初回ロード時にdraftを同期
  useEffect(() => {
    setNoteDraft(latestNote);
  }, [latestNote]);

  async function handleSave() {
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/patientnote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          patientId,
          note: noteDraft,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "save_failed");

      // 保存成功後、再取得して画面を最新化
      setLastSavedAt(data.editedAt || "");
      const res2 = await fetch(
        `/api/admin/patientbundle?patientId=${encodeURIComponent(patientId)}`,
        { cache: "no-store" }
      );
      const data2 = await res2.json();
      if (!data2.ok) throw new Error(data2.message || "reload_failed");

      setPatient(data2.patient ?? null);
      setIntakes(data2.intakes ?? []);
      setKarteNotes(data2.karteNotes ?? []);
      setHistory(data2.history ?? []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-900">患者詳細</h1>
          <p className="text-xs text-slate-500">PID: {patientId}</p>
        </div>

        <Link
          href="/admin/kartesearch"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
        >
          ← 検索へ戻る
        </Link>
      </header>

      {err ? (
        <div className="bg-white rounded-2xl shadow-sm p-4 text-sm text-red-600">
          {err}
        </div>
      ) : null}

      {/* Patient summary */}
      <section className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-2">
        <h2 className="text-sm font-semibold text-slate-800">患者</h2>
        {loading ? (
          <p className="text-sm text-slate-500">読込中…</p>
        ) : patient ? (
          <div className="text-sm text-slate-700 space-y-1">
            <p>
              <span className="text-slate-500">氏名：</span>
              {patient.name}
            </p>
            <p>
              <span className="text-slate-500">TEL：</span>
              {patient.phone}
            </p>
            <p>
              <span className="text-slate-500">PID：</span>
              {patient.id || "（なし）"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">患者情報なし</p>
        )}
      </section>

      {/* doctor_note editor */}
      <section className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">
            doctor_note 編集（保存時刻スタンプ付）
          </h2>
          <div className="text-xs text-slate-500">
            {lastSavedAt ? `最終保存: ${lastSavedAt}` : null}
          </div>
        </div>

        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          className="w-full min-h-[160px] rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          placeholder="doctor_note を入力"
          disabled={loading || saving}
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "保存中…" : "保存する"}
          </button>

          <button
            type="button"
            onClick={() => setNoteDraft(latestNote)}
            disabled={loading || saving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
          >
            破棄して元に戻す
          </button>

          <div className="text-xs text-slate-500">
            保存すると先頭に「最終更新: yyyy/MM/dd HH:mm:ss」が自動付与されます
          </div>
        </div>
      </section>

      {/* 3 columns */}
      <section className="grid lg:grid-cols-3 gap-4">
        {/* Karte notes (history of non-empty notes on intake rows) */}
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">
            doctor_note（抽出）
          </h2>
          {loading ? (
            <p className="text-sm text-slate-500">読込中…</p>
          ) : karteNotes.length > 0 ? (
            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {karteNotes.map((k, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3">
                  <div className="text-[11px] text-slate-500">{fmtMaybe(k.at)}</div>
                  <div className="text-sm text-slate-800 whitespace-pre-wrap mt-1">
                    {k.text}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">なし</p>
          )}
        </div>

        {/* Purchase history */}
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">購入履歴</h2>
          {loading ? (
            <p className="text-sm text-slate-500">読込中…</p>
          ) : history.length > 0 ? (
            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {history.map((h, i) => (
                <div key={`${h.paymentId || i}`} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500">{fmtMaybe(h.paidAt)}</div>
                    <div className="text-[11px] text-slate-500">
                      ¥{Number(h.amount || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">
                    {h.productName || "（商品名不明）"}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    payment_id: {h.paymentId || "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">なし</p>
          )}
        </div>

        {/* Intakes */}
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">問診（最新順）</h2>
          {loading ? (
            <p className="text-sm text-slate-500">読込中…</p>
          ) : intakes.length > 0 ? (
            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {intakes.map((it, i) => (
                <details key={i} className="rounded-xl border border-slate-200 p-3">
                  <summary className="cursor-pointer select-none">
                    <div className="text-sm font-medium text-slate-900">
                      {fmtMaybe(it.submittedAt) || "（日時不明）"}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      status: {fmtMaybe(it.record?.status) || "—"} / menu:{" "}
                      {fmtMaybe(it.record?.prescription_menu) || "—"}
                    </div>
                  </summary>
                  <pre className="mt-2 text-[11px] bg-slate-50 rounded-xl p-3 overflow-auto">
{JSON.stringify(it.record, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">なし</p>
          )}
        </div>
      </section>
    </main>
  );
}
