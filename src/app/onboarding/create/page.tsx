import { createWorkspaceAction } from "@/lib/actions/onboarding-actions";

// No UI needed here — this step is a pure side effect (create the
// workspace shell + free subscription) that always redirects onward.
export default async function CreateWorkspacePage() {
  await createWorkspaceAction();
  return null;
}
