"use client";

import { useDoctorList } from "./_components/useDoctorList";
import { useKarteActions } from "./_components/useKarteActions";
import { useTemplateInsertion } from "./_components/useTemplateInsertion";
import { WeekCalendar } from "./_components/WeekCalendar";
import { AppointmentCard } from "./_components/AppointmentCard";
import { KarteModal } from "./_components/KarteModal";
import { CallFormConfirmModal } from "./_components/CallFormConfirmModal";

const capacityPerSlot = 2;

export default function DoctorPage() {
  const list = useDoctorList();

  const karte = useKarteActions({
    fetchList: list.fetchList,
    updateRowLocal: list.updateRowLocal,
    callFormSentIds: list.callFormSentIds,
    setCallFormSentIds: list.setCallFormSentIds,
  });

  const templates = useTemplateInsertion({
    note: karte.note,
    setNote: karte.setNote,
    noteRef: karte.noteRef,
    selected: karte.selected,
  });

  if (list.loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-4">診察一覧</h1>
        <p className="text-sm text-slate-500">読み込み中です…</p>
      </div>
    );
  }

  if (list.errorMsg) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-xl font-bold mb-4">診察一覧</h1>
        <p className="text-sm text-rose-600">{list.errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold mb-2">診察一覧</h1>

      <WeekCalendar
        weekDates={list.weekDates}
        selectedDate={list.selectedDate}
        weekOffset={list.weekOffset}
        today={list.today}
        statusFilter={list.statusFilter}
        stats={list.stats}
        setWeekOffset={list.setWeekOffset}
        setStatusFilter={list.setStatusFilter}
        handleDateSelect={list.handleDateSelect}
      />

      {list.karteMode === "intake_completion" ? (
        <p className="text-[11px] text-blue-500">
          ※ 問診完了ベースモード — 問診を完了した患者が自動で表示されます
        </p>
      ) : (
        <p className="text-[11px] text-slate-400">
          ※ 赤いラインは現在の時間帯を示します。枠がオレンジのカードは診察時間を過ぎてもステータス未設定（遅延）です。
        </p>
      )}

      <div className="space-y-3 mt-2">
        {list.visibleRows.length === 0 && (
          <p className="text-sm text-slate-500">
            {list.karteMode === "intake_completion"
              ? "選択した日に問診完了した患者はいません。"
              : "選択した条件に該当する予約はありません。"}
          </p>
        )}

        {list.visibleRows.map((row, idx) => (
          <AppointmentCard
            key={idx}
            row={row}
            rows={list.rows}
            capacityPerSlot={capacityPerSlot}
            lineCallEnabled={list.lineCallEnabled}
            callFormSentIds={list.callFormSentIds}
            isOverdue={list.isOverdue}
            isCurrentSlot={list.isCurrentSlot}
            onOpenDetail={karte.handleOpenDetail}
            onCallFormConfirm={karte.setCallFormConfirmTarget}
          />
        ))}
      </div>

      {karte.selected && (
        <KarteModal
          selected={karte.selected}
          note={karte.note}
          setNote={karte.setNote}
          selectedMenu={karte.selectedMenu}
          setSelectedMenu={karte.setSelectedMenu}
          saving={karte.saving}
          noteRef={karte.noteRef}
          lineCallEnabled={list.lineCallEnabled}
          callFormSentIds={list.callFormSentIds}
          onClose={karte.closeModalAndRefresh}
          onPrescribe={karte.handlePrescribe}
          onNoPrescribe={karte.handleNoPrescribe}
          onMarkNoAnswer={karte.markNoAnswer}
          onCallFormConfirm={karte.setCallFormConfirmTarget}
          onInsertDateTemplate={templates.handleInsertDateTemplate}
          onInsertSideEffect={templates.handleInsertSideEffect}
          onInsertUsage={templates.handleInsertUsage}
          onInsertDecision={templates.handleInsertDecision}
          onInsertNoAnswer={templates.handleInsertNoAnswer}
          insertTemplateToNote={templates.insertTemplateToNote}
        />
      )}

      {/* LINE通話フォーム送信確認モーダル */}
      {karte.callFormConfirmTarget && (
        <CallFormConfirmModal
          target={karte.callFormConfirmTarget}
          sending={karte.sendingCallForm}
          onSend={karte.handleSendCallForm}
          onCancel={() => karte.setCallFormConfirmTarget(null)}
        />
      )}
    </div>
  );
}
