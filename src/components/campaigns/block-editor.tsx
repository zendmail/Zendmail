"use client";

import * as React from "react";
import { useTransition } from "react";
import { ArrowUp, ArrowDown, GripVertical, LoaderCircle, Trash2, Type, Heading1, Image as ImageIcon, ImageUp, MousePointerClick, Minus, MoveVertical, FileText } from "lucide-react";
import {
  addBlockAction,
  removeBlockAction,
  moveBlockAction,
  reorderBlocksAction,
  updateBlockFieldAction,
} from "@/lib/actions/campaign-actions";
import type { EmailBlock } from "@/db/schema";
import { Input } from "@/components/auth/form-elements";
import { Button } from "@/components/ui/button";

const blockTypeMeta: { type: EmailBlock["type"]; label: string; icon: typeof Type }[] = [
  { type: "heading", label: "Heading", icon: Heading1 },
  { type: "text", label: "Text", icon: Type },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "button", label: "Button", icon: MousePointerClick },
  { type: "divider", label: "Divider", icon: Minus },
  { type: "spacer", label: "Spacer", icon: MoveVertical },
  { type: "footer", label: "Footer", icon: FileText },
];

function useFieldSave(campaignId: string, blockId: string) {
  const [, startTransition] = useTransition();
  return (field: string, value: string) => {
    const fd = new FormData();
    fd.set("campaignId", campaignId);
    fd.set("blockId", blockId);
    fd.set("field", field);
    fd.set("value", value);
    startTransition(() => {
      updateBlockFieldAction(fd);
    });
  };
}

function BlockColorField({
  label,
  value,
  defaultValue,
  onSave,
}: {
  label: string;
  value: string | undefined;
  defaultValue: string;
  onSave: (value: string) => void;
}) {
  const color = value ?? defaultValue;
  return (
    <label className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-[12px] font-medium text-text-secondary">
      <span>{label}</span>
      <input
        type="color"
        defaultValue={color}
        onBlur={(event) => {
          if (event.currentTarget.value !== color) onSave(event.currentTarget.value);
        }}
        aria-label={label}
        className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <span className="font-mono text-[11px] text-text-tertiary">{color.toUpperCase()}</span>
    </label>
  );
}

function ImageBlockFields({ campaignId, block }: { campaignId: string; block: Extract<EmailBlock, { type: "image" }> }) {
  const save = useFieldSave(campaignId, block.id);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [url, setUrl] = React.useState(block.url);
  const [uploading, setUploading] = React.useState(false);
  const [uploadMessage, setUploadMessage] = React.useState("");
  const [uploadError, setUploadError] = React.useState("");

  async function uploadImage(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Choose an image smaller than 10 MB.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadMessage("");
    try {
      const signatureResponse = await fetch("/api/uploads/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, contentType: file.type, fileSize: file.size }),
      });
      const uploadInfo = await signatureResponse.json() as {
        error?: string;
        uploadUrl?: string;
        fields?: Record<string, string>;
        imageUrl?: string;
      };
      if (!signatureResponse.ok || !uploadInfo.uploadUrl || !uploadInfo.fields || !uploadInfo.imageUrl) {
        throw new Error(uploadInfo.error || "Could not prepare the upload.");
      }

      const formData = new FormData();
      Object.entries(uploadInfo.fields).forEach(([name, value]) => formData.append(name, value));
      formData.append("file", file);
      const uploadResponse = await fetch(uploadInfo.uploadUrl, { method: "POST", body: formData });
      if (!uploadResponse.ok) throw new Error("Image upload failed. Please try again.");

      setUrl(uploadInfo.imageUrl);
      save("url", uploadInfo.imageUrl);
      setUploadMessage("Image uploaded and saved to this block.");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onBlur={(event) => save("url", event.target.value)}
          placeholder="Image URL"
          aria-label="Image URL"
        />
        <Input defaultValue={block.alt} onBlur={(event) => save("alt", event.target.value)} placeholder="Alt text" aria-label="Image alt text" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          aria-label="Choose an image from your device"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void uploadImage(file);
          }}
        />
        <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          {uploading ? <LoaderCircle size={14} className="animate-spin" /> : <ImageUp size={14} />}
          {uploading ? "Uploading..." : "Choose image"}
        </Button>
        <span className="text-[11px] text-text-tertiary">JPG, PNG, WebP or GIF · up to 10 MB</span>
      </div>
      {uploadMessage && <p role="status" className="text-[12px] text-success">{uploadMessage}</p>}
      {uploadError && <p role="alert" className="text-[12px] text-danger">{uploadError}</p>}
    </div>
  );
}

function BlockFields({ campaignId, block }: { campaignId: string; block: EmailBlock }) {
  const save = useFieldSave(campaignId, block.id);

  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-2">
          <Input defaultValue={block.text} onBlur={(e) => save("text", e.target.value)} placeholder="Headline" />
          <BlockColorField label="Text color" value={block.color} defaultValue="#10151C" onSave={(value) => save("color", value)} />
        </div>
      );
    case "text":
      return (
        <div className="space-y-2">
          <textarea
            defaultValue={block.html}
            onBlur={(e) => save("html", e.target.value)}
            rows={3}
            className="h-auto w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[13.5px] text-text-primary outline-none focus:border-primary"
            placeholder="<p>Write your message…</p>"
          />
          <BlockColorField label="Text color" value={block.color} defaultValue="#10151C" onSave={(value) => save("color", value)} />
        </div>
      );
    case "image":
      return <ImageBlockFields campaignId={campaignId} block={block} />;
    case "button":
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input defaultValue={block.label} onBlur={(e) => save("label", e.target.value)} placeholder="Button label" />
            <Input defaultValue={block.url} onBlur={(e) => save("url", e.target.value)} placeholder="Link URL" />
          </div>
          <div className="flex flex-wrap gap-2">
            <BlockColorField label="Button" value={block.backgroundColor} defaultValue="#4F46E5" onSave={(value) => save("backgroundColor", value)} />
            <BlockColorField label="Text" value={block.textColor} defaultValue="#FFFFFF" onSave={(value) => save("textColor", value)} />
          </div>
        </div>
      );
    case "spacer":
      return (
        <Input
          type="number"
          defaultValue={block.height}
          onBlur={(e) => save("height", e.target.value)}
          placeholder="Height (px)"
          className="w-32"
        />
      );
    case "footer":
      return (
        <div className="space-y-2">
          <textarea
            defaultValue={block.text}
            onBlur={(e) => save("text", e.target.value)}
            rows={2}
            className="h-auto w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[13px] text-text-primary outline-none focus:border-primary"
          />
          <BlockColorField label="Text color" value={block.color} defaultValue="#8890A0" onSave={(value) => save("color", value)} />
        </div>
      );
    case "divider":
      return <p className="text-[12.5px] text-text-tertiary">A horizontal divider line.</p>;
  }
}

export function BlockEditor({ campaignId, blocks }: { campaignId: string; blocks: EmailBlock[] }) {
  const [orderedBlockIds, setOrderedBlockIds] = React.useState<string[] | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [, startTransition] = useTransition();
  const hasValidLocalOrder = orderedBlockIds?.length === blocks.length && orderedBlockIds.every((id) => blocks.some((block) => block.id === id));
  const orderedBlocks = hasValidLocalOrder
    ? orderedBlockIds.map((id) => blocks.find((block) => block.id === id)!)
    : blocks;

  function handleDrop(event: React.DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) return;

    const reordered = [...orderedBlocks];
    const sourceIndex = reordered.findIndex((block) => block.id === sourceId);
    const targetIndex = reordered.findIndex((block) => block.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const [movedBlock] = reordered.splice(sourceIndex, 1);
    const insertionIndex = reordered.findIndex((block) => block.id === targetId);
    reordered.splice(insertionIndex, 0, movedBlock);
    setOrderedBlockIds(reordered.map((block) => block.id));

    const formData = new FormData();
    formData.set("campaignId", campaignId);
    formData.set("orderedBlockIds", JSON.stringify(reordered.map((block) => block.id)));
    startTransition(() => reorderBlocksAction(formData));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {orderedBlocks.map((block, index) => {
          const meta = blockTypeMeta.find((m) => m.type === block.type)!;
          const Icon = meta.icon;
          return (
            <div
              key={block.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, block.id)}
              className={`rounded-[var(--radius-md)] border border-border p-3 transition-colors ${draggingId === block.id ? "opacity-50" : ""}`}
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-text-tertiary">
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", block.id);
                      setDraggingId(block.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    aria-label={`Drag ${meta.label} block to reorder`}
                    title="Drag to reorder"
                    className="cursor-grab touch-none rounded text-text-tertiary hover:text-text-primary active:cursor-grabbing"
                  >
                    <GripVertical size={14} />
                  </button>
                  <Icon size={13} />
                  {meta.label}
                </span>
                <div className="flex items-center gap-1">
                  <form action={moveBlockAction}>
                    <input type="hidden" name="campaignId" value={campaignId} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={index === 0}
                      onClick={() => setOrderedBlockIds(null)}
                      className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-surface-secondary disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp size={12} />
                    </button>
                  </form>
                  <form action={moveBlockAction}>
                    <input type="hidden" name="campaignId" value={campaignId} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={index === blocks.length - 1}
                      onClick={() => setOrderedBlockIds(null)}
                      className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-surface-secondary disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </form>
                  <form action={removeBlockAction} onSubmit={() => setOrderedBlockIds(null)}>
                    <input type="hidden" name="campaignId" value={campaignId} />
                    <input type="hidden" name="blockId" value={block.id} />
                    <button
                      type="submit"
                      className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-danger-surface hover:text-danger"
                      aria-label="Delete block"
                    >
                      <Trash2 size={12} />
                    </button>
                  </form>
                </div>
              </div>
              <BlockFields campaignId={campaignId} block={block} />
            </div>
          );
        })}

        {blocks.length === 0 && (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border p-6 text-center text-[13px] text-text-tertiary">
            Start from a template above, or add blocks below.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
        {blockTypeMeta.map((meta) => {
          const Icon = meta.icon;
          return (
            <form key={meta.type} action={addBlockAction} onSubmit={() => setOrderedBlockIds(null)}>
              <input type="hidden" name="campaignId" value={campaignId} />
              <input type="hidden" name="blockType" value={meta.type} />
              <Button type="submit" variant="secondary" size="sm">
                <Icon size={13} />
                {meta.label}
              </Button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
