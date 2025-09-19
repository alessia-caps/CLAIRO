import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CertificationUploadDialog, type CertificationRecord } from "@/components/CertificationUploadDialog";
import { GraduationCap, Award, ShieldCheck, Landmark, Filter } from "lucide-react";

function isActive(rec: CertificationRecord): boolean {
  const now = new Date();
  if (rec.status) {
    const s = rec.status.toLowerCase();
    if (s.includes("active")) return true;
    if (s.includes("expired")) return false;
    if (s.includes("in progress") || s.includes("training")) return false;
  }
  if (rec.expiryDate) return rec.expiryDate.getTime() >= now.setHours(0, 0, 0, 0);
  return false;
}

function addMonths(d: Date, months: number): Date {
  const dt = new Date(d);
  dt.setMonth(dt.getMonth() + months);
  return dt;
}

function isBondActive(rec: CertificationRecord): boolean {
  const today = new Date();
  if (!rec.companyPaid) return false;
  if (rec.bondStart && rec.bondEnd) return rec.bondStart <= today && today <= rec.bondEnd;
  if (rec.issueDate && rec.bondMonths > 0) return today <= addMonths(rec.issueDate, rec.bondMonths);
  if (rec.bondEnd) return today <= rec.bondEnd;
  return false;
}

export default function CertificationTraining() {
  const [rows, setRows] = useState<CertificationRecord[]>([]);

  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [provider, setProvider] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [bond, setBond] = useState<string>("all");

  const metrics = useMemo(() => {
    const totalActive = rows.filter(isActive).length;
    const empWithActive = new Set(rows.filter(isActive).map((r) => r.employee)).size;

    const sapAll = rows.filter((r) => (r.provider || "").toLowerCase().includes("sap"));
    const sapActive = sapAll.filter(isActive).length;
    const sapCompliance = sapAll.length ? Math.round((sapActive / sapAll.length) * 100) : 0;

    const activeBonds = rows.filter(isBondActive).length;

    return { totalActive, empWithActive, sapCompliance, activeBonds };
  }, [rows]);

  const unique = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).sort();

  const filters = useMemo(() => {
    return {
      depts: ["all", ...unique(rows.map((r) => r.department || "Unknown"))],
      providers: ["all", ...unique(rows.map((r) => r.provider || ""))],
      types: ["all", ...unique(rows.map((r) => r.type || ""))],
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (dept !== "all" && (r.department || "Unknown") !== dept) return false;
      if (provider !== "all" && (r.provider || "") !== provider) return false;
      if (type !== "all" && (r.type || "") !== type) return false;
      if (status === "active" && !isActive(r)) return false;
      if (status === "expired" && isActive(r)) return false;
      if (bond === "active" && !isBondActive(r)) return false;
      if (bond === "inactive" && isBondActive(r)) return false;
      if (ql) {
        const s = `${r.employee} ${r.department} ${r.certification} ${r.provider} ${r.type}`.toLowerCase();
        if (!s.includes(ql)) return false;
      }
      return true;
    });
  }, [rows, dept, provider, type, status, bond, q]);

  const handleUploaded = (data: CertificationRecord[]) => {
    setRows(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certification and Training</h1>
          <p className="text-muted-foreground">Track employee certifications, training progress, and skill development</p>
        </div>
        <div className="flex gap-2">
          <CertificationUploadDialog onDataUploaded={handleUploaded} />
          {rows.length > 0 && (
            <Button variant="outline" onClick={() => setRows([])}>Clear</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Certifications</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalActive}</div>
            <p className="text-xs text-muted-foreground">Across all employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees with Certification</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.empWithActive}</div>
            <p className="text-xs text-muted-foreground">Unique employees with an active cert</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SAP Compliance</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.sapCompliance}%</div>
            <p className="text-xs text-muted-foreground">Active SAP certs / total SAP certs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bonds</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeBonds}</div>
            <p className="text-xs text-muted-foreground">Company-paid certifications currently bonded</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle>Certification Records</CardTitle>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <Input placeholder="Search name, certification, provider..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  {filters.depts.map((d) => (
                    <SelectItem key={d} value={d}>{d === "all" ? "All Departments" : d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger><SelectValue placeholder="Provider" /></SelectTrigger>
                <SelectContent>
                  {filters.providers.map((p) => (
                    <SelectItem key={p} value={p}>{p === "all" ? "All Providers" : p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  {filters.types.map((t) => (
                    <SelectItem key={t} value={t}>{t === "all" ? "All Types" : t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={bond} onValueChange={setBond}>
                <SelectTrigger><SelectValue placeholder="Bond" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bonds</SelectItem>
                  <SelectItem value="active">Active Bond</SelectItem>
                  <SelectItem value="inactive">No/Inactive Bond</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2"><Filter className="h-4 w-4"/>Upload a file to see records and metrics.</div>
          ) : (
            <Table>
              <TableCaption>{filtered.length} of {rows.length} records</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Bond</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => {
                  const active = isActive(r);
                  const bonded = isBondActive(r);
                  return (
                    <TableRow key={`${r.employee}-${r.certification}-${i}`}>
                      <TableCell className="font-medium">{r.employee}</TableCell>
                      <TableCell>{r.department || "Unknown"}</TableCell>
                      <TableCell>{r.certification}</TableCell>
                      <TableCell>{r.provider}</TableCell>
                      <TableCell>{r.type}</TableCell>
                      <TableCell>{r.issueDate ? new Date(r.issueDate).toLocaleDateString() : ""}</TableCell>
                      <TableCell>{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : ""}</TableCell>
                      <TableCell>
                        <Badge variant={active ? "default" : "destructive"}>{active ? "Active" : "Expired"}</Badge>
                      </TableCell>
                      <TableCell>
                        {bonded ? (
                          <Badge variant="secondary">Active Bond</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
