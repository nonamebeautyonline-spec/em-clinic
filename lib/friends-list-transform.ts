// lib/friends-list-transform.ts
// friends-list API と talk/page.tsx (SSR) で共通の行変換ロジック

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformFriendsRow(row: any) {
  const isBlocked = row.last_event_type === "unfollow";
  const eventDisplay = isBlocked ? "ブロックされました"
    : row.last_event_content?.includes("再追加") ? "友だち再登録"
    : row.last_event_content?.includes("友だち追加") ? "【友達追加】"
    : row.last_event_content || null;

  // incoming内で最新のものを見出しに表示（outgoingは除外）
  // 候補: 患者メッセージ(last_msg_at), イベント(last_event_at), テンプレ送信は除外
  const candidates: { content: string; at: string }[] = [];
  if (row.last_msg_content && row.last_msg_at) {
    candidates.push({ content: row.last_msg_content, at: row.last_msg_at });
  }
  if (eventDisplay && row.last_event_at) {
    candidates.push({ content: eventDisplay, at: row.last_event_at });
  }
  candidates.sort((a, b) => (a.at > b.at ? -1 : 1));
  const latestIncoming = candidates[0]?.content || null;
  const latestIncomingAt = candidates[0]?.at || null;

  return {
    patient_id: row.patient_id as string,
    patient_name: (row.patient_name || "") as string,
    line_id: (row.line_id || null) as string | null,
    line_display_name: (row.line_display_name || null) as string | null,
    line_picture_url: (row.line_picture_url || null) as string | null,
    mark: (row.mark || "none") as string,
    is_blocked: !!isBlocked,
    tags: [] as { id: number; name: string; color: string }[],
    fields: {} as Record<string, string>,
    last_message: latestIncoming,
    last_sent_at: (row.last_incoming_at || null) as string | null,
    last_text_at: (row.last_msg_at || null) as string | null,
    last_activity_at: (row.last_incoming_at || null) as string | null,
  };
}

export type TransformedFriend = ReturnType<typeof transformFriendsRow>;
