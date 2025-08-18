import { useState } from "react";
import * as XLSX from "xlsx";

interface UploadedData {
  dailyLogs?: any[];
  weeklyData?: any[];
  quadScores?: any[];
  miniGames?: any[];
  weeklyAnalysis?: WeeklyAnalysis[];
}

interface DailyActivity {
  id: string;
  date: Date;
  dateString: string;
  week: number;
  year: number;
  employeeName: string;
  department: string;
  postsCreated: number;
  commentsMade: number;
  reactionsGiven: number;
  postsShared: number;
  dailyPoints: number;
}

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

interface ParsedEmployee {
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
  activities?: DailyActivity[];
}

export function useCSVUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null);

  // Utility functions for date handling
  const parseDate = (dateString: string | number): Date | null => {
    if (!dateString) return null;

    // Handle Excel date serial numbers
    if (typeof dateString === "number") {
      // Excel dates are stored as days since January 1, 1900
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(
        excelEpoch.getTime() + (dateString - 1) * 24 * 60 * 60 * 1000,
      );
      console.log(
        `Parsed Excel serial date ${dateString} to:`,
        date.toISOString(),
      );
      return date;
    }

    const dateStr = dateString.toString().trim();
    console.log(`Parsing date string: "${dateStr}"`);

    // Try different date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{1,2}-\d{1,2}-\d{4}$/, // M-D-YYYY
      /^[A-Za-z]+ \d{1,2}, \d{4}$/, // April 28, 2025
      /^\d{1,2}\/\d{1,2}\/\d{2}$/, // M/D/YY
    ];

    try {
      // First try direct parsing
      const date = new Date(dateStr);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
        console.log(
          `Successfully parsed date "${dateStr}" to:`,
          date.toISOString(),
        );
        return date;
      }

      // Try parsing MM/DD/YYYY format specifically
      const mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mmddyyyy) {
        const [, month, day, year] = mmddyyyy;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        );
        if (!isNaN(date.getTime())) {
          console.log(
            `Parsed MM/DD/YYYY date "${dateStr}" to:`,
            date.toISOString(),
          );
          return date;
        }
      }

      // Try parsing DD/MM/YYYY format
      const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        );
        if (!isNaN(date.getTime())) {
          console.log(
            `Parsed DD/MM/YYYY date "${dateStr}" to:`,
            date.toISOString(),
          );
          return date;
        }
      }
    } catch (error) {
      console.warn("Could not parse date:", dateStr, error);
    }

    console.log(`Failed to parse date: "${dateStr}"`);
    return null;
  };

  const getWeekNumber = (date: Date): { week: number; year: number } => {
    const tempDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const dayOfWeek = tempDate.getDay();
    tempDate.setDate(
      tempDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1),
    );
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return { week: weekNumber, year: tempDate.getFullYear() };
  };

  const getWeekBounds = (
    weekNumber: number,
    year: number,
  ): { start: Date; end: Date } => {
    const yearStart = new Date(year, 0, 1);
    const weekStart = new Date(
      yearStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000,
    );
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    return { start: weekStart, end: weekEnd };
  };

  const parseExcel = async (
    file: File,
  ): Promise<{ [sheetName: string]: any[] }> => {
    try {
      const buffer = await file.arrayBuffer();

      // Check if buffer is valid and not empty
      if (!buffer || buffer.byteLength === 0) {
        throw new Error(
          "The uploaded file is empty or corrupted. Please try uploading a different file.",
        );
      }

      // Check if file size is reasonable (not too large)
      if (buffer.byteLength > 50 * 1024 * 1024) {
        // 50MB limit
        throw new Error(
          "File is too large. Please upload a file smaller than 50MB.",
        );
      }

      const workbook = XLSX.read(buffer, { type: "array" });
      const result: { [sheetName: string]: any[] } = {};

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error(
          "No sheets found in the Excel file. Please ensure it's a valid Excel file.",
        );
      }

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        if (worksheet) {
          const data = XLSX.utils.sheet_to_json(worksheet);
          result[sheetName] = data;
        }
      });

      return result;
    } catch (error) {
      if (error instanceof Error) {
        // Check for specific XLSX errors
        if (
          error.message.includes("Bad compressed size") ||
          error.message.includes("unsupported compression")
        ) {
          throw new Error(
            "The Excel file appears to be corrupted or in an unsupported format. Please try re-saving the file as .xlsx and upload again.",
          );
        }
        if (error.message.includes("not a valid zip file")) {
          throw new Error(
            "The file is not a valid Excel format. Please ensure you're uploading a .xlsx or .xls file.",
          );
        }
        throw error;
      }
      throw new Error(
        "Failed to read the Excel file. Please ensure it's a valid Excel file and try again.",
      );
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const data = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      return row;
    });

    return data;
  };

  const calculateEngagementLevel = (
    weightedScore: number,
  ): "Highly Engaged" | "Engaged" | "Needs Improvement" | "At-Risk" => {
    if (weightedScore >= 85) return "Highly Engaged";
    if (weightedScore >= 70) return "Engaged";
    if (weightedScore >= 50) return "Needs Improvement";
    return "At-Risk";
  };

  const calculateDailyPoints = (
    posts: number,
    comments: number,
    reactions: number,
    shares: number,
  ): number => {
    return posts * 5 + comments * 4 + reactions * 2 + shares * 2;
  };

  const processDailyActivities = (sheets: {
    [sheetName: string]: any[];
  }): DailyActivity[] => {
    const activities: DailyActivity[] = [];

    // Try multiple possible sheet names
    const possibleSheetNames = [
      "Daily VE tracker",
      "Daily VE Tracker",
      "DailyVETracker",
      "Daily Tracker",
      "Daily",
      "Sheet1", // fallback for generic sheet names
    ];

    let dailyVETracker: any[] = [];
    let foundSheetName = "";

    for (const sheetName of possibleSheetNames) {
      if (sheets[sheetName] && sheets[sheetName].length > 0) {
        dailyVETracker = sheets[sheetName];
        foundSheetName = sheetName;
        break;
      }
    }

    console.log(
      `Found daily tracker sheet: "${foundSheetName}" with ${dailyVETracker.length} rows`,
    );

    if (dailyVETracker.length === 0) {
      console.log("Available sheets:", Object.keys(sheets));
      // If no daily tracker found, try the first sheet with data
      const firstSheetWithData = Object.keys(sheets).find(
        (name) => sheets[name].length > 0,
      );
      if (firstSheetWithData) {
        console.log(`Using first available sheet: "${firstSheetWithData}"`);
        dailyVETracker = sheets[firstSheetWithData];
        foundSheetName = firstSheetWithData;
      }
    }

    dailyVETracker.forEach((row: any, index: number) => {
      const dateStr = row["Date"] || row["date"] || row["DATE"];
      const employeeName =
        row["Employee Name"] ||
        row["employee name"] ||
        row["Name"] ||
        row["name"];
      const department = row["BU/GBU"] || row["Department"] || row["Dept"];

      console.log(
        `Row ${index}: Date="${dateStr}", Employee="${employeeName}", Dept="${department}"`,
      );

      if (!dateStr || !employeeName) {
        console.log(`Skipping row ${index}: missing date or employee name`);
        return;
      }

      const date = parseDate(dateStr);
      if (!date) {
        console.log(`Skipping row ${index}: could not parse date "${dateStr}"`);
        return;
      }

      const { week, year } = getWeekNumber(date);
      const posts = parseInt(
        row["Posts Created"] || row["posts created"] || "0",
      );
      const comments = parseInt(
        row["Comments Made"] || row["comments made"] || "0",
      );
      const reactions = parseInt(
        row["Reactions Given"] || row["reactions given"] || "0",
      );
      const shares = parseInt(
        row["Posts of Others Shared"] || row["shares"] || "0",
      );
      const dailyPoints = calculateDailyPoints(
        posts,
        comments,
        reactions,
        shares,
      );

      activities.push({
        id: `activity-${index}`,
        date,
        dateString: dateStr,
        week,
        year,
        employeeName,
        department: department || "Unknown",
        postsCreated: posts,
        commentsMade: comments,
        reactionsGiven: reactions,
        postsShared: shares,
        dailyPoints,
      });

      console.log(
        `Added activity for ${employeeName}: Week ${week}/${year}, Points: ${dailyPoints}`,
      );
    });

    console.log(`Total activities processed: ${activities.length}`);
    return activities;
  };

  const analyzeWeeklyPerformance = (
    activities: DailyActivity[],
  ): WeeklyAnalysis[] => {
    const weeklyData = new Map<string, WeeklyAnalysis>();

    activities.forEach((activity) => {
      const weekKey = `${activity.year}-W${activity.week}`;

      if (!weeklyData.has(weekKey)) {
        const { start, end } = getWeekBounds(activity.week, activity.year);
        weeklyData.set(weekKey, {
          week: activity.week,
          year: activity.year,
          weekStart: start,
          weekEnd: end,
          totalActivities: { posts: 0, comments: 0, reactions: 0, shares: 0 },
          totalPoints: 0,
          participantCount: 0,
          averagePointsPerEmployee: 0,
          topDepartment: "",
          mostActiveDay: "",
        });
      }

      const weekData = weeklyData.get(weekKey)!;
      weekData.totalActivities.posts += activity.postsCreated;
      weekData.totalActivities.comments += activity.commentsMade;
      weekData.totalActivities.reactions += activity.reactionsGiven;
      weekData.totalActivities.shares += activity.postsShared;
      weekData.totalPoints += activity.dailyPoints;
    });

    // Calculate additional metrics
    weeklyData.forEach((weekData, weekKey) => {
      const weekActivities = activities.filter(
        (a) => `${a.year}-W${a.week}` === weekKey,
      );
      const uniqueEmployees = new Set(
        weekActivities.map((a) => a.employeeName),
      );
      weekData.participantCount = uniqueEmployees.size;
      weekData.averagePointsPerEmployee =
        weekData.participantCount > 0
          ? weekData.totalPoints / weekData.participantCount
          : 0;

      // Find top department
      const deptPoints = new Map<string, number>();
      weekActivities.forEach((activity) => {
        deptPoints.set(
          activity.department,
          (deptPoints.get(activity.department) || 0) + activity.dailyPoints,
        );
      });
      const topDept = Array.from(deptPoints.entries()).reduce(
        (max, curr) => (curr[1] > max[1] ? curr : max),
        ["", 0],
      );
      weekData.topDepartment = topDept[0];

      // Find most active day
      const dayPoints = new Map<string, number>();
      weekActivities.forEach((activity) => {
        const dayKey = activity.date.toLocaleDateString();
        dayPoints.set(
          dayKey,
          (dayPoints.get(dayKey) || 0) + activity.dailyPoints,
        );
      });
      const mostActiveDay = Array.from(dayPoints.entries()).reduce(
        (max, curr) => (curr[1] > max[1] ? curr : max),
        ["", 0],
      );
      weekData.mostActiveDay = mostActiveDay[0];
    });

    return Array.from(weeklyData.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.week - a.week;
    });
  };

  const processExcelData = (sheets: {
    [sheetName: string]: any[];
  }): ParsedEmployee[] => {
    const employees: Map<string, Partial<ParsedEmployee>> = new Map();

    // Process Daily VE tracker sheet
    const dailyVETracker =
      sheets["Daily VE tracker"] || sheets["Daily VE Tracker"] || [];
    dailyVETracker.forEach((row: any) => {
      const employeeName = row["Employee Name"];
      if (!employeeName) return;

      const posts = parseInt(row["Posts Created"] || "0");
      const comments = parseInt(row["Comments Made"] || "0");
      const reactions = parseInt(row["Reactions Given"] || "0");
      const shares = parseInt(row["Posts of Others Shared"] || "0");
      const dailyPoints =
        parseInt(row["Daily Points"] || "0") ||
        calculateDailyPoints(posts, comments, reactions, shares);

      if (!employees.has(employeeName)) {
        employees.set(employeeName, {
          name: employeeName,
          department: row["BU/GBU"] || "Unknown",
          dailyPoints: 0,
          weeklyPoints: 0,
          rank: 0,
          eventScore: 0,
          veScore: 0,
          surveyScore: 0,
          weightedScore: 0,
          engagementLevel: "Engaged",
        });
      }

      const employee = employees.get(employeeName)!;
      employee.dailyPoints = Math.max(employee.dailyPoints || 0, dailyPoints);
      employee.weeklyPoints = (employee.weeklyPoints || 0) + dailyPoints;
    });

    // Process VE Weekly Summary sheet
    const weeklyData =
      sheets["VE Weekly Summary"] || sheets["VE Weekly SUmmary"] || [];
    weeklyData.forEach((row: any) => {
      const employeeName = row["Employee Name"];
      if (!employeeName || !employees.has(employeeName)) return;

      const employee = employees.get(employeeName)!;
      employee.weeklyPoints = parseInt(
        row["Sum of Daily Points"] ||
          row["Total Points"] ||
          employee.weeklyPoints ||
          "0",
      );
      employee.rank = parseInt(row["Rank"] || "0");
    });

    // Process Quad Engagement Scores sheet
    const quadScores = sheets["Quad Engagement Scores"] || [];
    quadScores.forEach((row: any) => {
      const employeeName = row["Employee Name"];
      if (!employeeName) return;

      if (!employees.has(employeeName)) {
        employees.set(employeeName, {
          name: employeeName,
          department: "Unknown",
          dailyPoints: 0,
          weeklyPoints: 0,
          rank: 0,
          eventScore: 0,
          veScore: 0,
          surveyScore: 0,
          weightedScore: 0,
          engagementLevel: "Engaged",
        });
      }

      const employee = employees.get(employeeName)!;
      employee.eventScore = parseInt(
        row["Event Participation Score (out of 100)"] || "0",
      );
      employee.veScore = parseInt(row["Viva Engage Score (out of 100)"] || "0");
      employee.surveyScore = parseInt(
        row["Pulse Survey Score (out of 100)"] || "0",
      );
      employee.weightedScore = parseFloat(row["Weighted Score"] || "0");
      employee.engagementLevel =
        row["Engagement Level"] ||
        calculateEngagementLevel(employee.weightedScore);
    });

    // Convert to array and add IDs
    return Array.from(employees.values())
      .map((emp, index) => ({
        id: `emp-${index}`,
        name: emp.name || "",
        department: emp.department || "Unknown",
        dailyPoints: emp.dailyPoints || 0,
        weeklyPoints: emp.weeklyPoints || 0,
        rank: emp.rank || index + 1,
        eventScore: emp.eventScore || 0,
        veScore: emp.veScore || 0,
        surveyScore: emp.surveyScore || 0,
        weightedScore: emp.weightedScore || 0,
        engagementLevel: emp.engagementLevel || "Engaged",
      }))
      .filter((emp) => emp.name); // Remove empty entries
  };

  const processUploadedData = (
    data: any[],
    dataType: string,
  ): ParsedEmployee[] => {
    if (dataType === "daily-logs") {
      // Process daily engagement logs (CSV format)
      return data.map((row, index) => {
        const posts = parseInt(row["Posts Created"] || "0");
        const comments = parseInt(row["Comments Made"] || "0");
        const reactions = parseInt(row["Reactions Given"] || "0");
        const shares = parseInt(
          row["Posts of Others Shared"] || row["Shares"] || "0",
        );
        const dailyPoints =
          parseInt(row["Daily Points"] || "0") ||
          calculateDailyPoints(posts, comments, reactions, shares);

        return {
          id: `emp-${index}`,
          name: row["Employee Name"] || `Employee ${index + 1}`,
          department: row["BU/GBU"] || row["Department"] || "Unknown",
          dailyPoints,
          weeklyPoints: dailyPoints * 7, // Estimate
          rank: index + 1,
          eventScore: Math.floor(Math.random() * 40) + 60, // Mock for now
          veScore: Math.min(100, dailyPoints * 2), // Based on engagement
          surveyScore: Math.floor(Math.random() * 30) + 70, // Mock for now
          weightedScore: 0, // Will be calculated
          engagementLevel: "Engaged" as const,
        };
      });
    }

    if (dataType === "quad-scores") {
      // Process quad engagement scores (CSV format)
      return data.map((row, index) => {
        const eventScore = parseInt(
          row["Event Participation Score (out of 100)"] ||
            row["Event Score"] ||
            "0",
        );
        const veScore = parseInt(
          row["Viva Engage Score (out of 100)"] || row["VE Score"] || "0",
        );
        const surveyScore = parseInt(
          row["Pulse Survey Score (out of 100)"] || row["Survey Score"] || "0",
        );
        const weightedScore =
          parseFloat(row["Weighted Score"] || "0") ||
          eventScore * 0.5 + veScore * 0.3 + surveyScore * 0.2;

        return {
          id: `emp-${index}`,
          name: row["Employee Name"] || `Employee ${index + 1}`,
          department: row["BU/GBU"] || row["Department"] || "Unknown",
          dailyPoints: Math.floor(veScore / 2), // Estimate from VE score
          weeklyPoints: Math.floor(veScore / 2) * 7,
          rank: index + 1,
          eventScore,
          veScore,
          surveyScore,
          weightedScore,
          engagementLevel:
            row["Engagement Level"] || calculateEngagementLevel(weightedScore),
        };
      });
    }

    return [];
  };

  const uploadFile = async (
    file: File,
  ): Promise<{
    employees: ParsedEmployee[];
    weeklyAnalysis?: WeeklyAnalysis[];
  }> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      let processedData: ParsedEmployee[] = [];
      let weeklyAnalysis: WeeklyAnalysis[] = [];

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        // Handle Excel files
        const sheets = await parseExcel(file);

        console.log("Excel sheets found:", Object.keys(sheets));

        if (Object.keys(sheets).length === 0) {
          throw new Error("No valid sheets found in the Excel file");
        }

        // Debug: Log sheet contents
        Object.keys(sheets).forEach((sheetName) => {
          console.log(
            `Sheet "${sheetName}" has ${sheets[sheetName].length} rows`,
          );
          if (sheets[sheetName].length > 0) {
            console.log(
              `Sample row from "${sheetName}":`,
              sheets[sheetName][0],
            );
          }
        });

        processedData = processExcelData(sheets);

        if (processedData.length === 0) {
          throw new Error(
            "No valid employee data found. Please ensure your Excel file has the expected sheets and columns.",
          );
        }

        // Process daily activities and weekly analysis
        const dailyActivities = processDailyActivities(sheets);
        console.log("Daily activities processed:", dailyActivities.length);

        weeklyAnalysis = analyzeWeeklyPerformance(dailyActivities);
        console.log(
          "Weekly analysis generated:",
          weeklyAnalysis.length,
          weeklyAnalysis,
        );

        setUploadedData((prev) => ({
          ...prev,
          dailyLogs: processedData,
          quadScores: processedData,
          weeklyAnalysis: weeklyAnalysis,
        }));
      } else if (file.name.endsWith(".csv")) {
        // Handle CSV files
        const text = await file.text();
        const data = parseCSV(text);

        if (data.length === 0) {
          throw new Error("No valid data found in the CSV file");
        }

        // Determine data type based on headers
        const headers = Object.keys(data[0]);
        let dataType = "unknown";

        if (
          headers.includes("Posts Created") ||
          headers.includes("Comments Made") ||
          headers.includes("Daily Points")
        ) {
          dataType = "daily-logs";
        } else if (
          headers.includes("Event Participation Score (out of 100)") ||
          headers.includes("Viva Engage Score (out of 100)")
        ) {
          dataType = "quad-scores";
        }

        if (dataType === "unknown") {
          throw new Error(
            "Unrecognized CSV format. Please ensure your CSV has the expected columns.",
          );
        }

        processedData = processUploadedData(data, dataType);

        setUploadedData((prev) => ({
          ...prev,
          [dataType === "daily-logs" ? "dailyLogs" : "quadScores"]:
            processedData,
        }));
      } else {
        throw new Error("Please upload an Excel (.xlsx) or CSV (.csv) file");
      }

      return { employees: processedData, weeklyAnalysis };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process the file";
      setUploadError(errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFile,
    isUploading,
    uploadError,
    uploadedData,
    clearError: () => setUploadError(null),
    clearData: () => setUploadedData(null),
  };
}
