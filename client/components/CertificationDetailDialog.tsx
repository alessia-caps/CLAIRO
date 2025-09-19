import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CertificationRecord } from "./CertificationUploadDialog";

interface Props {
  record?: CertificationRecord | null;
  related?: CertificationRecord[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function CertificationDetailDialog({ record, related = [], trigger, open, onOpenChange }: Props) {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    // when record changes, set index to the first related item that matches record.certificationId or certification
    if (!record) return;
    const baseKey = (record.employeeNo && record.employeeNo.trim()) || record.employee;
    const list = related;
    const i = list.findIndex(r => ((r.employeeNo && r.employeeNo.trim()) || r.employee) === baseKey && ((r as any).certificationId || r.certification) === ((record as any).certificationId || record.certification));
    setIdx(i >= 0 ? i : 0);
  }, [record, related]);

  if (!record) return <></>;
  const rec = related && related.length ? related[idx] : record;

  const daysUntil = (d: Date | null | undefined) => {
    if (!d) return null;
    const start = new Date();
    const end = new Date(d);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000);
    return diff;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Certification details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Showing {idx+1} of {related.length || 1} certifications for this employee</div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIdx(i => Math.max(0, i-1))} disabled={idx <= 0}>Prev</Button>
              <Button size="sm" variant="ghost" onClick={() => setIdx(i => Math.min((related.length || 1) - 1, i+1))} disabled={idx >= (related.length || 1) - 1}>Next</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Employee</div>
              <div className="font-medium">{rec.employee} {rec.employeeNo ? `(${rec.employeeNo})` : ''}</div>

              <div className="text-xs text-muted-foreground">Department</div>
              <div>{rec.department}</div>

              <div className="text-xs text-muted-foreground">Employment Status</div>
              <Badge variant={(rec as any).employmentStatus && String((rec as any).employmentStatus).toLowerCase().includes('resigned') ? 'destructive' : 'secondary'}>{(rec as any).employmentStatus ?? 'Active'}</Badge>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Certification</div>
              <div className="font-medium">{rec.certification} { (rec as any).certificationId ? <span className="text-xs text-muted-foreground">({(rec as any).certificationId})</span> : null }</div>

              <div className="text-xs text-muted-foreground">Provider / Sheet</div>
              <div>{rec.provider}</div>

              <div className="text-xs text-muted-foreground">Type</div>
              <div>{rec.type}</div>
            </div>

            <div>
                <div className="text-xs text-muted-foreground">Issue Date</div>
                <div>{rec.issueDate ? new Date(rec.issueDate).toLocaleDateString() : '-'}</div>

                <div className="text-xs text-muted-foreground">Expiry Date</div>
                <div>
                  {rec.expiryDate ? (
                    <>
                      <div>{new Date(rec.expiryDate).toLocaleDateString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {(() => {
                          const d = daysUntil(rec.expiryDate);
                          if (d === null) return '';
                          if (d < 0) return `${Math.abs(d)} days since expiry`;
                          return `${d} days remaining`;
                        })()}
                      </div>
                    </>
                  ) : '-'}
                </div>

                <div className="text-xs text-muted-foreground">Bond</div>
                <div>
                  <div className="flex items-center gap-2">
                    {rec.companyPaid ? <Badge variant="secondary">Company paid</Badge> : <Badge variant="outline">Self</Badge>}
                    {rec.bondMonths ? <span className="text-sm">({rec.bondMonths} months)</span> : null}
                  </div>
                  {(() => {
                    const end = rec.bondEnd ?? (rec.bondStart && rec.bondMonths ? new Date(new Date(rec.bondStart).setMonth(new Date(rec.bondStart).getMonth() + rec.bondMonths)) : null);
                    const d = daysUntil(end as any);
                    if (!end) return null;
                    return <div className="text-sm text-muted-foreground">{d === null ? '' : d < 0 ? `${Math.abs(d)} days since bond end` : `${d} days remaining`}</div>;
                  })()}
                </div>
            </div>
          </div>

          {rec.remarks ? (
            <div>
              <div className="text-xs text-muted-foreground">Remarks</div>
              <div>{rec.remarks}</div>
            </div>
          ) : null}

          {related.length > 0 ? (
            <div>
              <div className="text-xs text-muted-foreground">Other certifications for this employee (click Next/Prev to navigate)</div>
              <div className="space-y-2 mt-2">
                {related.map((r, i) => (
                  <button key={i} onClick={() => setIdx(i)} className={`w-full text-left p-3 border rounded flex flex-col gap-1 ${i === idx ? 'bg-muted/20' : 'hover:bg-muted/10'}`}>
                    <div className="font-medium">{r.certification} { (r as any).certificationId ? <span className="text-xs text-muted-foreground">({(r as any).certificationId})</span> : null }</div>
                    <div className="text-sm text-muted-foreground">Provider/Sheet: {r.provider || '-'} · Type: {r.type || '-'} · Expiry: {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : '-'}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange?.(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
