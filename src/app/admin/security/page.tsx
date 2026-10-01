import { Card } from "@/components/ui/card";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { listSecurityEvents } from "@/lib/admin/queries";

const actionLabels: Record<string, string> = {
  "auth.password_reset_completed": "Password reset completed",
  "auth.password_reset_requested": "Password reset requested",
  "contact.unsubscribed": "Contact unsubscribed",
  "admin.user_suspended": "User suspended",
  "admin.user_reinstated": "User reinstated",
};

export default async function AdminSecurityPage() {
  const events = await listSecurityEvents();

  return (
    <div className="max-w-[1000px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Security</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">
          Security-relevant account events across the platform. Anomaly detection and abuse alerts are a planned
          upgrade — this view shows the real underlying event log today.
        </p>
      </div>

      <Card>
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-16 text-center">
            <p className="text-[14px] font-medium text-text-primary">No security events yet</p>
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Event</TableHeadCell>
                <TableHeadCell>User ID</TableHeadCell>
                <TableHeadCell>When</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-text-primary">{actionLabels[e.action] ?? e.action}</TableCell>
                  <TableCell className="text-text-tertiary font-mono text-xs">{e.userId ?? "—"}</TableCell>
                  <TableCell className="text-text-secondary">{new Date(e.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
