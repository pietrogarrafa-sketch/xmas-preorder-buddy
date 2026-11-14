import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Copy, Lock, Printer, ReceiptText, Users } from "lucide-react";

import logo from "@/assets/lacasa-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPreorders, type SavedGuest, type SavedPreorder } from "@/lib/preorders.functions";
import { formatMoney } from "@/lib/menu";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "La Casa · Saved Christmas Pre-Orders" },
      {
        name: "description",
        content: "Staff-only ledger of Christmas Day pre-orders taken at La Casa.",
      },
      { property: "og:title", content: "La Casa · Saved Christmas Pre-Orders" },
      {
        property: "og:description",
        content: "Staff-only ledger of Christmas Day pre-orders taken at La Casa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

function guestLine(g: SavedGuest) {
  const extras = [g.cooking, g.lobster ? "+ Half Lobster" : null].filter(Boolean);
  const main = extras.length ? `${g.main} (${extras.join(", ")})` : g.main;
  return `${g.starter} · ${main} · ${g.dessert}`;
}

function orderAsText(order: SavedPreorder) {
  const lines = [
    `LA CASA · CHRISTMAS DAY PRE-ORDER`,
    `Taken ${new Date(order.created_at).toLocaleString("en-GB")}`,
    `${order.customer_name} · ${order.service_time}`,
    [order.phone, order.email].filter(Boolean).join(" · "),
    `Table notes: ${order.table_notes || "—"}`,
    "",
    ...order.guests.map(
      (g, i) =>
        `${i + 1}. ${g.name}${g.kind === "child" ? " (child)" : ""} — ${guestLine(g)}${
          g.notes ? ` | NOTES: ${g.notes}` : ""
        }`,
    ),
    "",
    `Covers: ${order.guest_count} (${order.adult_count} adults, ${order.child_count} children)`,
    `Total: ${formatMoney(order.total_amount)} · Deposit: ${formatMoney(order.deposit_amount)}`,
  ];
  return lines.filter((l) => l !== undefined).join("\n");
}

function OrdersPage() {
  const [passcode, setPasscode] = useState("");
  const [orders, setOrders] = useState<SavedPreorder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    if (!passcode.trim()) {
      toast.error("Enter the staff passcode.");
      return;
    }
    setLoading(true);
    try {
      const result = await listPreorders({ data: { passcode: passcode.trim() } });
      if (!result.ok) {
        setOrders(null);
        toast.error("Wrong passcode — try again.");
        return;
      }
      setOrders(result.orders);
      setOpen(result.orders[0]?.id ?? null);
      toast.success(`${result.orders.length} saved ${result.orders.length === 1 ? "order" : "orders"}`);
    } catch {
      toast.error("Could not load the orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totals = orders
    ? {
        covers: orders.reduce((s, o) => s + o.guest_count, 0),
        total: orders.reduce((s, o) => s + o.total_amount, 0),
        deposit: orders.reduce((s, o) => s + o.deposit_amount, 0),
      }
    : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:px-6">
      <header className="text-center">
        <img src={logo.url} alt="La Casa restaurant" className="mx-auto h-16 w-auto object-contain" />
        <h1 className="script-title mt-3 text-4xl sm:text-5xl">Saved Pre-Orders</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.35em] text-muted-foreground">
          Christmas Day 2026 · staff only
        </p>
        <div className="gold-rule mx-auto mt-5 w-40" />
      </header>

      <section className="mt-8 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Lock className="size-5 text-accent" /> Staff passcode
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Passcode"
            className="max-w-xs"
          />
          <Button onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Show orders"}
          </Button>
          {orders ? (
            <Button variant="outline" onClick={() => setOrders(null)}>
              Hide
            </Button>
          ) : null}
        </div>
      </section>

      {orders && totals ? (
        <>
          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            <Stat label="Orders" value={String(orders.length)} />
            <Stat label="Covers" value={String(totals.covers)} />
            <Stat label="Total booked" value={formatMoney(totals.total)} />
          </section>

          <div className="no-print mt-6 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(orders.map(orderAsText).join("\n\n"));
                toast.success("All orders copied to clipboard");
              }}
            >
              <Copy /> Copy all
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
          </div>

          <ul className="mt-6 space-y-3">
            {orders.map((order) => {
              const isOpen = open === order.id;
              return (
                <li key={order.id} className="rounded-2xl border bg-card shadow-[var(--shadow-card)]">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : order.id)}
                    className="flex w-full flex-wrap items-start justify-between gap-3 p-5 text-left"
                  >
                    <div>
                      <p className="font-display text-base font-semibold">
                        {order.customer_name}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {order.service_time}
                        </span>
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleString("en-GB")} ·{" "}
                        {order.guest_count} covers ({order.adult_count} adults,{" "}
                        {order.child_count} children)
                      </p>
                      {order.table_notes ? (
                        <p className="mt-1 text-sm text-destructive">Table: {order.table_notes}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">{formatMoney(order.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          deposit {formatMoney(order.deposit_amount)}
                        </p>
                      </div>
                      <ChevronDown
                        className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="border-t px-5 py-4">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        Contact
                      </p>
                      <p className="mt-1 text-sm">
                        {[order.phone, order.email].filter(Boolean).join(" · ") || "—"}
                      </p>
                      <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
                        Guests
                      </p>
                      <ul className="mt-1 divide-y">
                        {order.guests.map((g, i) => (
                          <li key={g.id ?? i} className="py-2 text-sm">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="font-medium">
                                {i + 1}. {g.name}
                                {g.kind === "child" ? " (child)" : ""}
                              </span>
                              <ReceiptText className="size-3.5 shrink-0 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground">{guestLine(g)}</p>
                            {g.notes ? <p className="text-destructive">Notes: {g.notes}</p> : null}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3"
                        onClick={async () => {
                          await navigator.clipboard.writeText(orderAsText(order));
                          toast.success("Order copied");
                        }}
                      >
                        <Copy /> Copy this order
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {orders && orders.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No pre-orders saved yet.
        </p>
      ) : null}

      <p className="no-print mt-10 text-center text-xs text-muted-foreground">
        <Link to="/" className="underline underline-offset-4 hover:text-accent">
          Back to the pre-order form
        </Link>
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 text-center shadow-[var(--shadow-card)]">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
