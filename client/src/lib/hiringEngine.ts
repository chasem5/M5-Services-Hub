// ─── Hiring Decision Engine ────────────────────────────────────────────────
// Pure scoring functions for the Crew Capacity hiring recommendation.
// All thresholds are passed in — nothing hardcoded.
// Used by ceo-command-center.tsx; thresholds stored via useHiringThresholds().

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export type HiringLevel = "healthy" | "monitor" | "prepare" | "hire";
export type TrendDirection = "rising" | "flat" | "falling";

export interface HiringThresholds {
  utilWarn: number;       // default 85 — rolling util% that triggers monitor
  utilCritical: number;   // default 90 — rolling util% that triggers prepare/hire
  fwdWarn: number;        // default 4  — consecutive forward-booked weeks that triggers monitor
  fwdCritical: number;    // default 5  — consecutive forward-booked weeks that triggers prepare
  otWarn: number;         // default 5  — overtime % that triggers monitor
  otCritical: number;     // default 10 — overtime % that triggers prepare/hire
  weeksRequired: number;  // default 3  — # of the last 4 past weeks that must exceed threshold to escalate
}

export const DEFAULT_HIRING_THRESHOLDS: HiringThresholds = {
  utilWarn: 85,
  utilCritical: 90,
  fwdWarn: 4,
  fwdCritical: 5,
  otWarn: 5,
  otCritical: 10,
  weeksRequired: 3,
};

const LS_KEY = "m5-hiring-thresholds";

export interface TrendWeek {
  utilPct: number;
  scheduledHrs: number;
  visitCount?: number;
  isFuture: boolean;
  label: string;
}

export interface SignalScores {
  overall: HiringLevel;
  utilLevel: HiringLevel;
  fwdLevel: HiringLevel;
  otLevel: HiringLevel;
  stressLevel: HiringLevel;
  trendLevel: HiringLevel;
}

// ── Scoring helpers ────────────────────────────────────────────────────────

/** How many of the last `lookback` PAST weeks had utilPct ≥ threshold */
export function computePersistence(
  weeks: TrendWeek[],
  threshold: number,
  lookback = 4
): number {
  const past = weeks.filter(w => !w.isFuture).slice(-lookback);
  return past.filter(w => w.utilPct >= threshold).length;
}

/** Rising: second half of past weeks avg > first half by >5pp; Falling: reverse; else Flat */
export function computeTrendDirection(weeks: TrendWeek[]): TrendDirection {
  const past = weeks.filter(w => !w.isFuture);
  if (past.length < 4) return "flat";
  const half = Math.floor(past.length / 2);
  const first = past.slice(0, half);
  const second = past.slice(half);
  const avg1 = first.reduce((s, w) => s + w.utilPct, 0) / first.length;
  const avg2 = second.reduce((s, w) => s + w.utilPct, 0) / second.length;
  if (avg2 - avg1 > 5) return "rising";
  if (avg1 - avg2 > 5) return "falling";
  return "flat";
}

/** Score all 5 signals and compute the composite recommendation level */
export function scoreSignals(
  inputs: {
    rollingAvgUtilization: number;
    forwardBookedWeeks: number;
    overtimeRatePct: number;
    actualHrs4wk: number;
    scheduledHrs4wk: number;
    weeks: TrendWeek[];
  },
  thresholds: HiringThresholds
): SignalScores {
  const { utilWarn, utilCritical, fwdWarn, fwdCritical, otWarn, otCritical, weeksRequired } = thresholds;

  const utilLevel: HiringLevel =
    inputs.rollingAvgUtilization >= utilCritical ? "prepare" :
    inputs.rollingAvgUtilization >= utilWarn ? "monitor" : "healthy";

  const fwdLevel: HiringLevel =
    inputs.forwardBookedWeeks >= fwdCritical ? "prepare" :
    inputs.forwardBookedWeeks >= fwdWarn ? "monitor" : "healthy";

  const otLevel: HiringLevel =
    inputs.overtimeRatePct >= otCritical ? "prepare" :
    inputs.overtimeRatePct >= otWarn ? "monitor" : "healthy";

  // Actual-vs-scheduled stress: if crew worked >5% more than scheduled = stress
  const hasStress =
    inputs.scheduledHrs4wk > 0 &&
    inputs.actualHrs4wk > 0 &&
    (inputs.actualHrs4wk / inputs.scheduledHrs4wk) > 1.05;
  const stressLevel: HiringLevel = hasStress ? "monitor" : "healthy";

  const trend = computeTrendDirection(inputs.weeks);
  const trendLevel: HiringLevel = trend === "rising" ? "monitor" : "healthy";

  // Persistence check — how many of last 4 weeks exceeded warn threshold
  const persistenceWarn = computePersistence(inputs.weeks, utilWarn);
  const sustainedOverWarn = persistenceWarn >= weeksRequired;

  // Count signals by severity
  const levels: HiringLevel[] = [utilLevel, fwdLevel, otLevel, stressLevel, trendLevel];
  const criticals = levels.filter(l => l === "prepare" || l === "hire").length;
  const warnings = levels.filter(l => l === "monitor").length;

  let overall: HiringLevel;
  if (criticals >= 3 && sustainedOverWarn) {
    overall = "hire";
  } else if (criticals >= 2 || (criticals >= 1 && trend === "rising")) {
    overall = "prepare";
  } else if (warnings >= 2 || criticals >= 1) {
    overall = "monitor";
  } else {
    overall = "healthy";
  }

  return { overall, utilLevel, fwdLevel, otLevel, stressLevel, trendLevel };
}

/** Build the top 3 plain-English reasons driving the recommendation */
export function buildRecommendationReasons(
  scores: SignalScores,
  inputs: {
    rollingAvgUtilization: number;
    forwardBookedWeeks: number;
    overtimeRatePct: number;
    actualHrs4wk: number;
    scheduledHrs4wk: number;
  },
  thresholds: HiringThresholds,
  trend: TrendDirection,
  persistenceWarn: number
): string[] {
  const reasons: string[] = [];

  if (scores.fwdLevel !== "healthy") {
    reasons.push(
      inputs.forwardBookedWeeks >= thresholds.fwdCritical
        ? `Backlog is growing — forward schedule is at ${inputs.forwardBookedWeeks} weeks, above the ${thresholds.fwdCritical}-week critical threshold`
        : `Forward schedule at ${inputs.forwardBookedWeeks} weeks — approaching the critical threshold of ${thresholds.fwdCritical} weeks`
    );
  }
  if (scores.otLevel !== "healthy") {
    reasons.push(
      inputs.overtimeRatePct >= thresholds.otCritical
        ? `Overtime is running at ${inputs.overtimeRatePct}% — above the ${thresholds.otCritical}% critical threshold. Crew is consistently working beyond scheduled hours.`
        : `Overtime at ${inputs.overtimeRatePct}% is above the ${thresholds.otWarn}% warning level — worth monitoring`
    );
  }
  if (scores.utilLevel !== "healthy") {
    reasons.push(
      inputs.rollingAvgUtilization >= thresholds.utilCritical
        ? `4-week rolling utilization is ${inputs.rollingAvgUtilization}% — crew is running near full capacity`
        : `4-week rolling utilization is ${inputs.rollingAvgUtilization}% — approaching the warning threshold of ${thresholds.utilWarn}%`
    );
  }
  if (scores.stressLevel !== "healthy" && inputs.scheduledHrs4wk > 0) {
    const stressPct = Math.round((inputs.actualHrs4wk / inputs.scheduledHrs4wk) * 100);
    reasons.push(`Crew worked ${stressPct}% of scheduled capacity over the last 4 weeks — actual hours exceed scheduled hours`);
  }
  if (trend === "rising") {
    reasons.push(
      persistenceWarn >= thresholds.weeksRequired
        ? `Utilization has been elevated for ${persistenceWarn} of the last 4 weeks — this is a sustained trend, not a temporary spike`
        : "Utilization trend is rising over the past several weeks — workload is growing"
    );
  }
  if (scores.overall === "healthy") {
    reasons.push("Utilization, overtime, and forward schedule are all within healthy ranges");
    reasons.push("Current workload appears manageable with the existing crew");
  }

  return reasons.slice(0, 3);
}

/** Apply a scenario (add/remove techs, adjust workload) and return projected util% */
export function applyScenario(
  baseUtil: number,
  baseTechCount: number,
  deltaTechs: number,
  deltaWorkloadPct: number
): number {
  const baseCap = baseTechCount * 40;
  const newCap = Math.max((baseTechCount + deltaTechs) * 40, 1);
  const baseWork = (baseUtil / 100) * baseCap * (1 + deltaWorkloadPct / 100);
  return Math.max(0, Math.round((baseWork / newCap) * 100));
}

// ── Thresholds hook ────────────────────────────────────────────────────────

/**
 * Reads/writes HiringThresholds from localStorage key "m5-hiring-thresholds".
 * Falls back to DEFAULT_HIRING_THRESHOLDS if missing or invalid.
 */
export function useHiringThresholds(): [
  HiringThresholds,
  (t: HiringThresholds) => void,
  () => void
] {
  const [thresholds, setThresholdsState] = useState<HiringThresholds>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return DEFAULT_HIRING_THRESHOLDS;
      const parsed = JSON.parse(raw);
      // Validate all expected keys present
      const keys = Object.keys(DEFAULT_HIRING_THRESHOLDS) as (keyof HiringThresholds)[];
      const valid = keys.every(k => typeof parsed[k] === "number");
      return valid ? parsed : DEFAULT_HIRING_THRESHOLDS;
    } catch {
      return DEFAULT_HIRING_THRESHOLDS;
    }
  });

  const setThresholds = useCallback((t: HiringThresholds) => {
    setThresholdsState(t);
    try { localStorage.setItem(LS_KEY, JSON.stringify(t)); } catch { /* quota exceeded */ }
  }, []);

  const resetThresholds = useCallback(() => {
    setThresholdsState(DEFAULT_HIRING_THRESHOLDS);
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }, []);

  // Sync to localStorage on each change (handles tab sync)
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(thresholds)); } catch { /* ignore */ }
  }, [thresholds]);

  return [thresholds, setThresholds, resetThresholds];
}
