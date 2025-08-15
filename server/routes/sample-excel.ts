import { RequestHandler } from "express";
import * as XLSX from "xlsx";

export const generateSampleExcel: RequestHandler = (req, res) => {
  try {
    // Sample data for Daily VE tracker sheet
    const dailyVEData = [
      {
        "Employee Name": "John Doe",
        "BU/GBU": "Engineering",
        "Posts Created": 5,
        "Comments Made": 12,
        "Reactions Given": 18,
        "Posts of Others Shared": 3,
        "Daily Points": 67
      },
      {
        "Employee Name": "Jane Smith",
        "BU/GBU": "Marketing",
        "Posts Created": 8,
        "Comments Made": 15,
        "Reactions Given": 25,
        "Posts of Others Shared": 5,
        "Daily Points": 90
      },
      {
        "Employee Name": "Mike Johnson",
        "BU/GBU": "Sales",
        "Posts Created": 3,
        "Comments Made": 8,
        "Reactions Given": 12,
        "Posts of Others Shared": 2,
        "Daily Points": 43
      },
      {
        "Employee Name": "Sarah Wilson",
        "BU/GBU": "HR",
        "Posts Created": 6,
        "Comments Made": 10,
        "Reactions Given": 20,
        "Posts of Others Shared": 4,
        "Daily Points": 78
      },
      {
        "Employee Name": "David Brown",
        "BU/GBU": "Engineering",
        "Posts Created": 4,
        "Comments Made": 7,
        "Reactions Given": 15,
        "Posts of Others Shared": 2,
        "Daily Points": 52
      }
    ];

    // Sample data for VE Weekly Summary sheet
    const weeklyData = [
      {
        "Employee Name": "John Doe",
        "Sum of Daily Points": 469,
        "Rank": 3
      },
      {
        "Employee Name": "Jane Smith", 
        "Sum of Daily Points": 630,
        "Rank": 1
      },
      {
        "Employee Name": "Mike Johnson",
        "Sum of Daily Points": 301,
        "Rank": 5
      },
      {
        "Employee Name": "Sarah Wilson",
        "Sum of Daily Points": 546,
        "Rank": 2
      },
      {
        "Employee Name": "David Brown",
        "Sum of Daily Points": 364,
        "Rank": 4
      }
    ];

    // Sample data for Quad Engagement Scores sheet  
    const quadData = [
      {
        "Employee Name": "John Doe",
        "Event Participation Score (out of 100)": 85,
        "Viva Engage Score (out of 100)": 78,
        "Pulse Survey Score (out of 100)": 82,
        "Weighted Score": 81.8,
        "Engagement Level": "Engaged"
      },
      {
        "Employee Name": "Jane Smith",
        "Event Participation Score (out of 100)": 92,
        "Viva Engage Score (out of 100)": 88,
        "Pulse Survey Score (out of 100)": 90,
        "Weighted Score": 90.0,
        "Engagement Level": "Highly Engaged"
      },
      {
        "Employee Name": "Mike Johnson", 
        "Event Participation Score (out of 100)": 65,
        "Viva Engage Score (out of 100)": 58,
        "Pulse Survey Score (out of 100)": 70,
        "Weighted Score": 62.8,
        "Engagement Level": "Needs Improvement"
      },
      {
        "Employee Name": "Sarah Wilson",
        "Event Participation Score (out of 100)": 88,
        "Viva Engage Score (out of 100)": 85,
        "Pulse Survey Score (out of 100)": 87,
        "Weighted Score": 86.7,
        "Engagement Level": "Highly Engaged"
      },
      {
        "Employee Name": "David Brown",
        "Event Participation Score (out of 100)": 72,
        "Viva Engage Score (out of 100)": 69,
        "Pulse Survey Score (out of 100)": 75,
        "Weighted Score": 71.4,
        "Engagement Level": "Engaged"
      }
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create worksheets
    const dailyVESheet = XLSX.utils.json_to_sheet(dailyVEData);
    const weeklySheet = XLSX.utils.json_to_sheet(weeklyData);
    const quadSheet = XLSX.utils.json_to_sheet(quadData);

    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(workbook, dailyVESheet, "Daily VE tracker");
    XLSX.utils.book_append_sheet(workbook, weeklySheet, "VE Weekly Summary");
    XLSX.utils.book_append_sheet(workbook, quadSheet, "Quad Engagement Scores");

    // Generate buffer
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });

    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename="bneXt_Sample_Data.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length);

    // Send the buffer
    res.send(buffer);

  } catch (error) {
    console.error('Error generating sample Excel file:', error);
    res.status(500).json({ 
      error: 'Failed to generate sample Excel file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
