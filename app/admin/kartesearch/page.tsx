// app/admin/kartesearch/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Candidate = {
  patientId: string;
  fallbackKey: string;
  name: string;
  phone: string;
  lastSubmittedAt: string;
};

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

function pickRecordSummary(record: Record<string, any>) {
  // 重要項目を上から拾って要約（問診のUIを重くしない）
  const keys = [
    "submittedAt",
    "name",
    "sex",
    "birth",
    "tel",
    "line_id",
    "ng_check",
    "current_disease_yesno",
    "current_disease_detail",
    "glp_history",
    "med_yesno",
    "med_detail",
    "allergy_yesno",
    "allergy_detail",
    "status",
    "prescription_menu",
    "tel_mismatch",
  ];
  const out: Array<[string, string]> = [];
  for (const k of keys) {
    if (record[k] != null && String(record[k]).trim() !== "") {
      out.push([k, fmtMaybe(record[k])]);
    }
  }
  return out;
}

export default function KarteSearchPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);

  const [bundleLoading, setBundleLoading] = useState(false);
  const [patient, setPatient] = useState<Patient>(null);
  const [intakes, setIntakes] = useState<IntakeItem[]>([]);
  const [karteNotes, setKarteNotes] = useState<KarteNote[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [err, setErr] = useState<string>("");

  const canSearch = useMemo(() => q.trim().length >= 1, [q]);

  // ---- debounce search ----
  useEffect(() => {
    if (!canSearch) {
      setCandidates([]);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(`/api/admin/kartesearch?q=${encodeURIComponent(q.trim())}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || "search_failed");
        setCandidates(data.candidates || []);
      } catch (e: any) {
        setCandidates([]);
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q, canSearch]);

  async function loadBundle(c: Candidate) {
    setSelected(c);
    setBundleLoading(true);
    setErr("");
    setPatient(null);
    setIntakes([]);
    setKarteNotes([]);
    setHistory([]);

    try {
      const params = new URLSearchParams();
      if (c.patientId) params.set("patientId", c.patientId);
      else params.set("fallbackKey", c.fallbackKey);

      const res = await fetch(`/api/admin/patientbundle?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "bundle_failed");

      setPatient(data.patient ?? null);
      setIntakes(data.intakes ?? []);
      setKarteNotes(data.karteNotes ?? []);
      setHistory(data.history ?? []);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBundleLoading(false);
    }
  }

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-900">カルテ検索</h1>
        <p className="text-xs text-slate-500">
          氏名で検索 → 候補選択 → 問診 / doctor_note / 購入履歴（のなめマスター）を表示
        </p>
      </header>

      <section className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="氏名で検索（例：山田）"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
          <button
            type="button"
            onClick={() => {
              setQ("");
              setCandidates([]);
              setSelected(null);
              setPatient(null);
              setIntakes([]);
              setKarteNotes([]);
              setHistory([]);
              setErr("");
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
          >
            クリア
          </button>
        </div>

        <div className="text-xs text-slate-500 flex items-center justify-between">
          <span>{loading ? "検索中…" : `候補：${candidates.length}件`}</span>
          {err ? <span className="text-red-600">{err}</span> : null}
        </div>

{/* 候補一覧（差し替えブロック） */}
{candidates.length > 0 && (
  <div className="grid md:grid-cols-2 gap-2">
    {candidates.map((c, idx) => {
      const active = selected
        ? (selected.patientId && c.patientId && selected.patientId === c.patientId) ||
          (!selected.patientId && !c.patientId && selected.fallbackKey === c.fallbackKey)
        : false;

      return (
        <div
          key={`${c.patientId || "fb"}-${c.fallbackKey || idx}`}
          className={[
            "rounded-2xl border px-3 py-3 transition",
            active ? "border-slate-400 bg-slate-50" : "border-slate-200",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium text-sm text-slate-900">{c.name}</div>
              <div className="mt-1 text-[12px] text-slate-600">
                TEL: {c.phone || "（不明）"}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                最終問診: {fmtMaybe(c.lastSubmittedAt) || "—"}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {c.patientId ? `PID: ${c.patientId}` : "PIDなし（閲覧のみ）"}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => loadBundle(c)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
              >
                表示
              </button>

              {c.patientId ? (
                <a
                  href={`/admin/patients/${encodeURIComponent(c.patientId)}`}
                  className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm text-center"
                >
                  詳細へ
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="rounded-xl bg-slate-200 text-slate-500 px-3 py-2 text-sm"
                  title="PIDがないため編集保存はできません"
                >
                  詳細へ
                </button>
              )}
            </div>
          </div>
        </div>
      );
    })}
  </div>
)}
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        {/* Patient summary */}
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">患者</h2>
          {bundleLoading ? (
            <p className="text-sm text-slate-500">読込中…</p>
          ) : patient ? (
            <div className="text-sm text-slate-700 space-y-1">
              <p><span className="text-slate-500">氏名：</span>{patient.name}</p>
              <p><span className="text-slate-500">TEL：</span>{patient.phone}</p>
              <p><span className="text-slate-500">PID：</span>{patient.id || "（なし）"}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">候補を選択してください</p>
          )}
        </div>

        {/* Karte */}
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">doctor_note（カルテ）</h2>
          {bundleLoading ? (
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
            <p className="text-sm text-slate-500">カルテ記事なし</p>
          )}
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">購入履歴（history）</h2>
          {bundleLoading ? (
            <p className="text-sm text-slate-500">読込中…</p>
          ) : history.length > 0 ? (
            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
              {history.map((h, i) => (
                <div key={`${h.paymentId || i}`} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500">{fmtMaybe(h.paidAt)}</div>
                    <div className="text-[11px] text-slate-500">¥{Number(h.amount || 0).toLocaleString()}</div>
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
            <p className="text-sm text-slate-500">履歴なし</p>
          )}
        </div>
      </section>

      {/* Intakes */}
      <section className="bg-white rounded-2xl shadow-sm p-4 md:p-5 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">問診</h2>
          <div className="text-xs text-slate-500">
            {bundleLoading ? "読込中…" : `件数：${intakes.length}（上限）`}
          </div>
        </div>

        {bundleLoading ? (
          <p className="text-sm text-slate-500">読込中…</p>
        ) : intakes.length > 0 ? (
          <div className="space-y-3">
            {intakes.map((it, i) => {
              const record = it.record || {};
              const summary = pickRecordSummary(record);

              return (
                <details key={i} className="rounded-2xl border border-slate-200 p-3">
                  <summary className="cursor-pointer select-none">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-slate-900">
                        {fmtMaybe(it.submittedAt) || "（日時不明）"}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        status: {fmtMaybe(record.status) || "—"} / menu: {fmtMaybe(record.prescription_menu) || "—"}
                      </div>
                    </div>
                    <div className="text-[12px] text-slate-600 mt-1">
                      {fmtMaybe(record.name) || "—"} / TEL: {fmtMaybe(record.tel) || "—"} / PID: {fmtMaybe(record.patient_id) || "—"}
                    </div>
                  </summary>

                  <div className="mt-3 grid md:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-700 mb-2">要約</div>
                      <div className="space-y-1">
                        {summary.length ? summary.map(([k, v]) => (
                          <div key={k} className="text-[12px] text-slate-700">
                            <span className="text-slate-500">{k}：</span>{v}
                          </div>
                        )) : (
                          <div className="text-[12px] text-slate-500">（表示できる要約項目がありません）</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="text-xs font-semibold text-slate-700 mb-2">doctor_note</div>
                      <div className="text-sm text-slate-800 whitespace-pre-wrap">
                        {fmtMaybe(record.doctor_note) || "（空）"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs font-semibold text-slate-700 mb-2">全文（record）</div>
                    <pre className="text-[11px] bg-slate-50 rounded-xl p-3 overflow-auto">
{JSON.stringify(record, null, 2)}
                    </pre>
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">問診が見つかりません</p>
        )}
      </section>
    </main>
  );
}
