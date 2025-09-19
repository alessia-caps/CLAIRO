import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertCircle, X } from "lucide-react";
import * as XLSX from "xlsx";

export interface CertificationRecord {
  employeeNo?: string;
  employee: string;
  department: string;
  certification: string;
  provider: string;
  type: string;
  issueDate: Date | null;
  expiryDate: Date | null;
  status: string;
  companyPaid: boolean;
  bondMonths: number;
  bondStart: Date | null;
  bondEnd: Date | null;
  remarks?: string;
  certificationId?: string;
  employmentStatus?: string;
}

interface CertificationUploadDialogProps {
  onDataUploaded: (rows: CertificationRecord[]) => void;
  trigger?: React.ReactNode;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseMaybeDate(v: any): Date | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const excelEpoch = new Date(1900, 0, 1);
    const d = new Date(excelEpoch.getTime() + (v - 1) * 86400000);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  const d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900) return d;
  // Try MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdy) {
    const mm = parseInt(mdy[1], 10) - 1;
    const dd = parseInt(mdy[2], 10);
    const yy = parseInt(mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3], 10);
    const d2 = new Date(yy, mm, dd);
    return isNaN(d2.getTime()) ? null : d2;
  }
  return null;
}

function truthyFlag(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "")
    .toLowerCase()
    .trim();
  if (!s) return false;
  return ["yes", "true", "y", "1", "paid", "company", "sponsored", "bond"].some(
    (k) => s.includes(k),
  );
}

function parseBondMonthsFromText(v: any): number {
  const s = String(v ?? "").toLowerCase();
  const m = s.match(/(\d+)\s*(month|mo|mos|months)/);
  if (m) return parseInt(m[1], 10) || 0;
  return 0;
}

export function CertificationUploadDialog({
  onDataUploaded,
  trigger,
}: CertificationUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFileUpload(f);
  };

  async function handleFileUpload(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) return;
    try {
      setIsUploading(true);
      setError(null);
      let rows: any[] = [];
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        rows = parseCSV(text);
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const combined: any[] = [];
        wb.SheetNames.forEach((name) => {
          const ws = wb.Sheets[name];
          const r = XLSX.utils.sheet_to_json(ws, { defval: "" });
          r.forEach((row: any) => combined.push({ ...row, __sheetName: name }));
        });
        rows = combined;
      }
      if (!rows.length) throw new Error("No rows found in the file.");
      const mapped = mapRows(rows);
      onDataUploaded(mapped);
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || "Failed to process file");
    } finally {
      setIsUploading(false);
    }
  }

  function parseCSV(text: string): any[] {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) =>
      h
        .replace(/^\uFEFF/, "")
        .trim()
        .replace(/"/g, ""),
    );
    return lines.slice(1).map((ln) => {
      const vals = ln.split(",").map((v) => v.trim().replace(/"/g, ""));
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = vals[i] ?? "";
      });
      return obj;
    });
  }

  function mapRows(rows: any[]): CertificationRecord[] {
    // Build header map: normalizedHeader -> originalHeader
    const headers = Object.keys(rows[0] || {});
    const normToOrig = new Map<string, string>();
    headers.forEach((h) => {
      if (h !== "__sheetName") normToOrig.set(normalizeHeader(h), h);
    });

    // Preferred header keys for each field
    const pick = (cands: string[]): string | undefined => {
      for (const c of cands) {
        if (normToOrig.has(c)) return normToOrig.get(c)!;
      }
      // try partial contains
      const found = Array.from(normToOrig.keys()).find((k) =>
        cands.some((c) => k.includes(c)),
      );
      return found ? normToOrig.get(found) : undefined;
    };

    const hEmpNo = pick([
      "employeeno",
      "employeenumber",
      "empno",
      "employeeid",
      "idnumber",
    ]);
    const hEmployee = pick(["employeename", "employee", "name", "staffname"]);
    const hDept = pick([
      "department",
      "dept",
      "gbu",
      "bugbu",
      "businessunit",
      "team",
    ]);
    const hCert = pick([
      "certification",
      "certificate",
      "credential",
      "course",
      "title",
    ]);
    const hProvider = pick([
      "provider",
      "vendor",
      "issuer",
      "authority",
      "platform",
    ]);
    const hType = pick([
      "type",
      "category",
      "track",
      "level",
      "specialization",
    ]);
    const hIssue = pick([
      "issuedate",
      "dateissued",
      "obtained",
      "dateofissue",
      "startdate",
      "datetaken",
    ]);
    const hExpiry = pick([
      "expirydate",
      "expirationdate",
      "validuntil",
      "expiry",
      "enddate",
      "expirationdate",
    ]);
    const hStatus = pick(["status", "state", "active", "result", "progress"]);
    const hCompanyPaid = pick([
      "companypaid",
      "sponsored",
      "companysponsored",
      "bond",
      "company",
      "paid",
    ]);
    const hBondMonths = pick([
      "bondmonths",
      "bonddurationmonths",
      "bondperiod",
      "months",
      "durationmonths",
    ]);
    const hBondStart = pick([
      "bondstart",
      "bondstartdate",
      "bondfrom",
      "contractstart",
    ]);
    const hBondEnd = pick([
      "bondend",
      "bondenddate",
      "bonduntil",
      "contractend",
      "bondexpiration",
    ]);
    const hRemarks = pick(["remarks", "notes", "comment"]);
    const hCertId = pick([
      "certificationidnumber",
      "certid",
      "certificationid",
      "idnumber",
    ]);

    return rows
      .map((r, idx) => {
        const sheetName = String((r as any).__sheetName || "");
        const employeeNo = String(r[hEmpNo || "Employee No."] ?? "").trim();
        const employee = String(r[hEmployee || "Name"] ?? "").trim();
        const department =
          String(r[hDept || "GBU"] ?? "Unknown").trim() || "Unknown";
        const certification = String(r[hCert || "Certification"] ?? "").trim();
        let provider = String(r[hProvider || "Provider"] ?? "").trim();
        if (!provider && sheetName) provider = sheetName.trim();
        const type = String(r[hType || "Type"] ?? "").trim();
        const issueDate = parseMaybeDate(r[hIssue || "Date Taken"]);
        const expiryDate = parseMaybeDate(r[hExpiry || "Expiration Date"]);
        const remarks = String(r[hRemarks || "Remarks"] ?? "");
        const statusRaw = String(r[hStatus || "Status"] ?? "").trim();
        const status =
          statusRaw ||
          (expiryDate && expiryDate >= new Date()
            ? "Active"
            : expiryDate
              ? "Expired"
              : "");
        const companyPaid =
          truthyFlag(r[hCompanyPaid || "Company Paid"]) ||
          !!parseMaybeDate(r[hBondEnd || "Bond Expiration"]) ||
          /company|sponsor|bond/i.test(remarks);
        const bondMonthsExplicit =
          parseInt(String(r[hBondMonths || "Bond Months"] ?? "0"), 10) || 0;
        const bondMonths =
          bondMonthsExplicit || parseBondMonthsFromText(remarks);
        const bondStart =
          parseMaybeDate(r[hBondStart || "Bond Start"]) || issueDate;
        const bondEnd =
          parseMaybeDate(r[hBondEnd || "Bond Expiration"]) ||
          (bondStart && bondMonths
            ? new Date(
                new Date(bondStart).setMonth(
                  new Date(bondStart).getMonth() + bondMonths,
                ),
              )
            : null);
        const certificationId = String(
          r[hCertId || "Certification ID Number"] ?? "",
        ).trim();
        const employmentStatus = sheetName.match(/resigned/i)
          ? "Resigned"
          : sheetName.match(/trial/i)
            ? "Trial"
            : "Active";

        return {
          employeeNo,
          employee,
          department,
          certification,
          provider,
          type,
          issueDate,
          expiryDate,
          status,
          companyPaid,
          bondMonths,
          bondStart,
          bondEnd,
          remarks,
          certificationId,
          employmentStatus,
        } as CertificationRecord;
      })
      .filter((r) => r.employee && r.certification);
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFileUpload(f);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Certifications
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary" />
            Upload Certification/Training Data (Excel/CSV)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Expected columns (auto-detected): Date Taken, Expiration Date,
              Employee No., Name, GBU (Department), Type, Certification,
              Certification ID Number, Remarks, Bond Expiration. Multi-sheet
              supported (e.g., SAP Certification Matrix, Other, Ops, Resigned,
              Trial). Provider is inferred from sheet name when missing.
            </AlertDescription>
          </Alert>

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-slate-300 hover:border-primary/50"} ${isUploading ? "pointer-events-none opacity-50" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("cert-upload")?.click()}
          >
            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-slate-400" />
              <div>
                <p className="text-sm font-medium">
                  Drop your Excel/CSV file here
                </p>
                <p className="text-xs text-slate-600">
                  Supports .xlsx, .xls, .csv
                </p>
              </div>
            </div>
          </div>

          <Input
            id="cert-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing file...</span>
                <span>Please wait</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CertificationUploadDialog;
