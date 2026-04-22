/**
 * Health Score Engine — Task #122
 *
 * Phase 1 (0–90 days from createdAt):  returns null score
 * Phase 2 (91–365 days):               scores but flags revenue/frequency as building_baseline
 * Phase 3 (365+ days):                 full scoring
 *
 * 6 components: jobFrequency, recency, revenue, emailEngagement, quoteAcceptance, margin
 */

import { db } from "./db";
import { eq, and, gte, lt, desc, sql } from "drizzle-orm";
import {
  clients,
  buildopsJobs,
  buildopsInvoices,
  buildopsAgreements,
  emailMessages,
  leads,
  meetings,
  customerHealthHistory,
  adminSettings,
  type CustomerHealthHistory,
} from "@shared/schema";

export interface HealthComponentResult {
  score: number; // 0–100 sub-score for this component
  weight: number;
  weighted: number;
  buildingBaseline?: boolean;
  detail?: Record<string, unknown>;
}

export interface HealthScoreBreakdown {
  phase: 1 | 2 | 3;
  totalScore: number | null;
  trend: "rising" | "flat" | "declining";
  components: {
    jobFrequency: HealthComponentResult;
    recency: HealthComponentResult;
    revenue: HealthComponentResult;
    emailEngagement: HealthComponentResult;
    quoteAcceptance: HealthComponentResult;
    margin: HealthComponentResult;
  };
  computedAt: string;
}

// ── Default weight/threshold config ─────────────────────────────────────────
const DEFAULT_SETTINGS: Record<string, string> = {
  // weights (must sum to 1.0)
  "health.weight.jobFrequency": "0.25",
  "health.weight.recency": "0.15",
  "health.weight.revenue": "0.25",
  "health.weight.emailEngagement": "0.10",
  "health.weight.quoteAcceptance": "0.15",
  "health.weight.margin": "0.10",
  // enabled flags
  "health.enabled.jobFrequency": "true",
  "health.enabled.recency": "true",
  "health.enabled.revenue": "true",
  "health.enabled.emailEngagement": "true",
  "health.enabled.quoteAcceptance": "true",
  "health.enabled.margin": "true",
  // thresholds
  "health.threshold.healthy": "70",
  "health.threshold.watch": "40",
  // trend sensitivity (points needed to show rising/declining)
  "health.trend.sensitivity": "5",
  // margin target (%)
  "health.target.margin": "30",
  // job frequency benchmarks (jobs per year)
  "health.target.industryJobFrequency": "6",
  "health.target.globalJobFrequency": "4",
};

async function loadSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(adminSettings);
  const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    merged[row.key] = row.value;
  }

  // Enforce: weights must sum to 1.0 (normalize if persisted settings are off)
  const weightKeys = [
    "health.weight.jobFrequency",
    "health.weight.recency",
    "health.weight.revenue",
    "health.weight.emailEngagement",
    "health.weight.quoteAcceptance",
    "health.weight.margin",
  ];
  const total = weightKeys.reduce((s, k) => s + parseFloat(merged[k] ?? "0"), 0);
  if (total > 0 && Math.abs(total - 1.0) > 0.001) {
    for (const k of weightKeys) {
      merged[k] = String(parseFloat(merged[k] ?? "0") / total);
    }
  }

  return merged;
}

const WEIGHT_KEYS = [
  "health.weight.jobFrequency",
  "health.weight.recency",
  "health.weight.revenue",
  "health.weight.emailEngagement",
  "health.weight.quoteAcceptance",
  "health.weight.margin",
] as const;

/**
 * Validate that a proposed set of weight values sums to 1.0 (±0.001).
 * Returns an error string if invalid, otherwise null.
 */
export function validateWeightsSum(weights: Record<string, string>): string | null {
  const total = WEIGHT_KEYS.reduce((s, k) => {
    const v = parseFloat(weights[k] ?? "0");
    return s + (isNaN(v) ? 0 : v);
  }, 0);
  if (Math.abs(total - 1.0) > 0.001) {
    return `Health score weights must sum to 1.0 (got ${total.toFixed(4)})`;
  }
  return null;
}

export async function seedDefaultAdminSettings(): Promise<void> {
  // Fail fast at startup if the built-in defaults are misconfigured
  const defaultWeightValues = Object.fromEntries(
    WEIGHT_KEYS.map((k) => [k, DEFAULT_SETTINGS[k] ?? "0"]),
  );
  const weightError = validateWeightsSum(defaultWeightValues);
  if (weightError) {
    throw new Error(`[health-score] Invalid DEFAULT_SETTINGS: ${weightError}`);
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
    if (existing.length === 0) {
      await db.insert(adminSettings).values({ key, value });
    }
  }
}

/**
 * Persist a single admin setting key/value, enforcing that if the key is a weight key
 * the full resulting weight set still sums to 1.0.
 * Throws if the new value would make weights diverge from 1.0.
 */
export async function saveAdminSetting(key: string, value: string): Promise<void> {
  if (WEIGHT_KEYS.includes(key as (typeof WEIGHT_KEYS)[number])) {
    const current = await loadSettings();
    const proposed: Record<string, string> = {};
    for (const wk of WEIGHT_KEYS) proposed[wk] = current[wk] ?? "0";
    proposed[key] = value;
    const err = validateWeightsSum(proposed);
    if (err) throw new Error(err);
  }
  const existing = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
  if (existing.length > 0) {
    await db.update(adminSettings).set({ value }).where(eq(adminSettings.key, key));
  } else {
    await db.insert(adminSettings).values({ key, value });
  }
}

// ── Phase computation ────────────────────────────────────────────────────────
export function computeCustomerPhase(createdAt: Date, now = new Date()): 1 | 2 | 3 {
  const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 90) return 1;
  if (diffDays <= 365) return 2;
  return 3;
}

// ── Trend from history ────────────────────────────────────────────────────────
// Compare current score against the rolling 30-day average from health history.
// This captures genuine momentum rather than a single prior-period snapshot.
async function computeTrend(
  clientId: number,
  currentScore: number,
  now = new Date(),
  sensitivity = 5,
): Promise<"rising" | "flat" | "declining"> {
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Collect all history records from the past 30 days (excluding today)
  const historyRows = await db
    .select({ score: customerHealthHistory.score })
    .from(customerHealthHistory)
    .where(
      and(
        eq(customerHealthHistory.customerId, clientId),
        gte(customerHealthHistory.recordedAt, thirtyDaysAgo),
        lt(customerHealthHistory.recordedAt, now),
      ),
    )
    .orderBy(desc(customerHealthHistory.recordedAt));

  if (historyRows.length === 0) {
    // Fall back to most recent snapshot before 30 days if no recent history
    const [priorSnapshot] = await db
      .select({ score: customerHealthHistory.score })
      .from(customerHealthHistory)
      .where(
        and(
          eq(customerHealthHistory.customerId, clientId),
          lt(customerHealthHistory.recordedAt, thirtyDaysAgo),
        ),
      )
      .orderBy(desc(customerHealthHistory.recordedAt))
      .limit(1);

    if (!priorSnapshot) return "flat";
    const diff = currentScore - priorSnapshot.score;
    if (diff >= sensitivity) return "rising";
    if (diff <= -sensitivity) return "declining";
    return "flat";
  }

  // Rolling 30-day average
  const rollingAvg = historyRows.reduce((sum, r) => sum + r.score, 0) / historyRows.length;
  const diff = currentScore - rollingAvg;
  if (diff >= sensitivity) return "rising";
  if (diff <= -sensitivity) return "declining";
  return "flat";
}

// ── Component: Job Frequency ─────────────────────────────────────────────────
async function scoreJobFrequency(
  clientId: number,
  phase: 1 | 2 | 3,
  repExpectedFreq: number | null,
  saContractActive: boolean,
  settings: Record<string, string>,
  now = new Date(),
): Promise<HealthComponentResult> {
  const weight = parseFloat(settings["health.weight.jobFrequency"] ?? "0.25");
  const buildingBaseline = phase === 2;

  // Count completed jobs in last 12 months
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const jobsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(buildopsJobs)
    .where(
      and(
        eq(buildopsJobs.clientId, clientId),
        gte(buildopsJobs.completedDate, twelveMonthsAgo),
      ),
    );
  const jobsLast12 = Number(jobsResult[0]?.count ?? 0);

  // Benchmark priority: rep_expected > SA (4/yr) > industry average (6/yr) > global default (4/yr)
  const industryAvgFreq = parseFloat(settings["health.target.industryJobFrequency"] ?? "6");
  const globalDefaultFreq = parseFloat(settings["health.target.globalJobFrequency"] ?? "4");
  let benchmark: number;
  if (repExpectedFreq != null && repExpectedFreq > 0) {
    benchmark = repExpectedFreq;
  } else if (saContractActive) {
    benchmark = 4; // SA customers expected 4+ jobs/yr per SLA
  } else if (industryAvgFreq > 0) {
    benchmark = industryAvgFreq; // industry average: 6/yr
  } else {
    benchmark = globalDefaultFreq; // global default: 4/yr
  }

  const ratio = jobsLast12 / benchmark;
  let score = Math.min(100, Math.round(ratio * 100));
  if (ratio >= 1) score = 100;
  else if (ratio >= 0.75) score = 80;
  else if (ratio >= 0.5) score = 60;
  else if (ratio >= 0.25) score = 30;
  else score = 0;

  return {
    score,
    weight,
    weighted: score * weight,
    buildingBaseline,
    detail: { jobsLast12, benchmark },
  };
}

// ── Component: Recency (last contact) ────────────────────────────────────────
async function scoreRecency(
  clientId: number,
  settings: Record<string, string>,
  now = new Date(),
): Promise<HealthComponentResult> {
  const weight = parseFloat(settings["health.weight.recency"] ?? "0.15");

  // Max of: last email, last job completed, last meeting
  const [lastEmail] = await db
    .select({ date: emailMessages.receivedAt })
    .from(emailMessages)
    .where(eq(emailMessages.clientId, clientId))
    .orderBy(desc(emailMessages.receivedAt))
    .limit(1);

  const [lastJob] = await db
    .select({ date: buildopsJobs.completedDate })
    .from(buildopsJobs)
    .where(and(eq(buildopsJobs.clientId, clientId)))
    .orderBy(desc(buildopsJobs.completedDate))
    .limit(1);

  const [lastMeeting] = await db
    .select({ date: meetings.date })
    .from(meetings)
    .where(eq(meetings.clientId, clientId))
    .orderBy(desc(meetings.date))
    .limit(1);

  const dates = [
    lastEmail?.date,
    lastJob?.date,
    lastMeeting?.date,
  ].filter(Boolean) as Date[];

  const lastContactDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

  let score: number;
  let daysSince: number | null = null;

  if (!lastContactDate) {
    score = 0;
  } else {
    daysSince = (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= 14) score = 100;
    else if (daysSince <= 30) score = 80;
    else if (daysSince <= 45) score = 60;
    else if (daysSince <= 60) score = 40;
    else if (daysSince <= 90) score = 20;
    else score = 0;
  }

  return {
    score,
    weight,
    weighted: score * weight,
    detail: { daysSinceContact: daysSince },
  };
}

// ── Component: Revenue vs Expected ─────────────────────────────────────────────
async function scoreRevenue(
  clientId: number,
  phase: 1 | 2 | 3,
  saContractValue: number | null,
  clientCreatedAt: Date,
  settings: Record<string, string>,
  now = new Date(),
): Promise<HealthComponentResult> {
  const weight = parseFloat(settings["health.weight.revenue"] ?? "0.25");
  const buildingBaseline = phase === 2;

  // Trailing 12-month invoice revenue
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const invResult = await db
    .select({ total: sql<string>`coalesce(sum(total_amount), 0)` })
    .from(buildopsInvoices)
    .where(
      and(
        eq(buildopsInvoices.clientId, clientId),
        gte(buildopsInvoices.issuedDate, twelveMonthsAgo),
      ),
    );
  const trailing12Revenue = parseFloat(invResult[0]?.total ?? "0");

  // Expected = SA contract value (annualised) || prior-year revenue (phase 3) || annualised Phase 2 months
  let expectedRevenue: number;
  if (saContractValue && saContractValue > 0) {
    expectedRevenue = saContractValue;
  } else if (phase === 3) {
    // For established clients compare current year vs prior year revenue to detect growth/churn
    const twentyFourMonthsAgo = new Date(now);
    twentyFourMonthsAgo.setFullYear(twentyFourMonthsAgo.getFullYear() - 2);
    const priorYearResult = await db
      .select({ total: sql<string>`coalesce(sum(total_amount), 0)` })
      .from(buildopsInvoices)
      .where(
        and(
          eq(buildopsInvoices.clientId, clientId),
          gte(buildopsInvoices.issuedDate, twentyFourMonthsAgo),
          lt(buildopsInvoices.issuedDate, twelveMonthsAgo),
        ),
      );
    const priorYearRevenue = parseFloat(priorYearResult[0]?.total ?? "0");
    // Use prior year as expected; fall back to global benchmark if no prior year data
    expectedRevenue = priorYearRevenue > 0 ? priorYearRevenue : 50000;
  } else if (phase === 2) {
    // Annualise using actual elapsed Phase 2 duration for this customer
    // Phase 2 starts at day 91 from createdAt
    const daysActive = (now.getTime() - clientCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    const phase2StartDay = 91;
    const daysInPhase2 = Math.max(1, daysActive - phase2StartDay);
    const monthsInPhase2 = daysInPhase2 / 30;
    expectedRevenue = monthsInPhase2 > 0 && trailing12Revenue > 0
      ? (trailing12Revenue / monthsInPhase2) * 12
      : 50000; // fallback: $50k expected
  } else {
    expectedRevenue = 50000; // fallback
  }

  let score: number;
  if (expectedRevenue <= 0) {
    score = 50; // neutral
  } else {
    const ratio = trailing12Revenue / expectedRevenue;
    if (ratio >= 1.1) score = 100;
    else if (ratio >= 0.9) score = 80;
    else if (ratio >= 0.7) score = 60;
    else if (ratio >= 0.5) score = 40;
    else if (ratio >= 0.25) score = 20;
    else score = 0;
  }

  return {
    score,
    weight,
    weighted: score * weight,
    buildingBaseline,
    detail: { trailing12Revenue, expectedRevenue },
  };
}

// ── Component: Email Engagement ───────────────────────────────────────────────
async function scoreEmailEngagement(
  clientId: number,
  settings: Record<string, string>,
  now = new Date(),
): Promise<HealthComponentResult> {
  const weight = parseFloat(settings["health.weight.emailEngagement"] ?? "0.10");

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Recent 30-day inbound count
  const [recent] = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(emailMessages)
    .where(
      and(
        eq(emailMessages.clientId, clientId),
        eq(emailMessages.direction, "inbound"),
        gte(emailMessages.receivedAt, thirtyDaysAgo),
      ),
    );

  // Prior 30-day inbound count (the customer's own baseline)
  const [prior] = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(emailMessages)
    .where(
      and(
        eq(emailMessages.clientId, clientId),
        eq(emailMessages.direction, "inbound"),
        gte(emailMessages.receivedAt, sixtyDaysAgo),
        lt(emailMessages.receivedAt, thirtyDaysAgo),
      ),
    );

  const recentCount = Number(recent?.cnt ?? 0);
  const priorCount = Number(prior?.cnt ?? 0);

  let score: number;
  if (priorCount === 0 && recentCount === 0) {
    score = 50; // no data — neutral
  } else if (priorCount === 0) {
    score = 80; // new emails when baseline was 0 = good
  } else {
    const ratio = recentCount / priorCount;
    if (ratio >= 1.0) score = 100;
    else if (ratio >= 0.75) score = 80;
    else if (ratio >= 0.5) score = 60;
    else if (ratio >= 0.25) score = 30;
    else score = 10;
  }

  return {
    score,
    weight,
    weighted: score * weight,
    detail: { recentEmails: recentCount, priorEmails: priorCount },
  };
}

// ── Component: Quote Win Rate ─────────────────────────────────────────────────
async function scoreQuoteAcceptance(
  clientId: number,
  settings: Record<string, string>,
  now = new Date(),
): Promise<HealthComponentResult> {
  const weight = parseFloat(settings["health.weight.quoteAcceptance"] ?? "0.15");

  // Last 12 months of leads for this client
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const allLeads = await db
    .select({ stage: leads.stage, wonAt: leads.wonAt })
    .from(leads)
    .where(
      and(
        eq(leads.clientId, clientId),
        gte(leads.createdAt, twelveMonthsAgo),
      ),
    );

  const closed = allLeads.filter((l) => l.stage === "won" || l.stage === "lost" || l.stage === "closed_lost");
  const won = closed.filter((l) => l.stage === "won");

  let score: number;
  if (closed.length === 0) {
    score = 50; // no data — neutral
  } else {
    const winRate = won.length / closed.length;
    if (winRate >= 0.6) score = 100;
    else if (winRate >= 0.4) score = 80;
    else if (winRate >= 0.25) score = 60;
    else if (winRate >= 0.1) score = 30;
    else score = 0;
  }

  return {
    score,
    weight,
    weighted: score * weight,
    detail: { closedDeals: closed.length, wonDeals: won.length },
  };
}

// ── Component: Margin ────────────────────────────────────────────────────────
async function scoreMargin(
  clientId: number,
  settings: Record<string, string>,
  now = new Date(),
): Promise<HealthComponentResult> {
  const weight = parseFloat(settings["health.weight.margin"] ?? "0.10");
  const targetMarginPct = parseFloat(settings["health.target.margin"] ?? "30");

  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

  const [marginResult] = await db
    .select({
      totalRevenue: sql<string>`coalesce(sum(total_amount), 0)`,
      totalCost: sql<string>`coalesce(sum(cost_amount), 0)`,
    })
    .from(buildopsJobs)
    .where(
      and(
        eq(buildopsJobs.clientId, clientId),
        gte(buildopsJobs.completedDate, twelveMonthsAgo),
      ),
    );

  const revenue = parseFloat(marginResult?.totalRevenue ?? "0");
  const cost = parseFloat(marginResult?.totalCost ?? "0");

  let score: number;
  let actualMarginPct: number | null = null;

  if (revenue <= 0) {
    score = 50; // no data — neutral
  } else {
    actualMarginPct = ((revenue - cost) / revenue) * 100;
    const ratio = actualMarginPct / targetMarginPct;
    if (ratio >= 1.1) score = 100;
    else if (ratio >= 0.9) score = 80;
    else if (ratio >= 0.7) score = 60;
    else if (ratio >= 0.5) score = 40;
    else if (ratio >= 0.25) score = 20;
    else score = 0;
  }

  return {
    score,
    weight,
    weighted: score * weight,
    detail: { actualMarginPct, targetMarginPct, revenue, cost },
  };
}

// ── Main scoring function ────────────────────────────────────────────────────
export async function computeHealthScore(clientId: number): Promise<HealthScoreBreakdown | null> {
  const now = new Date();
  const settings = await loadSettings();

  // Load client
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!client) return null;

  // Use the earliest available BuildOps activity date as the relationship anchor.
  // This prevents imported clients (whose DB createdAt = import date) from
  // being incorrectly classified as Phase 1 when they have years of job history.
  const [earliestJobRow] = await db
    .select({
      scheduledDate: buildopsJobs.scheduledDate,
      completedDate: buildopsJobs.completedDate,
    })
    .from(buildopsJobs)
    .where(
      and(
        eq(buildopsJobs.clientId, clientId),
        sql`COALESCE(${buildopsJobs.scheduledDate}, ${buildopsJobs.completedDate}) IS NOT NULL`,
      ),
    )
    .orderBy(sql`COALESCE(${buildopsJobs.scheduledDate}, ${buildopsJobs.completedDate}) ASC NULLS LAST`)
    .limit(1);

  const [earliestInvoiceRow] = await db
    .select({ issuedDate: buildopsInvoices.issuedDate })
    .from(buildopsInvoices)
    .where(
      and(
        eq(buildopsInvoices.clientId, clientId),
        sql`${buildopsInvoices.issuedDate} IS NOT NULL`,
      ),
    )
    .orderBy(buildopsInvoices.issuedDate)
    .limit(1);

  const candidateDates: number[] = [client.createdAt.getTime()];
  const jobDate = earliestJobRow?.scheduledDate ?? earliestJobRow?.completedDate;
  if (jobDate) candidateDates.push(new Date(jobDate).getTime());
  if (earliestInvoiceRow?.issuedDate) candidateDates.push(new Date(earliestInvoiceRow.issuedDate).getTime());

  const relationshipStart = new Date(Math.min(...candidateDates));

  const phase = computeCustomerPhase(relationshipStart, now);

  if (phase === 1) {
    return {
      phase: 1,
      totalScore: null,
      trend: "flat",
      components: buildNullComponents(settings),
      computedAt: now.toISOString(),
    };
  }

  // Check active SA
  const activeSAs = await db
    .select({ contractValue: buildopsAgreements.contractValue, annualContractValue: buildopsAgreements.annualContractValue })
    .from(buildopsAgreements)
    .where(
      and(
        eq(buildopsAgreements.clientId, clientId),
        eq(buildopsAgreements.status, "active"),
      ),
    );
  const hasSa = activeSAs.length > 0;
  const saContractValue = activeSAs.reduce((sum, sa) => {
    const v = parseFloat(sa.annualContractValue ?? sa.contractValue ?? "0");
    return sum + v;
  }, 0);

  // Check enabled flags before scoring (disabled components are excluded from computation)
  const enabledFlags: Record<string, boolean> = {
    jobFrequency: settings["health.enabled.jobFrequency"] !== "false",
    recency: settings["health.enabled.recency"] !== "false",
    revenue: settings["health.enabled.revenue"] !== "false",
    emailEngagement: settings["health.enabled.emailEngagement"] !== "false",
    quoteAcceptance: settings["health.enabled.quoteAcceptance"] !== "false",
    margin: settings["health.enabled.margin"] !== "false",
  };

  const [jf, rec, rev, email, quote, margin] = await Promise.all([
    scoreJobFrequency(clientId, phase, client.repExpectedJobFrequency ?? null, hasSa, settings, now),
    scoreRecency(clientId, settings, now),
    scoreRevenue(clientId, phase, saContractValue > 0 ? saContractValue : null, relationshipStart, settings, now),
    scoreEmailEngagement(clientId, settings, now),
    scoreQuoteAcceptance(clientId, settings, now),
    scoreMargin(clientId, settings, now),
  ]);

  const allComponents = { jobFrequency: jf, recency: rec, revenue: rev, emailEngagement: email, quoteAcceptance: quote, margin };

  // Only include enabled components; renormalize weights across active set
  const components = Object.fromEntries(
    Object.entries(allComponents).filter(([key]) => enabledFlags[key]),
  ) as typeof allComponents;

  const totalWeight = Object.values(components).reduce((s, c) => s + c.weight, 0);
  let totalScore = 0;
  for (const comp of Object.values(components)) {
    const normWeight = totalWeight > 0 ? comp.weight / totalWeight : 1 / Object.keys(components).length;
    totalScore += comp.score * normWeight;
  }
  totalScore = Math.round(Math.max(0, Math.min(100, totalScore)));

  const trendSensitivity = parseInt(settings["health.trend.sensitivity"] ?? "5", 10);
  const trend = await computeTrend(clientId, totalScore, now, trendSensitivity);

  return {
    phase,
    totalScore,
    trend,
    components,
    computedAt: now.toISOString(),
  };
}

function buildNullComponents(settings: Record<string, string>): Record<string, HealthComponentResult> {
  const weightKeys: Record<string, string> = {
    jobFrequency: "health.weight.jobFrequency",
    recency: "health.weight.recency",
    revenue: "health.weight.revenue",
    emailEngagement: "health.weight.emailEngagement",
    quoteAcceptance: "health.weight.quoteAcceptance",
    margin: "health.weight.margin",
  };
  const result: Record<string, HealthComponentResult> = {};
  for (const key of Object.keys(weightKeys)) {
    const weight = parseFloat(settings[weightKeys[key]] ?? "0");
    result[key] = { score: 0, weight, weighted: 0, buildingBaseline: false };
  }
  return result;
}

// ── Write results back to the clients table ───────────────────────────────────
export async function persistHealthScore(
  clientId: number,
  breakdown: HealthScoreBreakdown,
): Promise<void> {
  await db
    .update(clients)
    .set({
      customerPhase: breakdown.phase,
      healthScore: breakdown.totalScore,
      healthTrend: breakdown.totalScore === null ? null : breakdown.trend,
      healthScoreUpdatedAt: new Date(),
      healthScoreBreakdown: breakdown,
    })
    .where(eq(clients.id, clientId));
}

// ── Write monthly snapshot (idempotent) ───────────────────────────────────────
export async function persistMonthlySnapshot(
  clientId: number,
  score: number,
  trend: string,
  breakdown: HealthScoreBreakdown,
  now = new Date(),
): Promise<void> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [existing] = await db
    .select()
    .from(customerHealthHistory)
    .where(
      and(
        eq(customerHealthHistory.customerId, clientId),
        gte(customerHealthHistory.recordedAt, monthStart),
        lt(customerHealthHistory.recordedAt, monthEnd),
      ),
    );

  if (existing) return; // idempotent — skip if already recorded this month

  await db.insert(customerHealthHistory).values({
    customerId: clientId,
    score,
    trend,
    breakdown: breakdown,
    recordedAt: now,
  });
}

// ── Load admin settings for the API ──────────────────────────────────────────
export async function getAdminSettingsMap(): Promise<Record<string, string>> {
  return loadSettings();
}
