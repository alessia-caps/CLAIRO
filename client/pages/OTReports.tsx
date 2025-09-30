import { useMemo, useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useOTUpload, aggregateOT } from "@/hooks/use-ot-upload";
import { Upload, Users, Info, ChevronUp, ChevronDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { Tooltip as UI_Tooltip, TooltipTrigger as UI_TooltipTrigger, TooltipContent as UI_TooltipContent } from "@/components/ui/tooltip";

export default function OTReports() {
  const { records, error, isUploading, upload, clear } = useOTUpload();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [selectedTeam, setSelectedTeam] = useState<string>("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedPieType, setSelectedPieType] = useState<string | null>(null);
  const [fromMonth, setFromMonth] = useState<string>("All");
  const [toMonth, setToMonth] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<string | null>("hours");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [presenceMode, setPresenceMode] = useState<"All" | "Has" | "Missing">("All");
  const [presenceType, setPresenceType] = useState<string>("All");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [dialogState, setDialogState] = useState<
    | null
    | { kind: "employee"; id: string }
    | { kind: "month"; month: string }
    | { kind: "type"; type: string }
  >(null);
  const [employeeSearch, setEmployeeSearch] = useState<string>("");
  const [employeeSubView, setEmployeeSubView] = useState<"summary" | "byType" | "byMonth">("summary");
  const [currentTab, setCurrentTab] = useState<string>("overview");
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [metricMode, setMetricMode] = useState<'hours' | 'amount'>('hours');
  const [trendMetric, setTrendMetric] = useState<'hours' | 'amount'>('hours');
  const [pieActiveIndex, setPieActiveIndex] = useState<number | null>(null);
  // unified setter so toggling in one place updates both tabs
  const setMetric = (m: 'hours' | 'amount') => {
    setMetricMode(m);
    setTrendMetric(m);
  };
  // sorting state used across tables: sortField should be a key name, sortDir is asc/desc
  const [tableSortField, setTableSortField] = useState<string | null>('hours');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('desc');
  // per-table sorting
  const [empSortField, setEmpSortField] = useState<string>('hours');
  const [empSortDir, setEmpSortDir] = useState<'asc' | 'desc'>('desc');
  const [compSortField, setCompSortField] = useState<string>('hours');
  const [compSortDir, setCompSortDir] = useState<'asc' | 'desc'>('desc');
  const employeeSearchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentTab === 'employees') {
      setTimeout(() => employeeSearchRef.current?.focus(), 50);
    }
  }, [currentTab]);
  const MONTHS = useMemo(
    () => [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ],
    [],
  );

  const PIE_COLORS = ["#3b82f6", "#6366f1", "#ef4444", "#f59e0b", "#10b981"];

  // derive a short, canonical label from a description or raw key
  function shortLabelFromDesc(descOrKey: string) {
    if (!descOrKey) return '';
    const s = String(descOrKey);
    const low = s.toLowerCase();
    // canonical aliasing
    if (/\brd\b/.test(low) || low.includes('rest day') || low.includes('rest')) return 'Rest Day';
    if (low.includes('night diff') || low.includes('night differential') || /\bnd\b/.test(low)) return 'Night Differential';
    if (low.includes('overtime') || (low.includes('ot') && low.includes('hours')) || low.includes('exceed')) return 'Overtime';
    // prefer the part before a dash to keep labels short
    const first = s.split('-')[0].trim();
    return first || s;
  }

  function CustomLegend({ data }: { data: { name: string; value: number }[] }) {
    const total = data.reduce((s, x) => s + (x.value || 0), 0) || 1;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {data.map((d, i) => {
          const pct = Math.round(((d.value || 0) / total) * 100);
          return (
            <UI_Tooltip key={d.name}>
              <UI_TooltipTrigger asChild>
                <button
                  onClick={() => {
                    const name = d.name;
                    // toggle
                    setSelectedType((s) => (s === name ? 'All' : name));
                    setSelectedPieType((s) => (s === name ? null : name));
                  }}
                  className="flex items-center gap-2 text-xs px-2 py-1 rounded border"
                >
                  <span style={{ width: 12, height: 12, background: PIE_COLORS[i % PIE_COLORS.length], display: 'inline-block', borderRadius: 4 }} />
                  <span>{d.name} — {pct}% <span className="text-muted-foreground">({d.value.toLocaleString()})</span></span>
                </button>
              </UI_TooltipTrigger>
              <UI_TooltipContent side="top">Filter by {d.name}</UI_TooltipContent>
            </UI_Tooltip>
          );
        })}
      </div>
    );
  }

  // Helper to build an SVG path for a donut sector (used for active slice rendering)
  function getSectorPath(cx: number, cy: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
    const toRadian = (deg: number) => (Math.PI / 180) * deg;
    // Recharts uses degrees where positive angles go clockwise; convert with negation for canvas math
    const startRadian = toRadian(-startAngle);
    const endRadian = toRadian(-endAngle);

    const outerStartX = cx + outerRadius * Math.cos(startRadian);
    const outerStartY = cy + outerRadius * Math.sin(startRadian);
    const outerEndX = cx + outerRadius * Math.cos(endRadian);
    const outerEndY = cy + outerRadius * Math.sin(endRadian);

    const innerStartX = cx + innerRadius * Math.cos(startRadian);
    const innerStartY = cy + innerRadius * Math.sin(startRadian);
    const innerEndX = cx + innerRadius * Math.cos(endRadian);
    const innerEndY = cy + innerRadius * Math.sin(endRadian);

    const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

    // Draw outer arc, line to inner arc end, draw inner arc (reversed), close
    const path = [
      `M ${outerStartX} ${outerStartY}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEndX} ${outerEndY}`,
      `L ${innerEndX} ${innerEndY}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStartX} ${innerStartY}`,
      'Z',
    ].join(' ');

    return path;
  }

  const teams = useMemo(
    () => Array.from(new Set(records.map((r) => r.team).filter(Boolean))),
    [records],
  );

  // Reset pagination when filters change
  useMemo(() => setPage(1), [selectedTeam, selectedType, fromMonth, toMonth, searchTerm, selectedPieType]);

  // helper to canonicalize type strings into the four buckets
  const canonicalizeType = (raw?: string) => {
    const s = String(raw || '').trim();
    if (!s) return '';
    // split into tokens and use the last token as primary indicator
    const parts = s.split(/[-_ ]+/).filter(Boolean);
    const last = parts.length >= 1 ? parts[parts.length - 1] : s;
    const tokens = parts.map((p) => String(p).toUpperCase());
    // prefer tokens that match known buckets anywhere (OT, ND, RD, LH, SH)
    for (const t of tokens.reverse()) {
      if (/OT/.test(t)) return 'OT';
      if (/ND/.test(t)) return 'ND';
      if (/^RD$/.test(t)) return 'RD';
      if (/^LH$/.test(t) || /^SH$/.test(t)) return 'LH/SH';
    }
    const c = String(last).toUpperCase();
    if (/OT/.test(c)) return 'OT';
    if (/ND/.test(c)) return 'ND';
    if (/^RD$/.test(c)) return 'RD';
    if (/^LH$/.test(c) || /^SH$/.test(c)) return 'LH/SH';
    // fallback
    if (/OT/i.test(s)) return 'OT';
    return c || s;
  };

  // helper to extract month abbrev from a record
  const getRecordMonth = (r: any) => {
    const s = String((r.monthKey || r.period || "") || "").toUpperCase();
    for (const m of MONTHS) if (s.includes(m)) return m;
    return "";
  };

  // filtered records based on filters
  const filteredRecords = useMemo(() => {
    // base records augmented with normalized type and groupKey (derived from description)
    const baseAug = records.map((r) => {
      const desc = (r.otType && (r as any).otTypeDescription) ? (r as any).otTypeDescription : r.otType || '';
      const groupKey = shortLabelFromDesc(desc || r.otType || '');
      return { ...r, normalizedType: canonicalizeType(r.otType), groupKey };
    });
    // base filtering first
    const base = baseAug.filter((r) => {
      if (selectedTeam && selectedTeam !== "All" && r.team !== selectedTeam) return false;
      const typeToCheck = selectedPieType ?? selectedType;
      if (typeToCheck && typeToCheck !== "All") {
        // allow matching either the grouped label or the normalizedType bucket
        if (r.groupKey !== typeToCheck && r.normalizedType !== typeToCheck) return false;
      }
      if ((fromMonth && fromMonth !== "All") || (toMonth && toMonth !== "All")) {
        const m = getRecordMonth(r);
        if (!m) return false;
        const mi = MONTHS.indexOf(m);
        const fromi = fromMonth === "All" ? 0 : Math.max(0, MONTHS.indexOf(fromMonth));
        const toi = toMonth === "All" ? MONTHS.length - 1 : Math.max(0, MONTHS.indexOf(toMonth));
        if (mi < fromi || mi > toi) return false;
      }
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const hay = `${r.name} ${r.employeeId} ${r.team}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });

    // presence filter applies by employee: include/exclude employees who have the presenceType
    if (presenceMode !== 'All' && presenceType !== 'All') {
      const hasSet = new Set<string>();
      for (const r of records) {
        const id = (r.employeeId || r.name) as string;
        if (r.otType === presenceType) hasSet.add(id);
      }
      if (presenceMode === 'Has') {
        return base.filter(r => hasSet.has((r.employeeId || r.name) as string));
      } else {
        return base.filter(r => !hasSet.has((r.employeeId || r.name) as string));
      }
    }

    return base;
  }, [records, selectedTeam, selectedType, fromMonth, toMonth, MONTHS, selectedPieType, searchTerm, presenceMode, presenceType]);

  const pivotsFiltered = useMemo(() => aggregateOT(filteredRecords), [filteredRecords]);

  // map raw otType -> otTypeDescription (if present) so we can canonicalize based on description
  const typeDescriptionMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of filteredRecords) {
      if (r.otType) m[r.otType] = m[r.otType] || (r.otTypeDescription || '');
    }
    return m;
  }, [filteredRecords]);
 

  // typeKeys derived from aggregatedByType (declared below)

  const monthsAvailable = useMemo(
    () => pivotsFiltered.hoursByMonthByType.map((r) => r.month),
    [pivotsFiltered],
  );

  // helper to toggle sort on a column
  const toggleSort = (field: string) => {
    if (tableSortField === field) {
      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortField(field);
      setTableSortDir('desc');
    }
  };

  const toggleEmpSort = (field: string) => {
    if (empSortField === field) setEmpSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setEmpSortField(field);
      setEmpSortDir('desc');
    }
  };

  const toggleCompSort = (field: string) => {
    if (compSortField === field) setCompSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setCompSortField(field);
      setCompSortDir('desc');
    }
  };

  // generic comparator that supports numeric and string fields, and also row.values[month]
  const comparator = (a: any, b: any, field: string | null, dir: 'asc' | 'desc') => {
    if (!field) return 0;
    const mult = dir === 'asc' ? 1 : -1;
    // month columns are stored on a.values[month]
    const getVal = (obj: any) => {
      if (!obj) return 0;
      if (obj.values && Object.prototype.hasOwnProperty.call(obj.values, field)) return Number(obj.values[field] || 0);
      const v = obj[field];
      if (typeof v === 'number') return v;
      if (v == null) return 0;
      // try to parse numeric-like strings
      const n = Number(v);
      if (!Number.isNaN(n)) return n;
      return String(v).toLowerCase();
    };

    const va = getVal(a);
    const vb = getVal(b);
    // if both are strings
    if (typeof va === 'string' || typeof vb === 'string') {
      const sa = String(va || '').toLowerCase();
      const sb = String(vb || '').toLowerCase();
      if (sa < sb) return -1 * mult;
      if (sa > sb) return 1 * mult;
      return 0;
    }
    return (va - vb) * mult;
  };

  // memoized sorted rows for the monthly table and comparisons are declared later

  const aggregatedByType = useMemo(() => {
    const map: Record<string, { hours: number; amount: number }> = {};
    for (const [k, v] of Object.entries(pivotsFiltered.totalsYTD.byType)) {
      const desc = typeDescriptionMap[k] || k;
      const key = shortLabelFromDesc(desc) || String(k || '').trim() || 'Unknown';
      map[key] = map[key] || { hours: 0, amount: 0 };
      map[key].hours += v.hours;
      map[key].amount += v.amount || 0;
    }
    return map;
  }, [pivotsFiltered]);

  const pieData = useMemo(() => Object.entries(aggregatedByType).map(([name, vals]) => ({ name, value: vals.hours })), [aggregatedByType]);

  const typeKeys = useMemo(
    () => Array.from(new Set(Object.keys(aggregatedByType))),
    [aggregatedByType],
  );

  // state for when a trend point was clicked (month abbrev)
  const [trendClickedMonth, setTrendClickedMonth] = useState<string | null>(null);

  const monthlyData = useMemo(() => {
    // Build a monthly series that supports both hours and amount. amount we derive from pivotsFiltered.totals by month per employee aggregation isn't directly available here, so for amount we sum amounts from filteredRecords.
    const hoursSeries = pivotsFiltered.hoursByMonthByType.map((r) => ({ month: r.month, hours: r.total }));
    const amountByMonthMap: Record<string, number> = {};
    for (const rec of filteredRecords) {
      const m = getRecordMonth(rec) || '';
      amountByMonthMap[m] = (amountByMonthMap[m] || 0) + (rec.amount || 0);
    }
    return hoursSeries.map(h => ({ month: h.month, hours: h.hours, amount: amountByMonthMap[h.month] || 0 }));
  }, [pivotsFiltered]);

  // per-employee monthly aggregates (both hours and amount) derived from filteredRecords
  const perEmployeeMonthly = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of filteredRecords) {
      const id = r.employeeId || r.name;
      if (!map[id]) map[id] = { employeeId: id, name: r.name, team: r.team, hoursByMonth: {}, amountByMonth: {}, totalHours: 0, totalAmount: 0 };
      const m = getRecordMonth(r) || '';
      map[id].hoursByMonth[m] = (map[id].hoursByMonth[m] || 0) + (r.hours || 0);
      map[id].amountByMonth[m] = (map[id].amountByMonth[m] || 0) + (r.amount || 0);
      map[id].totalHours = (map[id].totalHours || 0) + (r.hours || 0);
      map[id].totalAmount = (map[id].totalAmount || 0) + (r.amount || 0);
    }
    return map;
  }, [filteredRecords]);

  // top employees for the emp-monthly tab, either by selected month (trendClickedMonth) or by overall metric
  const topEmployeesForTrend = useMemo(() => {
    const arr = Object.values(perEmployeeMonthly).map((e: any) => ({
      employeeId: e.employeeId,
      name: e.name,
      team: e.team,
      monthVal: trendClickedMonth
        ? (metricMode === 'hours' ? (e.hoursByMonth[trendClickedMonth] || 0) : (e.amountByMonth[trendClickedMonth] || 0))
        : 0,
      totalHours: e.totalHours || 0,
      totalAmount: e.totalAmount || 0,
    }));
    if (trendClickedMonth) {
      return arr.sort((a,b) => b.monthVal - a.monthVal).slice(0,5);
    }
    // no month clicked: sort by metricMode overall totals
    return arr.sort((a,b) => (metricMode === 'hours' ? b.totalHours - a.totalHours : b.totalAmount - a.totalAmount)).slice(0,5);
  }, [perEmployeeMonthly, trendClickedMonth, metricMode]);

  // expanded monthly data for stacked charts: each type becomes a property
  const expandedMonthly = useMemo(() => {
    // ensure all typeKeys are present as numeric properties
    return pivotsFiltered.hoursByMonthByType.map((r) => {
      const o: Record<string, any> = { month: r.month };
      for (const k of typeKeys) o[k] = r.values[k] || 0;
      return o;
    });
  }, [pivotsFiltered]);

  // pivots that respect employeeSearch (used by OT by Type tab)
  const pivotsForOT = useMemo(() => {
    if (!employeeSearch) return pivotsFiltered;
    const q = employeeSearch.trim().toLowerCase();
    const fr = filteredRecords.filter(r => (`${r.employeeId || r.name || ''}`).toLowerCase().includes(q));
    return aggregateOT(fr);
  }, [filteredRecords, pivotsFiltered, employeeSearch]);

  const aggregatedByTypeOT = useMemo(() => {
    const map: Record<string, { hours: number; amount: number }> = {};
    for (const [k, v] of Object.entries(pivotsForOT.totalsYTD.byType)) {
      const desc = typeDescriptionMap[k] || k;
      const key = shortLabelFromDesc(desc) || String(k || '').trim() || 'Unknown';
      map[key] = map[key] || { hours: 0, amount: 0 };
      map[key].hours += v.hours;
      map[key].amount += v.amount || 0;
    }
    return map;
  }, [pivotsForOT]);

  const typeKeysOT = useMemo(() => Array.from(new Set(Object.keys(aggregatedByTypeOT))), [aggregatedByTypeOT]);

  const expandedMonthlyOT = useMemo(() => {
    // hours mode: reuse the pivots which already contain hours by raw type per month, canonicalize keys
    if (metricMode === 'hours') {
      return pivotsForOT.hoursByMonthByType.map((r) => {
        const o: Record<string, any> = { month: r.month };
        for (const [rawKey, val] of Object.entries(r.values)) {
          const desc = typeDescriptionMap[rawKey] || rawKey;
          const k = shortLabelFromDesc(desc) || rawKey;
          o[k] = (o[k] || 0) + (val || 0);
        }
        for (const tk of typeKeysOT) if (o[tk] == null) o[tk] = 0;
        return o;
      });
    }

    // amount mode: sum record.amount per canonical type and month from filteredRecords (respecting employeeSearch scope)
    const monthTypeAmount: Record<string, Record<string, number>> = {};
    const fr = employeeSearch
      ? filteredRecords.filter((r) => (`${r.employeeId || r.name || ''}`).toLowerCase().includes(employeeSearch.trim().toLowerCase()))
      : filteredRecords;

    for (const rec of fr) {
      const m = getRecordMonth(rec) || '';
  const desc = (rec.otType && typeDescriptionMap[rec.otType]) ? typeDescriptionMap[rec.otType] : (rec.otType || 'Unknown');
  const k = shortLabelFromDesc(desc) || (rec.otType || 'Unknown');
      monthTypeAmount[m] = monthTypeAmount[m] || {};
      monthTypeAmount[m][k] = (monthTypeAmount[m][k] || 0) + (rec.amount || 0);
    }

    return pivotsForOT.hoursByMonthByType.map((r) => {
      const o: Record<string, any> = { month: r.month };
      for (const tk of typeKeysOT) o[tk] = monthTypeAmount[r.month]?.[tk] || 0;
      return o;
    });
  }, [pivotsForOT, typeKeysOT, metricMode, filteredRecords, employeeSearch]);

  // debug: compute totals from expandedMonthlyOT to compare against aggregatedByTypeOT
  const expandedOTTotalsByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of expandedMonthlyOT) {
      for (const [k, v] of Object.entries(r)) {
        if (k === 'month') continue;
        map[k] = (map[k] || 0) + (v as number || 0);
      }
    }
    return map;
  }, [expandedMonthlyOT]);

  const topEmployees = useMemo(() => {
    return pivotsFiltered.amountByTypeByEmployee
      .slice()
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [pivotsFiltered]);

  const perEmployeeTotals = useMemo(() => {
    const map: Record<
      string,
      { employeeId: string; name: string; team: string; hours: number; amount: number }
    > = {};
    for (const r of filteredRecords) {
      const id = r.employeeId || r.name;
      if (!map[id]) {
        map[id] = { employeeId: r.employeeId || r.name, name: r.name, team: r.team, hours: 0, amount: 0 };
      }
      map[id].hours += r.hours;
      map[id].amount += r.amount;
    }
    let arr = Object.values(map).sort((a, b) => b.hours - a.hours);
    if (presenceMode !== 'All' && presenceType !== 'All') {
      arr = arr.filter(emp => {
        const empRecords = filteredRecords.filter(r => (r.employeeId || r.name) === emp.employeeId);
        const has = empRecords.some(r => r.otType === presenceType);
        return presenceMode === 'Has' ? has : !has;
      });
    }
    return arr;
  }, [filteredRecords]);

  const employeeTypes = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const r of filteredRecords) {
      const id = r.employeeId || r.name;
      map[id] = map[id] || new Set<string>();
      if (r.otType) map[id].add(r.otType);
    }
    return map;
  }, [filteredRecords]);

  // memoized sorted rows for the monthly table (allows sorting by month code, name, or total)
  const monthlyTableRows = useMemo(() => {
    // Build rows from perEmployeeMonthly so we can switch between hours/amount easily
    const rows: Array<any> = Object.values(perEmployeeMonthly).map((e: any) => {
      const values: Record<string, number> = {};
      for (const m of monthsAvailable) {
        values[m] = metricMode === 'hours' ? (e.hoursByMonth[m] || 0) : (e.amountByMonth[m] || 0);
      }
      const total = metricMode === 'hours' ? (e.totalHours || 0) : (e.totalAmount || 0);
      return { employeeId: e.employeeId, name: e.name, team: e.team, values, total };
    });

    // apply sorting
    const field = tableSortField ?? (trendClickedMonth || 'total');
    if (!field) return rows;
    rows.sort((a, b) => comparator(a, b, field, tableSortDir));
    return rows;
  }, [perEmployeeMonthly, tableSortField, tableSortDir, metricMode, monthsAvailable, trendClickedMonth]);

  // memoized sorted rows for comparisons table
  const compRows = useMemo(() => {
    const arr = perEmployeeTotals.slice();
    if (!compSortField) return arr;
    arr.sort((a, b) => comparator(a, b, compSortField, compSortDir));
    return arr;
  }, [perEmployeeTotals, compSortField, compSortDir]);

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">OT Reports</h1>
          <p className="text-muted-foreground">
            Upload the OT report Excel. Dashboards update automatically.
          </p>
        </div>
  <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={async (e) => {
              const input = e.currentTarget;
              const f = input.files?.[0];
              if (!f) return;
              try {
                await upload(f);
              } finally {
                // clear the native input via ref (avoid using the pooled event after await)
                try { if (fileRef.current) fileRef.current.value = ""; } catch (_) {}
              }
            }}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" /> Upload OT Excel
          </Button>
          {records.length > 0 && (
            <Button variant="secondary" onClick={clear}>Clear</Button>
          )}
        </div>
      </div>


      {records.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="All">All Teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {/* active filter pills */}
      {((selectedType && selectedType !== 'All') || selectedPieType) && (
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Active:</div>
          {selectedType && selectedType !== 'All' && (
            <div className="px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs">Type: {selectedType} <button className="ml-2 underline" onClick={() => setSelectedType('All')}>clear</button></div>
          )}
          {selectedPieType && (
            <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs">Pie: {selectedPieType} <button className="ml-2 underline" onClick={() => setSelectedPieType(null)}>clear</button></div>
          )}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {records.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Expected Columns</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Employee ID, Name, Team</li>
              <li>OT/Premium Type, OT/Premium Rate, Hourly Rate</li>
              <li>Number of Hours, Amount, Period, Month</li>
              <li>Type, Type Description</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              OT types supported: LH/SH (Holiday Work), RD (Rest Day/Weekend),
              OT (Overtime), ND (Night Differential).
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs defaultValue="overview" onValueChange={(v) => setCurrentTab(v)}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="employees">Employees</TabsTrigger>
              <TabsTrigger value="emp-monthly">Employee Monthly Summary</TabsTrigger>
              <TabsTrigger value="ot-by-type">OT by Type</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle >Total Amount (₱)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {pivotsFiltered.totalsYTD.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">Year-to-date</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Employees With OT</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pivotsFiltered.totalsYTD.employees}</div>
                    <p className="text-xs text-muted-foreground">Unique employees</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Top OT Type (Hours)</CardTitle>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      // Prefer canonical aggregated totals so composite labels are grouped correctly
                      const aggEntries = Object.entries(aggregatedByType || {});
                      let top = aggEntries.sort((a, b) => b[1].hours - a[1].hours)[0];
                      // fallback to raw byType if aggregation produced nothing
                      if (!top) {
                        const rawTop = Object.entries(pivotsFiltered.totalsYTD.byType || {}).sort((a, b) => b[1].hours - a[1].hours)[0];
                        if (rawTop) top = [rawTop[0], { hours: rawTop[1].hours, amount: rawTop[1].amount || 0 }];
                      }
                      return top ? <div className="text-2xl font-bold">{top[0]}: {top[1].hours.toLocaleString()}</div> : <div className="text-muted-foreground">No data</div>;
                    })()}
                    <p className="text-xs text-muted-foreground">By total hours</p>
                  </CardContent>
                </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>OT by Type (Hours)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-4">
                        <div style={{ width: 220, height: 160 }}>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={36}
                                outerRadius={60}
                                paddingAngle={4}
                                label={false}
                                labelLine={false}
                                onClick={(data) => {
                                  const name = data?.name as string | undefined;
                                  if (!name) return;
                                  setSelectedPieType((s) => (s === name ? null : name));
                                }}
                                onMouseEnter={(_, index) => setPieActiveIndex(index)}
                                onMouseLeave={() => setPieActiveIndex(null)}
                                activeIndex={pieActiveIndex ?? undefined}
                                activeShape={(props) => {
                                  // default active shape: slightly larger outerRadius
                                  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props as any;
                                  const expanded = outerRadius + 6;
                                  return (
                                    <g>
                                      <path d={getSectorPath(cx, cy, innerRadius, expanded, startAngle, endAngle)} fill={fill} />
                                    </g>
                                  );
                                }}
                              >
                                {pieData.map((d, i) => (
                                  <Cell
                                    key={i}
                                    fill={
                                      ["#3b82f6", "#6366f1", "#ef4444", "#f59e0b", "#10b981"][
                                        i % 5
                                      ]
                                    }
                                  />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="flex-1">
                          <div className="mb-3">
                            <div className="text-sm font-medium">Total Hours</div>
                            <div className="text-xl font-semibold">{Object.values(aggregatedByType).reduce((s, v) => s + (v.hours || 0), 0).toLocaleString()}</div>
                          </div>
                          <CustomLegend data={pieData} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Monthly OT Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{ default: { color: "#6366f1" } }}>
                      <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <ReTooltip />
                        <Bar dataKey="hours" fill="#6366f1" />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Employees by OT Amount</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2">
                      {topEmployees.length === 0 ? <li className="text-muted-foreground">No data</li> : topEmployees.map((e) => (
                        <li key={e.employeeId} className="flex justify-between cursor-pointer" onClick={() => setDialogState({ kind: 'employee', id: e.employeeId })}>
                          <span className="break-words">{e.name} ({e.employeeId})</span>
                          <span className="font-mono">{e.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="emp-monthly">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <Card>
                      <CardHeader className="flex items-center justify-between">
                        <CardTitle className="text-sm">Trend ({trendMetric === 'hours' ? 'Total Hours' : 'Total Amount'})</CardTitle>
                        <div className="flex items-center gap-1">
                          <button className={`px-2 py-1 rounded ${trendMetric === 'hours' ? 'bg-primary text-white' : 'border'}`} onClick={() => setTrendMetric('hours')} aria-pressed={trendMetric === 'hours'} aria-label="Show hours">Hours</button>
                          <button className={`px-2 py-1 rounded ${trendMetric === 'amount' ? 'bg-primary text-white' : 'border'}`} onClick={() => setTrendMetric('amount')} aria-pressed={trendMetric === 'amount'} aria-label="Show amount">Amount</button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div style={{ height: 140 }}>
                          <ResponsiveContainer width="100%" height={140}>
                            <LineChart data={monthlyData} onClick={(evt) => {
                              // evt is either a chart event or a point payload; when clicking a point, evt.activeLabel contains month
                              // @ts-ignore
                              const m = evt?.activeLabel as string | undefined;
                              if (!m) return;
                              setTrendClickedMonth((cur) => (cur === m ? null : m));
                              // set table sort to this month descending
                              setTableSortField(m);
                              setTableSortDir('desc');
                            }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <ReTooltip formatter={(v) => {
                                try {
                                  if (v == null) return '';
                                  if (Array.isArray(v)) return v.map((x:any) => (typeof x === 'number' ? x.toLocaleString() : String(x))).join(', ');
                                  return typeof v === 'number' ? v.toLocaleString() : String(v);
                                } catch (e) {
                                  return '';
                                }
                              }} />
                              {trendMetric === 'hours' ? <Line dataKey="hours" stroke="#3b82f6" dot={false} /> : <Line dataKey="amount" stroke="#10b981" dot={false} />}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div style={{ width: 260 }}>
                    <div className="space-y-2">
                      <Card>
                        <CardHeader className="pb-0">
                          <CardTitle className="text-sm mb-0">Top Type</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-1">
                          <div className="text-sm font-semibold">{Object.entries(aggregatedByType).sort((a,b)=>b[1].hours-a[1].hours)[0]?.[0] || '—'}</div>
                          <div className="text-xs text-muted-foreground mt-0">Hours: {Object.entries(aggregatedByType).sort((a,b)=>b[1].hours-a[1].hours)[0]?.[1].hours?.toLocaleString() || 0}</div>
                          <div className="text-xs text-muted-foreground mt-0">Amount: {Object.entries(aggregatedByType).sort((a,b)=>b[1].hours-a[1].hours)[0]?.[1].amount?.toLocaleString() || 0}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-0">
                          <CardTitle className="text-sm mb-0">Top Employees (mini)</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-1">
                                  <div style={{ height: 110 }}>
                                    <ResponsiveContainer width="100%" height={110}>
                                      <BarChart data={topEmployeesForTrend.map((t) => ({ name: t.name, val: trendClickedMonth ? t.monthVal : (trendMetric === 'hours' ? t.totalHours : t.totalAmount) })).slice(0,3)} layout="vertical" margin={{ left: 0, right: 80 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#374151' }} tickFormatter={(v: any) => typeof v === 'string' ? (v.length > 18 ? v.slice(0,16) + '…' : v) : v} />
                                        <Bar 
                                          dataKey="val" 
                                          fill="#6366f1" 
                                          barSize={12}
                                          label={{ 
                                            position: 'right',
                                            formatter: (v: number) => trendMetric === 'hours' ? v.toLocaleString() + ' hrs' : '₱' + v.toLocaleString(),
                                            fill: '#374151',
                                            fontSize: 11
                                          }}
                                        />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>

                <Card>
                  <CardHeader className="flex items-center justify-between">
                    <CardTitle>Employee Monthly Summary</CardTitle>
                    <div className="flex items-center gap-2">
                      <button className={`px-2 py-1 rounded ${metricMode === 'hours' ? 'bg-primary text-white' : 'border'}`} onClick={() => setMetric('hours')} aria-pressed={metricMode === 'hours'}>Hours</button>
                      <button className={`px-2 py-1 rounded ${metricMode === 'amount' ? 'bg-primary text-white' : 'border'}`} onClick={() => setMetric('amount')} aria-pressed={metricMode === 'amount'}>Amount</button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm table-fixed">
                        <thead>
                          <tr className="border-b">
                            <th className="p-2 text-left">
                              <button
                                onClick={() => toggleCompSort('name')}
                                className="flex items-center gap-2"
                                aria-label="Sort by employee name"
                                title="Sort by employee name"
                              >
                                <span>Employee</span>
                                {compSortField === 'name' ? (compSortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                              </button>
                            </th>
                            <th className="p-2 text-left">Team</th>
                            {monthsAvailable.map((m) => (
                              <th key={m} className="p-2 text-right truncate">
                                <button
                                  onClick={() => toggleSort(m)}
                                  className="w-full text-right flex items-center justify-end gap-2"
                                  aria-label={`Sort by ${m}`}
                                  title={`Sort by ${m}`}
                                >
                                  <span className="truncate">{m}</span>
                                  {tableSortField === m ? (
                                    tableSortDir === 'asc' ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )
                                  ) : null}
                                </button>
                              </th>
                            ))}
                            <th className="p-2 text-right">
                              <button
                                onClick={() => toggleSort('total')}
                                className="w-full text-right flex items-center justify-end gap-2"
                                aria-label="Sort by YTD total"
                                title="Sort by YTD total"
                              >
                                <span>YTD Total</span>
                                {tableSortField === 'total' ? (tableSortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyTableRows.map((row) => (
                            <tr key={row.employeeId} className="border-b hover:bg-muted/50">
                              <td className="p-2 font-medium break-words whitespace-normal cursor-pointer" onClick={() => setDialogState({ kind: 'employee', id: row.employeeId })}>{row.name} ({row.employeeId})</td>
                              <td className="p-2 break-words whitespace-normal">{row.team}</td>
                              {monthsAvailable.map((m) => (
                                <td key={m} className="p-2 text-right truncate cursor-pointer" onClick={() => setDialogState({ kind: 'month', month: `${m}:${row.employeeId}` })}>
                                  {(row.values[m] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </td>
                              ))}
                              <td className="p-2 text-right font-semibold truncate">{row.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="ot-by-type">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="border px-2 py-1 rounded">
                    <option value="All">All Teams</option>
                    {teams.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                  <input placeholder="Employee ID" className="border px-2 py-1 rounded" onChange={(e) => setEmployeeSearch(e.target.value)} />
                  <select value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} className="border px-2 py-1 rounded">
                    <option value="All">All Periods</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div className="ml-auto">Toggle Metric: <button className="ml-2 px-2 py-1 border rounded" onClick={() => setMetric(metricMode === 'hours' ? 'amount' : 'hours')}>{metricMode}</button></div>
                </div>



                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                        <CardTitle>Monthly OT {metricMode === 'hours' ? 'Hours' : 'Amount (₱)'} per Type (stacked)</CardTitle>
                      </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={expandedMonthlyOT} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                          <XAxis dataKey="month" />
                          <YAxis />
                          <ReTooltip formatter={(value: any) => {
                            try {
                              if (value == null) return '';
                              if (Array.isArray(value)) return value.map((x:any) => (typeof x === 'number' ? x.toLocaleString() : String(x))).join(', ');
                              return typeof value === 'number' ? value.toLocaleString() : String(value);
                            } catch (e) {
                              return '';
                            }
                          }} />
                          <Legend />
                          {typeKeysOT.map((t, i) => (
                            <Bar key={t} dataKey={t} name={`${t} (${metricMode === 'hours' ? 'hrs' : '₱'})`} stackId="a" fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Grand Totals by Type (YTD)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(aggregatedByTypeOT).length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">No totals available. Check filters or upload.</div>
                      ) : (
                        <div>
                          <div className="h-80 overflow-y-auto">
                            <ul className="text-sm space-y-2">
                              {Object.entries(aggregatedByTypeOT).map(([k, v], idx) => (
                                <li key={k} className="flex justify-between"><span>{k}</span><span className="font-mono">{(metricMode === 'hours' ? v.hours : v.amount).toLocaleString()}</span></li>
                              ))}
                            </ul>
                          </div>
                          {/* thin divider above the total */}
                          <div className="border-t mt-2" />
                          {/* Grand total for the currently selected metric (moved to bottom) */}
                          <div className="mt-2 flex items-center justify-between px-2">
                            <div className="text-sm font-semibold">Total</div>
                            <div className="font-mono font-semibold">
                              {Object.values(aggregatedByTypeOT)
                                .reduce((s, v) => s + (metricMode === 'hours' ? (v.hours || 0) : (v.amount || 0)), 0)
                                .toLocaleString()}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            

            <TabsContent value="employees">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    placeholder="Search employees..."
                    value={employeeSearch}
                    onChange={(e) => { setEmployeeSearch(e.target.value); setPage(1); }}
                    className="border px-2 py-1 rounded w-64"
                  />
                  <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="border px-2 py-1 rounded">
                    <option value="All">All Teams</option>
                    {teams.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                  <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="border px-2 py-1 rounded">
                    <option value="All">All Types</option>
                    {typeKeys.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                  <div className="ml-auto flex gap-2">
                    <button className={`px-3 py-1 rounded bg-primary text-white`}>Summary</button>
                  </div>
                </div>

                {employeeSubView === 'summary' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Employees — Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="p-2 text-left">
                                <button
                                  onClick={() => toggleEmpSort('name')}
                                  className="flex items-center gap-2"
                                  aria-label="Sort by employee name"
                                  title="Sort by employee name"
                                >
                                  <span>Employee</span>
                                  {empSortField === 'name' ? (empSortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                                </button>
                              </th>
                              <th className="p-2 text-left">Team</th>
                              <th className="p-2 text-right">
                                <button
                                  onClick={() => toggleEmpSort('hours')}
                                  className="flex items-center justify-end w-full gap-2"
                                  aria-label="Sort by hours"
                                  title="Sort by hours"
                                >
                                  <span>Hours (YTD)</span>
                                  {empSortField === 'hours' ? (empSortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                                </button>
                              </th>
                              <th className="p-2 text-right">
                                <button
                                  onClick={() => toggleEmpSort('amount')}
                                  className="flex items-center justify-end w-full gap-2"
                                  aria-label="Sort by amount"
                                  title="Sort by amount"
                                >
                                  <span>Amount (₱)</span>
                                  {empSortField === 'amount' ? (empSortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const q = employeeSearch.trim().toLowerCase();
                              let rows = perEmployeeTotals.filter(r => {
                                if (q) {
                                  return (`${r.name} ${r.employeeId}`.toLowerCase()).includes(q);
                                }
                                return true;
                              });
                              // apply per-employee sorting/pagination
                              const sorted = rows.slice().sort((a,b) => comparator(a, b, empSortField, empSortDir));
                              const start = (page-1)*pageSize;
                              const pageRows = sorted.slice(start, start+pageSize);
                              return pageRows.map((row) => (
                                <tr key={row.employeeId} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => setDialogState({ kind: 'employee', id: row.employeeId })}>
                                  <td className="p-2 break-words">
                                    <div className="font-medium">{row.name} <span className="text-xs text-muted-foreground">({row.employeeId})</span></div>
                                  </td>
                                  <td className="p-2">{row.team}</td>
                                  <td className="p-2 text-right">{row.hours.toLocaleString()}</td>
                                  <td className="p-2 text-right font-semibold">{row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                </tr>
                              ));
                            })()}
                            <tr>
                              <td className="p-2 font-semibold">Grand Total</td>
                              <td />
                              <td className="p-2 text-right font-semibold">{pivotsFiltered.totalsYTD.totalHours.toLocaleString()}</td>
                              <td className="p-2 text-right font-semibold">{pivotsFiltered.totalsYTD.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm text-muted-foreground">Showing {(page-1)*pageSize+1} - {Math.min(page*pageSize, perEmployeeTotals.length)} of {perEmployeeTotals.length}</div>
                          <div className="flex items-center gap-2">
                            <button className="border px-2 py-1 rounded" disabled={page===1} onClick={() => setPage(page-1)}>Prev</button>
                            <button className="border px-2 py-1 rounded" disabled={(page*pageSize)>=perEmployeeTotals.length} onClick={() => setPage(page+1)}>Next</button>
                            <select value={pageSize} onChange={(e)=>{setPageSize(Number(e.target.value)); setPage(1);}} className="border px-2 py-1 rounded">
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* dialogs were moved below so they open regardless of which tab is active */}

            </TabsContent>
          </Tabs>

          {/* Global dialogs (opened from any tab) */}
          <Dialog open={!!dialogState && dialogState.kind === 'employee'} onOpenChange={(open) => { if (!open) setDialogState(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {dialogState?.kind === 'employee' ? (() => {
                    const id = dialogState.id;
                    const byType = pivotsFiltered.amountByTypeByEmployee.find(r => r.employeeId === id);
                    return byType ? `${byType.name} — ${byType.employeeId}` : 'Employee';
                  })() : 'Employee'}
                </DialogTitle>
                <DialogDescription>
                  Detailed breakdown by OT type and by month.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {dialogState?.kind === 'employee' && (() => {
                  const id = dialogState.id;
                  const byType = pivotsFiltered.amountByTypeByEmployee.find(r => r.employeeId === id);
                  const byMonth = pivotsFiltered.amountByMonthByEmployee.find(r => r.employeeId === id);
                  return (
                    <div>
                      {byType ? (
                        <div className="mb-4">
                          <h3 className="font-medium">By OT Type</h3>
                          <table className="w-full text-sm mt-2">
                            <thead>
                              <tr className="border-b">
                                <th className="p-2 text-left">Type</th>
                                <th className="p-2 text-right">Amount (₱)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(byType.values).map(([k,v]) => (
                                <tr key={k} className="border-b">
                                  <td className="p-2">{k}</td>
                                  <td className="p-2 text-right">{v.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                </tr>
                              ))}
                              <tr>
                                <td className="p-2 font-semibold">Total</td>
                                <td className="p-2 text-right font-semibold">{byType.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : <div className="text-muted-foreground">No type breakdown available.</div>}

                      {byMonth ? (
                        <div>
                          <h3 className="font-medium">By Month</h3>
                          <div className="overflow-x-auto mt-2">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  {monthsAvailable.map(m => <th key={m} className="p-2 text-right">{m}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  {monthsAvailable.map(m => <td key={m} className="p-2 text-right">{(byMonth.values[m] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>)}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : <div className="text-muted-foreground mt-2">No monthly data available.</div>}
                    </div>
                  );
                })()}
              </div>
              <DialogFooter>
                <Button onClick={() => setDialogState(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Employee-Month Detail Dialog */}
          <Dialog open={!!dialogState && dialogState.kind === 'month'} onOpenChange={(open) => { if (!open) setDialogState(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Employee - Month Details</DialogTitle>
                <DialogDescription>OT type breakdown for the selected employee and month.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {dialogState?.kind === 'month' && (() => {
                  const [m, emp] = (dialogState.month || '').split(':');
                  if (!m || !emp) return <div className="text-muted-foreground">No data</div>;
                  const byType = pivotsFiltered.amountByTypeByEmployee.find(r => r.employeeId === emp);
                  const byMonth = pivotsFiltered.amountByMonthByEmployee.find(r => r.employeeId === emp);
                  return (
                    <div>
                      <h3 className="font-medium">{byType ? `${byType.name} — ${m}` : `${emp} — ${m}`}</h3>
                      <table className="w-full text-sm mt-2">
                        <thead>
                          <tr className="border-b"><th className="p-2 text-left">Type</th><th className="p-2 text-right">Value</th></tr>
                        </thead>
                        <tbody>
                          {byType ? Object.entries(byType.values).map(([k,v]) => (
                            <tr key={k} className="border-b"><td className="p-2">{k}</td><td className="p-2 text-right">{v.toLocaleString()}</td></tr>
                          )) : <tr><td colSpan={2} className="p-2 text-muted-foreground">No breakdown available</td></tr>}
                        </tbody>
                      </table>
                      <div className="mt-4">
                        <div className="text-sm text-muted-foreground">Monthly total</div>
                        <div className="text-xl font-semibold">{(byMonth?.values?.[m] || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <DialogFooter>
                <Button onClick={() => setDialogState(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setHelpOpen(true)}>OT Types & Help</Button>
          </div>

          <Dialog open={helpOpen} onOpenChange={(o) => setHelpOpen(!!o)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>OT Types and Descriptions</DialogTitle>
                <DialogDescription>Quick reference for OT types used in the dashboards.</DialogDescription>
              </DialogHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  <li>
                    <strong>LH/SH - Holiday Work:</strong> Approval may be required - PM or Supervisor informed PMD, or SA applied for by employee and approved by Supervisor.
                  </li>
                  <li>
                    <strong>RD - Rest Day/Weekend:</strong> Approval may be required - PM or Supervisor informed PMD, or SA applied for by employee and approved by Supervisor.
                  </li>
                  <li>
                    <strong>OT - Overtime:</strong> Approval required - Work rendered in excess of 8 hours on an ordinary day, holiday, or rest day.
                  </li>
                  <li>
                    <strong>ND - Night Differential:</strong> Automatically captured by the system for work from 10PM to 6AM - No approval needed as long as employee is authorized to work on that day.
                  </li>
                </ul>
              </CardContent>
              <DialogFooter>
                <Button onClick={() => setHelpOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
