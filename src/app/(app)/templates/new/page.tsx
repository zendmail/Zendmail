import { redirect } from "next/navigation";
import { TemplateBuilder } from "@/components/templates/template-builder";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspaceForUser } from "@/lib/workspace";

export default async function NewTemplatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspaceForUser(user.id);
  if (!workspace) redirect("/onboarding/create");

  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-[1480px]">
        <h1 className="text-[30px] font-bold tracking-[-0.03em] text-text-primary">Email builder</h1>
        <p className="mt-1 text-[15px] text-text-secondary">Create clear, branded emails that look great on every screen.</p>
      </div>
      <TemplateBuilder template={null} />
    </div>
  );
}
