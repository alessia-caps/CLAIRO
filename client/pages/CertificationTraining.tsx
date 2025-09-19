import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CertificationUploadDialog,
  type CertificationRecord,
} from "@/components/CertificationUploadDialog";
import {
  GraduationCap,
  Award,
  ShieldCheck,
  Landmark,
  Filter,
} from "lucide-react";
import CertificationDetailDialog from "@/components/CertificationDetailDialog";
import MetricListDialog from "@/components/MetricListDialog";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";

function isActive(rec: CertificationRecord): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (rec.status) {
    const s = rec.status.toLowerCase();
    if (s.includes("active")) return true;
    if (s.includes("expired")) return false;
    if (s.includes("in progress") || s.includes("training")) return false;
  }
  if (rec.expiryDate) {
    const exp = new Date(rec.expiryDate);
    exp.setHours(0, 0, 0, 0);
    return exp.getTime() >= today.getTime();
  }
  return false;
}

function addMonths(d: Date, months: number): Date {
  const dt = new Date(d);
  dt.setMonth(dt.getMonth() + months);
  return dt;
}

function isBondActive(rec: CertificationRecord): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!rec.companyPaid) return false;
  const end =
    rec.bondEnd ??
    (rec.issueDate && rec.bondMonths
      ? addMonths(rec.issueDate, rec.bondMonths)
      : null);
  if (!end) return false;
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  return today.getTime() <= e.getTime();
}

function bondStatus(
  rec: CertificationRecord,
): "None" | "Active" | "Completed" | "Forfeit Required" {
  if (!rec.companyPaid) return "None";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end =
    rec.bondEnd ??
    (rec.issueDate && rec.bondMonths
      ? addMonths(rec.issueDate, rec.bondMonths)
      : null);
  if (!end) return "None";
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  if (today.getTime() > e.getTime()) return "Completed";
  if (
    (rec as any).employmentStatus &&
    String((rec as any).employmentStatus)
      .toLowerCase()
      .includes("resigned")
  )
    return "Forfeit Required";
  return "Active";
}

function daysUntil(d: Date | null | undefined): number | null {
  if (!d) return null;
  const start = new Date();
  const end = new Date(d);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

export default function CertificationTraining() {
  const [rows, setRows] = useState<CertificationRecord[]>([]);
  const [metricOpen, setMetricOpen] = useState(false);
  const [metricRows, setMetricRows] = useState<CertificationRecord[]>([]);
  const [metricTitle, setMetricTitle] = useState<string | undefined>(undefined);
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [expiryBucketFilter, setExpiryBucketFilter] = useState<string | null>(null);
  
  const [sortBy, setSortBy] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<CertificationRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [provider, setProvider] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [bond, setBond] = useState<string>("all");
  const [employment, setEmployment] = useState<string>("all");

  const metrics = useMemo(() => {
    const totalActive = rows.filter(isActive).length;
    const empWithActive = new Set(
      rows
        .filter(isActive)
        .map((r) => (r.employeeNo && r.employeeNo.trim()) || r.employee),
    ).size;

    const totalCertifications = rows.length;
    const totalEmployees = new Set(
      rows.map((r) => (r.employeeNo && r.employeeNo.trim()) || r.employee),
    ).size;

    const sapAll = rows.filter((r) =>
      (r.provider || "").toLowerCase().includes("sap"),
    );
    const sapActive = sapAll.filter(isActive).length;
    const sapCompliance = sapAll.length
      ? Math.round((sapActive / sapAll.length) * 100)
      : 0;

    const activeBonds = rows.filter(isBondActive).length;
    const expiringSoon = rows.filter(r => {
      const d = daysUntil(r.expiryDate);
      return d !== null && d <= 30 && d >= 0;
    }).length;
    const expired = rows.filter(r => {
      const d = daysUntil(r.expiryDate);
      return d !== null && d < 0;
    }).length;

    return { totalActive, empWithActive, sapCompliance, activeBonds, totalCertifications, totalEmployees, expiringSoon, expired };
  }, [rows]);

  // build per-department stacked counts (Active vs Expired)
  const deptStack = useMemo(() => {
    const map = new Map<string, { Active: number; Expired: number }>();
    rows.forEach(r => {
      const deptName = r.department || 'Unknown';
      const cur = map.get(deptName) ?? { Active: 0, Expired: 0 };
      if (isActive(r)) cur.Active++; else cur.Expired++;
      map.set(deptName, cur);
    });
    return Array.from(map.entries()).map(([department, counts]) => ({ department, ...counts }));
  }, [rows]);

  // build monthly expiry counts for next 12 months
  const monthlyExpiry = useMemo(() => {
    const now = new Date();
    now.setHours(0,0,0,0);
    const months: { month: string; count: number; monthIndex: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({ month: d.toLocaleString(undefined, { month: 'short', year: 'numeric' }), count: 0, monthIndex: d.getMonth() + d.getFullYear()*100 });
    }
    rows.forEach(r => {
      if (!r.expiryDate) return;
      const e = new Date(r.expiryDate);
      e.setHours(0,0,0,0);
      const diffMonths = (e.getFullYear() - now.getFullYear()) * 12 + (e.getMonth() - now.getMonth());
      if (diffMonths >= 0 && diffMonths < 12) months[diffMonths].count++;
    });
    return months;
  }, [rows]);

  const unique = (arr: string[]) =>
    Array.from(new Set(arr.filter(Boolean))).sort();

  const filters = useMemo(() => {
    return {
      depts: ["all", ...unique(rows.map((r) => r.department || "Unknown"))],
  providers: ["all", ...unique(rows.map((r) => r.provider || ""))],
      types: ["all", ...unique(rows.map((r) => r.type || ""))],
      employments: [
        "all",
        ...unique(
          rows.map((r) =>
            "employmentStatus" in r
              ? String((r as any).employmentStatus)
              : "Active",
          ),
        ),
      ],
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (expiringOnly) {
        const d = daysUntil(r.expiryDate);
        if (d === null || d < 0 || d > 30) return false;
      }
      if (expiryBucketFilter) {
        // If expiryBucketFilter looks like a month label (e.g., "Sep 2025"),
        // match expiryDate's month/year to the label. Otherwise ignore.
        const maybe = expiryBucketFilter;
        const d = r.expiryDate ? new Date(r.expiryDate) : null;
        if (d === null) return false;
        const label = d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
        if (label !== maybe) return false;
      }
      if (dept !== "all" && (r.department || "Unknown") !== dept) return false;
  if (provider !== "all" && (r.provider || "") !== provider) return false;
      if (type !== "all" && (r.type || "") !== type) return false;
      if (status === "active" && !isActive(r)) return false;
      if (status === "expired" && isActive(r)) return false;
      if (bond === "active" && !isBondActive(r)) return false;
      if (bond === "inactive" && isBondActive(r)) return false;
      if (employment !== "all") {
        const s =
          "employmentStatus" in r
            ? String((r as any).employmentStatus)
            : "Active";
        if (s !== employment) return false;
      }
      if (ql) {
        const s =
          `${r.employee} ${r.department} ${r.certification} ${r.type}`.toLowerCase();
        if (!s.includes(ql)) return false;
      }
      return true;
    });
  }, [rows, dept, provider, type, status, bond, q]);

  const sorted = useMemo(() => {
    if (!sortBy) return filtered;
    const arr = [...filtered];
    arr.sort((a: any, b: any) => {
      const k = sortBy.key;
      const av = a[k];
      const bv = b[k];
      // date fields
      if (k === "issueDate" || k === "expiryDate") {
        const da = av ? new Date(av).getTime() : 0;
        const db = bv ? new Date(bv).getTime() : 0;
        if (da === db) return 0;
        return sortBy.dir === "asc" ? da - db : db - da;
      }
      const sa = av == null ? "" : String(av).toLowerCase();
      const sb = bv == null ? "" : String(bv).toLowerCase();
      if (sa < sb) return sortBy.dir === "asc" ? -1 : 1;
      if (sa > sb) return sortBy.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const handleUploaded = (data: CertificationRecord[]) => {
    setRows(data);
  };

  function toggleSort(key: string) {
    setPage(1);
    setSortBy((s) => {
      if (!s || s.key !== key) return { key, dir: "asc" };
      return { key, dir: s.dir === "asc" ? "desc" : "asc" };
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Certification and Training
          </h1>
          <p className="text-muted-foreground">
            Track employee certifications, training progress, and skill
            development
          </p>
        </div>
        <div className="flex gap-2">
          <CertificationUploadDialog onDataUploaded={handleUploaded} />
          {rows.length > 0 && (
            <Button variant="outline" onClick={() => setRows([])}>
              Clear
            </Button>
          )}
        </div>
      </div>

  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Certifications</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <button className="w-full text-left" onClick={() => { setStatus('all'); setProvider('all'); setType('all'); setPage(1); setTimeout(()=>{ document.getElementById('cert-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); }}>
            <div className="text-2xl font-bold text-foreground">{metrics.totalActive}</div>
            <p className="text-xs text-muted-foreground">Across all employees</p>
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Employees with Certification</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <button className="w-full text-left" onClick={() => { setStatus('active'); setPage(1); setTimeout(()=>{ document.getElementById('cert-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); }}>
            <div className="text-2xl font-bold text-foreground">{metrics.empWithActive}</div>
            <p className="text-xs text-muted-foreground">Unique employees with an active cert</p>
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Bonds</CardTitle>
          <Landmark className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <button className="w-full text-left" onClick={() => { setBond('active'); setPage(1); setTimeout(()=>{ document.getElementById('cert-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); }}>
            <div className="text-2xl font-bold text-foreground">{metrics.activeBonds}</div>
            <p className="text-xs text-muted-foreground">Company-paid certifications currently bonded</p>
          </button>
        </CardContent>
      </Card>
    </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">By Department (Active vs Expired)</CardTitle>
        </CardHeader>
          <CardContent>
          <div className="h-52 w-full">
            <ChartContainer config={{ default: { color: "#3b82f6" } }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptStack} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <XAxis dataKey="department" tick={{fontSize:10}} height={60} interval={0} />
                  <YAxis allowDecimals={false} />
                  <ReTooltip />
                  <Legend verticalAlign="top" align="right" />
                  <Bar dataKey="Active" stackId="a" fill="#10b981" onClick={(d) => { if (d && (d as any).activePayload) { setDept((d as any).activePayload[0].payload.department); setPage(1); setTimeout(()=>{ document.getElementById('cert-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); } }} />
                  <Bar dataKey="Expired" stackId="a" fill="#ef4444" onClick={(d) => { if (d && (d as any).activePayload) { setDept((d as any).activePayload[0].payload.department); setPage(1); setTimeout(()=>{ document.getElementById('cert-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); } }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          <p className="text-xs text-muted-foreground">Click a bar segment to filter that department</p>
        </CardContent>
      </Card>

  <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expiries Next 12 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52 w-full">
            <ChartContainer config={{ default: { color: "#6366f1" } }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyExpiry} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
                  <XAxis dataKey="month" tick={{fontSize:10}} height={60} interval={0} />
                  <YAxis allowDecimals={false} />
                  <ReTooltip />
                  <Bar dataKey="count" fill="#6366f1" onClick={(d) => {
                    if (d && (d as any).activePayload) {
                      const payload = (d as any).activePayload[0].payload;
                      setExpiryBucketFilter(payload.month);
                      setPage(1);
                      setTimeout(()=>{ document.getElementById('cert-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
                    }
                  }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          <p className="text-xs text-muted-foreground">Click a bar to filter expiries in that month</p>
        </CardContent>
      </Card>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <div className="md:col-span-1 lg:col-span-1">
        <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expired</CardTitle>
          <Filter className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <button className="w-full text-left" onClick={() => { setStatus('expired'); setExpiringOnly(false); setPage(1); setTimeout(()=>{ document.getElementById('cert-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); }}>
            <div className="text-2xl font-bold text-foreground">{metrics.expired}</div>
            <p className="text-xs text-muted-foreground">Certifications already expired</p>
          </button>
        </CardContent>
      </Card>
      </div>
    </div>
    <MetricListDialog open={metricOpen} onOpenChange={setMetricOpen} rows={metricRows} title={metricTitle} />
  </div>

      <div className="flex gap-4">
        <div className="text-sm text-muted-foreground">Total records: {rows.length}</div>
        <div className="text-sm text-muted-foreground">Unique employees: {Array.from(new Set(rows.map(r=> (r.employeeNo && r.employeeNo.trim()) || r.employee))).length}</div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle>Certification Records</CardTitle>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            <div className="md:col-span-2">
              <Input
                placeholder="Search name, certification, department..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setQ(''); setDept('all'); setProvider('all'); setType('all'); setStatus('all'); setBond('all'); setEmployment('all'); setExpiringOnly(false); setExpiryBucketFilter(null); setPage(1);
              }}>
                Clear filters
              </Button>
            </div>
            <div>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {filters.depts.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d === "all" ? "All Departments" : d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  {filters.providers.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === "all" ? "All Providers" : p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {filters.types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === "all" ? "All Types" : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={bond} onValueChange={setBond}>
                <SelectTrigger>
                  <SelectValue placeholder="Bond" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bonds</SelectItem>
                  <SelectItem value="active">Active Bond</SelectItem>
                  <SelectItem value="inactive">No/Inactive Bond</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={employment} onValueChange={setEmployment}>
                <SelectTrigger>
                  <SelectValue placeholder="Employment" />
                </SelectTrigger>
                <SelectContent>
                  {filters.employments.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e === "all" ? "All Employment" : e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Upload a file to see records and metrics.
            </div>
          ) : (
            <>
            <div id="cert-table" className="overflow-x-auto">
              <Table className="min-w-full table-fixed">
                <TableCaption>
                  {filtered.length} of {rows.length} records
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left cursor-pointer" onClick={() => toggleSort("employee")}>Employee {sortBy?.key === "employee" ? (sortBy.dir === "asc" ? "▲" : "▼") : ""}</TableHead>
                    <TableHead className="hidden md:table-cell cursor-pointer" onClick={() => toggleSort("department")}>Department {sortBy?.key === "department" ? (sortBy.dir === "asc" ? "▲" : "▼") : ""}</TableHead>
                    <TableHead className="text-left cursor-pointer" onClick={() => toggleSort("certification")}>Certification {sortBy?.key === "certification" ? (sortBy.dir === "asc" ? "▲" : "▼") : ""}</TableHead>
                    <TableHead className="hidden lg:table-cell cursor-pointer" onClick={() => toggleSort("type")}>Type {sortBy?.key === "type" ? (sortBy.dir === "asc" ? "▲" : "▼") : ""}</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("expiryDate")}>Status {sortBy?.key === "expiryDate" ? (sortBy.dir === "asc" ? "▲" : "▼") : ""}</TableHead>
                    <TableHead className="hidden lg:table-cell">Employment</TableHead>
                    <TableHead className="hidden lg:table-cell">Bond Status</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {paged.map((r, i) => {
                      const key = `${r.employee}-${r.certification}-${(page - 1) * pageSize + i}`;
                      return (
                        <TableRow key={key} onClick={() => { setSelected(r); setDetailOpen(true); }} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium whitespace-normal break-words">{r.employee}</TableCell>
                          <TableCell>{r.department || "Unknown"}</TableCell>
                          <TableCell>{r.certification}</TableCell>
                          <TableCell className="hidden lg:table-cell">{r.type}</TableCell>
                          <TableCell>
                            {r.expiryDate ? (
                              (() => {
                                const d = daysUntil(r.expiryDate);
                                if (d === null) return <Badge variant="outline">Unknown</Badge>;
                                if (d < 0) return <Badge variant="destructive">Expired</Badge>;
                                return <Badge variant="default">Active</Badge>;
                              })()
                            ) : (
                              <Badge variant="outline">Unknown</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={(r as any).employmentStatus && String((r as any).employmentStatus).toLowerCase().includes("resigned") ? "destructive" : "secondary"}>
                              {"employmentStatus" in r ? String((r as any).employmentStatus) : "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell>{(() => { const bs = bondStatus(r); const v = bs === "Forfeit Required" ? "destructive" : bs === "Active" ? "secondary" : bs === "Completed" ? "default" : "outline"; return <Badge variant={v as any}>{bs}</Badge>; })()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
                <div className="text-sm">Page {page} / {totalPages}</div>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm">Page size</div>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded px-2 py-1">
                  {[10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <CertificationDetailDialog record={selected} related={selected ? rows.filter(rr => ((rr.employeeNo && rr.employeeNo.trim()) || rr.employee) === ((selected.employeeNo && selected.employeeNo.trim()) || selected.employee)) : []} open={detailOpen} onOpenChange={(v)=> setDetailOpen(v)} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
