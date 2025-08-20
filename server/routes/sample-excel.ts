import { RequestHandler } from "express";

<<<<<<< HEAD
export const handleSampleExcelDownload: RequestHandler = (req, res) => {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Sample departments and employees with proper department structure
    const departments = [
      "Marketing",
      "Sales",
      "Engineering",
      "Design",
      "HR",
      "Finance",
      "Operations",
      "Customer Success",
      "Product",
      "Legal",
    ];

    const employees = [
      { name: "Alice Johnson", dept: "Marketing" },
      { name: "Bob Smith", dept: "Sales" },
      { name: "Carol Davis", dept: "Engineering" },
      { name: "David Wilson", dept: "Design" },
      { name: "Emma Brown", dept: "HR" },
      { name: "Frank Miller", dept: "Finance" },
      { name: "Grace Lee", dept: "Operations" },
      { name: "Henry Clark", dept: "Customer Success" },
      { name: "Isabel Rodriguez", dept: "Product" },
      { name: "Jack Thompson", dept: "Legal" },
      { name: "Kelly Anderson", dept: "Marketing" },
      { name: "Lucas White", dept: "Sales" },
      { name: "Maria Garcia", dept: "Engineering" },
      { name: "Nathan Taylor", dept: "Design" },
      { name: "Olivia Martinez", dept: "HR" },
      { name: "Peter Jackson", dept: "Finance" },
      { name: "Quinn Adams", dept: "Operations" },
      { name: "Rachel Green", dept: "Customer Success" },
      { name: "Samuel King", dept: "Product" },
      { name: "Tara Walker", dept: "Legal" },
    ];

    // Generate dates for the current quarter (Q1 2024)
    const startDate = new Date(2024, 0, 1); // January 1, 2024
    const endDate = new Date(2024, 2, 31); // March 31, 2024
    const dates: Date[] = [];
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      // Only include weekdays
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        dates.push(new Date(d));
      }
    }

    // 1. Daily VE tracker sheet
    const dailyVEData: any[] = [];
    employees.forEach((emp) => {
      dates.forEach((date, dateIndex) => {
        // Simulate engagement data with some variability
        const baseEngagement = Math.random() * 0.7 + 0.3; // 30% to 100% engagement
        const posts = Math.floor(Math.random() * 3 * baseEngagement);
        const comments = Math.floor(Math.random() * 8 * baseEngagement);
        const reactions = Math.floor(Math.random() * 15 * baseEngagement);
        const shares = Math.floor(Math.random() * 2 * baseEngagement);
        const dailyPoints =
          posts * 5 + comments * 4 + reactions * 2 + shares * 2;

        const weekNumber = Math.ceil((dateIndex + 1) / 5); // Rough week calculation

        dailyVEData.push({
          Date: date.toLocaleDateString("en-US"),
          "BU/GBU": emp.dept,
          "Employee Name": emp.name,
          "Posts Created": posts,
          "Comments Made": comments,
          "Reactions Given": reactions,
          "Posts of Others Shared": shares,
          "Daily Points": dailyPoints,
          "Week Number": weekNumber,
        });
      });
    });

    // 2. VE Weekly Summary sheet
    const weeklyData: any[] = [];
    employees.forEach((emp) => {
      const empDailyData = dailyVEData.filter(
        (d) => d["Employee Name"] === emp.name,
      );
      const totalPoints = empDailyData.reduce(
        (sum, d) => sum + d["Daily Points"],
        0,
      );
      weeklyData.push({
        "Employee Name": emp.name,
        "Sum of Daily Points": totalPoints,
        Rank: 0, // Will be filled after sorting
      });
    });

    // Sort by points and assign ranks
    weeklyData.sort(
      (a, b) => b["Sum of Daily Points"] - a["Sum of Daily Points"],
    );
    weeklyData.forEach((emp, index) => {
      emp["Rank"] = index + 1;
    });

    // 3. Quad Engagement Scores sheet
    const quadScoresData: any[] = [];
    employees.forEach((emp) => {
      const weeklyEmp = weeklyData.find((w) => w["Employee Name"] === emp.name);
      const veScore = Math.min(
        100,
        Math.floor((weeklyEmp?.["Sum of Daily Points"] || 0) / 10),
      );
      const eventScore = Math.floor(Math.random() * 40 + 60); // 60-100
      const surveyScore = Math.floor(Math.random() * 30 + 70); // 70-100
      const weightedScore =
        eventScore * 0.4 + veScore * 0.3 + surveyScore * 0.3;

      let engagementLevel = "At-Risk";
      if (weightedScore >= 85) engagementLevel = "Highly Engaged";
      else if (weightedScore >= 70) engagementLevel = "Engaged";
      else if (weightedScore >= 50) engagementLevel = "Needs Improvement";

      quadScoresData.push({
        "Employee Name": emp.name,
        "Event Participation Score (out of 100)": eventScore,
        "Viva Engage Score (out of 100)": veScore,
        "Pulse Survey Score (out of 100)": surveyScore,
        "Weighted Score": Math.round(weightedScore * 100) / 100,
        "Engagement Level": engagementLevel,
      });
    });

    // 4. Department Summary sheet (additional helpful data)
    const deptSummaryData: any[] = [];
    departments.forEach((dept) => {
      const deptEmployees = employees.filter((e) => e.dept === dept);
      const deptWeeklyData = weeklyData.filter((w) =>
        deptEmployees.some((e) => e.name === w["Employee Name"]),
      );
      const totalPoints = deptWeeklyData.reduce(
        (sum, w) => sum + w["Sum of Daily Points"],
        0,
      );
      const avgPoints =
        deptEmployees.length > 0 ? totalPoints / deptEmployees.length : 0;

      const deptQuadData = quadScoresData.filter((q) =>
        deptEmployees.some((e) => e.name === q["Employee Name"]),
      );
      const avgEngagement =
        deptQuadData.length > 0
          ? deptQuadData.reduce((sum, q) => sum + q["Weighted Score"], 0) /
            deptQuadData.length
          : 0;

      deptSummaryData.push({
        Department: dept,
        "Employee Count": deptEmployees.length,
        "Total Points": totalPoints,
        "Average Points per Employee": Math.round(avgPoints * 100) / 100,
        "Average Engagement Score": Math.round(avgEngagement * 100) / 100,
      });
    });

    // Sort department summary by total points
    deptSummaryData.sort((a, b) => b["Total Points"] - a["Total Points"]);

    // Create worksheets
    const dailyVESheet = XLSX.utils.json_to_sheet(dailyVEData);
    const weeklySheet = XLSX.utils.json_to_sheet(weeklyData);
    const quadScoresSheet = XLSX.utils.json_to_sheet(quadScoresData);
    const deptSummarySheet = XLSX.utils.json_to_sheet(deptSummaryData);

    // Add sheets to workbook with proper names
    XLSX.utils.book_append_sheet(workbook, dailyVESheet, "Daily VE tracker");
    XLSX.utils.book_append_sheet(workbook, weeklySheet, "VE Weekly Summary");
    XLSX.utils.book_append_sheet(
      workbook,
      quadScoresSheet,
      "Quad Engagement Scores",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      deptSummarySheet,
      "Department Summary",
    );

    // Set column widths for better readability
    const setColumnWidths = (sheet: XLSX.WorkSheet, widths: number[]) => {
      const cols: XLSX.ColInfo[] = widths.map((w) => ({ width: w }));
      sheet["!cols"] = cols;
    };

    setColumnWidths(dailyVESheet, [12, 15, 20, 12, 14, 14, 20, 12, 12]);
    setColumnWidths(weeklySheet, [25, 18, 8]);
    setColumnWidths(quadScoresSheet, [25, 25, 20, 22, 14, 18]);
    setColumnWidths(deptSummarySheet, [15, 12, 12, 22, 22]);

    // Generate Excel file buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Set response headers
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Sample_Engagement_Tracker_Q1_2024.xlsx",
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    // Send the file
    res.send(buffer);
  } catch (error) {
    console.error("Error generating sample Excel:", error);
    res.status(500).json({ error: "Failed to generate sample Excel file" });
=======
export const generateSampleExcel: RequestHandler = async (req, res) => {
  try {
    // URL of the uploaded bneXt_Sample_Data file
    const fileUrl =
      "https://cdn.builder.io/o/assets%2F6998cdc1e6454214abcf75bd6d5f5e00%2F8cba862a011f4b3fb6add381e1a0a3dd?alt=media&token=02904aac-7f46-4350-9d16-1a34394204d5&apiKey=6998cdc1e6454214abcf75bd6d5f5e00";

    // Create an AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
      // Fetch the file from the CDN with timeout
      const response = await fetch(fileUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "bneXt-App/1.0",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      // Get the file as a buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Set headers for file download
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="bneXt_Sample_Data.xlsx"',
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Length", buffer.length);

      // Send the buffer
      res.send(buffer);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error("Error downloading sample Excel file:", error);

    // Provide more specific error messages
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = "Request timeout - the file download took too long";
      } else {
        errorMessage = error.message;
      }
    }

    res.status(500).json({
      error: "Failed to download sample Excel file",
      message: errorMessage,
    });
>>>>>>> refs/remotes/origin/ai_main_3b24684130e3
  }
};
