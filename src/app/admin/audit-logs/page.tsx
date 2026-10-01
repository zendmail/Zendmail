import { Card } from "@/components/ui/card";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { listRecentAuditLogs } from "@/lib/admin/queries";

export default async function AdminAuditLogsPage() {
  const logs = await listRecentAuditLogs(200);

  return (
    <div className="max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Audit logs</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">The most recent 200 events across all workspaces.</p>
      </div>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>Action</TableHeadCell>
              <TableHeadCell>User ID</TableHeadCell>
              <TableHeadCell>Workspace ID</TableHeadCell>
              <TableHeadCell>When</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium text-text-primary">{log.action}</TableCell>
                <TableCell className="font-mono text-xs text-text-tertiary">{log.userId ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs text-text-tertiary">{log.workspaceId ?? "—"}</TableCell>
                <TableCell className="text-text-secondary">{new Date(log.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
