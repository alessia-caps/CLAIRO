import { useState } from "react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Users,
  Trophy,
  TrendingUp,
  Target,
  Search,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  Star,
  Award,
  Brain,
  CheckCircle,
} from "lucide-react";
import { CSVUploadDialog } from "@/components/CSVUploadDialog";
import { WeeklyAnalysisComponent } from "@/components/WeeklyAnalysis";

interface EngagementData {
  totalParticipants: number;
  avgDailyPoints: number;
  topDepartment: string;
  highestScorer: string;
  engagementDistribution: {
    highlyEngaged: number;
    engaged: number;
    needsImprovement: number;
    atRisk: number;
  };
}

interface Employee {
  id: string;
  name: string;
  department: string;
  dailyPoints: number;
  weeklyPoints: number;
  rank: number;
  eventScore: number;
  veScore: number;
  surveyScore: number;
  weightedScore: number;
  engagementLevel:
    | "Highly Engaged"
    | "Engaged"
    | "Needs Improvement"
    | "At-Risk";
}

interface DepartmentData {
  name: string;
  totalPoints: number;
  color: string;
}

interface MiniGame {
  week: number;
  gameType: string;
  participants: number;
  winningDept: string;
  winningEmployee: string;
}

export default function Index() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedWeek, setSelectedWeek] = useState("current");
  const [uploadedEmployees, setUploadedEmployees] = useState<Employee[]>([]);
  const [weeklyAnalysis, setWeeklyAnalysis] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<"empty" | "uploaded">("empty");

  // Get unique departments from uploaded data
  const availableDepartments = React.useMemo(() => {
    const depts = new Set<string>();
    uploadedEmployees.forEach((emp) => {
      if (emp.department && emp.department !== "Unknown") {
        depts.add(emp.department);
      }
    });
    return Array.from(depts).sort();
  }, [uploadedEmployees]);

  // Calculate engagement data from uploaded employees
  const engagementData: EngagementData =
    uploadedEmployees.length > 0
      ? {
          totalParticipants: uploadedEmployees.length,
          avgDailyPoints:
            Math.round(
              (uploadedEmployees.reduce(
                (sum, emp) => sum + emp.dailyPoints,
                0,
              ) /
                uploadedEmployees.length) *
                10,
            ) / 10,
          topDepartment: getTopDepartment(),
          highestScorer:
            uploadedEmployees.sort((a, b) => b.weeklyPoints - a.weeklyPoints)[0]
              ?.name || "N/A",
          engagementDistribution: calculateEngagementDistribution(),
        }
      : {
          totalParticipants: 0,
          avgDailyPoints: 0,
          topDepartment: "N/A",
          highestScorer: "N/A",
          engagementDistribution: {
            highlyEngaged: 0,
            engaged: 0,
            needsImprovement: 0,
            atRisk: 0,
          },
        };

  // Helper functions for calculating metrics
  function getTopDepartment(): string {
    if (uploadedEmployees.length === 0) return "N/A";
    const deptPoints = uploadedEmployees.reduce(
      (acc, emp) => {
        acc[emp.department] = (acc[emp.department] || 0) + emp.weeklyPoints;
        return acc;
      },
      {} as Record<string, number>,
    );
    return (
      Object.entries(deptPoints).sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A"
    );
  }

  function calculateEngagementDistribution() {
    if (uploadedEmployees.length === 0)
      return { highlyEngaged: 0, engaged: 0, needsImprovement: 0, atRisk: 0 };
    const total = uploadedEmployees.length;
    const distribution = uploadedEmployees.reduce(
      (acc, emp) => {
        const level = emp.engagementLevel.replace(/\s+/g, "").toLowerCase();
        if (level === "highlyengaged") acc.highlyEngaged++;
        else if (level === "engaged") acc.engaged++;
        else if (level === "needsimprovement") acc.needsImprovement++;
        else acc.atRisk++;
        return acc;
      },
      { highlyEngaged: 0, engaged: 0, needsImprovement: 0, atRisk: 0 },
    );

    return {
      highlyEngaged: Math.round((distribution.highlyEngaged / total) * 100),
      engaged: Math.round((distribution.engaged / total) * 100),
      needsImprovement: Math.round(
        (distribution.needsImprovement / total) * 100,
      ),
      atRisk: Math.round((distribution.atRisk / total) * 100),
    };
  }

  // Calculate department data from uploaded employees
  const departmentData: DepartmentData[] =
    uploadedEmployees.length > 0
      ? Object.entries(
          uploadedEmployees.reduce(
            (acc, emp) => {
              if (!acc[emp.department]) {
                acc[emp.department] = {
                  name: emp.department,
                  totalPoints: 0,
                  color: getDepartmentColor(emp.department),
                };
              }
              acc[emp.department].totalPoints += emp.weeklyPoints;
              return acc;
            },
            {} as Record<string, DepartmentData>,
          ),
        )
          .map(([_, dept]) => dept)
          .sort((a, b) => b.totalPoints - a.totalPoints)
      : [];

  function getDepartmentColor(department: string): string {
    const colors = [
      "#8B5CF6",
      "#06B6D4",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5A2B",
      "#6366F1",
      "#EC4899",
    ];
    const index =
      department.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  }

  // Sample mini-games - these would typically come from a separate data source
  const miniGames: MiniGame[] = [];

  const maxDeptPoints =
    departmentData.length > 0
      ? Math.max(...departmentData.map((d) => d.totalPoints))
      : 1;

  // Sort uploaded employees by weekly points and assign ranks
  const sortedEmployees = [...uploadedEmployees]
    .sort((a, b) => b.weeklyPoints - a.weeklyPoints)
    .map((emp, index) => ({ ...emp, rank: index + 1 }));

  const filteredEmployees = sortedEmployees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment =
      selectedDepartment === "all" ||
      employee.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const handleDataUploaded = (data: Employee[], weeklyAnalysis?: any[]) => {
    setUploadedEmployees(data);
    if (weeklyAnalysis) {
      setWeeklyAnalysis(weeklyAnalysis);
    }
    setDataSource("uploaded");
  };

  return (
    <div className="space-y-6">
      {/* Upload Button */}
      <div className="flex justify-end">
        <CSVUploadDialog onDataUploaded={handleDataUploaded} />
      </div>
      {/* Data Source Indicator */}
      {dataSource === "uploaded" && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <strong>Live Data:</strong> Dashboard updated with your uploaded CSV
            data ({uploadedEmployees.length} employees processed)
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
              <Users className="h-4 w-4 mr-1" />
              Total Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {engagementData.totalParticipants}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Avg Daily Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {engagementData.avgDailyPoints}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
              <Trophy className="h-4 w-4 mr-1" />
              Top Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-900">
              {engagementData.topDepartment}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 flex items-center">
              <Star className="h-4 w-4 mr-1" />
              Top Scorer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-orange-900">
              {engagementData.highestScorer}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-pink-50 to-pink-100 border-pink-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-pink-700 flex items-center">
              <Target className="h-4 w-4 mr-1" />
              Highly Engaged %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-900">
              {engagementData.engagementDistribution.highlyEngaged}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Department Points Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-primary" />
              Total Engagement Points by Department (Current Upload)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {departmentData.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <div className="flex flex-col items-center space-y-3">
                  <BarChart3 className="h-12 w-12 text-slate-300" />
                  <div>
                    <p className="font-medium">No department data available</p>
                    <p className="text-sm">
                      Upload engagement data to see department performance
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {departmentData.map((dept) => (
                  <div key={dept.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{dept.name}</span>
                      <span className="text-slate-600">{dept.totalPoints}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all duration-300"
                        style={{
                          width: `${(dept.totalPoints / maxDeptPoints) * 100}%`,
                          backgroundColor: dept.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Engagement Level Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-primary" />
              Engagement Level Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploadedEmployees.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <div className="flex flex-col items-center space-y-3">
                  <PieChart className="h-12 w-12 text-slate-300" />
                  <div>
                    <p className="font-medium">No engagement data available</p>
                    <p className="text-sm">
                      Upload engagement data to see engagement level
                      distribution
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {engagementData.engagementDistribution.highlyEngaged}%
                    </div>
                    <div className="text-sm text-slate-600">Highly Engaged</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {engagementData.engagementDistribution.engaged}%
                    </div>
                    <div className="text-sm text-slate-600">Engaged</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {engagementData.engagementDistribution.needsImprovement}%
                    </div>
                    <div className="text-sm text-slate-600">
                      Needs Improvement
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {engagementData.engagementDistribution.atRisk}%
                    </div>
                    <div className="text-sm text-slate-600">At-Risk</div>
                  </div>
                </div>
                <div className="flex h-4 rounded-full overflow-hidden">
                  <div
                    className="bg-green-500"
                    style={{
                      width: `${engagementData.engagementDistribution.highlyEngaged}%`,
                    }}
                  />
                  <div
                    className="bg-blue-500"
                    style={{
                      width: `${engagementData.engagementDistribution.engaged}%`,
                    }}
                  />
                  <div
                    className="bg-orange-500"
                    style={{
                      width: `${engagementData.engagementDistribution.needsImprovement}%`,
                    }}
                  />
                  <div
                    className="bg-red-500"
                    style={{
                      width: `${engagementData.engagementDistribution.atRisk}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <Tabs defaultValue="leaderboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leaderboard">Department Overview</TabsTrigger>
          <TabsTrigger value="quarterly-report">
            Quarterly Engagement Report
          </TabsTrigger>
          <TabsTrigger value="weekly-analysis">Weekly Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-primary" />
                  Department Performance
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <Select
                    value={selectedDepartment}
                    onValueChange={setSelectedDepartment}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {availableDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">This Week</SelectItem>
                      <SelectItem value="last">Previous Week</SelectItem>
                      <SelectItem value="month">Current Month</SelectItem>
                      <SelectItem value="quarter">Current Quarter</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {departmentData.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center space-y-3">
                      <Upload className="h-8 w-8 text-slate-300" />
                      <div>
                        <p className="font-medium">
                          No department data available
                        </p>
                        <p className="text-sm">
                          Upload engagement data to see performance
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {departmentData.slice(0, 5).map((dept, index) => (
                      <div
                        key={dept.name}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{dept.name}</div>
                            <div className="text-sm text-slate-600">
                              {dept.totalPoints} total points
                            </div>
                          </div>
                        </div>
                        {index === 0 && (
                          <Trophy className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-primary" />
                  Top Performers This Week
                </CardTitle>
                <div className="flex-1 relative mt-3">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {filteredEmployees.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center space-y-3">
                      <Upload className="h-8 w-8 text-slate-300" />
                      <div>
                        <p className="font-medium">
                          No employee data available
                        </p>
                        <p className="text-sm">
                          Upload engagement data to see top performers
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredEmployees.slice(0, 5).map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            #{employee.rank}
                          </div>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-slate-600">
                              {employee.department} • {employee.weeklyPoints}{" "}
                              pts
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={
                            employee.engagementLevel === "Highly Engaged"
                              ? "default"
                              : employee.engagementLevel === "Engaged"
                                ? "secondary"
                                : employee.engagementLevel ===
                                    "Needs Improvement"
                                  ? "outline"
                                  : "destructive"
                          }
                          className="text-xs"
                        >
                          {employee.engagementLevel}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quarterly-report">
          <div className="space-y-6">
            {/* Top Teams/Departments for Quarter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-primary" />
                  Top Performing Teams - Q1 2024
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Time Period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="q1">Q1 2024 (Current)</SelectItem>
                      <SelectItem value="q4">Q4 2023</SelectItem>
                      <SelectItem value="q3">Q3 2023</SelectItem>
                      <SelectItem value="q2">Q2 2023</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedDepartment}
                    onValueChange={setSelectedDepartment}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {availableDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {departmentData.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center space-y-3">
                      <Trophy className="h-12 w-12 text-slate-300" />
                      <div>
                        <p className="font-medium">
                          No quarterly data available
                        </p>
                        <p className="text-sm">
                          Upload engagement data to view quarterly team
                          performance
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departmentData.map((dept, index) => (
                      <div
                        key={dept.name}
                        className="p-4 rounded-lg border bg-gradient-to-br from-slate-50 to-slate-100 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                              #{index + 1}
                            </div>
                            <h3 className="font-semibold text-lg">
                              {dept.name}
                            </h3>
                          </div>
                          {index === 0 && (
                            <Trophy className="h-6 w-6 text-yellow-500" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Total Points</span>
                            <span className="font-bold">
                              {dept.totalPoints}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">
                              Avg per Employee
                            </span>
                            <span className="font-medium">
                              {Math.round(
                                dept.totalPoints /
                                  Math.max(
                                    uploadedEmployees.filter(
                                      (emp) => emp.department === dept.name,
                                    ).length,
                                    1,
                                  ),
                              )}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${(dept.totalPoints / maxDeptPoints) * 100}%`,
                                backgroundColor: dept.color,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Employees for Quarter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2 text-primary" />
                  Top Performing Employees - Q1 2024
                </CardTitle>
                <div className="flex-1 relative mt-3">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {filteredEmployees.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center space-y-3">
                      <Star className="h-12 w-12 text-slate-300" />
                      <div>
                        <p className="font-medium">
                          No employee data available
                        </p>
                        <p className="text-sm">
                          Upload engagement data to view top quarterly
                          performers
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Rank</th>
                          <th className="text-left py-3 px-4">Name</th>
                          <th className="text-left py-3 px-4">Department</th>
                          <th className="text-right py-3 px-4">
                            Weekly Points
                          </th>
                          <th className="text-right py-3 px-4">Event Score</th>
                          <th className="text-right py-3 px-4">VE Score</th>
                          <th className="text-right py-3 px-4">Survey Score</th>
                          <th className="text-right py-3 px-4">
                            Weighted Score
                          </th>
                          <th className="text-left py-3 px-4">
                            Engagement Level
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEmployees.slice(0, 10).map((employee) => (
                          <tr
                            key={employee.id}
                            className="border-b hover:bg-slate-50"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                                  #{employee.rank}
                                </div>
                                {employee.rank <= 3 && (
                                  <Award className="h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium">
                              {employee.name}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-xs">
                                {employee.department}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">
                              {employee.weeklyPoints}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {employee.eventScore}/100
                            </td>
                            <td className="py-3 px-4 text-right">
                              {employee.veScore}/100
                            </td>
                            <td className="py-3 px-4 text-right">
                              {employee.surveyScore}/100
                            </td>
                            <td className="py-3 px-4 text-right font-bold">
                              {employee.weightedScore}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  employee.engagementLevel === "Highly Engaged"
                                    ? "default"
                                    : employee.engagementLevel === "Engaged"
                                      ? "secondary"
                                      : employee.engagementLevel ===
                                          "Needs Improvement"
                                        ? "outline"
                                        : "destructive"
                                }
                                className="text-xs"
                              >
                                {employee.engagementLevel}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weekly-analysis">
          <WeeklyAnalysisComponent weeklyData={weeklyAnalysis} />
        </TabsContent>
      </Tabs>

      {/* AI Summary Panel - Moved to Bottom */}
      <Card className="mt-6 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
        <CardHeader>
          <CardTitle className="flex items-center text-violet-700">
            <Brain className="h-5 w-5 mr-2" />
            AI Engagement Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedEmployees.length === 0 ? (
            <p className="text-violet-600 italic">
              📊 Upload your engagement data to get AI-powered insights about
              team performance, trends, and recommendations.
            </p>
          ) : (
            <p className="text-violet-700">
              📈 <strong>{engagementData.topDepartment} leads this week</strong>{" "}
              with the highest engagement scores, contributing{" "}
              {departmentData[0]?.totalPoints || 0} total points.
              {filteredEmployees[0]?.name} maintains the #1 position with{" "}
              {filteredEmployees[0]?.weeklyPoints} weekly points. 📊{" "}
              <strong>
                {engagementData.engagementDistribution.engaged +
                  engagementData.engagementDistribution.highlyEngaged}
                % of employees are engaged or highly engaged
              </strong>
              , indicating positive team morale.
              {engagementData.engagementDistribution.atRisk > 0 && (
                <>
                  ⚠️{" "}
                  <strong>
                    {engagementData.engagementDistribution.atRisk}% are
                    classified as At-Risk
                  </strong>{" "}
                  - consider targeted interventions for these individuals.{" "}
                </>
              )}
              🎯 Focus on maintaining momentum in top-performing departments
              while supporting growth in others.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
