const XLSX = require('xlsx');
const fs = require('fs');

// Sample data based on the structure
const departments = [
  "Marketing", "Sales", "Engineering", "Design", "HR", "Finance", 
  "Operations", "Customer Success", "Product", "Legal"
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
];

const workbook = XLSX.utils.book_new();

// Daily VE tracker data
const dailyData = [];
employees.forEach(emp => {
  for (let i = 0; i < 5; i++) { // 5 days of data
    const date = new Date(2024, 0, 15 + i);
    const baseEngagement = Math.random() * 0.7 + 0.3;
    const posts = Math.floor(Math.random() * 3 * baseEngagement);
    const comments = Math.floor(Math.random() * 8 * baseEngagement);
    const reactions = Math.floor(Math.random() * 15 * baseEngagement);
    const shares = Math.floor(Math.random() * 2 * baseEngagement);
    const dailyPoints = posts * 5 + comments * 4 + reactions * 2 + shares * 2;
    
    dailyData.push({
      "Date": date.toLocaleDateString("en-US"),
      "BU/GBU": emp.dept,
      "Employee Name": emp.name,
      "Posts Created": posts,
      "Comments Made": comments,
      "Reactions Given": reactions,
      "Posts of Others Shared": shares,
      "Daily Points": dailyPoints,
      "Week Number": 3
    });
  }
});

// Weekly summary
const weeklyData = [];
employees.forEach(emp => {
  const empDailyData = dailyData.filter(d => d["Employee Name"] === emp.name);
  const totalPoints = empDailyData.reduce((sum, d) => sum + d["Daily Points"], 0);
  weeklyData.push({
    "Employee Name": emp.name,
    "Sum of Daily Points": totalPoints,
    "Rank": 0
  });
});

weeklyData.sort((a, b) => b["Sum of Daily Points"] - a["Sum of Daily Points"]);
weeklyData.forEach((emp, index) => {
  emp["Rank"] = index + 1;
});

// Quad scores
const quadData = [];
employees.forEach(emp => {
  const weeklyEmp = weeklyData.find(w => w["Employee Name"] === emp.name);
  const veScore = Math.min(100, Math.floor((weeklyEmp?.["Sum of Daily Points"] || 0) / 5));
  const eventScore = Math.floor(Math.random() * 40 + 60);
  const surveyScore = Math.floor(Math.random() * 30 + 70);
  const weightedScore = eventScore * 0.4 + veScore * 0.3 + surveyScore * 0.3;
  
  let engagementLevel = "At-Risk";
  if (weightedScore >= 85) engagementLevel = "Highly Engaged";
  else if (weightedScore >= 70) engagementLevel = "Engaged";
  else if (weightedScore >= 50) engagementLevel = "Needs Improvement";

  quadData.push({
    "Employee Name": emp.name,
    "Event Participation Score (out of 100)": eventScore,
    "Viva Engage Score (out of 100)": veScore,
    "Pulse Survey Score (out of 100)": surveyScore,
    "Weighted Score": Math.round(weightedScore * 100) / 100,
    "Engagement Level": engagementLevel
  });
});

// Create sheets
const dailySheet = XLSX.utils.json_to_sheet(dailyData);
const weeklySheet = XLSX.utils.json_to_sheet(weeklyData);
const quadSheet = XLSX.utils.json_to_sheet(quadData);

XLSX.utils.book_append_sheet(workbook, dailySheet, "Daily VE tracker");
XLSX.utils.book_append_sheet(workbook, weeklySheet, "VE Weekly Summary");
XLSX.utils.book_append_sheet(workbook, quadSheet, "Quad Engagement Scores");

XLSX.writeFile(workbook, "public/Sample_Engagement_Tracker.xlsx");
console.log("Sample Excel file generated at public/Sample_Engagement_Tracker.xlsx");
