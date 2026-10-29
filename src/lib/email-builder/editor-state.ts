import type { EmailBlock, EmailTheme } from "@/db/schema";
import { createDefaultBlock, newBlockId } from "../email-blocks";
import { MAX_BLOCKS, type EmailDocument } from "./document";
import { setBlockField } from "./catalog";
import { applyItemOp, type ItemOp } from "./schema";
import { parseTheme } from "./theme";

/**
 * Pure editor state: the document, the selection, and undo/redo history. No React, no I/O, so it is unit
 * tested directly. Every mutation goes through `editorReducer`; invalid input (a value the schema rejects,
 * an unknown id) leaves the state untouched rather than throwing.
 */

export type EditorState = {
  doc: EmailDocument;
  selectedId: string | null;
  past: EmailDocument[];
  future: EmailDocument[];
  /** Key of the last coalescable edit (typing in one field): consecutive edits with the same key share one undo step. */
  coalesceKey: string | null;
  /** Increments on every document change; the autosave hook compares it with the last saved value. */
  version: number;
};

export type EditorAction =
  | { type: "ADD"; block?: EmailBlock; blockType?: EmailBlock["type"]; index?: number }
  | { type: "REMOVE"; id: string }
  | { type: "DUPLICATE"; id: string }
  | { type: "MOVE"; id: string; toIndex: number }
  | { type: "FIELD"; id: string; path: string; value: string }
  | { type: "ITEM_OP"; id: string; listKey: string; op: ItemOp; index: number }
  | { type: "THEME"; theme: Partial<EmailTheme> }
  | { type: "REPLACE_THEME"; theme: EmailTheme }
  | { type: "SELECT"; id: string | null }
  | { type: "UNDO" }
  | { type: "REDO" };

const HISTORY_LIMIT = 100;

export function initEditorState(doc: EmailDocument): EditorState {
  return { doc, selectedId: null, past: [], future: [], coalesceKey: null, version: 0 };
}

function commit(state: EditorState, doc: EmailDocument, coalesceKey: string | null, selectedId: string | null = state.selectedId): EditorState {
  const coalesce = coalesceKey !== null && coalesceKey === state.coalesceKey && state.past.length > 0;
  const past = coalesce ? state.past : [...state.past, state.doc].slice(-HISTORY_LIMIT);
  return { doc, selectedId, past, future: [], coalesceKey, version: state.version + 1 };
}

const indexOf = (doc: EmailDocument, id: string) => doc.blocks.findIndex((b) => b.id === id);

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const { doc } = state;
  switch (action.type) {
    case "SELECT":
      return action.id === state.selectedId ? state : { ...state, selectedId: action.id, coalesceKey: null };

    case "ADD": {
      if (doc.blocks.length >= MAX_BLOCKS) return state;
      const block = action.block ?? (action.blockType ? createDefaultBlock(action.blockType) : null);
      if (!block) return state;
      const index = Math.max(0, Math.min(doc.blocks.length, action.index ?? doc.blocks.length));
      const blocks = [...doc.blocks.slice(0, index), block, ...doc.blocks.slice(index)];
      return commit(state, { ...doc, blocks }, null, block.id);
    }

    case "REMOVE": {
      const i = indexOf(doc, action.id);
      if (i < 0) return state;
      const blocks = doc.blocks.filter((b) => b.id !== action.id);
      const next = state.selectedId === action.id ? (blocks[i] ?? blocks[i - 1] ?? null)?.id ?? null : state.selectedId;
      return commit(state, { ...doc, blocks }, null, next);
    }

    case "DUPLICATE": {
      const i = indexOf(doc, action.id);
      if (i < 0 || doc.blocks.length >= MAX_BLOCKS) return state;
      const copy = { ...JSON.parse(JSON.stringify(doc.blocks[i])), id: newBlockId() } as EmailBlock;
      const blocks = [...doc.blocks.slice(0, i + 1), copy, ...doc.blocks.slice(i + 1)];
      return commit(state, { ...doc, blocks }, null, copy.id);
    }

    case "MOVE": {
      const from = indexOf(doc, action.id);
      const to = Math.max(0, Math.min(doc.blocks.length - 1, action.toIndex));
      if (from < 0 || from === to) return state;
      const blocks = [...doc.blocks];
      const [moved] = blocks.splice(from, 1);
      blocks.splice(to, 0, moved);
      return commit(state, { ...doc, blocks }, null);
    }

    case "FIELD": {
      const i = indexOf(doc, action.id);
      if (i < 0) return state;
      const next = setBlockField(doc.blocks[i], action.path, action.value);
      if (!next || JSON.stringify(next) === JSON.stringify(doc.blocks[i])) return state;
      const blocks = doc.blocks.map((b, n) => (n === i ? next : b));
      return commit(state, { ...doc, blocks }, `field:${action.id}:${action.path}`);
    }

    case "ITEM_OP": {
      const i = indexOf(doc, action.id);
      if (i < 0) return state;
      const next = applyItemOp(doc.blocks[i], action.listKey, action.op, action.index);
      if (!next) return state;
      return commit(state, { ...doc, blocks: doc.blocks.map((b, n) => (n === i ? next : b)) }, null);
    }

    case "THEME": {
      const theme = parseTheme({ ...doc.theme, ...action.theme });
      if (JSON.stringify(theme) === JSON.stringify(doc.theme)) return state;
      return commit(state, { ...doc, theme }, `theme:${Object.keys(action.theme).join(",")}`);
    }

    case "REPLACE_THEME":
      return commit(state, { ...doc, theme: parseTheme(action.theme) }, null);

    case "UNDO": {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return { ...state, doc: prev, past: state.past.slice(0, -1), future: [doc, ...state.future], coalesceKey: null, version: state.version + 1, selectedId: keepSelection(state.selectedId, prev) };
    }

    case "REDO": {
      const nextDoc = state.future[0];
      if (!nextDoc) return state;
      return { ...state, doc: nextDoc, past: [...state.past, doc], future: state.future.slice(1), coalesceKey: null, version: state.version + 1, selectedId: keepSelection(state.selectedId, nextDoc) };
    }
  }
}

function keepSelection(id: string | null, doc: EmailDocument) {
  return id && doc.blocks.some((b) => b.id === id) ? id : null;
}
