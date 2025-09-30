import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CalendarDays, CheckCircle2, XCircle, Hourglass } from "lucide-react";
import { useLeaveUpload } from "@/hooks/use-leave-upload";

function LineChart({ data }: { data: { x: string; y: number }[] }) {
  if (!data || data.length === 0) return <div className="text-sm text-muted-foreground">No data</div>;
  const values = data.map((d) => d.y || 0);
  const max = Math.max(...values, 1);
  const w = 300;
  const h = 48;
  const gap = w / Math.max(1, data.length - 1);
  const points = data
    .map((d, i) => {
      const x = i * gap;
      const y = h - (d.y / max) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block">
      <polyline points={points} fill="none" stroke="#0ea5a4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ data, columns = 1 }: { data: { label: string; value: number }[]; columns?: number }) {
  if (!data || data.length === 0) return <div className="text-sm text-muted-foreground">No data</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = React.useState<{ left: number; top: number; text: string } | null>(null);

  const cols = Math.max(1, Math.floor(columns || 1));
  const rows = Math.ceil(data.length / cols);
  const columnsData: { label: string; value: number }[][] = [];
  for (let c = 0; c < cols; c++) {
    const start = c * rows;
    columnsData.push(data.slice(start, start + rows));
  }

  return (
    <div className="relative">
      <div className={`flex gap-6`} ref={containerRef}>
        {columnsData.map((col, cidx) => (
          <div key={cidx} className="flex-1 space-y-2 min-w-0">
            {col.map((d) => (
              <div key={d.label} className="flex items-center gap-2">
                <div className="text-xs w-28 truncate">{d.label}</div>
                <div className="h-4 bg-muted flex-1 rounded overflow-hidden relative">
                  <div
                    style={{ width: `${(d.value / max) * 100}%` }}
                    className="h-4 bg-primary rounded"
                    onMouseEnter={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setTooltip({ left: e.clientX - rect.left + 8, top: e.clientY - rect.top - 30, text: `${d.label}: ${d.value}` });
                    }}
                    onMouseMove={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setTooltip({ left: e.clientX - rect.left + 8, top: e.clientY - rect.top - 30, text: `${d.label}: ${d.value}` });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                </div>
                <div className="text-xs text-muted-foreground w-12 text-right">{Math.round(d.value * 100) / 100}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {tooltip && (
        <div className="absolute z-50 pointer-events-none bg-white border rounded px-2 py-1 text-xs shadow" style={{ left: tooltip.left, top: tooltip.top }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

function PieChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data || data.length === 0) return <div className="text-sm text-muted-foreground">No data</div>;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = -90;
  const arcs = data.map((d) => {
    const portion = d.value / total;
    const sweep = portion * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    return { ...d, start, end, portion };
  });

  const radius = 48;
  const cx = 56;
  const cy = 56;
  const polar = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const colors = ["#1e40af", "#0ea5a4", "#2563eb", "#fb923c", "#ef4444", "#84cc16", "#7c3aed", "#06b6d4"];
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
  const [tooltip, setTooltip] = React.useState<{ left: number; top: number; text: string } | null>(null);

  return (
    <div className="flex items-center gap-4 relative" ref={containerRef}>
      <svg width={112} height={112} viewBox={`0 0 ${112} ${112}`}>
        {arcs.map((a, i) => {
          const start = polar(a.start);
          const end = polar(a.end);
          const large = a.end - a.start > 180 ? 1 : 0;
          const d = `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y} Z`;
          const isHover = hoverIdx === i;
          return (
            <path
              key={a.label}
              d={d}
              fill={colors[i % colors.length]}
              stroke="#fff"
              strokeWidth={isHover ? 2 : 1}
              opacity={hoverIdx === null ? 1 : isHover ? 1 : 0.6}
              style={{ transition: "opacity 120ms, stroke-width 120ms" }}
              onMouseEnter={(e) => {
                setHoverIdx(i);
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                setTooltip({ left: e.clientX - rect.left + 8, top: e.clientY - rect.top - 30, text: `${a.label}: ${Math.round((a.value + Number.EPSILON) * 100) / 100} (${Math.round(a.portion * 100)}%)` });
              }}
              onMouseMove={(e) => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                setTooltip({ left: e.clientX - rect.left + 8, top: e.clientY - rect.top - 30, text: `${a.label}: ${Math.round((a.value + Number.EPSILON) * 100) / 100} (${Math.round(a.portion * 100)}%)` });
              }}
              onMouseLeave={() => {
                setHoverIdx(null);
                setTooltip(null);
              }}
            />
          );
        })}
      </svg>
      <div className="space-y-1">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-sm">
            <span style={{ width: 12, height: 12, backgroundColor: colors[i % colors.length] }} className="inline-block rounded-sm" />
            <span className="truncate w-40">{d.label}</span>
            <span className="text-muted-foreground pl-2">{Math.round((d.value + Number.EPSILON) * 100) / 100} ({Math.round((d.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>

      {tooltip && (
        <div className="absolute z-50 pointer-events-none bg-white border rounded px-2 py-1 text-xs shadow" style={{ left: tooltip.left, top: tooltip.top }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default function LeaveReports() {
  const { transactions, summary, analytics, error, isUploading, uploadWorkbook, clear } = useLeaveUpload();
  const [selectedDepartment, setSelectedDepartment] = React.useState<string>("All");

  const parseDate = (v?: string) => {
    if (!v) return null;
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
    const d2 = new Date(String(v).replace(/-/g, "/"));
    if (!isNaN(d2.getTime())) return d2;
    return null;
  };

  const monthlyTrend = React.useMemo(() => {
    const map = new Map<string, { requests: number; days: number }>();
    for (const t of transactions || []) {
      const d = parseDate((t as any).dateFrom || (t as any).dateFiled || (t as any).dateTo);
      const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "unknown";
      const cur = map.get(key) || { requests: 0, days: 0 };
      cur.requests += 1;
      cur.days += ((t as any).withPayDays || 0) + ((t as any).withoutPayDays || 0);
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([k, v]) => {
        const [y, m] = k.split("-");
        let label = k;
        if (y && m && m !== "unknown") {
          const dt = new Date(Number(y), Number(m) - 1, 1);
          label = dt.toLocaleString(undefined, { month: "short" });
        }
        return { month: k, label, ...v };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const filteredSummary = React.useMemo(() => {
    if (!summary || summary.length === 0) return [];
    if (!selectedDepartment || selectedDepartment === "All") return summary;
    return summary.filter((s: any) => (s.department || "Unknown") === selectedDepartment);
  }, [summary, selectedDepartment]);

  const balancesAnalytics = React.useMemo(() => {
    const items = filteredSummary || [];
    const uniqueEmployees = new Set(items.map((s: any) => s.employeeId));
    const vals = items.map((s: any) => s.totalAvailableBalanceYtd || 0);
    const avgAvailable = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
    const lowCount = items.filter((s: any) => (s.totalAvailableBalanceYtd || 0) <= 5).length;

    const topEmployees = items
      .map((s: any) => ({ label: `${s.lastName || ""}, ${s.firstName || ""}`, value: s.totalAvailableBalanceYtd || 0 }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 8);

    const deptMap = new Map<string, { sum: number; count: number }>();
    for (const s of items) {
      const d = (s as any).department || "Unknown";
      const cur = deptMap.get(d) || { sum: 0, count: 0 };
      cur.sum += (s as any).totalAvailableBalanceYtd || 0;
      cur.count += 1;
      deptMap.set(d, cur);
    }
    const deptAvg = Array.from(deptMap.entries())
      .map(([dept, v]) => ({ label: dept, value: v.sum / Math.max(1, v.count) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { uniqueEmployees: uniqueEmployees.size, avgAvailable, lowCount, topEmployees, deptAvg };
  }, [filteredSummary]);

  const departments = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of summary || []) {
      set.add((s as any).department || "Unknown");
    }
    return ["All", ...Array.from(set.values()).sort()];
  }, [summary]);

  // compute reject reasons from transactions (hook doesn't currently provide this)
  const rejectReasons = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions || []) {
      const r = (t as any).rejectReason || (t as any).reason || "";
      if (!r) continue;
      const key = String(r).trim();
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [transactions]);

  // compute upcoming leaves (next 30 days)
  const upcomingLeaves = React.useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const out: any[] = [];
    for (const t of transactions || []) {
      const d = parseDate((t as any).dateFrom || (t as any).dateFiled || (t as any).dateTo);
      if (!d) continue;
      if (d >= now && d <= cutoff) {
        out.push(t);
      }
    }
    return out.sort((a, b) => {
      const da = parseDate((a as any).dateFrom || (a as any).dateFiled || (a as any).dateTo) as any;
      const db = parseDate((b as any).dateFrom || (b as any).dateFiled || (b as any).dateTo) as any;
      return new Date(da).getTime() - new Date(db).getTime();
    });
  }, [transactions]);

  // Top employees controls state
  const [topShow, setTopShow] = React.useState<string>("top5");
  const [topSort, setTopSort] = React.useState<string>("desc");
  const [topFilter, setTopFilter] = React.useState<string>("");

  const fullTopList = React.useMemo(() => {
    const list = (filteredSummary || []).map((s: any) => ({
      label: `${s.lastName || ""}, ${s.firstName || ""}`,
      value: s.totalAvailableBalanceYtd || 0,
      department: s.department || "Unknown",
    }));
    // filter
    const q = String(topFilter || "").trim().toLowerCase();
    const filtered = q ? list.filter((l) => l.label.toLowerCase().includes(q) || (l.department || "").toLowerCase().includes(q)) : list;
    // sort a copy (avoid mutating the original array)
    const sorted = filtered.slice().sort((a, b) => {
      if (topSort === "asc") return (a.value || 0) - (b.value || 0);
      if (topSort === "name") return String(a.label || "").localeCompare(String(b.label || ""));
      // default: desc by value
      return (b.value || 0) - (a.value || 0);
    });
    return sorted;
  }, [filteredSummary, topSort, topFilter]);

  const visibleTop = React.useMemo(() => {
    if (topShow === "top5") return fullTopList.slice(0, 5);
    if (topShow === "top10") return fullTopList.slice(0, 10);
    return fullTopList.slice();
  }, [fullTopList, topShow]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Reports</h1>
          <p className="text-muted-foreground">Upload a single Excel file containing both the Leave Transactions and Leave Summary sheets.</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="workbook-upload"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={async (e) => {
              const f = e.currentTarget.files?.[0];
              if (!f) return;
              try {
                await uploadWorkbook(f);
              } catch (err) {
                // hook handles errors
              }
              e.currentTarget.value = "";
            }}
          />
          <Button onClick={() => document.getElementById("workbook-upload")?.click()} disabled={isUploading}>
            <Upload className="h-4 w-4 mr-2" /> Upload Excel
          </Button>
          {((transactions && transactions.length > 0) || (summary && summary.length > 0)) && (
            <Button variant="secondary" onClick={clear}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {(!transactions || transactions.length === 0) && (!summary || summary.length === 0) ? (
        <Card>
          <CardHeader>
            <CardTitle>Expected Columns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Leave Transactions</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>EmployeeID, Name, LeaveTypeName</li>
                  <li>DateFiled, DateFrom, DateTo</li>
                  <li>WithPayNoOfdays, WoutPayNoOfDays</li>
                  <li>Reason, LeaveStatus, RejectReason</li>
                  <li>DateApprovedSupervisor, DateRejectedSupervisor</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Leave Summary</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>EMPLOYEE ID, LAST NAME, FIRST NAME, MIDDLE NAME</li>
                  <li>DEPARTMENT, HIRE DATE, REGULARIZATION DATE</li>
                  <li>LEAVE TYPE, LEAVES USED DURING DATE RANGE</li>
                  <li>Total Available Balance (YTD), IS ACTIVE</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {transactions && transactions.length > 0 && (
        <div>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="top">Top Employees</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(analytics?.totals?.requests || 0).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">In transactions file</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Approved</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(analytics?.totals?.approved || 0).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Requests approved</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending</CardTitle>
                      <Hourglass className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(analytics?.totals?.pending || 0).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Awaiting approval</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{(analytics?.totals?.rejected || 0).toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Requests rejected</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Leave Count (Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full h-40">
                        <BarChart data={monthlyTrend.map((m) => ({ label: m.label, value: m.days }))} columns={2} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Leave Type (Days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full h-40">
                        <BarChart data={(analytics?.byType || []).map((b: any) => ({ label: b.type, value: (b.withPayDays || 0) + (b.withoutPayDays || 0) }))} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top Leave Reasons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {rejectReasons.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No reject reasons found.</p>
                      ) : (
                        <ul className="space-y-2 text-sm">
                          {rejectReasons.slice(0, 5).map((r: any) => (
                            <li key={r.reason} className="flex items-center justify-between">
                              <span>{r.reason}</span>
                              <span className="text-muted-foreground">{r.count}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="my-4">
                  <div className="h-px bg-border" />
                </div>

                {summary && summary.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-start gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground">Department</label>
                        <select
                          value={selectedDepartment}
                          onChange={(e) => setSelectedDepartment(e.target.value)}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          {departments.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Total Employees</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{balancesAnalytics.uniqueEmployees}</div>
                          <p className="text-xs text-muted-foreground">Unique employees in summary</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Avg Available (YTD)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{balancesAnalytics.avgAvailable.toFixed(2)}</div>
                          <p className="text-xs text-muted-foreground">Average available balance across employees</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Low Balance (≤5 days)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{balancesAnalytics.lowCount}</div>
                          <p className="text-xs text-muted-foreground">Employees with a low available balance</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <Card>
                        <CardHeader className="flex items-center justify-between">
                          <CardTitle>Top Employees by Available (YTD)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="w-full h-40">
                            {/* two-column small bars */}
                            <BarChart data={balancesAnalytics.topEmployees.map((t: any) => ({ label: t.label, value: t.value }))} columns={2} />
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-muted-foreground">Show</label>
                              <select id="top-show" value={topShow} onChange={(e) => setTopShow(e.target.value)} className="border rounded px-2 py-1 text-sm">
                                <option value="top5">Top 5</option>
                                <option value="top10">Top 10</option>
                                <option value="all">All</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-muted-foreground">Sort</label>
                              <select id="top-sort" value={topSort} onChange={(e) => setTopSort(e.target.value)} className="border rounded px-2 py-1 text-sm">
                                <option value="desc">Available (high → low)</option>
                                <option value="asc">Available (low → high)</option>
                                <option value="name">Name (A → Z)</option>
                              </select>
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-muted-foreground">Full list (filtered/sorted)</div>
                              <div className="flex items-center gap-2">
                                <input value={topFilter} onChange={(e) => setTopFilter(e.target.value)} placeholder="filter name or dept" className="border px-2 py-1 text-sm rounded" />
                              </div>
                            </div>
                            <div className="overflow-x-auto mt-2">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="p-2 text-left">Employee</th>
                                    <th className="p-2 text-left">Department</th>
                                    <th className="p-2 text-right">Available (YTD)</th>
                                  </tr>
                                </thead>
                                <tbody id="top-full-list">
                                  {visibleTop.map((r: any) => (
                                    <tr key={r.label} className="border-b hover:bg-muted/50">
                                      <td className="p-2 font-medium">{r.label}</td>
                                      <td className="p-2">{r.department}</td>
                                      <td className="p-2 text-right">{(r.value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Avg Available by Department</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="w-full h-40">
                            <PieChart data={balancesAnalytics.deptAvg.map((d: any) => ({ label: d.label, value: d.value }))} />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    {/* charts-only mode: table removed per request */}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="top">
              <Card>
                <CardHeader>
                  <CardTitle>Top Employees by Leave Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2 text-left">Employee</th>
                          <th className="p-2 text-right">Total Days</th>
                          <th className="p-2 text-right">With Pay</th>
                          <th className="p-2 text-right">Without Pay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analytics?.topEmployeesByDays || []).map((r: any) => (
                          <tr key={r.name} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{r.name}</td>
                            <td className="p-2 text-right">{(r.totalDays || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right">{(r.withPay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right">{(r.withoutPay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Leaves (next 30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingLeaves.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming leaves in the next 30 days.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="p-2 text-left">Date From</th>
                            <th className="p-2 text-left">Employee</th>
                            <th className="p-2 text-left">Leave Type</th>
                            <th className="p-2 text-right">Days (with/without)</th>
                            <th className="p-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {upcomingLeaves.slice(0, 200).map((t: any, i: number) => (
                            <tr key={`${t.employeeId}-${i}`} className="border-b hover:bg-muted/50">
                              <td className="p-2">{t.dateFrom}</td>
                              <td className="p-2 font-medium">{t.name || t.employeeId}</td>
                              <td className="p-2">{t.leaveType}</td>
                              <td className="p-2 text-right">{`${t.withPayDays || 0}/${t.withoutPayDays || 0}`}</td>
                              <td className="p-2">{t.status || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

