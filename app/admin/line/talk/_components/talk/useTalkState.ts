"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import type {
  Friend, MessageLog, Template, TemplateCategory,
  PatientTag, PatientDetail, FieldDef, FieldValue, MarkOption,
  TalkClientProps,
} from "./types";
import {
  PAGE_SIZE, DEFAULT_MARK_OPTIONS,
} from "./constants";

export function useTalkState(props: TalkClientProps) {
  const { initialFriends, initialHasMore, initialPinnedIds, initialReadTimestamps, initialVisibleSections } = props;
  const searchParams = useSearchParams();
  const initialPid = searchParams.get("pid");

  // 左カラム
  const [friends, setFriends] = useState<Friend[]>(initialFriends || []);
  const [friendsLoading, setFriendsLoading] = useState(!initialFriends);
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [serverHasMore, setServerHasMore] = useState(!!initialHasMore);
  const [friendsSearching, setFriendsSearching] = useState(false);
  const friendsSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const friendsOffsetRef = useRef(initialFriends?.length || 0);
  const [msgSearchResults, setMsgSearchResults] = useState<{ patient_id: string; content: string; sent_at: string }[]>([]);
  const [msgSearching, setMsgSearching] = useState(false);
  const msgSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pinnedIds, setPinnedIds] = useState<string[]>(initialPinnedIds ?? []);
  const pinnedIdsRef = useRef<string[]>(initialPinnedIds ?? []);
  const pinsReadyRef = useRef(initialPinnedIds !== undefined);
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
  const sendLockRef = useRef(false);
  const [lineCallUrl, setLineCallUrl] = useState(process.env.NEXT_PUBLIC_LINE_CALL_URL || "");
  // 診察モード設定（SWR）
  const { data: consultSettingsData } = useSWR<{ settings: { type?: string; line_call_url?: string } }>("/api/admin/settings?category=consultation");
  const lineCallEnabled = useMemo(() => {
    const t = consultSettingsData?.settings?.type || "online_all";
    return t !== "online_phone" && t !== "in_person";
  }, [consultSettingsData]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const selectAbortRef = useRef<AbortController | null>(null);

  // 予約送信
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduledMessages, setScheduledMessages] = useState<{ id: number; message_content: string; scheduled_at: string; status: string; created_at: string }[]>([]);
  const [cancelingScheduleId, setCancelingScheduleId] = useState<number | null>(null);

  // アクション実行
  const [showActionPicker, setShowActionPicker] = useState(false);
  const [actionList, setActionList] = useState<{ id: number; name: string; steps: { type: string; content?: string; tag_name?: string; mark?: string }[] }[]>([]);
  const [actionSearch, setActionSearch] = useState("");
  const [executingAction, setExecutingAction] = useState(false);

  // メディアピッカー
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<{ id: number; name: string; file_url: string; file_type: string; mime_type: string; file_size: number; folder_id: number | null; created_at: string; media_folders: { name: string } | null }[]>([]);
  const [mediaFolders, setMediaFolders] = useState<{ id: number; name: string; file_count: number }[]>([]);
  const [mediaFolderFilter, setMediaFolderFilter] = useState<number | null>(null);
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [sendingMediaImage, setSendingMediaImage] = useState(false);

  // 添付パネル並び順
  const DEFAULT_ATTACH_ORDER = ["template", "image", "media", "pdf", "call", "action"];
  const { data: attachOrderData } = useSWR<{ order: string[] }>("/api/admin/line/attach-panel-order");
  const [attachPanelOrder, setAttachPanelOrder] = useState<string[]>(DEFAULT_ATTACH_ORDER);
  const [attachEditMode, setAttachEditMode] = useState(false);
  useEffect(() => {
    if (attachOrderData?.order) setAttachPanelOrder(attachOrderData.order);
  }, [attachOrderData]);

  // PDFピッカー
  const [showPdfPicker, setShowPdfPicker] = useState(false);
  const [pdfFiles, setPdfFiles] = useState<{ id: number; name: string; file_url: string; file_type: string; mime_type: string; file_size: number; folder_id: number | null; created_at: string; media_folders: { name: string } | null }[]>([]);
  const [pdfFolders, setPdfFolders] = useState<{ id: number; name: string; file_count: number }[]>([]);
  const [pdfFolderFilter, setPdfFolderFilter] = useState<number | null>(null);
  const [pdfSearch, setPdfSearch] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendingMediaPdf, setSendingMediaPdf] = useState(false);

  // 右カラム
  const [patientTags, setPatientTags] = useState<PatientTag[]>([]);
  const [patientMark, setPatientMark] = useState("none");
  const [patientFields, setPatientFields] = useState<FieldValue[]>([]);
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  // マスターデータ（SWR）
  const { data: tagsData } = useSWR<{ tags: { id: number; name: string; color: string }[] }>("/api/admin/tags");
  const { data: fieldsData } = useSWR<{ fields: FieldDef[] }>("/api/admin/friend-fields");
  const { data: marksData } = useSWR<{ marks: { value: string; label: string; color: string; icon: string }[] }>("/api/admin/line/marks");
  const allTags = tagsData?.tags ?? [];
  const allFieldDefs = fieldsData?.fields ?? [];
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showMarkDropdown, setShowMarkDropdown] = useState(false);
  const [markNote, setMarkNote] = useState("");
  const [savingMark, setSavingMark] = useState(false);
  const markOptions: MarkOption[] = useMemo(() => {
    if (!marksData?.marks) return DEFAULT_MARK_OPTIONS;
    return marksData.marks.map(m => ({ value: m.value, label: m.label, color: m.color, icon: m.icon || "●" }));
  }, [marksData]);
  const [userRichMenu, setUserRichMenu] = useState<{ id?: number; name: string; image_url: string | null; line_rich_menu_id: string; is_default: boolean } | null>(null);
  const [showMenuPicker, setShowMenuPicker] = useState(false);
  const [allRichMenus, setAllRichMenus] = useState<{ id: number; name: string; image_url: string | null; line_rich_menu_id: string }[]>([]);
  const [changingMenu, setChangingMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // 右カラム表示設定
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>(initialVisibleSections ?? {});
  const [showSectionSettings, setShowSectionSettings] = useState(false);
  const isSectionVisible = (key: string) => visibleSections[key] !== false;

  // 画像ライトボックス
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // モバイルビュー切り替え
  const [mobileView, setMobileView] = useState<"list" | "message" | "info">("list");

  // 既読タイムスタンプ管理（DB共有）
  const [readTimestamps, setReadTimestamps] = useState<Record<string, string>>(initialReadTimestamps ?? {});
  // 未読のみ表示フィルタ
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // LINEコールURL取得（設定 → 環境変数フォールバック）
  useEffect(() => {
    if (consultSettingsData?.settings?.line_call_url) {
      setLineCallUrl(consultSettingsData.settings.line_call_url);
    } else if (process.env.NEXT_PUBLIC_LINE_CALL_URL) {
      setLineCallUrl(process.env.NEXT_PUBLIC_LINE_CALL_URL);
    }
  }, [consultSettingsData]);

  // selectedPatientRef と messagesRef（ポーリングで使用）
  const selectedPatientRef = useRef<Friend | null>(null);
  const messagesRef = useRef<MessageLog[]>([]);
  selectedPatientRef.current = selectedPatient;
  messagesRef.current = messages;

  // autoSelected ref
  const autoSelectedRef = useRef(false);

  // scrollTimerRef
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return {
    // props
    initialFriends, initialHasMore, initialPinnedIds, initialReadTimestamps, initialVisibleSections,
    initialPid,

    // 左カラム
    friends, setFriends,
    friendsLoading, setFriendsLoading,
    searchId, setSearchId,
    searchName, setSearchName,
    searchMessage, setSearchMessage,
    serverHasMore, setServerHasMore,
    friendsSearching, setFriendsSearching,
    friendsSearchTimer,
    friendsOffsetRef,
    msgSearchResults, setMsgSearchResults,
    msgSearching, setMsgSearching,
    msgSearchTimer,
    pinnedIds, setPinnedIds,
    pinnedIdsRef,
    pinsReadyRef,
    listRef,
    pullRefreshing, setPullRefreshing,
    pullDistance, setPullDistance,
    touchStartY,
    isPulling,

    // 中央カラム
    selectedPatient, setSelectedPatient,
    messages, setMessages,
    messagesLoading, setMessagesLoading,
    hasMoreMessages, setHasMoreMessages,
    loadingMoreMessages, setLoadingMoreMessages,
    newMessage, setNewMessage,
    sending, setSending,
    messagesEndRef,
    msgContainerRef,
    shouldScrollToBottom,
    inputRef,

    // 添付パネル
    showAttachPanel, setShowAttachPanel,
    showTemplatePicker, setShowTemplatePicker,
    templates, setTemplates,
    templateCategories, setTemplateCategories,
    templateCategoryFilter, setTemplateCategoryFilter,
    templateSearch, setTemplateSearch,
    templatesLoading, setTemplatesLoading,
    sendingImage, setSendingImage,
    pendingTemplate, setPendingTemplate,
    showCallConfirm, setShowCallConfirm,
    sendingCall, setSendingCall,
    sendLockRef,
    lineCallUrl, setLineCallUrl,
    consultSettingsData,
    lineCallEnabled,
    imageInputRef,
    selectAbortRef,

    // 予約送信
    scheduleMode, setScheduleMode,
    scheduledAt, setScheduledAt,
    scheduledMessages, setScheduledMessages,
    cancelingScheduleId, setCancelingScheduleId,

    // アクション
    showActionPicker, setShowActionPicker,
    actionList, setActionList,
    actionSearch, setActionSearch,
    executingAction, setExecutingAction,

    // メディアピッカー
    showMediaPicker, setShowMediaPicker,
    mediaFiles, setMediaFiles,
    mediaFolders, setMediaFolders,
    mediaFolderFilter, setMediaFolderFilter,
    mediaSearch, setMediaSearch,
    mediaLoading, setMediaLoading,
    sendingMediaImage, setSendingMediaImage,

    // 添付パネル並び順
    attachPanelOrder, setAttachPanelOrder,
    attachEditMode, setAttachEditMode,

    // PDFピッカー
    showPdfPicker, setShowPdfPicker,
    pdfFiles, setPdfFiles,
    pdfFolders, setPdfFolders,
    pdfFolderFilter, setPdfFolderFilter,
    pdfSearch, setPdfSearch,
    pdfLoading, setPdfLoading,
    sendingMediaPdf, setSendingMediaPdf,

    // 右カラム
    patientTags, setPatientTags,
    patientMark, setPatientMark,
    patientFields, setPatientFields,
    patientDetail, setPatientDetail,
    tagsData,
    fieldsData,
    marksData,
    allTags,
    allFieldDefs,
    showTagPicker, setShowTagPicker,
    showMarkDropdown, setShowMarkDropdown,
    markNote, setMarkNote,
    savingMark, setSavingMark,
    markOptions,
    userRichMenu, setUserRichMenu,
    showMenuPicker, setShowMenuPicker,
    allRichMenus, setAllRichMenus,
    changingMenu, setChangingMenu,
    isBlocked, setIsBlocked,

    // 右カラム表示設定
    visibleSections, setVisibleSections,
    showSectionSettings, setShowSectionSettings,
    isSectionVisible,

    // 画像ライトボックス
    lightboxUrl, setLightboxUrl,

    // モバイルビュー
    mobileView, setMobileView,

    // 既読
    readTimestamps, setReadTimestamps,
    showUnreadOnly, setShowUnreadOnly,

    // refs
    selectedPatientRef,
    messagesRef,
    autoSelectedRef,
    scrollTimerRef,
  };
}

export type TalkState = ReturnType<typeof useTalkState>;
