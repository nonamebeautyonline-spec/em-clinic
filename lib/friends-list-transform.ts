// lib/friends-list-transform.ts
// friends-list API と talk/page.tsx (SSR) で共通の行変換ロジック

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformFriendsRow(row: any) {
  const isBlocked = row.last_event_type === "unfollow";
  const eventDisplay = isBlocked ? "ブロックされました"
    : row.last_event_content?.includes("再追加") ? "友だち再登録"
    : row.last_event_content ? "【友達追加】" : null;
  const tplName = row.last_template_content?.match(/^【.+?】/)?.[0] || row.last_template_content;
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
    last_message: (row.last_msg_content || tplName || row.last_outgoing_content || eventDisplay || null) as string | null,
    last_sent_at: (row.last_incoming_at || null) as string | null,
    last_text_at: (row.last_msg_at || null) as string | null,
    last_activity_at: ([row.last_msg_at, row.last_incoming_at, row.last_outgoing_at]
      .filter(Boolean)
      .sort()
      .pop() || null) as string | null,
  };
}

export type TransformedFriend = ReturnType<typeof transformFriendsRow>;
