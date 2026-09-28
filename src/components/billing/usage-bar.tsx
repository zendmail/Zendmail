import { formatNumber } from "@/lib/utils";

export function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const nearLimit = limit ? used / limit > 0.9 : false;

  return (
    <div>
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-text-primary">{label}</span>
        <span className="text-text-secondary">
          {formatNumber(used)} {limit ? `/ ${formatNumber(limit)}` : "· unlimited"}
        </span>
      </div>
      {limit && (
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-secondary">
          <div
            className={`h-1.5 rounded-full ${nearLimit ? "bg-warning" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
