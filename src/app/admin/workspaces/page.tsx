import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { listAllWorkspaces } from "@/lib/admin/queries";
import { formatNumber } from "@/lib/utils";

export default async function AdminWorkspacesPage() {
  const workspaces = await listAllWorkspaces();

  return (
    <div className="max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Workspaces</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">
          {formatNumber(workspaces.length)} workspaces shown (max 100).
        </p>
      </div>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>Workspace</TableHeadCell>
              <TableHeadCell>Plan</TableHeadCell>
              <TableHeadCell>Subscription</TableHeadCell>
              <TableHeadCell>Contacts</TableHeadCell>
              <TableHeadCell>Onboarding</TableHeadCell>
              <TableHeadCell>Created</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workspaces.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-medium text-text-primary">{w.name}</TableCell>
                <TableCell className="text-text-secondary">{w.planName ?? "—"}</TableCell>
                <TableCell>
                  {w.subStatus ? (
                    <Badge tone={w.subStatus === "ACTIVE" ? "success" : "warning"}>{w.subStatus}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-text-secondary">{formatNumber(w.contactCount)}</TableCell>
                <TableCell className="text-text-secondary">
                  {w.onboardingStep === "COMPLETE" ? (
                    <Badge tone="success">Complete</Badge>
                  ) : (
                    <Badge tone="warning">{w.onboardingStep}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-text-tertiary">{new Date(w.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
