import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ChartFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  selectionLabel: string;
  count: number;
  onApplyHere: () => void;
  onGoToInventory: () => void;
  onClear: () => void;
}

export function ChartFilterDialog({
  open,
  onOpenChange,
  title,
  description,
  selectionLabel,
  count,
  onApplyHere,
  onGoToInventory,
  onClear,
}: ChartFilterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Selected:</span> {selectionLabel}
          </div>
          <div className="text-sm text-muted-foreground">
            Matching items: {count}
          </div>
        </div>
        <DialogFooter>
          <div className="flex gap-2 w-full justify-end">
            <Button variant="secondary" onClick={onClear}>
              Clear
            </Button>
            <Button variant="outline" onClick={onApplyHere}>
              Apply here
            </Button>
            <Button onClick={onGoToInventory}>View in Inventory</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
