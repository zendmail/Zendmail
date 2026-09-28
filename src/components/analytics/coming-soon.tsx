import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-2 py-16 text-center">
      <Icon size={28} className="text-text-tertiary" />
      <p className="text-[14px] font-medium text-text-primary">{title}</p>
      <p className="max-w-sm text-[13px] text-text-secondary">{description}</p>
    </Card>
  );
}
