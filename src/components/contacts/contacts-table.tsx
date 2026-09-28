import Link from "next/link";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { ContactStatusBadge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { contacts as contactsTable } from "@/db/schema";

type Contact = typeof contactsTable.$inferSelect;

function displayName(c: Contact) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || "—";
}

export function ContactsTable({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
        <p className="text-[14px] font-medium text-text-primary">No contacts found</p>
        <p className="text-[13px] text-text-secondary">Try a different search or add your first contact.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeadCell>Contact</TableHeadCell>
          <TableHeadCell>Status</TableHeadCell>
          <TableHeadCell>Total spent</TableHeadCell>
          <TableHeadCell>Orders</TableHeadCell>
          <TableHeadCell>Last purchase</TableHeadCell>
          <TableHeadCell>Added</TableHeadCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {contacts.map((c) => (
          <TableRow key={c.id}>
            <TableCell>
              <Link href={`/contacts/${c.id}`} className="block hover:underline">
                <p className="font-medium text-text-primary">{displayName(c)}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{c.email}</p>
              </Link>
            </TableCell>
            <TableCell>
              <ContactStatusBadge status={c.status} />
            </TableCell>
            <TableCell className="text-text-secondary">{formatCurrency(Number(c.totalSpent))}</TableCell>
            <TableCell className="text-text-secondary">{c.totalOrders}</TableCell>
            <TableCell className="text-text-secondary">
              {c.lastPurchaseAt ? new Date(c.lastPurchaseAt).toLocaleDateString() : "—"}
            </TableCell>
            <TableCell className="text-text-tertiary">
              {new Date(c.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
