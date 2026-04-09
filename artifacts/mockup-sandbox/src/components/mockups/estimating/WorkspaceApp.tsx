import { useState } from "react";

const SECTIONS = [
  { id: 1, name: "HVAC Replacement", lineCount: 4, margin: 32, warning: false },
  { id: 2, name: "Electrical Panel Upgrade", lineCount: 3, margin: 18, warning: true },
  { id: 3, name: "Plumbing Rough-In", lineCount: 5, margin: 28, warning: false },
  { id: 4, name: "General Conditions", lineCount: 2, margin: 22, warning: false },
];

type LineItem = {
  id: number;
  description: string;
  type: "labor" | "material" | "equipment" | "subcontractor" | "fee";
  baseLaborHours: number;
  baseMaterial: number;
  laborBuffer: number;
  materialWaste: number;
  difficulty: number;
  margin: number;
  warnings: string[];
};

const LINES: Record<number, LineItem[]> = {
  1: [
    { id: 1, description: "RTU-3 Rooftop Unit Removal & Disposal", type: "labor", baseLaborHours: 16, baseMaterial: 0, laborBuffer: 10, materialWaste: 0, difficulty: 15, margin: 35, warnings: [] },
    { id: 2, description: "Carrier 5-Ton RTU Supply & Install", type: "material", baseLaborHours: 24, baseMaterial: 8400, laborBuffer: 10, materialWaste: 5, difficulty: 10, margin: 35, warnings: ["Material appears underbudgeted for 5-ton RTU — typical range $9,500–$12,000"] },
    { id: 3, description: "Refrigerant Line Set", type: "material", baseLaborHours: 4, baseMaterial: 480, laborBuffer: 5, materialWaste: 8, difficulty: 0, margin: 35, warnings: [] },
    { id: 4, description: "Crane Lift & Rigging", type: "equipment", baseLaborHours: 0, baseMaterial: 1200, laborBuffer: 0, materialWaste: 0, difficulty: 0, margin: 25, warnings: [] },
  ],
  2: [
    { id: 5, description: "200A Panel Removal", type: "labor", baseLaborHours: 8, baseMaterial: 0, laborBuffer: 10, materialWaste: 0, difficulty: 5, margin: 30, warnings: ["Labor hours below typical range for panel swap (12–20 hrs)"] },
    { id: 6, description: "400A Main Panel & Breakers", type: "material", baseLaborHours: 12, baseMaterial: 3200, laborBuffer: 10, materialWaste: 3, difficulty: 10, margin: 30, warnings: [] },
    { id: 7, description: "Permit & Inspection Fee", type: "fee", baseLaborHours: 0, baseMaterial: 450, laborBuffer: 0, materialWaste: 0, difficulty: 0, margin: 0, warnings: [] },
  ],
  3: [
    { id: 8, description: "Rough-In Labor — Floors 1–3", type: "labor", baseLaborHours: 40, baseMaterial: 0, laborBuffer: 15, materialWaste: 0, difficulty: 20, margin: 32, warnings: [] },
    { id: 9, description: "PVC Supply & Drain Piping", type: "material", baseLaborHours: 0, baseMaterial: 1800, laborBuffer: 0, materialWaste: 10, difficulty: 0, margin: 32, warnings: [] },
    { id: 10, description: "Water Heater — 80gal Commercial", type: "material", baseLaborHours: 6, baseMaterial: 2100, laborBuffer: 5, materialWaste: 2, difficulty: 5, margin: 32, warnings: [] },
    { id: 11, description: "Pressure Testing", type: "labor", baseLaborHours: 4, baseMaterial: 0, laborBuffer: 0, materialWaste: 0, difficulty: 0, margin: 32, warnings: [] },
    { id: 12, description: "Backflow Preventer", type: "material", baseLaborHours: 2, baseMaterial: 380, laborBuffer: 5, materialWaste: 0, difficulty: 0, margin: 32, warnings: [] },
  ],
  4: [
    { id: 13, description: "Project Management (6 weeks)", type: "labor", baseLaborHours: 30, baseMaterial: 0, laborBuffer: 0, materialWaste: 0, difficulty: 0, margin: 40, warnings: [] },
    { id: 14, description: "Dumpster & Site Cleanup", type: "fee", baseLaborHours: 0, baseMaterial: 800, laborBuffer: 0, materialWaste: 0, difficulty: 0, margin: 15, warnings: [] },
  ],
};

const LABOR_RATE = 95;

function calcLine(l: LineItem) {
  const adjLaborHours = l.baseLaborHours * (1 + (l.laborBuffer + l.difficulty) / 100);
  const adjLaborCost = adjLaborHours * LABOR_RATE;
  const adjMaterial = l.baseMaterial * (1 + l.materialWaste / 100);
  const sellPrice = (adjLaborCost + adjMaterial) * (1 + l.margin / 100);
  return { adjLaborHours, adjLaborCost, adjMaterial, sellPrice };
}

const AI_SUGGESTIONS = [
  { type: "missing", text: "Scope typically includes air balancing for RTU replacement — consider adding a line item." },
  { type: "warning", text: "Electrical section margin (18%) is below the 25% company threshold — approval will be required before sync." },
  { type: "question", text: "Is asbestos abatement required for existing ductwork? This affects disposal costs significantly." },
  { type: "suggestion", text: "Based on similar HVAC jobs at this property size, total should be in the $28K–$35K range. Current total: $31,240." },
];

type Mode = "Quote" | "Estimate" | "Both";
type Tab = "workspace" | "sync" | "summary";

export function WorkspaceApp() {
  const [selectedSection, setSelectedSection] = useState(1);
  const [mode, setMode] = useState<Mode>("Estimate");
  const [tab, setTab] = useState<Tab>("workspace");
  const [expandedLine, setExpandedLine] = useState<number | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const lines = LINES[selectedSection] ?? [];
  const allLines = Object.values(LINES).flat();
  const grandTotal = allLines.reduce((sum, l) => sum + calcLine(l).sellPrice, 0);
  const totalCost = allLines.reduce((sum, l) => {
    const c = calcLine(l);
    return sum + c.adjLaborCost + c.adjMaterial;
  }, 0);
  const overallMargin = totalCost > 0 ? ((grandTotal - totalCost) / grandTotal) * 100 : 0;
  const needsApproval = overallMargin < 25 || SECTIONS.some(s => s.warning);

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col font-sans">
      {/* ── Top Nav ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-[#161922]">
        <div className="flex items-center gap-3">
          <button className="text-white/40 hover:text-white text-sm">← Opportunities</button>
          <span className="text-white/20">/</span>
          <div>
            <span className="font-semibold text-white text-sm">Westgate Office Complex — HVAC + Electrical + Plumbing</span>
            <span className="ml-3 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">In Progress</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex bg-white/5 rounded-lg p-0.5 text-xs">
            {(["Quote", "Estimate", "Both"] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-md transition-all ${mode === m ? "bg-blue-600 text-white" : "text-white/50 hover:text-white"}`}>
                {m}
              </button>
            ))}
          </div>
          <div className="flex bg-white/5 rounded-lg p-0.5 text-xs">
            {(["workspace", "sync", "summary"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md capitalize transition-all ${tab === t ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>
                {t === "sync" ? "Sync Center" : t}
              </button>
            ))}
          </div>
          {needsApproval && (
            <button onClick={() => setApprovalOpen(true)}
              className="flex items-center gap-1.5 text-xs bg-amber-500/20 border border-amber-400/40 text-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-500/30 transition-colors">
              ⚠ Approval Required
            </button>
          )}
        </div>
      </header>

      {/* ── Grand Total Banner ── */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#1a1f2e] border-b border-white/5 text-sm">
        <div className="flex items-center gap-6">
          <span className="text-white/50">Westgate Office Complex · 123 Commerce Blvd</span>
          <span className="text-white/30">|</span>
          <span className="text-white/50">Service Lines: <span className="text-white/80">HVAC, Electrical, Plumbing</span></span>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-white/50">Total Cost: <span className="text-white/80">${totalCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></span>
          <span className="text-white/50">Sell Price: <span className="text-green-400 font-semibold">${grandTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></span>
          <span className={`font-semibold ${overallMargin >= 25 ? "text-green-400" : "text-amber-400"}`}>
            Margin: {overallMargin.toFixed(1)}%
          </span>
          {overallMargin < 25 && <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Below 25% threshold</span>}
        </div>
      </div>

      {tab === "workspace" && (
        <div className="flex flex-1 overflow-hidden">
          {/* ── LEFT: Sections ── */}
          <aside className="w-52 flex-shrink-0 border-r border-white/10 bg-[#13161f] flex flex-col">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
              <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Sections</span>
              <button className="text-white/30 hover:text-blue-400 text-lg leading-none">+</button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => setSelectedSection(s.id)}
                  className={`w-full text-left px-3 py-2.5 transition-all ${selectedSection === s.id ? "bg-blue-600/20 border-l-2 border-blue-500" : "hover:bg-white/5 border-l-2 border-transparent"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium truncate ${selectedSection === s.id ? "text-blue-300" : "text-white/70"}`}>{s.name}</span>
                    {s.warning && <span className="text-amber-400 text-[10px]">⚠</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/30">{s.lineCount} items</span>
                    <span className={`text-[10px] font-medium ${s.margin >= 25 ? "text-green-400" : "text-amber-400"}`}>{s.margin}% margin</span>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-white/5">
              <div className="text-[10px] text-white/30 mb-1">Overall margin</div>
              <div className={`text-lg font-bold ${overallMargin >= 25 ? "text-green-400" : "text-amber-400"}`}>{overallMargin.toFixed(1)}%</div>
              <div className="w-full h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${overallMargin >= 25 ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${Math.min(overallMargin * 2, 100)}%` }} />
              </div>
            </div>
          </aside>

          {/* ── CENTER: Line Items ── */}
          <main className="flex-1 overflow-y-auto bg-[#0f1117]">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/5">
              <div>
                <h2 className="text-sm font-semibold text-white">{SECTIONS.find(s => s.id === selectedSection)?.name}</h2>
                <span className="text-xs text-white/40">{lines.length} line items</span>
              </div>
              <button className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors">+ Add Line Item</button>
            </div>

            {/* Warnings */}
            {lines.some(l => l.warnings.length > 0) && (
              <div className="mx-4 mt-3 space-y-1.5">
                {lines.filter(l => l.warnings.length > 0).flatMap(l =>
                  l.warnings.map((w, i) => (
                    <div key={`${l.id}-${i}`} className="flex items-start gap-2 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-2">
                      <span className="text-amber-400 text-xs mt-0.5">⚠</span>
                      <span className="text-xs text-amber-300">{w}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="px-4 pt-3 space-y-2 pb-6">
              {lines.map(line => {
                const calc = calcLine(line);
                const isExpanded = expandedLine === line.id;
                return (
                  <div key={line.id} className="bg-[#161922] border border-white/8 rounded-xl overflow-hidden">
                    {/* Main row */}
                    <div className="grid grid-cols-12 gap-2 px-3 py-3 text-xs items-center">
                      <div className="col-span-4 flex items-center gap-2">
                        <button onClick={() => setExpandedLine(isExpanded ? null : line.id)}
                          className="text-white/30 hover:text-white w-4 flex-shrink-0">{isExpanded ? "▾" : "▸"}</button>
                        <span className="text-white/80 truncate">{line.description}</span>
                      </div>
                      <div className="col-span-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          line.type === "labor" ? "bg-blue-500/20 text-blue-300" :
                          line.type === "material" ? "bg-purple-500/20 text-purple-300" :
                          line.type === "equipment" ? "bg-orange-500/20 text-orange-300" :
                          line.type === "fee" ? "bg-slate-500/20 text-slate-300" :
                          "bg-teal-500/20 text-teal-300"
                        }`}>{line.type}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="text-white/40 text-[10px]">Labor</div>
                        <div className="text-white/70">{calc.adjLaborHours.toFixed(1)}h · ${calc.adjLaborCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="text-white/40 text-[10px]">Material</div>
                        <div className="text-white/70">${calc.adjMaterial.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="text-white/40 text-[10px]">Sell</div>
                        <div className="text-green-400 font-semibold">${calc.sellPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                      </div>
                    </div>

                    {/* Expanded buffers */}
                    {isExpanded && (
                      <div className="border-t border-white/5 px-4 py-3 bg-white/[0.02]">
                        <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Buffer Factors</div>
                        <div className="grid grid-cols-5 gap-3">
                          {[
                            { label: "Base Labor (hrs)", value: line.baseLaborHours, suffix: "h", editable: true },
                            { label: "Labor Buffer", value: line.laborBuffer, suffix: "%", editable: true },
                            { label: "Difficulty", value: line.difficulty, suffix: "%", editable: true },
                            { label: "Material Waste", value: line.materialWaste, suffix: "%", editable: true },
                            { label: "Margin", value: line.margin, suffix: "%", editable: true },
                          ].map(f => (
                            <div key={f.label}>
                              <div className="text-[10px] text-white/40 mb-1">{f.label}</div>
                              <div className="bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white/80 flex items-center justify-between">
                                <span>{f.value}</span>
                                <span className="text-white/30">{f.suffix}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-white/40">Adj Labor Hours: </span>
                            <span className="text-blue-300">{calc.adjLaborHours.toFixed(2)} hrs</span>
                          </div>
                          <div>
                            <span className="text-white/40">Adj Material: </span>
                            <span className="text-purple-300">${calc.adjMaterial.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                          </div>
                          <div>
                            <span className="text-white/40">Final Sell Price: </span>
                            <span className="text-green-400 font-semibold">${calc.sellPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </main>

          {/* ── RIGHT: AI Panel ── */}
          <aside className="w-64 flex-shrink-0 border-l border-white/10 bg-[#13161f] flex flex-col">
            <div className="px-3 py-2.5 border-b border-white/5 flex items-center gap-2">
              <div className="h-5 w-5 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[9px] font-bold">AI</div>
              <span className="text-xs font-semibold text-white/70">AI Assistant</span>
              <span className="ml-auto text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">Live</span>
            </div>

            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-3">
              {AI_SUGGESTIONS.map((s, i) => (
                <div key={i} className={`rounded-xl p-3 text-xs border ${
                  s.type === "warning" ? "bg-amber-500/10 border-amber-400/20 text-amber-200" :
                  s.type === "missing" ? "bg-red-500/10 border-red-400/20 text-red-200" :
                  s.type === "question" ? "bg-blue-500/10 border-blue-400/20 text-blue-200" :
                  "bg-white/5 border-white/10 text-white/60"
                }`}>
                  <div className="flex items-center gap-1.5 mb-1.5 font-semibold">
                    <span>{s.type === "warning" ? "⚠" : s.type === "missing" ? "⛔" : s.type === "question" ? "?" : "✦"}</span>
                    <span className="capitalize text-[10px] uppercase tracking-wide opacity-70">{s.type}</span>
                  </div>
                  {s.text}
                </div>
              ))}

              {/* Clarifying questions */}
              <div className="border-t border-white/5 pt-3">
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Ask AI</div>
                <div className="space-y-1.5">
                  {[
                    "What's the typical range for this scope?",
                    "Am I missing any companion items?",
                    "Should this be Quote or Estimate mode?",
                  ].map((q, i) => (
                    <button key={i} className="w-full text-left text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-white/5">
              <textarea
                placeholder="Ask the AI anything about this scope..."
                className="w-full text-xs bg-white/5 border border-white/10 rounded-lg p-2.5 text-white/70 placeholder:text-white/20 resize-none h-16 focus:outline-none focus:border-blue-500/50"
              />
              <button className="mt-1.5 w-full text-xs bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded-lg transition-colors font-medium">
                Send
              </button>
            </div>
          </aside>
        </div>
      )}

      {tab === "sync" && (
        <div className="flex-1 overflow-y-auto px-8 py-6 max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Sync Center</h2>
              <p className="text-sm text-white/40 mt-0.5">Push this opportunity to BuildOps as a quote</p>
            </div>
            {!syncDone && (
              <div className="flex items-center gap-3">
                <input placeholder="Version label (e.g. v1-draft)" className="text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 w-44" />
                <button onClick={() => setSyncDone(true)}
                  className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  Push to BuildOps
                </button>
              </div>
            )}
            {syncDone && <div className="flex items-center gap-2 text-green-400"><span>✓</span><span className="text-sm font-medium">Synced — Quote #BOP-20412 created</span></div>}
          </div>

          {/* Validation checklist */}
          <div className="bg-[#161922] border border-white/8 rounded-xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Validation</h3>
            <div className="space-y-2.5">
              {[
                { label: "Customer ID resolved", ok: true, value: "Westgate Building Services (ID: cust-3841)" },
                { label: "Property ID resolved", ok: true, value: "123 Commerce Blvd (ID: prop-9112)" },
                { label: "Department assigned", ok: true, value: "Facilities Engineering" },
                { label: "Scope of Work populated", ok: true, value: "HVAC Replacement + Electrical + Plumbing Rough-In" },
                { label: "All line items have descriptions", ok: true },
                { label: "Approval obtained", ok: false, value: "Approval required — margin 22.4% < 25% threshold" },
                { label: "Note: BuildOps Sections API", ok: null, value: "Line items will be pushed flat (section name in description) — no sections endpoint available" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className={item.ok === true ? "text-green-400" : item.ok === false ? "text-red-400" : "text-amber-400"}>
                    {item.ok === true ? "✓" : item.ok === false ? "✗" : "⚠"}
                  </span>
                  <div>
                    <span className={item.ok === true ? "text-white/70" : item.ok === false ? "text-red-300" : "text-amber-300"}>{item.label}</span>
                    {item.value && <div className="text-[11px] text-white/30 mt-0.5">{item.value}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payload preview */}
          <div className="bg-[#161922] border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Payload Preview</h3>
            <pre className="text-[11px] text-green-300/80 bg-black/30 rounded-lg p-4 overflow-x-auto leading-relaxed">{`{
  "customerId": "cust-3841",
  "propertyId": "prop-9112",
  "departmentId": "dept-facilities",
  "name": "Westgate Office Complex — HVAC + Electrical + Plumbing",
  "scopeOfWork": "HVAC Replacement + Electrical Panel Upgrade + Plumbing Rough-In",
  "versionLabel": "v1-draft",
  "totalAmount": ${grandTotal.toFixed(2)},
  "lineItems": [
    { "description": "[HVAC] RTU-3 Rooftop Unit Removal", "amount": 1900.00 },
    { "description": "[HVAC] Carrier 5-Ton RTU Supply & Install", "amount": 15470.50 },
    ...
    { "description": "[General] Dumpster & Site Cleanup", "amount": 920.00 }
  ]
}`}</pre>
          </div>
        </div>
      )}

      {tab === "summary" && (
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <h2 className="text-lg font-semibold text-white mb-5">Opportunity Summary</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Sell Price", value: `$${grandTotal.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, color: "text-green-400" },
              { label: "Total Cost", value: `$${totalCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, color: "text-white" },
              { label: "Overall Margin", value: `${overallMargin.toFixed(1)}%`, color: overallMargin >= 25 ? "text-green-400" : "text-amber-400" },
            ].map(s => (
              <div key={s.label} className="bg-[#161922] border border-white/8 rounded-xl p-5">
                <div className="text-xs text-white/40 mb-1">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-[#161922] border border-white/8 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5 text-left">
                <th className="px-4 py-3 text-white/40 font-medium text-xs">Section</th>
                <th className="px-4 py-3 text-white/40 font-medium text-xs text-right">Items</th>
                <th className="px-4 py-3 text-white/40 font-medium text-xs text-right">Sell Price</th>
                <th className="px-4 py-3 text-white/40 font-medium text-xs text-right">Margin</th>
              </tr></thead>
              <tbody>
                {SECTIONS.map(s => {
                  const sLines = LINES[s.id] ?? [];
                  const total = sLines.reduce((sum, l) => sum + calcLine(l).sellPrice, 0);
                  return (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white/80">{s.name}</td>
                      <td className="px-4 py-3 text-right text-white/50">{sLines.length}</td>
                      <td className="px-4 py-3 text-right text-green-400 font-medium">${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td className={`px-4 py-3 text-right font-medium ${s.margin >= 25 ? "text-green-400" : "text-amber-400"}`}>{s.margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Approval Modal ── */}
      {approvalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setApprovalOpen(false)}>
          <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-white mb-1">Approval Required</h3>
            <p className="text-sm text-white/50 mb-4">This opportunity requires manager approval before it can be synced to BuildOps.</p>
            <div className="space-y-2 mb-4 text-xs">
              <div className="flex items-center gap-2 text-amber-300">⚠ Overall margin (22.4%) is below the 25% company threshold</div>
              <div className="flex items-center gap-2 text-amber-300">⚠ Electrical section has an AI warning override</div>
            </div>
            <textarea placeholder="Add a note for the approver..." className="w-full text-xs bg-white/5 border border-white/10 rounded-lg p-3 text-white/70 placeholder:text-white/20 resize-none h-20 focus:outline-none focus:border-blue-500/50 mb-3" />
            <div className="flex gap-2">
              <button className="flex-1 text-sm bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium transition-colors">Submit for Approval</button>
              <button onClick={() => setApprovalOpen(false)} className="text-sm text-white/40 hover:text-white px-4 py-2 rounded-lg transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
