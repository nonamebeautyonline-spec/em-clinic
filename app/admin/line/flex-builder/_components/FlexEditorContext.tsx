"use client";

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { setAtPath, removeAtPath, insertAtPath, moveInArray } from "@/lib/flex-editor/path-utils";

// ── 型定義 ──

type FlexObj = Record<string, unknown>;

export interface FlexEditorState {
  flexData: FlexObj | null;
  selectedPath: string | null;
  history: FlexObj[];
  historyIndex: number;
  jsonMode: boolean;
}

export type FlexEditorAction =
  | { type: "SET_DATA"; data: FlexObj | null; pushHistory?: boolean }
  | { type: "SELECT"; path: string | null }
  | { type: "UPDATE_AT_PATH"; path: string; value: unknown }
  | { type: "REMOVE_AT_PATH"; path: string }
  | { type: "INSERT"; arrayPath: string; index: number; element: unknown }
  | { type: "MOVE"; arrayPath: string; fromIndex: number; toIndex: number }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "TOGGLE_JSON" };

const MAX_HISTORY = 50;

// ── 初期状態 ──

const initialState: FlexEditorState = {
  flexData: null,
  selectedPath: null,
  history: [],
  historyIndex: -1,
  jsonMode: false,
};

// ── Reducer ──

function pushToHistory(state: FlexEditorState, data: FlexObj): Pick<FlexEditorState, "history" | "historyIndex"> {
  // 現在位置以降の履歴を切り捨てて新しいエントリを追加
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(data);
  if (newHistory.length > MAX_HISTORY) newHistory.shift();
  return { history: newHistory, historyIndex: newHistory.length - 1 };
}

function flexEditorReducer(state: FlexEditorState, action: FlexEditorAction): FlexEditorState {
  switch (action.type) {
    case "SET_DATA": {
      const hist = action.data && action.pushHistory !== false
        ? pushToHistory(state, action.data)
        : { history: action.data ? [action.data] : [], historyIndex: action.data ? 0 : -1 };
      return { ...state, flexData: action.data, selectedPath: null, ...hist };
    }

    case "SELECT":
      return { ...state, selectedPath: action.path };

    case "UPDATE_AT_PATH": {
      if (!state.flexData) return state;
      const newData = setAtPath(state.flexData, action.path, action.value);
      return { ...state, flexData: newData, ...pushToHistory(state, newData) };
    }

    case "REMOVE_AT_PATH": {
      if (!state.flexData) return state;
      const newData = removeAtPath(state.flexData, action.path);
      return { ...state, flexData: newData, selectedPath: null, ...pushToHistory(state, newData) };
    }

    case "INSERT": {
      if (!state.flexData) return state;
      const newData = insertAtPath(state.flexData, action.arrayPath, action.index, action.element);
      return { ...state, flexData: newData, ...pushToHistory(state, newData) };
    }

    case "MOVE": {
      if (!state.flexData) return state;
      const newData = moveInArray(state.flexData, action.arrayPath, action.fromIndex, action.toIndex);
      return { ...state, flexData: newData, ...pushToHistory(state, newData) };
    }

    case "UNDO": {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return { ...state, flexData: state.history[newIndex], historyIndex: newIndex };
    }

    case "REDO": {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return { ...state, flexData: state.history[newIndex], historyIndex: newIndex };
    }

    case "TOGGLE_JSON":
      return { ...state, jsonMode: !state.jsonMode };

    default:
      return state;
  }
}

// ── Context ──

const FlexEditorContext = createContext<FlexEditorState>(initialState);
const FlexEditorDispatchContext = createContext<Dispatch<FlexEditorAction>>(() => {});

export function FlexEditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(flexEditorReducer, initialState);
  return (
    <FlexEditorContext.Provider value={state}>
      <FlexEditorDispatchContext.Provider value={dispatch}>
        {children}
      </FlexEditorDispatchContext.Provider>
    </FlexEditorContext.Provider>
  );
}

export function useFlexEditor() {
  return useContext(FlexEditorContext);
}

export function useFlexEditorDispatch() {
  return useContext(FlexEditorDispatchContext);
}
