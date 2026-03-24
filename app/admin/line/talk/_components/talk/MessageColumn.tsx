"use client";

import { type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTalkContext } from "./TalkContext";
import MessageItem from "./MessageItem";

function SortableAttachButton({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      {children}
    </div>
  );
}

export default function MessageColumn() {
  const ctx = useTalkContext();

  return (
    <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${
      ctx.mobileView !== "message" ? "hidden md:flex" : "flex"
    }`}>
      {!ctx.selectedPatient ? (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100/50">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00B900]/10 to-[#00B900]/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-[#00B900]/60" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 5.92 2 10.66c0 2.72 1.46 5.14 3.74 6.7-.13.47-.84 2.94-.87 3.16 0 0-.02.13.05.18.07.06.16.03.16.03.24-.03 2.73-1.8 3.76-2.53.7.1 1.42.16 2.16.16 5.52 0 10-3.92 10-8.7C22 5.92 17.52 2 12 2z"/>
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-500">個別トーク</h2>
            <p className="text-xs text-gray-400 mt-1">左のリストから患者を選択</p>
          </div>
        </div>
      ) : (
        <>
          {/* ヘッダー */}
          <div className="flex-shrink-0 bg-gradient-to-r from-[#00B900] to-[#00a000] text-white px-4 py-1.5 flex items-center gap-2 shadow-sm">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <h2 className="font-bold text-[14px] leading-tight truncate">{ctx.selectedPatient.patient_name}</h2>
              <span className="text-green-200/80 text-[11px] font-mono flex-shrink-0">{ctx.selectedPatient.patient_id}</span>
            </div>
            <button
              onClick={() => ctx.togglePin(ctx.selectedPatient!.patient_id)}
              className={`p-1 rounded-lg transition-all ${ctx.pinnedIds.includes(ctx.selectedPatient.patient_id) ? "bg-white/20 text-amber-300" : "hover:bg-white/10 text-white/40"}`}
            >
              <svg className="w-4 h-4" fill={ctx.pinnedIds.includes(ctx.selectedPatient.patient_id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            {!ctx.selectedPatient.line_id && (
              <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full text-white/80">未連携</span>
            )}
          </div>

          {/* メッセージ */}
          <div ref={ctx.msgContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 bg-[#7494C0]/15">
            {ctx.messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="bg-white rounded-2xl px-5 py-2.5 text-gray-400 text-xs shadow-sm">読み込み中...</div>
              </div>
            ) : ctx.messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="bg-white rounded-2xl px-5 py-2.5 text-gray-400 text-xs shadow-sm">メッセージなし</div>
              </div>
            ) : (
              <div className="space-y-3">
                {ctx.hasMoreMessages && (
                  <div className="flex justify-center py-2">
                    <button
                      onClick={ctx.loadMoreMessages}
                      disabled={ctx.loadingMoreMessages}
                      className="bg-white text-gray-500 text-[11px] px-4 py-1.5 rounded-full shadow-sm hover:shadow hover:text-gray-700 transition-all disabled:opacity-50"
                    >
                      {ctx.loadingMoreMessages ? (
                        <span className="flex items-center gap-1.5">
                          <div className="w-3 h-3 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                          読み込み中...
                        </span>
                      ) : "過去のメッセージを読み込む"}
                    </button>
                  </div>
                )}
                {ctx.messages.map((m, i) => {
                  const isSystem = m.message_type === "event" || m.event_type === "system" || m.message_type === "postback";
                  const isIncoming = m.direction === "incoming";
                  const showAvatar = isIncoming && !isSystem && (i === 0 || ctx.messages[i - 1]?.direction !== "incoming" || ctx.messages[i - 1]?.message_type === "event" || ctx.messages[i - 1]?.event_type === "system");
                  return (
                    <MessageItem
                      key={m.id}
                      m={m}
                      showDate={ctx.shouldShowDate(i)}
                      isSystem={isSystem}
                      isIncoming={isIncoming}
                      showAvatar={showAvatar}
                      patientPictureUrl={ctx.selectedPatient?.line_picture_url || null}
                      patientName={ctx.selectedPatient?.patient_name || ""}
                      patientDisplayName={ctx.selectedPatient?.line_display_name || ctx.selectedPatient?.patient_name || ""}
                      onImageClick={ctx.setLightboxUrl}
                    />
                  );
                })}
                <div ref={ctx.messagesEndRef} />
              </div>
            )}
          </div>

          {/* 添付パネル */}
          {ctx.showAttachPanel && (
            <AttachPanel />
          )}

          {/* ブロック警告 */}
          {ctx.isBlocked && (
            <div className="flex-shrink-0 bg-red-50 border-t border-red-200 px-4 py-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              <span className="text-xs text-red-600 font-medium">この友だちはLINEをブロックしています</span>
            </div>
          )}

          {/* 予約送信メッセージ一覧 */}
          {ctx.scheduledMessages.length > 0 && (
            <div className="flex-shrink-0 bg-amber-50/80 border-t border-amber-200 px-3 py-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-[10px] font-semibold text-amber-700">予約送信 ({ctx.scheduledMessages.length}件)</span>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {ctx.scheduledMessages.map(sm => {
                  const d = new Date(sm.scheduled_at);
                  const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
                  return (
                    <div key={sm.id} className="flex items-center gap-2 bg-white/70 rounded-lg px-2.5 py-1.5 border border-amber-200/50">
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] text-amber-600 font-medium">{dateStr} 送信予定</span>
                        <p className="text-[11px] text-gray-700 truncate">{sm.message_content}</p>
                      </div>
                      <button
                        onClick={() => ctx.cancelScheduledMessage(sm.id)}
                        disabled={ctx.cancelingScheduleId === sm.id}
                        className="flex-shrink-0 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                      >
                        {ctx.cancelingScheduleId === sm.id ? "..." : "取消"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 予約送信モード: 日時選択パネル */}
          {ctx.scheduleMode && (
            <div className="flex-shrink-0 bg-blue-50/80 border-t border-blue-200 px-3 py-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-[11px] font-semibold text-blue-700">予約送信モード</span>
                </div>
                <button
                  onClick={() => { ctx.setScheduleMode(false); ctx.setScheduledAt(""); }}
                  className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  解除
                </button>
              </div>
              <input
                type="datetime-local"
                value={ctx.scheduledAt}
                onChange={e => ctx.setScheduledAt(e.target.value)}
                min={(() => {
                  const d = new Date(Date.now() + 5 * 60 * 1000);
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                })()}
                className="w-full px-3 py-1.5 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300/40 focus:border-blue-400"
              />
              {ctx.scheduledAt && (
                <p className="text-[10px] text-blue-600 mt-1">
                  {(() => {
                    const d = new Date(ctx.scheduledAt);
                    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")} に送信されます`;
                  })()}
                </p>
              )}
            </div>
          )}

          {/* 入力 */}
          <div className="flex-shrink-0 bg-white border-t border-gray-100 px-3 py-2">
            <input
              ref={ctx.imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={ctx.handleImageSelect}
            />
            {ctx.isBlocked ? (
              <div className="flex items-center justify-center gap-2 py-3 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                <span className="text-xs">ブロック中のためメッセージを送信できません</span>
              </div>
            ) : (
              <>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => ctx.setShowAttachPanel(!ctx.showAttachPanel)}
                    className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      ctx.showAttachPanel
                        ? "bg-[#00B900] text-white rotate-45"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  <textarea
                    ref={ctx.inputRef}
                    value={ctx.newMessage}
                    onChange={(e) => { ctx.setNewMessage(e.target.value); const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 200) + "px"; }}
                    onKeyDown={ctx.handleKeyDown}
                    placeholder={ctx.scheduleMode ? "予約送信するメッセージを入力" : "メッセージを入力"}
                    rows={2}
                    className={`flex-1 px-3 py-2 border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 transition-all ${
                      ctx.scheduleMode
                        ? "border-blue-200 focus:ring-blue-300/20 focus:border-blue-400 bg-blue-50/30"
                        : "border-gray-200 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50"
                    }`}
                    style={{ maxHeight: "200px" }}
                    onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 200) + "px"; }}
                  />
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {ctx.scheduleMode ? (
                      <button
                        onClick={ctx.handleSend}
                        disabled={ctx.sending || !ctx.newMessage.trim() || !ctx.scheduledAt}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-medium hover:shadow-md disabled:opacity-30 transition-all flex items-center gap-1.5"
                      >
                        {ctx.sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        )}
                        予約
                      </button>
                    ) : (
                      <button
                        onClick={ctx.handleSend}
                        disabled={ctx.sending || ctx.sendingImage || !ctx.newMessage.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-[#00B900] to-[#00a000] text-white rounded-xl text-sm font-medium hover:shadow-md disabled:opacity-30 transition-all flex items-center gap-1.5"
                      >
                        {ctx.sending || ctx.sendingImage ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        )}
                        送信
                      </button>
                    )}
                    <button
                      onClick={() => { ctx.setScheduleMode(!ctx.scheduleMode); if (ctx.scheduleMode) ctx.setScheduledAt(""); }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 justify-center ${
                        ctx.scheduleMode
                          ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                          : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      }`}
                      title="予約送信"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      予約
                    </button>
                  </div>
                </div>
                <div className="text-[9px] text-gray-300 mt-1 text-right">
                  {ctx.sendingImage ? "画像送信中..." : ctx.scheduleMode ? "日時を指定して予約送信" : "Enter で改行"}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// 添付パネルのボタン定義
const ATTACH_BUTTONS: Record<string, { label: string; color: string; bgColor: string; icon: ReactNode }> = {
  template: {
    label: "テンプレート送信",
    color: "text-[#00B900]",
    bgColor: "bg-[#00B900]/10 group-hover:bg-[#00B900]/20",
    icon: <svg className="w-4 h-4 text-[#00B900]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  image: {
    label: "画像送信",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 group-hover:bg-blue-500/20",
    icon: <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  },
  media: {
    label: "メディアから選択",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10 group-hover:bg-indigo-500/20",
    icon: <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  },
  pdf: {
    label: "PDF送信",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10 group-hover:bg-orange-500/20",
    icon: <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  },
  call: {
    label: "通話フォーム",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10 group-hover:bg-emerald-500/20",
    icon: <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  },
  action: {
    label: "アクション実行",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 group-hover:bg-purple-500/20",
    icon: <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
};

function AttachPanel() {
  const ctx = useTalkContext();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleClick = (id: string) => {
    if (ctx.attachEditMode) return;
    switch (id) {
      case "template": ctx.openTemplatePicker(); break;
      case "image": ctx.setShowAttachPanel(false); ctx.imageInputRef.current?.click(); break;
      case "media": ctx.openMediaPicker(); break;
      case "pdf": ctx.openPdfPicker(); break;
      case "call": ctx.setShowAttachPanel(false); ctx.setShowCallConfirm(true); break;
      case "action": ctx.openActionPicker(); break;
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ctx.attachPanelOrder.indexOf(String(active.id));
    const newIndex = ctx.attachPanelOrder.indexOf(String(over.id));
    const newOrder = arrayMove(ctx.attachPanelOrder, oldIndex, newIndex);
    ctx.saveAttachPanelOrder(newOrder);
  };

  // 通話フォームが無効ならフィルタ
  const visibleOrder = ctx.attachPanelOrder.filter(id => {
    if (id === "call" && !ctx.lineCallEnabled) return false;
    return true;
  });

  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-100 px-3 pt-2">
      <div className="flex items-center gap-1 mb-1">
        <button
          onClick={() => ctx.setAttachEditMode(!ctx.attachEditMode)}
          className={`p-1 rounded-lg transition-colors ${
            ctx.attachEditMode
              ? "bg-blue-100 text-blue-600"
              : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
          }`}
          title={ctx.attachEditMode ? "並び替え完了" : "並び順を変更"}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        {ctx.attachEditMode && (
          <span className="text-[10px] text-blue-500 font-medium">ドラッグで並び替え</span>
        )}
      </div>
      {ctx.attachEditMode ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visibleOrder} strategy={horizontalListSortingStrategy}>
            <div className="flex items-center gap-2 flex-wrap">
              {visibleOrder.map(id => {
                const def = ATTACH_BUTTONS[id];
                if (!def) return null;
                return (
                  <SortableAttachButton key={id} id={id}>
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border-2 border-blue-200 border-dashed transition-colors group select-none">
                      <div className={`w-8 h-8 rounded-lg ${def.bgColor} flex items-center justify-center transition-colors`}>
                        {def.icon}
                      </div>
                      <span className="text-xs font-medium text-gray-700">{def.label}</span>
                      <svg className="w-3 h-3 text-gray-300 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                    </div>
                  </SortableAttachButton>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {visibleOrder.map(id => {
            const def = ATTACH_BUTTONS[id];
            if (!def) return null;
            const isCallDisabled = id === "call" && !ctx.lineCallUrl;
            return (
              <button
                key={id}
                onClick={() => handleClick(id)}
                disabled={isCallDisabled}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors group ${
                  isCallDisabled
                    ? "bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed"
                    : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${def.bgColor} flex items-center justify-center transition-colors`}>
                  {def.icon}
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {id === "call" && !ctx.lineCallUrl ? "通話フォーム（URL未設定）" : def.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
