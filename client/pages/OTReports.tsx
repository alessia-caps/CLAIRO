import { useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Clock, DollarSign, Users, Info } from "lucide-react";
import { useOTUpload, aggregateOT } from "@/hooks/use-ot-upload";

export default function OTReports() {
  const { records, upload, error, isUploading, clear } = useOTUpload();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const pivots = useMemo(() => aggregateOT(records), [records]);
  const typeKeys = useMemo(() => Array.from(new Set(Object.keys(pivots.totalsYTD.byType))), [pivots]);
  const monthKeys = useMemo(() => {
    const set = new Set<string>();
    pivots.hoursByMonthByType.forEach((r) => Object.keys(r.values).forEach(() => set.add(r.month)));
    return Array.from(set);
  }, [pivots]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">OT Reports</h1>
          <p className="text-muted-foreground">Upload the OT report Excel. Dashboards update automatically.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={async (e) => {
              const f = e.currentTarget.files?.[0];
              if (!f) return;
              await upload(f);
              e.currentTarget.value = "";
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={isUploading}>
            <Upload className="h-4 w-4 mr-2" /> Upload OT Excel
          </Button>
          {records.length > 0 && (
            <Button variant="secondary" onClick={clear}>Clear</Button>
          )}
        </div>
      </div>

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
            <p className="text-xs text-muted-foreground mt-3">OT types supported: LH/SH (Holiday Work), RD (Rest Day/Weekend), OT (Overtime), ND (Night Differential).</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total OT Hours (YTD)</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pivots.totalsYTD.totalHours.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Across all types</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total OT Compensation (₱)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pivots.totalsYTD.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground">Year-to-date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Employees With OT</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pivots.totalsYTD.employees}</div>
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
                  const top = Object.entries(pivots.totalsYTD.byType).sort((a, b) => b[1].hours - a[1].hours)[0];
                  return top ? (
                    <div className="text-2xl font-bold">{top[0]}: {top[1].hours.toLocaleString()}</div>
                  ) : (
                    <div className="text-muted-foreground">No data</div>
                  );
                })()}
                <p className="text-xs text-muted-foreground">By total hours</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>OT Hours by Month and Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Month</th>
                      {typeKeys.map((t) => (
                        <th key={t} className="p-2 text-right">{t}</th>
                      ))}
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pivots.hoursByMonthByType.map((row) => (
                      <tr key={row.month} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{row.month}</td>
                        {typeKeys.map((t) => (
                          <td key={t} className="p-2 text-right">{(row.values[t] || 0).toLocaleString()}</td>
                        ))}
                        <td className="p-2 text-right font-semibold">{row.total.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="p-2 font-semibold">Grand Total</td>
                      {typeKeys.map((t) => (
                        <td key={t} className="p-2 text-right font-semibold">{(pivots.totalsYTD.byType[t]?.hours || 0).toLocaleString()}</td>
                      ))}
                      <td className="p-2 text-right font-semibold">{pivots.totalsYTD.totalHours.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amount (₱) per OT Category per Employee</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Employee</th>
                      <th className="p-2 text-left">Team</th>
                      {typeKeys.map((t) => (
                        <th key={t} className="p-2 text-right">{t}</th>
                      ))}
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pivots.amountByTypeByEmployee.map((row) => (
                      <tr key={row.employeeId} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{row.name} ({row.employeeId})</td>
                        <td className="p-2">{row.team}</td>
                        {typeKeys.map((t) => (
                          <td key={t} className="p-2 text-right">{(row.values[t] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        ))}
                        <td className="p-2 text-right font-semibold">{row.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="p-2 font-semibold" colSpan={2}>Grand Total</td>
                      {typeKeys.map((t) => (
                        <td key={t} className="p-2 text-right font-semibold">{(pivots.totalsYTD.byType[t]?.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      ))}
                      <td className="p-2 text-right font-semibold">{pivots.totalsYTD.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amount (₱) per Month per Employee</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Employee</th>
                      <th className="p-2 text-left">Team</th>
                      {monthKeys.map((m) => (
                        <th key={m} className="p-2 text-right">{m}</th>
                      ))}
                      <th className="p-2 text-right">YTD Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pivots.amountByMonthByEmployee.map((row) => (
                      <tr key={row.employeeId} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{row.name} ({row.employeeId})</td>
                        <td className="p-2">{row.team}</td>
                        {monthKeys.map((m) => (
                          <td key={m} className="p-2 text-right">{(row.values[m] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        ))}
                        <td className="p-2 text-right font-semibold">{row.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>OT Types and Descriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2">
                <li><strong>LH/SH - Holiday Work:</strong> Approval may be required - PM or Supervisor informed PMD, or SA applied for by employee and approved by Supervisor.</li>
                <li><strong>RD - Rest Day/Weekend:</strong> Approval may be required - PM or Supervisor informed PMD, or SA applied for by employee and approved by Supervisor.</li>
                <li><strong>OT - Overtime:</strong> Approval required - Work rendered in excess of 8 hours on an ordinary day, holiday, or rest day.</li>
                <li><strong>ND - Night Differential:</strong> Automatically captured by the system for work from 10PM to 6AM - No approval needed as long as employee is authorized to work on that day.</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
