import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, Wrench, SprayCan, ClipboardCheck, Search, Plus, Loader2, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { type ServiceCatalogItem, type Client } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function formatCurrency(value: number) {
  return "$" + value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface LineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  total: string;
}

interface CreateEstimatePayload {
  title: string;
  clientId: number;
  status: string;
  subtotal: string;
  tax: string;
  total: string;
  notes: string;
}

function useCatalogRates() {
  const { data: catalog = [] } = useQuery<ServiceCatalogItem[]>({
    queryKey: ["/api/service-catalog"],
  });

  const findRate = (serviceType: string, namePattern: string, fallback: number): number => {
    const match = catalog.find(
      (item) => item.serviceType === serviceType && item.isActive && item.name.toLowerCase().includes(namePattern.toLowerCase())
    );
    return match ? Number(match.unitPrice) : fallback;
  };

  return { catalog, findRate };
}

function ClientSelector({ value, onChange }: { value: number | null; onChange: (id: number) => void }) {
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  return (
    <div className="space-y-2">
      <Label>Client</Label>
      <Select value={value?.toString() || ""} onValueChange={(v) => onChange(parseInt(v))}>
        <SelectTrigger data-testid="select-calculator-client">
          <SelectValue placeholder="Select a client" />
        </SelectTrigger>
        <SelectContent>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PriceBreakdown({ lineItems, title }: { lineItems: LineItem[]; title: string }) {
  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.total), 0);

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="text-lg">Price Breakdown</CardTitle>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {lineItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Fill in inputs to see pricing</p>
        ) : (
          <>
            {lineItems.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground truncate mr-2">{item.description}</span>
                <span className="font-mono font-medium whitespace-nowrap">{formatCurrency(Number(item.total))}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="font-mono" data-testid="text-calculator-total">{formatCurrency(subtotal)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function useCreateEstimateFromCalc() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ estimate, lineItems }: { estimate: CreateEstimatePayload; lineItems: LineItem[] }) => {
      const res = await apiRequest("POST", "/api/estimates", estimate);
      const created = await res.json();
      try {
        for (const item of lineItems) {
          await apiRequest("POST", `/api/estimates/${created.id}/line-items`, {
            estimateId: created.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          });
        }
      } catch (lineItemError) {
        queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
        toast({ title: "Partial Error", description: "Estimate created but some line items failed to save. Please edit the estimate to add missing items.", variant: "destructive" });
        return created;
      }
      return created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Estimate Created", description: "Your estimate has been created with calculated line items." });
      if (data.buildopsWarning) {
        toast({ title: "BuildOps Sync Warning", description: data.buildopsWarning, variant: "destructive" });
      }
      setLocation(`/estimates/${data.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return mutation;
}

const MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ACTUAL_WORK_HOURS: Record<number, number[]> = {
  2025: [184, 160, 168, 176, 176, 168, 184, 168, 176, 184, 160, 176],
  2026: [176, 160, 176, 176, 168, 176, 184, 168, 176, 176, 168, 184],
  2027: [176, 160, 184, 176, 176, 168, 184, 168, 176, 184, 160, 176],
};
const AVG_HOURS_PER_MONTH = 174;

interface PositionPreset {
  label: string;
  hourlyRate: number;
  isUnion: boolean;
  pensionRate: number;
  annuityRate: number;
}

const POSITION_PRESETS: Record<string, PositionPreset> = {
  union_chief: { label: "Union Chief Engineer", hourlyRate: 93.35, isUnion: true, pensionRate: 14.54, annuityRate: 2.10 },
  union_engineer: { label: "Union Engineer", hourlyRate: 93.35, isUnion: true, pensionRate: 14.54, annuityRate: 2.10 },
  non_union_engineer: { label: "Non-Union Engineer", hourlyRate: 84.15, isUnion: false, pensionRate: 0, annuityRate: 0 },
  non_union_tech: { label: "Non-Union Technician", hourlyRate: 65.00, isUnion: false, pensionRate: 0, annuityRate: 0 },
  custom: { label: "Custom", hourlyRate: 0, isUnion: false, pensionRate: 0, annuityRate: 0 },
};

const PAYROLL_COST_BREAKDOWN = {
  ficaSsa: 6.20,
  ficaMedicare: 1.45,
  futa: 0.60,
  caUnemployment: 3.40,
  caEtt: 0.10,
  wcPolicy: 3.79,
  bondingInsurance: 1.00,
};
const ACTUAL_PAYROLL_PCT = Object.values(PAYROLL_COST_BREAKDOWN).reduce((a, b) => a + b, 0);
const BILLABLE_PAYROLL_PCT = 23.0;
const PAYROLL_MARKUP_PCT = ((BILLABLE_PAYROLL_PCT - ACTUAL_PAYROLL_PCT) / ACTUAL_PAYROLL_PCT) * 100;

interface BenefitConfig {
  cost: number;
  markupPct: number;
  perHour?: boolean;
  annual?: boolean;
  unionOnly?: boolean;
}

const UNION_BENEFITS_DEFAULTS: Record<string, BenefitConfig> = {
  healthWelfare: { cost: 2680, markupPct: 0, unionOnly: true },
  pension: { cost: 14.54, markupPct: 0, perHour: true, unionOnly: true },
  annuity: { cost: 2.10, markupPct: 0, perHour: true, unionOnly: true },
  local39Training: { cost: 1115, markupPct: 0, annual: true, unionOnly: true },
  nationalTraining: { cost: 104, markupPct: 0, annual: true, unionOnly: true },
};

const OTHER_BENEFITS_DEFAULTS: Record<string, BenefitConfig & { label: string }> = {
  lifeLtd: { label: "Life/LTD", cost: 75.91, markupPct: 20 },
  uniforms: { label: "Uniforms", cost: 154.50, markupPct: 1.94 },
  phone: { label: "Electronic Device", cost: 90.00, markupPct: 5 },
  safetyEmailAdp: { label: "Safety, Email, ADP", cost: 63.50, markupPct: 100 },
  pmProgram: { label: "PM Program", cost: 0, markupPct: 10 },
};

const SCHEDULE_PRESETS = [
  { label: "Full-Time (5 days)", value: "ft5", hoursPerWeek: 40 },
  { label: "Full-Time (4 days)", value: "ft4", hoursPerWeek: 40 },
  { label: "Full-Time (3 days)", value: "ft3", hoursPerWeek: 24 },
  { label: "Part-Time (32h/wk)", value: "pt32", hoursPerWeek: 32 },
  { label: "Part-Time (24h/wk)", value: "pt24", hoursPerWeek: 24 },
  { label: "Part-Time (20h/wk)", value: "pt20", hoursPerWeek: 20 },
  { label: "Part-Time (16h/wk)", value: "pt16", hoursPerWeek: 16 },
  { label: "Custom Hours", value: "custom", hoursPerWeek: 0 },
];

function getMonthsForRange(startMonth: number, startYear: number, count: number) {
  const months: { month: number; year: number; label: string; shortLabel: string }[] = [];
  for (let i = 0; i < count; i++) {
    const m = (startMonth + i) % 12;
    const y = startYear + Math.floor((startMonth + i) / 12);
    months.push({ month: m, year: y, label: `${MONTH_NAMES_FULL[m]} ${y}`, shortLabel: `${MONTH_NAMES_SHORT[m]} '${String(y).slice(2)}` });
  }
  return months;
}

function getWorkHoursForMonth(month: number, year: number, hoursMode: string, customHours: Record<string, string>, scheduleRatio: number) {
  if (hoursMode === "actual") {
    const key = `${year}-${month}`;
    if (customHours[key] !== undefined && customHours[key] !== "") return parseFloat(customHours[key]) || 0;
    const yearHours = ACTUAL_WORK_HOURS[year] || ACTUAL_WORK_HOURS[2026];
    return Math.round(yearHours[month] * scheduleRatio);
  }
  return Math.round(AVG_HOURS_PER_MONTH * scheduleRatio);
}

function CollapsibleSection({ title, defaultOpen = false, children, badge }: { title: string; defaultOpen?: boolean; children: React.ReactNode; badge?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        className="flex items-center justify-between w-full text-left py-2 text-sm font-semibold hover:text-primary transition-colors"
        onClick={() => setOpen(!open)}
        data-testid={`section-toggle-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <span className="flex items-center gap-2">
          {title}
          {badge && <Badge variant="secondary" className="text-xs font-normal">{badge}</Badge>}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="space-y-3 pb-2">{children}</div>}
    </div>
  );
}

function BuildingEngineeringCalc() {
  const createMutation = useCreateEstimateFromCalc();

  const [clientId, setClientId] = useState<number | null>(null);
  const [buildingName, setBuildingName] = useState("");
  const [position, setPosition] = useState("union_chief");
  const [isUnion, setIsUnion] = useState(true);
  const [hourlyRate, setHourlyRate] = useState(POSITION_PRESETS.union_chief.hourlyRate.toString());
  const [fteCount, setFteCount] = useState("1");

  const [schedule, setSchedule] = useState("ft5");
  const [customHoursPerWeek, setCustomHoursPerWeek] = useState("40");
  const currentSchedule = SCHEDULE_PRESETS.find(s => s.value === schedule);
  const hoursPerWeek = schedule === "custom" ? (parseFloat(customHoursPerWeek) || 0) : (currentSchedule?.hoursPerWeek || 40);
  const scheduleRatio = hoursPerWeek / 40;

  const now = new Date();
  const [startMonth, setStartMonth] = useState(now.getMonth());
  const [startYear, setStartYear] = useState(now.getFullYear());
  const [monthCount, setMonthCount] = useState(12);
  const [hoursMode, setHoursMode] = useState("actual");
  const [customHours, setCustomHours] = useState<Record<string, string>>({});

  const [rateIncreaseEnabled, setRateIncreaseEnabled] = useState(false);
  const [rateIncreaseMonth, setRateIncreaseMonth] = useState(8);
  const [newHourlyRate, setNewHourlyRate] = useState("");
  const [newPensionRate, setNewPensionRate] = useState("");
  const [newAnnuityRate, setNewAnnuityRate] = useState("");

  const [pensionRate, setPensionRate] = useState(POSITION_PRESETS.union_chief.pensionRate.toString());
  const [annuityRate, setAnnuityRate] = useState(POSITION_PRESETS.union_chief.annuityRate.toString());
  const [healthWelfare, setHealthWelfare] = useState(UNION_BENEFITS_DEFAULTS.healthWelfare.cost.toString());
  const [local39Training, setLocal39Training] = useState(UNION_BENEFITS_DEFAULTS.local39Training.cost.toString());
  const [nationalTraining, setNationalTraining] = useState(UNION_BENEFITS_DEFAULTS.nationalTraining.cost.toString());

  const [lifeLtdCost, setLifeLtdCost] = useState(OTHER_BENEFITS_DEFAULTS.lifeLtd.cost.toString());
  const [lifeLtdMarkup, setLifeLtdMarkup] = useState(OTHER_BENEFITS_DEFAULTS.lifeLtd.markupPct.toString());
  const [uniformsCost, setUniformsCost] = useState(OTHER_BENEFITS_DEFAULTS.uniforms.cost.toString());
  const [uniformsMarkup, setUniformsMarkup] = useState(OTHER_BENEFITS_DEFAULTS.uniforms.markupPct.toString());
  const [phoneCost, setPhoneCost] = useState(OTHER_BENEFITS_DEFAULTS.phone.cost.toString());
  const [phoneMarkup, setPhoneMarkup] = useState(OTHER_BENEFITS_DEFAULTS.phone.markupPct.toString());
  const [safetyCost, setSafetyCost] = useState(OTHER_BENEFITS_DEFAULTS.safetyEmailAdp.cost.toString());
  const [safetyMarkup, setSafetyMarkup] = useState(OTHER_BENEFITS_DEFAULTS.safetyEmailAdp.markupPct.toString());
  const [pmCost, setPmCost] = useState(OTHER_BENEFITS_DEFAULTS.pmProgram.cost.toString());
  const [pmMarkup, setPmMarkup] = useState(OTHER_BENEFITS_DEFAULTS.pmProgram.markupPct.toString());

  const [managementFeePct, setManagementFeePct] = useState("3.0");
  const [sfGrossTaxPct, setSfGrossTaxPct] = useState("0.14");

  const [showInternal, setShowInternal] = useState(false);
  const [showMonthly, setShowMonthly] = useState(false);

  const handlePositionChange = (val: string) => {
    setPosition(val);
    const preset = POSITION_PRESETS[val];
    if (val !== "custom") {
      setHourlyRate(preset.hourlyRate.toString());
      setIsUnion(preset.isUnion);
      setPensionRate(preset.pensionRate.toString());
      setAnnuityRate(preset.annuityRate.toString());
    }
  };

  const rate = parseFloat(hourlyRate) || 0;
  const fte = parseFloat(fteCount) || 1;
  const pension = isUnion ? (parseFloat(pensionRate) || 0) : 0;
  const annuity = isUnion ? (parseFloat(annuityRate) || 0) : 0;
  const hw = isUnion ? (parseFloat(healthWelfare) || 0) : 0;
  const l39 = isUnion ? (parseFloat(local39Training) || 0) : 0;
  const natTrain = isUnion ? (parseFloat(nationalTraining) || 0) : 0;

  const otherBenefits = [
    { cost: parseFloat(lifeLtdCost) || 0, markup: parseFloat(lifeLtdMarkup) || 0, label: "Life/LTD" },
    { cost: parseFloat(uniformsCost) || 0, markup: parseFloat(uniformsMarkup) || 0, label: "Uniforms" },
    { cost: parseFloat(phoneCost) || 0, markup: parseFloat(phoneMarkup) || 0, label: "Electronic Device" },
    { cost: parseFloat(safetyCost) || 0, markup: parseFloat(safetyMarkup) || 0, label: "Safety, Email, ADP" },
    { cost: parseFloat(pmCost) || 0, markup: parseFloat(pmMarkup) || 0, label: "PM Program" },
  ];
  const otherBenefitsCostPerMonth = otherBenefits.reduce((s, b) => s + b.cost, 0);
  const otherBenefitsBillablePerMonth = otherBenefits.reduce((s, b) => s + b.cost * (1 + b.markup / 100), 0);

  const mgmtPct = (parseFloat(managementFeePct) || 0) / 100;
  const grPct = (parseFloat(sfGrossTaxPct) || 0) / 100;
  const payrollActualPct = ACTUAL_PAYROLL_PCT / 100;
  const payrollBillablePct = BILLABLE_PAYROLL_PCT / 100;

  const months = getMonthsForRange(startMonth, startYear, monthCount);

  const incRate = rateIncreaseEnabled ? (parseFloat(newHourlyRate) || rate) : rate;
  const incPension = rateIncreaseEnabled ? (parseFloat(newPensionRate) || pension) : pension;
  const incAnnuity = rateIncreaseEnabled ? (parseFloat(newAnnuityRate) || annuity) : annuity;

  const monthlyCalcs = months.map((mo, idx) => {
    const hours = getWorkHoursForMonth(mo.month, mo.year, hoursMode, customHours, scheduleRatio);
    const isAfterIncrease = rateIncreaseEnabled && idx >= (() => {
      for (let i = 0; i < months.length; i++) {
        if (months[i].month === rateIncreaseMonth && months[i].year >= startYear) return i;
      }
      return months.length;
    })();
    const effectiveRate = isAfterIncrease ? incRate : rate;
    const effectivePension = isAfterIncrease ? incPension : pension;
    const effectiveAnnuity = isAfterIncrease ? incAnnuity : annuity;

    const laborCost = effectiveRate * hours * fte;
    const payrollCostActual = laborCost * payrollActualPct;
    const payrollBillable = laborCost * payrollBillablePct;
    const pensionCost = effectivePension * hours * fte;
    const annuityCost = effectiveAnnuity * hours * fte;
    const hwCost = hw * fte;
    const isYearBoundary = idx === 0 || (idx > 0 && mo.month === months[0].month);
    const oneTimeUnion = isYearBoundary ? (l39 + natTrain) * fte : 0;
    const unionBenefitsCost = pensionCost + annuityCost + hwCost + oneTimeUnion;
    const otherCostMonth = otherBenefitsCostPerMonth * fte;
    const otherBillableMonth = otherBenefitsBillablePerMonth * fte;

    const totalCost = laborCost + payrollCostActual + unionBenefitsCost + otherCostMonth;
    const totalRevenue = laborCost + payrollBillable + unionBenefitsCost + otherBillableMonth;
    const managementFee = totalRevenue * mgmtPct;
    const totalWithMgmt = totalRevenue + managementFee;
    const grossTax = totalWithMgmt * grPct;
    const totalBillable = totalWithMgmt + grossTax;
    const profit = totalBillable - totalCost;
    const profitPct = totalBillable > 0 ? (profit / totalBillable) * 100 : 0;

    return {
      ...mo,
      hours,
      effectiveRate,
      laborCost,
      payrollCostActual,
      payrollBillable,
      pensionCost,
      annuityCost,
      hwCost,
      oneTimeUnion,
      unionBenefitsCost,
      otherCostMonth,
      otherBillableMonth,
      totalCost,
      totalRevenue,
      managementFee,
      totalWithMgmt,
      grossTax,
      totalBillable,
      profit,
      profitPct,
    };
  });

  const totals = monthlyCalcs.reduce((acc, m) => ({
    hours: acc.hours + m.hours,
    laborCost: acc.laborCost + m.laborCost,
    payrollBillable: acc.payrollBillable + m.payrollBillable,
    payrollCostActual: acc.payrollCostActual + m.payrollCostActual,
    unionBenefitsCost: acc.unionBenefitsCost + m.unionBenefitsCost,
    otherCostMonth: acc.otherCostMonth + m.otherCostMonth,
    otherBillableMonth: acc.otherBillableMonth + m.otherBillableMonth,
    totalCost: acc.totalCost + m.totalCost,
    totalRevenue: acc.totalRevenue + m.totalRevenue,
    managementFee: acc.managementFee + m.managementFee,
    grossTax: acc.grossTax + m.grossTax,
    totalBillable: acc.totalBillable + m.totalBillable,
    profit: acc.profit + m.profit,
  }), { hours: 0, laborCost: 0, payrollBillable: 0, payrollCostActual: 0, unionBenefitsCost: 0, otherCostMonth: 0, otherBillableMonth: 0, totalCost: 0, totalRevenue: 0, managementFee: 0, grossTax: 0, totalBillable: 0, profit: 0 });

  const avgMonthly = totals.totalBillable / monthCount;
  const totalProfitPct = totals.totalBillable > 0 ? (totals.profit / totals.totalBillable) * 100 : 0;

  const totalHoursXFte = totals.hours * fte;
  const totalPensionCost = monthlyCalcs.reduce((s, m) => s + m.pensionCost, 0);
  const totalAnnuityCost = monthlyCalcs.reduce((s, m) => s + m.annuityCost, 0);
  const totalTrainingFunds = monthlyCalcs.reduce((s, m) => s + m.oneTimeUnion, 0);

  const lineItems: LineItem[] = [];
  if (rate > 0) {
    const avgRate = totals.laborCost / (totalHoursXFte || 1);
    lineItems.push({ description: `Straight-time Labor (${totalHoursXFte}h × ${fte} FTE)`, quantity: totalHoursXFte.toString(), unitPrice: avgRate.toFixed(2), total: totals.laborCost.toFixed(2) });
    if (isUnion) {
      const hwTotal = hw * fte * monthCount;
      lineItems.push({ description: `Union Health & Welfare`, quantity: monthCount.toString(), unitPrice: (hw * fte).toFixed(2), total: hwTotal.toFixed(2) });
      const avgPensionRate = totalPensionCost / (totalHoursXFte || 1);
      lineItems.push({ description: `Pension`, quantity: totalHoursXFte.toString(), unitPrice: avgPensionRate.toFixed(2), total: totalPensionCost.toFixed(2) });
      const avgAnnuityRate = totalAnnuityCost / (totalHoursXFte || 1);
      lineItems.push({ description: `Annuity`, quantity: totalHoursXFte.toString(), unitPrice: avgAnnuityRate.toFixed(2), total: totalAnnuityCost.toFixed(2) });
      if (l39 > 0) {
        const l39Total = l39 * fte * Math.max(1, Math.ceil(monthCount / 12));
        lineItems.push({ description: `Local 39 Training Fund`, quantity: (fte * Math.max(1, Math.ceil(monthCount / 12))).toString(), unitPrice: l39.toFixed(2), total: l39Total.toFixed(2) });
      }
      if (natTrain > 0) {
        const natTotal = natTrain * fte * Math.max(1, Math.ceil(monthCount / 12));
        lineItems.push({ description: `National Training Fund`, quantity: (fte * Math.max(1, Math.ceil(monthCount / 12))).toString(), unitPrice: natTrain.toFixed(2), total: natTotal.toFixed(2) });
      }
    }
    otherBenefits.forEach(b => {
      if (b.cost > 0) {
        const billable = b.cost * (1 + b.markup / 100) * fte;
        lineItems.push({ description: b.label, quantity: monthCount.toString(), unitPrice: billable.toFixed(2), total: (billable * monthCount).toFixed(2) });
      }
    });
    lineItems.push({ description: `Payroll Tax & Insurance (${BILLABLE_PAYROLL_PCT}%)`, quantity: "1", unitPrice: totals.payrollBillable.toFixed(2), total: totals.payrollBillable.toFixed(2) });
    lineItems.push({ description: `Management Fee (${managementFeePct}%)`, quantity: "1", unitPrice: totals.managementFee.toFixed(2), total: totals.managementFee.toFixed(2) });
    if (grPct > 0) lineItems.push({ description: `SF Gross Receipts Tax (${sfGrossTaxPct}%)`, quantity: "1", unitPrice: totals.grossTax.toFixed(2), total: totals.grossTax.toFixed(2) });
  }

  const handleCreate = () => {
    if (!clientId || rate <= 0) return;
    const posLabel = POSITION_PRESETS[position]?.label || position;
    const dateRange = `${months[0].label} - ${months[months.length - 1].label}`;
    createMutation.mutate({
      estimate: {
        title: `Building Engineering - ${posLabel}${buildingName ? ` @ ${buildingName}` : ""}`,
        clientId,
        status: "draft",
        subtotal: totals.totalRevenue.toFixed(2),
        tax: (totals.managementFee + totals.grossTax).toFixed(2),
        total: totals.totalBillable.toFixed(2),
        notes: `Auto-generated from Labor Cost Calculator.\nPosition: ${posLabel} (${isUnion ? "Union" : "Non-Union"})\nSchedule: ${currentSchedule?.label || `${hoursPerWeek}h/wk`} | FTE: ${fte}\nPeriod: ${dateRange} (${monthCount} months)\nAvg Monthly: ${formatCurrency(avgMonthly)} | Total: ${formatCurrency(totals.totalBillable)}${buildingName ? `\nBuilding: ${buildingName}` : ""}\n\nNOTES:\n0. This cost estimate is provided for budgeting and planning purposes only.\n1. PTO requiring replacement coverage billed as incurred with prior approval.\n2. Overtime not included, billed as incurred with approval.\n3. All payroll-related cost factors passed through to client.\n4. Materials re-billed at cost plus 15% or minimum $50.\n5. Bonuses not included. 401(k) included as employee benefit.\n6. PM platform costs billed only if requested.`,
      },
      lineItems,
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Labor Cost Estimate
          </CardTitle>
          <CardDescription>Build engineering labor cost estimates with union/non-union support</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ClientSelector value={clientId} onChange={setClientId} />
            <div className="space-y-2">
              <Label>Building / Customer</Label>
              <Input placeholder="e.g. 100 Pine Center" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} data-testid="input-be-building" />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={position} onValueChange={handlePositionChange}>
                <SelectTrigger data-testid="select-be-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__union_header" disabled><span className="text-xs font-semibold text-muted-foreground">UNION</span></SelectItem>
                  {Object.entries(POSITION_PRESETS).filter(([, p]) => p.isUnion).map(([key, p]) => (
                    <SelectItem key={key} value={key}>{p.label}</SelectItem>
                  ))}
                  <SelectItem value="__nonunion_header" disabled><span className="text-xs font-semibold text-muted-foreground">NON-UNION</span></SelectItem>
                  {Object.entries(POSITION_PRESETS).filter(([, p]) => !p.isUnion).map(([key, p]) => (
                    <SelectItem key={key} value={key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate ($)</Label>
              <Input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} data-testid="input-be-rate" />
            </div>
            <div className="space-y-2">
              <Label>FTE Count</Label>
              <Input type="number" min="0.5" step="0.5" value={fteCount} onChange={(e) => setFteCount(e.target.value)} data-testid="input-be-fte" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-1 h-9">
                <Button
                  type="button"
                  size="sm"
                  variant={isUnion ? "default" : "outline"}
                  className="flex-1 h-full text-xs"
                  onClick={() => setIsUnion(true)}
                  data-testid="button-union"
                >Union</Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!isUnion ? "default" : "outline"}
                  className="flex-1 h-full text-xs"
                  onClick={() => setIsUnion(false)}
                  data-testid="button-nonunion"
                >Non-Union</Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label>Schedule</Label>
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger data-testid="select-be-schedule">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_PRESETS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {schedule === "custom" && (
              <div className="space-y-2">
                <Label>Hours/Week</Label>
                <Input type="number" min="1" max="60" value={customHoursPerWeek} onChange={(e) => setCustomHoursPerWeek(e.target.value)} data-testid="input-be-custom-hours" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Start Month</Label>
              <Select value={`${startYear}-${startMonth}`} onValueChange={(v) => { const [y, m] = v.split("-"); setStartYear(parseInt(y)); setStartMonth(parseInt(m)); }}>
                <SelectTrigger data-testid="select-be-start">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => {
                    const m = (now.getMonth() + i) % 12;
                    const y = now.getFullYear() + Math.floor((now.getMonth() + i) / 12);
                    return <SelectItem key={i} value={`${y}-${m}`}>{MONTH_NAMES_FULL[m]} {y}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={monthCount.toString()} onValueChange={(v) => setMonthCount(parseInt(v))}>
                <SelectTrigger data-testid="select-be-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 6, 9, 12, 18, 24].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n} months</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Label className="text-xs whitespace-nowrap">Hours Mode:</Label>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant={hoursMode === "actual" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setHoursMode("actual")}>Actual Hours</Button>
              <Button type="button" size="sm" variant={hoursMode === "average" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setHoursMode("average")}>Average ({AVG_HOURS_PER_MONTH}h)</Button>
            </div>
            {hoursMode === "actual" && scheduleRatio < 1 && (
              <Badge variant="secondary" className="text-xs">{Math.round(scheduleRatio * 100)}% of full-time</Badge>
            )}
          </div>

          <Separator />

          <CollapsibleSection title="Rate Increase" badge={rateIncreaseEnabled ? "Active" : undefined}>
            <div className="flex items-center gap-2 mb-3">
              <Checkbox checked={rateIncreaseEnabled} onCheckedChange={(v) => setRateIncreaseEnabled(!!v)} id="rate-increase-toggle" data-testid="checkbox-rate-increase" />
              <label htmlFor="rate-increase-toggle" className="text-sm">Apply rate increase mid-contract</label>
            </div>
            {rateIncreaseEnabled && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Increase Starting</Label>
                  <Select value={rateIncreaseMonth.toString()} onValueChange={(v) => setRateIncreaseMonth(parseInt(v))}>
                    <SelectTrigger data-testid="select-be-increase-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES_FULL.map((m, i) => (
                        <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">New Hourly Rate ($)</Label>
                  <Input type="number" step="0.01" placeholder={rate.toString()} value={newHourlyRate} onChange={(e) => setNewHourlyRate(e.target.value)} data-testid="input-be-new-rate" />
                </div>
                {isUnion && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">New Pension ($/h)</Label>
                      <Input type="number" step="0.01" placeholder={pension.toString()} value={newPensionRate} onChange={(e) => setNewPensionRate(e.target.value)} data-testid="input-be-new-pension" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">New Annuity ($/h)</Label>
                      <Input type="number" step="0.01" placeholder={annuity.toString()} value={newAnnuityRate} onChange={(e) => setNewAnnuityRate(e.target.value)} data-testid="input-be-new-annuity" />
                    </div>
                  </>
                )}
              </div>
            )}
          </CollapsibleSection>

          {isUnion && (
            <CollapsibleSection title="Union Benefits">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Health & Welfare ($/mo)</Label>
                  <Input type="number" step="0.01" value={healthWelfare} onChange={(e) => setHealthWelfare(e.target.value)} data-testid="input-be-hw" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pension ($/h)</Label>
                  <Input type="number" step="0.01" value={pensionRate} onChange={(e) => setPensionRate(e.target.value)} data-testid="input-be-pension" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Annuity ($/h)</Label>
                  <Input type="number" step="0.01" value={annuityRate} onChange={(e) => setAnnuityRate(e.target.value)} data-testid="input-be-annuity" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Local 39 Training ($/yr)</Label>
                  <Input type="number" step="0.01" value={local39Training} onChange={(e) => setLocal39Training(e.target.value)} data-testid="input-be-l39" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">National Training ($/yr)</Label>
                  <Input type="number" step="0.01" value={nationalTraining} onChange={(e) => setNationalTraining(e.target.value)} data-testid="input-be-nattrain" />
                </div>
              </div>
            </CollapsibleSection>
          )}

          <CollapsibleSection title="Other Benefits" badge={showInternal ? "Cost & Markup" : "Billable"}>
            <div className="flex items-center gap-2 mb-2">
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setShowInternal(!showInternal)} data-testid="button-toggle-internal">
                {showInternal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showInternal ? "Hide" : "Show"} Cost & Markup
              </Button>
            </div>
            <div className="space-y-2">
              {[
                { label: "Life/LTD", cost: lifeLtdCost, setCost: setLifeLtdCost, markup: lifeLtdMarkup, setMarkup: setLifeLtdMarkup, tid: "life" },
                { label: "Uniforms", cost: uniformsCost, setCost: setUniformsCost, markup: uniformsMarkup, setMarkup: setUniformsMarkup, tid: "uniforms" },
                { label: "Electronic Device", cost: phoneCost, setCost: setPhoneCost, markup: phoneMarkup, setMarkup: setPhoneMarkup, tid: "phone" },
                { label: "Safety, Email, ADP", cost: safetyCost, setCost: setSafetyCost, markup: safetyMarkup, setMarkup: setSafetyMarkup, tid: "safety" },
                { label: "PM Program", cost: pmCost, setCost: setPmCost, markup: pmMarkup, setMarkup: setPmMarkup, tid: "pm" },
              ].map(b => {
                const c = parseFloat(b.cost) || 0;
                const m = parseFloat(b.markup) || 0;
                const billable = c * (1 + m / 100);
                return (
                  <div key={b.tid} className="grid gap-2" style={{ gridTemplateColumns: showInternal ? "1fr 80px 60px 80px" : "1fr 100px" }}>
                    <Label className="text-xs self-center">{b.label}</Label>
                    {showInternal ? (
                      <>
                        <Input type="number" step="0.01" value={b.cost} onChange={(e) => b.setCost(e.target.value)} className="h-8 text-xs" data-testid={`input-be-${b.tid}-cost`} />
                        <div className="flex items-center gap-0.5">
                          <Input type="number" step="0.1" value={b.markup} onChange={(e) => b.setMarkup(e.target.value)} className="h-8 text-xs w-14" data-testid={`input-be-${b.tid}-markup`} />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        <div className="text-xs self-center text-right font-mono">{formatCurrency(billable)}/mo</div>
                      </>
                    ) : (
                      <div className="text-xs self-center text-right font-mono">{formatCurrency(billable)}/mo</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Overhead & Tax Rates">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Payroll Tax (billable %)</Label>
                <div className="text-sm font-mono text-center py-1.5 bg-muted rounded-md">{BILLABLE_PAYROLL_PCT}%</div>
                {showInternal && <p className="text-[10px] text-muted-foreground">Actual: {ACTUAL_PAYROLL_PCT.toFixed(2)}%</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Management Fee (%)</Label>
                <Input type="number" step="0.01" value={managementFeePct} onChange={(e) => setManagementFeePct(e.target.value)} data-testid="input-be-mgmt" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">SF Gross Receipts (%)</Label>
                <Input type="number" step="0.01" value={sfGrossTaxPct} onChange={(e) => setSfGrossTaxPct(e.target.value)} data-testid="input-be-grt" />
              </div>
            </div>
          </CollapsibleSection>

          {rate > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Monthly Breakdown</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowMonthly(!showMonthly)} data-testid="button-toggle-monthly">
                  {showMonthly ? "Hide" : "Show"} Detail
                </Button>
              </div>
              {showMonthly && (
                <div className="overflow-x-auto -mx-6 px-6">
                  <table className="w-full text-xs border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-2 font-medium">Month</th>
                        <th className="text-right py-2 px-1 font-medium">Hrs</th>
                        <th className="text-right py-2 px-1 font-medium">Rate</th>
                        <th className="text-right py-2 px-1 font-medium">Labor</th>
                        {isUnion && <th className="text-right py-2 px-1 font-medium">Union</th>}
                        <th className="text-right py-2 px-1 font-medium">Other</th>
                        <th className="text-right py-2 px-1 font-medium">Payroll</th>
                        <th className="text-right py-2 px-1 font-medium">Mgmt</th>
                        <th className="text-right py-2 pl-1 font-medium font-semibold">Total</th>
                        {showInternal && <th className="text-right py-2 pl-1 font-medium text-green-600">Profit</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyCalcs.map((m, i) => (
                        <tr key={i} className={`border-b border-muted/50 hover:bg-muted/30 ${rateIncreaseEnabled && m.effectiveRate !== rate ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}>
                          <td className="py-1.5 pr-2 font-medium whitespace-nowrap">{m.shortLabel}</td>
                          <td className="py-1.5 px-1 text-right font-mono">{m.hours}</td>
                          <td className="py-1.5 px-1 text-right font-mono">${m.effectiveRate.toFixed(2)}</td>
                          <td className="py-1.5 px-1 text-right font-mono">{formatCurrency(m.laborCost)}</td>
                          {isUnion && <td className="py-1.5 px-1 text-right font-mono">{formatCurrency(m.unionBenefitsCost)}</td>}
                          <td className="py-1.5 px-1 text-right font-mono">{formatCurrency(m.otherBillableMonth)}</td>
                          <td className="py-1.5 px-1 text-right font-mono">{formatCurrency(m.payrollBillable)}</td>
                          <td className="py-1.5 px-1 text-right font-mono">{formatCurrency(m.managementFee)}</td>
                          <td className="py-1.5 pl-1 text-right font-mono font-semibold">{formatCurrency(m.totalBillable)}</td>
                          {showInternal && <td className="py-1.5 pl-1 text-right font-mono text-green-600">{m.profitPct.toFixed(1)}%</td>}
                        </tr>
                      ))}
                      <tr className="border-t-2 font-bold">
                        <td className="py-2 pr-2">TOTAL</td>
                        <td className="py-2 px-1 text-right font-mono">{totals.hours}</td>
                        <td className="py-2 px-1 text-right font-mono">-</td>
                        <td className="py-2 px-1 text-right font-mono">{formatCurrency(totals.laborCost)}</td>
                        {isUnion && <td className="py-2 px-1 text-right font-mono">{formatCurrency(totals.unionBenefitsCost)}</td>}
                        <td className="py-2 px-1 text-right font-mono">{formatCurrency(totals.otherBillableMonth)}</td>
                        <td className="py-2 px-1 text-right font-mono">{formatCurrency(totals.payrollBillable)}</td>
                        <td className="py-2 px-1 text-right font-mono">{formatCurrency(totals.managementFee)}</td>
                        <td className="py-2 pl-1 text-right font-mono">{formatCurrency(totals.totalBillable)}</td>
                        {showInternal && <td className="py-2 pl-1 text-right font-mono text-green-600">{totalProfitPct.toFixed(1)}%</td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            disabled={rate <= 0 || !clientId || createMutation.isPending}
            onClick={handleCreate}
            data-testid="button-create-estimate-be"
          >
            {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Generate Quote
          </Button>
        </CardFooter>
      </Card>

      <div className="space-y-4">
        <Card className="sticky top-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              Customer Quote
              {showInternal && <Badge variant="outline" className="text-xs font-normal">Internal View</Badge>}
            </CardTitle>
            <CardDescription>
              {POSITION_PRESETS[position]?.label || "Custom"}{buildingName ? ` @ ${buildingName}` : ""}
              {scheduleRatio < 1 && <span className="ml-1">({Math.round(hoursPerWeek)}h/wk)</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rate <= 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Set an hourly rate to see pricing</p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Labor ({totals.hours}h)</span>
                    <span className="font-mono font-medium">{formatCurrency(totals.laborCost)}</span>
                  </div>
                  {isUnion && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Union Benefits</span>
                      <span className="font-mono font-medium">{formatCurrency(totals.unionBenefitsCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Other Benefits</span>
                    <span className="font-mono font-medium">{formatCurrency(totals.otherBillableMonth)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payroll Tax & Insurance</span>
                    <span className="font-mono font-medium">{formatCurrency(totals.payrollBillable)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>Revenue Subtotal</span>
                  <span className="font-mono">{formatCurrency(totals.totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Management Fee ({managementFeePct}%)</span>
                  <span className="font-mono font-medium">{formatCurrency(totals.managementFee)}</span>
                </div>
                {grPct > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SF Gross Receipts ({sfGrossTaxPct}%)</span>
                    <span className="font-mono font-medium">{formatCurrency(totals.grossTax)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Contract Total</span>
                  <span className="font-mono" data-testid="text-calculator-total">{formatCurrency(totals.totalBillable)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Avg Monthly</span>
                  <span className="font-mono font-medium">{formatCurrency(avgMonthly)}</span>
                </div>
                <div className="text-xs text-muted-foreground text-center pt-1">
                  {months[0].label} — {months[months.length - 1].label}
                </div>

                {showInternal && (
                  <>
                    <Separator />
                    <div className="pt-1 space-y-1.5">
                      <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Internal Only</h4>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Cost</span>
                        <span className="font-mono font-medium">{formatCurrency(totals.totalCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Revenue</span>
                        <span className="font-mono font-medium">{formatCurrency(totals.totalBillable)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-green-700 dark:text-green-400">
                        <span>Profit</span>
                        <span className="font-mono">{formatCurrency(totals.profit)} ({totalProfitPct.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SpecialProjectsCalc() {
  const { findRate } = useCatalogRates();
  const createMutation = useCreateEstimateFromCalc();

  const [projectType, setProjectType] = useState("renovation");
  const [laborHours, setLaborHours] = useState("");
  const [materialCost, setMaterialCost] = useState("");
  const [contingencyPct, setContingencyPct] = useState("10");
  const [clientId, setClientId] = useState<number | null>(null);

  const hours = parseFloat(laborHours) || 0;
  const materials = parseFloat(materialCost) || 0;
  const contingency = parseFloat(contingencyPct) || 0;

  const laborRate = findRate("special_projects", "labor", 85);

  const projectTypes = [
    { value: "renovation", label: "Renovation" },
    { value: "buildout", label: "Build-out" },
    { value: "demolition", label: "Demolition" },
    { value: "emergency_repair", label: "Emergency Repair" },
    { value: "upgrade", label: "System Upgrade" },
  ];

  const lineItems: LineItem[] = [];
  if (hours > 0) {
    lineItems.push({
      description: `${projectTypes.find(p => p.value === projectType)?.label || projectType} - Labor (${hours}h)`,
      quantity: hours.toString(),
      unitPrice: laborRate.toFixed(2),
      total: (hours * laborRate).toFixed(2),
    });
  }
  if (materials > 0) {
    lineItems.push({
      description: "Materials & Supplies",
      quantity: "1",
      unitPrice: materials.toFixed(2),
      total: materials.toFixed(2),
    });
  }
  const preContingency = lineItems.reduce((s, i) => s + Number(i.total), 0);
  if (contingency > 0 && preContingency > 0) {
    const contingencyAmt = preContingency * (contingency / 100);
    lineItems.push({
      description: `Contingency (${contingency}%)`,
      quantity: "1",
      unitPrice: contingencyAmt.toFixed(2),
      total: contingencyAmt.toFixed(2),
    });
  }

  const subtotal = lineItems.reduce((s, i) => s + Number(i.total), 0);

  const handleCreate = () => {
    if (!clientId) return;
    createMutation.mutate({
      estimate: {
        title: `Special Project - ${projectTypes.find(p => p.value === projectType)?.label}`,
        clientId,
        status: "draft",
        subtotal: subtotal.toFixed(2),
        tax: "0",
        total: subtotal.toFixed(2),
        notes: `Auto-generated from Special Projects calculator.\nProject Type: ${projectType}, Labor: ${hours}h, Materials: $${materials}, Contingency: ${contingency}%`,
      },
      lineItems,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Special Projects
          </CardTitle>
          <CardDescription>Calculate costs for special project engagements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClientSelector value={clientId} onChange={setClientId} />
          <div className="space-y-2">
            <Label>Project Type</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger data-testid="select-sp-project-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projectTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Labor Hours</Label>
              <Input type="number" placeholder="e.g. 40" value={laborHours} onChange={(e) => setLaborHours(e.target.value)} data-testid="input-sp-labor" />
            </div>
            <div className="space-y-2">
              <Label>Material Cost ($)</Label>
              <Input type="number" placeholder="e.g. 5000" value={materialCost} onChange={(e) => setMaterialCost(e.target.value)} data-testid="input-sp-materials" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Contingency (%)</Label>
            <Input type="number" placeholder="e.g. 10" value={contingencyPct} onChange={(e) => setContingencyPct(e.target.value)} data-testid="input-sp-contingency" />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            disabled={lineItems.length === 0 || !clientId || createMutation.isPending}
            onClick={handleCreate}
            data-testid="button-create-estimate-sp"
          >
            {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create Estimate
          </Button>
        </CardFooter>
      </Card>
      <PriceBreakdown lineItems={lineItems} title="Special Projects Estimate" />
    </div>
  );
}

function FacilitySolutionsCalc() {
  const { findRate } = useCatalogRates();
  const createMutation = useCreateEstimateFromCalc();

  const [sqFootage, setSqFootage] = useState("");
  const [serviceFrequency, setServiceFrequency] = useState("monthly");
  const [numEquipment, setNumEquipment] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);

  const sqft = parseFloat(sqFootage) || 0;
  const equipment = parseInt(numEquipment) || 0;
  const freqMap: Record<string, number> = { weekly: 52, biweekly: 26, monthly: 12, quarterly: 4 };
  const visits = freqMap[serviceFrequency] || 12;

  const facilityRate = findRate("facility_solutions", "maintenance", 0.08);
  const equipmentRate = findRate("facility_solutions", "equipment", 150);

  const lineItems: LineItem[] = [];
  if (sqft > 0) {
    const maintenanceTotal = sqft * facilityRate * visits;
    lineItems.push({
      description: `Facility Maintenance (${sqft.toLocaleString()} sqft × ${visits} visits/yr)`,
      quantity: (sqft * visits).toString(),
      unitPrice: facilityRate.toFixed(2),
      total: maintenanceTotal.toFixed(2),
    });
  }
  if (equipment > 0) {
    const equipTotal = equipment * equipmentRate * visits;
    lineItems.push({
      description: `Equipment/Asset Servicing (${equipment} units × ${visits} visits/yr)`,
      quantity: (equipment * visits).toString(),
      unitPrice: equipmentRate.toFixed(2),
      total: equipTotal.toFixed(2),
    });
  }

  const subtotal = lineItems.reduce((s, i) => s + Number(i.total), 0);

  const handleCreate = () => {
    if (!clientId) return;
    createMutation.mutate({
      estimate: {
        title: `Facility Solutions - ${sqft.toLocaleString()} sqft`,
        clientId,
        status: "draft",
        subtotal: subtotal.toFixed(2),
        tax: "0",
        total: subtotal.toFixed(2),
        notes: `Auto-generated from Facility Solutions calculator.\nSq Footage: ${sqft}, Frequency: ${serviceFrequency}, Equipment Units: ${equipment}`,
      },
      lineItems,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Facility Solutions
          </CardTitle>
          <CardDescription>Calculate costs for facility management services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClientSelector value={clientId} onChange={setClientId} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Square Footage</Label>
              <Input type="number" placeholder="e.g. 25000" value={sqFootage} onChange={(e) => setSqFootage(e.target.value)} data-testid="input-fs-sqft" />
            </div>
            <div className="space-y-2">
              <Label>Service Frequency</Label>
              <Select value={serviceFrequency} onValueChange={setServiceFrequency}>
                <SelectTrigger data-testid="select-fs-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Number of Equipment/Asset Units</Label>
            <Input type="number" placeholder="e.g. 10" value={numEquipment} onChange={(e) => setNumEquipment(e.target.value)} data-testid="input-fs-equipment" />
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            disabled={lineItems.length === 0 || !clientId || createMutation.isPending}
            onClick={handleCreate}
            data-testid="button-create-estimate-fs"
          >
            {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create Estimate
          </Button>
        </CardFooter>
      </Card>
      <PriceBreakdown lineItems={lineItems} title="Facility Solutions Estimate" />
    </div>
  );
}

function JanitorialCalc() {
  const { findRate } = useCatalogRates();
  const createMutation = useCreateEstimateFromCalc();

  const [sqFootage, setSqFootage] = useState("");
  const [cleaningFrequency, setCleaningFrequency] = useState("daily");
  const [numRestrooms, setNumRestrooms] = useState("");
  const [floorStripping, setFloorStripping] = useState(false);
  const [windowCleaning, setWindowCleaning] = useState(false);
  const [pressureWashing, setPressureWashing] = useState(false);
  const [clientId, setClientId] = useState<number | null>(null);

  const sqft = parseFloat(sqFootage) || 0;
  const restrooms = parseInt(numRestrooms) || 0;
  const freqMap: Record<string, number> = { daily: 260, "3x_week": 156, "2x_week": 104, weekly: 52, monthly: 12 };
  const visits = freqMap[cleaningFrequency] || 260;

  const cleaningRate = findRate("janitorial", "cleaning", 0.06);
  const restroomRate = findRate("janitorial", "restroom", 25);
  const floorRate = findRate("janitorial", "floor", 0.15);
  const windowRate = findRate("janitorial", "window", 3000);
  const pressureRate = findRate("janitorial", "pressure", 2500);

  const lineItems: LineItem[] = [];
  if (sqft > 0) {
    const cleanTotal = sqft * cleaningRate * visits;
    lineItems.push({
      description: `General Cleaning (${sqft.toLocaleString()} sqft × ${visits} visits/yr)`,
      quantity: (sqft * visits).toString(),
      unitPrice: cleaningRate.toFixed(4),
      total: cleanTotal.toFixed(2),
    });
  }
  if (restrooms > 0) {
    const rrTotal = restrooms * restroomRate * visits;
    lineItems.push({
      description: `Restroom Servicing (${restrooms} restrooms × ${visits} visits/yr)`,
      quantity: (restrooms * visits).toString(),
      unitPrice: restroomRate.toFixed(2),
      total: rrTotal.toFixed(2),
    });
  }
  if (floorStripping && sqft > 0) {
    const floorTotal = sqft * floorRate * 2;
    lineItems.push({
      description: "Floor Stripping & Waxing (2x/yr)",
      quantity: (sqft * 2).toString(),
      unitPrice: floorRate.toFixed(2),
      total: floorTotal.toFixed(2),
    });
  }
  if (windowCleaning) {
    lineItems.push({
      description: "Window Cleaning (quarterly)",
      quantity: "4",
      unitPrice: windowRate.toFixed(2),
      total: (windowRate * 4).toFixed(2),
    });
  }
  if (pressureWashing) {
    lineItems.push({
      description: "Pressure Washing (semi-annual)",
      quantity: "2",
      unitPrice: pressureRate.toFixed(2),
      total: (pressureRate * 2).toFixed(2),
    });
  }

  const subtotal = lineItems.reduce((s, i) => s + Number(i.total), 0);

  const handleCreate = () => {
    if (!clientId) return;
    createMutation.mutate({
      estimate: {
        title: `Janitorial Services - ${sqft.toLocaleString()} sqft`,
        clientId,
        status: "draft",
        subtotal: subtotal.toFixed(2),
        tax: "0",
        total: subtotal.toFixed(2),
        notes: `Auto-generated from Janitorial calculator.\nSq Footage: ${sqft}, Frequency: ${cleaningFrequency}, Restrooms: ${restrooms}, Add-ons: ${[floorStripping && "Floor Stripping", windowCleaning && "Window Cleaning", pressureWashing && "Pressure Washing"].filter(Boolean).join(", ") || "None"}`,
      },
      lineItems,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SprayCan className="h-5 w-5" />
            Janitorial
          </CardTitle>
          <CardDescription>Calculate costs for janitorial and cleaning services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClientSelector value={clientId} onChange={setClientId} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Square Footage</Label>
              <Input type="number" placeholder="e.g. 30000" value={sqFootage} onChange={(e) => setSqFootage(e.target.value)} data-testid="input-jan-sqft" />
            </div>
            <div className="space-y-2">
              <Label>Cleaning Frequency</Label>
              <Select value={cleaningFrequency} onValueChange={setCleaningFrequency}>
                <SelectTrigger data-testid="select-jan-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (M-F)</SelectItem>
                  <SelectItem value="3x_week">3x per Week</SelectItem>
                  <SelectItem value="2x_week">2x per Week</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Number of Restrooms</Label>
            <Input type="number" placeholder="e.g. 8" value={numRestrooms} onChange={(e) => setNumRestrooms(e.target.value)} data-testid="input-jan-restrooms" />
          </div>
          <div className="space-y-3">
            <Label>Optional Add-ons</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="floor-stripping" checked={floorStripping} onCheckedChange={(v) => setFloorStripping(!!v)} data-testid="checkbox-jan-floor" />
                <label htmlFor="floor-stripping" className="text-sm">Floor Stripping & Waxing</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="window-cleaning" checked={windowCleaning} onCheckedChange={(v) => setWindowCleaning(!!v)} data-testid="checkbox-jan-window" />
                <label htmlFor="window-cleaning" className="text-sm">Window Cleaning</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="pressure-washing" checked={pressureWashing} onCheckedChange={(v) => setPressureWashing(!!v)} data-testid="checkbox-jan-pressure" />
                <label htmlFor="pressure-washing" className="text-sm">Pressure Washing</label>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            disabled={lineItems.length === 0 || !clientId || createMutation.isPending}
            onClick={handleCreate}
            data-testid="button-create-estimate-jan"
          >
            {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create Estimate
          </Button>
        </CardFooter>
      </Card>
      <PriceBreakdown lineItems={lineItems} title="Janitorial Estimate" />
    </div>
  );
}

function PropertyAssessmentCalc() {
  const { findRate } = useCatalogRates();
  const createMutation = useCreateEstimateFromCalc();

  const [propertyType, setPropertyType] = useState("commercial");
  const [sqFootage, setSqFootage] = useState("");
  const [numUnits, setNumUnits] = useState("");
  const [structural, setStructural] = useState(true);
  const [mechanical, setMechanical] = useState(false);
  const [electrical, setElectrical] = useState(false);
  const [plumbing, setPlumbing] = useState(false);
  const [environmental, setEnvironmental] = useState(false);
  const [clientId, setClientId] = useState<number | null>(null);

  const sqft = parseFloat(sqFootage) || 0;
  const units = parseInt(numUnits) || 0;

  const baseRate = findRate("property_assessment", "assessment", 0.03);
  const unitRate = findRate("property_assessment", "unit", 200);

  const propertyTypes = [
    { value: "commercial", label: "Commercial" },
    { value: "industrial", label: "Industrial" },
    { value: "residential_multi", label: "Multi-Family Residential" },
    { value: "mixed_use", label: "Mixed Use" },
    { value: "retail", label: "Retail" },
  ];

  const scopes = [
    { id: "structural", label: "Structural", checked: structural, set: setStructural, rate: 1.0 },
    { id: "mechanical", label: "Mechanical (HVAC)", checked: mechanical, set: setMechanical, rate: 0.8 },
    { id: "electrical", label: "Electrical Systems", checked: electrical, set: setElectrical, rate: 0.6 },
    { id: "plumbing", label: "Plumbing", checked: plumbing, set: setPlumbing, rate: 0.5 },
    { id: "environmental", label: "Environmental", checked: environmental, set: setEnvironmental, rate: 0.7 },
  ];

  const selectedScopes = scopes.filter((s) => s.checked);

  const lineItems: LineItem[] = [];
  if (sqft > 0 && selectedScopes.length > 0) {
    for (const scope of selectedScopes) {
      const scopeTotal = sqft * baseRate * scope.rate;
      lineItems.push({
        description: `${scope.label} Assessment (${sqft.toLocaleString()} sqft)`,
        quantity: sqft.toString(),
        unitPrice: (baseRate * scope.rate).toFixed(4),
        total: scopeTotal.toFixed(2),
      });
    }
  }
  if (units > 0) {
    const unitTotal = units * unitRate;
    lineItems.push({
      description: `Per-Unit/Floor Inspection (${units} units)`,
      quantity: units.toString(),
      unitPrice: unitRate.toFixed(2),
      total: unitTotal.toFixed(2),
    });
  }

  const subtotal = lineItems.reduce((s, i) => s + Number(i.total), 0);

  const handleCreate = () => {
    if (!clientId) return;
    createMutation.mutate({
      estimate: {
        title: `Property Assessment - ${propertyTypes.find(p => p.value === propertyType)?.label}`,
        clientId,
        status: "draft",
        subtotal: subtotal.toFixed(2),
        tax: "0",
        total: subtotal.toFixed(2),
        notes: `Auto-generated from Property Assessment calculator.\nProperty Type: ${propertyType}, Sq Footage: ${sqft}, Units/Floors: ${units}, Scope: ${selectedScopes.map(s => s.label).join(", ")}`,
      },
      lineItems,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Property Assessment
          </CardTitle>
          <CardDescription>Calculate costs for property assessment and inspection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClientSelector value={clientId} onChange={setClientId} />
          <div className="space-y-2">
            <Label>Property Type</Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger data-testid="select-pa-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Square Footage</Label>
              <Input type="number" placeholder="e.g. 100000" value={sqFootage} onChange={(e) => setSqFootage(e.target.value)} data-testid="input-pa-sqft" />
            </div>
            <div className="space-y-2">
              <Label>Number of Units/Floors</Label>
              <Input type="number" placeholder="e.g. 12" value={numUnits} onChange={(e) => setNumUnits(e.target.value)} data-testid="input-pa-units" />
            </div>
          </div>
          <div className="space-y-3">
            <Label>Inspection Scope</Label>
            <div className="space-y-2">
              {scopes.map((scope) => (
                <div key={scope.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`scope-${scope.id}`}
                    checked={scope.checked}
                    onCheckedChange={(v) => scope.set(!!v)}
                    data-testid={`checkbox-pa-${scope.id}`}
                  />
                  <label htmlFor={`scope-${scope.id}`} className="text-sm">{scope.label}</label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            disabled={lineItems.length === 0 || !clientId || createMutation.isPending}
            onClick={handleCreate}
            data-testid="button-create-estimate-pa"
          >
            {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create Estimate
          </Button>
        </CardFooter>
      </Card>
      <PriceBreakdown lineItems={lineItems} title="Property Assessment Estimate" />
    </div>
  );
}

export default function CalculatorsSection() {
  const [activeCalc, setActiveCalc] = useState("building_engineering");

  return (
    <div className="space-y-4">
      <Tabs value={activeCalc} onValueChange={setActiveCalc}>
        <TabsList className="flex flex-wrap h-auto gap-1" data-testid="tabs-calculators">
          <TabsTrigger value="building_engineering" data-testid="tab-calc-be">
            <Building2 className="mr-1.5 h-4 w-4" />
            Building Engineering
          </TabsTrigger>
          <TabsTrigger value="special_projects" data-testid="tab-calc-sp">
            <Wrench className="mr-1.5 h-4 w-4" />
            Special Projects
          </TabsTrigger>
          <TabsTrigger value="facility_solutions" data-testid="tab-calc-fs">
            <Building2 className="mr-1.5 h-4 w-4" />
            Facility Solutions
          </TabsTrigger>
          <TabsTrigger value="janitorial" data-testid="tab-calc-jan">
            <SprayCan className="mr-1.5 h-4 w-4" />
            Janitorial
          </TabsTrigger>
          <TabsTrigger value="property_assessment" data-testid="tab-calc-pa">
            <ClipboardCheck className="mr-1.5 h-4 w-4" />
            Property Assessment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="building_engineering" className="mt-4">
          <BuildingEngineeringCalc />
        </TabsContent>
        <TabsContent value="special_projects" className="mt-4">
          <SpecialProjectsCalc />
        </TabsContent>
        <TabsContent value="facility_solutions" className="mt-4">
          <FacilitySolutionsCalc />
        </TabsContent>
        <TabsContent value="janitorial" className="mt-4">
          <JanitorialCalc />
        </TabsContent>
        <TabsContent value="property_assessment" className="mt-4">
          <PropertyAssessmentCalc />
        </TabsContent>
      </Tabs>
    </div>
  );
}
