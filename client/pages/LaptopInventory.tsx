import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Laptop, CheckCircle, AlertTriangle, Package, PieChart, RefreshCw, Clock, Upload, Filter } from "lucide-react";
import { PieChart as RePieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const ISSUE_GROUPS = [
  { key: "Touchpad/Battery Issues", keywords: ["touchpad", "battery"] },
  { key: "Motherboard/Startup Issues", keywords: ["motherboard", "start", "boot"] },
  { key: "OS/Windows Issues", keywords: ["windows", "os", "reinstallation", "restore"] },
  { key: "General Repair", keywords: ["repair", "checked in", "defective"] },
  { key: "Other", keywords: [] }
];

function groupIssue(issue: string) {
  const lower = issue.toLowerCase();
  for (const group of ISSUE_GROUPS) {
    if (group.key === "Other") continue;
    if (group.keywords.some(k => lower.includes(k))) return group.key;
  }
  return "Other";
}

function parseSheetData(data: any[][], headerKeywords: string[]) {
  // Find header row by keywords
  const headerIdx = data.findIndex(row =>
    row[0] && headerKeywords.some(keyword => row[0].toString().trim().toUpperCase().includes(keyword))
  );
  if (headerIdx === -1) return [];
  const headers = data[headerIdx].map((h: any) => (h ? h.toString().trim() : ""));
  const dataRows = data.slice(headerIdx + 1);
  return dataRows
    .filter(row => row.length > 2 && row.some(cell => cell && cell.toString().trim() !== ""))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => obj[h] = row[i] ? row[i].toString().trim() : "");
      return obj;
    });
}

export default function LaptopInventory() {
  const [sheetData, setSheetData] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIssue, setSelectedIssue] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedAgeBracket, setSelectedAgeBracket] = useState("");
  const [selectedCard, setSelectedCard] = useState("");

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result;
      if (file.name.endsWith(".xlsx")) {
        const workbook = XLSX.read(result, { type: "binary" });
        const newSheetData: Record<string, any[]> = {};
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const sheetDataArr = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          // Detect sheet type by name
          if (sheetName.toLowerCase().includes("inventory")) {
            newSheetData["Laptop Inventory"] = parseSheetData(sheetDataArr as any[][], ["INVOICE DATE"]);
          } else if (sheetName.toLowerCase().includes("laptops with issues")) {
            newSheetData["Laptops With Issues"] = parseSheetData(sheetDataArr as any[][], ["INVOICE DATE"]);
          } else if (sheetName.toLowerCase().includes("laptops")) {
            newSheetData["Laptops"] = parseSheetData(sheetDataArr as any[][], ["INVOICE DATE"]);
          } else if (sheetName.toLowerCase().includes("incoming")) {
            newSheetData["Incoming"] = parseSheetData(sheetDataArr as any[][], ["INVOICE DATE"]);
          } else if (sheetName.toLowerCase().includes("mouse")) {
            // Mouse and Headset: simple key-value
            const items = sheetDataArr.filter(row => (row as any[]).length >= 2 && (row as any[])[0]);
            newSheetData["Mouse and Headset"] = items.map(row => ({
              item: row[0],
              count: row[1]
            }));
          }
        });
        setSheetData(newSheetData);
      }
      setIsLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  // Combine all laptop rows for analytics
  const allLaptops = useMemo(() => {
    const laptops = (sheetData["Laptops"] || []).concat(sheetData["Laptop Inventory"] || []);
    return laptops;
  }, [sheetData]);

  // Analytics
  const analytics = useMemo(() => {
    if (!allLaptops.length) return {
      total: 0, assigned: 0, available: 0, maintenance: 0, replacement: 0, recent: 0,
      brandDist: [], modelDist: [], ageDist: [],
      owned: [], newUnits: [],
    };
    const now = new Date();
    let total = 0, assigned = 0, available = 0, maintenance = 0, replacement = 0, recent = 0;
    const brandCount: Record<string, number> = {};
    const modelCount: Record<string, number> = {};
    const owned: any[] = [];
    const newUnits: any[] = [];

    allLaptops.forEach(row => {
      total++;
      const custodian = (row["CUSTODIAN"] || row["Custodian"] || "").toLowerCase();
      const status = (row["REPLACE"] || row["Replace"] || "").toLowerCase();
      const type = (row["TYPE"] || row["Type"] || "").toLowerCase();
      const brand = row["BRAND"] || row["Brand"] || "Unknown";
      const model = row["MODEL"] || row["Model"] || "Unknown";
      brandCount[brand] = (brandCount[brand] || 0) + 1;
      modelCount[model] = (modelCount[model] || 0) + 1;

      // Owned units: has custodian and not defective/dead
      if (custodian && !custodian.includes("no custodian") && !custodian.includes("defective") && !custodian.includes("dead unit")) {
        owned.push(row);
        assigned++;
      }
      // New units: deployed in last 3 months
      const deployDate = row["ASSET DEPLOYMNT"] || row["Asset Deployment"];
      if (deployDate && !deployDate.startsWith("00-Jan-00")) {
        const [day, mon, yr] = deployDate.split("-");
        let year = yr;
        if (yr && yr.length === 2) {
          year = "20" + yr;
        }
        const date = new Date(`${mon} ${day}, ${year}`);
        if (!isNaN(date.getTime())) {
          const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
          if (diff < 90) {
            newUnits.push(row);
            recent++;
          }
        }
      }
      // Available: marked as spare unit or similar
      if (
        status?.includes("spare unit") ||
        type?.includes("spare unit") ||
        custodian?.includes("no custodian") ||
        status?.includes("spare unit")
      ) {
        available++;
      }
      // Maintenance: EOL/BEYOND REPAIR or maintenance history or UNDER REPAIR
      if (
        status?.includes("eol") ||
        status?.includes("beyond repair") ||
        status?.includes("under repair") ||
        (row["MAINTENANCE HISTORY"] && row["MAINTENANCE HISTORY"].trim() !== "0")
      ) {
        maintenance++;
      }
      // Replacement: age > 5 years or marked for replacement
      const age = parseFloat((row["LAPTOP AGE"] || row["Laptop Age"] || "").replace(/[^\d.]/g, "") || "0");
      if (age > 5 || status?.includes("replace")) {
        replacement++;
      }
    });

    // Brand distribution
    const brandDist = Object.entries(brandCount).map(([name, value], i) => ({
      name, value, color: COLORS[i % COLORS.length]
    }));
    // Top 5 models
    const modelDist = Object.entries(modelCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));

    // Age breakdown
    const ageBrackets = [
      { label: "<2 years", min: 0, max: 2 },
      { label: "2-5 years", min: 2, max: 5 },
      { label: ">5 years", min: 5, max: 100 },
    ];
    const ageDist = ageBrackets.map(bracket => ({
      name: bracket.label,
      value: allLaptops.filter(row => {
        const age = parseFloat((row["LAPTOP AGE"] || row["Laptop Age"] || "").replace(/[^\d.]/g, "") || "0");
        return age >= bracket.min && age < bracket.max;
      }).length,
      color: COLORS[ageBrackets.indexOf(bracket) % COLORS.length],
    }));

    return { total, assigned, available, maintenance, replacement, recent, brandDist, modelDist, ageDist, owned, newUnits };
  }, [allLaptops]);

  // Mouse and Headset summary
  const mouseHeadsetSummary = sheetData["Mouse and Headset"] || [];

  // Issue breakdown for Laptops With Issues (grouped)
  const issuesRaw = sheetData["Laptops With Issues"] || [];
  const issueBreakdown = useMemo(() => {
    const issueCount: Record<string, number> = {};
    issuesRaw.forEach(row => {
      const issue = row["REPORTED ISSUE (BNEXT)"] || row["Reported Issue (BNEXT)"] || "";
      if (issue) {
        const group = groupIssue(issue);
        issueCount[group] = (issueCount[group] || 0) + 1;
      }
    });
    return Object.entries(issueCount).map(([name, value], i) => ({
      name, value, color: COLORS[i % COLORS.length]
    }));
  }, [issuesRaw]);

  // For filtering by issue, brand, model, age bracket, card
  const brands = useMemo(() => Array.from(new Set(allLaptops.map(row => row["BRAND"] || row["Brand"]))).filter(Boolean), [allLaptops]);
  const models = useMemo(() => Array.from(new Set(allLaptops.map(row => row["MODEL"] || row["Model"]))).filter(Boolean), [allLaptops]);
  const ageBrackets = ["<2 years", "2-5 years", ">5 years"];

  // Inventory Table Filters
  const filteredData = useMemo(() => {
    let rows = allLaptops;
    if (search) {
      rows = rows.filter(row =>
        Object.values(row).some(val => typeof val === "string" && val.toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (brandFilter) {
      rows = rows.filter(row => (row["BRAND"] || row["Brand"]) === brandFilter);
    }
    if (modelFilter) {
      rows = rows.filter(row => (row["MODEL"] || row["Model"]) === modelFilter);
    }
    if (statusFilter) {
      rows = rows.filter(row => (row["REPLACE"] || row["Replace"]) === statusFilter);
    }
    if (selectedIssue) {
      const issueSerials = issuesRaw
        .filter(row => groupIssue(row["REPORTED ISSUE (BNEXT)"] || row["Reported Issue (BNEXT)"] || "") === selectedIssue)
        .map(row => row["SERIAL NUM"] || row["Serial Num"]);
      rows = rows.filter(row => issueSerials.includes(row["SERIAL NUM"] || row["Serial Num"]));
    }
    if (selectedBrand) {
      rows = rows.filter(row => (row["BRAND"] || row["Brand"]) === selectedBrand);
    }
    if (selectedModel) {
      rows = rows.filter(row => (row["MODEL"] || row["Model"]) === selectedModel);
    }
    if (selectedAgeBracket) {
      rows = rows.filter(row => {
        const age = parseFloat((row["LAPTOP AGE"] || row["Laptop Age"] || "").replace(/[^\d.]/g, "") || "0");
        if (selectedAgeBracket === "<2 years") return age < 2;
        if (selectedAgeBracket === "2-5 years") return age >= 2 && age < 5;
        if (selectedAgeBracket === ">5 years") return age >= 5;
        return true;
      });
    }
    if (selectedCard === "owned") rows = analytics.owned;
    if (selectedCard === "newUnits") rows = analytics.newUnits;
    return rows;
  }, [search, brandFilter, modelFilter, statusFilter, selectedIssue, selectedBrand, selectedModel, selectedAgeBracket, selectedCard, allLaptops, issuesRaw, analytics.owned, analytics.newUnits]);

  // Incoming laptops summary
  const incomingSummary = sheetData["Incoming"] || [];

  // Comments/issues review section
  const reviewRows = useMemo(() => {
    // Find rows with long comments/issues
    const rows: any[] = [];
    allLaptops.forEach(row => {
      const comment = row["COMMENTS"] || row["NOTES / COMMENTS"] || "";
      if (comment && comment.length > 40) rows.push({ ...row, comment });
    });
    issuesRaw.forEach(row => {
      const issue = row["REPORTED ISSUE (BNEXT)"] || "";
      if (issue && issue.length > 40) rows.push({ ...row, comment: issue });
    });
    return rows;
  }, [allLaptops, issuesRaw]);

  // Review action handler (stub)
  function handleReviewAction(idx: number, action: string) {
    // Here you could update the row's status, categorize, etc.
    // For demo, just alert
    alert(`Row ${idx + 1}: ${action}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Laptop Inventory Dashboard
          </h1>
          <p className="text-muted-foreground">
            Unified analytics from all sheets in your Excel file.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <Upload className="h-4 w-4" /> {isLoading ? "Uploading..." : "Upload Excel"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
      </div>

      {/* Dashboard Cards (clickable) */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
        <Card onClick={() => setSelectedCard("")} style={{ cursor: "pointer" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Laptops</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total}</div>
            <p className="text-xs text-muted-foreground">In inventory</p>
          </CardContent>
        </Card>
        <Card onClick={() => setSelectedCard("owned")} style={{ cursor: "pointer" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Owned Units</CardTitle>
            <Laptop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.owned.length}</div>
            <p className="text-xs text-muted-foreground">Assigned to people</p>
          </CardContent>
        </Card>
        <Card onClick={() => setSelectedCard("newUnits")} style={{ cursor: "pointer" }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Units</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.newUnits.length}</div>
            <p className="text-xs text-muted-foreground">Deployed last 3 months</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.available}</div>
            <p className="text-xs text-muted-foreground">Ready for assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.maintenance}</div>
            <p className="text-xs text-muted-foreground">Under repair/EOL</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Replacement Candidates</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.replacement}</div>
            <p className="text-xs text-muted-foreground">Old or flagged for replacement</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts (clickable) */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Brand Distribution</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent style={{ height: 250 }}>
            {analytics.brandDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={analytics.brandDist}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                    onClick={data => setSelectedBrand(data.name)}
                  >
                    {analytics.brandDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground">Upload Excel to view chart</div>
            )}
            {selectedBrand && (
              <div className="mt-2 text-sm">
                <span className="font-semibold">Filtering by brand:</span> {selectedBrand}{" "}
                <button className="ml-2 text-xs underline text-primary" onClick={() => setSelectedBrand("")}>Clear</button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Top Models</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent style={{ height: 250 }}>
            {analytics.modelDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.modelDist}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" onClick={data => setSelectedModel(data.name)} cursor="pointer">
                    {analytics.modelDist.map((entry, index) => (
                      <Cell key={`cell-bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground">Upload Excel to view chart</div>
            )}
            {selectedModel && (
              <div className="mt-2 text-sm">
                <span className="font-semibold">Filtering by model:</span> {selectedModel}{" "}
                <button className="ml-2 text-xs underline text-primary" onClick={() => setSelectedModel("")}>Clear</button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Laptop Age Breakdown</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent style={{ height: 250 }}>
            {analytics.ageDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.ageDist}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" onClick={data => setSelectedAgeBracket(data.name)} cursor="pointer">
                    {analytics.ageDist.map((entry, index) => (
                      <Cell key={`cell-age-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground">Upload Excel to view chart</div>
            )}
            {selectedAgeBracket && (
              <div className="mt-2 text-sm">
                <span className="font-semibold">Filtering by age bracket:</span> {selectedAgeBracket}{" "}
                <button className="ml-2 text-xs underline text-primary" onClick={() => setSelectedAgeBracket("")}>Clear</button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mouse and Headset Summary */}
      {mouseHeadsetSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mouse and Headset Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mouseHeadsetSummary.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.item}</TableCell>
                    <TableCell>{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Laptops With Issues Breakdown (interactive) */}
      {issueBreakdown.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Laptops With Issues Breakdown</CardTitle>
            <span className="text-xs text-muted-foreground">Click a bar to filter inventory table</span>
          </CardHeader>
          <CardContent style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={issueBreakdown}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" onClick={data => setSelectedIssue(data.name)} cursor="pointer">
                  {issueBreakdown.map((entry, index) => (
                    <Cell key={`cell-issue-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {selectedIssue && (
              <div className="mt-2 text-sm">
                <span className="font-semibold">Filtering by issue:</span> {selectedIssue}{" "}
                <button className="ml-2 text-xs underline text-primary" onClick={() => setSelectedIssue("")}>Clear</button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Incoming Laptops Table */}
      {incomingSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Incoming Laptops</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>New Hire</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Serial Number</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomingSummary.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row["NEW HIRE"]}</TableCell>
                    <TableCell>{row["START DATE"]}</TableCell>
                    <TableCell>{row["COMMENTS"]}</TableCell>
                    <TableCell>{row["MODEL"]}</TableCell>
                    <TableCell>{row["SERIAL NUMBER"]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Searchable Inventory Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Inventory Table</CardTitle>
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select className="border rounded px-2 py-1 text-xs" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
              <option value="">Brand</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="border rounded px-2 py-1 text-xs" value={modelFilter} onChange={e => setModelFilter(e.target.value)}>
              <option value="">Model</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="border rounded px-2 py-1 text-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Status</option>
              <option value="Assigned">Assigned</option>
              <option value="Available">Available</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Replacement">Replacement</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search laptops..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-4"
          />
          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Custodian</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Age</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row["CUSTODIAN"] || row["Custodian"]}</TableCell>
                    <TableCell>{row["MODEL"] || row["Model"]}</TableCell>
                    <TableCell>{row["BRAND"] || row["Brand"]}</TableCell>
                    <TableCell>{row["REPLACE"] || row["Replace"]}</TableCell>
                    <TableCell>{row["LAPTOP AGE"] || row["Laptop Age"]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Review Section for Long Comments/Issues */}
      {reviewRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Long Comments & Issues</CardTitle>
            <span className="text-xs text-muted-foreground">Categorize, flag, or mark as fixed</span>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Custodian/Unit</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Comment/Issue</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row["CUSTODIAN"] || row["Custodian"] || row["TAG"] || row["TAG"]}</TableCell>
                    <TableCell>{row["MODEL"] || row["Model"]}</TableCell>
                    <TableCell>{row["BRAND"] || row["Brand"]}</TableCell>
                    <TableCell>{row.comment}</TableCell>
                    <TableCell>
                      <button className="text-xs px-2 py-1 bg-primary text-white rounded mr-1" onClick={() => handleReviewAction(idx, "Categorize")}>Categorize</button>
                      <button className="text-xs px-2 py-1 bg-green-600 text-white rounded mr-1" onClick={() => handleReviewAction(idx, "Flag as Fixed")}>Flag Fixed</button>
                      <button className="text-xs px-2 py-1 bg-yellow-500 text-white rounded" onClick={() => handleReviewAction(idx, "Needs Follow-up")}>Needs Follow-up</button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
