import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CalendarDays, CheckCircle2, XCircle, Hourglass, Users } from "lucide-react";
import { useLeaveUpload } from "@/hooks/use-leave-upload";

export default function LeaveReports() {
  const { transactions, summary, analytics, error, isUploading, uploadTransactions, uploadSummary, clear } = useLeaveUpload();
  const txRef = useRef<HTMLInputElement | null>(null);
  const sumRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Reports</h1>
          <p className="text-muted-foreground">Upload Leave Transactions and Leave Summary separately.</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={txRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => {
            const f = e.currentTarget.files?.[0];
            if (!f) return;
            await uploadTransactions(f);
            e.currentTarget.value = "";
          }} />
          <input ref={sumRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => {
            const f = e.currentTarget.files?.[0];
            if (!f) return;
            await uploadSummary(f);
            e.currentTarget.value = "";
          }} />
          <Button onClick={() => txRef.current?.click()} disabled={isUploading}>
            <Upload className="h-4 w-4 mr-2" /> Upload Transactions
          </Button>
          <Button variant="outline" onClick={() => sumRef.current?.click()} disabled={isUploading}>
            <Upload className="h-4 w-4 mr-2" /> Upload Summary
          </Button>
          {(transactions.length > 0 || summary.length > 0) && (
            <Button variant="secondary" onClick={clear}>Clear</Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {transactions.length === 0 && summary.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Expected Columns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Leave Transactions</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>EmployeeID, Name, LeaveTypeName</li>
                  <li>DateFiled, DateFrom, DateTo</li>
                  <li>WithPayNoOfdays, WoutPayNoOfDays</li>
                  <li>Reason, LeaveStatus, RejectReason</li>
                  <li>DateApprovedSupervisor, DateRejectedSupervisor</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Leave Summary</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>EMPLOYEE ID, LAST NAME, FIRST NAME, MIDDLE NAME</li>
                  <li>DEPARTMENT, HIRE DATE, REGULARIZATION DATE</li>
                  <li>LEAVE TYPE, LEAVES USED DURING DATE RANGE</li>
                  <li>Total Available Balance (YTD), IS ACTIVE</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {transactions.length > 0 && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totals.requests.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">In transactions file</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totals.approved.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Requests approved</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Hourglass className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totals.pending.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totals.rejected.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Requests rejected</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Days Used by Leave Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Leave Type</th>
                      <th className="p-2 text-right">Requests</th>
                      <th className="p-2 text-right">With Pay (days)</th>
                      <th className="p-2 text-right">Without Pay (days)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.byType.map((r) => (
                      <tr key={r.type} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{r.type}</td>
                        <td className="p-2 text-right">{r.requests.toLocaleString()}</td>
                        <td className="p-2 text-right">{r.withPayDays.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right">{r.withoutPayDays.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Employees by Leave Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Employee</th>
                      <th className="p-2 text-right">Total Days</th>
                      <th className="p-2 text-right">With Pay</th>
                      <th className="p-2 text-right">Without Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topEmployeesByDays.map((r) => (
                      <tr key={r.name} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{r.name}</td>
                        <td className="p-2 text-right">{r.totalDays.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right">{r.withPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right">{r.withoutPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leave Balances (Summary)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Employee ID</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Department</th>
                    <th className="p-2 text-left">Leave Type</th>
                    <th className="p-2 text-right">Used (range)</th>
                    <th className="p-2 text-right">Available (YTD)</th>
                    <th className="p-2 text-left">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((r, i) => (
                    <tr key={`${r.employeeId}-${r.leaveType}-${i}`} className="border-b hover:bg-muted/50">
                      <td className="p-2">{r.employeeId}</td>
                      <td className="p-2">{`${r.lastName}, ${r.firstName}`}</td>
                      <td className="p-2">{r.department || "-"}</td>
                      <td className="p-2">{r.leaveType}</td>
                      <td className="p-2 text-right">{r.usedDuringRange.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right">{r.totalAvailableBalanceYtd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="p-2">{r.isActive || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
