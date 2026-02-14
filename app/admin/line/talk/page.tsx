"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Friend {
  patient_id: string;
  patient_name: string;
  line_id: string | null;
  line_display_name?: string | null;
  line_picture_url?: string | null;
  mark: string;
  tags: { id: number; name: string; color: string }[];
  fields: Record<string, string>;
  last_message?: string | null;
  last_sent_at?: string | null;
  last_text_at?: string | null;
}

interface MessageLog {
  id: number;
  content: string;
  status: string;
  message_type: string;
  event_type?: string;
  sent_at: string;
  direction?: "incoming" | "outgoing";
  flex_json?: any;
}

interface Template {
  id: number;
  name: string;
  content: string;
  message_type: string;
  category: string | null;
}

interface TemplateCategory {
  id: number;
  name: string;
}

interface TagDef {
  id: number;
  name: string;
  color: string;
}

interface PatientTag {
  tag_id: number;
  tag_definitions: { id: number; name: string; color: string };
}

interface FieldValue {
  field_id: number;
  value: string;
  friend_field_definitions: { id: number; name: string };
}

interface FieldDef {
  id: number;
  name: string;
  field_type: string;
  options: string[] | null;
}

interface PatientDetail {
  patient: { id: string; name: string; lstep_uid: string };
  latestOrder: {
    date: string;
    product: string;
    amount: string;
    payment: string;
    tracking: string;
    postal_code: string;
    address: string;
    phone: string;
    email: string;
    refund_status: string | null;
  } | null;
  orderHistory: { date: string; product: string; refund_status: string | null }[];
  reorders: { id: number; date: string; product: string; status: string }[];
  pendingBankTransfer: { product: string; date: string } | null;
  nextReservation: string | null;
  medicalInfo: {
    hasIntake?: boolean;
    kana: string;
    gender: string;
    birthday: string;
    medicalHistory: string;
    glp1History: string;
    medicationHistory: string;
    allergies: string;
    prescriptionMenu: string;
  } | null;
  verifiedPhone: string | null;
  registeredAt: string | null;
}

interface MarkOption {
  value: string;
  label: string;
  color: string;
  icon: string;
}

const DEFAULT_MARK_OPTIONS: MarkOption[] = [
  { value: "none", label: "未対応", color: "#06B6D4", icon: "●" },
];

// 画像URL判定（Supabase storage の画像URLか、【テンプレ名】URL形式か）
function isImageUrl(text: string) {
  if (!text) return false;
  const url = extractImageUrl(text);
  if (!url.startsWith("http")) return false;
  if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url)) return true;
  if (url.includes("supabase.co/storage/") && url.includes("line-images/")) return true;
  return false;
}

// 【テンプレ名】URL形式からURLを抽出（なければそのまま返す）
function extractImageUrl(text: string) {
  if (!text) return "";
  const trimmed = text.trim();
  const m = trimmed.match(/^【.+?】(.+)/);
  return m ? m[1].trim() : trimmed;
}

// スタンプ判定・パース
function isStickerContent(text: string): boolean {
  return /^\[スタンプ\] packageId=\d+ stickerId=\d+$/.test(text?.trim());
}
function getStickerImageUrl(text: string): string | null {
  const m = text?.match(/stickerId=(\d+)/);
  return m ? `https://stickershop.line-scdn.net/stickershop/v1/sticker/${m[1]}/iPhone/sticker.png` : null;
}

// テキスト内URLをクリック可能にする
function linkifyContent(text: string): ReactNode {
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 break-all">{part}</a>
    ) : part
  );
}

// LINE Flex Bubble レンダラー
const FLEX_SIZE: Record<string, string> = { xxs: "10px", xs: "12px", sm: "13px", md: "14px", lg: "16px", xl: "18px", xxl: "22px", "3xl": "26px", "4xl": "32px", "5xl": "38px" };
const FLEX_MARGIN: Record<string, string> = { none: "0", xs: "2px", sm: "4px", md: "8px", lg: "12px", xl: "16px", xxl: "20px" };

/** Flex Bubble をフラット方式でレンダリング（ツリーを1回走査→リーフ化→描画） */
function renderFlexBubble(bubble: any): ReactNode {
  if (!bubble || bubble.type !== "bubble") return null;

  // ツリーからリーフノードをフラット配列に収集（各ノードは厳密に1回だけ追加）
  type Leaf = { node: any; section: "header" | "body" | "footer" };
  const leaves: Leaf[] = [];
  function collect(node: any, section: Leaf["section"]) {
    if (!node) return;
    if (node.type === "box") {
      for (const c of (node.contents || [])) collect(c, section);
      return;
    }
    leaves.push({ node, section });
  }
  if (bubble.header) collect(bubble.header, "header");
  if (bubble.body) collect(bubble.body, "body");
  if (bubble.footer) collect(bubble.footer, "footer");

  const headerLeaves = leaves.filter(l => l.section === "header");
  const bodyLeaves = leaves.filter(l => l.section === "body");
  const footerLeaves = leaves.filter(l => l.section === "footer");

  function renderLeaf(leaf: Leaf, idx: number): ReactNode {
    const n = leaf.node;
    const mt = n.margin ? FLEX_MARGIN[n.margin] || n.margin : undefined;

    if (n.type === "text") {
      const s: any = { lineHeight: 1.5 };
      if (leaf.section === "header") { s.color = "#fff"; s.fontWeight = 700; s.fontSize = "16px"; }
      else {
        if (n.color) s.color = n.color;
        if (n.size) s.fontSize = FLEX_SIZE[n.size] || n.size;
        if (n.weight === "bold") s.fontWeight = 700;
        if (n.decoration === "line-through") s.textDecoration = "line-through";
        if (n.align) s.textAlign = n.align;
      }
      if (mt) s.marginTop = mt;
      if (n.wrap) { s.whiteSpace = "pre-wrap"; s.wordBreak = "break-word"; }
      return <div key={idx} style={s}>{n.text}</div>;
    }
    if (n.type === "image") {
      const s: any = { maxWidth: "100%", display: "block" };
      if (mt) s.marginTop = mt;
      s.objectFit = n.aspectMode === "cover" ? "cover" : "contain";
      if (n.size === "full") s.width = "100%";
      if (n.aspectRatio) { const [w, h] = n.aspectRatio.split(":").map(Number); if (w && h) s.aspectRatio = `${w}/${h}`; }
      return <img key={idx} src={n.url} alt="" style={s} loading="lazy" />;
    }
    if (n.type === "separator") {
      return <div key={idx} style={{ borderTop: "1px solid #ddd", marginTop: mt || "8px" }} />;
    }
    if (n.type === "button") {
      const s: any = { display: "block", width: "100%", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "14px", textAlign: "center", textDecoration: "none" };
      if (mt) s.marginTop = mt;
      if (n.style === "primary") { s.backgroundColor = n.color || "#06C755"; s.color = "#fff"; }
      else if (n.style === "secondary") { s.backgroundColor = "#f0f0f0"; s.color = n.color || "#333"; }
      else { s.backgroundColor = "transparent"; s.color = n.color || "#06C755"; }
      const label = n.action?.label || "ボタン";
      if (n.action?.type === "uri" && n.action?.uri) {
        return <a key={idx} href={n.action.uri} target="_blank" rel="noopener noreferrer" style={s}>{label}</a>;
      }
      return <div key={idx} style={s}>{label}</div>;
    }
    return null;
  }

  const hdrBg = bubble.header?.backgroundColor || "#ec4899";
  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200" style={{ minWidth: 200, maxWidth: 300 }}>
      {headerLeaves.length > 0 && (
        <div style={{ backgroundColor: hdrBg, padding: "12px 16px" }}>
          {headerLeaves.map((l, i) => renderLeaf(l, i))}
        </div>
      )}
      {bodyLeaves.length > 0 && (
        <div style={{ padding: "16px" }}>
          {bodyLeaves.map((l, i) => renderLeaf(l, i))}
        </div>
      )}
      {footerLeaves.length > 0 && (
        <div style={{ padding: "12px 16px" }}>
          {footerLeaves.map((l, i) => renderLeaf(l, i))}
        </div>
      )}
    </div>
  );
}

const MAX_PINS = 15;
const DISPLAY_BATCH = 50;
const MSG_BATCH = 25;

// 右カラム表示セクション定義
const RIGHT_COLUMN_SECTIONS = [
  { key: "personal", label: "個人情報" },
  { key: "reservation", label: "次回予約" },
  { key: "mark", label: "対応マーク" },
  { key: "tags", label: "タグ" },
  { key: "friendFields", label: "友だち情報" },
  { key: "medical", label: "問診事項" },
  { key: "latestOrder", label: "最新決済" },
  { key: "orderHistory", label: "処方履歴" },
  { key: "bankTransfer", label: "銀行振込待ち" },
  { key: "reorders", label: "再処方" },
  { key: "richMenu", label: "リッチメニュー" },
] as const;

export default function TalkPage() {
  const searchParams = useSearchParams();
  const initialPid = searchParams.get("pid");

  // 左カラム
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [msgSearchResults, setMsgSearchResults] = useState<{ patient_id: string; content: string; sent_at: string }[]>([]);
  const [msgSearching, setMsgSearching] = useState(false);
  const msgSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [displayCount, setDisplayCount] = useState(DISPLAY_BATCH);
  const listRef = useRef<HTMLDivElement>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  // 中央カラム
  const [selectedPatient, setSelectedPatient] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottom = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 添付パネル
  const [showAttachPanel, setShowAttachPanel] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateCategories, setTemplateCategories] = useState<TemplateCategory[]>([]);
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [sendingCall, setSendingCall] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // アクション実行
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [actionList, setActionList] = useState<{ id: number; name: string; steps: { type: string; content?: string; tag_name?: string; mark?: string }[] }[]>([]);
  const [actionSearch, setActionSearch] = useState("");
  const [executingAction, setExecutingAction] = useState(false);

  // 右カラム
  const [patientTags, setPatientTags] = useState<PatientTag[]>([]);
  const [patientMark, setPatientMark] = useState("none");
  const [patientFields, setPatientFields] = useState<FieldValue[]>([]);
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [allTags, setAllTags] = useState<TagDef[]>([]);
  const [allFieldDefs, setAllFieldDefs] = useState<FieldDef[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showMarkDropdown, setShowMarkDropdown] = useState(false);
  const [markNote, setMarkNote] = useState("");
  const [savingMark, setSavingMark] = useState(false);
  const [markOptions, setMarkOptions] = useState<MarkOption[]>(DEFAULT_MARK_OPTIONS);
  const [userRichMenu, setUserRichMenu] = useState<{ id?: number; name: string; image_url: string | null; line_rich_menu_id: string; is_default: boolean } | null>(null);
  const [showMenuPicker, setShowMenuPicker] = useState(false);
  const [allRichMenus, setAllRichMenus] = useState<{ id: number; name: string; image_url: string | null; line_rich_menu_id: string }[]>([]);
  const [changingMenu, setChangingMenu] = useState(false);

  // 右カラム表示設定
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({});
  const [showSectionSettings, setShowSectionSettings] = useState(false);
  const isSectionVisible = (key: string) => visibleSections[key] !== false;

  // 画像ライトボックス
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // モバイルビュー切り替え: list / message / info
  const [mobileView, setMobileView] = useState<"list" | "message" | "info">("list");

  // 既読タイムスタンプ管理（DB共有）
  const [readTimestamps, setReadTimestamps] = useState<Record<string, string>>({});
  // 未読のみ表示フィルタ
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // ピン留め初期化（DB）& 既読タイムスタンプ初期化（DB）& 右カラム表示設定
  useEffect(() => {
    (async () => {
      try {
        const [pinsRes, readsRes, colRes] = await Promise.all([
          fetch("/api/admin/pins", { credentials: "include" }),
          fetch("/api/admin/chat-reads", { credentials: "include" }),
          fetch("/api/admin/line/column-settings", { credentials: "include" }),
        ]);
        const pinsData = await pinsRes.json();
        if (Array.isArray(pinsData.pins) && pinsData.pins.length > 0) {
          setPinnedIds(pinsData.pins);
        } else {
          const local = localStorage.getItem("talk_pinned_patients");
          if (local) {
            const ids = JSON.parse(local) as string[];
            if (ids.length > 0) {
              setPinnedIds(ids);
              fetch("/api/admin/pins", {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pins: ids }),
              }).then(() => localStorage.removeItem("talk_pinned_patients")).catch(() => {});
            }
          }
        }
        const readsData = await readsRes.json();
        if (readsData.reads) setReadTimestamps(readsData.reads);
        const colData = await colRes.json();
        if (colData.sections) setVisibleSections(colData.sections);
      } catch { /* ignore */ }
    })();
  }, []);

  const savePins = (ids: string[]) => {
    setPinnedIds(ids);
    fetch("/api/admin/pins", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pins: ids }),
    }).catch(() => {});
  };

  const markAsRead = (patientId: string) => {
    const now = new Date().toISOString();
    setReadTimestamps(prev => ({ ...prev, [patientId]: now }));
    fetch("/api/admin/chat-reads", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId }),
    }).catch(() => {});
  };

  const togglePin = (patientId: string) => {
    if (pinnedIds.includes(patientId)) {
      savePins(pinnedIds.filter(id => id !== patientId));
    } else {
      if (pinnedIds.length >= MAX_PINS) return;
      savePins([...pinnedIds, patientId]);
    }
  };

  // 友達一覧を取得
  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/line/friends-list", { credentials: "include" });
      const data = await res.json();
      if (data.patients) setFriends(data.patients);
    } catch { /* ignore */ }
    setFriendsLoading(false);
  }, []);

  useEffect(() => {
    fetchFriends();

    Promise.all([
      fetch("/api/admin/tags", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/friend-fields", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/line/marks", { credentials: "include" }).then(r => r.json()),
    ]).then(([tagsData, fieldsData, marksData]) => {
      if (tagsData.tags) setAllTags(tagsData.tags);
      if (fieldsData.fields) setAllFieldDefs(fieldsData.fields);
      if (marksData.marks) {
        setMarkOptions(marksData.marks.map((m: { value: string; label: string; color: string; icon: string }) => ({
          value: m.value,
          label: m.label,
          color: m.color,
          icon: m.icon || "●",
        })));
      }
    });
  }, []);

  // プルダウンリフレッシュ（スマホのみ）
  const PULL_THRESHOLD = 60;
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = listRef.current;
    if (!el || el.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || pullRefreshing) return;
    const el = listRef.current;
    if (!el || el.scrollTop > 0) { isPulling.current = false; setPullDistance(0); return; }
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) {
      setPullDistance(Math.min(dy * 0.4, 80));
    } else {
      isPulling.current = false;
      setPullDistance(0);
    }
  }, [pullRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= PULL_THRESHOLD) {
      setPullRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      await fetchFriends();
      setPullRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, fetchFriends]);

  // 左カラム無限スクロール
  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setDisplayCount(prev => prev + DISPLAY_BATCH);
    }
  }, []);

  // 検索変更時にdisplayCountリセット
  useEffect(() => {
    setDisplayCount(DISPLAY_BATCH);
  }, [searchId, searchName]);

  // メッセージ検索（デバウンス）
  useEffect(() => {
    if (msgSearchTimer.current) clearTimeout(msgSearchTimer.current);
    const q = searchMessage.trim();
    if (!q) {
      setMsgSearchResults([]);
      setMsgSearching(false);
      return;
    }
    setMsgSearching(true);
    msgSearchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/messages/log?search=${encodeURIComponent(q)}&limit=30`, { credentials: "include" });
        const data = await res.json();
        if (data.messages) {
          setMsgSearchResults(data.messages);
        }
      } catch { /* ignore */ }
      setMsgSearching(false);
    }, 400);
    return () => { if (msgSearchTimer.current) clearTimeout(msgSearchTimer.current); };
  }, [searchMessage]);

  // 患者選択
  const selectPatient = useCallback(async (friend: Friend) => {
    // URLに患者IDを反映（ブラウザ履歴は置換）
    const url = new URL(window.location.href);
    url.searchParams.set("pid", friend.patient_id);
    window.history.replaceState({}, "", url.toString());

    // 既読にする
    markAsRead(friend.patient_id);
    // 前の患者データを即座にクリア（誤操作防止）
    setSelectedPatient(friend);
    setMessages([]);
    setMessagesLoading(true);
    setShowTagPicker(false);
    setShowMarkDropdown(false);
    setPatientDetail(null);
    setPatientTags([]);
    setPatientMark("none");
    setMarkNote("");
    setPatientFields([]);
    setUserRichMenu(null);
    setShowMenuPicker(false);

    shouldScrollToBottom.current = true;

    const [logRes, tagsRes, markRes, fieldsRes, detailRes] = await Promise.all([
      fetch(`/api/admin/messages/log?patient_id=${encodeURIComponent(friend.patient_id)}&limit=${MSG_BATCH}`, { credentials: "include" }),
      fetch(`/api/admin/patients/${encodeURIComponent(friend.patient_id)}/tags`, { credentials: "include" }),
      fetch(`/api/admin/patients/${encodeURIComponent(friend.patient_id)}/mark`, { credentials: "include" }),
      fetch(`/api/admin/patients/${encodeURIComponent(friend.patient_id)}/fields`, { credentials: "include" }),
      fetch(`/api/admin/patient-lookup?q=${encodeURIComponent(friend.patient_id)}&type=id`, { credentials: "include" }),
    ]);

    // リッチメニューはLINE API呼び出しがあるため別途非同期で取得（ブロックしない）
    if (friend.line_id) {
      fetch(`/api/admin/line/user-richmenu?patient_id=${encodeURIComponent(friend.patient_id)}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          // staleガード
          if (selectedPatientRef.current?.patient_id !== friend.patient_id) return;
          if (d.menu) setUserRichMenu(d.menu);
        })
        .catch(() => {});
    }

    const [logData, tagsData, markData, fieldsData, detailData] = await Promise.all([
      logRes.json(), tagsRes.json(), markRes.json(), fieldsRes.json(), detailRes.json(),
    ]);

    // staleガード: レスポンス到着時に既に別患者を選択していたら破棄
    if (selectedPatientRef.current?.patient_id !== friend.patient_id) return;

    if (logData.messages) {
      const reversed = [...logData.messages].reverse();
      setMessages(reversed);
      setHasMoreMessages(logData.messages.length === MSG_BATCH);
    }
    if (tagsData.tags) setPatientTags(tagsData.tags);
    if (markData.mark) {
      setPatientMark(markData.mark.mark || "none");
      setMarkNote(markData.mark.note || "");
    } else {
      setPatientMark("none");
      setMarkNote("");
    }
    if (fieldsData.fields) setPatientFields(fieldsData.fields);
    if (detailData.found) setPatientDetail(detailData);

    setMessagesLoading(false);
    setMobileView("message");
  }, []);

  // URLの ?pid= で指定された患者を自動選択
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current || friendsLoading || !initialPid) return;
    const target = friends.find(f => f.patient_id === initialPid);
    if (target) {
      autoSelectedRef.current = true;
      selectPatient(target);
    }
  }, [friends, friendsLoading, initialPid, selectPatient]);

  // 過去メッセージ読み込み
  const loadMoreMessages = useCallback(async () => {
    if (!selectedPatient || loadingMoreMessages || !hasMoreMessages) return;
    setLoadingMoreMessages(true);
    shouldScrollToBottom.current = false;

    const container = msgContainerRef.current;
    const prevScrollHeight = container?.scrollHeight || 0;

    const res = await fetch(
      `/api/admin/messages/log?patient_id=${encodeURIComponent(selectedPatient.patient_id)}&limit=${MSG_BATCH}&offset=${messages.length}`,
      { credentials: "include" }
    );
    const data = await res.json();
    if (data.messages && data.messages.length > 0) {
      const older = [...data.messages].reverse();
      setMessages(prev => [...older, ...prev]);
      setHasMoreMessages(data.messages.length === MSG_BATCH);

      // スクロール位置を維持（新しく読み込んだ分だけ下にずらす）
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } else {
      setHasMoreMessages(false);
    }
    setLoadingMoreMessages(false);
  }, [selectedPatient, loadingMoreMessages, hasMoreMessages, messages.length]);

  useEffect(() => {
    if (shouldScrollToBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ポーリング: 選択中の患者の新着メッセージを5秒ごとにチェック
  const selectedPatientRef = useRef<Friend | null>(null);
  const messagesRef = useRef<MessageLog[]>([]);
  selectedPatientRef.current = selectedPatient;
  messagesRef.current = messages;

  useEffect(() => {
    const interval = setInterval(async () => {
      const patient = selectedPatientRef.current;
      const msgs = messagesRef.current;
      if (!patient || msgs.length === 0) return;

      const lastMsg = msgs[msgs.length - 1];
      if (!lastMsg?.sent_at) return;

      try {
        const res = await fetch(
          `/api/admin/messages/log?patient_id=${encodeURIComponent(patient.patient_id)}&since=${encodeURIComponent(lastMsg.sent_at)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          // 既存IDと重複しない新着のみ追加
          const existingIds = new Set(msgs.map(m => m.id));
          const newMsgs = (data.messages as MessageLog[]).filter(m => !existingIds.has(m.id));
          if (newMsgs.length > 0) {
            shouldScrollToBottom.current = true;
            setMessages(prev => [...prev, ...newMsgs.reverse()]);
          }
        }
      } catch { /* ignore */ }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ポーリング: 左カラムの友だちリストを15秒ごとに更新
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/admin/line/friends-list", { credentials: "include" });
        const data = await res.json();
        if (data.patients) setFriends(data.patients);
      } catch { /* ignore */ }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // メッセージ送信
  const handleSend = async () => {
    if (!newMessage.trim() || sending || !selectedPatient) return;
    setSending(true);
    const res = await fetch("/api/admin/line/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ patient_id: selectedPatient.patient_id, message: newMessage }),
    });
    const data = await res.json();
    if (data.ok) {
      shouldScrollToBottom.current = true;
      setMessages(prev => [...prev, {
        id: Date.now(), content: newMessage, status: "sent",
        message_type: "individual", sent_at: new Date().toISOString(),
        direction: "outgoing",
      }]);
      setNewMessage("");
    }
    setSending(false);
  };

  // テンプレート送信
  const openTemplatePicker = async () => {
    setShowAttachPanel(false);
    setShowTemplatePicker(true);
    setTemplateSearch("");
    setTemplateCategoryFilter(null);
    if (templates.length === 0) {
      setTemplatesLoading(true);
      const [tplRes, catRes] = await Promise.all([
        fetch("/api/admin/line/templates", { credentials: "include" }),
        fetch("/api/admin/line/template-categories", { credentials: "include" }),
      ]);
      const [tplData, catData] = await Promise.all([tplRes.json(), catRes.json()]);
      if (tplData.templates) setTemplates(tplData.templates);
      if (catData.categories) {
        setTemplateCategories(catData.categories);
        if (catData.categories.length > 0 && templateCategoryFilter === null) {
          setTemplateCategoryFilter(null);
        }
      }
      setTemplatesLoading(false);
    }
  };

  const confirmTemplate = (template: Template) => {
    setShowTemplatePicker(false);
    setPendingTemplate(template);
  };

  const sendTemplate = async (template: Template) => {
    if (sending || !selectedPatient) return;
    setPendingTemplate(null);
    setSending(true);
    const payload: Record<string, string> = {
      patient_id: selectedPatient.patient_id,
      message: template.content,
    };
    if (template.message_type === "image") {
      payload.message_type = "image";
      payload.template_name = template.name;
    }
    const res = await fetch("/api/admin/line/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok) {
      shouldScrollToBottom.current = true;
      const displayContent = template.message_type === "image"
        ? `【${template.name}】${template.content}`
        : template.content;
      setMessages(prev => [...prev, {
        id: Date.now(), content: displayContent, status: "sent",
        message_type: "individual", sent_at: new Date().toISOString(),
        direction: "outgoing",
      }]);
    }
    setSending(false);
  };

  // 画像送信
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPatient || sendingImage) return;
    setShowAttachPanel(false);
    setSendingImage(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("patient_id", selectedPatient.patient_id);

    const res = await fetch("/api/admin/line/send-image", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await res.json();
    if (data.ok) {
      shouldScrollToBottom.current = true;
      setMessages(prev => [...prev, {
        id: Date.now(), content: data.imageUrl || `[画像] ${file.name}`, status: "sent",
        message_type: "individual", sent_at: new Date().toISOString(),
        direction: "outgoing",
      }]);
    } else {
      alert(data.error || "画像送信に失敗しました");
    }
    setSendingImage(false);
    // inputをリセット
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // アクション実行
  const openActionPicker = async () => {
    setShowAttachPanel(false);
    setShowActionPicker(true);
    setActionSearch("");
    const res = await fetch("/api/admin/line/actions", { credentials: "include" });
    const data = await res.json();
    if (data.actions) setActionList(data.actions);
  };

  const executeAction = async (actionId: number) => {
    if (!selectedPatient || executingAction) return;
    setExecutingAction(true);
    try {
      const res = await fetch("/api/admin/line/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action_id: actionId, patient_id: selectedPatient.patient_id }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("アクションを実行しました");
        setShowActionPicker(false);
        // メッセージログを再読み込み
        selectPatient(selectedPatient);
      } else {
        const failed = data.results?.filter((r: { success: boolean }) => !r.success).length || 0;
        alert(`アクション実行完了（${failed}件のエラーあり）`);
      }
    } catch {
      alert("アクション実行に失敗しました");
    }
    setExecutingAction(false);
  };

  // 通話フォーム送信
  const handleSendCallForm = async () => {
    if (!selectedPatient || sendingCall) return;
    setSendingCall(true);
    setShowCallConfirm(false);

    const res = await fetch("/api/admin/line/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        patient_id: selectedPatient.patient_id,
        message_type: "flex",
        flex: {
          type: "flex",
          altText: "通話リクエスト",
          contents: {
            type: "bubble",
            size: "kilo",
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "image",
                          url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png",
                          size: "24px",
                          aspectMode: "fit",
                        },
                      ],
                      width: "32px",
                      height: "32px",
                      backgroundColor: "#EBF5FF",
                      cornerRadius: "16px",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "text",
                          text: "通話リクエスト",
                          weight: "bold",
                          size: "md",
                          color: "#1a1a1a",
                        },
                        {
                          type: "text",
                          text: "タップして通話を開始できます",
                          size: "xs",
                          color: "#888888",
                          margin: "xs",
                        },
                      ],
                      flex: 1,
                      paddingStart: "12px",
                    },
                  ],
                  alignItems: "center",
                },
              ],
              paddingAll: "16px",
            },
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "button",
                  action: {
                    type: "uri",
                    label: "通話する",
                    uri: `https://line.me/R/oa/call/${process.env.NEXT_PUBLIC_LINE_OA_ID || "@noname-beauty"}?confirmation=true&from=call_url`,
                  },
                  style: "primary",
                  color: "#06C755",
                  height: "sm",
                },
              ],
              paddingAll: "12px",
              paddingTop: "0px",
            },
          },
        },
      }),
    });
    const data = await res.json();
    if (data.ok) {
      shouldScrollToBottom.current = true;
      setMessages(prev => [...prev, {
        id: Date.now(), content: "[通話フォーム]", status: "sent",
        message_type: "individual", sent_at: new Date().toISOString(),
        direction: "outgoing",
      }]);
    } else {
      alert(data.error || "通話フォームの送信に失敗しました");
    }
    setSendingCall(false);
  };

  const filteredTemplates = templates.filter(t => {
    if (templateCategoryFilter !== null && (t.category || "未分類") !== templateCategoryFilter) return false;
    if (templateSearch) {
      const q = templateSearch.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q);
    }
    return true;
  });

  // 対応マーク更新
  const handleMarkChange = async (newMark: string) => {
    if (!selectedPatient || savingMark) return;
    setSavingMark(true);
    setPatientMark(newMark);
    setShowMarkDropdown(false);
    // 左カラムの友だちリストにも即座に反映
    setFriends(prev => prev.map(f =>
      f.patient_id === selectedPatient.patient_id ? { ...f, mark: newMark } : f
    ));
    await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/mark`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mark: newMark, note: markNote }),
    });
    setSavingMark(false);
  };

  // タグ
  const handleAddTag = async (tagId: number) => {
    if (!selectedPatient) return;
    await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/tags`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ tag_id: tagId }),
    });
    const res = await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/tags`, { credentials: "include" });
    const data = await res.json();
    if (data.tags) setPatientTags(data.tags);
    setShowTagPicker(false);
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!selectedPatient) return;
    await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/tags?tag_id=${tagId}`, {
      method: "DELETE", credentials: "include",
    });
    setPatientTags(prev => prev.filter(t => t.tag_id !== tagId));
  };

  // リッチメニュー変更
  const openMenuPicker = async () => {
    if (!selectedPatient?.line_id) return;
    setShowMenuPicker(true);
    if (allRichMenus.length === 0) {
      const res = await fetch("/api/admin/line/rich-menus", { credentials: "include" });
      const data = await res.json();
      if (data.menus) {
        setAllRichMenus(data.menus.filter((m: { line_rich_menu_id: string | null; is_active: boolean }) => m.line_rich_menu_id && m.is_active));
      }
    }
  };

  const changeRichMenu = async (menuId: number) => {
    if (!selectedPatient || changingMenu) return;
    setChangingMenu(true);
    try {
      const res = await fetch("/api/admin/line/user-richmenu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patient_id: selectedPatient.patient_id, rich_menu_id: menuId }),
      });
      const data = await res.json();
      if (data.menu) {
        setUserRichMenu(data.menu);
      }
    } catch { /* ignore */ }
    setChangingMenu(false);
    setShowMenuPicker(false);
  };

  // ユーティリティ
  const formatTime = (s: string) => {
    const d = new Date(s);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const formatDate = (s: string) => {
    const d = new Date(s);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "今日";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "昨日";
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };
  const formatDateShort = (s: string) => {
    const d = new Date(s);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(s);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "昨日";
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const shouldShowDate = (i: number) => {
    if (i === 0) return true;
    return new Date(messages[i - 1].sent_at).toDateString() !== new Date(messages[i].sent_at).toDateString();
  };
  // Enterは改行、送信はボタンのみ
  const handleKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {};
  const calcAge = (birthday: string) => {
    try {
      const bd = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - bd.getFullYear();
      if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--;
      return age;
    } catch { return null; }
  };

  // 検索フィルタ（patient_idがないレコードは除外）
  const filteredFriends = friends.filter(f => {
    if (!f.patient_id) return false;
    if (searchId && !f.patient_id.toLowerCase().includes(searchId.toLowerCase())) return false;
    if (searchName) {
      const q = searchName.replace(/[\s　]/g, "").toLowerCase();
      const name = (f.patient_name || "").replace(/[\s　]/g, "").toLowerCase();
      if (!name.includes(q)) return false;
    }
    return true;
  });

  const sortByLatest = (a: Friend, b: Friend) => {
    const ta = a.last_text_at ? new Date(a.last_text_at).getTime() : (a.last_sent_at ? new Date(a.last_sent_at).getTime() : 0);
    const tb = b.last_text_at ? new Date(b.last_text_at).getTime() : (b.last_sent_at ? new Date(b.last_sent_at).getTime() : 0);
    return tb - ta;
  };
  const unreadCount = filteredFriends.filter(f => !!(f.last_text_at && (!readTimestamps[f.patient_id] || f.last_text_at > readTimestamps[f.patient_id]))).length;
  const pinnedFriends = filteredFriends.filter(f => pinnedIds.includes(f.patient_id)).sort(sortByLatest);
  const unpinnedFriends = filteredFriends.filter(f => !pinnedIds.includes(f.patient_id)).sort(sortByLatest);
  const visibleUnpinned = unpinnedFriends.slice(0, displayCount);
  const hasMore = unpinnedFriends.length > displayCount;

  const getMarkColor = (mark: string) => markOptions.find(m => m.value === mark)?.color || "#06B6D4";
  const getMarkLabel = (mark: string) => markOptions.find(m => m.value === mark)?.label || "未対応";
  const currentMark = markOptions.find(m => m.value === patientMark) || markOptions[0];

  const assignedTagIds = patientTags.map(t => t.tag_id);
  const availableTags = allTags.filter(t => !assignedTagIds.includes(t.id));

  // セクションラベル
  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{children}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );

  // 情報行
  const InfoRow = ({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) => (
    <div className="flex items-center justify-between py-[3px]">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className={`text-[11px] text-gray-800 ${mono ? "font-mono" : ""}`}>{children}</span>
    </div>
  );

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-[#f8f9fb]">
      {/* ========== モバイルヘッダータブ（常時表示） ========== */}
      <div className="md:hidden flex-shrink-0 bg-white border-b border-gray-200 flex sticky top-0 z-20">
        {([
          { key: "list" as const, label: "リスト", icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          )},
          { key: "message" as const, label: "メッセージ", icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          )},
          { key: "info" as const, label: "情報", icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          )},
        ]).map(tab => {
          const isActive = mobileView === tab.key;
          const isDisabled = tab.key !== "list" && !selectedPatient;
          return (
            <button
              key={tab.key}
              onClick={() => !isDisabled && setMobileView(tab.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold transition-colors ${
                isActive
                  ? "text-[#00B900] border-b-[3px] border-[#00B900]"
                  : isDisabled
                    ? "text-gray-200 cursor-default"
                    : "text-gray-400 hover:text-gray-600 border-b-[3px] border-transparent"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========== 左カラム ========== */}
      <div className={`w-full md:w-[300px] flex-1 md:flex-none md:flex-shrink-0 border-r border-gray-200/80 flex flex-col min-h-0 bg-white ${
        selectedPatient && mobileView !== "list" ? "hidden md:flex" : "flex"
      }`}>
        {/* 検索 */}
        <div className="p-3 border-b border-gray-100 space-y-1.5">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold tracking-wider">ID</span>
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="患者IDで検索"
              className="w-full pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50 transition-all"
            />
            {searchId && (
              <button onClick={() => setSearchId("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="relative">
            <svg className="w-3.5 h-3.5 text-gray-300 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="氏名で検索"
              className="w-full pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50 transition-all"
            />
            {searchName && (
              <button onClick={() => setSearchName("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="relative">
            <svg className="w-3.5 h-3.5 text-gray-300 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            <input
              type="text"
              value={searchMessage}
              onChange={(e) => setSearchMessage(e.target.value)}
              placeholder="メッセージ内容で検索"
              className="w-full pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50 transition-all"
            />
            {searchMessage && (
              <button onClick={() => setSearchMessage("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-0.5">
            <span>{filteredFriends.length}件</span>
            {pinnedIds.length > 0 && (
              <span className="flex items-center gap-0.5 text-amber-500">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                {pinnedIds.length}
              </span>
            )}
            <label className="flex items-center gap-1 cursor-pointer select-none ml-auto">
              <input
                type="checkbox"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="w-3 h-3 accent-[#00B900] rounded"
              />
              <span className="text-[10px] text-gray-500">未読のみ（{unreadCount}件）</span>
            </label>
          </div>
        </div>

        {/* 友達一覧 / メッセージ検索結果 */}
        <div
          ref={listRef}
          onScroll={handleListScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          {/* プルダウンリフレッシュ表示 */}
          {(pullDistance > 0 || pullRefreshing) && (
            <div
              className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
              style={{ height: pullRefreshing ? PULL_THRESHOLD : pullDistance }}
            >
              {pullRefreshing ? (
                <div className="w-5 h-5 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
              ) : (
                <div className={`text-[11px] transition-all ${pullDistance >= PULL_THRESHOLD ? "text-[#00B900] font-medium" : "text-gray-300"}`}>
                  {pullDistance >= PULL_THRESHOLD ? "離して更新" : "↓ 引っ張って更新"}
                </div>
              )}
            </div>
          )}
          {searchMessage.trim() ? (
            /* メッセージ検索結果モード */
            msgSearching ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
              </div>
            ) : msgSearchResults.length === 0 ? (
              <div className="text-center py-16 text-gray-300 text-xs">該当するメッセージなし</div>
            ) : (
              <div>
                <div className="px-3 py-1.5 bg-blue-50/60 border-b border-blue-100/50">
                  <span className="text-[9px] font-bold text-blue-500 tracking-wider flex items-center gap-1">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                    メッセージ検索結果 {msgSearchResults.length}件
                  </span>
                </div>
                {msgSearchResults.map((msg, i) => {
                  const friend = friends.find(f => f.patient_id === msg.patient_id);
                  const displayName = friend?.patient_name || msg.patient_id;
                  const snippet = isImageUrl(msg.content) ? "[画像]" : msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content;
                  const sentDate = formatDateShort(msg.sent_at);
                  return (
                    <button
                      key={`${msg.patient_id}-${msg.sent_at}-${i}`}
                      onClick={() => {
                        const f = friend || { patient_id: msg.patient_id, patient_name: msg.patient_id, line_id: null, mark: "none", tags: [], fields: {} };
                        selectPatient(f);
                      }}
                      className={`w-full text-left px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${selectedPatient?.patient_id === msg.patient_id ? "bg-[#00B900]/[0.12]" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-medium text-gray-800 truncate">{displayName}</span>
                        <span className="text-[11px] text-gray-700 flex-shrink-0 ml-2">{sentDate}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{snippet}</p>
                    </button>
                  );
                })}
              </div>
            )
          ) : friendsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-16 text-gray-300 text-xs">該当なし</div>
          ) : (
            <>
              {pinnedFriends.length > 0 && pinnedFriends.filter(f => {
                if (!showUnreadOnly) return true;
                return !!(f.last_text_at && (!readTimestamps[f.patient_id] || f.last_text_at > readTimestamps[f.patient_id]));
              }).map(f => (
                <FriendItem key={f.patient_id} f={f} isPinned={true}
                  isSelected={selectedPatient?.patient_id === f.patient_id}
                  onSelect={selectPatient} onTogglePin={togglePin}
                  getMarkColor={getMarkColor} getMarkLabel={getMarkLabel} formatDateShort={formatDateShort}
                  canPin={pinnedIds.length < MAX_PINS}
                  readTimestamp={readTimestamps[f.patient_id]}
                />
              ))}
              {visibleUnpinned.filter(f => {
                if (!showUnreadOnly) return true;
                return !!(f.last_text_at && (!readTimestamps[f.patient_id] || f.last_text_at > readTimestamps[f.patient_id]));
              }).map(f => (
                <FriendItem key={f.patient_id} f={f} isPinned={false}
                  isSelected={selectedPatient?.patient_id === f.patient_id}
                  onSelect={selectPatient} onTogglePin={togglePin}
                  getMarkColor={getMarkColor} getMarkLabel={getMarkLabel} formatDateShort={formatDateShort}
                  canPin={pinnedIds.length < MAX_PINS}
                  readTimestamp={readTimestamps[f.patient_id]}
                />
              ))}
              {hasMore && (
                <div className="px-3 py-3 text-center">
                  <button
                    onClick={() => setDisplayCount(prev => prev + DISPLAY_BATCH)}
                    className="text-[11px] text-[#00B900] hover:text-[#009900] font-medium transition-colors"
                  >
                    さらに{Math.min(DISPLAY_BATCH, unpinnedFriends.length - displayCount)}件を表示
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========== 中央カラム ========== */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${
        mobileView !== "message" ? "hidden md:flex" : "flex"
      }`}>
        {!selectedPatient ? (
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
                <h2 className="font-bold text-[14px] leading-tight truncate">{selectedPatient.patient_name}</h2>
                <span className="text-green-200/80 text-[11px] font-mono flex-shrink-0">{selectedPatient.patient_id}</span>
              </div>
              <button
                onClick={() => togglePin(selectedPatient.patient_id)}
                className={`p-1 rounded-lg transition-all ${pinnedIds.includes(selectedPatient.patient_id) ? "bg-white/20 text-amber-300" : "hover:bg-white/10 text-white/40"}`}
              >
                <svg className="w-4 h-4" fill={pinnedIds.includes(selectedPatient.patient_id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              {!selectedPatient.line_id && (
                <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full text-white/80">未連携</span>
              )}
            </div>

            {/* メッセージ */}
            <div ref={msgContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 bg-[#7494C0]/15">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white rounded-2xl px-5 py-2.5 text-gray-400 text-xs shadow-sm">読み込み中...</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white rounded-2xl px-5 py-2.5 text-gray-400 text-xs shadow-sm">メッセージなし</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {hasMoreMessages && (
                    <div className="flex justify-center py-2">
                      <button
                        onClick={loadMoreMessages}
                        disabled={loadingMoreMessages}
                        className="bg-white text-gray-500 text-[11px] px-4 py-1.5 rounded-full shadow-sm hover:shadow hover:text-gray-700 transition-all disabled:opacity-50"
                      >
                        {loadingMoreMessages ? (
                          <span className="flex items-center gap-1.5">
                            <div className="w-3 h-3 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                            読み込み中...
                          </span>
                        ) : "過去のメッセージを読み込む"}
                      </button>
                    </div>
                  )}
                  {messages.map((m, i) => {
                    const isSystem = m.message_type === "event" || m.event_type === "system" || m.message_type === "postback";
                    const isIncoming = m.direction === "incoming";
                    const showAvatar = isIncoming && !isSystem && (i === 0 || messages[i - 1]?.direction !== "incoming" || messages[i - 1]?.message_type === "event" || messages[i - 1]?.event_type === "system");
                    return (
                    <div key={m.id}>
                      {shouldShowDate(i) && (
                        <div className="flex justify-center my-3">
                          <span className="bg-gray-400/60 text-white text-[10px] px-3 py-0.5 rounded-full font-medium">{formatDate(m.sent_at)}</span>
                        </div>
                      )}
                      {isSystem ? (
                        /* システムイベント: 中央寄せ・グレーボックス */
                        <div className="flex justify-center my-1">
                          <div className="max-w-[80%] bg-white/80 border border-gray-200 rounded-lg px-4 py-2 text-center">
                            <div className="text-[10px] text-gray-400 mb-0.5">{formatTime(m.sent_at)}</div>
                            <div className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap break-words" style={{ overflowWrap: "anywhere" }}>{
                              m.content?.startsWith("{") ? "メニュー操作" : m.content
                            }</div>
                          </div>
                        </div>
                      ) : isIncoming ? (
                        /* 受信メッセージ: 左寄せ・白バブル + アバター */
                        <div className="flex justify-start items-start gap-2" style={{ marginLeft: 0 }}>
                          {showAvatar ? (
                            selectedPatient?.line_picture_url ? (
                              <img src={selectedPatient.line_picture_url} alt="" className="w-9 h-9 rounded-full flex-shrink-0 shadow-sm object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                                {selectedPatient?.patient_name?.charAt(0) || "?"}
                              </div>
                            )
                          ) : (
                            <div className="w-9 flex-shrink-0" />
                          )}
                          <div className="max-w-[65%]">
                            {showAvatar && (
                              <div className="text-[10px] text-gray-500 mb-0.5 ml-1 font-medium">{selectedPatient?.line_display_name || selectedPatient?.patient_name || ""}</div>
                            )}
                            <div className="flex items-end gap-1.5">
                              {isStickerContent(m.content) ? (
                                <img src={getStickerImageUrl(m.content)!} alt="スタンプ" className="w-[120px] h-[120px] object-contain" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).insertAdjacentText("afterend", "[スタンプ]"); }} />
                              ) : isImageUrl(m.content) ? (
                                <div className="relative rounded-2xl rounded-tl-sm overflow-hidden shadow-sm border border-gray-100 cursor-pointer" onClick={() => setLightboxUrl(extractImageUrl(m.content))}>
                                  <img src={extractImageUrl(m.content)} alt="画像" className="max-w-full max-h-60 object-contain bg-gray-50" loading="lazy" />
                                </div>
                              ) : (
                                <div className="relative bg-white text-gray-900 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words shadow-sm border border-gray-100" style={{ overflowWrap: "anywhere" }}>
                                  {linkifyContent(m.content)}
                                </div>
                              )}
                              <span className="text-[9px] text-gray-400 flex-shrink-0 pb-0.5">{formatTime(m.sent_at)}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* 送信メッセージ: 右寄せ・緑バブル */
                        <div className="flex justify-end items-end gap-1.5">
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0 pb-0.5">
                            {m.status === "failed" && <span className="text-[9px] text-red-400 font-medium">送信失敗</span>}
                            <span className="text-[9px] text-gray-400">{formatTime(m.sent_at)}</span>
                          </div>
                          <div className="max-w-[65%]">
                            {(() => {
                              /* flex_json がある場合はLINE風にFlex Bubble描画 */
                              if (m.flex_json) return renderFlexBubble(m.flex_json);
                              /* flex_json がない場合はフォールバック（旧形式カード） */
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
                              <div className="rounded-2xl rounded-tr-sm overflow-hidden shadow-sm cursor-pointer" onClick={() => setLightboxUrl(extractImageUrl(m.content))}>
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
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* 添付パネル */}
            {showAttachPanel && (
              <div className="flex-shrink-0 bg-white border-t border-gray-100 px-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={openTemplatePicker}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#00B900]/10 flex items-center justify-center group-hover:bg-[#00B900]/20 transition-colors">
                      <svg className="w-4 h-4 text-[#00B900]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <span className="text-xs font-medium text-gray-700">テンプレート送信</span>
                  </button>
                  <button
                    onClick={() => { setShowAttachPanel(false); imageInputRef.current?.click(); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="text-xs font-medium text-gray-700">画像送信</span>
                  </button>
                  <button
                    onClick={() => { setShowAttachPanel(false); setShowCallConfirm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <span className="text-xs font-medium text-gray-700">通話フォーム</span>
                  </button>
                  <button
                    onClick={openActionPicker}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <span className="text-xs font-medium text-gray-700">アクション実行</span>
                  </button>
                </div>
              </div>
            )}

            {/* 入力 */}
            <div className="flex-shrink-0 bg-white border-t border-gray-100 px-3 py-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageSelect}
              />
              <div className="flex items-end gap-2">
                <button
                  onClick={() => setShowAttachPanel(!showAttachPanel)}
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    showAttachPanel
                      ? "bg-[#00B900] text-white rotate-45"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力"
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50 transition-all"
                  style={{ maxHeight: "100px" }}
                  onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 100) + "px"; }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || sendingImage || !newMessage.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-[#00B900] to-[#00a000] text-white rounded-xl text-sm font-medium hover:shadow-md disabled:opacity-30 transition-all flex-shrink-0 flex items-center gap-1.5"
                >
                  {sending || sendingImage ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  )}
                  送信
                </button>
              </div>
              <div className="text-[9px] text-gray-300 mt-1 text-right">
                {sendingImage ? "画像送信中..." : "Enter で改行"}
              </div>
            </div>
          </>
        )}
      </div>

      {/* テンプレート送信確認モーダル */}
      {pendingTemplate && selectedPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPendingTemplate(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm">テンプレート送信確認</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">「{pendingTemplate.name}」を {selectedPatient.patient_name} に送信しますか？</p>
            </div>
            <div className="px-5 py-4 max-h-60 overflow-y-auto">
              {pendingTemplate.message_type === "image" ? (
                <img src={pendingTemplate.content} alt="" className="max-w-full rounded-lg" />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{pendingTemplate.content}</p>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setPendingTemplate(null)}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
              >キャンセル</button>
              <button
                onClick={() => sendTemplate(pendingTemplate)}
                disabled={sending}
                className="px-4 py-2 bg-[#00B900] text-white text-sm font-medium rounded-lg hover:bg-[#009900] disabled:opacity-50 transition-colors"
              >送信</button>
            </div>
          </div>
        </div>
      )}

      {/* 通話フォーム確認モーダル */}
      {showCallConfirm && selectedPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCallConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">通話フォームを送信</h3>
                <p className="text-sm text-gray-500 mb-1">
                  <span className="font-semibold text-gray-800">{selectedPatient.patient_name}</span> さんに
                </p>
                <p className="text-sm text-gray-500 mb-5">
                  通話リクエストのメッセージを送信しますか？
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowCallConfirm(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSendCallForm}
                    disabled={sendingCall}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 text-sm font-medium shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    {sendingCall ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    )}
                    送信する
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* アクション選択モーダル */}
      {showActionPicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowActionPicker(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-gray-800">アクション実行</h3>
              <button onClick={() => setShowActionPicker(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <input
                type="text"
                value={actionSearch}
                onChange={e => setActionSearch(e.target.value)}
                placeholder="アクション名で検索"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {actionList.filter(a => !actionSearch || a.name.toLowerCase().includes(actionSearch.toLowerCase())).length === 0 ? (
                <div className="text-center py-12 text-gray-300 text-sm">アクションがありません</div>
              ) : (
                actionList
                  .filter(a => !actionSearch || a.name.toLowerCase().includes(actionSearch.toLowerCase()))
                  .map(a => (
                    <button
                      key={a.id}
                      onClick={() => executeAction(a.id)}
                      disabled={executingAction}
                      className="w-full text-left px-5 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors disabled:opacity-50"
                    >
                      <div className="text-sm font-medium text-gray-800">{a.name}</div>
                      <div className="mt-0.5 space-y-0.5">
                        {a.steps.map((step: { type: string; content?: string; tag_name?: string; mark?: string }, si: number) => (
                          <p key={si} className="text-[10px] text-gray-400">
                            {step.type === "send_text" && `テキスト送信: ${step.content?.slice(0, 30) || ""}`}
                            {step.type === "send_template" && "テンプレート送信"}
                            {step.type === "tag_add" && `タグ追加: ${step.tag_name || ""}`}
                            {step.type === "tag_remove" && `タグ削除: ${step.tag_name || ""}`}
                            {step.type === "mark_change" && `マーク変更: ${step.mark || ""}`}
                          </p>
                        ))}
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* テンプレート選択モーダル */}
      {showTemplatePicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTemplatePicker(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            {/* ヘッダー */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00B900]/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-[#00B900]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                テンプレート送信
              </h2>
              <button onClick={() => setShowTemplatePicker(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 検索 & カテゴリフィルタ */}
            <div className="px-5 py-3 border-b border-gray-100 space-y-2 flex-shrink-0">
              <div className="relative">
                <svg className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="テンプレート名・内容で検索"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50"
                  autoFocus
                />
              </div>
              {templateCategories.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {templateCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setTemplateCategoryFilter(templateCategoryFilter === cat.name ? null : cat.name)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        templateCategoryFilter === cat.name ? "bg-[#00B900] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >{cat.name}</button>
                  ))}
                </div>
              )}
            </div>

            {/* テンプレートリスト */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {templatesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">
                  {templates.length === 0 ? "テンプレートがありません" : "該当するテンプレートがありません"}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filteredTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => confirmTemplate(t)}
                      disabled={sending}
                      className="w-full text-left px-5 py-3 hover:bg-[#00B900]/[0.03] transition-colors group disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 group-hover:text-[#00B900] transition-colors">{t.name}</span>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-[#00B900] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{t.content}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== 右カラム ========== */}
      {selectedPatient && (
        <div className={`w-full md:w-[320px] flex-1 md:flex-none md:flex-shrink-0 border-l border-gray-200/80 bg-white flex flex-col min-h-0 ${
          mobileView !== "info" ? "hidden md:flex" : "flex"
        }`}>
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {/* プロフィール */}
            <div className="px-4 pt-5 pb-4 text-center border-b border-gray-100">
              {selectedPatient.line_picture_url ? (
                <img src={selectedPatient.line_picture_url} alt="" className="w-14 h-14 rounded-full mx-auto shadow-sm object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-xl font-bold mx-auto shadow-sm">
                  {selectedPatient.patient_name?.charAt(0) || "?"}
                </div>
              )}
              <h3 className="font-bold text-gray-900 mt-2.5 text-[15px]">{selectedPatient.patient_id?.startsWith("LINE_") ? "🟧 " : ""}{selectedPatient.patient_name || "（名前なし）"}</h3>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{selectedPatient.patient_id}</p>
              {selectedPatient.line_id ? (
                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-[#00B900] bg-[#00B900]/5 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00B900]" />連携済み
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />未連携
                </span>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Link
                  href={`/admin/line/friends/${encodeURIComponent(selectedPatient.patient_id)}`}
                  className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-[11px] font-medium hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  友だち詳細
                </Link>
                {/* 表示設定 */}
                <div className="relative ml-auto">
                  <button
                    onClick={() => setShowSectionSettings(!showSectionSettings)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="表示項目の設定"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </button>
                  {showSectionSettings && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1">
                      <p className="px-3 py-1.5 text-[10px] text-gray-400 font-bold tracking-wider">表示項目</p>
                      {RIGHT_COLUMN_SECTIONS.map(s => (
                        <label key={s.key} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSectionVisible(s.key)}
                            onChange={() => {
                              const next = { ...visibleSections, [s.key]: !isSectionVisible(s.key) };
                              setVisibleSections(next);
                              fetch("/api/admin/line/column-settings", {
                                method: "PUT",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ sections: next }),
                              }).catch(() => {});
                            }}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-[#06C755] focus:ring-[#06C755]"
                          />
                          <span className="text-xs text-gray-700">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {patientDetail?.registeredAt && (
                  <span className="text-[10px] text-gray-400">登録日時：{(() => {
                    try {
                      const d = new Date(patientDetail.registeredAt);
                      const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
                      return `${jst.getUTCFullYear()}/${String(jst.getUTCMonth() + 1).padStart(2, "0")}/${String(jst.getUTCDate()).padStart(2, "0")} ${String(jst.getUTCHours()).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}`;
                    } catch { return patientDetail.registeredAt.slice(0, 16).replace("T", " "); }
                  })()}</span>
                )}
              </div>
            </div>

            {/* 個人情報 */}
            {isSectionVisible("personal") && (patientDetail?.medicalInfo || patientDetail?.verifiedPhone) && (
              <div className="px-4 py-3 border-b border-gray-100">
                <SectionLabel>個人情報</SectionLabel>
                {patientDetail.medicalInfo?.kana && <InfoRow label="カナ">{patientDetail.medicalInfo.kana}</InfoRow>}
                {patientDetail.medicalInfo?.gender && <InfoRow label="性別">{patientDetail.medicalInfo.gender}</InfoRow>}
                {patientDetail.medicalInfo?.birthday && (
                  <InfoRow label="生年月日">
                    {(() => {
                      const raw = patientDetail.medicalInfo!.birthday;
                      try {
                        const d = new Date(raw);
                        if (isNaN(d.getTime())) return raw;
                        const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
                        return `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`;
                      } catch { return raw; }
                    })()}
                    {(() => { const a = calcAge(patientDetail.medicalInfo!.birthday); return a !== null ? `（${a}歳）` : ""; })()}
                  </InfoRow>
                )}
                {patientDetail.verifiedPhone && <InfoRow label="電話番号" mono>{patientDetail.verifiedPhone}</InfoRow>}
              </div>
            )}

            {/* 次回予約 */}
            {isSectionVisible("reservation") && patientDetail?.nextReservation && (
              <div className="px-4 py-2 border-b border-gray-100 bg-blue-50/30">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-blue-500 font-bold tracking-wider uppercase">予約</span>
                  <span className="text-[12px] text-blue-700 font-semibold">{patientDetail.nextReservation}</span>
                </div>
              </div>
            )}

            {/* 対応マーク - ドロップダウン */}
            {isSectionVisible("mark") && <div className="px-4 py-3 border-b border-gray-100">
              <SectionLabel>対応マーク</SectionLabel>
              <div className="relative">
                <button
                  onClick={() => setShowMarkDropdown(!showMarkDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: currentMark.color }} />
                    <span className="text-[12px] text-gray-800 font-medium">
                      {currentMark.label}
                    </span>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${showMarkDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showMarkDropdown && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {markOptions.map(m => (
                      <button
                        key={m.value}
                        onClick={() => handleMarkChange(m.value)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors text-[12px] ${patientMark === m.value ? "bg-gray-50 font-semibold" : "text-gray-600"}`}
                      >
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                        {m.label}
                        {patientMark === m.value && <svg className="w-3.5 h-3.5 ml-auto text-[#00B900]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>}

            {/* タグ */}
            {isSectionVisible("tags") && <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <SectionLabel>タグ</SectionLabel>
                <button
                  onClick={() => setShowTagPicker(!showTagPicker)}
                  className="text-[10px] text-[#00B900] hover:text-[#009900] font-semibold flex items-center gap-0.5 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  追加
                </button>
              </div>
              {showTagPicker && (
                <div className="mb-2 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  {availableTags.length === 0 ? (
                    <div className="px-3 py-2 text-[11px] text-gray-400">追加できるタグなし</div>
                  ) : (
                    <div className="max-h-28 overflow-y-auto">
                      {availableTags.map(t => (
                        <button key={t.id} onClick={() => handleAddTag(t.id)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left transition-colors">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="text-xs text-gray-700">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {patientTags.length === 0 ? (
                <p className="text-[10px] text-gray-300">タグなし</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {patientTags.map(t => (
                    <span key={t.tag_id} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] text-white group cursor-default" style={{ backgroundColor: t.tag_definitions.color }}>
                      {t.tag_definitions.name}
                      <button onClick={() => handleRemoveTag(t.tag_id)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>}

            {/* 友だち情報 */}
            {isSectionVisible("friendFields") && allFieldDefs.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100">
                <SectionLabel>友だち情報</SectionLabel>
                {allFieldDefs.map(fd => {
                  const val = patientFields.find(pf => pf.field_id === fd.id);
                  return <InfoRow key={fd.id} label={fd.name}>{val?.value || <span className="text-gray-200">—</span>}</InfoRow>;
                })}
              </div>
            )}

            {/* 問診事項（問診提出済みの場合のみ） */}
            {isSectionVisible("medical") && patientDetail?.medicalInfo?.hasIntake && (
              <div className="px-4 py-3 border-b border-gray-100">
                <SectionLabel>問診事項</SectionLabel>
                <div className="space-y-2">
                  {[
                    { label: "既往歴", value: patientDetail.medicalInfo.medicalHistory || "特記事項なし" },
                    { label: "GLP-1 使用歴", value: patientDetail.medicalInfo.glp1History || "使用歴なし" },
                    { label: "内服歴", value: patientDetail.medicalInfo.medicationHistory || "なし" },
                    { label: "アレルギー", value: patientDetail.medicalInfo.allergies || "アレルギーなし" },
                  ].map((item) => (
                    <div key={item.label}>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{item.label}</span>
                      <p className="text-[11px] text-gray-700 mt-0.5 bg-gray-50/80 rounded-md px-2 py-1 leading-relaxed">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 最新決済（配送情報含む） */}
            {isSectionVisible("latestOrder") && patientDetail?.latestOrder && (
              <div className="px-4 py-3 border-b border-gray-100">
                <SectionLabel>最新決済</SectionLabel>
                <InfoRow label="メニュー">{patientDetail.latestOrder.product}</InfoRow>
                <InfoRow label="金額">{patientDetail.latestOrder.amount}</InfoRow>
                <InfoRow label="決済方法">{patientDetail.latestOrder.payment}</InfoRow>
                <InfoRow label="日時">{patientDetail.latestOrder.date}</InfoRow>
                {patientDetail.latestOrder.refund_status && (
                  <div className="flex items-center justify-between py-[3px]">
                    <span className="text-[11px] text-gray-400">返金</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">{patientDetail.latestOrder.refund_status}</span>
                  </div>
                )}
                <InfoRow label="追跡番号" mono>{patientDetail.latestOrder.tracking && patientDetail.latestOrder.tracking !== "-" ? (
                  <a href={`https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=${patientDetail.latestOrder.tracking.replace(/-/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">{patientDetail.latestOrder.tracking}</a>
                ) : (patientDetail.latestOrder.tracking || "-")}</InfoRow>
                {patientDetail.latestOrder.phone && <InfoRow label="電話" mono>{patientDetail.latestOrder.phone}</InfoRow>}
                {patientDetail.latestOrder.email && (
                  <div className="flex items-start justify-between py-[3px] gap-2">
                    <span className="text-[11px] text-gray-400 flex-shrink-0">メール</span>
                    <span className="text-[11px] text-gray-800 break-all text-right">{patientDetail.latestOrder.email}</span>
                  </div>
                )}
                {patientDetail.latestOrder.address && (
                  <div className="flex items-start justify-between py-[3px] gap-2">
                    <span className="text-[11px] text-gray-400 flex-shrink-0">住所</span>
                    <span className="text-[11px] text-gray-800 text-right leading-relaxed">
                      {patientDetail.latestOrder.postal_code && <span className="text-gray-400 text-[10px]">{patientDetail.latestOrder.postal_code}<br /></span>}
                      {patientDetail.latestOrder.address}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 処方履歴 */}
            {isSectionVisible("orderHistory") && patientDetail && patientDetail.orderHistory.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100">
                <SectionLabel>処方履歴</SectionLabel>
                {patientDetail.orderHistory.map((o, i) => (
                  <div key={i} className="flex items-center justify-between py-[3px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-300 font-mono">{o.date}</span>
                      <span className="text-[11px] text-gray-700">{o.product}</span>
                    </div>
                    {o.refund_status && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 font-medium">
                        {o.refund_status === "refunded" ? "返金済" : o.refund_status === "pending" ? "返金中" : o.refund_status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 銀行振込待ち */}
            {isSectionVisible("bankTransfer") && patientDetail?.pendingBankTransfer && (
              <div className="px-4 py-2 border-b border-gray-100 bg-amber-50/30">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">振込待ち</span>
                  <span className="text-[11px] text-amber-800">{patientDetail.pendingBankTransfer.product}</span>
                  <span className="text-[10px] text-amber-500 ml-auto">{patientDetail.pendingBankTransfer.date}</span>
                </div>
              </div>
            )}

            {/* 再処方 */}
            {isSectionVisible("reorders") && patientDetail && patientDetail.reorders.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-100">
                <SectionLabel>再処方</SectionLabel>
                {patientDetail.reorders.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-[3px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-300 font-mono">{r.date}</span>
                      <span className="text-[11px] text-gray-700">{r.product}</span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      r.status === "承認済み" || r.status === "決済済み" ? "bg-emerald-50 text-emerald-600"
                        : r.status === "却下" || r.status === "キャンセル" ? "bg-red-50 text-red-500"
                          : "bg-blue-50 text-blue-600"
                    }`}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* リッチメニュー */}
            {isSectionVisible("richMenu") && <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <SectionLabel>リッチメニュー</SectionLabel>
                {selectedPatient?.line_id && (
                  <button
                    onClick={openMenuPicker}
                    className="text-[10px] text-[#00B900] hover:text-[#009900] font-medium cursor-pointer"
                  >
                    変更
                  </button>
                )}
              </div>
              {showMenuPicker && (
                <div className="mb-2 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-medium">メニューを選択</span>
                    <button onClick={() => setShowMenuPicker(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  {allRichMenus.length === 0 ? (
                    <div className="px-3 py-3 text-center text-[10px] text-gray-400">読み込み中...</div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      {allRichMenus.map(m => (
                        <button
                          key={m.id}
                          onClick={() => changeRichMenu(m.id)}
                          disabled={changingMenu}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-2 cursor-pointer ${
                            userRichMenu?.id === m.id ? "bg-[#00B900]/5" : ""
                          } ${changingMenu ? "opacity-50" : ""}`}
                        >
                          {m.image_url ? (
                            <img src={m.image_url} alt="" className="w-10 h-5 rounded object-cover flex-shrink-0 border border-gray-200" />
                          ) : (
                            <div className="w-10 h-5 rounded bg-gray-100 flex-shrink-0" />
                          )}
                          <span className="text-[11px] text-gray-700 truncate">{m.name}</span>
                          {userRichMenu?.id === m.id && (
                            <svg className="w-3.5 h-3.5 text-[#00B900] flex-shrink-0 ml-auto" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {userRichMenu ? (
                <div>
                  <div className="text-[12px] text-gray-800 font-medium mb-1.5">{userRichMenu.name}</div>
                  {userRichMenu.image_url && (
                    <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                      <img src={userRichMenu.image_url} alt={userRichMenu.name} className="w-full h-auto" />
                    </div>
                  )}
                  {!userRichMenu.image_url && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-4 text-center">
                      <svg className="w-8 h-8 text-gray-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                      <span className="text-[10px] text-gray-400">プレビューなし</span>
                    </div>
                  )}
                  {userRichMenu.is_default && (
                    <span className="inline-block mt-1.5 text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">デフォルト</span>
                  )}
                </div>
              ) : selectedPatient?.line_id ? (
                <div className="text-[11px] text-gray-300">読み込み中...</div>
              ) : (
                <div className="text-[11px] text-gray-300">LINE未連携</div>
              )}
            </div>}
          </div>
        </div>
      )}

      {/* 画像ライトボックス */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxUrl}
            alt="拡大画像"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// 友達リストアイテム（メモ化のためコンポーネント分離）
function FriendItem({ f, isPinned, isSelected, onSelect, onTogglePin, getMarkColor, getMarkLabel, formatDateShort, canPin, readTimestamp }: {
  f: Friend; isPinned: boolean; isSelected: boolean;
  onSelect: (f: Friend) => void; onTogglePin: (id: string) => void;
  getMarkColor: (mark: string) => string; getMarkLabel: (mark: string) => string; formatDateShort: (s: string) => string;
  canPin: boolean;
  readTimestamp?: string;
}) {
  // patient_idがないレコードは描画しない
  if (!f.patient_id) return null;
  const markColor = getMarkColor(f.mark);
  const markLabel = getMarkLabel(f.mark);
  const showMark = !!f.mark;
  // テキスト未読判定: last_text_at が readTimestamp より新しければ未読
  const hasUnreadText = !!(f.last_text_at && (!readTimestamp || f.last_text_at > readTimestamp));
  // メッセージ表示テキスト
  const displayMessage = f.last_message
    ? isStickerContent(f.last_message) ? "[スタンプ]"
      : f.last_message.match(/^【.+?】/) && isImageUrl(f.last_message.replace(/^【.+?】/, ""))
      ? f.last_message.match(/^【.+?】/)![0]
      : isImageUrl(f.last_message) ? "[画像]" : f.last_message
    : "メッセージなし";
  return (
    <div
      onClick={() => onSelect(f)}
      className={`px-2 py-1.5 cursor-pointer transition-all hover:bg-gray-50/80 border-b border-gray-50 group ${
        isSelected ? "bg-[#00B900]/[0.12] border-l-[3px] border-l-[#00B900]" : "border-l-[3px] border-l-transparent"
      }`}
    >
      <div className="flex items-start gap-1.5" style={{ minHeight: "52px" }}>
        {f.line_picture_url ? (
          <img src={f.line_picture_url} alt="" className="w-8 h-8 rounded-full flex-shrink-0 shadow-sm object-cover mt-0.5" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm mt-0.5">
            {f.patient_name?.charAt(0) || "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[15px] font-semibold text-gray-800 truncate">{f.patient_id?.startsWith("LINE_") ? "🟧 " : ""}{f.patient_name || "（名前なし）"}</span>
            {hasUnreadText && (
              <span className="w-3 h-3 rounded-full bg-[#00B900] flex-shrink-0" />
            )}
          </div>
          <p className="text-[11px] text-gray-500 leading-[1.4]" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-all", height: "31px" }}>
            {displayMessage}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0 pt-0.5">
          {(f.last_text_at || f.last_sent_at) && (
            <span className="text-[12px] text-gray-400 whitespace-nowrap">{formatDateShort(f.last_text_at || f.last_sent_at!)}</span>
          )}
          {showMark && (
            <span className="text-[10px] font-bold leading-none px-1.5 py-0.5 rounded-sm text-white whitespace-nowrap" style={{ backgroundColor: markColor }}>
              {markLabel}
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(f.patient_id); }}
          className={`flex-shrink-0 p-0.5 rounded transition-all mt-0.5 ${
            isPinned ? "text-amber-400" : "text-gray-200 opacity-0 group-hover:opacity-100 hover:text-amber-300"
          }`}
        >
          <svg className="w-3 h-3" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
