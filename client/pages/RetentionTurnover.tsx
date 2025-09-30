import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingDown, TrendingUp, Upload } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function SmallBarChart({ data, columns = 1 }: { data: { label: string; value: number }[]; columns?: number }) {
  if (!data || data.length === 0) return <div className="text-sm text-muted-foreground">No data</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<{ left: number; top: number; text: string } | null>(null);

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

export default function RetentionTurnover() {
  const [locationCounts, setLocationCounts] = useState<
    { location: string; total: number }[]
  >([]);
  const [monthHires, setMonthHires] = useState<Record<string, number>>({});
  const [monthResigns, setMonthResigns] = useState<Record<string, number>>({});
  const [employees, setEmployees] = useState<string[]>([]);
  type PersonEntry = { name: string; day?: number };

  const [monthNameGroups, setMonthNameGroups] = useState<
    Record<string, { hires: PersonEntry[]; resigns: PersonEntry[] }>
  >({});
  const [showPreview, setShowPreview] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [totalHires, setTotalHires] = useState(0);
  const [totalResigned, setTotalResigned] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onFilePick = async (file?: File) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const sheetsRaw: { [name: string]: any[][] } = {};
      workbook.SheetNames.forEach((name) => {
        const sheet = workbook.Sheets[name];
        // read raw rows
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        sheetsRaw[name] = rows;
      });

      // Detect sheets
      const sheetNames = Object.keys(sheetsRaw);

      // helper to extract names (and optional day) from a cell like "06 - Royce D., 24 - Kit. O"
      const extractNames = (s: string): PersonEntry[] => {
        if (!s) return [] as PersonEntry[];
        const str = String(s)
          .replace(/[;|\\\/•·]/g, ",") // normalize separators to comma
          .replace(/\s+/g, " ")
          .trim();

        return str
          .split(",")
          .map((tok) => tok.trim())
          .map((tok) => {
            // match leading day like "06 - Name" or "6 - Name" or "06.Name"
            const m = tok.match(/^\s*(\d{1,2})\s*[-\.]?\s*(.+)$/);
            if (m) {
              const day = Number(m[1]);
              const name = String(m[2] || "").replace(/\.+$/g, "").trim();
              return { name, day: isNaN(day) ? undefined : day } as PersonEntry;
            }

            // fallback: remove stray leading numbers like "24 " and trailing dots
            const cleaned = tok.replace(/^\s*\d+\s*[-\.]?\s*/, "").replace(/\.+$/g, "").trim();
            return { name: cleaned } as PersonEntry;
          })
          .filter((p) => p.name && /[A-Za-z]/.test(p.name));
      };

  // Employee List
      let employees: string[] = [];
      const empSheetName = sheetNames.find((n) =>
        /employee list/i.test(n),
      );
      if (empSheetName) {
        const rows = sheetsRaw[empSheetName];
        // find header row containing "Employee"
        const headerIdx = rows.findIndex((r) =>
          r.some((c: any) => /employee/i.test(String(c || ""))),
        );
        const dataRows = headerIdx >= 0 ? rows.slice(headerIdx + 1) : rows;
        dataRows.forEach((r) => {
          const val = r[0] || r["Employee Name"] || r["Name"];
          if (val && String(val).trim()) employees.push(String(val).trim());
        });
      } else {
        // fallback: look for any sheet with many names-like rows
        for (const name of sheetNames) {
          const rows = sheetsRaw[name];
          if (!rows || rows.length === 0) continue;
          const plausible = rows.filter((r) => typeof r[0] === "string" && r[0].trim().split(" ").length <= 4).length;
          if (plausible > 5 && employees.length === 0) {
            rows.forEach((r, i) => {
              if (i === 0 && String(r[0] || "").toLowerCase().includes("employee")) return;
              if (r[0] && String(r[0]).trim()) employees.push(String(r[0]).trim());
            });
            break;
          }
        }
      }

      // update parsed employees into component state later

      // PStaff Complement (monthly hires/resigns)
        const pstaffName = sheetNames.find((n) => /pstaff|complement|staff complement/i.test(n));
      const monthH: Record<string, number> = {};
      const monthR: Record<string, number> = {};
      const nameGroupsPerMonth: Record<string, { hires: PersonEntry[]; resigns: PersonEntry[] }> = {};
      let bottomTotalActive: number | null = null;

      if (pstaffName) {
        const rows = sheetsRaw[pstaffName];
        rows.forEach((r) => {
          if (!r || r.length === 0) return;
          const first = String(r[0] || "").trim();
          if (/total active employees?/i.test(first)) {
            // find any numeric cell in the row
            for (const cell of r.slice(1)) {
              const v = Number(String(cell).replace(/[^0-9\.-]/g, ""));
              if (!isNaN(v) && v !== 0) {
                bottomTotalActive = v;
                break;
              }
            }
            return;
          }

          // month rows
          const monthMatch = MONTH_NAMES.find((m) => new RegExp(`^${m}$`, "i").test(first));
          if (monthMatch) {
            // gather cells after month column
            const cells = r.slice(1).map((c: any) => String(c || "").trim()).filter((s: string) => s !== "");

            // use global extractNames helper defined above

            // collect numeric tokens and name groups per cell
            const numsInRow = Array.from(r.slice(1).join(" ").matchAll(/\d+/g)).map((m) => Number(m[0]));
            const nameGroups = cells.map((s: string) => extractNames(s)).filter((g: PersonEntry[]) => g.length > 0);

            let hires = 0;
            let resigns = 0;

            if (numsInRow.length >= 2) {
              hires = numsInRow[0];
              resigns = numsInRow[1];
            } else if (numsInRow.length === 1) {
              hires = numsInRow[0];
            }

            // prefer name counts if name groups present (map first group -> hires, second -> resigns)
            if (nameGroups.length >= 1) {
              hires = nameGroups[0].length;
              if (nameGroups.length >= 2) {
                resigns = nameGroups[1].length;
              }
            } else {
              // if there are no name groups but numeric tokens mismatched, try fallback using counts of any alphabetic tokens
              if (numsInRow.length === 0) {
                // count any comma-separated alpha tokens across the row
                const allNames = extractNames(r.slice(1).join(","));
                if (allNames.length > 0) {
                  hires = allNames.length;
                }
              }
            }

            monthH[monthMatch] = hires;
            monthR[monthMatch] = resigns;
            nameGroupsPerMonth[monthMatch] = {
              hires: nameGroups[0] || [],
              resigns: nameGroups[1] || [],
            };
          }
        });
      } else {
        // fallback: scan all sheets for month rows
        for (const name of sheetNames) {
          const rows = sheetsRaw[name];
          rows.forEach((r) => {
            const first = String(r[0] || "").trim();
            const monthMatch = MONTH_NAMES.find((m) => new RegExp(`^${m}$`, "i").test(first));
            if (monthMatch) {
              const cells = r.slice(1).map((c: any) => String(c || "").trim()).filter((s: string) => s !== "");

                const numsInRow = Array.from(r.slice(1).join(" ").matchAll(/\d+/g)).map((m) => Number(m[0]));
                const nameGroups = cells.map((s: string) => extractNames(s)).filter((g: PersonEntry[]) => g.length > 0);

              let hires = 0;
              let resigns = 0;
              if (numsInRow.length >= 2) {
                hires = numsInRow[0];
                resigns = numsInRow[1];
              } else if (numsInRow.length === 1) {
                hires = numsInRow[0];
              }

              if (nameGroups.length >= 1) {
                hires = nameGroups[0].length;
                if (nameGroups.length >= 2) resigns = nameGroups[1].length;
              } else {
                if (numsInRow.length === 0) {
                  const allNames = extractNames(r.slice(1).join(","));
                  if (allNames.length > 0) hires = allNames.length;
                }
              }

              monthH[monthMatch] = hires;
              monthR[monthMatch] = resigns;
              nameGroupsPerMonth[monthMatch] = {
                hires: nameGroups[0] || [],
                resigns: nameGroups[1] || [],
              };
            }
            if (/total active employees?/i.test(first)) {
              for (const cell of r.slice(1)) {
                const v = Number(String(cell).replace(/[^0-9\.-]/g, ""));
                if (!isNaN(v) && v !== 0) bottomTotalActive = v;
              }
            }
          });
        }
      }

      // Location Count sheet
      const locationName = sheetNames.find((n) => /location/i.test(n));
      const locs: { location: string; total: number }[] = [];
      if (locationName) {
        const rows = sheetsRaw[locationName];
        // try header row detection
        let start = 0;
        if (rows[0] && rows[0].some((c: any) => /location|total/i.test(String(c || "")))) start = 1;
        for (let i = start; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length === 0) continue;
          const loc = String(r[0] || "").trim();
          const totalCell = r[1] ?? r["Total"] ?? r["total"];
          const total = Number(String(totalCell || "").replace(/[^0-9\.-]/g, "")) || 0;
          if (loc && !/total/i.test(loc)) locs.push({ location: loc, total });
        }
      } else {
        // fallback: look for rows mentioning Luzon/Visayas/Mindanao
        for (const name of sheetNames) {
          const rows = sheetsRaw[name];
          rows.forEach((r) => {
            const a = String(r[0] || "").trim();
            if (/luzon|visayas|mindanao/i.test(a)) {
              const total = Number(String(r[1] || r["Total"] || "").replace(/[^0-9\.-]/g, "")) || 0;
              locs.push({ location: a, total });
            }
          });
        }
      }

      // totals
      const hiresTotal = Object.values(monthH).reduce((s, v) => s + v, 0);
      const resignsTotal = Object.values(monthR).reduce((s, v) => s + v, 0);
      const locTotal = locs.reduce((s, l) => s + l.total, 0);

  setMonthHires(monthH);
  setMonthResigns(monthR);
  setLocationCounts(locs);
  setTotalHires(hiresTotal);
  setTotalResigned(resignsTotal);
  setMonthNameGroups(nameGroupsPerMonth as any);
  setEmployees(employees);

      // Determine total employees: prefer bottomTotalActive, then location total, then employee list length
      const resolvedTotal = bottomTotalActive ?? (locTotal > 0 ? locTotal : employees.length > 0 ? employees.length : null);
      setTotalEmployees(resolvedTotal);
    } catch (err) {
      console.error("Failed to parse retention workbook:", err);
      alert("Failed to parse Excel file. Please ensure it matches the expected template.");
    }
  };

  const retentionRate = useMemo(() => {
    if (!totalEmployees || totalEmployees === 0) return 0;
    return Math.max(0, ((totalEmployees - totalResigned) / totalEmployees) * 100);
  }, [totalEmployees, totalResigned]);

  // total parsed names in preview (hires + resigns)
  const totalParsedNames = useMemo(() => {
    const vals = Object.values(monthNameGroups || {});
    return vals.reduce((sum, v) => sum + (v.hires?.length || 0) + (v.resigns?.length || 0), 0);
  }, [monthNameGroups]);

  const resignedRate = useMemo(() => {
    if (!totalEmployees || totalEmployees + totalResigned === 0) return 0;
    return (totalResigned / Math.max(1, totalEmployees + totalResigned)) * 100;
  }, [totalEmployees, totalResigned]);

  return (
    <Tabs defaultValue="overview">
      <TabsContent value="overview">
        <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retention and Turnover</h1>
          <p className="text-muted-foreground">Track employee retention rates and turnover analytics</p>
        </div>
    
        <div>
          <button
            className="inline-flex items-center rounded-md border px-3 py-1 text-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" /> Upload workbook
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => onFilePick(e.target.files?.[0])}
            className="hidden"
          />
        </div>
      </div>

      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="employees">Employees</TabsTrigger>
      </TabsList>

      {/* Main movement card */}
      <Card>
        <CardHeader>
          <CardTitle>Movement of every month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium">Total Hired Employees per Month</h3>
              <div className="mt-2 h-40">
                <SmallBarChart
                  data={MONTH_NAMES.map((m) => ({ label: m, value: monthHires[m] ?? 0 }))}
                  columns={2}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium">Total Resigned Employees per Month</h3>
              <div className="mt-2 h-40">
                <SmallBarChart
                  data={MONTH_NAMES.map((m) => ({ label: m, value: monthResigns[m] ?? 0 }))}
                  columns={2}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              {/* show total parsed names in the button */}
              <button
                className="text-sm underline"
                onClick={() => setShowPreview((s) => !s)}
              >
                {showPreview ? "Hide" : "Show"} preview {totalParsedNames > 0 ? `(${totalParsedNames} names)` : ""}
              </button>
            </div>
          </div>
          {showPreview && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Month</th>
                    <th className="p-2 text-left">Hires (names & day)</th>
                    <th className="p-2 text-left">Resigns (names & day)</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTH_NAMES.map((m) => {
                    const hires: PersonEntry[] = monthNameGroups[m]?.hires || [];
                    const resigns: PersonEntry[] = monthNameGroups[m]?.resigns || [];

                    const fmt = (p: PersonEntry) => (p.day ? `${String(p.day).padStart(2, "0")} - ${p.name}` : p.name);

                    return (
                      <tr key={`preview-${m}`} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{m}</td>
                        <td className="p-2">{hires.length > 0 ? hires.map(fmt).join(", ") : "—"}</td>
                        <td className="p-2">{resigns.length > 0 ? resigns.map(fmt).join(", ") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Retention Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{retentionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Based on uploaded workbook</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resigned Employee Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{resignedRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Proportion of resigned vs headcount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalEmployees ?? "—"}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rate of Employees Per Location</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: 320 }}>
            {locationCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={locationCounts}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  {/* Numeric axis across the top/bottom */}
                  <XAxis type="number" />
                  {/* Category axis on the left with the location names */}
                  <YAxis type="category" dataKey="location" width={160} />
                  <Tooltip formatter={(value: any) => [value, "Total"]} />
                  <Bar dataKey="total" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Upload the Location Count sheet to display a chart.</p>
            )}
          </div>
        </CardContent>
      </Card>
        </div>
      </TabsContent>

      <TabsContent value="employees">
        <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retention and Turnover</h1>
          <p className="text-muted-foreground">Track employee retention rates and turnover analytics</p>
        </div>
    
        <div>
          <button
            className="inline-flex items-center rounded-md border px-3 py-1 text-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" /> Upload workbook
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => onFilePick(e.target.files?.[0])}
            className="hidden"
          />
        </div>
      </div>

      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="employees">Employees</TabsTrigger>
      </TabsList>
          <Card>
            <CardHeader>
              <CardTitle>Current Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length > 0 ? (
                      employees.map((e, i) => (
                        <tr key={`emp-${i}`} className="border-b hover:bg-muted/50">
                          <td className="p-2">{i + 1}</td>
                          <td className="p-2">{e}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="p-2 text-muted-foreground">No employees parsed. Upload an Employee List sheet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
