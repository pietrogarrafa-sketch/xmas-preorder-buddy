import { INCLUDED_STARTER, kitchenSummary, type Guest } from "@/lib/menu";

function Block({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-widest text-accent">{title}</h4>
      <ul className="mt-2 space-y-1 text-sm">
        {rows.length === 0 ? <li className="text-muted-foreground">—</li> : null}
        {rows.map(([name, count]) => (
          <li key={name} className="flex items-baseline justify-between gap-3 border-b border-dashed border-border py-1">
            <span>{name}</span>
            <span className="font-semibold tabular-nums">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function KitchenSummary({ guests }: { guests: Guest[] }) {
  const summary = kitchenSummary(guests);

  return (
    <div className="grid gap-6 sm:grid-cols-3">
      <p className="sm:col-span-3 rounded-lg border border-accent/50 bg-accent/10 px-3 py-2 text-sm font-medium">
        {INCLUDED_STARTER.name} (incluso per tutti gli adulti):{" "}
        <span className="tabular-nums">{summary.adultCount}</span>
      </p>
      <Block title="Starters" rows={summary.starters} />
      <Block title="Mains" rows={summary.mains} />
      <Block title="Desserts" rows={summary.desserts} />
      {summary.childCount > 0 ? (
        <>
          <p className="sm:col-span-3 border-t pt-4 text-sm font-semibold">
            Menù bambini — <span className="tabular-nums">{summary.childCount}</span>
          </p>
          <Block title="Kids · Starters" rows={summary.kidsStarters} />
          <Block title="Kids · Mains" rows={summary.kidsMains} />
          <Block title="Kids · Desserts" rows={summary.kidsDesserts} />
        </>
      ) : null}
      {summary.lobsters > 0 ? (
        <p className="sm:col-span-3 text-sm font-medium">
          Half Lobster in Garlic Butter: <span className="tabular-nums">{summary.lobsters}</span>
        </p>
      ) : null}
      {summary.notes.length > 0 ? (
        <div className="sm:col-span-3">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-destructive">
            Allergies / notes
          </h4>
          <ul className="mt-2 space-y-1 text-sm">
            {summary.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
