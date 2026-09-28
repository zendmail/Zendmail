import { X, Tag as TagIcon } from "lucide-react";
import { addTagToContactAction, removeTagFromContactAction } from "@/lib/actions/contact-actions";

export function TagManager({
  contactId,
  tags,
}: {
  contactId: string;
  tags: { id: string; name: string; color: string }[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && <p className="text-[12.5px] text-text-tertiary">No tags yet.</p>}
        {tags.map((tag) => (
          <form key={tag.id} action={removeTagFromContactAction} className="inline-flex">
            <input type="hidden" name="contactId" value={contactId} />
            <input type="hidden" name="tagId" value={tag.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-full bg-primary-surface px-2.5 py-1 text-xs font-medium text-primary hover:opacity-80"
            >
              <TagIcon size={11} />
              {tag.name}
              <X size={11} />
            </button>
          </form>
        ))}
      </div>
      <form action={addTagToContactAction} className="flex gap-2">
        <input type="hidden" name="contactId" value={contactId} />
        <input
          type="text"
          name="tagName"
          placeholder="Add a tag…"
          className="h-8 flex-1 rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 text-[12.5px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="h-8 rounded-[var(--radius-sm)] border border-border px-3 text-[12.5px] font-medium text-text-secondary hover:bg-surface-secondary"
        >
          Add
        </button>
      </form>
    </div>
  );
}
