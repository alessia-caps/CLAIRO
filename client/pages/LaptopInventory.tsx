import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Laptop as LaptopIcon,
  Upload,
  Search,
  Wrench,
  CalendarClock,
  Users,
  AlertCircle,
  Headphones,
  Mouse,
  Cpu,
  Layers,
  RefreshCcw,
} from "lucide-react";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

// Dev-only: suppress Recharts defaultProps warnings (library issue)
if (typeof window !== "undefined" && import.meta && (import.meta as any).env && (import.meta as any).env.DEV) {
  const originalError = console.error;
  // @ts-expect-error override
  console.error = (...args: any[]) => {
    const joined = args.map((a) => (typeof a === "string" ? a : String(a))).join(" ");
    if (
      joined.includes("Support for defaultProps will be removed from function components") &&
      (joined.includes("XAxis") || joined.includes("YAxis"))
    ) {
      return;
    }
    originalError(...args);
  };
}

// Types
type NullableDate = Date | null;

type Laptop = {
  assetTag: string;
  serial?: string;
  brand: string;
  model: string;
  department: string;
  employee?: string;
  status: string;
  purchaseDate: NullableDate;
  ownershipDate?: NullableDate;
  deploymentDate?: NullableDate;
  ageYears: number;
  cyod: boolean;
  notes?: string;
  replacementScheduled?: boolean;
};

type Issue = {
  assetTag?: string;
  model?: string;
  serial?: string;
  issueType: string;
  status: string;
  reportedDate: NullableDate;
};

type Incoming = {
  assetTag?: string;
  brand?: string;
  model?: string;
  expectedDate: NullableDate;
  purpose: string; // New Hire | Replacement | Spare
  employee?: string;
};

type Cyod = {
  employee: string;
  brand?: string;
  deviceType?: string; // MacBook, ThinkPad, etc
  model?: string;
  status?: string; // Deployed | Returned
  cost?: number;
};

type Peripheral = {
  item: string; // Mouse | Headset | Other
  quantity: number;
  available: number;
};

// Helpers
const tryParseDate = (val: any): NullableDate => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    const excelEpoch = new Date(1900, 0, 1);
    return new Date(excelEpoch.getTime() + (val - 1) * 86400000);
  }
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
};

const fullYearsBetween = (from: NullableDate, to: Date = new Date()) => {
  if (!from) return 0;
  let years = to.getFullYear() - from.getFullYear();
  const beforeAnniversary =
    to.getMonth() < from.getMonth() ||
    (to.getMonth() === from.getMonth() && to.getDate() < from.getDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
};

const normalizeKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const getFirstVal = (row: any, keys: string[], fallback = ""): any => {
  if (!row || typeof row !== "object") return fallback;
  // 1) exact
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  const rowKeys = Object.keys(row);
  // 2) case-insensitive
  for (const k of keys) {
    const idx = rowKeys.find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (idx && row[idx] !== undefined && row[idx] !== null && row[idx] !== "") return row[idx];
  }
  // 3) normalized (remove spaces/symbols)
  const normMap = new Map<string, string>();
  rowKeys.forEach((rk) => normMap.set(normalizeKey(rk), rk));
  for (const k of keys) {
    const nk = normalizeKey(k);
    const match = normMap.get(nk);
    if (match && row[match] !== undefined && row[match] !== null && row[match] !== "") return row[match];
  }
  return fallback;
};

const normalizeStr = (v: any) => String(v || "").trim();

export default function LaptopInventory() {
  useEffect(() => {
    if (typeof window !== "undefined" && import.meta && (import.meta as any).env && (import.meta as any).env.DEV) {
      const originalError = console.error;
      console.error = (...args: any[]) => {
        const msg = typeof args[0] === "string" ? args[0] : "";
        const joined = args.map(String).join(" ");
        const isRechartsDefaultPropsWarning =
          msg.includes("Support for defaultProps will be removed from function components") &&
          (joined.includes("XAxis") || joined.includes("YAxis"));
        if (isRechartsDefaultPropsWarning) return;
        originalError(...args);
      };
      return () => {
        console.error = originalError;
      };
    }
  }, []);
  // Data state
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [cyod, setCyod] = useState<Cyod[]>([]);
  const [peripherals, setPeripherals] = useState<Peripheral[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [problemOnly, setProblemOnly] = useState(false);
  // File upload
  const onFileUpload = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheets: Record<string, any[]> = {};
    workbook.SheetNames.forEach((name) => {
      const ws = workbook.Sheets[name];
      if (ws) sheets[name] = XLSX.utils.sheet_to_json(ws);
    });

    const getSheet = (names: string[]) => {
      for (const n of names) if (sheets[n]) return sheets[n];
      const lower = Object.fromEntries(
        Object.keys(sheets).map((k) => [k.toLowerCase(), k]),
      );
      for (const n of names) {
        const key = lower[n.toLowerCase()];
        if (key) return sheets[key];
      }
      return [] as any[];
    };

    const keysOf = (rows: any[]) =>
      rows && rows.length ? Object.keys(rows[0]).map((k) => k.toLowerCase()) : [];

    const scoreSheet = (rows: any[], wanted: string[]) => {
      const keys = keysOf(rows);
      return wanted.reduce((s, w) => (keys.some((k) => k.includes(w)) ? s + 1 : s), 0);
    };

    const detectBy = (scoreFn: (rows: any[]) => number) => {
      let best: any[] = [];
      let bestScore = 0;
      for (const name of Object.keys(sheets)) {
        const rows = sheets[name];
        const sc = scoreFn(rows);
        if (sc > bestScore) {
          bestScore = sc;
          best = rows;
        }
      }
      return bestScore > 0 ? best : ([] as any[]);
    };

    let laptopsSheet = getSheet([
      "bneXt Laptop Inventory",
      "Laptop Inventory",
      "Laptops",
      "Assets",
      "Computers",
      "Sheet1",
    ]);
    if (!laptopsSheet.length) {
      laptopsSheet = detectBy((rows) =>
        scoreSheet(rows, [
          "asset code", "invoice date", "custodian", "brand", "model", "vertical", "serial num", "tag", "maintenance history"
        ]),
      );
    }

    let issuesSheet = getSheet(["Laptops With Issues", "Issues", "Repairs", "Maintenance"]);
    if (!issuesSheet.length) {
      issuesSheet = detectBy((rows) =>
        scoreSheet(rows, ["issue", "problem", "category"]) + scoreSheet(rows, ["status"]) + scoreSheet(rows, ["reported", "date"]) + scoreSheet(rows, ["asset", "model"]),
      );
    }

    let incomingSheet = getSheet([
      "Incoming",
      "New Arrivals",
      "Pipeline",
      "Incoming Equipment",
    ]);
    if (!incomingSheet.length) {
      incomingSheet = detectBy((rows) =>
        scoreSheet(rows, ["expected", "eta", "arrival"]) + scoreSheet(rows, ["purpose", "reason", "type"]) + scoreSheet(rows, ["employee"]) + scoreSheet(rows, ["brand", "model"]),
      );
    }

    let cyodSheet = getSheet([
      "CYOD",
      "Choose Your Own Device",
      "BYOD",
      "Employee Choice",
    ]);
    if (!cyodSheet.length) {
      cyodSheet = detectBy((rows) =>
        scoreSheet(rows, ["cyod", "employee owned", "ownership"]) + scoreSheet(rows, ["device type", "type"]) + scoreSheet(rows, ["status"]) + scoreSheet(rows, ["cost", "price"]),
      );
    }

    let peripheralsSheet = getSheet([
      "Mouse & Headset",
      "Mouse and Headset",
      "Peripherals",
      "Accessories",
    ]);
    if (!peripheralsSheet.length) {
      peripheralsSheet = detectBy((rows) =>
        scoreSheet(rows, ["item", "type"]) + scoreSheet(rows, ["quantity", "qty"]) + scoreSheet(rows, ["available", "in stock"]) + scoreSheet(rows, ["mouse"]) + scoreSheet(rows, ["headset"]),
      );
    }

    const parsedLaptops: Laptop[] = laptopsSheet
      .filter((row: any) => {
        // Filter out empty rows and header rows
        const assetCode = String(row["ASSET CODE"] || "").trim();
        return assetCode && assetCode !== "ASSET CODE" && !assetCode.includes("#REF!");
      })
      .map((row: any) => {
        console.log("Processing row:", row);

        const purchaseDate = tryParseDate(row["INVOICE DATE"]);
        const deploymentDate = tryParseDate(row["ASSET DEPLOYMNT"] || row["EMP DATE"]);

        let employee = String(row["CUSTODIAN"] || "").trim();
        // Handle various "no custodian" formats from your data
        if (!employee || /^no custodian/i.test(employee) || /^0$/i.test(employee) ||
            /^#ref!?$/i.test(employee) || /^dead unit/i.test(employee) ||
            /^defective/i.test(employee) || employee === "CH" ||
            /^marketing$/i.test(employee) || employee === "RC") {
          employee = "";
        }

        const dept = String(row["VERTICAL"] || "0").trim();
        const realDept = dept === "0" ? "Unknown" : dept;

        // Parse TAG field to determine status
        const tagText = String(row["TAG"] || "").toLowerCase();
        const maintenanceHistory = String(row["MAINTENANCE HISTORY"] || "");

        let statusRaw = "";
        if (/spare\s*unit|spare|common area/.test(tagText)) {
          statusRaw = "Spare";
        } else if (/deployed?\s*unit/.test(tagText)) {
          statusRaw = "Active";
        } else if (/cyod|change ownership to employee|sold/.test(tagText)) {
          statusRaw = employee ? "Active" : "Spare";
        } else if (/eol|beyond\s*repair|under repair|for repair/.test(tagText)) {
          statusRaw = "Issues";
        } else if (/test eqpt|borrowed/.test(tagText)) {
          statusRaw = "Spare";
        } else {
          // Default logic based on employee assignment
          statusRaw = employee ? "Active" : "Spare";
        }

        // Check if it's CYOD
        const cyodFlag = /cyod|change ownership to employee|sold/.test(tagText);

        // Parse age from LAPTOP AGE column
        const laptopAgeStr = String(row["LAPTOP AGE"] || "");
        const ageMatch = laptopAgeStr.match(/(\d+\.?\d*)/);
        const ageYears = ageMatch ? Math.floor(parseFloat(ageMatch[1])) : fullYearsBetween(purchaseDate);

        const laptop = {
          assetTag: String(row["ASSET CODE"] || "").trim(),
          serial: String(row["SERIAL NUM"] || "").trim(),
          brand: String(row["BRAND"] || "Unknown").trim(),
          model: String(row["MODEL"] || "Unknown").trim(),
          department: realDept,
          employee: employee || undefined,
          status: statusRaw,
          purchaseDate,
          ownershipDate: null,
          deploymentDate,
          ageYears,
          cyod: cyodFlag,
          notes: maintenanceHistory,
          replacementScheduled: /replace/.test(tagText),
        };

        console.log("Processed laptop:", laptop);
        return laptop;
      });

    let parsedIssues: Issue[] = [];

    if (issuesSheet.length > 0) {
      // If we have a separate issues sheet, parse it
      parsedIssues = issuesSheet.map((row: any) => ({
        assetTag: normalizeStr(getFirstVal(row, ["ASSET CODE", "Asset Tag", "Asset", "Code", "ID"], "")),
        model: normalizeStr(getFirstVal(row, ["MODEL", "Model"], "")),
        serial: normalizeStr(getFirstVal(row, ["SERIAL NUM", "Serial Number", "Serial", "SN"], "")),
        issueType: normalizeStr(getFirstVal(row, ["ISSUE (BNEXT)", "Issue Type", "Problem", "Category", "MAINTENANCE HISTORY"], "Unknown")),
        status: normalizeStr(getFirstVal(row, ["TAG", "TYPE", "Status", "State"], "In Repair")),
        reportedDate: tryParseDate(getFirstVal(row, ["DATE REPORTED ISSUE (BNEXT)", "Reported Date", "Date", "Opened"], null)),
      }));
    } else {
      // Extract issues from main laptop data based on status and maintenance history
      parsedIssues = laptopsSheet
        .filter((row: any) => {
          const tag = normalizeStr(getFirstVal(row, ["TAG"], "")).toLowerCase();
          const maintenance = normalizeStr(getFirstVal(row, ["MAINTENANCE HISTORY"], "")).toLowerCase();
          return /eol|beyond repair|dead unit|under repair|defective|for repair|nexus|broken|battery|keyboard|screen|lcd|overheating/.test(tag + " " + maintenance);
        })
        .map((row: any) => {
          const maintenance = normalizeStr(getFirstVal(row, ["MAINTENANCE HISTORY"], ""));
          let issueType = "Hardware Issue";

          // Extract specific issue types from maintenance history
          if (/battery|charging/.test(maintenance.toLowerCase())) issueType = "Battery Issue";
          else if (/keyboard|key/.test(maintenance.toLowerCase())) issueType = "Keyboard Issue";
          else if (/screen|lcd|display/.test(maintenance.toLowerCase())) issueType = "Display Issue";
          else if (/overheating|shutdown|fan/.test(maintenance.toLowerCase())) issueType = "Thermal Issue";
          else if (/hard.?drive|hdd|ssd/.test(maintenance.toLowerCase())) issueType = "Storage Issue";
          else if (/beyond repair|eol/.test(maintenance.toLowerCase())) issueType = "End of Life";

          return {
            assetTag: normalizeStr(getFirstVal(row, ["ASSET CODE"], "")),
            model: normalizeStr(getFirstVal(row, ["MODEL"], "")),
            serial: normalizeStr(getFirstVal(row, ["SERIAL NUM"], "")),
            issueType,
            status: /beyond repair|eol|dead/.test(maintenance.toLowerCase()) ? "Beyond Repair" : "Under Repair",
            reportedDate: null,
          };
        });
    }

    let parsedIncoming: Incoming[] = [];

    if (incomingSheet.length > 0) {
      // If we have a separate incoming sheet, parse it
      parsedIncoming = incomingSheet.map((row: any) => {
        const comments = normalizeStr(getFirstVal(row, ["COMMENTS", "Comments", "Notes"], ""));
        const model = normalizeStr(getFirstVal(row, ["MODEL", "Model"], ""));
        const brand = normalizeStr(getFirstVal(row, ["BRAND", "Brand", "Make"], ""));
        const startDate = tryParseDate(getFirstVal(row, ["NEW HIRE START DATE"], null));
        const invoiceDate = tryParseDate(getFirstVal(row, ["INVOICE DATE"], null));
        let purpose = "Spare";
        if (/new\s*hire/i.test(comments) || startDate) purpose = "New Hire";
        else if (/replace/i.test(comments)) purpose = "Replacement";
        else if (/purchase/i.test(comments)) purpose = "Spare";
        return {
          assetTag: normalizeStr(getFirstVal(row, ["ASSET CODE", "Asset", "ID"], "")),
          brand,
          model: model || brand,
          expectedDate: startDate || invoiceDate,
          purpose,
          employee: normalizeStr(getFirstVal(row, ["Employee", "Name"], "")) || undefined,
        } as Incoming;
      });
    } else {
      // For this dataset, we can look for future deployment dates or recent purchases without assignments
      const today = new Date();
      const recentThreshold = new Date();
      recentThreshold.setMonth(recentThreshold.getMonth() - 1); // Last month

      parsedIncoming = laptopsSheet
        .filter((row: any) => {
          const invoiceDate = tryParseDate(getFirstVal(row, ["INVOICE DATE"], null));
          const deploymentDate = tryParseDate(getFirstVal(row, ["ASSET DEPLOYMNT"], null));
          const custodian = normalizeStr(getFirstVal(row, ["CUSTODIAN"], ""));

          // Recent purchases without custodian or future deployment dates
          const isRecent = invoiceDate && invoiceDate > recentThreshold;
          const hasNoCustodian = !custodian || /no custodian/i.test(custodian);
          const futureDeployment = deploymentDate && deploymentDate > today;

          return (isRecent && hasNoCustodian) || futureDeployment;
        })
        .map((row: any) => ({
          assetTag: normalizeStr(getFirstVal(row, ["ASSET CODE"], "")),
          brand: normalizeStr(getFirstVal(row, ["BRAND"], "")),
          model: normalizeStr(getFirstVal(row, ["MODEL"], "")),
          expectedDate: tryParseDate(getFirstVal(row, ["ASSET DEPLOYMNT"], null)) ||
                       tryParseDate(getFirstVal(row, ["INVOICE DATE"], null)),
          purpose: "Spare",
          employee: undefined,
        }));
    }

    let parsedCyod: Cyod[] = [];

    if (cyodSheet.length > 0) {
      // If we have a separate CYOD sheet, parse it
      parsedCyod = cyodSheet.map((row: any) => ({
        employee: normalizeStr(getFirstVal(row, ["Employee", "Name"], "")),
        brand: normalizeStr(getFirstVal(row, ["Brand", "Make"], "")),
        deviceType: normalizeStr(getFirstVal(row, ["Device Type", "Type"], "")),
        model: normalizeStr(getFirstVal(row, ["Model"], "")),
        status: normalizeStr(getFirstVal(row, ["Status", "State"], "")),
        cost: Number(getFirstVal(row, ["Cost", "Price"], "")) || undefined,
      }));
    } else {
      // Extract CYOD from main laptop data
      parsedCyod = laptopsSheet
        .filter((row: any) => {
          const tag = normalizeStr(getFirstVal(row, ["TAG"], "")).toLowerCase();
          return /cyod|change ownership to employee|sold/.test(tag);
        })
        .map((row: any) => ({
          employee: normalizeStr(getFirstVal(row, ["CUSTODIAN"], "")),
          brand: normalizeStr(getFirstVal(row, ["BRAND"], "")),
          deviceType: normalizeStr(getFirstVal(row, ["MODEL"], "")),
          model: normalizeStr(getFirstVal(row, ["MODEL"], "")),
          status: /sold/.test(normalizeStr(getFirstVal(row, ["TAG"], "")).toLowerCase()) ? "Sold" : "Deployed",
          cost: undefined,
        }));
    }

    let parsedPeripherals: Peripheral[] = [];

    if (peripheralsSheet.length > 0) {
      parsedPeripherals = peripheralsSheet.map((row: any) => ({
        item: normalizeStr(getFirstVal(row, ["Item", "Type"], "")),
        quantity: Number(getFirstVal(row, ["Quantity", "Qty"], 0)) || 0,
        available: Number(getFirstVal(row, ["Available", "In Stock"], 0)) || 0,
      }));

      const extra: Peripheral[] = [];
      peripheralsSheet.forEach((row: any) => {
        const entries = Object.entries(row);
        entries.forEach(([k, v]) => {
          const label = String(k).trim();
          if (label && (typeof v === "number" || (typeof v === "string" && /^\d+(?:\.\d+)?$/.test(v)))) {
            const num = Number(v);
            if (!isNaN(num)) extra.push({ item: label, quantity: num, available: num });
          }
        });
        // Also support value-as-label when key is generic
        if (entries.length === 2) {
          const [a, b] = entries;
          const sA = typeof a[1] === "string" ? a[1].trim() : "";
          const sB = typeof b[1] === "string" ? b[1].trim() : "";
          const nA = typeof a[1] === "number" ? a[1] : Number(sA);
          const nB = typeof b[1] === "number" ? b[1] : Number(sB);
          if (sA && !isNaN(nB)) extra.push({ item: sA, quantity: Number(nB), available: Number(nB) });
          if (sB && !isNaN(nA)) extra.push({ item: sB, quantity: Number(nA), available: Number(nA) });
        }
      });
      const combined = [...parsedPeripherals, ...extra].filter((p) => p.item);
      if (combined.length) parsedPeripherals = combined;
    } else {
      // No peripherals data available, set default empty array
      parsedPeripherals = [];
    }

    // Cross-mark laptops with active issues or incoming
    const issueByAsset = new Map(parsedIssues.filter((i) => i.assetTag).map((i) => [i.assetTag!, i]));
    const issueBySerial = new Map(parsedIssues.filter((i) => i.serial).map((i) => [i.serial!, i]));
    const issueByModel = new Map(parsedIssues.filter((i) => i.model).map((i) => [i.model!, i]));
    const incomingByAsset = new Map(parsedIncoming.filter((i) => i.assetTag).map((i) => [i.assetTag!, i]));

    const mergedLaptops = parsedLaptops.map((l) => {
      let status = l.status;
      let issueMatch: Issue | undefined;
      if (l.assetTag && issueByAsset.has(l.assetTag)) issueMatch = issueByAsset.get(l.assetTag);
      if (!issueMatch && l.serial && issueBySerial.has(l.serial)) issueMatch = issueBySerial.get(l.serial);
      if (!issueMatch && l.model && issueByModel.has(l.model)) issueMatch = issueByModel.get(l.model);
      if (issueMatch) {
        const blob = [issueMatch.status, issueMatch.issueType].join(" ").toLowerCase();
        const resolved = /repaired|fixed|redeployed/.test(blob);
        if (!resolved) status = "Issues";
      }
      if (incomingByAsset.has(l.assetTag)) status = "Incoming";
      return { ...l, status };
    });

    console.log("Parsed data summary:");
    console.log(`- Laptops: ${mergedLaptops.length}`);
    console.log(`- Issues: ${parsedIssues.length}`);
    console.log(`- Incoming: ${parsedIncoming.length}`);
    console.log(`- CYOD: ${parsedCyod.length}`);
    console.log(`- Peripherals: ${parsedPeripherals.length}`);

    setLaptops(mergedLaptops);
    setIssues(parsedIssues);
    setIncoming(parsedIncoming);
    setCyod(parsedCyod);
    setPeripherals(parsedPeripherals);
  };

  // Derived data
  const departments = useMemo(() => {
    const set = new Set<string>(laptops.map((l) => l.department || "Unknown"));
    return ["all", ...Array.from(set).sort()];
  }, [laptops]);

  const filteredLaptops = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return laptops.filter((l) => {
      if (deptFilter !== "all" && (l.department || "Unknown") !== deptFilter)
        return false;
      if (
        q &&
        !(
          l.assetTag.toLowerCase().includes(q) ||
          (l.employee || "").toLowerCase().includes(q) ||
          l.model.toLowerCase().includes(q) ||
          l.brand.toLowerCase().includes(q)
        )
      )
        return false;
      if (problemOnly && l.status.toLowerCase() !== "issues") return false;
      return true;
    });
  }, [laptops, searchQuery, deptFilter, problemOnly]);

  const summary = useMemo(() => {
    const active = laptops.filter((l) => l.status.toLowerCase() === "active" || (!!l.employee && l.status.toLowerCase() !== "spare" && l.status.toLowerCase() !== "issues")).length;
    const spare = laptops.filter((l) => l.status.toLowerCase() === "spare").length;
    const issueCount = laptops.filter((l) => l.status.toLowerCase() === "issues").length;
    const incomingCount = laptops.filter((l) => l.status.toLowerCase() === "incoming").length || incoming.length;

    const mouseCount = peripherals
      .filter((p) => p.item.toLowerCase().includes("mouse"))
      .reduce((s, p) => s + p.available, 0);
    const headsetCount = peripherals
      .filter((p) => p.item.toLowerCase().includes("headset"))
      .reduce((s, p) => s + p.available, 0);

    const cyodCount = cyod.filter((c) => (c.status || "").toLowerCase() !== "returned").length ||
      laptops.filter((l) => l.cyod).length;

    const over7yrs = laptops.filter((l) => l.ageYears >= 7).length;
    const newHireWaiting = incoming.filter((i) => /hire|new\s*hire|onboard/i.test(i.purpose)).length;

    const spareLow = spare < 5; // threshold

    return {
      active,
      spare,
      issueCount,
      incomingCount,
      mouseCount,
      headsetCount,
      cyodCount,
      over7yrs,
      newHireWaiting,
      spareLow,
    };
  }, [laptops, incoming, peripherals, cyod]);

  // Charts data
  const ageData = useMemo(() => {
    const buckets = new Map<string, number>();
    const bump = (k: string) => buckets.set(k, (buckets.get(k) || 0) + 1);
    laptops.forEach((l) => {
      const y = l.ageYears;
      if (y <= 1) bump("0-1y");
      else if (y <= 3) bump("2-3y");
      else if (y <= 5) bump("4-5y");
      else if (y <= 7) bump("6-7y");
      else bump(">7y");
    });
    return Array.from(buckets.entries()).map(([name, value]) => ({ name, value }));
  }, [laptops]);

  const brandData = useMemo(() => {
    const cmap = new Map<string, number>();
    laptops.forEach((l) => cmap.set(l.brand || "Unknown", (cmap.get(l.brand || "Unknown") || 0) + 1));
    return Array.from(cmap.entries()).map(([name, value]) => ({ name, value }));
  }, [laptops]);

  const deptData = useMemo(() => {
    const dmap = new Map<string, number>();
    laptops.forEach((l) => dmap.set(l.department || "Unknown", (dmap.get(l.department || "Unknown") || 0) + 1));
    return Array.from(dmap.entries()).map(([name, value]) => ({ name, value }));
  }, [laptops]);

  const fiveYearCount = useMemo(() => {
    const today = new Date();
    return laptops.filter((l) => {
      const base = l.purchaseDate;
      const yrs = fullYearsBetween(base, today);
      return (l.status.toLowerCase() === "active" ? yrs >= 5 : yrs >= 5);
    }).length;
  }, [laptops]);

  const problemTypeData = useMemo(() => {
    const map = new Map<string, number>();
    issues.forEach((i) => map.set(i.issueType || "Unknown", (map.get(i.issueType || "Unknown") || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [issues]);

  const repairStatusData = useMemo(() => {
    const map = new Map<string, number>();
    issues.forEach((i) => map.set(i.status || "Unknown", (map.get(i.status || "Unknown") || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [issues]);

  const problemModelsData = useMemo(() => {
    const map = new Map<string, number>();
    issues.forEach((i) => {
      const key = i.model || i.assetTag || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [issues]);

  const incomingByMonth = useMemo(() => {
    const map = new Map<string, number>();
    incoming.forEach((i) => {
      const d = i.expectedDate ? new Date(i.expectedDate) : null;
      const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "TBD";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [incoming]);

  const incomingNewHire = useMemo(
    () => incoming.filter((i) => i.purpose.toLowerCase().includes("hire")),
    [incoming],
  );

  const incomingReplacement = useMemo(
    () => incoming.filter((i) => i.purpose.toLowerCase().includes("replace")),
    [incoming],
  );

  const cyodTypeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    const fallbackFromBrand = (b?: string) => {
      const bl = (b || "").toLowerCase();
      if (bl.includes("apple") || bl.includes("mac")) return "MacBook";
      if (bl.includes("lenovo") || bl.includes("think")) return "ThinkPad";
      if (bl.includes("hp")) return "HP";
      return "Other";
    };
    if (cyod.length) {
      cyod.forEach((c) => {
        const key = c.deviceType || fallbackFromBrand(c.brand);
        map.set(key, (map.get(key) || 0) + 1);
      });
    } else {
      laptops
        .filter((l) => l.cyod)
        .forEach((l) => {
          const key = fallbackFromBrand(l.brand);
          map.set(key, (map.get(key) || 0) + 1);
        });
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [cyod, laptops]);

  const cyodUsage = useMemo(() => {
    let deployed = 0;
    let returned = 0;
    if (cyod.length) {
      cyod.forEach((c) => {
        const s = (c.status || "").toLowerCase();
        if (s.includes("return")) returned++;
        else deployed++;
      });
    } else {
      deployed = laptops.filter((l) => l.cyod).length;
    }
    return [
      { name: "Deployed", value: deployed },
      { name: "Returned", value: returned },
    ];
  }, [cyod, laptops]);

  const peripheralsSummary = useMemo(() => {
    const total = peripherals.reduce((s, p) => s + (p.quantity || 0), 0);
    const available = peripherals.reduce((s, p) => s + (p.available || 0), 0);
    const mouse = peripherals
      .filter((p) => p.item.toLowerCase().includes("mouse"))
      .reduce((s, p) => s + (p.available || 0), 0);
    const headset = peripherals
      .filter((p) => p.item.toLowerCase().includes("headset"))
      .reduce((s, p) => s + (p.available || 0), 0);
    const shortages: string[] = [];
    if (mouse < 5) shortages.push("Mouse low");
    if (headset < 5) shortages.push("Headset low");
    return { total, available, mouse, headset, shortages };
  }, [peripherals]);

  // Employee grouping
  const employees = useMemo(() => {
    const map = new Map<string, Laptop[]>();
    laptops.forEach((l) => {
      if (!l.employee) return;
      const key = l.employee;
      const arr = map.get(key) || [];
      arr.push(l);
      map.set(key, arr);
    });
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
  }, [laptops]);

  const multiAssetEmployees = useMemo(
    () => employees.filter((e) => e.items.length > 1),
    [employees],
  );

  // Quick actions
  const deployAsset = (asset: Laptop) => {
    const name = prompt("Assign to employee (First Last):", "");
    if (!name) return;
    setLaptops((prev) =>
      prev.map((l) =>
        l.assetTag === asset.assetTag
          ? { ...l, status: "Active", employee: name }
          : l,
      ),
    );
  };

  const returnAsset = (asset: Laptop) => {
    setLaptops((prev) =>
      prev.map((l) =>
        l.assetTag === asset.assetTag
          ? { ...l, status: "Spare", employee: undefined }
          : l,
      ),
    );
  };

  const reportIssue = (asset: Laptop) => {
    const issueType = prompt("Issue type (e.g., Battery, Touchpad):", "Issue");
    if (!issueType) return;
    setIssues((prev) => [
      ...prev,
      {
        assetTag: asset.assetTag,
        model: asset.model,
        issueType,
        status: "In Repair",
        reportedDate: new Date(),
      },
    ]);
    setLaptops((prev) =>
      prev.map((l) => (l.assetTag === asset.assetTag ? { ...l, status: "Issues" } : l)),
    );
  };

  const scheduleReplacement = (asset: Laptop) => {
    setLaptops((prev) =>
      prev.map((l) =>
        l.assetTag === asset.assetTag ? { ...l, replacementScheduled: true } : l,
      ),
    );
  };

  const assignToNewHire = (asset: Laptop) => {
    const candidate = incomingNewHire[0];
    const name = prompt(
      "Assign to new hire (enter name or leave to use first in queue):",
      candidate?.employee || "",
    );
    if (!name) return;
    setLaptops((prev) =>
      prev.map((l) =>
        l.assetTag === asset.assetTag ? { ...l, status: "Active", employee: name } : l,
      ),
    );
  };

  // Chart config
  const donutConfig: ChartConfig = {
    value: { label: "Count" },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laptop Inventory</h1>
          <p className="text-muted-foreground">Simple dashboard to track assets, issues, incoming, and employees</p>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="file" className="sr-only">Upload Excel</Label>
          <Input
            id="file"
            type="file"
            accept=".xlsx,.xls"
            className="max-w-xs"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileUpload(f);
            }}
          />
          <Button variant="outline" onClick={() => { document.getElementById("file")?.click(); }}>
            <Upload className="h-4 w-4 mr-2" /> Upload
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Laptops</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{laptops.length}</div>
            <p className="text-xs text-muted-foreground">In inventory</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <LaptopIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.active}</div>
            <p className="text-xs text-muted-foreground">Assigned to employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spare</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.spare}</div>
            <p className="text-xs text-muted-foreground">Available for assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.issueCount}</div>
            <p className="text-xs text-muted-foreground">Reported or in repair</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>Old laptops (7+ years)</span><Badge variant={summary.over7yrs ? "destructive" : "secondary"}>{summary.over7yrs}</Badge></div>
            <div className="flex items-center justify-between"><span>Assets with issues</span><Badge variant={summary.issueCount ? "destructive" : "secondary"}>{summary.issueCount}</Badge></div>
            <div className="flex items-center justify-between"><span>Low spare inventory</span><Badge variant={summary.spareLow ? "destructive" : "secondary"}>{summary.spareLow ? "Yes" : "No"}</Badge></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Employee Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>Total employees</span><Badge variant="secondary">{employees.length}</Badge></div>
            <div className="flex items-center justify-between"><span>Multiple laptops</span><Badge variant={multiAssetEmployees.length ? "default" : "secondary"}>{multiAssetEmployees.length}</Badge></div>
            <div className="flex items-center justify-between"><span>CYOD users</span><Badge variant="secondary">{summary.cyodCount}</Badge></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Cpu className="h-4 w-4" /> Age Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>5+ years old</span><Badge variant={fiveYearCount ? "default" : "secondary"}>{fiveYearCount}</Badge></div>
            <div className="flex items-center justify-between"><span>7+ years old</span><Badge variant={summary.over7yrs ? "destructive" : "secondary"}>{summary.over7yrs}</Badge></div>
            <div className="flex items-center justify-between"><span>Need replacement</span><Badge variant="destructive">{summary.over7yrs}</Badge></div>
          </CardContent>
        </Card>
      </div>

      {/* Main Views */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assets">Asset List</TabsTrigger>
          <TabsTrigger value="employees">Employee List</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2"><Cpu className="h-4 w-4"/> Laptop Age Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {ageData.length ? (
                  <ChartContainer config={{}}>
                    <BarChart data={ageData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} width={24} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">Upload data to see chart</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Brand Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {brandData.length ? (
                  <ChartContainer config={donutConfig}>
                    <PieChart>
                      <Pie data={brandData} dataKey="value" nameKey="name" innerRadius={40} fill="hsl(var(--accent))" />
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Department Overview</CardTitle>
              </CardHeader>
              <CardContent>
                {deptData.length ? (
                  <ChartContainer config={{}}>
                    <BarChart data={deptData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-15} height={50} textAnchor="end" />
                      <YAxis allowDecimals={false} width={24} />
                      <Bar dataKey="value" fill="hsl(var(--secondary-foreground))" radius={4} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Row */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{fiveYearCount}</div>
                <p className="text-xs text-muted-foreground">Assets 5+ years old</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{summary.cyodCount}</div>
                <p className="text-xs text-muted-foreground">CYOD devices</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{issues.length}</div>
                <p className="text-xs text-muted-foreground">Issues reported</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{employees.length}</div>
                <p className="text-xs text-muted-foreground">Employees with laptops</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employee List */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Search className="h-4 w-4"/> Search & Filter</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Search employee or asset..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d === "all" ? "All Departments" : d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button variant={problemOnly?"destructive":"outline"} onClick={() => setProblemOnly((v) => !v)}>
                  <AlertCircle className="h-4 w-4 mr-2"/> {problemOnly ? "Showing Problems" : "Show Problems"}
                </Button>
                <Button variant="ghost" onClick={()=>{setSearchQuery(""); setDeptFilter("all"); setProblemOnly(false);}}>
                  <RefreshCcw className="h-4 w-4 mr-2"/> Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employees and Equipment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Assets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No employees yet</TableCell></TableRow>
                    )}
                    {employees.map(({ name, items }, empIdx) => {
                      const matchItems = items.filter((l)=> filteredLaptops.find(fl => fl.assetTag === l.assetTag));
                      if (!matchItems.length) return null;
                      return (
                        <TableRow key={`${name || 'employee'}-${empIdx}`}>
                          <TableCell className="font-medium">
                            {name}
                            {matchItems.length > 1 && (
                              <Badge className="ml-2" variant="outline">{matchItems.length} assets</Badge>
                            )}
                          </TableCell>
                          <TableCell>{matchItems[0]?.department || "Unknown"}</TableCell>
                          <TableCell className="space-x-2">
                            {matchItems.map((l, i) => (
                              <Badge key={`${l.assetTag || l.serial || l.model || 'asset'}-${i}`} variant={l.status.toLowerCase()==="issues"?"destructive":"secondary"}>
                                {l.assetTag || l.model}
                              </Badge>
                            ))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asset List */}
        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Brand/Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Dept</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLaptops.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No assets match</TableCell></TableRow>
                    )}
                    {filteredLaptops.map((l, idx) => (
                      <TableRow key={`${l.assetTag || l.serial || l.model || 'row'}-${idx}`} className={l.status.toLowerCase()==="issues"?"bg-destructive/5":""}>
                        <TableCell className="font-medium">{l.assetTag || "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{l.brand}</span>
                            <span className="text-xs text-muted-foreground">{l.model}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={l.status.toLowerCase()==="issues"?"destructive": l.status.toLowerCase()==="active"?"default":"secondary"}>{l.status || "—"}</Badge>
                        </TableCell>
                        <TableCell>{l.employee || "—"}</TableCell>
                        <TableCell>{l.department || "Unknown"}</TableCell>
                        <TableCell>{l.ageYears}y</TableCell>
                        <TableCell className="space-x-1">
                          {l.cyod && <Badge variant="outline">CYOD</Badge>}
                          {l.replacementScheduled && <Badge variant="outline">Replacement</Badge>}
                          {l.ageYears >= 7 && <Badge variant="destructive">&gt;7y</Badge>}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {l.status.toLowerCase() === "spare" && (
                            <Button size="sm" onClick={() => deployAsset(l)}>Deploy</Button>
                          )}
                          {l.status.toLowerCase() === "active" && (
                            <Button size="sm" variant="secondary" onClick={() => returnAsset(l)}>Return</Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => reportIssue(l)}>Report</Button>
                          <Button size="sm" variant="ghost" onClick={() => scheduleReplacement(l)}>Replace</Button>
                          {l.status.toLowerCase() === "spare" && (
                            <Button size="sm" variant="ghost" onClick={() => assignToNewHire(l)}>Assign to New Hire</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issues */}
        <TabsContent value="issues" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Problem Types</CardTitle>
              </CardHeader>
              <CardContent>
                {problemTypeData.length ? (
                  <ChartContainer config={donutConfig}>
                    <PieChart>
                      <Pie data={problemTypeData} dataKey="value" nameKey="name" innerRadius={40} fill="hsl(var(--destructive))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No issue data</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Repair Status</CardTitle>
              </CardHeader>
              <CardContent>
                {repairStatusData.length ? (
                  <ChartContainer config={donutConfig}>
                    <PieChart>
                      <Pie data={repairStatusData} dataKey="value" nameKey="name" innerRadius={40} fill="hsl(var(--warning))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No repair data</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Problem Models</CardTitle>
              </CardHeader>
              <CardContent>
                {problemModelsData.length ? (
                  <ChartContainer config={{}}>
                    <BarChart data={problemModelsData}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-15} height={50} textAnchor="end" />
                      <YAxis allowDecimals={false} width={24} />
                      <Bar dataKey="value" fill="hsl(var(--ring))" radius={4} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No data</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Issues List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reported</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No issues</TableCell></TableRow>
                    )}
                    {issues.map((i, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{i.assetTag || "��"}</TableCell>
                        <TableCell>{i.model || "—"}</TableCell>
                        <TableCell>{i.issueType}</TableCell>
                        <TableCell><Badge variant={/fixed/i.test(i.status)?"secondary":"destructive"}>{i.status}</Badge></TableCell>
                        <TableCell>{i.reportedDate ? new Date(i.reportedDate).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incoming */}
        <TabsContent value="incoming" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">New Arrivals by Month</CardTitle>
              </CardHeader>
              <CardContent>
                {incomingByMonth.length ? (
                  <ChartContainer config={{}}>
                    <BarChart data={incomingByMonth}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} width={24} />
                      <Bar dataKey="value" fill="hsl(var(--accent))" radius={4} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No incoming data</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Replacement Pipeline</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {incomingReplacement.length === 0 ? (
                  <p className="text-muted-foreground">No replacements</p>
                ) : (
                  <ul className="list-disc ml-4">
                    {incomingReplacement.map((i, idx) => (
                      <li key={idx}>
                        {i.model || i.brand || "Laptop"} • {i.expectedDate ? new Date(i.expectedDate).toLocaleDateString() : "TBD"}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">New Hire Queue</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {incomingNewHire.length === 0 ? (
                  <p className="text-muted-foreground">No new hires waiting</p>
                ) : (
                  <ul className="list-disc ml-4">
                    {incomingNewHire.map((i, idx) => (
                      <li key={idx}>
                        {i.employee || "New hire"} • {i.model || i.brand || "Laptop"} • {i.expectedDate ? new Date(i.expectedDate).toLocaleDateString() : "TBD"}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Incoming List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Expected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incoming.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No incoming items</TableCell></TableRow>
                    )}
                    {incoming.map((i, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{i.model || i.brand || "Laptop"}</TableCell>
                        <TableCell>{i.purpose}</TableCell>
                        <TableCell>{i.employee || "—"}</TableCell>
                        <TableCell>{i.expectedDate ? new Date(i.expectedDate).toLocaleDateString() : "TBD"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CYOD */}
        <TabsContent value="cyod" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Employee Choices</CardTitle>
              </CardHeader>
              <CardContent>
                {cyodTypeBreakdown.length ? (
                  <ChartContainer config={donutConfig}>
                    <PieChart>
                      <Pie data={cyodTypeBreakdown} dataKey="value" nameKey="name" innerRadius={40} fill="hsl(var(--primary))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No CYOD data</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Usage Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                {cyodUsage.length ? (
                  <ChartContainer config={donutConfig}>
                    <PieChart>
                      <Pie data={cyodUsage} dataKey="value" nameKey="name" innerRadius={40} fill="hsl(var(--secondary))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">No usage data</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>CYOD List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(cyod.length ? cyod : laptops.filter((l)=>l.cyod).map((l)=>({employee:l.employee||"—", deviceType:l.brand, status:"Deployed", cost: undefined as number|undefined}))).map((c, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{c.employee}</TableCell>
                        <TableCell>{c.deviceType || c.brand || c.model || "Device"}</TableCell>
                        <TableCell>{c.status || "Deployed"}</TableCell>
                        <TableCell>{typeof c.cost === "number" ? `₱${c.cost.toLocaleString()}` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Empty state hint */}
      {laptops.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Upload className="h-4 w-4"/> Upload your Excel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload your bneXt laptop inventory Excel file. The system will automatically detect and parse columns like ASSET CODE, BRAND, MODEL, VERTICAL, CUSTODIAN, TAG, INVOICE DATE, and MAINTENANCE HISTORY. Issues and CYOD data will be extracted from the TAG and maintenance history fields.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
