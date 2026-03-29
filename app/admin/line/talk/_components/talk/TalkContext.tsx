"use client";

import { createContext, useContext, type ReactNode, type RefObject } from "react";
import type {
  Friend, MessageLog, Template, TemplateCategory, TagDef,
  PatientTag, PatientDetail, FieldDef, FieldValue, MarkOption,
} from "./types";

export interface TalkContextValue {
  // 左カラム state
  friends: Friend[];
  setFriends: React.Dispatch<React.SetStateAction<Friend[]>>;
  friendsLoading: boolean;
  searchId: string;
  setSearchId: (v: string) => void;
  searchName: string;
  setSearchName: (v: string) => void;
  searchMessage: string;
  setSearchMessage: (v: string) => void;
  serverHasMore: boolean;
  friendsSearching: boolean;
  setFriendsSearching: (v: boolean) => void;
  friendsOffsetRef: RefObject<number>;
  msgSearchResults: { patient_id: string; content: string; sent_at: string }[];
  msgSearching: boolean;
  pinnedIds: string[];
  listRef: RefObject<HTMLDivElement | null>;
  pullRefreshing: boolean;
  pullDistance: number;
  showUnreadOnly: boolean;
  setShowUnreadOnly: (v: boolean) => void;

  // 中央カラム state
  selectedPatient: Friend | null;
  messages: MessageLog[];
  setMessages: React.Dispatch<React.SetStateAction<MessageLog[]>>;
  messagesLoading: boolean;
  hasMoreMessages: boolean;
  loadingMoreMessages: boolean;
  newMessage: string;
  setNewMessage: (v: string) => void;
  sending: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  msgContainerRef: RefObject<HTMLDivElement | null>;
  shouldScrollToBottom: RefObject<boolean>;
  inputRef: RefObject<HTMLTextAreaElement | null>;

  // 添付パネル
  showAttachPanel: boolean;
  setShowAttachPanel: (v: boolean) => void;
  showTemplatePicker: boolean;
  setShowTemplatePicker: (v: boolean) => void;
  templates: Template[];
  templateCategories: TemplateCategory[];
  templateCategoryFilter: string | null;
  setTemplateCategoryFilter: (v: string | null) => void;
  templateSearch: string;
  setTemplateSearch: (v: string) => void;
  templatesLoading: boolean;
  sendingImage: boolean;
  pendingTemplate: Template | null;
  setPendingTemplate: (v: Template | null) => void;
  showCallConfirm: boolean;
  setShowCallConfirm: (v: boolean) => void;
  sendingCall: boolean;
  lineCallUrl: string;
  lineCallEnabled: boolean;
  imageInputRef: RefObject<HTMLInputElement | null>;

  // 予約送信
  scheduleMode: boolean;
  setScheduleMode: (v: boolean) => void;
  scheduledAt: string;
  setScheduledAt: (v: string) => void;
  scheduledMessages: { id: number; message_content: string; scheduled_at: string; status: string; created_at: string }[];
  cancelingScheduleId: number | null;

  // アクション
  showActionPicker: boolean;
  setShowActionPicker: (v: boolean) => void;
  actionList: { id: number; name: string; steps: { type: string; content?: string; tag_name?: string; mark?: string }[] }[];
  actionSearch: string;
  setActionSearch: (v: string) => void;
  executingAction: boolean;

  // メディアピッカー
  showMediaPicker: boolean;
  setShowMediaPicker: (v: boolean) => void;
  mediaFiles: { id: number; name: string; file_url: string; file_type: string; mime_type: string; file_size: number; folder_id: number | null; created_at: string; media_folders: { name: string } | null }[];
  mediaFolders: { id: number; name: string; file_count: number }[];
  mediaFolderFilter: number | null;
  setMediaFolderFilter: (v: number | null) => void;
  mediaSearch: string;
  setMediaSearch: (v: string) => void;
  mediaLoading: boolean;
  sendingMediaImage: boolean;
  pendingMediaImage: { file_url: string; name: string } | null;
  setPendingMediaImage: (v: { file_url: string; name: string } | null) => void;

  // 添付パネル並び順
  attachPanelOrder: string[];
  setAttachPanelOrder: React.Dispatch<React.SetStateAction<string[]>>;
  attachEditMode: boolean;
  setAttachEditMode: (v: boolean) => void;
  saveAttachPanelOrder: (order: string[]) => void;

  // PDFピッカー
  showPdfPicker: boolean;
  setShowPdfPicker: (v: boolean) => void;
  pdfFiles: { id: number; name: string; file_url: string; file_type: string; mime_type: string; file_size: number; folder_id: number | null; created_at: string; media_folders: { name: string } | null }[];
  pdfFolders: { id: number; name: string; file_count: number }[];
  pdfFolderFilter: number | null;
  setPdfFolderFilter: (v: number | null) => void;
  pdfSearch: string;
  setPdfSearch: (v: string) => void;
  pdfLoading: boolean;
  sendingMediaPdf: boolean;
  pendingMediaPdf: { file_url: string; name: string } | null;
  setPendingMediaPdf: (v: { file_url: string; name: string } | null) => void;

  // 右カラム
  patientTags: PatientTag[];
  patientMark: string;
  patientFields: FieldValue[];
  patientDetail: PatientDetail | null;
  allTags: TagDef[];
  allFieldDefs: FieldDef[];
  showTagPicker: boolean;
  setShowTagPicker: (v: boolean) => void;
  showMarkDropdown: boolean;
  setShowMarkDropdown: (v: boolean) => void;
  markNote: string;
  savingMark: boolean;
  markOptions: MarkOption[];
  userRichMenu: { id?: number; name: string; image_url: string | null; line_rich_menu_id: string; is_default: boolean } | null;
  showMenuPicker: boolean;
  setShowMenuPicker: (v: boolean) => void;
  allRichMenus: { id: number; name: string; image_url: string | null; line_rich_menu_id: string }[];
  changingMenu: boolean;
  isBlocked: boolean;

  // 右カラム表示設定
  visibleSections: Record<string, boolean>;
  setVisibleSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showSectionSettings: boolean;
  setShowSectionSettings: (v: boolean) => void;
  isSectionVisible: (key: string) => boolean;

  // 画像ライトボックス
  lightboxUrl: string | null;
  setLightboxUrl: (v: string | null) => void;

  // モバイルビュー
  mobileView: "list" | "message" | "info";
  setMobileView: (v: "list" | "message" | "info") => void;

  // ハンドラ
  selectPatient: (friend: Friend) => void;
  togglePin: (patientId: string) => void;
  fetchFriends: (opts?: { id?: string; name?: string; offset?: number; append?: boolean; pinIds?: string[]; unreadOnly?: boolean; limit?: number }) => Promise<void>;
  handleListScroll: () => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  loadMoreMessages: () => Promise<void>;
  handleSend: () => Promise<void>;
  openTemplatePicker: () => Promise<void>;
  confirmTemplate: (template: Template) => void;
  sendTemplate: (template: Template) => Promise<void>;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  openMediaPicker: () => Promise<void>;
  handleMediaImageSend: (file: { file_url: string; name: string }) => Promise<void>;
  confirmMediaImage: (file: { file_url: string; name: string }) => void;
  openPdfPicker: () => Promise<void>;
  handleMediaPdfSend: (file: { file_url: string; name: string }) => Promise<void>;
  confirmMediaPdf: (file: { file_url: string; name: string }) => void;
  openActionPicker: () => Promise<void>;
  executeAction: (actionId: number) => Promise<void>;
  handleSendCallForm: () => Promise<void>;
  handleMarkChange: (newMark: string) => Promise<void>;
  handleAddTag: (tagId: number) => Promise<void>;
  handleRemoveTag: (tagId: number) => Promise<void>;
  openMenuPicker: () => Promise<void>;
  changeRichMenu: (menuId: number) => Promise<void>;
  cancelScheduledMessage: (scheduleId: number) => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;

  // 算出値
  filteredFriends: Friend[];
  filteredTemplates: Template[];
  unreadCount: number;
  pinnedFriends: Friend[];
  unpinnedFriends: Friend[];
  hasMore: boolean;
  getMarkColor: (mark: string) => string;
  getMarkLabel: (mark: string) => string;
  currentMark: MarkOption;
  assignedTagIds: number[];
  availableTags: TagDef[];
  shouldShowDate: (i: number) => boolean;
  calcAge: (birthday: string) => number | null;
  formatDateShort: (s: string) => string;

  // PULL_THRESHOLD
  PULL_THRESHOLD: number;
}

const TalkContext = createContext<TalkContextValue | null>(null);

export function TalkProvider({ value, children }: { value: TalkContextValue; children: ReactNode }) {
  return <TalkContext.Provider value={value}>{children}</TalkContext.Provider>;
}

export function useTalkContext(): TalkContextValue {
  const ctx = useContext(TalkContext);
  if (!ctx) throw new Error("useTalkContext must be used within TalkProvider");
  return ctx;
}
