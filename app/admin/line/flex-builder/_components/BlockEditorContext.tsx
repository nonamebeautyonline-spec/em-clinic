"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  type Panel,
  type PanelSettings,
  type EditorBlock,
  type BlockType,
  type BlockProps,
  createDefaultBlockProps,
  generateBlockId,
  DEFAULT_PANEL_SETTINGS,
} from "@/lib/flex-editor/block-types";
import {
  flexToEditorPanels,
  createEmptyPanel,
  duplicatePanel,
} from "@/lib/flex-editor/block-mapping";

// ── 型定義 ──

type FlexObj = Record<string, unknown>;

export interface BlockEditorState {
  panels: Panel[];
  activePanelIndex: number;
  selectedBlockId: string | null;
  templateName: string;
  editingTemplateId: number | null;
  history: Panel[][];
  historyIndex: number;
}

export type BlockEditorAction =
  // パネル操作
  | { type: "SELECT_PANEL"; index: number }
  | { type: "ADD_PANEL" }
  | { type: "DELETE_PANEL"; index: number }
  | { type: "DUPLICATE_PANEL"; index: number }
  | { type: "MOVE_PANEL"; index: number; direction: "prev" | "next" }
  | { type: "UPDATE_PANEL_SETTINGS"; settings: Partial<PanelSettings> }
  // ブロック操作
  | { type: "SELECT_BLOCK"; blockId: string | null }
  | { type: "ADD_BLOCK"; blockType: BlockType }
  | { type: "UPDATE_BLOCK"; blockId: string; updates: Partial<BlockProps> }
  | { type: "DELETE_BLOCK"; blockId: string }
  | { type: "MOVE_BLOCK"; blockId: string; direction: "up" | "down" }
  // テンプレート管理
  | { type: "SET_TEMPLATE_NAME"; name: string }
  | { type: "SET_EDITING_ID"; id: number | null }
  | { type: "LOAD_FLEX_DATA"; flexData: FlexObj; name?: string; templateId?: number | null }
  // Undo/Redo
  | { type: "UNDO" }
  | { type: "REDO" };

const MAX_HISTORY = 50;

// ── 初期状態 ──

const initialState: BlockEditorState = {
  panels: [createEmptyPanel()],
  activePanelIndex: 0,
  selectedBlockId: null,
  templateName: "新しいテンプレート",
  editingTemplateId: null,
  history: [],
  historyIndex: -1,
};

// ── 履歴管理 ──

function pushHistory(
  state: BlockEditorState,
  panels: Panel[],
): Pick<BlockEditorState, "history" | "historyIndex"> {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(panels.map((p) => ({ ...p, blocks: [...p.blocks] })));
  if (newHistory.length > MAX_HISTORY) newHistory.shift();
  return { history: newHistory, historyIndex: newHistory.length - 1 };
}

// ── Reducer ──

function blockEditorReducer(
  state: BlockEditorState,
  action: BlockEditorAction,
): BlockEditorState {
  switch (action.type) {
    // ── パネル操作 ──

    case "SELECT_PANEL":
      return {
        ...state,
        activePanelIndex: Math.min(action.index, state.panels.length - 1),
        selectedBlockId: null,
      };

    case "ADD_PANEL": {
      if (state.panels.length >= 12) return state;
      const currentTheme = state.panels[state.activePanelIndex]?.settings.themeColor;
      const newPanel = createEmptyPanel(currentTheme);
      const newPanels = [...state.panels];
      newPanels.splice(state.activePanelIndex + 1, 0, newPanel);
      return {
        ...state,
        panels: newPanels,
        activePanelIndex: state.activePanelIndex + 1,
        selectedBlockId: null,
        ...pushHistory(state, newPanels),
      };
    }

    case "DELETE_PANEL": {
      if (state.panels.length <= 1) return state;
      const newPanels = state.panels.filter((_, i) => i !== action.index);
      const newIndex = Math.min(state.activePanelIndex, newPanels.length - 1);
      return {
        ...state,
        panels: newPanels,
        activePanelIndex: newIndex,
        selectedBlockId: null,
        ...pushHistory(state, newPanels),
      };
    }

    case "DUPLICATE_PANEL": {
      if (state.panels.length >= 12) return state;
      const source = state.panels[action.index];
      if (!source) return state;
      const dup = duplicatePanel(source);
      const newPanels = [...state.panels];
      newPanels.splice(action.index + 1, 0, dup);
      return {
        ...state,
        panels: newPanels,
        activePanelIndex: action.index + 1,
        selectedBlockId: null,
        ...pushHistory(state, newPanels),
      };
    }

    case "MOVE_PANEL": {
      const { index, direction } = action;
      const targetIndex = direction === "prev" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= state.panels.length) return state;
      const newPanels = [...state.panels];
      [newPanels[index], newPanels[targetIndex]] = [newPanels[targetIndex], newPanels[index]];
      return {
        ...state,
        panels: newPanels,
        activePanelIndex: targetIndex,
        ...pushHistory(state, newPanels),
      };
    }

    case "UPDATE_PANEL_SETTINGS": {
      const newPanels = state.panels.map((p, i) =>
        i === state.activePanelIndex
          ? { ...p, settings: { ...p.settings, ...action.settings } }
          : p,
      );
      return {
        ...state,
        panels: newPanels,
        ...pushHistory(state, newPanels),
      };
    }

    // ── ブロック操作 ──

    case "SELECT_BLOCK":
      return { ...state, selectedBlockId: action.blockId };

    case "ADD_BLOCK": {
      const panel = state.panels[state.activePanelIndex];
      if (!panel) return state;
      const newBlock: EditorBlock = {
        id: generateBlockId(),
        props: createDefaultBlockProps(action.blockType, panel.settings.themeColor),
      };
      const newBlocks = [...panel.blocks, newBlock];
      const newPanels = state.panels.map((p, i) =>
        i === state.activePanelIndex ? { ...p, blocks: newBlocks } : p,
      );
      return {
        ...state,
        panels: newPanels,
        selectedBlockId: newBlock.id,
        ...pushHistory(state, newPanels),
      };
    }

    case "UPDATE_BLOCK": {
      const panel = state.panels[state.activePanelIndex];
      if (!panel) return state;
      const newBlocks = panel.blocks.map((b) =>
        b.id === action.blockId
          ? { ...b, props: { ...b.props, ...action.updates } as BlockProps }
          : b,
      );
      const newPanels = state.panels.map((p, i) =>
        i === state.activePanelIndex ? { ...p, blocks: newBlocks } : p,
      );
      return {
        ...state,
        panels: newPanels,
        ...pushHistory(state, newPanels),
      };
    }

    case "DELETE_BLOCK": {
      const panel = state.panels[state.activePanelIndex];
      if (!panel) return state;
      const newBlocks = panel.blocks.filter((b) => b.id !== action.blockId);
      const newPanels = state.panels.map((p, i) =>
        i === state.activePanelIndex ? { ...p, blocks: newBlocks } : p,
      );
      return {
        ...state,
        panels: newPanels,
        selectedBlockId:
          state.selectedBlockId === action.blockId ? null : state.selectedBlockId,
        ...pushHistory(state, newPanels),
      };
    }

    case "MOVE_BLOCK": {
      const panel = state.panels[state.activePanelIndex];
      if (!panel) return state;
      const idx = panel.blocks.findIndex((b) => b.id === action.blockId);
      if (idx < 0) return state;
      const targetIdx = action.direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= panel.blocks.length) return state;
      const newBlocks = [...panel.blocks];
      [newBlocks[idx], newBlocks[targetIdx]] = [newBlocks[targetIdx], newBlocks[idx]];
      const newPanels = state.panels.map((p, i) =>
        i === state.activePanelIndex ? { ...p, blocks: newBlocks } : p,
      );
      return {
        ...state,
        panels: newPanels,
        ...pushHistory(state, newPanels),
      };
    }

    // ── テンプレート管理 ──

    case "SET_TEMPLATE_NAME":
      return { ...state, templateName: action.name };

    case "SET_EDITING_ID":
      return { ...state, editingTemplateId: action.id };

    case "LOAD_FLEX_DATA": {
      const panels = flexToEditorPanels(action.flexData);
      return {
        ...state,
        panels,
        activePanelIndex: 0,
        selectedBlockId: null,
        templateName: action.name || state.templateName,
        editingTemplateId: action.templateId ?? state.editingTemplateId,
        history: [panels.map((p) => ({ ...p, blocks: [...p.blocks] }))],
        historyIndex: 0,
      };
    }

    // ── Undo/Redo ──

    case "UNDO": {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const panels = state.history[newIndex];
      return {
        ...state,
        panels,
        historyIndex: newIndex,
        activePanelIndex: Math.min(state.activePanelIndex, panels.length - 1),
        selectedBlockId: null,
      };
    }

    case "REDO": {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const panels = state.history[newIndex];
      return {
        ...state,
        panels,
        historyIndex: newIndex,
        activePanelIndex: Math.min(state.activePanelIndex, panels.length - 1),
        selectedBlockId: null,
      };
    }

    default:
      return state;
  }
}

// ── Context ──

const BlockEditorContext = createContext<BlockEditorState>(initialState);
const BlockEditorDispatchContext = createContext<Dispatch<BlockEditorAction>>(() => {});

export function BlockEditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(blockEditorReducer, initialState);
  return (
    <BlockEditorContext.Provider value={state}>
      <BlockEditorDispatchContext.Provider value={dispatch}>
        {children}
      </BlockEditorDispatchContext.Provider>
    </BlockEditorContext.Provider>
  );
}

export function useBlockEditor() {
  return useContext(BlockEditorContext);
}

export function useBlockEditorDispatch() {
  return useContext(BlockEditorDispatchContext);
}
