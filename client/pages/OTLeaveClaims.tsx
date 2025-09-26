import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Clock, Calendar } from "lucide-react";

export default function OTLeaveClaims() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monthly OT and Leave Claims</h1>
          <p className="text-muted-foreground">Choose a section to manage uploads and dashboards</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OT Reports</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload the OT report Excel to see hours and compensation dashboards.</p>
            <Button asChild>
              <Link to="/ot-leave-claims/ot">Go to OT Reports</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Reports</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload Leave Transactions and Summary to see leave usage and balances.</p>
            <Button variant="outline" asChild>
              <Link to="/ot-leave-claims/leave">Go to Leave Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
