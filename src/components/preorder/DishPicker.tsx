import { Check, Leaf } from "lucide-react";
import type { Course, Dish, GuestKind } from "@/lib/menu";
import { COURSE_LABEL, menuFor } from "@/lib/menu";
import { cn } from "@/lib/utils";

type Props = {
  course: Course;
  selected: string;
  kind?: GuestKind;
  onSelect: (dish: Dish) => void;
};

export function DishPicker({ course, selected, kind = "adult", onSelect }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="font-display text-lg font-semibold tracking-tight">
          {COURSE_LABEL[course]}
          {kind === "child" ? " · Bambini" : ""}
        </h3>
        <div className="gold-rule flex-1" />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Choose one</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {menuFor(kind)[course].map((dish) => {

          const isSelected = selected === dish.name;
          return (
            <button
              key={dish.name}
              type="button"
              onClick={() => onSelect(dish)}
              aria-pressed={isSelected}
              className={cn(
                "group relative rounded-xl border px-4 py-3 text-left transition-all",
                isSelected
                  ? "border-accent bg-accent/10 shadow-[var(--shadow-gold)]"
                  : "border-border bg-card hover:border-accent/60 hover:bg-accent/5",
              )}
            >
              <span className="flex items-start justify-between gap-2">
                <span>
                  <span className="block text-sm font-semibold">{dish.name}</span>
                  {dish.description ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {dish.description}
                    </span>
                  ) : null}
                </span>
                {isSelected ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                ) : dish.vegetarian ? (
                  <Leaf className="mt-0.5 size-4 shrink-0 text-primary/60" aria-label="Vegetarian" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
