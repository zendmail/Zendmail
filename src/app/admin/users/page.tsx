import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { listAllUsers } from "@/lib/admin/queries";
import { suspendUserAction, reinstateUserAction } from "@/lib/actions/admin-actions";
import { formatNumber } from "@/lib/utils";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const users = await listAllUsers(q);

  return (
    <div className="max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Users</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">{formatNumber(users.length)} users shown (max 100).</p>
      </div>

      <form method="GET" className="max-w-xs">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name or email…"
          className="h-9 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-[13.5px] outline-none focus:border-primary"
        />
      </form>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>User</TableHeadCell>
              <TableHeadCell>Role</TableHeadCell>
              <TableHeadCell>Verified</TableHeadCell>
              <TableHeadCell>Workspaces</TableHeadCell>
              <TableHeadCell>Joined</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium text-text-primary">{u.name}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{u.email}</p>
                </TableCell>
                <TableCell>
                  <Badge tone={u.role === "ADMIN" ? "primary" : "neutral"}>{u.role}</Badge>
                </TableCell>
                <TableCell className="text-text-secondary">{u.emailVerifiedAt ? "Yes" : "No"}</TableCell>
                <TableCell className="text-text-secondary">{u.workspaceCount}</TableCell>
                <TableCell className="text-text-tertiary">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge tone={u.suspendedAt ? "danger" : "success"}>{u.suspendedAt ? "Suspended" : "Active"}</Badge>
                </TableCell>
                <TableCell>
                  {u.suspendedAt ? (
                    <form action={reinstateUserAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button type="submit" className="text-[12.5px] font-medium text-primary hover:underline">
                        Reinstate
                      </button>
                    </form>
                  ) : (
                    <form action={suspendUserAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button type="submit" className="text-[12.5px] font-medium text-danger hover:underline">
                        Suspend
                      </button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
