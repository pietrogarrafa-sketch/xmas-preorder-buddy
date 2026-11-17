import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { COOKING_LEVELS, SAUCES, type CookingLevel, type Sauce } from "@/lib/menu-party";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  dishName: string;
  initialCooking?: CookingLevel | undefined;
  initialSauce?: Sauce | undefined;
  onCancel: () => void;
  onConfirm: (cooking: CookingLevel, sauce: Sauce) => void;
};

export function SteakDialog({
  open,
  dishName,
  initialCooking,
  initialSauce,
  onCancel,
  onConfirm,
}: Props) {
  const [cooking, setCooking] = useState<CookingLevel | undefined>(initialCooking);
  const [sauce, setSauce] = useState<Sauce | undefined>(initialSauce);

  useEffect(() => {
    if (open) {
      setCooking(initialCooking);
      setSauce(initialSauce);
    }
  }, [open, initialCooking, initialSauce]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{dishName}</DialogTitle>
          <DialogDescription>Confirm how the guest would like it cooked.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COOKING_LEVELS.map((level) => (
              <Button variant="outline" aria-pressed={cooking === level}
                key={level}
                type="button"
                onClick={() => setCooking(level)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  cooking === level
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-card hover:border-accent/60",
                )}
              >
                {level}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">{SAUCES.map(value => <Button key={value} variant={sauce === value ? "default" : "outline"} aria-pressed={sauce === value} onClick={() => setSauce(value)}>{value}</Button>)}</div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!cooking || !sauce} onClick={() => cooking && sauce && onConfirm(cooking, sauce)}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
