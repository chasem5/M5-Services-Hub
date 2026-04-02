import { useState } from "react";
import { ChevronDown, Zap, Database, GitMerge, CheckCircle2, RefreshCw, Building2, MapPin, Users, Briefcase, Receipt, FileSignature, Search, AlertCircle, UserCheck } from "lucide-react";

function SectionHeader({ icon: Icon, title, description, open, onToggle, badge }: {
  icon: any; title: string; description: string; open: boolean; onToggle: () => void; badge?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="bg-blue-50 p-2 rounded-full shrink-0">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            {badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{badge}</span>
            )}
          </div>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <ChevronDown
        className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function SyncButton({ icon: Icon, label, description }: { icon: any; label: string; description: string }) {
  return (
    <div className="border rounded-lg p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-blue-600" />
        <h4 className="text-xs font-semibold text-gray-800">{label}</h4>
      </div>
      <p className="text-[10px] text-gray-500">{description}</p>
      <button className="mt-1 w-full border border-gray-200 rounded text-[10px] font-medium px-2 py-1 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1">
        <RefreshCw className="h-3 w-3" /> {label}
      </button>
    </div>
  );
}

function CoverageBar({ label, api, csv, total }: { label: string; api: number; csv: number; total: number }) {
  const apiPct = total > 0 ? Math.round((api / total) * 100) : 0;
  const csvPct = total > 0 ? Math.round((csv / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-gray-500">
        <span className="font-medium text-gray-700">{label}</span>
        <span>{total.toLocaleString()} total</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 gap-px">
        <div className="bg-blue-500" style={{ width: `${apiPct}%` }} />
        <div className="bg-amber-400" style={{ width: `${csvPct}%` }} />
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{apiPct}% API</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{csvPct}% CSV</span>
      </div>
    </div>
  );
}

export function BuildOpsAdminRedesign() {
  const [open, setOpen] = useState({ connection: true, health: true, mappings: false });
  const toggle = (k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="min-h-screen bg-gray-50/60 p-6">
      <div className="max-w-3xl mx-auto space-y-3">

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Admin → BuildOps</div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">BuildOps Data</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage your BuildOps integration, data health, and field mappings</p>
        </div>

        {/* ── Section 1: Connection & Sync ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SectionHeader
            icon={Zap}
            title="Connection & Sync"
            description="API credentials, sync triggers, and sync history"
            open={open.connection}
            onToggle={() => toggle("connection")}
            badge="Connected"
          />
          {open.connection && (
            <div className="border-t">
              {/* Credentials */}
              <div className="px-6 py-4 border-b bg-gray-50/40">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">API Credentials</p>
                  <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-500">Client ID</label>
                    <div className="h-7 rounded border border-gray-200 bg-white px-2 flex items-center text-xs text-gray-700 font-mono">m5-prod-xxxxx</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-500">Client Secret</label>
                    <div className="h-7 rounded border border-gray-200 bg-white px-2 flex items-center text-xs text-gray-400">••••••••••••••</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-500">Tenant ID</label>
                    <div className="h-7 rounded border border-gray-200 bg-white px-2 flex items-center text-xs text-gray-700 font-mono">tenant-abc123</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-500">Default Department</label>
                    <div className="h-7 rounded border border-gray-200 bg-white px-2 flex items-center text-xs text-gray-700">East Bay Operations</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="bg-blue-600 text-white text-[10px] font-medium px-3 py-1.5 rounded hover:bg-blue-700">Save Credentials</button>
                  <button className="border border-gray-200 text-[10px] font-medium px-3 py-1.5 rounded hover:bg-gray-50 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" /> Test Connection
                  </button>
                </div>
              </div>

              {/* Sync Triggers */}
              <div className="px-6 py-4 border-b">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Sync Triggers</p>
                <div className="text-[10px] bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-center gap-2 mb-3 text-amber-700">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Auto-sync runs every 4 hours · Last run: 2h ago · Next: 2h from now
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <SyncButton icon={RefreshCw} label="Sync Customers" description="Import BuildOps customers" />
                  <SyncButton icon={Building2} label="Sync Properties" description="Pull properties & buildings" />
                  <SyncButton icon={MapPin} label="Fix Map Coords" description="Geocode missing addresses" />
                  <SyncButton icon={Users} label="Sync Employees" description="Pull M5 employee list" />
                  <SyncButton icon={Briefcase} label="Sync Jobs" description="Jobs with revenue & cost" />
                  <SyncButton icon={Receipt} label="Sync Invoices" description="Invoice amounts & status" />
                  <SyncButton icon={FileSignature} label="Sync Agreements" description="Service agreements & dates" />
                  <SyncButton icon={Search} label="Run Diagnostics" description="Probe employee endpoints" />
                </div>
              </div>

              {/* Sync Audit */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Sync History</p>
                <div className="space-y-1">
                  {[
                    { time: "2h ago", action: "Invoices sync: 0 created, 1,247 updated", ok: true },
                    { time: "6h ago", action: "Jobs sync: 3 created, 872 updated", ok: true },
                    { time: "10h ago", action: "Customers sync: 0 imported, 48 updated", ok: true },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] py-1 border-b border-gray-50 last:border-0">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.ok ? "bg-green-400" : "bg-red-400"}`} />
                      <span className="text-gray-400 shrink-0">{row.time}</span>
                      <span className="text-gray-600">{row.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Data Health ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SectionHeader
            icon={Database}
            title="Data Health"
            description="API vs CSV coverage, merge conflicts, import log, and field audit"
            open={open.health}
            onToggle={() => toggle("health")}
            badge="2 conflicts"
          />
          {open.health && (
            <div className="border-t">
              {/* Coverage */}
              <div className="px-6 py-4 border-b">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Data Source Coverage</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <CoverageBar label="Jobs" api={1192} csv={847} total={1192} />
                    <CoverageBar label="Invoices" api={3841} csv={2109} total={3841} />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <p className="text-[10px] font-semibold text-gray-600">Legend</p>
                    <div className="space-y-1 text-[10px] text-gray-500">
                      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block shrink-0" /><span>API sync — auto-refreshed every 4h</span></div>
                      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" /><span>CSV import — payment data, department, AM</span></div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] text-gray-500 space-y-0.5">
                      <p>Last API sync: <span className="text-gray-700">2h ago</span></p>
                      <p>Last CSV import: <span className="text-gray-700">Yesterday 3:42 PM</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Merge Conflicts */}
              <div className="px-6 py-4 border-b">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Merge Conflicts</p>
                  <span className="text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">2 pending</span>
                </div>
                <div className="space-y-2">
                  {[
                    { field: "outstanding_balance", job: "INV-20849", api: "$0.00", csv: "$3,200.00" },
                    { field: "department", job: "JOB-11772", api: "Bay Area", csv: "East Bay" },
                  ].map((c, i) => (
                    <div key={i} className="border rounded-lg p-2.5 text-[10px] flex items-center gap-3 bg-orange-50/40">
                      <div className="flex-1 space-y-0.5">
                        <p className="font-semibold text-gray-700">{c.field} · <span className="font-mono text-gray-500">{c.job}</span></p>
                        <p className="text-gray-500">API: <span className="text-blue-600 font-medium">{c.api}</span> · CSV: <span className="text-amber-600 font-medium">{c.csv}</span></p>
                      </div>
                      <div className="flex gap-1">
                        <button className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50">Resolve</button>
                        <button className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-400 hover:bg-gray-50">Ignore</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Field Audit tabs */}
              <div className="px-6 py-4">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Field Audit</p>
                <div className="flex gap-1 mb-3">
                  {["Jobs", "Invoices", "Agreements", "Quotes", "Customers"].map((t, i) => (
                    <button key={t} className={`text-[10px] px-2 py-1 rounded font-medium ${i === 0 ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>{t}</button>
                  ))}
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Job #", "Customer", "Department", "AM", "Status", "Revenue"].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        ["JOB-11892", "JLL - Church", "East Bay", "M. Torres", "Complete", "$14,200"],
                        ["JOB-11771", "CIP Real Estate", "East Bay", "J. Reyes", "In Progress", "$8,500"],
                        ["JOB-11654", "LBA Realty", "South Bay", "—", "Scheduled", "$3,200"],
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {row.map((cell, j) => (
                            <td key={j} className={`px-3 py-2 text-gray-600 ${j === 0 ? "font-mono text-gray-700" : ""}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 3: Mappings ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SectionHeader
            icon={GitMerge}
            title="Mappings"
            description="BuildOps customer matching and account manager linking"
            open={open.mappings}
            onToggle={() => toggle("mappings")}
          />
          {open.mappings && (
            <div className="border-t px-6 py-4 space-y-4">
              {/* Customer Matching */}
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Customer Matching</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 font-semibold">BuildOps Customer</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-semibold">CRM Client</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        ["JLL - Church Street", "JLL - Church", "Matched"],
                        ["CIP Real Estate LLC", "CIP Real Estate", "Matched"],
                        ["LBA Realty Partners", null, "Unmatched"],
                      ].map(([bo, crm, status], i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700">{bo}</td>
                          <td className="px-3 py-2 text-gray-600">{crm ?? <span className="text-gray-400 italic">—</span>}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded-full font-medium ${status === "Matched" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AM Mapping */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Account Manager Mapping</p>
                  <button className="text-[10px] border border-gray-200 rounded px-2 py-1 flex items-center gap-1 hover:bg-gray-50">
                    <UserCheck className="h-3 w-3 text-blue-500" /> Auto-Match by Email
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 font-semibold">CRM User</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-semibold">BuildOps Rep ID</th>
                        <th className="w-20 px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        ["Miguel Torres", "rep-4821"],
                        ["Jessica Reyes", "rep-3307"],
                        ["Carlos Mendez", null],
                      ].map(([name, repId], i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-700">{name}</td>
                          <td className="px-3 py-2 font-mono text-gray-600">{repId ?? <span className="text-gray-400 italic">Not linked</span>}</td>
                          <td className="px-3 py-2">
                            <button className="text-[9px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 hover:bg-gray-50">
                              {repId ? "Edit" : "Link"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
