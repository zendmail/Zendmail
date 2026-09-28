import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContactFilters } from "@/components/contacts/contact-filters";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { Pagination } from "@/components/contacts/pagination";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { listContacts, getWorkspaceContactCounts, type ContactStatusFilter, type ContactSort } from "@/lib/contacts";
import { formatNumber } from "@/lib/utils";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  const params = await searchParams;
  const search = params.q?.trim() ?? "";
  const status = (params.status as ContactStatusFilter) ?? "ALL";
  const sort = (params.sort as ContactSort) ?? "newest";
  const page = Number(params.page) || 1;

  const [{ rows, total, pageCount }, counts] = await Promise.all([
    listContacts(workspace.id, { search, status, sort, page }),
    getWorkspaceContactCounts(workspace.id),
  ]);

  function buildHref(nextPage: number) {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (status !== "ALL") qs.set("status", status);
    if (sort !== "newest") qs.set("sort", sort);
    if (nextPage > 1) qs.set("page", String(nextPage));
    const query = qs.toString();
    return `/contacts${query ? `?${query}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Contacts</h1>
          <p className="mt-1 text-[13.5px] text-text-secondary">
            {formatNumber(counts.total)} total · {formatNumber(counts.byStatus.CUSTOMER ?? 0)} customers ·{" "}
            {formatNumber(counts.byStatus.VIP ?? 0)} VIP
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/contacts/import">
            <Button variant="secondary">
              <Upload size={15} />
              Import CSV
            </Button>
          </Link>
          <Link href="/contacts/new">
            <Button>
              <Plus size={15} />
              Add contact
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="border-b border-border p-4">
          <ContactFilters search={search} status={status} sort={sort} />
        </div>
        <ContactsTable contacts={rows} />
        <Pagination page={page} pageCount={pageCount} buildHref={buildHref} />
      </Card>

      {total === 0 && (
        <p className="text-center text-[13px] text-text-tertiary">
          {search || status !== "ALL"
            ? "No contacts match your filters."
            : "You haven't added any contacts yet — add one manually or import a CSV to get started."}
        </p>
      )}
    </div>
  );
}
