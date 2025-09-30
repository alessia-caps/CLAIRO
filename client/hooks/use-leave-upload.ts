import { useState } from "react";
import * as XLSX from "xlsx";

export type LeaveTransaction = {
  employeeId: string;
  name: string;
  leaveType: string;
  dateFiled?: string;
  dateFrom?: string;
  dateTo?: string;
  withPayDays: number;
  withoutPayDays: number;
  reason?: string;
  status?: string;
  rejectReason?: string;
  dateApprovedSupervisor?: string;
  dateRejectedSupervisor?: string;
};

export type LeaveSummary = {
  employeeId: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  department?: string;
  hireDate?: string;
  regularizationDate?: string;
  leaveType: string;
  usedDuringRange: number;
  totalAvailableBalanceYtd: number;
  isActive?: string;
};

export type LeaveAnalytics = {
  totals: {
    requests: number;
    approved: number;
    pending: number;
    rejected: number;
    withPayDays: number;
    withoutPayDays: number;
  };
  byType: Array<{
    type: string;
    requests: number;
    withPayDays: number;
    withoutPayDays: number;
  }>;
  topEmployeesByDays: Array<{
    name: string;
    totalDays: number;
    withPay: number;
    withoutPay: number;
  }>;
};

type SheetPreview = {
  sheetName: string;
  classification: "transactions" | "summary" | "unknown";
  preview: any[];
};

function toNumber(v: any): number {
  if (v == null || v === "") return 0;
  const s = String(v).replace(/[^0-9.-]/g, "");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

// Convert Excel serial date (number) to ISO date string (YYYY-MM-DD)
function excelSerialToIso(v: number): string {
  const ms = (v - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return String(v);
  return d.toISOString().split("T")[0];
}

function parseDateCell(v: any): string | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return excelSerialToIso(v);
  const s = String(v).trim();
  if (/^\d+(?:\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 20000) return excelSerialToIso(n);
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return s;
}

// Read a worksheet and auto-detect header row within the first few rows.
function sheetToJsonAutoHeader(ws: XLSX.WorkSheet): any[] {
  // get as arrays (rows)
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[];
  if (!rows || rows.length === 0) return [];

  const maxCheck = Math.min(10, rows.length);
  let headerIdx = -1;

  const normalize = (s: any) => String(s || "").trim().toLowerCase().replace(/\s+/g, "");

  for (let i = 0; i < maxCheck; i++) {
    const row = rows[i] as any[];
    if (!row) continue;
    const tokens = row.map((c) => normalize(c));

    // summary header clues
    const hasSummary = tokens.some((t) =>
      [
        "employeeid",
        "lastname",
        "firstname",
        "department",
        "totalavailablebalance(ytd)",
        "totalavailablebalance",
        "leavesusedduringdaterange",
        "leavesused",
      ].includes(t),
    );

    // transactions header clues
    const hasTx = tokens.some((t) =>
      [
        "leavetypename",
        "withpaynoofdays",
        "woutpaynoofdays",
        "datefiled",
        "datefrom",
        "dateto",
      ].includes(t),
    );

    if (hasSummary || hasTx) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx < 0) {
    // fallback to standard behavior (first row header)
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }

  const headerRow = rows[headerIdx] as any[];
  const headers = headerRow.map((h) => String(h || "").trim());
  const out: any[] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] as any[];
    if (!row) continue;
    const obj: any = {};
    let allEmpty = true;
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `col${c}`;
      const val = row[c];
      if (val !== undefined && val !== null && String(val).trim() !== "") allEmpty = false;
      obj[key] = val;
    }
    if (!allEmpty) out.push(obj);
  }

  return out;
}

export function useLeaveUpload() {
  const [transactions, setTransactions] = useState<LeaveTransaction[]>([]);
  const [summary, setSummary] = useState<LeaveSummary[]>([]);
  const [workbookPreview, setWorkbookPreview] = useState<SheetPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const parseTransactions = (rows: any[]): LeaveTransaction[] => {
    const out: LeaveTransaction[] = [];
    for (const row of rows) {
      const employeeId = String(
        row["EmployeeID"] ||
          row["EMPLOYEE ID"] ||
          row["Employee ID"] ||
          row["ID"] ||
          "",
      ).trim();
      const name = String(row["Name"] || row["Employee Name"] || "").trim();
      const leaveType = String(
        row["LeaveTypeName"] || row["Leave Type"] || row["LEAVE TYPE"] || "",
      ).trim();
      if (!name && !employeeId) continue;
      out.push({
        employeeId,
        name,
        leaveType,
  dateFiled: parseDateCell(row["DateFiled"] || row["Date Filed"] || row["DateFiled"]),
  dateFrom: parseDateCell(row["DateFrom"] || row["Date From"] || row["DateFrom"]),
  dateTo: parseDateCell(row["DateTo"] || row["Date To"] || row["DateTo"]),
        withPayDays: toNumber(row["WithPayNoOfdays"] || row["With Pay Days"]),
        withoutPayDays: toNumber(
          row["WoutPayNoOfDays"] || row["Without Pay Days"],
        ),
        reason: row["Reason"] ? String(row["Reason"]) : undefined,
        status: row["LeaveStatus"] ? String(row["LeaveStatus"]) : undefined,
        rejectReason: row["RejectReason"]
          ? String(row["RejectReason"])
          : undefined,
        dateApprovedSupervisor: row["DateApprovedSupervisor"]
          ? String(row["DateApprovedSupervisor"])
          : undefined,
        dateRejectedSupervisor: row["DateRejectedSupervisor"]
          ? String(row["DateRejectedSupervisor"])
          : undefined,
      });
    }
    return out;
  };

  const parseSummary = (rows: any[]): LeaveSummary[] => {
    const out: LeaveSummary[] = [];
    for (const row of rows) {
      const employeeId = String(
        row["EMPLOYEE ID"] || row["EmployeeID"] || row["Employee ID"] || "",
      ).trim();
      const lastName = String(
        row["LAST NAME"] || row["Last Name"] || "",
      ).trim();
      const firstName = String(
        row["FIRST NAME"] || row["First Name"] || "",
      ).trim();
      if (!employeeId && !lastName && !firstName) continue;
      out.push({
        employeeId,
        lastName,
        firstName,
        middleName: row["MIDDLE NAME"] ? String(row["MIDDLE NAME"]) : undefined,
        department: row["DEPARTMENT"] ? String(row["DEPARTMENT"]) : undefined,
        hireDate: parseDateCell(row["HIRE DATE"] || row["Hire Date"] || row["HIRE DATE"]),
        regularizationDate: parseDateCell(
          row["REGULARIZATION DATE"] || row["Regularization Date"] || row["REGULARIZATION DATE"],
        ),
        leaveType: String(row["LEAVE TYPE"] || row["Leave Type"] || "").trim(),
        usedDuringRange: toNumber(
          row["LEAVES USED DURING DATE RANGE"] || row["Leaves Used"],
        ),
        totalAvailableBalanceYtd: toNumber(
          row["Total Available Balance (YTD)"] || row["Available Balance"],
        ),
        isActive: row["IS ACTIVE"] ? String(row["IS ACTIVE"]) : undefined,
      });
    }
    return out;
  };

  const uploadTransactions = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const all: any[] = [];
      for (const s of wb.SheetNames) {
        const ws = wb.Sheets[s];
        if (!ws) continue;
        all.push(...sheetToJsonAutoHeader(ws));
      }
      const parsed = parseTransactions(all);
      if (parsed.length === 0)
        throw new Error("No leave transactions found. Check headers.");
      setTransactions(parsed);
      return parsed;
    } catch (e: any) {
      setError(e?.message || "Failed to read transactions file");
      throw e;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadSummary = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const all: any[] = [];
      for (const s of wb.SheetNames) {
        const ws = wb.Sheets[s];
        if (!ws) continue;
        all.push(...sheetToJsonAutoHeader(ws));
      }
      const parsed = parseSummary(all);
      if (parsed.length === 0)
        throw new Error("No summary rows found. Check headers.");
      setSummary(parsed);
      return parsed;
    } catch (e: any) {
      setError(e?.message || "Failed to read summary file");
      throw e;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadWorkbook = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const txRows: any[] = [];
  const sumRows: any[] = [];
  const previews: SheetPreview[] = [];

      for (const s of wb.SheetNames) {
        const ws = wb.Sheets[s];
        if (!ws) continue;
        const rows: any[] = sheetToJsonAutoHeader(ws);
        if (!rows || rows.length === 0) continue;

        // Heuristic: if rows have LeaveTypeName or WithPayNoOfdays -> transactions
        const sample = rows[0];
        const keys = Object.keys(sample).map((k) => String(k).toLowerCase());
        const isTx = keys.some((k) =>
          ["leavetypename", "withpaynoofdays", "woutpaynoofdays", "datefiled"].includes(k.replace(/\s+/g, "")),
        );
        const isSum = keys.some((k) =>
          ["leave type", "leaves used during date range", "total available balance (ytd)"]
            .map((s) => s.replace(/\s+/g, "").toLowerCase())
            .includes(k.replace(/\s+/g, "")),
        );

        if (isTx) {
          txRows.push(...rows);
          previews.push({ sheetName: s, classification: "transactions", preview: rows.slice(0, 3) });
        } else if (isSum) {
          sumRows.push(...rows);
          previews.push({ sheetName: s, classification: "summary", preview: rows.slice(0, 3) });
        } else {
          // unknown: try to route by checking more rows
          let hasTx = false;
          let hasSum = false;
          for (const r of rows.slice(0, 5)) {
            const rk = Object.keys(r).map((k) => String(k).toLowerCase());
            if (rk.some((k) => k.includes("leavetype") || k.includes("withpay"))) hasTx = true;
            if (rk.some((k) => k.includes("leave type") || k.includes("leaves used") || k.includes("available balance"))) hasSum = true;
          }
          if (hasTx) {
            txRows.push(...rows);
            previews.push({ sheetName: s, classification: "transactions", preview: rows.slice(0, 3) });
          } else if (hasSum) {
            sumRows.push(...rows);
            previews.push({ sheetName: s, classification: "summary", preview: rows.slice(0, 3) });
          } else {
            // fallback: if sheet name contains 'transaction' or 'summary'
            const name = String(s).toLowerCase();
            if (name.includes("trans")) {
              txRows.push(...rows);
              previews.push({ sheetName: s, classification: "transactions", preview: rows.slice(0, 3) });
            } else if (name.includes("summ")) {
              sumRows.push(...rows);
              previews.push({ sheetName: s, classification: "summary", preview: rows.slice(0, 3) });
            } else {
              // if still unknown, place into transactions by default
              txRows.push(...rows);
              previews.push({ sheetName: s, classification: "unknown", preview: rows.slice(0, 3) });
            }
          }
        }
      }

      const parsedTx = parseTransactions(txRows);
      const parsedSum = parseSummary(sumRows);

      if (parsedTx.length === 0 && parsedSum.length === 0) {
        throw new Error("No recognizable transactions or summary sheets found in workbook.");
      }

  if (parsedTx.length > 0) setTransactions(parsedTx);
  if (parsedSum.length > 0) setSummary(parsedSum);
  setWorkbookPreview(previews);
  return { transactions: parsedTx, summary: parsedSum };
    } catch (e: any) {
      setError(e?.message || "Failed to read workbook");
      throw e;
    } finally {
      setIsUploading(false);
    }
  };

  const clear = () => {
    setTransactions([]);
    setSummary([]);
    setWorkbookPreview([]);
  };

  const analytics: LeaveAnalytics = (() => {
    const totals = {
      requests: transactions.length,
      approved: transactions.filter((t) => /approved/i.test(t.status || ""))
        .length,
      pending: transactions.filter((t) => /pending|await/i.test(t.status || ""))
        .length,
      rejected: transactions.filter((t) => /reject/i.test(t.status || ""))
        .length,
      withPayDays: transactions.reduce((s, t) => s + t.withPayDays, 0),
      withoutPayDays: transactions.reduce((s, t) => s + t.withoutPayDays, 0),
    };
    const byTypeMap = new Map<
      string,
      { requests: number; withPayDays: number; withoutPayDays: number }
    >();
    const byEmpMap = new Map<
      string,
      { name: string; withPay: number; withoutPay: number }
    >();
    for (const t of transactions) {
      const bt = byTypeMap.get(t.leaveType) || {
        requests: 0,
        withPayDays: 0,
        withoutPayDays: 0,
      };
      bt.requests += 1;
      bt.withPayDays += t.withPayDays;
      bt.withoutPayDays += t.withoutPayDays;
      byTypeMap.set(t.leaveType, bt);

      const key = t.name || t.employeeId;
      const be = byEmpMap.get(key) || { name: key, withPay: 0, withoutPay: 0 };
      be.withPay += t.withPayDays;
      be.withoutPay += t.withoutPayDays;
      byEmpMap.set(key, be);
    }
    const byType = Array.from(byTypeMap.entries()).map(([type, v]) => ({
      type,
      ...v,
    }));
    const topEmployeesByDays = Array.from(byEmpMap.values())
      .map((v) => ({
        name: v.name,
        totalDays: v.withPay + v.withoutPay,
        withPay: v.withPay,
        withoutPay: v.withoutPay,
      }))
      .sort((a, b) => b.totalDays - a.totalDays)
      .slice(0, 20);

    return { totals, byType, topEmployeesByDays };
  })();

  return {
    transactions,
    summary,
    analytics,
    error,
    isUploading,
    uploadTransactions,
    uploadSummary,
    uploadWorkbook,
    workbookPreview,
    clear,
  };
}
