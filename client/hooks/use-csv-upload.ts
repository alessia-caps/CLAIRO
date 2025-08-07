import { useState } from 'react';
import * as XLSX from 'xlsx';

interface UploadedData {
  dailyLogs?: any[];
  weeklyData?: any[];
  quadScores?: any[];
  miniGames?: any[];
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
  engagementLevel: 'Highly Engaged' | 'Engaged' | 'Needs Improvement' | 'At-Risk';
}

export function useCSVUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null);

  const parseExcel = async (file: File): Promise<{ [sheetName: string]: any[] }> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const result: { [sheetName: string]: any[] } = {};

    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      result[sheetName] = data;
    });

    return result;
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return data;
  };

  const calculateEngagementLevel = (weightedScore: number): 'Highly Engaged' | 'Engaged' | 'Needs Improvement' | 'At-Risk' => {
    if (weightedScore >= 85) return 'Highly Engaged';
    if (weightedScore >= 70) return 'Engaged';
    if (weightedScore >= 50) return 'Needs Improvement';
    return 'At-Risk';
  };

  const calculateDailyPoints = (posts: number, comments: number, reactions: number, shares: number): number => {
    return (posts * 5) + (comments * 4) + (reactions * 2) + (shares * 2);
  };

  const processExcelData = (sheets: { [sheetName: string]: any[] }): ParsedEmployee[] => {
    const employees: Map<string, Partial<ParsedEmployee>> = new Map();

    // Process Daily VE tracker sheet
    const dailyVETracker = sheets['Daily VE tracker'] || sheets['Daily VE Tracker'] || [];
    dailyVETracker.forEach((row: any) => {
      const employeeName = row['Employee Name'];
      if (!employeeName) return;

      const posts = parseInt(row['Posts Created'] || '0');
      const comments = parseInt(row['Comments Made'] || '0');
      const reactions = parseInt(row['Reactions Given'] || '0');
      const shares = parseInt(row['Posts of Others Shared'] || '0');
      const dailyPoints = parseInt(row['Daily Points'] || '0') || calculateDailyPoints(posts, comments, reactions, shares);

      if (!employees.has(employeeName)) {
        employees.set(employeeName, {
          name: employeeName,
          department: row['BU/GBU'] || 'Unknown',
          dailyPoints: 0,
          weeklyPoints: 0,
          rank: 0,
          eventScore: 0,
          veScore: 0,
          surveyScore: 0,
          weightedScore: 0,
          engagementLevel: 'Engaged'
        });
      }

      const employee = employees.get(employeeName)!;
      employee.dailyPoints = Math.max(employee.dailyPoints || 0, dailyPoints);
      employee.weeklyPoints = (employee.weeklyPoints || 0) + dailyPoints;
    });

    // Process VE Weekly Summary sheet
    const weeklyData = sheets['VE Weekly Summary'] || sheets['VE Weekly SUmmary'] || [];
    weeklyData.forEach((row: any) => {
      const employeeName = row['Employee Name'];
      if (!employeeName || !employees.has(employeeName)) return;

      const employee = employees.get(employeeName)!;
      employee.weeklyPoints = parseInt(row['Sum of Daily Points'] || row['Total Points'] || employee.weeklyPoints || '0');
      employee.rank = parseInt(row['Rank'] || '0');
    });

    // Process Quad Engagement Scores sheet
    const quadScores = sheets['Quad Engagement Scores'] || [];
    quadScores.forEach((row: any) => {
      const employeeName = row['Employee Name'];
      if (!employeeName) return;

      if (!employees.has(employeeName)) {
        employees.set(employeeName, {
          name: employeeName,
          department: 'Unknown',
          dailyPoints: 0,
          weeklyPoints: 0,
          rank: 0,
          eventScore: 0,
          veScore: 0,
          surveyScore: 0,
          weightedScore: 0,
          engagementLevel: 'Engaged'
        });
      }

      const employee = employees.get(employeeName)!;
      employee.eventScore = parseInt(row['Event Participation Score (out of 100)'] || '0');
      employee.veScore = parseInt(row['Viva Engage Score (out of 100)'] || '0');
      employee.surveyScore = parseInt(row['Pulse Survey Score (out of 100)'] || '0');
      employee.weightedScore = parseFloat(row['Weighted Score'] || '0');
      employee.engagementLevel = row['Engagement Level'] || calculateEngagementLevel(employee.weightedScore);
    });

    // Convert to array and add IDs
    return Array.from(employees.values()).map((emp, index) => ({
      id: `emp-${index}`,
      name: emp.name || '',
      department: emp.department || 'Unknown',
      dailyPoints: emp.dailyPoints || 0,
      weeklyPoints: emp.weeklyPoints || 0,
      rank: emp.rank || index + 1,
      eventScore: emp.eventScore || 0,
      veScore: emp.veScore || 0,
      surveyScore: emp.surveyScore || 0,
      weightedScore: emp.weightedScore || 0,
      engagementLevel: emp.engagementLevel || 'Engaged'
    })).filter(emp => emp.name); // Remove empty entries
  };

  const processUploadedData = (data: any[], dataType: string): ParsedEmployee[] => {
    if (dataType === 'daily-logs') {
      // Process daily engagement logs (CSV format)
      return data.map((row, index) => {
        const posts = parseInt(row['Posts Created'] || '0');
        const comments = parseInt(row['Comments Made'] || '0');
        const reactions = parseInt(row['Reactions Given'] || '0');
        const shares = parseInt(row['Posts of Others Shared'] || row['Shares'] || '0');
        const dailyPoints = parseInt(row['Daily Points'] || '0') || calculateDailyPoints(posts, comments, reactions, shares);

        return {
          id: `emp-${index}`,
          name: row['Employee Name'] || `Employee ${index + 1}`,
          department: row['BU/GBU'] || row['Department'] || 'Unknown',
          dailyPoints,
          weeklyPoints: dailyPoints * 7, // Estimate
          rank: index + 1,
          eventScore: Math.floor(Math.random() * 40) + 60, // Mock for now
          veScore: Math.min(100, dailyPoints * 2), // Based on engagement
          surveyScore: Math.floor(Math.random() * 30) + 70, // Mock for now
          weightedScore: 0, // Will be calculated
          engagementLevel: 'Engaged' as const
        };
      });
    }

    if (dataType === 'quad-scores') {
      // Process quad engagement scores (CSV format)
      return data.map((row, index) => {
        const eventScore = parseInt(row['Event Participation Score (out of 100)'] || row['Event Score'] || '0');
        const veScore = parseInt(row['Viva Engage Score (out of 100)'] || row['VE Score'] || '0');
        const surveyScore = parseInt(row['Pulse Survey Score (out of 100)'] || row['Survey Score'] || '0');
        const weightedScore = parseFloat(row['Weighted Score'] || '0') || (eventScore * 0.5) + (veScore * 0.3) + (surveyScore * 0.2);

        return {
          id: `emp-${index}`,
          name: row['Employee Name'] || `Employee ${index + 1}`,
          department: row['BU/GBU'] || row['Department'] || 'Unknown',
          dailyPoints: Math.floor(veScore / 2), // Estimate from VE score
          weeklyPoints: Math.floor(veScore / 2) * 7,
          rank: index + 1,
          eventScore,
          veScore,
          surveyScore,
          weightedScore,
          engagementLevel: row['Engagement Level'] || calculateEngagementLevel(weightedScore)
        };
      });
    }

    return [];
  };

  const uploadFile = async (file: File): Promise<ParsedEmployee[]> => {
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const text = await file.text();
      const data = parseCSV(text);
      
      if (data.length === 0) {
        throw new Error('No valid data found in the CSV file');
      }
      
      // Determine data type based on headers
      const headers = Object.keys(data[0]);
      let dataType = 'unknown';
      
      if (headers.includes('Posts Created') || headers.includes('Comments Made')) {
        dataType = 'daily-logs';
      } else if (headers.includes('Event Score') || headers.includes('VE Score')) {
        dataType = 'quad-scores';
      }
      
      if (dataType === 'unknown') {
        throw new Error('Unrecognized CSV format. Please ensure your CSV has the expected columns.');
      }
      
      const processedData = processUploadedData(data, dataType);
      
      setUploadedData(prev => ({
        ...prev,
        [dataType === 'daily-logs' ? 'dailyLogs' : 'quadScores']: processedData
      }));
      
      return processedData;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process the CSV file';
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
    clearData: () => setUploadedData(null)
  };
}
