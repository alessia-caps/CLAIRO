import { useState } from "react";
import * as XLSX from "xlsx";

export type OTRecord = {
  employeeId: string;
  name: string;
  team: string;
  otType: string; // LH, RD, OT, ND
  otTypeDescription?: string;
  rateLabel?: string; // e.g. 100%
  hourlyRate?: number;
  hours: number;
  amount: number;
  period?: string; // e.g. JAN 15
  monthKey?: string; // e.g. 01-JAN
  type?: string;
  typeDescription?: string;
};

export type OTPivots = {
  totalsYTD: {
    totalHours: number;
    totalAmount: number;
    employees: number;
    byType: Record<string, { hours: number; amount: number }>;
  };
  hoursByMonthByType: Array<{
    month: string; // e.g. JAN
    values: Record<string, number>; // type -> hours
    total: number;
  }>;
  amountByTypeByEmployee: Array<{
    employeeId: string;
    name: string;
    team: string;
    values: Record<string, number>; // type -> amount
    total: number;
  }>;
  amountByMonthByEmployee: Array<{
    employeeId: string;
    name: string;
    team: string;
    values: Record<string, number>; // month -> amount
    total: number;
  }>;
};

const MONTH_ORDER = [
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
];

function parseMonthKey(input?: string): { key?: string; mon?: string } {
  if (!input) return {};
  const s = String(input).toUpperCase().trim();
  // Accept formats like 01-JAN, 1-JAN, JAN, 2025-01, 01/2025
  const m1 = s.match(/^(\d{1,2})[-\s]?([A-Z]{3})$/);
  if (m1) {
    const mon = m1[2];
    return { key: `${m1[1].padStart(2, "0")}-${mon}`, mon };
  }
  const m2 = s.match(/^([A-Z]{3})$/);
  if (m2) return { key: `--${m2[1]}`, mon: m2[1] };
  const m3 = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m3) {
    const mon = MONTH_ORDER[parseInt(m3[2], 10) - 1] ?? "";
    return { key: `${m3[2].padStart(2, "0")}-${mon}`, mon };
  }
  return {};
}

function toNumber(v: any): number {
  if (v == null || v === "") return 0;
  const s = String(v).replace(/[^0-9.-]/g, "");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function norm(s: any): string {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findHeaderRowAndObjects(ws: XLSX.WorkSheet): any[] | null {
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false }) as any[][];
  if (!rows || rows.length === 0) return null;

  const groups: string[][] = [
    ["employeeid", "empid", "id", "employeeno", "employee#"],
    ["name", "employeename"],
    ["team", "department", "dept", "bu/gbu", "businessunit", "gbu"],
    ["otpremiumtype", "ottype", "type"],
    ["otpremiumrate", "rate", "premiumrate"],
    ["hourlyrate", "ratehour"],
    ["numberofhours", "hours", "noofhours", "noofhour"],
    ["amount", "phpamount", "totalamount"],
    ["period"],
    ["month"],
    ["typedescription", "description"],
  ];

  let bestIndex = -1;
  let bestScore = -1;

  const maxScan = Math.min(rows.length, 30); // scan top 30 rows
  for (let i = 0; i < maxScan; i++) {
    const cells = rows[i] || [];
    if (!cells.some((c) => String(c || "").trim())) continue;
    const normalized = cells.map(norm);
    const matched = new Set<number>();
    groups.forEach((alts, gi) => {
      for (const alt of alts) {
        if (normalized.some((c) => c === alt)) {
          matched.add(gi);
          break;
        }
      }
    });
    const score = matched.size;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex < 0 || bestScore < 3) return null;

  // Build header strings from the detected header row, ensure uniqueness
  const headerCells = (rows[bestIndex] || []).map((h, idx) => String(h || `col${idx + 1}`));
  const seen = new Map<string, number>();
  const headers = headerCells.map((h) => {
    const base = h || "";
    const key = base in Object.prototype ? String(base) : base;
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
    return count ? `${key}_${count + 1}` : key;
  });

  const objs: any[] = [];
  for (let r = bestIndex + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const hasValue = row.some((c) => String(c || "").trim() !== "");
    if (!hasValue) continue;
    const obj: any = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    objs.push(obj);
  }

  return objs;
}

export function aggregateOT(records: OTRecord[]): OTPivots {
  const byEmp: Record<string, { id: string; name: string; team: string; byType: Record<string, number>; byMonth: Record<string, number>; amountByType: Record<string, number>; totalHours: number; totalAmount: number }>= {};
  const byMonthType: Record<string, Record<string, number>> = {}; // month->type->hours
  const byTypeTotals: Record<string, { hours: number; amount: number }> = {};
  const empIds = new Set<string>();

  records.forEach((r) => {
    const mon = parseMonthKey(r.monthKey)?.mon || parseMonthKey(r.period)?.mon || "";
    const type = r.otType || "Unknown";
    empIds.add(r.employeeId || r.name);

    byTypeTotals[type] = byTypeTotals[type] || { hours: 0, amount: 0 };
    byTypeTotals[type].hours += r.hours;
    byTypeTotals[type].amount += r.amount;

    const m = mon || "";
    byMonthType[m] = byMonthType[m] || {};
    byMonthType[m][type] = (byMonthType[m][type] || 0) + r.hours;

    const key = r.employeeId || r.name;
    if (!byEmp[key]) {
      byEmp[key] = {
        id: r.employeeId || r.name,
        name: r.name,
        team: r.team,
        byType: {},
        byMonth: {},
        amountByType: {},
        totalHours: 0,
        totalAmount: 0,
      };
    }
    byEmp[key].byType[type] = (byEmp[key].byType[type] || 0) + r.hours;
    byEmp[key].amountByType[type] = (byEmp[key].amountByType[type] || 0) + r.amount;
    if (m) byEmp[key].byMonth[m] = (byEmp[key].byMonth[m] || 0) + r.amount;
    byEmp[key].totalHours += r.hours;
    byEmp[key].totalAmount += r.amount;
  });

  const monthsPresent = Array.from(
    new Set(Object.keys(byMonthType).filter(Boolean))
  ).sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));

  const hoursByMonthByType = monthsPresent.map((mon) => {
    const values = byMonthType[mon] || {};
    const total = Object.values(values).reduce((s, v) => s + v, 0);
    return { month: mon, values, total };
  });

  const amountByTypeByEmployee = Object.values(byEmp)
    .map((emp) => ({
      employeeId: emp.id,
      name: emp.name,
      team: emp.team,
      values: emp.amountByType,
      total: emp.totalAmount,
    }))
    .sort((a, b) => b.total - a.total);

  const amountByMonthByEmployee = Object.values(byEmp)
    .map((emp) => ({
      employeeId: emp.id,
      name: emp.name,
      team: emp.team,
      values: emp.byMonth,
      total: emp.totalAmount,
    }))
    .sort((a, b) => b.total - a.total);

  const totalsYTD = {
    totalHours: records.reduce((s, r) => s + r.hours, 0),
    totalAmount: records.reduce((s, r) => s + r.amount, 0),
    employees: empIds.size,
    byType: byTypeTotals,
  };

  return { totalsYTD, hoursByMonthByType, amountByTypeByEmployee, amountByMonthByEmployee };
}

export function useOTUpload() {
  const [records, setRecords] = useState<OTRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const parseWorkbook = (wb: XLSX.WorkBook) => {
    const out: OTRecord[] = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;

      // Try to auto-detect header row and build objects
      const detected = findHeaderRowAndObjects(ws) || XLSX.utils.sheet_to_json(ws);
      const rows: any[] = detected as any[];

      for (const row of rows) {
        const employeeId = String(row["Employee ID"] || row["EmployeeID"] || row["ID"] || "").trim();
        const name = String(row["Name"] || row["Employee Name"] || "").trim();
        const team = String(row["Team"] || row["Department"] || row["BU/GBU"] || "").trim();
        const otType = String(row["OT/Premium Type"] || row["OT Type"] || row["Type"] || "").trim();
        const otTypeDescription = row["Type Description"] || row["OT Type Description"];
        const rateLabel = row["OT/Premium\nRate"] || row["OT/Premium Rate"] || row["Rate"];
        const hourlyRate = toNumber(row["Hourly Rate"]);
        const hours = toNumber(row["Number of Hours"] || row["Hours"]);
        const amount = toNumber(row["Amount"]);
        const period = row["Period"] ? String(row["Period"]) : undefined;
        const monthKey = row["Month"] ? String(row["Month"]) : undefined;
        const type = row["Type"] ? String(row["Type"]) : undefined;
        const typeDescription = row["Type Description"] ? String(row["Type Description"]) : undefined;

        if (!name && !employeeId) continue;
        if (hours === 0 && amount === 0) continue;
        out.push({
          employeeId,
          name,
          team,
          otType,
          otTypeDescription,
          rateLabel: rateLabel ? String(rateLabel) : undefined,
          hourlyRate: hourlyRate || undefined,
          hours,
          amount,
          period,
          monthKey,
          type,
          typeDescription,
        });
      }
    }
    return out;
  };

  const upload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const parsed = parseWorkbook(wb);
      if (parsed.length === 0) throw new Error("No valid OT rows found. Please check the column headers.");
      setRecords(parsed);
      return parsed;
    } catch (e: any) {
      setError(e?.message || "Failed to read file");
      throw e;
    } finally {
      setIsUploading(false);
    }
  };

  const clear = () => setRecords([]);

  return { records, error, isUploading, upload, clear };
}
