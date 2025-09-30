import * as React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Users, Clock, Laptop, GraduationCap } from "lucide-react";

const DASHBOARDS = [
  { title: "Engagement Dashboard", path: "/engagement", icon: Activity, desc: "Overview of engagement metrics" },
  { title: "Laptop Inventory", path: "/laptop-inventory", icon: Laptop, desc: "View device inventory and status" },
  { title: "Certification & Training", path: "/certification-training", icon: GraduationCap, desc: "Training completion and certs" },
  { title: "Retention & Turnover", path: "/retention-turnover", icon: Users, desc: "Retention analytics and movements" },
  { title: "OT & Leave Reports", path: "/ot-leave-claims", icon: Clock, desc: "Overtime and leave analytics" },
];

export default function DashboardsIndex() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">CLAIRO Dashboards</h1>
        <p className="text-muted-foreground mt-1">Choose which dashboard you'd like to open.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {DASHBOARDS.map((d) => (
          <Card key={d.path}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <d.icon className="h-4 w-4" />
                <span>{d.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-sm text-muted-foreground">{d.desc}</div>
              <Link to={d.path}>
                <Button>Open</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
