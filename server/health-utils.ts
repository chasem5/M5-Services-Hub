export function computeVelocityDirection(last90: number, prior90: number): "growing" | "flat" | "declining" {
  if (prior90 === 0 && last90 === 0) return "flat";
  if (prior90 === 0) return "growing";
  const ratio = last90 / prior90;
  if (ratio >= 1.15) return "growing";
  if (ratio <= 0.85) return "declining";
  return "flat";
}

export function computeInvoiceTrend(
  monthlyAmounts: { month: string; total: number }[],
  referenceDate?: Date,
): { invoiceTrend: "growing" | "flat" | "declining"; last3Avg: number; prior3Avg: number } {
  const amountMap = new Map(monthlyAmounts.map(r => [r.month, r.total]));
  const ref = referenceDate ?? new Date();
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const prior3 = months.slice(0, 3).map(m => amountMap.get(m) ?? 0);
  const last3 = months.slice(3).map(m => amountMap.get(m) ?? 0);
  const prior3Avg = prior3.reduce((a, b) => a + b, 0) / 3;
  const last3Avg = last3.reduce((a, b) => a + b, 0) / 3;
  let invoiceTrend: "growing" | "flat" | "declining";
  if (prior3Avg === 0 && last3Avg === 0) {
    invoiceTrend = "flat";
  } else if (prior3Avg === 0) {
    invoiceTrend = "growing";
  } else {
    const ratio = last3Avg / prior3Avg;
    if (ratio >= 1.15) invoiceTrend = "growing";
    else if (ratio <= 0.85) invoiceTrend = "declining";
    else invoiceTrend = "flat";
  }
  return { invoiceTrend, last3Avg, prior3Avg };
}

export function computeHealthScoreV2(
  velocityDirection: string,
  openDeals: number,
  hasActiveSA: boolean,
  ltv: number,
  invoiceTrend: "growing" | "flat" | "declining" = "flat",
  emailResponseRate: number | null = null,
  healthOverride?: string | null,
  jobsLast6Months: number = -1,
  jobsLast12Months: number = -1,
): { healthScore: number; healthStatus: "healthy" | "watch" | "at_risk"; isOverridden: boolean } {
  if (healthOverride === "healthy") return { healthScore: 6, healthStatus: "healthy", isOverridden: true };
  if (healthOverride === "watch")   return { healthScore: 3, healthStatus: "watch",   isOverridden: true };
  if (healthOverride === "at_risk") return { healthScore: 0, healthStatus: "at_risk", isOverridden: true };

  let healthScore = 0;
  if (hasActiveSA) healthScore += 1;
  if (invoiceTrend === "growing") healthScore += 2;
  else if (invoiceTrend === "flat") healthScore += 1;
  if (velocityDirection === "growing" || velocityDirection === "flat") healthScore += 1;
  if (openDeals > 0) healthScore += 1;
  if (ltv >= 25000) healthScore += 1;
  if (emailResponseRate !== null && emailResponseRate < 25) healthScore -= 1;
  healthScore = Math.max(0, healthScore);
  let healthStatus: "healthy" | "watch" | "at_risk" = healthScore >= 4 ? "healthy" : healthScore >= 2 ? "watch" : "at_risk";

  if (jobsLast6Months !== -1 && jobsLast6Months === 0) {
    healthScore = Math.max(0, healthScore - 1);
    const rawStatus: "healthy" | "watch" | "at_risk" = healthScore >= 4 ? "healthy" : healthScore >= 2 ? "watch" : "at_risk";
    healthStatus = rawStatus === "healthy" ? "watch" : rawStatus;
  }
  if (jobsLast12Months !== -1 && jobsLast12Months === 0 && !hasActiveSA) {
    healthStatus = "at_risk"; healthScore = Math.min(healthScore, 1);
  }

  return { healthScore, healthStatus, isOverridden: false };
}
