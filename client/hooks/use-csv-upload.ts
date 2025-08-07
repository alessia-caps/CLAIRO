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

  const processUploadedData = (data: any[], dataType: string): ParsedEmployee[] => {
    if (dataType === 'daily-logs') {
      // Process daily engagement logs
      return data.map((row, index) => {
        const posts = parseInt(row['Posts Created'] || '0');
        const comments = parseInt(row['Comments Made'] || '0');
        const reactions = parseInt(row['Reactions Given'] || '0');
        const shares = parseInt(row['Shares'] || '0');
        const dailyPoints = calculateDailyPoints(posts, comments, reactions, shares);
        
        return {
          id: `emp-${index}`,
          name: row['Employee Name'] || `Employee ${index + 1}`,
          department: row['Department'] || 'Unknown',
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
      // Process quad engagement scores
      return data.map((row, index) => {
        const eventScore = parseInt(row['Event Score'] || '0');
        const veScore = parseInt(row['VE Score'] || '0');
        const surveyScore = parseInt(row['Survey Score'] || '0');
        const weightedScore = (eventScore * 0.5) + (veScore * 0.3) + (surveyScore * 0.2);
        
        return {
          id: `emp-${index}`,
          name: row['Employee Name'] || `Employee ${index + 1}`,
          department: row['Department'] || 'Unknown',
          dailyPoints: Math.floor(veScore / 2), // Estimate from VE score
          weeklyPoints: Math.floor(veScore / 2) * 7,
          rank: index + 1,
          eventScore,
          veScore,
          surveyScore,
          weightedScore,
          engagementLevel: calculateEngagementLevel(weightedScore)
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
