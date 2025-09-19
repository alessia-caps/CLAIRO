import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type CertificationRecord } from "./CertificationUploadDialog";

interface Props {
  open: boolean;
  onOpenChange?: (v: boolean) => void;
  rows: CertificationRecord[];
  title?: string;
}

export default function MetricListDialog({ open, onOpenChange, rows, title }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title || "Records"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="text-sm text-muted-foreground">Showing {rows.length} records</div>
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Employment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.employee}-${i}`}>
                    <TableCell className="font-medium">{r.employee}{r.employeeNo ? ` (${r.employeeNo})` : ""}</TableCell>
                    <TableCell>{r.certification}</TableCell>
                    <TableCell>{r.provider || "-"}</TableCell>
                    <TableCell>{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>{("employmentStatus" in r) ? String((r as any).employmentStatus) : "Active"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange?.(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
