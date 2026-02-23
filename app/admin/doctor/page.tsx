"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { VoiceRecordButton } from "@/components/voice-record-button";
import { VoiceKarteButton } from "@/components/voice-karte-button";

type IntakeRow = { [key: string]: any };

function parseDateToAge(birth: string | undefined): string {
  if (!birth) return "";
  const s = `${birth}`.trim();
  if (!s) return "";
  const d = new Date(s.replaceAll(".", "/").replaceAll("-", "/"));
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return `${age}歳`;
}

// 生年月日表示用 "1995/12/27" 形式にそろえる
function formatBirthDisplay(raw: string | undefined): string {
  if (!raw) return "";
  const s = `${raw}`.trim();
  if (!s) return "";

  // Dateとして解釈できれば JST でフォーマット
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  // ダメなときは区切りだけ / に寄せて日付部分だけ返す
  return s.replace(/\./g, "/").replace(/-/g, "/").split("T")[0];
}

// 電話番号表示用：数字だけにして先頭0を保証
function formatTelDisplay(raw: string | undefined): string {
  if (!raw) return "";
  const digits = `${raw}`.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits[0] !== "0") {
    return "0" + digits;
  }
  return digits;
}

function pick(row: IntakeRow, keys: string[]): string {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return String(row[k]);
  }
  return "";
}

function pickReserveId(row: IntakeRow): string {
  return pick(row, ["reserveId", "予約ID", "予約id"]);
}

// 日付文字列を "YYYY-MM-DD" に正規化
function normalizeDateStr(raw: any): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  return s.replace(/\./g, "-").replace(/\//g, "-").slice(0, 10);
}

// "YYYY-MM-DD" → "YYYY/MM/DD"
function displayDateSlash(iso: string): string {
  if (!iso) return "";
  return iso.replace(/-/g, "/");
}

// "10:00" → "10:00-10:15"
function makeTimeRangeLabel(timeStr: string, minutes = 15): string {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = Number(hStr);
  let m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";

  const startH = String(h).padStart(2, "0");
  const startM = String(m).padStart(2, "0");

  m += minutes;
  if (m >= 60) {
    h += Math.floor(m / 60);
    m = m % 60;
  }
  const endH = String(h).padStart(2, "0");
  const endM = String(m).padStart(2, "0");

  return `${startH}:${startM}-${endH}:${endM}`;
}

type PrescriptionMenu = "2.5mg" | "5mg" | "7.5mg" | "";
type StatusFilter = "pending" | "all" | "ok" | "ng";

export default function DoctorPage() {
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selected, setSelected] = useState<IntakeRow | null>(null);
  const [note, setNote] = useState("");
  const [selectedMenu, setSelectedMenu] = useState<PrescriptionMenu>("");
  const [saving, setSaving] = useState(false);

  // LINE通話フォーム送信
  const [callFormSentIds, setCallFormSentIds] = useState<Set<string>>(new Set());
  const [callFormConfirmTarget, setCallFormConfirmTarget] = useState<IntakeRow | null>(null);
  const [sendingCallForm, setSendingCallForm] = useState(false);
  const [lineCallEnabled, setLineCallEnabled] = useState(true);

  // カルテ textarea 用 ref（カーソル位置取得用）
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  // 不通メッセージ送信関連
  const [noAnswerSentIds, setNoAnswerSentIds] = useState<Set<string>>(new Set());
  const [noAnswerConfirmTarget, setNoAnswerConfirmTarget] = useState<IntakeRow | null>(null);
  const [sendingNoAnswerMsg, setSendingNoAnswerMsg] = useState(false);

  const todayIso = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  const today = useMemo(() => new Date(), []);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDates = useMemo(() => {
    // weekOffset 週分ずらした「開始日」
    const start = new Date(today);
    start.setDate(today.getDate() + weekOffset * 7);

    const res: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      res.push(d.toISOString().slice(0, 10));
    }
    return res;
  }, [today, weekOffset]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");

  // ★ 取得済みの日付を管理（重複取得を避けるため）
  const [loadedDates, setLoadedDates] = useState<Set<string>>(new Set());

  // =========================
  // 下書き（一時保存）キー
  // =========================
  const draftKeyOf = (reserveId: string) => `drui_chart_draft_${reserveId}`;

  // =========================
  // 一覧取得（関数化）
  // =========================
  const fetchList = async (fromIso?: string, toIso?: string) => {
    try {
      // デフォルト：当日-2日～+5日
      if (!fromIso || !toIso) {
        const now = new Date();
        const fromDate = new Date(now);
        fromDate.setDate(now.getDate() - 2);
        const toDate = new Date(now);
        toDate.setDate(now.getDate() + 5);

        fromIso = fromDate.toISOString().slice(0, 10);
        toIso = toDate.toISOString().slice(0, 10);
      }

      const r = await fetch(
        `/api/intake/list?from=${fromIso}&to=${toIso}`,
        { cache: "no-store" }
      );
      const res = await r.json();

      let newRows: IntakeRow[] = [];
      if (Array.isArray(res)) {
        newRows = res;
      } else if (res.ok) {
        newRows = res.rows || [];
      } else {
        setErrorMsg(res.error || "一覧取得に失敗しました");
        setLoading(false);
        return;
      }

      // ★ 取得範囲内の既存行を最新データで差し替え
      const rangeFrom = fromIso!;
      const rangeTo = toIso!;
      setRows((prevRows) => {
        // 取得範囲外の行を保持
        const outsideRange = prevRows.filter((r) => {
          const date = normalizeDateStr(pick(r, ["reserved_date", "予約日"]));
          if (!date) return true;
          return date < rangeFrom || date > rangeTo;
        });
        // 範囲外でも同一予約IDがあれば除去（日付変更で移動した場合）
        const newIds = new Set(newRows.map((r) => pickReserveId(r)));
        const kept = outsideRange.filter((r) => !newIds.has(pickReserveId(r)));
        return [...kept, ...newRows];
      });

      // ★ 取得済み日付を記録
      const from = new Date(fromIso);
      const to = new Date(toIso);
      setLoadedDates((prev) => {
        const updated = new Set(prev);
        let current = new Date(from);
        while (current <= to) {
          updated.add(current.toISOString().slice(0, 10));
          current.setDate(current.getDate() + 1);
        }
        return updated;
      });

      setLoading(false);
    } catch (e) {
      console.error(e);
      setErrorMsg("一覧取得に失敗しました");
      setLoading(false);
    }
  };

  const closeModalAndRefresh = () => {
    setSelected(null);
    fetchList(); // ページリロードではなく、データだけ再取得
  };

  // ★ 日付選択時：範囲外なら追加取得
  const handleDateSelect = async (date: string) => {
    setSelectedDate(date);

    // 既に取得済みならスキップ
    if (loadedDates.has(date)) {
      return;
    }

    // 範囲外の日付：その日±1日を取得
    const targetDate = new Date(date);
    const fromDate = new Date(targetDate);
    fromDate.setDate(targetDate.getDate() - 1);
    const toDate = new Date(targetDate);
    toDate.setDate(targetDate.getDate() + 1);

    const fromIso = fromDate.toISOString().slice(0, 10);
    const toIso = toDate.toISOString().slice(0, 10);

    await fetchList(fromIso, toIso);
  };

  // 初回ロード
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 診察モード取得（LINE通話フォームボタン表示制御）
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/settings?category=consultation", { credentials: "include" });
        const data = await res.json();
        const t = data.settings?.type || "online_all";
        setLineCallEnabled(t !== "online_phone" && t !== "in_person");
      } catch {}
    })();
  }, []);


  const handleOpenDetail = (row: IntakeRow) => {
    setSelected(row);

    const reserveId = pickReserveId(row);

    // ③ 下書き復元を優先
    if (reserveId) {
      try {
        const raw = localStorage.getItem(draftKeyOf(reserveId));
        if (raw) {
          const d = JSON.parse(raw);
          if (typeof d.note === "string") setNote(d.note);
          else setNote(row.doctor_note || row["doctor_note"] || "");

          const menu = d.selectedMenu;
          setSelectedMenu(
            menu === "2.5mg" || menu === "5mg" || menu === "7.5mg" ? menu : ""
          );
          return;
        }
      } catch (e) {
        console.warn("draft restore failed", e);
      }
    }

    // 下書きがなければ既存データを表示
    setNote(row.doctor_note || row["doctor_note"] || "");
    const menu = row.prescription_menu || row["prescription_menu"] || "";
    setSelectedMenu(
      menu === "2.5mg" || menu === "5mg" || menu === "7.5mg" ? menu : ""
    );
  };

  // ③ 下書き自動保存（モーダル開いてる時だけ）
  useEffect(() => {
    if (!selected) return;
    const reserveId = pickReserveId(selected);
    if (!reserveId) return;

    try {
      const payload = {
        note,
        selectedMenu,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftKeyOf(reserveId), JSON.stringify(payload));
    } catch (e) {
      console.warn("draft save failed", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, note, selectedMenu]);

  const updateRowLocal = (reserveId: string, updates: Partial<IntakeRow>) => {
    setRows((prev) =>
      prev.map((r) =>
        pickReserveId(r) === reserveId ? { ...r, ...updates } : r
      )
    );
  };

  const handlePrescribe = async () => {
    if (!selected) return;
    const reserveId = pickReserveId(selected);
    if (!reserveId) {
      alert("reserveId が取得できませんでした");
      return;
    }
    if (!selectedMenu) {
      alert("処方メニュー（2.5 / 5 / 7.5）を選択してください。");
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/doctor/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reserveId,
          status: "OK",
          note,
          prescriptionMenu: selectedMenu,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert("更新に失敗しました");
        return;
      }

      // 本保存が通ったのでドラフト削除
      try {
        localStorage.removeItem(draftKeyOf(reserveId));
      } catch {}

      updateRowLocal(reserveId, {
        status: "OK",
        doctor_note: note,
        prescription_menu: selectedMenu,
      });
      alert("処方内容を保存しました");
closeModalAndRefresh();
    } catch (e) {
      console.error(e);
      alert("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleNoPrescribe = async () => {
    if (!selected) return;
    const reserveId = pickReserveId(selected);
    if (!reserveId) {
      alert("reserveId が取得できませんでした");
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/doctor/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reserveId,
          status: "NG",
          note,
          prescriptionMenu: "",
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert("更新に失敗しました");
        return;
      }

      // 本保存が通ったのでドラフト削除
      try {
        localStorage.removeItem(draftKeyOf(reserveId));
      } catch {}

      updateRowLocal(reserveId, {
        status: "NG",
        doctor_note: note,
        prescription_menu: "",
      });
      alert("診察結果を保存しました");
closeModalAndRefresh();
    } catch (e) {
      console.error(e);
      alert("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const markNoAnswer = async () => {
  if (!selected) return;
  const reserveId = pickReserveId(selected);
  if (!reserveId) {
    alert("reserveId が取得できませんでした");
    return;
  }

  // 誤タップ防止
  if (!confirm("不通（診療予定時間に架電するも繋がらず）として記録します。よろしいですか？")) {
    return;
  }

  try {
    const res = await fetch("/api/doctor/callstatus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reserveId,
        callStatus: "no_answer",
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      alert("不通の記録に失敗しました");
      return;
    }

    // 一覧にも即反映（バッジがすぐ出る）
    updateRowLocal(reserveId, {
      call_status: "no_answer",
      call_status_updated_at: json.updated_at || "",
    });

    // モーダル内の selected も即反映（必要なら表示用）
    setSelected((prev) =>
      prev
        ? {
            ...prev,
            call_status: "no_answer",
            call_status_updated_at: json.updated_at || "",
          }
        : prev
    );

    alert("不通として記録しました");
  } catch (e) {
    console.error(e);
    alert("不通の記録に失敗しました");
  }
};

  // LINE通話フォーム送信
  const handleSendCallForm = async () => {
    if (!callFormConfirmTarget || sendingCallForm) return;
    const pid = pick(callFormConfirmTarget, ["patient_id", "Patient_ID", "patientId"]);
    const reserveId = pickReserveId(callFormConfirmTarget);
    if (!pid) {
      alert("Patient IDが見つかりません");
      return;
    }
    setSendingCallForm(true);
    try {
      const res = await fetch("/api/doctor/send-call-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patientId: pid, reserveId: reserveId || undefined }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "送信に失敗しました");
        return;
      }
      if (reserveId) updateRowLocal(reserveId, { call_status: "call_form_sent" });
      setCallFormSentIds((prev) => new Set(prev).add(reserveId || pid));
      alert("通話フォームを送信しました");
    } catch {
      alert("送信に失敗しました");
    } finally {
      setSendingCallForm(false);
      setCallFormConfirmTarget(null);
    }
  };

  const NO_ANSWER_MESSAGE = `本日、診察予約のお時間に医師よりご連絡させていただきましたが、つながらず診察が完了しておりません💦

診察をご希望の場合は、再度メッセージにてご連絡いただけますと幸いです💌
その際、診察時間はあらためて調整させていただきますので、ご了承くださいませ☺️

ご不明点などありましたら、いつでもお気軽にご連絡ください🫧`;

  const handleSendNoAnswerMsg = async () => {
    if (!noAnswerConfirmTarget || sendingNoAnswerMsg) return;
    const pid = pick(noAnswerConfirmTarget, ["patient_id", "Patient_ID", "patientId"]);
    if (!pid) {
      alert("Patient IDが見つかりません");
      return;
    }

    setSendingNoAnswerMsg(true);
    try {
      // 1. メッセージ送信
      const sendRes = await fetch("/api/admin/line/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patient_id: pid, message: NO_ANSWER_MESSAGE }),
      });
      const sendJson = await sendRes.json();
      if (!sendJson.ok) {
        alert(`メッセージ送信に失敗しました: ${sendJson.error || sendJson.status || "不明なエラー"}`);
        return;
      }

      // 2. 対応マークを「不通」に変更（mark_definitionsからラベル「不通」のvalueを取得）
      try {
        const marksRes = await fetch("/api/admin/line/marks", { credentials: "include" });
        const marksJson = await marksRes.json();
        const futsuMark = (marksJson.marks || []).find((m: { label: string; value: string }) => m.label === "不通");
        if (futsuMark) {
          await fetch(`/api/admin/patients/${pid}/mark`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ mark: futsuMark.value }),
          });
        }
      } catch (markErr) {
        console.warn("対応マーク更新に失敗:", markErr);
      }

      // 3. call_status を "no_answer_sent" に更新（リロード後もグレーアウト維持）
      const reserveId = pickReserveId(noAnswerConfirmTarget);
      if (reserveId) {
        try {
          await fetch("/api/doctor/callstatus", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reserveId, callStatus: "no_answer_sent" }),
          });
          updateRowLocal(reserveId, { call_status: "no_answer_sent" });
        } catch (csErr) {
          console.warn("call_status更新に失敗:", csErr);
        }
      }

      setNoAnswerSentIds((prev) => new Set(prev).add(pid));
      alert("不通メッセージを送信しました");
    } catch (e) {
      console.error(e);
      alert("送信に失敗しました");
    } finally {
      setSendingNoAnswerMsg(false);
      setNoAnswerConfirmTarget(null);
    }
  };

  const now = new Date();

  const isOverdue = (row: IntakeRow) => {
    const status = pick(row, ["status"]);
    if (status) return false;
    const rawDate = pick(row, ["reserved_date", "予約日"]);
    const timeStr = pick(row, ["reserved_time", "予約時間"]);
    const dateStr = normalizeDateStr(rawDate);
    if (!dateStr || !timeStr) return false;
    // 時刻を HH:MM 形式に正規化（秒を除去）
    const timeHHMM = timeStr.slice(0, 5);
    const dt = new Date(`${dateStr}T${timeHHMM}:00+09:00`);
    dt.setMinutes(dt.getMinutes() + 15);
    return now > dt;
  };

  const isCurrentSlot = (row: IntakeRow) => {
    const rawDate = pick(row, ["reserved_date", "予約日"]);
    const timeStr = pick(row, ["reserved_time", "予約時間"]);
    const dateStr = normalizeDateStr(rawDate);
    if (!dateStr || !timeStr) return false;
    // 時刻を HH:MM 形式に正規化（秒を除去）
    const timeHHMM = timeStr.slice(0, 5);
    const dt = new Date(`${dateStr}T${timeHHMM}:00+09:00`);
    const diff = now.getTime() - dt.getTime();
    return diff >= 0 && diff < 15 * 60 * 1000;
  };

  // ★ useMemoはearly returnの前に呼び出す（Reactのルール）
  const sortedRows = useMemo(() => {
    return rows.slice().sort((a, b) => {
      const ad = `${normalizeDateStr(
        pick(a, ["reserved_date", "予約日"])
      )} ${pick(a, ["reserved_time", "予約時間"])}`;
      const bd = `${normalizeDateStr(
        pick(b, ["reserved_date", "予約日"])
      )} ${pick(b, ["reserved_time", "予約時間"])}`;
      return ad > bd ? 1 : -1;
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    return sortedRows.filter((row) => {
      const raw = pick(row, ["reserved_date", "予約日"]);
      const dateStr = normalizeDateStr(raw);
      if (!dateStr) return false;
      return dateStr === selectedDate;
    });
  }, [sortedRows, selectedDate]);

  // ステータス集計（選択日のみ）
  const stats = useMemo(() => {
    let pending = 0;
    let ok = 0;
    let ng = 0;
    filteredRows.forEach((row) => {
      const s = (pick(row, ["status"]) || "").toUpperCase();
      if (!s) pending++;
      else if (s === "OK") ok++;
      else if (s === "NG") ng++;
    });
    return { pending, ok, ng };
  }, [filteredRows]);

  // ステータスフィルタ適用後の一覧
  const visibleRows = useMemo(() => {
    return filteredRows.filter((row) => {
      const s = (pick(row, ["status"]) || "").toUpperCase();
      if (statusFilter === "all") return true;
      if (statusFilter === "pending") return !s;
      if (statusFilter === "ok") return s === "OK";
      if (statusFilter === "ng") return s === "NG";
      return true;
    });
  }, [filteredRows, statusFilter]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-4">診察一覧</h1>
        <p className="text-sm text-slate-500">読み込み中です…</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-4">診察一覧</h1>
        <p className="text-sm text-rose-600">{errorMsg}</p>
      </div>
    );
  }

  const formatWeekLabel = (iso: string) => {
    const d = new Date(iso);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    return `${m}/${day}（${weekday}）`;
  };

  // カルテ定型文の挿入（カーソル位置に）
  const insertTemplateToNote = (text: string) => {
    const el = noteRef.current;
    if (!el) {
      // ref 取れない場合は末尾に追記
      setNote((prev) => {
        const base = prev ?? "";
        const trimmed = base.trimEnd();
        return trimmed ? `${trimmed}\n${text}` : text;
      });
      return;
    }

    const base = note ?? "";
    const start = el.selectionStart ?? base.length;
    const end = el.selectionEnd ?? base.length;

    const before = base.slice(0, start);
    const after = base.slice(end);

    let insert = text;
    if (before && !before.endsWith("\n")) {
      insert = "\n" + insert;
    }

    const newText = before + insert + after;
    setNote(newText);

    // 挿入後にカーソルを移動
    const pos = before.length + insert.length;
    setTimeout(() => {
      if (noteRef.current) {
        noteRef.current.selectionStart = pos;
        noteRef.current.selectionEnd = pos;
        noteRef.current.focus();
      }
    }, 0);
  };

  const handleInsertDateTemplate = () => {
    if (!selected) return;
    const rawDate = pick(selected, ["reserved_date", "予約日"]);
    const timeStr = pick(selected, ["reserved_time", "予約時間"]);
    const dateStr = normalizeDateStr(rawDate);
    if (!dateStr) return;

    const [y, m, d] = dateStr.split("-");
    const [hh, mm] = (timeStr || "").split(":");
    const text = `${Number(y)}年${Number(m)}月${Number(d)}日${
      hh ? Number(hh) + "時" : ""
    }${mm ? Number(mm) + "分" : ""}`;
    insertTemplateToNote(text);
  };

  const handleInsertSideEffect = () => {
    insertTemplateToNote("嘔気・嘔吐や低血糖に関する副作用の説明を行った。");
  };

  const handleInsertUsage = () => {
    insertTemplateToNote("使用方法に関して説明を実施し、パンフレットの案内を行った。");
  };

  const handleInsertDecision = () => {
    insertTemplateToNote("以上より上記の用量の処方を行う方針とした。");
  };

  // ① 不通ボタン
  const handleInsertNoAnswer = () => {
    insertTemplateToNote("診療予定時間に架電するも繋がらず");
  };

  const capacityPerSlot = 2;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold mb-2">診察一覧</h1>

      {/* 1週間分の日付タブ ＋ 週送り */}
      <div className="flex items-center gap-2 mb-1 text-xs">
        {/* ◀ 前の1週間 */}
        <button
          type="button"
          onClick={() => {
            setWeekOffset((prev) => {
              const next = prev - 1;
              const start = new Date(today);
              start.setDate(today.getDate() + next * 7);
              const newDate = start.toISOString().slice(0, 10);
              handleDateSelect(newDate);
              return next;
            });
          }}
          className="px-2 py-1 rounded-full border bg-white text-slate-600 border-slate-300"
        >
          ◀
        </button>

        {/* 日付タブ本体 */}
        <div className="flex gap-2 overflow-x-auto">
          {weekDates.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDateSelect(d)}
              className={`
                px-3 py-1.5 rounded-full border whitespace-nowrap
                ${
                  selectedDate === d
                    ? "bg-pink-500 text-white border-pink-500"
                    : "bg-white text-slate-700 border-slate-300"
                }
              `}
            >
              {formatWeekLabel(d)}
            </button>
          ))}
        </div>

        {/* ▶ 次の1週間 */}
        <button
          type="button"
          onClick={() => {
            setWeekOffset((prev) => {
              const next = prev + 1;
              const start = new Date(today);
              start.setDate(today.getDate() + next * 7);
              const newDate = start.toISOString().slice(0, 10);
              handleDateSelect(newDate);
              return next;
            });
          }}
          className="px-2 py-1 rounded-full border bg-white text-slate-600 border-slate-300"
        >
          ▶
        </button>
      </div>

      {/* ステータスフィルタ＆サマリー */}
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex gap-1">
          {[
            { id: "pending" as StatusFilter, label: "未診", badge: stats.pending },
            {
              id: "all" as StatusFilter,
              label: "すべて",
              badge: stats.pending + stats.ok + stats.ng,
            },
            { id: "ok" as StatusFilter, label: "OK", badge: stats.ok },
            { id: "ng" as StatusFilter, label: "NG", badge: stats.ng },
          ].map((f) => {
            const active = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`
                  px-2.5 py-1 rounded-full border flex items-center gap-1
                  ${
                    active
                      ? "bg-pink-500 border-pink-500 text-white"
                      : "bg-white border-slate-300 text-slate-600"
                  }
                `}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    active ? "bg-white/20" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {f.badge}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400">
          未診 {stats.pending} 件 / OK {stats.ok} 件 / NG {stats.ng} 件
        </p>
      </div>

      <p className="text-[11px] text-slate-400">
        ※ 赤いラインは現在の時間帯を示します。枠がオレンジのカードは診察時間を過ぎてもステータス未設定（遅延）です。
      </p>

      <div className="space-y-3 mt-2">
        {visibleRows.length === 0 && (
          <p className="text-sm text-slate-500">
            選択した条件に該当する予約はありません。
          </p>
        )}

        {visibleRows.map((row, idx) => {
          const name = pick(row, ["name", "氏名", "お名前"]);
          const kana = pick(row, [
            "name_kana",
            "nameKana",
            "kana",
            "カナ",
            "ﾌﾘｶﾞﾅ",
            "フリガナ",
            "ふりがな",
          ]);
          const sex = pick(row, ["sex", "gender", "性別"]);
          const rawBirth = pick(row, ["birth", "birthday", "生年月日"]);
          const birth = formatBirthDisplay(rawBirth);
          const age = parseDateToAge(rawBirth);

          const history = pick(row, ["current_disease_detail", "既往歴"]);
          const glp1 = pick(row, ["glp_history", "GLP1使用歴"]);
          const meds = pick(row, ["med_detail", "内服歴"]);
          const allergy = pick(row, ["allergy_detail", "アレルギー"]);

          const statusRaw = pick(row, ["status"]);
          const status = (statusRaw || "").toUpperCase();
          const callStatus = pick(row, ["call_status"]);
const isNoAnswer = callStatus === "no_answer" || callStatus === "no_answer_sent";
const isNoAnswerMsgSent = callStatus === "no_answer_sent";
const isCallFormSent = callStatus === "call_form_sent";

          const reserveId = pickReserveId(row);
          const isTelMismatch =
  String(pick(row, ["tel_mismatch"]) || "").toUpperCase() === "TRUE";


          const reservedDateRaw = pick(row, ["reserved_date", "予約日"]);
          const reservedTime = pick(row, ["reserved_time", "予約時間"]);
          const reservedDateIso = normalizeDateStr(reservedDateRaw);
          const reservedDateDisp = displayDateSlash(reservedDateIso);
          const timeRangeLabel = makeTimeRangeLabel(reservedTime || "");

          const slotCount = rows.filter((r) => {
            const d = normalizeDateStr(pick(r, ["reserved_date", "予約日"]));
            const t = pick(r, ["reserved_time", "予約時間"]);
            return d === reservedDateIso && t === reservedTime;
          }).length;
          const occupancyLabel = `（${slotCount}/${capacityPerSlot}）`;

          const overdue = isOverdue(row);
          const currentSlot = isCurrentSlot(row);

          // 背景色分け（未診 / OK / NG）
          let cardBg = "bg-white border-slate-200";
          if (!status) cardBg = "bg-pink-50 border-pink-200"; // 未診
          if (status === "OK") cardBg = "bg-emerald-50 border-emerald-200";
          if (status === "NG") cardBg = "bg-rose-50 border-rose-200";
          if (overdue) cardBg = "bg-amber-50 border-amber-300";

          const patientId = pick(row, ["patient_id", "Patient_ID", "patientId"]);
          const answererId = pick(row, ["answerer_id", "answererId"]);

          const handleCopyPatientId = async (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!patientId) {
              alert("Patient IDが見つかりません");
              return;
            }
            try {
              await navigator.clipboard.writeText(patientId);
              alert(`Patient ID ${patientId} をコピーしました`);
            } catch (err) {
              console.error("コピーに失敗しました", err);
              alert("コピーに失敗しました");
            }
          };

          const handleOpenTalk = (e: React.MouseEvent) => {
            e.stopPropagation();
            if (!patientId) {
              alert("Patient IDが見つかりません");
              return;
            }
            window.open(`/admin/line/talk?pid=${patientId}`, "_blank");
          };

          return (
            <div
              key={idx}
              className={`
                rounded-2xl shadow-sm border p-4 space-y-3
                ${cardBg}
                ${currentSlot ? "border-l-4 border-l-red-500" : ""}
              `}
            >
              <div className="flex items-start gap-3">
                {/* 左側のアクションボタン */}
                <div className="flex flex-col gap-2">
                  {/* Patient IDコピーボタン */}
                  <button
                    type="button"
                    onClick={handleCopyPatientId}
                    className="w-10 h-10 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-md flex items-center justify-center"
                    title="Patient IDをコピー"
                  >
                    📋
                  </button>

                  {/* Lオペ トークボタン */}
                  {patientId && (
                    <button
                      type="button"
                      onClick={handleOpenTalk}
                      className="w-10 h-10 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold shadow-md flex items-center justify-center text-sm"
                      title="Lオペ トークで開く"
                    >
                      T
                    </button>
                  )}

                  {/* LINE通話フォーム送信ボタン */}
                  {lineCallEnabled && patientId && (
                    (callFormSentIds.has(reserveId || patientId) || isCallFormSent) ? (
                      <div
                        className="w-10 h-10 rounded-lg bg-gray-300 text-white font-bold shadow-md flex items-center justify-center text-[9px] leading-tight text-center"
                        title="通話フォーム送信済み"
                      >
                        送信済
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCallFormConfirmTarget(row);
                        }}
                        className="w-10 h-10 rounded-lg bg-teal-500 hover:bg-teal-600 text-white font-bold shadow-md flex items-center justify-center text-[16px]"
                        title="LINE通話フォームを送信"
                      >
                        📞
                      </button>
                    )
                  )}

                  {/* 不通メッセージ送信ボタン */}
                  {patientId && (
                    (noAnswerSentIds.has(patientId) || isNoAnswerMsgSent) ? (
                      <div
                        className="w-10 h-10 rounded-lg bg-gray-300 text-white font-bold shadow-md flex items-center justify-center text-[9px] leading-tight text-center"
                        title="不通メッセージ送信済み"
                      >
                        送信済
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoAnswerConfirmTarget(row);
                        }}
                        className="w-10 h-10 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md flex items-center justify-center text-[9px] leading-tight text-center"
                        title="不通メッセージを送信"
                      >
                        不通
                      </button>
                    )
                  )}
                </div>

                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleOpenDetail(row)}
                >
                  {reservedDateDisp && timeRangeLabel && (
                    <div className="text-sm font-semibold text-pink-600 mb-1">
                      予約日時　{reservedDateDisp} {timeRangeLabel}
                      {occupancyLabel}
                    </div>
                  )}

                  <div className="text-base font-semibold">
                    {name || "氏名無し"}
                  </div>
                  {kana && <div className="text-xs text-slate-500 mt-0.5">{kana}</div>}
                  {(() => {
                    const telRaw = pick(row, ["tel", "phone", "電話番号", "TEL"]);
                    const telDisp = formatTelDisplay(telRaw);
                    return telDisp ? (
                      <div className="text-xs text-slate-500 mt-0.5">TEL: {telDisp}</div>
                    ) : null;
                  })()}
                  <div className="text-xs text-slate-500 mt-1 space-x-2">
                    {sex && <span>{sex}</span>}
                    {birth && <span>{birth}</span>}
                    {age && <span>（{age}）</span>}
                  </div>
                  {!status && isNoAnswer && (
  <div className="mt-1 inline-flex px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
    不通
  </div>
)}

                  {isTelMismatch && (
  <div className="mt-1 inline-flex px-2 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
    電話 要確認（I/J不一致）
  </div>
)}
                </div>

                <div className="text-right text-[11px] text-slate-500 space-y-1 flex-shrink-0">
                  {reserveId && <div>reserveId: {reserveId}</div>}
                  {status && (
                    <div>
                      ステータス:{" "}
                      <span
                        className={
                          status === "OK"
                            ? "text-emerald-600 font-semibold"
                            : status === "NG"
                            ? "text-rose-600 font-semibold"
                            : "text-slate-500"
                        }
                      >
                        {status}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs cursor-pointer"
                onClick={() => handleOpenDetail(row)}
              >
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500">既往歴</div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                    {history ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{history}</p>
                    ) : (
                      <p className="text-slate-400">特記事項なし</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500">GLP-1 使用歴</div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                    {glp1 ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{glp1}</p>
                    ) : (
                      <p className="text-slate-400">使用歴なし</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500">内服歴</div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                    {meds ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{meds}</p>
                    ) : (
                      <p className="text-slate-400">内服薬なし</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500">アレルギー</div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                    {allergy ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{allergy}</p>
                    ) : (
                      <p className="text-slate-400">アレルギーなし</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-[90vw] md:w-[70vw] p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-semibold">
                  {pick(selected, ["name", "氏名", "お名前"])} のカルテ
                </h2>
                <div className="flex items-center gap-2">
                  {lineCallEnabled && (() => {
                    const rid = pickReserveId(selected);
                    const pid = pick(selected, ["patient_id", "Patient_ID", "patientId"]);
                    const cs = pick(selected, ["call_status"]);
                    const isSent = callFormSentIds.has(rid || pid) || cs === "call_form_sent";
                    return (
                      <button
                        type="button"
                        disabled={isSent}
                        onClick={() => setCallFormConfirmTarget(selected)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] ${
                          isSent
                            ? "bg-gray-300 text-white cursor-default"
                            : "bg-teal-500 hover:bg-teal-600 text-white"
                        }`}
                      >
                        {isSent ? "通話フォーム送信済み" : "LINE通話フォーム送信"}
                      </button>
                    );
                  })()}

                  {/* 下書き破棄（任意だけど便利） */}

<button
  onClick={closeModalAndRefresh}
  className="text-slate-400 text-sm"
>
  閉じる
</button>

                </div>
              </div>

              {/* 基本情報 */}
              <div className="text-xs space-y-1">
                <div>氏名: {pick(selected, ["name", "氏名", "お名前"])}</div>
                <div>
                  カナ:{" "}
                  {pick(selected, [
                    "name_kana",
                    "nameKana",
                    "kana",
                    "カナ",
                    "ﾌﾘｶﾞﾅ",
                    "フリガナ",
                    "ふりがな",
                  ])}
                </div>
                <div>性別: {pick(selected, ["sex", "gender", "性別"])}</div>
                <div>
                  生年月日:{" "}
                  {(() => {
                    const raw = pick(selected, ["birth", "birthday", "生年月日"]);
                    const birthDisp = formatBirthDisplay(raw);
                    const ageDisp = parseDateToAge(raw);
                    return (
                      <>
                        {birthDisp} {ageDisp && `（${ageDisp}）`}
                      </>
                    );
                  })()}
                </div>
<div>
  電話番号:{" "}
  {(() => {
    const telRaw = pick(selected, ["tel", "phone", "電話番号", "TEL"]);
    const telDisp = formatTelDisplay(telRaw);

    // AD列 tel_mismatch が TRUE のときに要確認表示
    const mismatchRaw = pick(selected, ["tel_mismatch", "TEL_MISMATCH", "mismatch"]);
    const isMismatch = String(mismatchRaw || "").toUpperCase() === "TRUE";

    if (!isMismatch) return <span>{telDisp}</span>;

    return (
      <span className="font-semibold text-rose-600">
        要確認（I/J不一致） {telDisp}
      </span>
    );
  })()}
</div>
<button
  type="button"
  onClick={markNoAnswer}
  className="mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800 text-[11px] hover:bg-amber-100"
>
  ⚠ 不通（架電したが繋がらず）
</button>


                <div>answerer_id: {pick(selected, ["answerer_id", "answererId"])}</div>
                <div>reserveId: {pickReserveId(selected)}</div>
              </div>

              {/* 問診詳細 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">既往歴</div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {pick(selected, ["current_disease_detail", "既往歴"]) || "特記事項なし"}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-500">GLP-1 使用歴</div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {pick(selected, ["glp_history", "GLP1使用歴"]) || "使用歴なし"}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-500">内服歴</div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {pick(selected, ["med_detail", "内服歴"]) || "内服薬なし"}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-500">アレルギー</div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 min-h-[40px]">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {pick(selected, ["allergy_detail", "アレルギー"]) || "アレルギーなし"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 処方メニュー選択 */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-500">
                  処方メニュー（診察で決定した用量）
                </div>
                <div className="flex gap-2">
                  {(["2.5mg", "5mg", "7.5mg"] as PrescriptionMenu[]).map((dose) => (
                    <button
                      key={dose}
                      type="button"
                      onClick={() => setSelectedMenu(dose)}
                      className={`
                        flex-1 py-2 rounded-full text-xs font-semibold border
                        ${
                          selectedMenu === dose
                            ? "bg-pink-500 text-white border-pink-500"
                            : "bg-white text-slate-700 border-slate-300"
                        }
                      `}
                    >
                      マンジャロ {dose}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  ※ 診察時に患者さんと相談して決定した用量を選択してください。
                </p>
              </div>

              {/* カルテ入力（定型文ボタン付き） */}
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-500">カルテ</div>

                <div className="flex flex-wrap gap-2 mb-1">
                  <button
                    type="button"
                    onClick={handleInsertDateTemplate}
                    className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
                  >
                    日時
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertSideEffect}
                    className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
                  >
                    副作用
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertUsage}
                    className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
                  >
                    使用方法
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertDecision}
                    className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
                  >
                    処方許可
                  </button>
                  {/* ① 不通 */}
                  <button
                    type="button"
                    onClick={handleInsertNoAnswer}
                    className="px-3 py-1 rounded-full border text-[11px] border-slate-300 hover:bg-slate-50"
                  >
                    不通
                  </button>
                  {/* 音声入力ボタン */}
                  <VoiceRecordButton onTranscribed={insertTemplateToNote} />
                  {/* AIカルテ生成ボタン */}
                  <VoiceKarteButton onKarteGenerated={insertTemplateToNote} />
                </div>

                <textarea
                  ref={noteRef}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                  rows={6}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="診察内容・説明した内容・今後の方針などを記載"
                />
                <p className="text-[10px] text-slate-400">
                  ※ 入力内容は自動で一時保存されます（この端末のブラウザ内）。
                </p>
              </div>

              {/* アクションボタン */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleNoPrescribe}
                  className="px-3 py-1.5 rounded-full bg-slate-100 text-[11px] text-slate-700 disabled:opacity-60"
                >
                  今回は処方しない
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handlePrescribe}
                  className="px-4 py-1.5 rounded-full bg-pink-500 text-[11px] text-white disabled:opacity-60"
                >
                  この内容で処方する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LINE通話フォーム送信確認モーダル */}
      {callFormConfirmTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-[90vw] p-6 space-y-4">
            <h3 className="text-sm font-semibold">LINE通話フォーム送信確認</h3>
            <p className="text-xs text-slate-600">
              <span className="font-semibold">{pick(callFormConfirmTarget, ["name", "氏名", "お名前"])}</span> さんにLINE通話フォームを送信します。
              患者がタップすると通話が開始されます。
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCallFormConfirmTarget(null)}
                disabled={sendingCallForm}
                className="px-4 py-1.5 rounded-full bg-slate-100 text-[11px] text-slate-700 disabled:opacity-60"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSendCallForm}
                disabled={sendingCallForm}
                className="px-4 py-1.5 rounded-full bg-teal-500 text-[11px] text-white disabled:opacity-60"
              >
                {sendingCallForm ? "送信中…" : "送信する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 不通メッセージ確認モーダル */}
      {noAnswerConfirmTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-[90vw] p-6 space-y-4">
            <h3 className="text-sm font-semibold">不通メッセージ送信確認</h3>
            <p className="text-xs text-slate-600">
              <span className="font-semibold">{pick(noAnswerConfirmTarget, ["name", "氏名", "お名前"])}</span> さんに以下のメッセージをLINEで送信します。
              送信と同時に対応マークを「不通」に変更します。
            </p>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs whitespace-pre-wrap leading-relaxed text-slate-700">
              {NO_ANSWER_MESSAGE}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNoAnswerConfirmTarget(null)}
                disabled={sendingNoAnswerMsg}
                className="px-4 py-1.5 rounded-full bg-slate-100 text-[11px] text-slate-700 disabled:opacity-60"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSendNoAnswerMsg}
                disabled={sendingNoAnswerMsg}
                className="px-4 py-1.5 rounded-full bg-amber-500 text-[11px] text-white disabled:opacity-60"
              >
                {sendingNoAnswerMsg ? "送信中…" : "送信する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
