import { Search } from "lucide-react";
import { Select } from "@/components/auth/select";
import type { ContactStatusFilter, ContactSort } from "@/lib/contacts";

const statusOptions: { value: ContactStatusFilter; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "SUBSCRIBER", label: "Subscriber" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "LEAD", label: "Lead" },
  { value: "VIP", label: "VIP" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "UNSUBSCRIBED", label: "Unsubscribed" },
  { value: "BOUNCED", label: "Bounced" },
];

const sortOptions: { value: ContactSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "total_spent", label: "Total spent" },
];

export function ContactFilters({
  search,
  status,
  sort,
}: {
  search: string;
  status: ContactStatusFilter;
  sort: ContactSort;
}) {
  return (
    <form className="flex flex-col gap-2.5 sm:flex-row sm:items-center" method="GET">
      <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-1.5 text-text-tertiary sm:w-72">
        <Search size={15} />
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search name or email…"
          className="w-full bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary outline-none"
        />
      </div>
      <Select name="status" defaultValue={status} className="sm:w-44">
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Select name="sort" defaultValue={sort} className="sm:w-40">
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <button
        type="submit"
        className="h-9 rounded-[var(--radius-sm)] border border-border px-3.5 text-[13px] font-medium text-text-secondary hover:bg-surface-secondary sm:w-auto"
      >
        Apply
      </button>
    </form>
  );
}
