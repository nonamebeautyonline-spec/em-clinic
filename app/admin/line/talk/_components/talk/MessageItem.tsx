"use client";

import { memo } from "react";
import type { MessageLog, FlexBubble } from "./types";
import {
  formatTimeUtil, formatDateUtil,
  isImageUrl, extractImageUrl, isStickerContent, getStickerImageUrl, linkifyContent,
} from "./constants";
import { renderFlexBubble } from "./flex-renderer";
import { AiReplyButton, AiReplyCard, useAiReplyDraft } from "./AiReplyPopover";

/** AI返信付きの受信メッセージ（フックを使うため別コンポーネント化） */
function IncomingWithAi({
  m, showAvatar, patientPictureUrl, patientName, patientDisplayName,
  onImageClick, patientId, onAiSent,
}: {
  m: MessageLog;
  showAvatar: boolean;
  patientPictureUrl: string | null;
  patientName: string;
  patientDisplayName: string;
  onImageClick: (url: string) => void;
  patientId: string;
  onAiSent?: (replyText: string) => void;
}) {
  const ai = useAiReplyDraft(patientId);

  return (
    <div>
      <div className="flex justify-start items-start gap-2" style={{ marginLeft: 0 }}>
        {showAvatar ? (
          patientPictureUrl ? (
            <img src={patientPictureUrl} alt="" className="w-9 h-9 rounded-full flex-shrink-0 shadow-sm object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
              {patientName?.charAt(0) || "?"}
            </div>
          )
        ) : (
          <div className="w-9 flex-shrink-0" />
        )}
        <div className="max-w-[65%]">
          {showAvatar && (
            <div className="text-[10px] text-gray-500 mb-0.5 ml-1 font-medium">{patientDisplayName}</div>
          )}
          <div className="flex items-end gap-1.5">
            {isStickerContent(m.content) ? (
              <img src={getStickerImageUrl(m.content)!} alt="スタンプ" className="w-[120px] h-[120px] object-contain" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).insertAdjacentText("afterend", "[スタンプ]"); }} />
            ) : isImageUrl(m.content) ? (
              <div className="relative rounded-2xl rounded-tl-sm overflow-hidden shadow-sm border border-gray-100 cursor-pointer" onClick={() => onImageClick(extractImageUrl(m.content))}>
                <img src={extractImageUrl(m.content)} alt="画像" className="max-w-full max-h-60 object-contain bg-gray-50" loading="lazy" />
              </div>
            ) : (
              <div className="relative bg-white text-gray-900 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words shadow-sm border border-gray-100" style={{ overflowWrap: "anywhere" }}>
                {linkifyContent(m.content)}
              </div>
            )}
            <span className="text-[9px] text-gray-400 flex-shrink-0 pb-0.5">{formatTimeUtil(m.sent_at)}</span>
            <div className="flex-shrink-0 pb-0.5">
              <AiReplyButton open={ai.open} onClick={ai.toggle} />
            </div>
          </div>
        </div>
      </div>
      {/* AI返信カード: メッセージブロックの下、カラム横幅全体を使う */}
      {ai.open && (
        <div className="mt-2 ml-11">
          <AiReplyCard
            patientId={patientId}
            draft={ai.draft}
            loading={ai.loading}
            generating={ai.generating}
            editedReply={ai.editedReply}
            setEditedReply={ai.setEditedReply}
            instruction={ai.instruction}
            setInstruction={ai.setInstruction}
            regenerating={ai.regenerating}
            sending={ai.sending}
            rejecting={ai.rejecting}
            done={ai.done}
            error={ai.error}
            onSend={() => ai.send(onAiSent)}
            onReject={ai.reject}
            onRegenerate={ai.regenerate}
            onGenerate={ai.generate}
            onClose={ai.close}
          />
        </div>
      )}
    </div>
  );
}

const MessageItem = memo(function MessageItem({ m, showDate, isSystem, isIncoming, showAvatar, patientPictureUrl, patientName, patientDisplayName, onImageClick, showAiButton, patientId, onAiSent }: {
  m: MessageLog;
  showDate: boolean;
  isSystem: boolean;
  isIncoming: boolean;
  showAvatar: boolean;
  patientPictureUrl: string | null;
  patientName: string;
  patientDisplayName: string;
  onImageClick: (url: string) => void;
  showAiButton?: boolean;
  patientId?: string;
  onAiSent?: (replyText: string) => void;
}) {
  return (
    <div>
      {showDate && (
        <div className="flex justify-center my-3">
          <span className="bg-gray-400/60 text-white text-[10px] px-3 py-0.5 rounded-full font-medium">{formatDateUtil(m.sent_at)}</span>
        </div>
      )}
      {isSystem ? (
        <div className="flex justify-center my-1">
          <div className="max-w-[80%] bg-white/80 border border-gray-200 rounded-lg px-4 py-2 text-center">
            <div className="text-[10px] text-gray-400 mb-0.5">{formatTimeUtil(m.sent_at)}</div>
            <div className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap break-words" style={{ overflowWrap: "anywhere" }}>{
              m.content?.startsWith("{") ? "メニュー操作" : m.content
            }</div>
          </div>
        </div>
      ) : isIncoming ? (
        showAiButton && patientId ? (
          <IncomingWithAi
            m={m}
            showAvatar={showAvatar}
            patientPictureUrl={patientPictureUrl}
            patientName={patientName}
            patientDisplayName={patientDisplayName}
            onImageClick={onImageClick}
            patientId={patientId}
            onAiSent={onAiSent}
          />
        ) : (
          <div>
            <div className="flex justify-start items-start gap-2" style={{ marginLeft: 0 }}>
              {showAvatar ? (
                patientPictureUrl ? (
                  <img src={patientPictureUrl} alt="" className="w-9 h-9 rounded-full flex-shrink-0 shadow-sm object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                    {patientName?.charAt(0) || "?"}
                  </div>
                )
              ) : (
                <div className="w-9 flex-shrink-0" />
              )}
              <div className="max-w-[65%]">
                {showAvatar && (
                  <div className="text-[10px] text-gray-500 mb-0.5 ml-1 font-medium">{patientDisplayName}</div>
                )}
                <div className="flex items-end gap-1.5">
                  {isStickerContent(m.content) ? (
                    <img src={getStickerImageUrl(m.content)!} alt="スタンプ" className="w-[120px] h-[120px] object-contain" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).insertAdjacentText("afterend", "[スタンプ]"); }} />
                  ) : isImageUrl(m.content) ? (
                    <div className="relative rounded-2xl rounded-tl-sm overflow-hidden shadow-sm border border-gray-100 cursor-pointer" onClick={() => onImageClick(extractImageUrl(m.content))}>
                      <img src={extractImageUrl(m.content)} alt="画像" className="max-w-full max-h-60 object-contain bg-gray-50" loading="lazy" />
                    </div>
                  ) : (
                    <div className="relative bg-white text-gray-900 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words shadow-sm border border-gray-100" style={{ overflowWrap: "anywhere" }}>
                      {linkifyContent(m.content)}
                    </div>
                  )}
                  <span className="text-[9px] text-gray-400 flex-shrink-0 pb-0.5">{formatTimeUtil(m.sent_at)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      ) : m.flex_json ? (
        /* Flex通知: LINE実際の表示に合わせてカード型で中央寄せ */
        <div className="flex flex-col items-end gap-1">
          <div className="max-w-[75%]">
            {renderFlexBubble(m.flex_json as unknown as FlexBubble)}
          </div>
          <div className="flex items-center gap-1.5 mr-1">
            {m.status === "failed" && <span className="text-[9px] text-red-400 font-medium">送信失敗</span>}
            <span className="text-[9px] text-gray-400">{formatTimeUtil(m.sent_at)}</span>
          </div>
        </div>
      ) : (
        <div className="flex justify-end items-end gap-1.5">
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0 pb-0.5">
            {m.status === "failed" && <span className="text-[9px] text-red-400 font-medium">送信失敗</span>}
            <span className="text-[9px] text-gray-400">{formatTimeUtil(m.sent_at)}</span>
          </div>
          <div className="max-w-[65%]">
            {m.event_type === "ai_reply" && (
              <div className="text-[9px] text-purple-500 mb-0.5 text-right mr-1 font-medium">AI返信</div>
            )}
            {(() => {
              const mt = m.message_type || "";
              const isReservation = mt.startsWith("reservation_");
              const isShipping = mt === "shipping_notify";
              const isFlexType = mt === "flex";
              const isLegacyFlex = mt === "individual" && /^\[.+\]$/.test((m.content || "").trim());
              if (isReservation || isShipping || isFlexType || isLegacyFlex) {
                const isCanceled = mt === "reservation_canceled";
                const isChanged = mt === "reservation_changed";
                const label = isReservation
                  ? (isCanceled ? "予約キャンセル" : isChanged ? "予約変更" : "予約確定")
                  : isShipping ? "発送通知" : "Flex";
                const headerBg = isCanceled ? "#888" : isShipping ? "#4CAF50" : "#E91E8C";
                const bodyText = (m.content || "").replace(/^\[/, "").replace(/\]$/, "").replace(/^【[^】]+】\s*/, "");
                return (
                  <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 min-w-[200px]">
                    <div className="px-3 py-2 text-white text-xs font-bold" style={{ backgroundColor: headerBg }}>{label}</div>
                    <div className="bg-white px-3 py-2.5">
                      <div className={"text-[13px] font-semibold leading-relaxed " + (isCanceled ? "text-gray-400 line-through" : "text-gray-900")}>{bodyText}</div>
                    </div>
                  </div>
                );
              }
              return null;
            })() || (isStickerContent(m.content) ? (
              <img src={getStickerImageUrl(m.content)!} alt="スタンプ" className="w-[120px] h-[120px] object-contain" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).insertAdjacentText("afterend", "[スタンプ]"); }} />
            ) : isImageUrl(m.content) ? (
              <div className="rounded-2xl rounded-tr-sm overflow-hidden shadow-sm cursor-pointer" onClick={() => onImageClick(extractImageUrl(m.content))}>
                <img src={extractImageUrl(m.content)} alt="画像" className="max-w-full max-h-60 object-contain bg-gray-50" loading="lazy" />
              </div>
            ) : (
              <div className="bg-[#8CE62C] text-gray-900 rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words shadow-sm" style={{ overflowWrap: "anywhere" }}>{linkifyContent(m.content)}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default MessageItem;
