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
import { COOKING_LEVELS, LOBSTER_SUPPLEMENT, type CookingLevel } from "@/lib/menu";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  dishName: string;
  initialCooking?: CookingLevel;
  initialLobster?: boolean;
  onCancel: () => void;
  onConfirm: (cooking: CookingLevel, lobster: boolean) => void;
};

export function SteakDialog({
  open,
  dishName,
  initialCooking,
  initialLobster,
  onCancel,
  onConfirm,
}: Props) {
  const [cooking, setCooking] = useState<CookingLevel | undefined>(initialCooking);
  const [lobster, setLobster] = useState(Boolean(initialLobster));

  useEffect(() => {
    if (open) {
      setCooking(initialCooking);
      setLobster(Boolean(initialLobster));
    }
  }, [open, initialCooking, initialLobster]);

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
              <button
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
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setLobster((v) => !v)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors",
              lobster ? "border-accent bg-accent/10" : "border-border bg-card hover:border-accent/60",
            )}
          >
            <span className="font-medium">Add Half Lobster in Garlic Butter</span>
            <span className="font-semibold text-accent">+£{LOBSTER_SUPPLEMENT}</span>
          </button>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!cooking} onClick={() => cooking && onConfirm(cooking, lobster)}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
