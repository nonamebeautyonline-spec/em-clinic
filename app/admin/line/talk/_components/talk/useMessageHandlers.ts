"use client";

import { useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import type { Friend, MessageLog, Template, MarkOption } from "./types";
import {
  MSG_BATCH,
  formatDateShortUtil, sortByLatestUtil,
  getMarkColorUtil, getMarkLabelUtil,
} from "./constants";
import type { TalkState } from "./useTalkState";

const adminFetcher = (url: string) => fetch(url, { credentials: "include" }).then(r => r.json());

export function useMessageHandlers(
  state: TalkState,
  deps: {
    fetchFriends: (opts?: { id?: string; name?: string; offset?: number; append?: boolean; pinIds?: string[] }) => Promise<void>;
    markAsRead: (patientId: string) => void;
    savePins: (ids: string[]) => void;
  }
) {
  const {
    friends, setFriends,
    friendsLoading,
    searchId, searchName,
    pinnedIds,
    selectedPatient, setSelectedPatient,
    messages, setMessages,
    messagesLoading, setMessagesLoading,
    hasMoreMessages, setHasMoreMessages,
    loadingMoreMessages, setLoadingMoreMessages,
    newMessage, setNewMessage,
    sending, setSending,
    messagesEndRef, msgContainerRef,
    shouldScrollToBottom,
    inputRef,
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
    lineCallUrl,
    imageInputRef,
    selectAbortRef,
    scheduleMode, setScheduleMode,
    scheduledAt, setScheduledAt,
    scheduledMessages, setScheduledMessages,
    cancelingScheduleId, setCancelingScheduleId,
    showActionPicker, setShowActionPicker,
    actionList, setActionList,
    actionSearch,
    executingAction, setExecutingAction,
    showMediaPicker, setShowMediaPicker,
    mediaFiles, setMediaFiles,
    mediaFolders, setMediaFolders,
    mediaFolderFilter, setMediaFolderFilter,
    mediaSearch, setMediaSearch,
    mediaLoading, setMediaLoading,
    sendingMediaImage, setSendingMediaImage,
    showPdfPicker, setShowPdfPicker,
    pdfFiles, setPdfFiles,
    pdfFolders, setPdfFolders,
    pdfFolderFilter, setPdfFolderFilter,
    pdfSearch, setPdfSearch,
    pdfLoading, setPdfLoading,
    sendingMediaPdf, setSendingMediaPdf,
    patientTags, setPatientTags,
    patientMark, setPatientMark,
    patientFields, setPatientFields,
    patientDetail, setPatientDetail,
    allTags, allFieldDefs,
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
    readTimestamps,
    mobileView, setMobileView,
    initialPid,
    selectedPatientRef,
    messagesRef,
    autoSelectedRef,
  } = state;

  const { fetchFriends, markAsRead, savePins } = deps;

  // 予約送信メッセージ一覧を取得
  const fetchScheduledMessages = useCallback(async (patientId: string) => {
    try {
      const res = await fetch(`/api/admin/line/schedule?patient_id=${encodeURIComponent(patientId)}&status=scheduled`, { credentials: "include" });
      const data = await res.json();
      if (data.schedules) setScheduledMessages(data.schedules);
    } catch { /* ignore */ }
  }, [setScheduledMessages]);

  // 患者選択
  const selectPatient = useCallback(async (friend: Friend) => {
    selectAbortRef.current?.abort();
    const ac = new AbortController();
    selectAbortRef.current = ac;

    const url = new URL(window.location.href);
    url.searchParams.set("pid", friend.patient_id);
    window.history.replaceState({}, "", url.toString());

    markAsRead(friend.patient_id);
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
    setIsBlocked(false);
    setScheduleMode(false);
    setScheduledAt("");
    setScheduledMessages([]);
    setMobileView("message");

    shouldScrollToBottom.current = true;

    let bundleData;
    try {
      const res = await fetch(`/api/admin/patients/${encodeURIComponent(friend.patient_id)}/talk-bundle`, { credentials: "include", signal: ac.signal });
      bundleData = await res.json();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      throw e;
    }

    if (friend.line_id) {
      fetch(`/api/admin/line/user-richmenu?patient_id=${encodeURIComponent(friend.patient_id)}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          if (selectedPatientRef.current?.patient_id !== friend.patient_id) return;
          if (d.menu) setUserRichMenu(d.menu);
        })
        .catch(() => {});

      fetch(`/api/admin/line/check-block?patient_id=${encodeURIComponent(friend.patient_id)}`, { credentials: "include" })
        .then(r => r.json())
        .then(async (d) => {
          if (selectedPatientRef.current?.patient_id !== friend.patient_id) return;
          setIsBlocked(!!d.blocked);
          setFriends(prev => prev.map(fr =>
            fr.patient_id === friend.patient_id ? { ...fr, is_blocked: !!d.blocked } : fr
          ));
          if (d.blocked) {
            const res = await fetch(`/api/admin/messages/log?patient_id=${encodeURIComponent(friend.patient_id)}&limit=${MSG_BATCH}`, { credentials: "include" });
            const data = await res.json();
            if (selectedPatientRef.current?.patient_id !== friend.patient_id) return;
            if (data.messages) {
              setMessages([...data.messages].reverse());
            }
          }
        })
        .catch(() => {});
    }

    if (selectedPatientRef.current?.patient_id !== friend.patient_id) return;

    if (bundleData.messages) {
      const reversed = [...bundleData.messages].reverse();
      setMessages(reversed);
      setHasMoreMessages(!!bundleData.hasMore);
    }
    if (bundleData.tags) setPatientTags(bundleData.tags);
    if (bundleData.mark) {
      setPatientMark(bundleData.mark.mark || "none");
      setMarkNote(bundleData.mark.note || "");
    } else {
      setPatientMark("none");
      setMarkNote("");
    }
    if (bundleData.fields) setPatientFields(bundleData.fields);
    if (bundleData.detail?.found) setPatientDetail(bundleData.detail);

    fetchScheduledMessages(friend.patient_id);
    setMessagesLoading(false);
  }, [fetchScheduledMessages, markAsRead, selectAbortRef, setSelectedPatient, setMessages, setMessagesLoading, setShowTagPicker, setShowMarkDropdown, setPatientDetail, setPatientTags, setPatientMark, setMarkNote, setPatientFields, setUserRichMenu, setShowMenuPicker, setIsBlocked, setScheduleMode, setScheduledAt, setScheduledMessages, setMobileView, shouldScrollToBottom, selectedPatientRef, setHasMoreMessages, setFriends]);

  // URLの ?pid= で指定された患者を自動選択
  useEffect(() => {
    if (autoSelectedRef.current || !initialPid) return;
    const target = friends.find(f => f.patient_id === initialPid);
    if (target) {
      autoSelectedRef.current = true;
      selectPatient(target);
      return;
    }
    if (friendsLoading) return;
    autoSelectedRef.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/admin/line/friends-list?id=${encodeURIComponent(initialPid)}&limit=1`, { credentials: "include" });
        const data = await res.json();
        if (data.patients?.[0]) {
          const f = data.patients[0];
          setFriends(prev => {
            if (prev.some(p => p.patient_id === f.patient_id)) return prev;
            return [f, ...prev];
          });
          selectPatient(f);
        }
      } catch { /* ignore */ }
    })();
  }, [friends, friendsLoading, initialPid, selectPatient, autoSelectedRef, setFriends]);

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

      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight;
        }
      });
    } else {
      setHasMoreMessages(false);
    }
    setLoadingMoreMessages(false);
  }, [selectedPatient, loadingMoreMessages, hasMoreMessages, messages.length, setLoadingMoreMessages, shouldScrollToBottom, msgContainerRef, setMessages, setHasMoreMessages]);

  useEffect(() => {
    if (shouldScrollToBottom.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, messagesEndRef, shouldScrollToBottom]);

  // ポーリング: 新着メッセージ
  const pollNewMessages = useCallback(async () => {
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
        const fetched = data.messages as MessageLog[];
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => String(m.id)));
          const newMsgs = fetched.filter(m => !existingIds.has(String(m.id)));
          if (newMsgs.length === 0) return prev;
          shouldScrollToBottom.current = true;
          return [...prev, ...newMsgs.reverse()];
        });
      }
    } catch { /* ignore */ }
  }, [selectedPatientRef, messagesRef, setMessages, shouldScrollToBottom]);

  useEffect(() => {
    const interval = setInterval(pollNewMessages, 5000);
    return () => clearInterval(interval);
  }, [pollNewMessages]);

  // 予約送信キャンセル
  const cancelScheduledMessage = useCallback(async (scheduleId: number) => {
    if (cancelingScheduleId) return;
    setCancelingScheduleId(scheduleId);
    try {
      const res = await fetch(`/api/admin/line/schedule/${scheduleId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.ok) {
        setScheduledMessages(prev => prev.filter(m => m.id !== scheduleId));
      }
    } catch { /* ignore */ }
    setCancelingScheduleId(null);
  }, [cancelingScheduleId, setCancelingScheduleId, setScheduledMessages]);

  // メッセージ送信
  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || sending || !selectedPatient) return;
    if (sendLockRef.current) return;
    sendLockRef.current = true;
    setSending(true);
    try {
      if (scheduleMode && scheduledAt) {
        const res = await fetch("/api/admin/line/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            patient_id: selectedPatient.patient_id,
            message: newMessage,
            scheduled_at: new Date(scheduledAt).toISOString(),
          }),
        });
        const data = await res.json();
        if (data.ok) {
          setNewMessage("");
          if (inputRef.current) inputRef.current.style.height = "auto";
          setScheduleMode(false);
          setScheduledAt("");
          fetchScheduledMessages(selectedPatient.patient_id);
        } else {
          alert(data.error || "予約送信に失敗しました");
        }
      } else {
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
            id: data.messageId ?? Date.now(), content: newMessage, status: "sent",
            message_type: "individual", sent_at: data.sentAt || new Date().toISOString(),
            direction: "outgoing",
          }]);
          setNewMessage("");
          if (inputRef.current) inputRef.current.style.height = "auto";
        }
      }
    } finally {
      sendLockRef.current = false;
      setSending(false);
    }
  }, [newMessage, sending, selectedPatient, sendLockRef, setSending, scheduleMode, scheduledAt, setNewMessage, inputRef, setScheduleMode, setScheduledAt, fetchScheduledMessages, shouldScrollToBottom, setMessages]);

  // テンプレート送信
  const openTemplatePicker = useCallback(async () => {
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
      }
      setTemplatesLoading(false);
    }
  }, [templates.length, setShowAttachPanel, setShowTemplatePicker, setTemplateSearch, setTemplateCategoryFilter, setTemplatesLoading, setTemplates, setTemplateCategories]);

  const confirmTemplate = useCallback((template: Template) => {
    setShowTemplatePicker(false);
    setPendingTemplate(template);
  }, [setShowTemplatePicker, setPendingTemplate]);

  const sendTemplate = useCallback(async (template: Template) => {
    if (sending || !selectedPatient) return;
    if (sendLockRef.current) return;
    sendLockRef.current = true;
    setPendingTemplate(null);
    setSending(true);
    try {
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
          id: data.messageId ?? Date.now(), content: displayContent, status: "sent",
          message_type: "individual", sent_at: data.sentAt || new Date().toISOString(),
          direction: "outgoing",
        }]);
      }
    } finally {
      sendLockRef.current = false;
      setSending(false);
    }
  }, [sending, selectedPatient, sendLockRef, setPendingTemplate, setSending, shouldScrollToBottom, setMessages]);

  // 画像送信
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        id: data.messageId ?? Date.now(), content: data.imageUrl || `[画像] ${file.name}`, status: "sent",
        message_type: "individual", sent_at: data.sentAt || new Date().toISOString(),
        direction: "outgoing",
      }]);
    } else {
      alert((data.message || data.error) || "画像送信に失敗しました");
    }
    setSendingImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }, [selectedPatient, sendingImage, setShowAttachPanel, setSendingImage, shouldScrollToBottom, setMessages, imageInputRef]);

  // メディアピッカー
  const openMediaPicker = useCallback(async () => {
    setShowAttachPanel(false);
    setShowMediaPicker(true);
    setMediaSearch("");
    setMediaFolderFilter(null);
    setMediaLoading(true);
    try {
      const [filesRes, foldersRes] = await Promise.all([
        fetch("/api/admin/line/media?file_type=image", { credentials: "include" }),
        fetch("/api/admin/line/media-folders", { credentials: "include" }),
      ]);
      const filesData = await filesRes.json();
      const foldersData = await foldersRes.json();
      if (filesData.files) setMediaFiles(filesData.files);
      if (foldersData.folders) setMediaFolders(foldersData.folders);
    } catch {
      // エラー時は空表示
    }
    setMediaLoading(false);
  }, [setShowAttachPanel, setShowMediaPicker, setMediaSearch, setMediaFolderFilter, setMediaLoading, setMediaFiles, setMediaFolders]);

  // 添付パネル並び順保存
  const saveAttachPanelOrder = useCallback(async (order: string[]) => {
    state.setAttachPanelOrder(order);
    try {
      await fetch("/api/admin/line/attach-panel-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ order }),
      });
    } catch { /* ignore */ }
  }, [state]);

  // PDFピッカー
  const openPdfPicker = useCallback(async () => {
    setShowAttachPanel(false);
    setShowPdfPicker(true);
    setPdfSearch("");
    setPdfFolderFilter(null);
    setPdfLoading(true);
    try {
      const [filesRes, foldersRes] = await Promise.all([
        fetch("/api/admin/line/media?file_type=pdf", { credentials: "include" }),
        fetch("/api/admin/line/media-folders", { credentials: "include" }),
      ]);
      const filesData = await filesRes.json();
      const foldersData = await foldersRes.json();
      if (filesData.files) setPdfFiles(filesData.files);
      if (foldersData.folders) setPdfFolders(foldersData.folders);
    } catch {
      // エラー時は空表示
    }
    setPdfLoading(false);
  }, [setShowAttachPanel, setShowPdfPicker, setPdfSearch, setPdfFolderFilter, setPdfLoading, setPdfFiles, setPdfFolders]);

  const confirmMediaPdf = useCallback((file: { file_url: string; name: string }) => {
    setShowPdfPicker(false);
    state.setPendingMediaPdf(file);
  }, [setShowPdfPicker, state]);

  const handleMediaPdfSend = useCallback(async (file: { file_url: string; name: string }) => {
    if (!selectedPatient || sendingMediaPdf) return;
    setSendingMediaPdf(true);
    try {
      const res = await fetch("/api/admin/line/send-media-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patient_id: selectedPatient.patient_id, pdf_url: file.file_url, pdf_name: file.name }),
      });
      const data = await res.json();
      if (data.ok) {
        shouldScrollToBottom.current = true;
        setMessages(prev => [...prev, {
          id: data.messageId ?? Date.now(), content: `[PDF] ${file.name}`, status: "sent",
          message_type: "individual", sent_at: data.sentAt || new Date().toISOString(),
          direction: "outgoing",
        }]);
        state.setPendingMediaPdf(null);
      } else {
        alert((data.message || data.error) || "PDF送信に失敗しました");
      }
    } catch {
      alert("PDF送信に失敗しました");
    }
    setSendingMediaPdf(false);
  }, [selectedPatient, sendingMediaPdf, setSendingMediaPdf, shouldScrollToBottom, setMessages, state]);

  const confirmMediaImage = useCallback((file: { file_url: string; name: string }) => {
    setShowMediaPicker(false);
    state.setPendingMediaImage(file);
  }, [setShowMediaPicker, state]);

  const handleMediaImageSend = useCallback(async (file: { file_url: string; name: string }) => {
    if (!selectedPatient || sendingMediaImage) return;
    setSendingMediaImage(true);
    try {
      const res = await fetch("/api/admin/line/send-media-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patient_id: selectedPatient.patient_id, image_url: file.file_url }),
      });
      const data = await res.json();
      if (data.ok) {
        shouldScrollToBottom.current = true;
        setMessages(prev => [...prev, {
          id: data.messageId ?? Date.now(), content: data.imageUrl || `[画像] ${file.name}`, status: "sent",
          message_type: "individual", sent_at: data.sentAt || new Date().toISOString(),
          direction: "outgoing",
        }]);
        state.setPendingMediaImage(null);
      } else {
        alert((data.message || data.error) || "画像送信に失敗しました");
      }
    } catch {
      alert("画像送信に失敗しました");
    }
    setSendingMediaImage(false);
  }, [selectedPatient, sendingMediaImage, setSendingMediaImage, shouldScrollToBottom, setMessages, state]);

  // アクション
  const openActionPicker = useCallback(async () => {
    setShowAttachPanel(false);
    setShowActionPicker(true);
    state.setActionSearch("");
    const res = await fetch("/api/admin/line/actions", { credentials: "include" });
    const data = await res.json();
    if (data.actions) setActionList(data.actions);
  }, [setShowAttachPanel, setShowActionPicker, setActionList, state]);

  const executeAction = useCallback(async (actionId: number) => {
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
        selectPatient(selectedPatient);
      } else {
        const failed = data.results?.filter((r: { success: boolean }) => !r.success).length || 0;
        alert(`アクション実行完了（${failed}件のエラーあり）`);
      }
    } catch {
      alert("アクション実行に失敗しました");
    }
    setExecutingAction(false);
  }, [selectedPatient, executingAction, setExecutingAction, setShowActionPicker, selectPatient]);

  // 通話フォーム送信
  const handleSendCallForm = useCallback(async () => {
    if (!selectedPatient || sendingCall) return;
    if (!lineCallUrl) {
      alert("LINEコールURLが未設定です。設定画面の「診察設定」からURLを登録してください。");
      return;
    }
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
                          type: "text",
                          text: "\u{1F4DE}",
                          size: "lg",
                          align: "center",
                        },
                      ],
                      width: "36px",
                      height: "36px",
                      backgroundColor: "#EBF5FF",
                      cornerRadius: "18px",
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
                    label: "通話を開始する",
                    uri: lineCallUrl,
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
        id: data.messageId ?? Date.now(), content: "[通話フォーム]", status: "sent",
        message_type: "individual", sent_at: data.sentAt || new Date().toISOString(),
        direction: "outgoing",
      }]);
    } else {
      alert((data.message || data.error) || "通話フォームの送信に失敗しました");
    }
    setSendingCall(false);
  }, [selectedPatient, sendingCall, lineCallUrl, setSendingCall, setShowCallConfirm, shouldScrollToBottom, setMessages]);

  // テンプレートフィルタ
  const filteredTemplates = useMemo(() => templates.filter(t => {
    if (templateCategoryFilter !== null && (t.category || "未分類") !== templateCategoryFilter) return false;
    if (templateSearch) {
      const q = templateSearch.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q);
    }
    return true;
  }), [templates, templateCategoryFilter, templateSearch]);

  // 対応マーク更新
  const handleMarkChange = useCallback(async (newMark: string) => {
    if (!selectedPatient || savingMark) return;
    setSavingMark(true);
    setPatientMark(newMark);
    setShowMarkDropdown(false);
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
  }, [selectedPatient, savingMark, setSavingMark, setPatientMark, setShowMarkDropdown, setFriends, markNote]);

  // タグ
  const handleAddTag = useCallback(async (tagId: number) => {
    if (!selectedPatient) return;
    await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/tags`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "include", body: JSON.stringify({ tag_id: tagId }),
    });
    const res = await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/tags`, { credentials: "include" });
    const data = await res.json();
    if (data.tags) setPatientTags(data.tags);
    setShowTagPicker(false);
  }, [selectedPatient, setPatientTags, setShowTagPicker]);

  const handleRemoveTag = useCallback(async (tagId: number) => {
    if (!selectedPatient) return;
    await fetch(`/api/admin/patients/${encodeURIComponent(selectedPatient.patient_id)}/tags?tag_id=${tagId}`, {
      method: "DELETE", credentials: "include",
    });
    setPatientTags(prev => prev.filter(t => t.tag_id !== tagId));
  }, [selectedPatient, setPatientTags]);

  // リッチメニュー
  const openMenuPicker = useCallback(async () => {
    if (!selectedPatient?.line_id) return;
    setShowMenuPicker(true);
    if (allRichMenus.length === 0) {
      const res = await fetch("/api/admin/line/rich-menus", { credentials: "include" });
      const data = await res.json();
      if (data.menus) {
        setAllRichMenus(data.menus.filter((m: { line_rich_menu_id: string | null; is_active: boolean }) => m.line_rich_menu_id && m.is_active));
      }
    }
  }, [selectedPatient, allRichMenus.length, setShowMenuPicker, setAllRichMenus]);

  const changeRichMenu = useCallback(async (menuId: number) => {
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
  }, [selectedPatient, changingMenu, setChangingMenu, setUserRichMenu, setShowMenuPicker]);

  // ユーティリティ
  const formatDateShort = formatDateShortUtil;
  const shouldShowDate = useCallback((i: number) => {
    if (i === 0) return true;
    return new Date(messages[i - 1].sent_at).toDateString() !== new Date(messages[i].sent_at).toDateString();
  }, [messages]);

  const handleKeyDown = useCallback((_e: React.KeyboardEvent<HTMLTextAreaElement>) => {}, []);

  const calcAge = useCallback((birthday: string) => {
    try {
      const bd = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - bd.getFullYear();
      if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--;
      return age;
    } catch { return null; }
  }, []);

  // 算出値
  const filteredFriends = friends;
  // 未読カウントはサイドバーと同じAPIから取得（ページネーション範囲外の未読も正確にカウント）
  const { data: unreadData } = useSWR<{ count: number }>(
    "/api/admin/unread-count",
    adminFetcher,
    { refreshInterval: 15000, revalidateOnFocus: true },
  );
  const unreadCount = unreadData?.count ?? 0;

  // 孤立ピンマイグレーション
  const allPatientIds = useMemo(() => new Set(friends.map(f => f.patient_id)), [friends]);
  useEffect(() => {
    if (friends.length === 0 || pinnedIds.length === 0) return;
    const orphanLineIds = pinnedIds.filter(id => id.startsWith("LINE_") && !allPatientIds.has(id));
    if (orphanLineIds.length === 0) return;

    const lineIdSuffixMap = new Map<string, string>();
    for (const pin of orphanLineIds) {
      lineIdSuffixMap.set(pin.replace("LINE_", ""), pin);
    }
    const migrated = new Map<string, string>();
    for (const f of friends) {
      if (!f.line_id) continue;
      for (const [suffix, pin] of lineIdSuffixMap) {
        if (f.line_id.endsWith(suffix)) {
          migrated.set(pin, f.patient_id);
          lineIdSuffixMap.delete(suffix);
          break;
        }
      }
    }
    if (migrated.size === 0) return;

    let newPins = pinnedIds.map(id => migrated.get(id) || id);
    newPins = [...new Set(newPins)];

    if (JSON.stringify(newPins) !== JSON.stringify(pinnedIds)) {
      console.log(`[pins] マイグレーション: ${migrated.size}件変換`);
      savePins(newPins);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friends.length, pinnedIds.length]);

  const isSearching = !!(searchId || searchName);
  const pinnedFriends = useMemo(() => isSearching ? [] : filteredFriends.filter(f => pinnedIds.includes(f.patient_id)).sort(sortByLatestUtil), [filteredFriends, pinnedIds, isSearching]);
  const unpinnedFriends = useMemo(() => isSearching ? filteredFriends : filteredFriends.filter(f => !pinnedIds.includes(f.patient_id)), [filteredFriends, pinnedIds, isSearching]);
  const hasMore = state.serverHasMore;

  const getMarkColor = useCallback((mark: string) => getMarkColorUtil(markOptions, mark), [markOptions]);
  const getMarkLabel = useCallback((mark: string) => getMarkLabelUtil(markOptions, mark), [markOptions]);
  const currentMark = markOptions.find(m => m.value === patientMark) || markOptions[0];

  const assignedTagIds = patientTags.map(t => t.tag_id);
  const availableTags = allTags.filter(t => !assignedTagIds.includes(t.id));

  return {
    selectPatient,
    loadMoreMessages,
    handleSend,
    openTemplatePicker,
    confirmTemplate,
    sendTemplate,
    handleImageSelect,
    openMediaPicker,
    confirmMediaImage,
    handleMediaImageSend,
    openPdfPicker,
    confirmMediaPdf,
    handleMediaPdfSend,
    saveAttachPanelOrder,
    openActionPicker,
    executeAction,
    handleSendCallForm,
    handleMarkChange,
    handleAddTag,
    handleRemoveTag,
    openMenuPicker,
    changeRichMenu,
    cancelScheduledMessage,
    handleKeyDown,
    filteredFriends,
    filteredTemplates,
    unreadCount,
    pinnedFriends,
    unpinnedFriends,
    hasMore,
    getMarkColor,
    getMarkLabel,
    currentMark,
    assignedTagIds,
    availableTags,
    shouldShowDate,
    calcAge,
    formatDateShort,
  };
}
