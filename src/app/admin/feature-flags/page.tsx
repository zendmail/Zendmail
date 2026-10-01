import { Card } from "@/components/ui/card";
import { db } from "@/db/client";
import { featureFlags } from "@/db/schema";
import { toggleFeatureFlagAction } from "@/lib/actions/admin-actions";

export default async function AdminFeatureFlagsPage() {
  const flags = await db.select().from(featureFlags).orderBy(featureFlags.key);

  return (
    <div className="max-w-[800px] space-y-6">
      <div>
        <h1 className="text-[24px] font-extrabold tracking-[-0.025em] text-text-primary">Feature flags</h1>
        <p className="mt-1 text-[13.5px] text-text-secondary">Toggle platform features without a deploy.</p>
      </div>

      <Card>
        <div className="divide-y divide-border">
          {flags.map((flag) => (
            <div key={flag.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-[13.5px] font-medium text-text-primary">{flag.name}</p>
                <p className="text-[12.5px] text-text-tertiary">{flag.description}</p>
              </div>
              <form action={toggleFeatureFlagAction}>
                <input type="hidden" name="flagId" value={flag.id} />
                <input type="hidden" name="nextValue" value={(!flag.enabled).toString()} />
                <button
                  type="submit"
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    flag.enabled ? "bg-primary" : "bg-surface-secondary"
                  }`}
                  aria-label={`Toggle ${flag.name}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      flag.enabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </form>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
