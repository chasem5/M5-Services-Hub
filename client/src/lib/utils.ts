import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (!value) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value));
}

export function formatShortCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export const STAGE_LABELS: Record<string, string> = {
  met_introduced: "Met / Introduced",
  new_lead: "Reached Out",
  in_conversation: "In Conversation",
  qualified: "Ready for Proposal",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
};

export const STAGE_COLORS_HEX: Record<string, string> = {
  met_introduced: "#94a3b8",
  new_lead: "#3b82f6",
  in_conversation: "#6366f1",
  qualified: "#8b5cf6",
  proposal_sent: "#a855f7",
  won: "#10b981",
  lost: "#ef4444",
};

export const SERVICE_TYPE_OPTIONS = [
  { value: "building_engineering", label: "Building Engineering", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "facility_solutions", label: "Facility Solutions", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "janitorial", label: "Janitorial", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "special_projects", label: "Special Projects", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "property_assessment", label: "Property Assessment", color: "bg-teal-100 text-teal-700 border-teal-200" },
] as const;
