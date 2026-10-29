"use client";

import * as React from "react";
import { closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import type { EmailBlock } from "@/db/schema";
import { labelFor, summaryFor } from "@/lib/email-builder/catalog";
import { BLOCK_ICONS } from "./block-icons";
import { IconBtn } from "./fields";

type RowProps = { block: EmailBlock; selected: boolean; onSelect: () => void; onDuplicate: () => void; onRemove: () => void; overlay?: boolean };

function RowBody({ block, selected, onSelect, onDuplicate, onRemove, handle, overlay }: RowProps & { handle?: React.HTMLAttributes<HTMLButtonElement> }) {
  const Icon = BLOCK_ICONS[block.type];
  const summary = summaryFor(block);
  return (
    <div className={`group flex items-center gap-1 rounded-[10px] border px-1.5 py-1.5 transition-[background-color,border-color,box-shadow] duration-150 ${selected ? "border-primary/40 bg-primary-surface" : "border-transparent hover:bg-surface-secondary"} ${overlay ? "border-border bg-surface shadow-[var(--shadow-lg)]" : ""}`}>
      <button type="button" aria-label={`Drag to reorder ${labelFor(block.type)}`} className="grid h-7 w-5 shrink-0 cursor-grab touch-none place-items-center rounded text-text-tertiary opacity-60 hover:opacity-100 active:cursor-grabbing group-hover:opacity-100" {...handle}>
        <GripVertical size={14} />
      </button>
      <button type="button" onClick={onSelect} aria-current={selected} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-[7px] border ${selected ? "border-primary/30 bg-surface text-primary" : "border-border bg-surface text-text-secondary"}`}><Icon size={14} /></span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium leading-4 text-text-primary">{labelFor(block.type)}</span>
          {summary && <span className="mt-0.5 block truncate text-[11.5px] leading-4 text-text-tertiary">{summary}</span>}
        </span>
      </button>
      {!overlay && (
        <span className="flex shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <IconBtn label="Duplicate" onClick={onDuplicate}><Copy size={13} /></IconBtn>
          <IconBtn label="Delete" danger onClick={onRemove}><Trash2 size={13} /></IconBtn>
        </span>
      )}
    </div>
  );
}

function SortableRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.block.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }} data-block-row={props.block.id}>
      <RowBody {...props} handle={{ ...attributes, ...listeners }} />
    </li>
  );
}

export function Outline({ blocks, selectedId, onSelect, onMove, onDuplicate, onRemove, onAdd }: {
  blocks: EmailBlock[]; selectedId: string | null; onSelect: (id: string) => void;
  onMove: (id: string, toIndex: number) => void; onDuplicate: (id: string) => void; onRemove: (id: string) => void; onAdd: () => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const ids = blocks.map((b) => b.id);
  const active = blocks.find((b) => b.id === activeId);

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    onMove(String(e.active.id), arrayMove(ids, from, to).indexOf(String(e.active.id)));
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragStart={(e: DragStartEvent) => { setActiveId(String(e.active.id)); onSelect(String(e.active.id)); }} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-0.5" aria-label="Email sections">
            {blocks.map((b) => (
              <SortableRow key={b.id} block={b} selected={b.id === selectedId} onSelect={() => onSelect(b.id)} onDuplicate={() => onDuplicate(b.id)} onRemove={() => onRemove(b.id)} />
            ))}
          </ul>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 180 }}>{active ? <RowBody block={active} selected={false} overlay onSelect={() => {}} onDuplicate={() => {}} onRemove={() => {}} /> : null}</DragOverlay>
      </DndContext>
      {blocks.length === 0 && <p className="px-2 py-6 text-center text-[12.5px] text-text-tertiary">This email is empty. Add your first section.</p>}
      <button type="button" onClick={onAdd} className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-border-strong text-[13px] font-medium text-text-secondary transition-colors hover:border-primary hover:bg-primary-surface hover:text-primary">
        <Plus size={14} /> Add section
      </button>
    </div>
  );
}
