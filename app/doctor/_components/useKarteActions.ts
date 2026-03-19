"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type IntakeRow,
  type PrescriptionMenu,
  pick,
  pickReserveId,
} from "./types";

type UseKarteActionsParams = {
  fetchList: () => Promise<void>;
  updateRowLocal: (reserveId: string, updates: Partial<IntakeRow>) => void;
  callFormSentIds: Set<string>;
  setCallFormSentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export function useKarteActions({
  fetchList,
  updateRowLocal,
  callFormSentIds,
  setCallFormSentIds,
}: UseKarteActionsParams) {
  const [selected, setSelected] = useState<IntakeRow | null>(null);
  const [note, setNote] = useState("");
  const [selectedMenu, setSelectedMenu] = useState<PrescriptionMenu>("");
  const [saving, setSaving] = useState(false);

  const [callFormConfirmTarget, setCallFormConfirmTarget] =
    useState<IntakeRow | null>(null);
  const [sendingCallForm, setSendingCallForm] = useState(false);

  // カルテ textarea 用 ref（カーソル位置取得用）
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  // 下書き（一時保存）キー
  const draftKeyOf = (reserveId: string) => `drui_chart_draft_${reserveId}`;

  const closeModalAndRefresh = useCallback(() => {
    setSelected(null);
    fetchList();
  }, [fetchList]);

  const handleOpenDetail = useCallback((row: IntakeRow) => {
    setSelected(row);

    const reserveId = pickReserveId(row);

    // 下書き復元を優先
    if (reserveId) {
      try {
        const raw = localStorage.getItem(`drui_chart_draft_${reserveId}`);
        if (raw) {
          const d = JSON.parse(raw);
          if (typeof d.note === "string") setNote(d.note);
          else setNote(String(row.note || ""));

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
    setNote(String(row.note || ""));
    const menu = String(
      row.prescription_menu || row["prescription_menu"] || ""
    );
    setSelectedMenu(
      menu === "2.5mg" || menu === "5mg" || menu === "7.5mg" ? menu : ""
    );
  }, []);

  // 下書き自動保存（モーダル開いてる時だけ）
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
  }, [selected, note, selectedMenu]);

  const handlePrescribe = useCallback(async () => {
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

      try {
        localStorage.removeItem(draftKeyOf(reserveId));
      } catch {}

      updateRowLocal(reserveId, {
        status: "OK",
        note: note,
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
  }, [selected, selectedMenu, saving, note, updateRowLocal, closeModalAndRefresh]);

  const handleNoPrescribe = useCallback(async () => {
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

      try {
        localStorage.removeItem(draftKeyOf(reserveId));
      } catch {}

      updateRowLocal(reserveId, {
        status: "NG",
        note: note,
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
  }, [selected, saving, note, updateRowLocal, closeModalAndRefresh]);

  const markNoAnswer = useCallback(async () => {
    if (!selected) return;
    const reserveId = pickReserveId(selected);
    if (!reserveId) {
      alert("reserveId が取得できませんでした");
      return;
    }

    if (
      !confirm(
        "不通（診療予定時間に架電するも繋がらず）として記録します。よろしいですか？"
      )
    ) {
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

      const finalStatus = json.notifySent ? "no_answer_sent" : "no_answer";

      updateRowLocal(reserveId, {
        call_status: finalStatus,
        call_status_updated_at: json.updated_at || "",
      });

      setSelected((prev) =>
        prev
          ? {
              ...prev,
              call_status: finalStatus,
              call_status_updated_at: json.updated_at || "",
            }
          : prev
      );

      if (json.notifySent) {
        alert("不通として記録し、患者へLINE通知を送信しました");
      } else {
        alert("不通として記録しました");
      }
    } catch (e) {
      console.error(e);
      alert("不通の記録に失敗しました");
    }
  }, [selected, updateRowLocal]);

  const handleSendCallForm = useCallback(async () => {
    if (!callFormConfirmTarget || sendingCallForm) return;
    const pid = pick(callFormConfirmTarget, [
      "patient_id",
      "Patient_ID",
      "patientId",
    ]);
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
        body: JSON.stringify({
          patientId: pid,
          reserveId: reserveId || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "送信に失敗しました");
        return;
      }
      if (reserveId)
        updateRowLocal(reserveId, { call_status: "call_form_sent" });
      setCallFormSentIds((prev) => new Set(prev).add(reserveId || pid));
      alert("通話フォームを送信しました");
    } catch {
      alert("送信に失敗しました");
    } finally {
      setSendingCallForm(false);
      setCallFormConfirmTarget(null);
    }
  }, [
    callFormConfirmTarget,
    sendingCallForm,
    updateRowLocal,
    setCallFormSentIds,
  ]);

  return {
    selected,
    setSelected,
    note,
    setNote,
    selectedMenu,
    setSelectedMenu,
    saving,
    noteRef,
    callFormConfirmTarget,
    setCallFormConfirmTarget,
    sendingCallForm,
    closeModalAndRefresh,
    handleOpenDetail,
    handlePrescribe,
    handleNoPrescribe,
    markNoAnswer,
    handleSendCallForm,
  };
}
