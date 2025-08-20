import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useCSVUpload } from "@/hooks/use-csv-upload";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";

interface CSVUploadDialogProps {
  onDataUploaded: (data: any[], weeklyAnalysis?: any[]) => void;
  trigger?: React.ReactNode;
}

export function CSVUploadDialog({
  onDataUploaded,
  trigger,
}: CSVUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { uploadFile, isUploading, uploadError, uploadedData, clearError } =
    useCSVUpload();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (
      !file.name.endsWith(".csv") &&
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".xls")
    ) {
      return;
    }

    try {
      const result = await uploadFile(file);
      console.log("Upload completed. Result:", result);
      onDataUploaded(result.employees, result.weeklyAnalysis);
      setOpen(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary" />
            Upload Excel Engagement Tracker
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Expected Format Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Expected Excel sheets with proper department mapping:</strong>
              <ul className="mt-2 space-y-1 text-xs">
                <li>
                  • <strong>Daily VE tracker:</strong> Date, BU/GBU (or Department/Business Unit/Team), Employee Name, Posts Created, Comments Made, Reactions Given, Posts of Others Shared, Daily Points, Week Number
                </li>
                <li>
                  • <strong>VE Weekly Summary:</strong> Employee Name, Sum of Daily Points, Rank
                </li>
                <li>
                  • <strong>Quad Engagement Scores:</strong> Employee Name, Event Participation Score (out of 100), Viva Engage Score (out of 100), Pulse Survey Score (out of 100), Weighted Score, Engagement Level
                </li>
              </ul>
              <p className="mt-2 text-xs text-accent">
                💡 The system will auto-detect departments from BU/GBU, Department, Business Unit, or Team columns and cross-reference employee data across all sheets for consistency.
              </p>
            </AlertDescription>
          </Alert>

          {/* Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${dragActive ? "border-primary bg-primary/5" : "border-slate-300 hover:border-primary/50"}
              ${isUploading ? "pointer-events-none opacity-50" : ""}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("excel-upload")?.click()}
          >
            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-slate-400" />
              <div>
                <p className="text-sm font-medium">Drop your Excel file here</p>
                <p className="text-xs text-slate-600">
                  Supports .xlsx and .csv files
                </p>
              </div>
            </div>
          </div>

          <Input
            id="excel-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Loading State */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing Excel file...</span>
                <span>Please wait</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}

          {/* Error State */}
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{uploadError}</span>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  <X className="h-3 w-3" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Sample Data Link */}
          <div className="text-center">
            <Button
              variant="link"
              size="sm"
              className="text-xs"
              onClick={() => {
                window.open('/api/sample-excel', '_blank');
              }}
            >
              Download Sample Excel Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
