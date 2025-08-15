import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  TrendingUp,
  Users,
  Trophy,
  Activity,
  MessageSquare,
  Heart,
  Share,
  Target,
} from "lucide-react";

interface WeeklyAnalysis {
  week: number;
  year: number;
  weekStart: Date;
  weekEnd: Date;
  totalActivities: {
    posts: number;
    comments: number;
    reactions: number;
    shares: number;
  };
  totalPoints: number;
  participantCount: number;
  averagePointsPerEmployee: number;
  topDepartment: string;
  mostActiveDay: string;
}

interface WeeklyAnalysisProps {
  weeklyData: WeeklyAnalysis[];
}

export function WeeklyAnalysisComponent({ weeklyData }: WeeklyAnalysisProps) {
  if (!weeklyData || weeklyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Weekly Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Upload data with dates to see weekly performance analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  const mostProductiveWeek = weeklyData.reduce((max, current) =>
    current.totalPoints > max.totalPoints ? current : max,
  );

  const bestActivityWeek = {
    posts: weeklyData.reduce((max, current) =>
      current.totalActivities.posts > max.totalActivities.posts ? current : max,
    ),
    comments: weeklyData.reduce((max, current) =>
      current.totalActivities.comments > max.totalActivities.comments
        ? current
        : max,
    ),
    reactions: weeklyData.reduce((max, current) =>
      current.totalActivities.reactions > max.totalActivities.reactions
        ? current
        : max,
    ),
    shares: weeklyData.reduce((max, current) =>
      current.totalActivities.shares > max.totalActivities.shares
        ? current
        : max,
    ),
  };

  const formatWeekRange = (week: WeeklyAnalysis) => {
    const start = new Date(week.weekStart).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const end = new Date(week.weekEnd).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${start} - ${end}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Weekly Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Most Productive Week Overall */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary flex items-center">
                  <Trophy className="h-4 w-4 mr-1" />
                  Most Productive Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="outline" className="bg-primary/10">
                    Week {mostProductiveWeek.week}, {mostProductiveWeek.year}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {formatWeekRange(mostProductiveWeek)}
                  </p>
                  <div className="text-lg font-bold text-primary">
                    {mostProductiveWeek.totalPoints.toLocaleString()} points
                  </div>
                  <p className="text-xs">
                    <Users className="h-3 w-3 inline mr-1" />
                    {mostProductiveWeek.participantCount} participants
                  </p>
                  <p className="text-xs">
                    Top dept: {mostProductiveWeek.topDepartment}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Best Posts Week */}
            <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-accent-foreground flex items-center">
                  <Activity className="h-4 w-4 mr-1" />
                  Best Posts Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="outline" className="bg-accent/10">
                    Week {bestActivityWeek.posts.week},{" "}
                    {bestActivityWeek.posts.year}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {formatWeekRange(bestActivityWeek.posts)}
                  </p>
                  <div className="text-lg font-bold">
                    {bestActivityWeek.posts.totalActivities.posts} posts
                  </div>
                  <p className="text-xs">
                    {(
                      bestActivityWeek.posts.totalActivities.posts * 5
                    ).toLocaleString()}{" "}
                    points from posts
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Best Comments Week */}
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Best Comments Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="outline" className="bg-blue-100">
                    Week {bestActivityWeek.comments.week},{" "}
                    {bestActivityWeek.comments.year}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {formatWeekRange(bestActivityWeek.comments)}
                  </p>
                  <div className="text-lg font-bold text-blue-900">
                    {bestActivityWeek.comments.totalActivities.comments}{" "}
                    comments
                  </div>
                  <p className="text-xs">
                    {(
                      bestActivityWeek.comments.totalActivities.comments * 4
                    ).toLocaleString()}{" "}
                    points from comments
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Best Reactions Week */}
            <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700 flex items-center">
                  <Heart className="h-4 w-4 mr-1" />
                  Best Reactions Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="outline" className="bg-red-100">
                    Week {bestActivityWeek.reactions.week},{" "}
                    {bestActivityWeek.reactions.year}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {formatWeekRange(bestActivityWeek.reactions)}
                  </p>
                  <div className="text-lg font-bold text-red-900">
                    {bestActivityWeek.reactions.totalActivities.reactions}{" "}
                    reactions
                  </div>
                  <p className="text-xs">
                    {(
                      bestActivityWeek.reactions.totalActivities.reactions * 2
                    ).toLocaleString()}{" "}
                    points from reactions
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Best Shares Week */}
            <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700 flex items-center">
                  <Share className="h-4 w-4 mr-1" />
                  Best Shares Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="outline" className="bg-green-100">
                    Week {bestActivityWeek.shares.week},{" "}
                    {bestActivityWeek.shares.year}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {formatWeekRange(bestActivityWeek.shares)}
                  </p>
                  <div className="text-lg font-bold text-green-900">
                    {bestActivityWeek.shares.totalActivities.shares} shares
                  </div>
                  <p className="text-xs">
                    {(
                      bestActivityWeek.shares.totalActivities.shares * 2
                    ).toLocaleString()}{" "}
                    points from shares
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Overall Stats */}
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 flex items-center">
                  <Target className="h-4 w-4 mr-1" />
                  Overall Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-lg font-bold text-purple-900">
                    {weeklyData.length} weeks
                  </div>
                  <p className="text-xs">
                    Total:{" "}
                    {weeklyData
                      .reduce((sum, week) => sum + week.totalPoints, 0)
                      .toLocaleString()}{" "}
                    points
                  </p>
                  <p className="text-xs">
                    Avg per week:{" "}
                    {Math.round(
                      weeklyData.reduce(
                        (sum, week) => sum + week.totalPoints,
                        0,
                      ) / weeklyData.length,
                    ).toLocaleString()}{" "}
                    points
                  </p>
                  <p className="text-xs">
                    Peak participation:{" "}
                    {Math.max(...weeklyData.map((w) => w.participantCount))}{" "}
                    employees
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Weekly Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Week</th>
                  <th className="text-left p-2">Date Range</th>
                  <th className="text-right p-2">Total Points</th>
                  <th className="text-right p-2">Participants</th>
                  <th className="text-right p-2">Posts</th>
                  <th className="text-right p-2">Comments</th>
                  <th className="text-right p-2">Reactions</th>
                  <th className="text-right p-2">Shares</th>
                  <th className="text-left p-2">Top Dept</th>
                </tr>
              </thead>
              <tbody>
                {weeklyData.map((week, index) => (
                  <tr
                    key={`${week.year}-W${week.week}`}
                    className="border-b hover:bg-muted/50"
                  >
                    <td className="p-2 font-medium">
                      Week {week.week}, {week.year}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {formatWeekRange(week)}
                    </td>
                    <td className="p-2 text-right font-medium">
                      {week.totalPoints.toLocaleString()}
                    </td>
                    <td className="p-2 text-right">{week.participantCount}</td>
                    <td className="p-2 text-right">
                      {week.totalActivities.posts}
                    </td>
                    <td className="p-2 text-right">
                      {week.totalActivities.comments}
                    </td>
                    <td className="p-2 text-right">
                      {week.totalActivities.reactions}
                    </td>
                    <td className="p-2 text-right">
                      {week.totalActivities.shares}
                    </td>
                    <td className="p-2">{week.topDepartment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
