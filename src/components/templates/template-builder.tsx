"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  FileText,
  GripVertical,
  History,
  Image as ImageIcon,
  LayoutTemplate,
  Minus,
  MoreHorizontal,
  MousePointerClick,
  MoveVertical,
  Redo2,
  Save,
  Search,
  Send,
  Sparkles,
  Type,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmailBlock } from "@/db/schema";
import type { Template } from "@/components/templates/template-catalog";
import { createDefaultBlock, renderBlocksToHtml } from "@/lib/email-blocks";
import {
  archiveTemplateAction,
  deleteTemplateAction,
  duplicateTemplateAction,
  saveAsNewTemplateAction,
  saveTemplateAction,
} from "@/lib/actions/template-actions";

type SaveState = "Saving" | "Saved" | "Unsaved changes" | "Error saving";
type EditorStatus = "Draft" | "Saved" | "Published" | "Archived";
type ViewMode = "desktop" | "mobile";
type PanelTab = "content" | "style" | "settings" | "visibility";

const blockCatalog = [
  { type: "heading", label: "Heading", description: "Lead with a strong headline and message.", icon: Type },
  { type: "text", label: "Rich text", description: "Add story or product copy with easy formatting.", icon: FileText },
  { type: "image", label: "Image", description: "Show a product, lifestyle, or brand visual.", icon: ImageIcon },
  { type: "button", label: "Button", description: "Drive clicks with a clear call to action.", icon: MousePointerClick },
  { type: "divider", label: "Divider", description: "Separate content and improve scanning.", icon: Minus },
  { type: "spacer", label: "Spacer", description: "Add breathing room between sections.", icon: MoveVertical },
  { type: "footer", label: "Footer", description: "Keep contact and unsubscribe details visible.", icon: GripVertical },
] as const;

function getDefaultBlocks(): EmailBlock[] {
  return [
    createDefaultBlock("heading"),
    createDefaultBlock("text"),
    createDefaultBlock("button"),
    createDefaultBlock("footer"),
  ];
}

function getBlockLabel(block: EmailBlock): string {
  switch (block.type) {
    case "heading": return "Heading";
    case "text": return "Rich text";
    case "image": return "Image";
    case "button": return "Button";
    case "divider": return "Divider";
    case "spacer": return "Spacer";
    case "footer": return "Footer";
  }
}

function blockPreview(block: EmailBlock) {
  switch (block.type) {
    case "heading":
      return <h3 className="text-[22px] font-semibold leading-tight" style={{ color: block.color || "#10151C" }}>{block.text || "Your headline here"}</h3>;
    case "text":
      return <div className="text-[14px] leading-6" style={{ color: block.color || "#10151C" }} dangerouslySetInnerHTML={{ __html: block.html || "<p>Write your message here.</p>" }} />;
    case "image":
      return <img src={block.url || "https://placehold.co/560x240"} alt={block.alt || "Content image"} className="h-40 w-full rounded-[8px] object-cover" />;
    case "button":
      return (
        <div
          className="inline-flex items-center justify-center rounded-[8px] px-4 py-2.5 text-[13px] font-semibold"
          style={{ backgroundColor: block.backgroundColor || "#0B5FFF", color: block.textColor || "#FFFFFF" }}
        >
          {block.label || "Shop now"}
        </div>
      );
    case "divider":
      return <div className="h-px w-full bg-border" />;
    case "spacer":
      return <div className="w-full" style={{ height: `${Math.max(16, block.height || 24)}px` }} />;
    case "footer":
      return <p className="text-[12px] leading-5" style={{ color: block.color || "#6B7280" }}>{block.text || "You are receiving this email because you subscribed."}</p>;
    default:
      return null;
  }
}

function renderInspectorFields(block: EmailBlock | undefined, onChange: (field: string, value: string) => void) {
  if (!block) {
    return (
      <div className="rounded-[10px] border border-dashed border-border bg-surface-secondary p-4 text-[13px] text-text-secondary">
        Select any block to edit the content, styles, and visibility settings.
      </div>
    );
  }

  switch (block.type) {
    case "heading":
      return (
        <label className="block text-[12px] font-medium text-text-secondary">
          Headline
          <input
            value={block.text || ""}
            onChange={(event) => onChange("text", event.target.value)}
            className="mt-1.5 h-10 w-full rounded-[8px] border border-border bg-surface px-3 text-[13px] text-text-primary outline-none focus:border-primary"
          />
        </label>
      );
    case "text":
      return (
        <label className="block text-[12px] font-medium text-text-secondary">
          Content
          <textarea
            value={block.html || ""}
            onChange={(event) => onChange("html", event.target.value)}
            rows={6}
            className="mt-1.5 w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-[13px] text-text-primary outline-none focus:border-primary"
          />
        </label>
      );
    case "image":
      return (
        <div className="space-y-3">
          <label className="block text-[12px] font-medium text-text-secondary">
            Image URL
            <input
              value={block.url || ""}
              onChange={(event) => onChange("url", event.target.value)}
              className="mt-1.5 h-10 w-full rounded-[8px] border border-border bg-surface px-3 text-[13px] text-text-primary outline-none focus:border-primary"
            />
          </label>
          <label className="block text-[12px] font-medium text-text-secondary">
            Alt text
            <input
              value={block.alt || ""}
              onChange={(event) => onChange("alt", event.target.value)}
              className="mt-1.5 h-10 w-full rounded-[8px] border border-border bg-surface px-3 text-[13px] text-text-primary outline-none focus:border-primary"
            />
          </label>
        </div>
      );
    case "button":
      return (
        <div className="space-y-3">
          <label className="block text-[12px] font-medium text-text-secondary">
            Label
            <input
              value={block.label || ""}
              onChange={(event) => onChange("label", event.target.value)}
              className="mt-1.5 h-10 w-full rounded-[8px] border border-border bg-surface px-3 text-[13px] text-text-primary outline-none focus:border-primary"
            />
          </label>
          <label className="block text-[12px] font-medium text-text-secondary">
            Link URL
            <input
              value={block.url || ""}
              onChange={(event) => onChange("url", event.target.value)}
              className="mt-1.5 h-10 w-full rounded-[8px] border border-border bg-surface px-3 text-[13px] text-text-primary outline-none focus:border-primary"
            />
          </label>
        </div>
      );
    case "spacer":
      return (
        <label className="block text-[12px] font-medium text-text-secondary">
          Height (px)
          <input
            type="number"
            value={block.height || 24}
            onChange={(event) => onChange("height", event.target.value)}
            className="mt-1.5 h-10 w-full rounded-[8px] border border-border bg-surface px-3 text-[13px] text-text-primary outline-none focus:border-primary"
          />
        </label>
      );
    case "footer":
      return (
        <label className="block text-[12px] font-medium text-text-secondary">
          Footer text
          <textarea
            value={block.text || ""}
            onChange={(event) => onChange("text", event.target.value)}
            rows={5}
            className="mt-1.5 w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-[13px] text-text-primary outline-none focus:border-primary"
          />
        </label>
      );
    default:
      return <div className="text-[13px] text-text-secondary">This block type has no extra settings yet.</div>;
  }
}

export function TemplateBuilder({ template }: { template?: Template | null }) {
  const initialBlocks = useMemo(
    () => (template?.blocks && template.blocks.length > 0 ? template.blocks : getDefaultBlocks()),
    [template]
  );

  type EditorSnapshot = {
    name: string;
    subject: string;
    previewText: string;
    blocks: EmailBlock[];
  };

  const initialSnapshot: EditorSnapshot = {
    name: template?.name ?? "Untitled template",
    subject: template?.subject ?? "",
    previewText: template?.previewText ?? "",
    blocks: initialBlocks,
  };

  const [name, setName] = useState(initialSnapshot.name);
  const [subject, setSubject] = useState(initialSnapshot.subject);
  const [previewText, setPreviewText] = useState(initialSnapshot.previewText);
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialSnapshot.blocks);
  const [history, setHistory] = useState<EditorSnapshot[]>([initialSnapshot]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(0);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialBlocks[0]?.id);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [panelTab, setPanelTab] = useState<PanelTab>("content");
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>(template ? "Saved" : "Unsaved changes");
  const [status, setStatus] = useState<EditorStatus>(template ? "Saved" : "Draft");

  useEffect(() => {
    if (!template) return;

    const nextSnapshot: EditorSnapshot = {
      name: template.name ?? "Untitled template",
      subject: template.subject ?? "",
      previewText: template.previewText ?? "",
      blocks: template.blocks && template.blocks.length > 0 ? template.blocks : getDefaultBlocks(),
    };

    setName(nextSnapshot.name);
    setSubject(nextSnapshot.subject);
    setPreviewText(nextSnapshot.previewText);
    setBlocks(nextSnapshot.blocks);
    setSelectedId(nextSnapshot.blocks[0]?.id);
    setHistory([nextSnapshot]);
    setHistoryIndex(0);
    historyIndexRef.current = 0;
    setSaveState("Saved");
    setStatus("Saved");
  }, [template]);

  function pushHistory(nextSnapshot: EditorSnapshot) {
    setHistory((current) => {
      const currentIndex = historyIndexRef.current;
      const trimmed = current.slice(0, currentIndex + 1);
      const last = trimmed[trimmed.length - 1];

      if (last && JSON.stringify(last) === JSON.stringify(nextSnapshot)) {
        return current;
      }

      const nextHistory = [...trimmed, nextSnapshot];
      const nextIndex = nextHistory.length - 1;
      historyIndexRef.current = nextIndex;
      setHistoryIndex(nextIndex);
      return nextHistory;
    });
  }

  function restoreSnapshot(snapshot: EditorSnapshot) {
    setName(snapshot.name);
    setSubject(snapshot.subject);
    setPreviewText(snapshot.previewText);
    setBlocks(snapshot.blocks);
    setSelectedId(snapshot.blocks[0]?.id);
    setSaveState("Unsaved changes");
    setStatus("Draft");
  }

  function handleUndo() {
    if (historyIndexRef.current === 0) return;
    const nextIndex = historyIndexRef.current - 1;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    restoreSnapshot(history[nextIndex]);
  }

  function handleRedo() {
    if (historyIndexRef.current >= history.length - 1) return;
    const nextIndex = historyIndexRef.current + 1;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    restoreSnapshot(history[nextIndex]);
  }

  const selectedBlock = blocks.find((block) => block.id === selectedId) ?? blocks[0];
  const validationChecks = useMemo(() => {
    const checks: { type: "warning" | "suggestion"; message: string }[] = [];

    if (blocks.length === 0) {
      checks.push({ type: "warning", message: "No blocks have been added yet." });
    }

    if (!blocks.some((block) => block.type === "footer")) {
      checks.push({ type: "suggestion", message: "Add a footer block for unsubscribe and contact details." });
    }

    const emptyButton = blocks.find((block) => block.type === "button" && (!block.label.trim() || !block.url.trim()));
    if (emptyButton) {
      checks.push({ type: "warning", message: "A CTA button is missing copy or a destination URL." });
    }

    const emptyHeading = blocks.find((block) => block.type === "heading" && !block.text.trim());
    if (emptyHeading) {
      checks.push({ type: "suggestion", message: "Give your headline a clear, on-brand message." });
    }

    return checks;
  }, [blocks]);

  const filteredCatalog = blockCatalog.filter(({ label, description }) => {
    const search = query.trim().toLowerCase();
    if (!search) return true;
    return `${label} ${description}`.toLowerCase().includes(search);
  });

  const warningCount = validationChecks.filter((check) => check.type === "warning").length;
  const suggestionCount = validationChecks.filter((check) => check.type === "suggestion").length;
  const validationSummary = validationChecks.length === 0 ? "Ready to publish" : `Ready with ${validationChecks.length} improvement${validationChecks.length === 1 ? "" : "s"}`;

  function applyValidationFix() {
    if (blocks.length === 0) {
      const heading = createDefaultBlock("heading");
      const nextBlocks = [heading];
      commitBlocks(nextBlocks);
      setSelectedId(heading.id);
      setPanelTab("settings");
      return;
    }

    if (!blocks.some((block) => block.type === "footer")) {
      const footer = createDefaultBlock("footer");
      const nextBlocks = [...blocks, footer];
      commitBlocks(nextBlocks);
      setSelectedId(footer.id);
      setPanelTab("settings");
      return;
    }

    const emptyHeading = blocks.find((block) => block.type === "heading" && !block.text.trim());
    if (emptyHeading) {
      const nextBlocks = blocks.map((block) =>
        block.id === emptyHeading.id && block.type === "heading"
          ? { ...block, text: "Your headline here" }
          : block
      );
      setBlocks(nextBlocks);
      pushHistory({ name, subject, previewText, blocks: nextBlocks });
      setSelectedId(emptyHeading.id);
      setPanelTab("settings");
      return;
    }

    const brokenButton = blocks.find(
      (block): block is Extract<EmailBlock, { type: "button" }> =>
        block.type === "button" && (!block.label.trim() || !block.url.trim())
    );
    if (brokenButton) {
      const nextBlocks = blocks.map((block) =>
        block.id === brokenButton.id && block.type === "button"
          ? { ...block, label: block.label.trim() || "Shop now", url: block.url.trim() || "https://example.com" }
          : block
      );
      setBlocks(nextBlocks);
      pushHistory({ name, subject, previewText, blocks: nextBlocks });
      setSelectedId(brokenButton.id);
      setPanelTab("settings");
      return;
    }
  }

  function commitBlocks(nextBlocks: EmailBlock[]) {
    setBlocks(nextBlocks);
    pushHistory({ name, subject, previewText, blocks: nextBlocks });
    setSaveState("Unsaved changes");
    setStatus("Draft");
  }

  function updateSelectedBlock(field: string, value: string) {
    if (!selectedBlock) return;

    const nextBlocks = blocks.map((block) => {
      if (block.id !== selectedBlock.id) return block;

      switch (block.type) {
        case "heading":
          return {
            ...block,
            text: field === "text" ? value : block.text,
            color: field === "color" ? value : block.color,
          };
        case "text":
          return {
            ...block,
            html: field === "html" ? value : block.html,
            color: field === "color" ? value : block.color,
          };
        case "image":
          return {
            ...block,
            url: field === "url" ? value : block.url,
            alt: field === "alt" ? value : block.alt,
          };
        case "button":
          return {
            ...block,
            label: field === "label" ? value : block.label,
            url: field === "url" ? value : block.url,
            backgroundColor: field === "backgroundColor" ? value : block.backgroundColor,
            textColor: field === "textColor" ? value : block.textColor,
          };
        case "spacer":
          return { ...block, height: Number(value) || 24 };
        case "footer":
          return {
            ...block,
            text: field === "text" ? value : block.text,
            color: field === "color" ? value : block.color,
          };
        default:
          return block;
      }
    });

    setBlocks(nextBlocks);
    pushHistory({ name, subject, previewText, blocks: nextBlocks });
    setSaveState("Unsaved changes");
    setStatus("Draft");
  }

  function addBlock(type: EmailBlock["type"]) {
    const nextBlock = createDefaultBlock(type);
    const insertIndex = selectedBlock ? blocks.findIndex((block) => block.id === selectedBlock.id) + 1 : blocks.length;
    const nextBlocks = [...blocks];
    nextBlocks.splice(Math.max(0, insertIndex), 0, nextBlock);
    commitBlocks(nextBlocks);
    setSelectedId(nextBlock.id);
  }

  function moveSelectedBlock(direction: "up" | "down") {
    if (!selectedBlock) return;
    const index = blocks.findIndex((block) => block.id === selectedBlock.id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= blocks.length) return;

    const nextBlocks = [...blocks];
    [nextBlocks[index], nextBlocks[target]] = [nextBlocks[target], nextBlocks[index]];
    commitBlocks(nextBlocks);
  }

  function reorderBlocks(sourceId: string, targetId: string) {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
    const targetIndex = blocks.findIndex((block) => block.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextBlocks = [...blocks];
    const [movedBlock] = nextBlocks.splice(sourceIndex, 1);
    nextBlocks.splice(targetIndex, 0, movedBlock);
    commitBlocks(nextBlocks);
    setSelectedId(movedBlock.id);
  }

  function duplicateSelectedBlock() {
    if (!selectedBlock) return;
    const clonedBlock: EmailBlock = { ...selectedBlock, id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
    const index = blocks.findIndex((block) => block.id === selectedBlock.id);
    const nextBlocks = [...blocks];
    nextBlocks.splice(index + 1, 0, clonedBlock);
    commitBlocks(nextBlocks);
    setSelectedId(clonedBlock.id);
  }

  function removeSelectedBlock() {
    if (!selectedBlock) return;
    const nextBlocks = blocks.filter((block) => block.id !== selectedBlock.id);
    commitBlocks(nextBlocks);
    setSelectedId(nextBlocks[0]?.id);
  }

  async function saveTemplate() {
    setSaveState("Saving");
    const formData = new FormData();
    if (template?.id) formData.set("templateId", template.id);
    formData.set("name", name.trim() || "Untitled template");
    formData.set("subject", subject);
    formData.set("previewText", previewText);
    formData.set("category", "CUSTOM");
    formData.set("blocks", JSON.stringify(blocks));

    const result = await saveTemplateAction(undefined, formData);
    if (result?.error) {
      setSaveState("Error saving");
      return;
    }

    setSaveState("Saved");
    setStatus("Saved");
  }

  async function saveAsNewTemplate() {
    const formData = new FormData();
    if (template?.id) formData.set("templateId", template.id);
    formData.set("name", name.trim() || "Untitled template");
    formData.set("subject", subject);
    formData.set("previewText", previewText);
    formData.set("category", "CUSTOM");
    formData.set("blocks", JSON.stringify(blocks));

    const result = await saveAsNewTemplateAction(formData);
    if (result?.error) {
      setSaveState("Error saving");
      return;
    }

    setSaveState("Saved");
    setStatus("Saved");
  }

  function previewTemplateHtml() {
    const html = renderBlocksToHtml(blocks);
    const newWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!newWindow) return;
    newWindow.document.write(html);
    newWindow.document.close();
  }

  async function duplicateCurrentTemplate() {
    if (!template?.id) return;
    const formData = new FormData();
    formData.set("templateId", template.id);
    await duplicateTemplateAction(formData);
  }

  async function archiveCurrentTemplate() {
    if (!template?.id) return;
    if (!window.confirm("Archive this template?")) return;
    const formData = new FormData();
    formData.set("templateId", template.id);
    await archiveTemplateAction(formData);
  }

  async function deleteCurrentTemplate() {
    if (!template?.id) return;
    if (!window.confirm("Delete this template permanently?")) return;
    const formData = new FormData();
    formData.set("templateId", template.id);
    await deleteTemplateAction(formData);
  }

  return (
    <div className="mx-auto max-w-[1480px] space-y-4 pb-8">
      <header className="rounded-[12px] border border-border bg-surface p-3 shadow-[var(--shadow-xs)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/templates" className="inline-flex items-center gap-1.5 rounded-[8px] border border-border bg-surface-secondary px-2.5 py-2 text-[12px] font-medium text-text-secondary hover:text-text-primary">
              <ArrowLeft size={14} /> Back to templates
            </Link>
            <div className="min-w-0 flex-1">
              <input
                value={name}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  pushHistory({ name: nextName, subject, previewText, blocks });
                }}
                className="w-full bg-transparent text-[20px] font-semibold text-text-primary outline-none placeholder:text-text-placeholder"
                placeholder="Untitled template"
                aria-label="Template name"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-surface-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary">{status}</span>
            <span className="text-[12px] font-medium text-text-secondary">{saveState}</span>
            <Button type="button" variant="secondary" size="sm" onClick={handleUndo} disabled={historyIndex === 0}>
              <Undo2 size={14} /> Undo
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
              <Redo2 size={14} /> Redo
            </Button>
            <Button type="button" variant="secondary" size="sm">
              <History size={14} /> Version history
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setViewMode((current) => (current === "desktop" ? "mobile" : "desktop"))}>
              <Eye size={14} /> {viewMode === "desktop" ? "Desktop" : "Mobile"}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={previewTemplateHtml}>
              <Send size={14} /> Send test email
            </Button>
            <Button type="button" size="sm" onClick={() => void saveTemplate()}>
              <Save size={14} /> Save template
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => void saveAsNewTemplate()}>
              <Copy size={14} /> Save as new template
            </Button>
            <details className="relative">
              <summary className="list-none cursor-pointer rounded-[8px] border border-border bg-surface-secondary px-2.5 py-2 text-[12px] font-medium text-text-secondary">
                <span className="inline-flex items-center gap-1.5"><MoreHorizontal size={14} /> More actions</span>
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-[10px] border border-border bg-surface p-1.5 shadow-[var(--shadow-md)]">
                <button type="button" onClick={() => void duplicateCurrentTemplate()} className="flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-left text-[12px] text-text-secondary hover:bg-surface-secondary">Duplicate template <Copy size={12} /></button>
                <button type="button" className="flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-left text-[12px] text-text-secondary hover:bg-surface-secondary">Rename template <Type size={12} /></button>
                <button type="button" onClick={previewTemplateHtml} className="flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-left text-[12px] text-text-secondary hover:bg-surface-secondary">Export HTML <Save size={12} /></button>
                <button type="button" onClick={() => void archiveCurrentTemplate()} className="flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-left text-[12px] text-text-secondary hover:bg-surface-secondary">Archive template <LayoutTemplate size={12} /></button>
                <button type="button" onClick={() => void deleteCurrentTemplate()} className="flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-left text-[12px] text-danger hover:bg-danger-surface">Delete template <Minus size={12} /></button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_330px]">
        <aside className="rounded-[12px] border border-border bg-surface p-3">
          <div className="mb-3 flex items-center gap-2 rounded-[8px] border border-border bg-surface-secondary px-3 py-2 text-text-tertiary">
            <Search size={14} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search blocks"
              className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-placeholder"
            />
          </div>

          <div className="mb-3 flex flex-wrap gap-2 text-[12px] font-medium text-text-secondary">
            {['Content', 'Layouts', 'Saved blocks', 'Brand assets', 'AI helper'].map((tab) => (
              <span key={tab} className="rounded-full border border-border bg-surface-secondary px-2 py-1">
                {tab}
              </span>
            ))}
          </div>

          <div className="space-y-2">
            {filteredCatalog.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-border bg-surface-secondary p-4 text-[13px] text-text-secondary">
                No blocks match your search.
              </div>
            ) : (
              filteredCatalog.map(({ type, label, description, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addBlock(type)}
                  className="flex w-full items-start gap-3 rounded-[10px] border border-border bg-surface-secondary p-3 text-left transition-colors hover:border-border-strong hover:bg-surface"
                >
                  <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary-surface text-primary">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-text-primary">{label}</span>
                    <span className="mt-0.5 block text-[12px] leading-5 text-text-secondary">{description}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="rounded-[12px] border border-border bg-surface p-3">
          <div className="mb-3 flex items-center justify-between gap-3 rounded-[10px] border border-border bg-surface-secondary px-3 py-2">
            <div className="flex items-center gap-2 text-[12px] font-medium text-text-secondary">
              <Sparkles size={14} className="text-primary" />
              {validationSummary}
            </div>
            <div className="flex items-center gap-2 text-[12px] text-text-tertiary">
              {warningCount > 0 ? <span>{warningCount} warning{warningCount === 1 ? "" : "s"}</span> : <span>0 warnings</span>}
              <span>·</span>
              {suggestionCount > 0 ? <span>{suggestionCount} suggestion{suggestionCount === 1 ? "" : "s"}</span> : <span>0 suggestions</span>}
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant={viewMode === "desktop" ? "primary" : "secondary"} size="sm" onClick={() => setViewMode("desktop")}>Desktop</Button>
              <Button type="button" variant={viewMode === "mobile" ? "primary" : "secondary"} size="sm" onClick={() => setViewMode("mobile")}>Mobile</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm">Zoom -</Button>
              <Button type="button" variant="secondary" size="sm">Zoom +</Button>
            </div>
          </div>

          <div className="rounded-[16px] border border-border bg-[#F5F7FB] p-3">
            <div className={`mx-auto rounded-[12px] border border-border bg-white p-3 shadow-[var(--shadow-xs)] transition-all ${viewMode === "mobile" ? "max-w-[380px]" : "max-w-[620px]"}`}>
              {blocks.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-border bg-surface-secondary p-8 text-center text-text-secondary">
                  Add your first block to start building this email.
                </div>
              ) : (
                <div className="space-y-4">
                  {blocks.map((block, index) => (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={(event: DragEvent<HTMLDivElement>) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", block.id);
                        setDraggedBlockId(block.id);
                      }}
                      onDragOver={(event: DragEvent<HTMLDivElement>) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDragOverBlockId(block.id);
                      }}
                      onDragLeave={() => setDragOverBlockId((current) => (current === block.id ? null : current))}
                      onDrop={(event: DragEvent<HTMLDivElement>) => {
                        event.preventDefault();
                        const sourceId = event.dataTransfer.getData("text/plain") || draggedBlockId;
                        if (sourceId && sourceId !== block.id) {
                          reorderBlocks(sourceId, block.id);
                        }
                        setDraggedBlockId(null);
                        setDragOverBlockId(null);
                      }}
                      onDragEnd={() => {
                        setDraggedBlockId(null);
                        setDragOverBlockId(null);
                      }}
                      onClick={() => setSelectedId(block.id)}
                      className={`relative rounded-[10px] border p-3 transition-colors ${selectedId === block.id ? "border-primary bg-primary-surface" : "border-transparent bg-transparent hover:border-border"} ${dragOverBlockId === block.id ? "border-primary/60 ring-1 ring-primary/20" : ""}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-text-tertiary">
                        <span>{index + 1}. {getBlockLabel(block)}</span>
                        {selectedId === block.id && (
                          <span className="flex items-center gap-2">
                            <button type="button" onClick={(event) => { event.stopPropagation(); moveSelectedBlock("up"); }} className="rounded border border-border bg-surface px-1.5 py-0.5">↑</button>
                            <button type="button" onClick={(event) => { event.stopPropagation(); moveSelectedBlock("down"); }} className="rounded border border-border bg-surface px-1.5 py-0.5">↓</button>
                            <button type="button" onClick={(event) => { event.stopPropagation(); duplicateSelectedBlock(); }} className="rounded border border-border bg-surface px-1.5 py-0.5"><Copy size={12} /></button>
                            <button type="button" onClick={(event) => { event.stopPropagation(); removeSelectedBlock(); }} className="rounded border border-border bg-surface px-1.5 py-0.5"><Minus size={12} /></button>
                          </span>
                        )}
                      </div>
                      {blockPreview(block)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="rounded-[12px] border border-border bg-surface p-3">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <p className="text-[12px] font-semibold tracking-[0.02em] text-text-tertiary">BLOCK SETTINGS</p>
              <h2 className="mt-1 text-[15px] font-semibold text-text-primary">{selectedBlock ? "Selected block" : "Template settings"}</h2>
            </div>
            {selectedBlock && (
              <button type="button" className="inline-flex items-center gap-1 rounded-[8px] border border-border bg-surface-secondary px-2 py-1 text-[11px] font-medium text-text-secondary">
                <MoreHorizontal size={12} /> More
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[10px] border border-border bg-surface-secondary p-3">
              <div className="mb-3 flex items-center gap-2 text-[12px] font-medium text-text-secondary">
                {(["content", "style", "settings", "visibility"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPanelTab(tab)}
                    className={`rounded-full px-2.5 py-1 capitalize ${panelTab === tab ? "bg-primary text-white" : "bg-surface text-text-secondary"}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {panelTab === "content" && (
                <div className="space-y-3">
                  <label className="block text-[12px] font-medium text-text-secondary">
                    Subject line
                    <input
                      value={subject}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setSubject(nextValue);
                        pushHistory({ name, subject: nextValue, previewText, blocks });
                      }}
                      placeholder="Welcome to Zendmail"
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-border bg-surface px-3 text-[13px] text-text-primary outline-none focus:border-primary"
                    />
                  </label>
                  <label className="block text-[12px] font-medium text-text-secondary">
                    Preview text
                    <input
                      value={previewText}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setPreviewText(nextValue);
                        pushHistory({ name, subject, previewText: nextValue, blocks });
                      }}
                      placeholder="Say hello to a better customer journey."
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-border bg-surface px-3 text-[13px] text-text-primary outline-none focus:border-primary"
                    />
                  </label>
                </div>
              )}

              {panelTab === "style" && (
                <div className="space-y-3 text-[13px] text-text-secondary">
                  {selectedBlock ? (
                    <>
                      {selectedBlock.type === "heading" || selectedBlock.type === "text" || selectedBlock.type === "footer" ? (
                        <label className="block text-[12px] font-medium text-text-secondary">
                          Text color
                          <div className="mt-1.5 flex items-center gap-2 rounded-[8px] border border-border bg-surface px-2 py-1.5">
                            <input
                              type="color"
                              value={selectedBlock.color || "#10151C"}
                              onChange={(event) => updateSelectedBlock("color", event.target.value)}
                              className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                            />
                            <span className="text-[12px] text-text-primary">{selectedBlock.color || "#10151C"}</span>
                          </div>
                        </label>
                      ) : null}

                      {selectedBlock.type === "button" ? (
                        <div className="space-y-3">
                          <label className="block text-[12px] font-medium text-text-secondary">
                            Button color
                            <div className="mt-1.5 flex items-center gap-2 rounded-[8px] border border-border bg-surface px-2 py-1.5">
                              <input
                                type="color"
                                value={selectedBlock.backgroundColor || "#0B5FFF"}
                                onChange={(event) => updateSelectedBlock("backgroundColor", event.target.value)}
                                className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                              />
                              <span className="text-[12px] text-text-primary">{selectedBlock.backgroundColor || "#0B5FFF"}</span>
                            </div>
                          </label>
                          <label className="block text-[12px] font-medium text-text-secondary">
                            Label color
                            <div className="mt-1.5 flex items-center gap-2 rounded-[8px] border border-border bg-surface px-2 py-1.5">
                              <input
                                type="color"
                                value={selectedBlock.textColor || "#FFFFFF"}
                                onChange={(event) => updateSelectedBlock("textColor", event.target.value)}
                                className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                              />
                              <span className="text-[12px] text-text-primary">{selectedBlock.textColor || "#FFFFFF"}</span>
                            </div>
                          </label>
                        </div>
                      ) : null}

                      {selectedBlock.type === "image" ? (
                        <div className="rounded-[8px] border border-border bg-surface p-3 text-[12px] text-text-secondary">
                          Image blocks are best kept clean and high-contrast for email previews.
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="rounded-[8px] border border-dashed border-border bg-surface p-3 text-[12px] text-text-secondary">
                      Select a block to tune its appearance.
                    </div>
                  )}
                </div>
              )}

              {panelTab === "settings" && (
                <div className="space-y-3">
                  {renderInspectorFields(selectedBlock, updateSelectedBlock)}
                </div>
              )}

              {panelTab === "visibility" && (
                <div className="space-y-2 text-[13px] text-text-secondary">
                  <div className="flex items-center justify-between rounded-[8px] border border-border bg-surface p-2.5">
                    <span>Desktop preview</span>
                    <span className="inline-flex items-center gap-1 text-success"><Check size={14} /> On</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[8px] border border-border bg-surface p-2.5">
                    <span>Mobile preview</span>
                    <span className="inline-flex items-center gap-1 text-success"><Check size={14} /> On</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[8px] border border-border bg-surface p-2.5">
                    <span>Compliance footer</span>
                    <span className="inline-flex items-center gap-1 text-warning"><Check size={14} /> Required</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[10px] border border-border bg-surface-secondary p-3">
              <p className="text-[12px] font-semibold tracking-[0.02em] text-text-tertiary">VALIDATION</p>
              <p className="mt-2 text-[13px] text-text-secondary">{validationSummary}</p>
              <p className="mt-1 text-[12px] text-text-tertiary">{warningCount} warning{warningCount === 1 ? "" : "s"} · {suggestionCount} suggestion{suggestionCount === 1 ? "" : "s"}</p>

              {validationChecks.length > 0 && (
                <ul className="mt-3 space-y-2 text-[12px] text-text-secondary">
                  {validationChecks.map((check, index) => (
                    <li key={`${check.type}-${index}`} className="flex items-start gap-2 rounded-[8px] border border-border bg-surface px-2 py-1.5">
                      <span className={`mt-0.5 inline-block h-2 w-2 rounded-full ${check.type === "warning" ? "bg-warning" : "bg-primary"}`} />
                      <span>{check.message}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex gap-2">
                <Button type="button" variant="secondary" size="sm">View checks</Button>
                <Button type="button" variant="secondary" size="sm" onClick={applyValidationFix}>Fix issues</Button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 border-t border-border bg-surface/95 p-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-text-secondary">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-success" />
            {validationSummary}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm">View checks</Button>
            <Button type="button" variant="secondary" size="sm" onClick={applyValidationFix}>Fix issues</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => void duplicateCurrentTemplate()}>Duplicate template</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => void archiveCurrentTemplate()}>Archive template</Button>
            <Button type="button" variant="danger" size="sm" onClick={() => void deleteCurrentTemplate()}>Delete template</Button>
          </div>
        </div>
      </div>
    </div>
  );
}