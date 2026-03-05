import { cn } from "@/lib/utils";

export type Tier = "tier_1" | "tier_2" | "tier_3";

export const TIER_LABELS: Record<Tier, string> = {
  tier_1: "Tier 1",
  tier_2: "Tier 2",
  tier_3: "Tier 3",
};

export const TIER_COLORS: Record<Tier, string> = {
  tier_1: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  tier_2: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  tier_3: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

interface TierBadgeProps {
  tier: string | null | undefined;
  className?: string;
  size?: "sm" | "xs";
}

export function TierBadge({ tier, className, size = "sm" }: TierBadgeProps) {
  if (!tier || !(tier in TIER_LABELS)) return null;
  const t = tier as Tier;
  return (
    <span
      className={cn(
        "inline-flex items-center border font-semibold rounded-full",
        size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5",
        TIER_COLORS[t],
        className
      )}
    >
      {TIER_LABELS[t]}
    </span>
  );
}

export function TierSelect({
  value,
  onChange,
  placeholder = "No Tier",
  className,
}: {
  value: string | null | undefined;
  onChange: (val: string | null) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn(
        "h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
    >
      <option value="">{placeholder}</option>
      <option value="tier_1">Tier 1</option>
      <option value="tier_2">Tier 2</option>
      <option value="tier_3">Tier 3</option>
    </select>
  );
}
