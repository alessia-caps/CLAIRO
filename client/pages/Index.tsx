import { useState } from "react";
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
  const [dataSource, setDataSource] = useState<"empty" | "uploaded">("empty");

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

  const handleDataUploaded = (data: Employee[]) => {
    setUploadedEmployees(data);
    setDataSource("uploaded");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-lg flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  CLAIRO
                </h1>
              </div>
              <Badge variant="outline" className="text-xs">
                Engagement Dashboard
              </Badge>
            </div>
            <CSVUploadDialog onDataUploaded={handleDataUploaded} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Data Source Indicator */}
        {dataSource === "uploaded" && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              <strong>Live Data:</strong> Dashboard updated with your uploaded
              CSV data ({uploadedEmployees.length} employees processed)
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

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
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
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Week</SelectItem>
                  <SelectItem value="last">Last Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Charts and Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Department Points Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                Total Engagement Points by Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              {departmentData.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center space-y-3">
                    <BarChart3 className="h-12 w-12 text-slate-300" />
                    <div>
                      <p className="font-medium">
                        No department data available
                      </p>
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
                        <span className="text-slate-600">
                          {dept.totalPoints}
                        </span>
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
                      <p className="font-medium">
                        No engagement data available
                      </p>
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
                      <div className="text-sm text-slate-600">
                        Highly Engaged
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {engagementData.engagementDistribution.engaged}%
                      </div>
                      <div className="text-sm text-slate-600">Engaged</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {engagementData.engagementDistribution.needsImprovement}
                        %
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

        {/* AI Summary Panel */}
        <Card className="mb-6 bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
          <CardHeader>
            <CardTitle className="flex items-center text-violet-700">
              <Brain className="h-5 w-5 mr-2" />
              AI Engagement Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-violet-700">
              📈 <strong>Marketing leads this week</strong> with 3 employees in
              the top 5 performers, contributing 1,850 total points. Sarah Chen
              maintains the #1 position with exceptional event participation
              (95/100). 📊 <strong>35% of employees are Highly Engaged</strong>,
              indicating strong overall team morale. ⚠️{" "}
              <strong>5% are classified as At-Risk</strong> - consider targeted
              interventions for these individuals. 🎯 Engineering shows
              consistent growth in Viva Engage participation over the past 3
              weeks.
            </p>
          </CardContent>
        </Card>

        {/* Data Tables */}
        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="quad-scores">
              Quad Engagement Scores
            </TabsTrigger>
            <TabsTrigger value="mini-games">Mini-Game Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-primary" />
                  Employee Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Rank</th>
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-left py-3 px-4">Department</th>
                        <th className="text-right py-3 px-4">Daily Points</th>
                        <th className="text-right py-3 px-4">Weekly Points</th>
                        <th className="text-left py-3 px-4">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-12 text-center text-slate-500"
                          >
                            <div className="flex flex-col items-center space-y-3">
                              <Upload className="h-12 w-12 text-slate-300" />
                              <div>
                                <p className="font-medium">
                                  No engagement data available
                                </p>
                                <p className="text-sm">
                                  Upload your Excel engagement tracker to view
                                  employee rankings
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((employee) => (
                          <tr
                            key={employee.id}
                            className="border-b hover:bg-slate-50"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center">
                                <span className="font-bold text-primary">
                                  #{employee.rank}
                                </span>
                                {employee.rank <= 3 && (
                                  <Trophy className="h-4 w-4 ml-2 text-yellow-500" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium">
                              {employee.name}
                            </td>
                            <td className="py-3 px-4">{employee.department}</td>
                            <td className="py-3 px-4 text-right font-bold">
                              {employee.dailyPoints}
                            </td>
                            <td className="py-3 px-4 text-right font-bold">
                              {employee.weeklyPoints}
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quad-scores">
            <Card>
              <CardHeader>
                <CardTitle>Quad Engagement Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Name</th>
                        <th className="text-right py-3 px-4">Event Score</th>
                        <th className="text-right py-3 px-4">VE Score</th>
                        <th className="text-right py-3 px-4">Survey Score</th>
                        <th className="text-right py-3 px-4">Weighted Score</th>
                        <th className="text-left py-3 px-4">Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-12 text-center text-slate-500"
                          >
                            <div className="flex flex-col items-center space-y-3">
                              <Upload className="h-12 w-12 text-slate-300" />
                              <div>
                                <p className="font-medium">
                                  No engagement data available
                                </p>
                                <p className="text-sm">
                                  Upload your Excel engagement tracker to view
                                  quad scores
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((employee) => (
                          <tr
                            key={employee.id}
                            className="border-b hover:bg-slate-50"
                          >
                            <td className="py-3 px-4 font-medium">
                              {employee.name}
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mini-games">
            <Card>
              <CardHeader>
                <CardTitle>Mini-Game Participation Tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Week</th>
                        <th className="text-left py-3 px-4">Game Type</th>
                        <th className="text-right py-3 px-4">Participants</th>
                        <th className="text-left py-3 px-4">
                          Winning Department
                        </th>
                        <th className="text-left py-3 px-4">
                          Winning Employee
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {miniGames.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-12 text-center text-slate-500"
                          >
                            <div className="flex flex-col items-center space-y-3">
                              <Activity className="h-12 w-12 text-slate-300" />
                              <div>
                                <p className="font-medium">
                                  No mini-game data available
                                </p>
                                <p className="text-sm">
                                  Mini-game participation data will appear here
                                  when available
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        miniGames.map((game) => (
                          <tr
                            key={game.week}
                            className="border-b hover:bg-slate-50"
                          >
                            <td className="py-3 px-4 font-medium">
                              Week {game.week}
                            </td>
                            <td className="py-3 px-4">{game.gameType}</td>
                            <td className="py-3 px-4 text-right">
                              {game.participants}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">
                                {game.winningDept}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 font-medium">
                              {game.winningEmployee}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
