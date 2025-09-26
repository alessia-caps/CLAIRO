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

function toNumber(v: any): number {
  if (v == null || v === "") return 0;
  const s = String(v).replace(/[^0-9.-]/g, "");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

export function useLeaveUpload() {
  const [transactions, setTransactions] = useState<LeaveTransaction[]>([]);
  const [summary, setSummary] = useState<LeaveSummary[]>([]);
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
        dateFiled: row["DateFiled"] ? String(row["DateFiled"]) : undefined,
        dateFrom: row["DateFrom"] ? String(row["DateFrom"]) : undefined,
        dateTo: row["DateTo"] ? String(row["DateTo"]) : undefined,
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
        hireDate: row["HIRE DATE"] ? String(row["HIRE DATE"]) : undefined,
        regularizationDate: row["REGULARIZATION DATE"]
          ? String(row["REGULARIZATION DATE"])
          : undefined,
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
        all.push(...XLSX.utils.sheet_to_json(ws));
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
        all.push(...XLSX.utils.sheet_to_json(ws));
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

  const clear = () => {
    setTransactions([]);
    setSummary([]);
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
    clear,
  };
}
