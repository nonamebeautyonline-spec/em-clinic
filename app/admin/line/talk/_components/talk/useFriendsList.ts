"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Friend } from "./types";
import { PAGE_SIZE, MAX_PINS } from "./constants";
import type { TalkState } from "./useTalkState";

export function useFriendsList(state: TalkState) {
  const {
    initialFriends, initialPinnedIds,
    friends, setFriends,
    friendsLoading, setFriendsLoading,
    searchId, searchName,
    serverHasMore, setServerHasMore,
    friendsSearching, setFriendsSearching,
    friendsSearchTimer,
    friendsOffsetRef,
    msgSearchResults, setMsgSearchResults,
    msgSearching, setMsgSearching,
    msgSearchTimer,
    searchMessage,
    pinnedIds, setPinnedIds,
    pinnedIdsRef,
    pinsReadyRef,
    listRef,
    pullRefreshing, setPullRefreshing,
    pullDistance, setPullDistance,
    touchStartY,
    isPulling,
    readTimestamps, setReadTimestamps,
    visibleSections, setVisibleSections,
    scrollTimerRef,
    showUnreadOnly,
  } = state;

  const PULL_THRESHOLD = 60;
  const FRIENDS_CACHE_KEY = "friends-list-cache";

  // ピン保存
  const savePins = useCallback((ids: string[]) => {
    setPinnedIds(ids);
    pinnedIdsRef.current = ids;
    fetch("/api/admin/pins", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pins: ids }),
    }).catch(() => {});
  }, [setPinnedIds, pinnedIdsRef]);

  // 既読マーク
  const markAsRead = useCallback((patientId: string) => {
    const now = new Date().toISOString();
    setReadTimestamps(prev => ({ ...prev, [patientId]: now }));
    fetch("/api/admin/chat-reads", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: patientId }),
    }).catch(() => {});
  }, [setReadTimestamps]);

  // ピン切替
  const togglePin = useCallback((patientId: string) => {
    if (pinnedIds.includes(patientId)) {
      savePins(pinnedIds.filter((id: string) => id !== patientId));
    } else {
      if (pinnedIds.length >= MAX_PINS) return;
      savePins([...pinnedIds, patientId]);
    }
  }, [pinnedIds, savePins]);

  // 友達一覧取得（引数省略時は現在のstate値を使用 → ポーリングからの呼び出しが安全）
  const fetchFriends = useCallback(async (opts?: { id?: string; name?: string; offset?: number; append?: boolean; pinIds?: string[]; unreadOnly?: boolean; limit?: number }) => {
    const id = opts?.id ?? searchId;
    const name = opts?.name ?? searchName;
    const offset = opts?.offset ?? 0;
    const append = opts?.append ?? false;
    const pinIds = opts?.pinIds ?? pinnedIdsRef.current;
    const unreadOnlyParam = opts?.unreadOnly ?? showUnreadOnly;
    const fetchLimit = opts?.limit ?? PAGE_SIZE;
    try {
      const params = new URLSearchParams();
      if (id) params.set("id", id);
      if (name) params.set("name", name);
      params.set("offset", String(offset));
      params.set("limit", String(fetchLimit));
      if (pinIds && pinIds.length > 0 && !id && !name && offset === 0) {
        params.set("pin_ids", pinIds.join(","));
      }
      if (unreadOnlyParam) params.set("unread_only", "true");
      const res = await fetch(`/api/admin/line/friends-list?${params}`, { credentials: "include" });
      const data = await res.json();
      if (data.patients) {
        if (append) {
          setFriends(prev => {
            const ids = new Set(prev.map(f => f.patient_id));
            return [...prev, ...data.patients.filter((f: Friend) => !ids.has(f.patient_id))];
          });
        } else {
          setFriends(data.patients);
          friendsOffsetRef.current = 0;
          if (!id && !name) {
            try { sessionStorage.setItem(FRIENDS_CACHE_KEY, JSON.stringify(data.patients)); } catch { /* quota */ }
          }
        }
        friendsOffsetRef.current = offset + data.patients.length;
        setServerHasMore(!!data.hasMore);
      }
    } catch { /* ignore */ }
    setFriendsLoading(false);
    setFriendsSearching(false);
  }, [searchId, searchName, showUnreadOnly, setFriends, friendsOffsetRef, setServerHasMore, setFriendsLoading, setFriendsSearching, pinnedIdsRef]);
  const fetchFriendsRef = useRef(fetchFriends);
  fetchFriendsRef.current = fetchFriends;

  // キャッシュ復元
  const restoreFriendsCache = useCallback(() => {
    if (initialFriends && initialFriends.length > 0) return;
    try {
      const cached = sessionStorage.getItem(FRIENDS_CACHE_KEY);
      if (cached) {
        setFriends(JSON.parse(cached));
        setFriendsLoading(false);
      }
    } catch { /* ignore */ }
  }, [initialFriends, setFriends, setFriendsLoading]);

  useEffect(() => {
    restoreFriendsCache();
  }, [restoreFriendsCache]);

  // ピン初期化（DB）& 既読タイムスタンプ初期化（DB）& 右カラム表示設定
  const initPinsAndReads = useCallback(async () => {
    try {
      const [pinsRes, readsRes, colRes] = await Promise.all([
        fetch("/api/admin/pins", { credentials: "include" }),
        fetch("/api/admin/chat-reads", { credentials: "include" }),
        fetch("/api/admin/line/column-settings", { credentials: "include" }),
      ]);
      const pinsData = await pinsRes.json();
      let resolvedPins: string[] = [];
      if (Array.isArray(pinsData.pins) && pinsData.pins.length > 0) {
        resolvedPins = pinsData.pins;
      } else {
        const local = localStorage.getItem("talk_pinned_patients");
        if (local) {
          const ids = JSON.parse(local) as string[];
          if (ids.length > 0) {
            resolvedPins = ids;
            fetch("/api/admin/pins", {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pins: ids }),
            }).then(() => localStorage.removeItem("talk_pinned_patients")).catch(() => {});
          }
        }
      }
      if (resolvedPins.length > 0) {
        setPinnedIds(resolvedPins);
        pinnedIdsRef.current = resolvedPins;
      }
      const readsData = await readsRes.json();
      if (readsData.reads) setReadTimestamps(readsData.reads);
      const colData = await colRes.json();
      if (colData.sections) setVisibleSections(colData.sections);
    } catch { /* ignore */ }
    // ピン取得完了 → fetchFriends経由で友達一覧を取得（初期化時は検索/フィルタなし）
    pinsReadyRef.current = true;
    await fetchFriendsRef.current({ id: "", name: "", unreadOnly: false });
  }, [setPinnedIds, pinnedIdsRef, setReadTimestamps, setVisibleSections, pinsReadyRef]);

  useEffect(() => {
    if (initialPinnedIds !== undefined) {
      pinsReadyRef.current = true;
      setFriendsLoading(false);
      return;
    }
    initPinsAndReads();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initPinsAndReads]);

  // プルダウンリフレッシュ
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = listRef.current;
    if (!el || el.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, [listRef, touchStartY, isPulling]);

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
  }, [pullRefreshing, listRef, isPulling, touchStartY, setPullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= PULL_THRESHOLD) {
      setPullRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      await fetchFriends({ id: searchId, name: searchName, unreadOnly: showUnreadOnly });
      setPullRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, fetchFriends, searchId, searchName, showUnreadOnly, isPulling, setPullRefreshing, setPullDistance]);

  // 無限スクロール
  const handleListScroll = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const el = listRef.current;
      if (!el) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100 && serverHasMore && !friendsSearching) {
        setFriendsSearching(true);
        fetchFriends({ id: searchId, name: searchName, offset: friendsOffsetRef.current, append: true, unreadOnly: showUnreadOnly });
      }
    }, 150);
  }, [serverHasMore, friendsSearching, fetchFriends, searchId, searchName, showUnreadOnly, listRef, scrollTimerRef, friendsOffsetRef, setFriendsSearching]);

  // 検索デバウンス（テキスト検索は300ms、showUnreadOnly切替は即座に取得）
  const isDebouncingRef = useRef(false);
  const prevUnreadOnlyRef = useRef(showUnreadOnly);
  const prevSearchIdRef = useRef(searchId);
  const prevSearchNameRef = useRef(searchName);
  useEffect(() => {
    if (!pinsReadyRef.current) return;
    if (friendsSearchTimer.current) clearTimeout(friendsSearchTimer.current);

    // showUnreadOnly切替はデバウンスなしで即座にfetch（60件→5件フラッシュ防止）
    const unreadChanged = prevUnreadOnlyRef.current !== showUnreadOnly;
    const textChanged = prevSearchIdRef.current !== searchId || prevSearchNameRef.current !== searchName;
    prevUnreadOnlyRef.current = showUnreadOnly;
    prevSearchIdRef.current = searchId;
    prevSearchNameRef.current = searchName;

    if (unreadChanged && !textChanged) {
      // チェックボックス切替 → 即座にfetch（リストをクリアしてローディング表示）
      setFriends([]);
      setFriendsSearching(true);
      fetchFriends({ id: searchId, name: searchName, unreadOnly: showUnreadOnly });
      return;
    }

    // テキスト検索 → 300msデバウンス
    isDebouncingRef.current = true;
    setFriendsSearching(true);
    friendsSearchTimer.current = setTimeout(() => {
      isDebouncingRef.current = false;
      fetchFriends({ id: searchId, name: searchName, unreadOnly: showUnreadOnly });
    }, 300);
    return () => {
      if (friendsSearchTimer.current) clearTimeout(friendsSearchTimer.current);
      isDebouncingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- pinnedIdsの変更で再検索は不要
  }, [searchId, searchName, showUnreadOnly, fetchFriends]);

  // メッセージ検索
  const executeMessageSearch = useCallback(async (q: string) => {
    try {
      const res = await fetch(`/api/admin/messages/log?search=${encodeURIComponent(q)}&limit=30`, { credentials: "include" });
      const data = await res.json();
      if (data.messages) {
        setMsgSearchResults(data.messages);
      }
    } catch { /* ignore */ }
    setMsgSearching(false);
  }, [setMsgSearchResults, setMsgSearching]);

  const clearMessageSearch = useCallback(() => {
    setMsgSearchResults([]);
    setMsgSearching(false);
  }, [setMsgSearchResults, setMsgSearching]);

  useEffect(() => {
    if (msgSearchTimer.current) clearTimeout(msgSearchTimer.current);
    const q = searchMessage.trim();
    if (!q) {
      clearMessageSearch();
      return;
    }
    setMsgSearching(true);
    msgSearchTimer.current = setTimeout(() => { executeMessageSearch(q); }, 400);
    return () => { if (msgSearchTimer.current) clearTimeout(msgSearchTimer.current); };
  }, [searchMessage, executeMessageSearch, clearMessageSearch, setMsgSearching, msgSearchTimer]);

  // 友だちリストポーリング（fetchFriends一元化 + デバウンス中スキップ）
  useEffect(() => {
    const ac = new AbortController();

    const poll = async () => {
      // デバウンス中はスキップ（デバウンス側の結果を優先）
      if (isDebouncingRef.current) return;

      // ピン同期（他タブ/他ユーザーからの変更を検知）
      try {
        const pinsRes = await fetch("/api/admin/pins", { credentials: "include", signal: ac.signal });
        const pinsData = await pinsRes.json();
        if (Array.isArray(pinsData.pins)) {
          const newPins: string[] = pinsData.pins;
          if (JSON.stringify(newPins) !== JSON.stringify(pinnedIdsRef.current)) {
            setPinnedIds(newPins);
            pinnedIdsRef.current = newPins;
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
      if (ac.signal.aborted) return;

      // 友だちリスト更新（fetchFriends再利用 — 引数なし=現在のstate値を使用）
      // limit: 現在表示中の件数以上を取得（リスト縮小を防止）
      await fetchFriendsRef.current({ limit: Math.max(PAGE_SIZE, friendsOffsetRef.current) });
    };

    const interval = setInterval(poll, 15000);
    return () => { clearInterval(interval); ac.abort(); };
  // fetchFriendsRef経由で最新クロージャを参照するため、deps は安定したsetterのみ
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPinnedIds, pinnedIdsRef, friendsOffsetRef]);

  return {
    fetchFriends,
    fetchFriendsRef,
    savePins,
    markAsRead,
    togglePin,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleListScroll,
    PULL_THRESHOLD,
    FRIENDS_CACHE_KEY,
  };
}
