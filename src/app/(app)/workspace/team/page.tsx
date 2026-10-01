import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";
import { db } from "@/db/client";
import { workspaceMembers, users } from "@/db/schema";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  // Real membership data — invites and role changes aren't built yet,
  // but the current member(s) shown here are genuine, not placeholder rows.
  const members = await db
    .select({ name: users.name, email: users.email, role: workspaceMembers.role, joinedAt: workspaceMembers.createdAt })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspace.id));

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Team</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">
          Members of this workspace. Invites and role management are coming soon.
        </p>
      </div>

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>Member</TableHeadCell>
              <TableHeadCell>Role</TableHeadCell>
              <TableHeadCell>Joined</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.email}>
                <TableCell>
                  <p className="font-medium text-text-primary">{m.name}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{m.email}</p>
                </TableCell>
                <TableCell>
                  <Badge tone="primary">{m.role}</Badge>
                </TableCell>
                <TableCell className="text-text-secondary">{new Date(m.joinedAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="flex flex-col items-center gap-2 py-10 text-center">
        <UsersRound size={22} className="text-text-tertiary" />
        <p className="text-[13px] text-text-secondary">Inviting teammates isn&apos;t available yet.</p>
      </Card>
    </div>
  );
}
