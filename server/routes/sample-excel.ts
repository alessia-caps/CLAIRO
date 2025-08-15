import { RequestHandler } from "express";
import * as XLSX from "xlsx";

export const generateSampleExcel: RequestHandler = (req, res) => {
  try {
    // Sample data for Daily VE tracker sheet with date-based entries
    const dailyVEData = [
      {
        "Date": "2025-01-13",
        "BU/GBU": "Engineering",
        "Employee Name": "Doe, John",
        "Posts Created": 5,
        "Comments Made": 12,
        "Reactions Given": 18,
        "Posts of Others Shared": 3
      },
      {
        "Date": "2025-01-13",
        "BU/GBU": "Marketing",
        "Employee Name": "Smith, Jane",
        "Posts Created": 8,
        "Comments Made": 15,
        "Reactions Given": 25,
        "Posts of Others Shared": 5
      },
      {
        "Date": "2025-01-14",
        "BU/GBU": "Engineering",
        "Employee Name": "Doe, John",
        "Posts Created": 3,
        "Comments Made": 8,
        "Reactions Given": 12,
        "Posts of Others Shared": 2
      },
      {
        "Date": "2025-01-14",
        "BU/GBU": "Sales",
        "Employee Name": "Johnson, Mike",
        "Posts Created": 3,
        "Comments Made": 8,
        "Reactions Given": 12,
        "Posts of Others Shared": 2
      },
      {
        "Date": "2025-01-15",
        "BU/GBU": "HR",
        "Employee Name": "Wilson, Sarah",
        "Posts Created": 6,
        "Comments Made": 10,
        "Reactions Given": 20,
        "Posts of Others Shared": 4
      },
      {
        "Date": "2025-01-15",
        "BU/GBU": "Engineering",
        "Employee Name": "Brown, David",
        "Posts Created": 4,
        "Comments Made": 7,
        "Reactions Given": 15,
        "Posts of Others Shared": 2
      },
      {
        "Date": "2025-01-16",
        "BU/GBU": "Marketing",
        "Employee Name": "Smith, Jane",
        "Posts Created": 6,
        "Comments Made": 11,
        "Reactions Given": 20,
        "Posts of Others Shared": 3
      },
      {
        "Date": "2025-01-17",
        "BU/GBU": "Sales",
        "Employee Name": "Johnson, Mike",
        "Posts Created": 5,
        "Comments Made": 9,
        "Reactions Given": 15,
        "Posts of Others Shared": 1
      }
    ];

    // Sample data for VE Weekly Summary sheet
    const weeklyData = [
      {
        "Employee Name": "Doe, John",
        "Sum of Daily Points": 469,
        "Rank": 3
      },
      {
        "Employee Name": "Smith, Jane",
        "Sum of Daily Points": 630,
        "Rank": 1
      },
      {
        "Employee Name": "Johnson, Mike",
        "Sum of Daily Points": 301,
        "Rank": 5
      },
      {
        "Employee Name": "Wilson, Sarah",
        "Sum of Daily Points": 546,
        "Rank": 2
      },
      {
        "Employee Name": "Brown, David",
        "Sum of Daily Points": 364,
        "Rank": 4
      }
    ];

    // Sample data for Quad Engagement Scores sheet
    const quadData = [
      {
        "Employee Name": "Doe, John",
        "Event Participation Score (out of 100)": 85,
        "Viva Engage Score (out of 100)": 78,
        "Pulse Survey Score (out of 100)": 82,
        "Weighted Score": 81.8,
        "Engagement Level": "Engaged"
      },
      {
        "Employee Name": "Smith, Jane",
        "Event Participation Score (out of 100)": 92,
        "Viva Engage Score (out of 100)": 88,
        "Pulse Survey Score (out of 100)": 90,
        "Weighted Score": 90.0,
        "Engagement Level": "Highly Engaged"
      },
      {
        "Employee Name": "Johnson, Mike",
        "Event Participation Score (out of 100)": 65,
        "Viva Engage Score (out of 100)": 58,
        "Pulse Survey Score (out of 100)": 70,
        "Weighted Score": 62.8,
        "Engagement Level": "Needs Improvement"
      },
      {
        "Employee Name": "Wilson, Sarah",
        "Event Participation Score (out of 100)": 88,
        "Viva Engage Score (out of 100)": 85,
        "Pulse Survey Score (out of 100)": 87,
        "Weighted Score": 86.7,
        "Engagement Level": "Highly Engaged"
      },
      {
        "Employee Name": "Brown, David",
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
