"use client";

import type { TalkClientProps } from "./talk/types";
import type { TalkContextValue } from "./talk/TalkContext";
import { TalkProvider } from "./talk/TalkContext";
import { useTalkState } from "./talk/useTalkState";
import { useFriendsList } from "./talk/useFriendsList";
import { useMessageHandlers } from "./talk/useMessageHandlers";
import FriendListColumn from "./talk/FriendListColumn";
import MessageColumn from "./talk/MessageColumn";
import PatientInfoColumn from "./talk/PatientInfoColumn";
import TalkModals from "./talk/TalkModals";

export default function TalkClient(props: TalkClientProps) {
  const state = useTalkState(props);
  const friendsList = useFriendsList(state);
  const handlers = useMessageHandlers(state, {
    fetchFriends: friendsList.fetchFriends,
    markAsRead: friendsList.markAsRead,
    savePins: friendsList.savePins,
  });

  const ctxValue: TalkContextValue = {
    // 左カラム state
    friends: state.friends,
    setFriends: state.setFriends,
    friendsLoading: state.friendsLoading,
    searchId: state.searchId,
    setSearchId: state.setSearchId,
    searchName: state.searchName,
    setSearchName: state.setSearchName,
    searchMessage: state.searchMessage,
    setSearchMessage: state.setSearchMessage,
    serverHasMore: state.serverHasMore,
    friendsSearching: state.friendsSearching,
    setFriendsSearching: state.setFriendsSearching,
    friendsOffsetRef: state.friendsOffsetRef,
    msgSearchResults: state.msgSearchResults,
    msgSearching: state.msgSearching,
    pinnedIds: state.pinnedIds,
    listRef: state.listRef,
    pullRefreshing: state.pullRefreshing,
    pullDistance: state.pullDistance,
    showUnreadOnly: state.showUnreadOnly,
    setShowUnreadOnly: state.setShowUnreadOnly,
    readTimestamps: state.readTimestamps,

    // 中央カラム state
    selectedPatient: state.selectedPatient,
    messages: state.messages,
    setMessages: state.setMessages,
    messagesLoading: state.messagesLoading,
    hasMoreMessages: state.hasMoreMessages,
    loadingMoreMessages: state.loadingMoreMessages,
    newMessage: state.newMessage,
    setNewMessage: state.setNewMessage,
    sending: state.sending,
    messagesEndRef: state.messagesEndRef,
    msgContainerRef: state.msgContainerRef,
    shouldScrollToBottom: state.shouldScrollToBottom,
    inputRef: state.inputRef,

    // 添付パネル
    showAttachPanel: state.showAttachPanel,
    setShowAttachPanel: state.setShowAttachPanel,
    showTemplatePicker: state.showTemplatePicker,
    setShowTemplatePicker: state.setShowTemplatePicker,
    templates: state.templates,
    templateCategories: state.templateCategories,
    templateCategoryFilter: state.templateCategoryFilter,
    setTemplateCategoryFilter: state.setTemplateCategoryFilter,
    templateSearch: state.templateSearch,
    setTemplateSearch: state.setTemplateSearch,
    templatesLoading: state.templatesLoading,
    sendingImage: state.sendingImage,
    pendingTemplate: state.pendingTemplate,
    setPendingTemplate: state.setPendingTemplate,
    showCallConfirm: state.showCallConfirm,
    setShowCallConfirm: state.setShowCallConfirm,
    sendingCall: state.sendingCall,
    lineCallUrl: state.lineCallUrl,
    lineCallEnabled: state.lineCallEnabled,
    imageInputRef: state.imageInputRef,

    // 予約送信
    scheduleMode: state.scheduleMode,
    setScheduleMode: state.setScheduleMode,
    scheduledAt: state.scheduledAt,
    setScheduledAt: state.setScheduledAt,
    scheduledMessages: state.scheduledMessages,
    cancelingScheduleId: state.cancelingScheduleId,

    // アクション
    showActionPicker: state.showActionPicker,
    setShowActionPicker: state.setShowActionPicker,
    actionList: state.actionList,
    actionSearch: state.actionSearch,
    setActionSearch: state.setActionSearch,
    executingAction: state.executingAction,

    // メディアピッカー
    showMediaPicker: state.showMediaPicker,
    setShowMediaPicker: state.setShowMediaPicker,
    mediaFiles: state.mediaFiles,
    mediaFolders: state.mediaFolders,
    mediaFolderFilter: state.mediaFolderFilter,
    setMediaFolderFilter: state.setMediaFolderFilter,
    mediaSearch: state.mediaSearch,
    setMediaSearch: state.setMediaSearch,
    mediaLoading: state.mediaLoading,
    sendingMediaImage: state.sendingMediaImage,
    pendingMediaImage: state.pendingMediaImage,
    setPendingMediaImage: state.setPendingMediaImage,

    // 添付パネル並び順
    attachPanelOrder: state.attachPanelOrder,
    setAttachPanelOrder: state.setAttachPanelOrder,
    attachEditMode: state.attachEditMode,
    setAttachEditMode: state.setAttachEditMode,
    saveAttachPanelOrder: handlers.saveAttachPanelOrder,

    // PDFピッカー
    showPdfPicker: state.showPdfPicker,
    setShowPdfPicker: state.setShowPdfPicker,
    pdfFiles: state.pdfFiles,
    pdfFolders: state.pdfFolders,
    pdfFolderFilter: state.pdfFolderFilter,
    setPdfFolderFilter: state.setPdfFolderFilter,
    pdfSearch: state.pdfSearch,
    setPdfSearch: state.setPdfSearch,
    pdfLoading: state.pdfLoading,
    sendingMediaPdf: state.sendingMediaPdf,
    pendingMediaPdf: state.pendingMediaPdf,
    setPendingMediaPdf: state.setPendingMediaPdf,

    // 右カラム
    patientTags: state.patientTags,
    patientMark: state.patientMark,
    patientFields: state.patientFields,
    patientDetail: state.patientDetail,
    allTags: state.allTags,
    allFieldDefs: state.allFieldDefs,
    showTagPicker: state.showTagPicker,
    setShowTagPicker: state.setShowTagPicker,
    showMarkDropdown: state.showMarkDropdown,
    setShowMarkDropdown: state.setShowMarkDropdown,
    markNote: state.markNote,
    savingMark: state.savingMark,
    markOptions: state.markOptions,
    userRichMenu: state.userRichMenu,
    showMenuPicker: state.showMenuPicker,
    setShowMenuPicker: state.setShowMenuPicker,
    allRichMenus: state.allRichMenus,
    changingMenu: state.changingMenu,
    isBlocked: state.isBlocked,

    // 右カラム表示設定
    visibleSections: state.visibleSections,
    setVisibleSections: state.setVisibleSections,
    showSectionSettings: state.showSectionSettings,
    setShowSectionSettings: state.setShowSectionSettings,
    isSectionVisible: state.isSectionVisible,

    // 画像ライトボックス
    lightboxUrl: state.lightboxUrl,
    setLightboxUrl: state.setLightboxUrl,

    // モバイルビュー
    mobileView: state.mobileView,
    setMobileView: state.setMobileView,

    // friendsList ハンドラ
    fetchFriends: friendsList.fetchFriends,
    togglePin: friendsList.togglePin,
    handleListScroll: friendsList.handleListScroll,
    handleTouchStart: friendsList.handleTouchStart,
    handleTouchMove: friendsList.handleTouchMove,
    handleTouchEnd: friendsList.handleTouchEnd,
    PULL_THRESHOLD: friendsList.PULL_THRESHOLD,

    // messageHandlers ハンドラ
    selectPatient: handlers.selectPatient,
    loadMoreMessages: handlers.loadMoreMessages,
    handleSend: handlers.handleSend,
    openTemplatePicker: handlers.openTemplatePicker,
    confirmTemplate: handlers.confirmTemplate,
    sendTemplate: handlers.sendTemplate,
    handleImageSelect: handlers.handleImageSelect,
    openMediaPicker: handlers.openMediaPicker,
    confirmMediaImage: handlers.confirmMediaImage,
    handleMediaImageSend: handlers.handleMediaImageSend,
    openPdfPicker: handlers.openPdfPicker,
    confirmMediaPdf: handlers.confirmMediaPdf,
    handleMediaPdfSend: handlers.handleMediaPdfSend,
    openActionPicker: handlers.openActionPicker,
    executeAction: handlers.executeAction,
    handleSendCallForm: handlers.handleSendCallForm,
    handleMarkChange: handlers.handleMarkChange,
    handleAddTag: handlers.handleAddTag,
    handleRemoveTag: handlers.handleRemoveTag,
    openMenuPicker: handlers.openMenuPicker,
    changeRichMenu: handlers.changeRichMenu,
    cancelScheduledMessage: handlers.cancelScheduledMessage,
    handleKeyDown: handlers.handleKeyDown,

    // 算出値
    filteredFriends: handlers.filteredFriends,
    filteredTemplates: handlers.filteredTemplates,
    unreadCount: handlers.unreadCount,
    pinnedFriends: handlers.pinnedFriends,
    unpinnedFriends: handlers.unpinnedFriends,
    hasMore: handlers.hasMore,
    getMarkColor: handlers.getMarkColor,
    getMarkLabel: handlers.getMarkLabel,
    currentMark: handlers.currentMark,
    assignedTagIds: handlers.assignedTagIds,
    availableTags: handlers.availableTags,
    shouldShowDate: handlers.shouldShowDate,
    calcAge: handlers.calcAge,
    formatDateShort: handlers.formatDateShort,
  };

  return (
    <TalkProvider value={ctxValue}>
      <div className="h-full flex flex-col md:flex-row overflow-hidden bg-[#f8f9fb]">
        {/* モバイルヘッダータブ */}
        <div className="md:hidden flex-shrink-0 bg-white border-b border-gray-200 flex sticky top-0 z-20">
          <button
            onClick={() => { window.dispatchEvent(new Event("open-mobile-menu")); }}
            className="flex-shrink-0 px-2.5 flex items-center text-gray-500 border-r border-gray-200"
            aria-label="管理メニューに戻る"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
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
            const isActive = state.mobileView === tab.key;
            const isDisabled = tab.key !== "list" && !state.selectedPatient;
            return (
              <button
                key={tab.key}
                onClick={() => !isDisabled && state.setMobileView(tab.key)}
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

        {/* 3カラムレイアウト */}
        <FriendListColumn />
        <MessageColumn />
        <PatientInfoColumn />
        <TalkModals />
      </div>
    </TalkProvider>
  );
}
