import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  ChefHat,
  Copy,
  Download,
  HelpCircle,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
  Users,
  X,
} from "lucide-react";

import logo from "@/assets/lacasa-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DishPicker } from "@/components/preorder/DishPicker";
import { SteakDialog } from "@/components/preorder/SteakDialog";
import { KitchenSummary } from "@/components/preorder/KitchenSummary";
import {
  DEPOSIT_PER_PERSON,
  INCLUDED_STARTER,
  EMPTY_BOOKING,
  LOBSTER_SUPPLEMENT,
  PRICE_PER_CHILD,
  PRICE_PER_PERSON,
  SERVICE_DATE_LABEL,
  formatMoney,
  guestPrice,
  isChild,
  mainLabel,
  orderTotal,
  type Booking,
  type CookingLevel,
  type Dish,
  type Guest,
  type GuestKind,
} from "@/lib/menu";
import { downloadOrderPdf, orderAsText, shareOrderPdf } from "@/lib/order-export";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "La Casa · Christmas Day Pre-Order 2026" },
      {
        name: "description",
        content:
          "Take Christmas Day pre-orders at La Casa: guest-by-guest menu choices, allergies, totals, kitchen sheet and PDF export.",
      },
      { property: "og:title", content: "La Casa · Christmas Day Pre-Order 2026" },
      {
        property: "og:description",
        content:
          "Christmas Day set menu pre-order tool: per-guest choices, kitchen production sheet and one-tap PDF.",
      },
    ],
  }),
  component: PreOrderPage,
});

const STORAGE_KEY = "lacasa-christmas-preorder-2026";

type Draft = {
  name: string;
  kind: GuestKind;
  starter: string;
  main: string;
  dessert: string;
  cooking?: CookingLevel | undefined;
  lobster: boolean;
  notes: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  kind: "adult",
  starter: "",
  main: "",
  dessert: "",
  cooking: undefined,
  lobster: false,
  notes: "",
};


function PreOrderPage() {
  const [booking, setBooking] = useState<Booking>(EMPTY_BOOKING);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [steakDish, setSteakDish] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Restore any work in progress so a refresh never loses an order.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { booking?: Booking; guests?: Guest[] };
        if (parsed.booking) setBooking({ ...EMPTY_BOOKING, ...parsed.booking });
        if (Array.isArray(parsed.guests)) setGuests(parsed.guests);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ booking, guests }));
  }, [booking, guests, loaded]);

  const total = useMemo(() => orderTotal(guests), [guests]);
  const draftReady = Boolean(draft.name.trim() && draft.starter && draft.main && draft.dessert);

  const setField = (key: keyof Booking) => (value: string) =>
    setBooking((b) => ({ ...b, [key]: value }));

  const pickDish = (course: "starter" | "main" | "dessert") => (dish: Dish) => {
    if (course === "main") {
      if (dish.steak) {
        setSteakDish(dish.name);
        return;
      }
      setDraft((d) => ({
        ...d,
        main: d.main === dish.name ? "" : dish.name,
        cooking: undefined,
        lobster: false,
      }));
      return;
    }
    setDraft((d) => ({ ...d, [course]: d[course] === dish.name ? "" : dish.name }));
  };

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
  };

  const saveGuest = () => {
    if (!draftReady) {
      toast.error("Add a guest name and one dish from each course.");
      return;
    }
    const payload: Guest = {
      id: editingId ?? crypto.randomUUID(),
      name: draft.name.trim(),
      kind: draft.kind,
      starter: draft.starter,
      main: draft.main,
      dessert: draft.dessert,
      cooking: draft.kind === "child" ? undefined : draft.cooking,
      lobster: draft.kind === "child" ? false : draft.lobster,
      notes: draft.notes.trim() || undefined,
    };

    setGuests((list) =>
      editingId ? list.map((g) => (g.id === editingId ? payload : g)) : [...list, payload],
    );
    toast.success(editingId ? `${payload.name} updated` : `${payload.name} added to the order`);
    resetDraft();
  };

  const editGuest = (guest: Guest) => {
    setEditingId(guest.id);
    setDraft({
      name: guest.name,
      kind: guest.kind ?? "adult",
      starter: guest.starter,
      main: guest.main,
      dessert: guest.dessert,
      cooking: guest.cooking,
      lobster: Boolean(guest.lobster),
      notes: guest.notes ?? "",
    });

    document.getElementById("guest-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const removeGuest = (guest: Guest) => {
    setGuests((list) => list.filter((g) => g.id !== guest.id));
    if (editingId === guest.id) resetDraft();
    toast(`${guest.name} removed`);
  };

  const duplicateGuest = (guest: Guest) => {
    setGuests((list) => [
      ...list,
      { ...guest, id: crypto.randomUUID(), name: `${guest.name} (2)` },
    ]);
  };

  const clearAll = () => {
    setGuests([]);
    setBooking(EMPTY_BOOKING);
    resetDraft();
    toast("Order cleared");
  };

  const requireGuests = () => {
    if (guests.length === 0) {
      toast.error("Add at least one guest first.");
      return false;
    }
    return true;
  };

  const handlePdf = async () => {
    if (!requireGuests()) return;
    try {
      await downloadOrderPdf(booking, guests);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not generate the PDF. Please try again.");
    }
  };

  const handleCopy = async () => {
    if (!requireGuests()) return;
    await navigator.clipboard.writeText(orderAsText(booking, guests));
    toast.success("Order copied to clipboard");
  };

  const handleWhatsApp = async () => {
    if (!requireGuests()) return;
    try {
      const result = await shareOrderPdf(booking, guests, orderAsText(booking, guests));
      toast.success(
        result === "shared"
          ? "PDF ready to send on WhatsApp"
          : "PDF downloaded — attach it in WhatsApp",
      );
    } catch {
      toast.error("Could not share the PDF. Please try again.");
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-8 sm:px-6">
      <header className="text-center">
        <img src={logo.url} alt="La Casa restaurant" className="mx-auto h-20 w-auto object-contain" />
        <h1 className="script-title mt-4 text-5xl sm:text-6xl">Christmas Day 2026</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.35em] text-muted-foreground">
          {SERVICE_DATE_LABEL}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.35em] text-muted-foreground">
          {formatMoney(PRICE_PER_PERSON)} pp · {formatMoney(PRICE_PER_CHILD)} bambini
        </p>

        <div className="gold-rule mx-auto mt-5 w-40" />
        <Button
          variant="ghost"
          size="sm"
          className="no-print mt-3 text-muted-foreground"
          onClick={() => setHelpOpen(true)}
        >
          <HelpCircle /> How it works
        </Button>
      </header>

      {/* BOOKING */}
      <section className="mt-8 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="size-5 text-accent" /> Booking details
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Customer name">
            <Input
              value={booking.customerName}
              onChange={(e) => setField("customerName")(e.target.value)}
              placeholder="e.g. Mr Rossi"
            />
          </Field>
          <Field label="Phone">
            <Input
              type="tel"
              value={booking.phone}
              onChange={(e) => setField("phone")(e.target.value)}
              placeholder="07…"
            />
          </Field>
          <Field label="Date">
            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
              {SERVICE_DATE_LABEL}
            </div>
          </Field>

          <Field label="Time">
            <Input type="time" value={booking.time} onChange={(e) => setField("time")(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={booking.email}
              onChange={(e) => setField("email")(e.target.value)}
              placeholder="name@email.com"
            />
          </Field>
          <Field label="Table notes">
            <Input
              value={booking.tableNotes}
              onChange={(e) => setField("tableNotes")(e.target.value)}
              placeholder="High chair, birthday cake…"
            />
          </Field>
        </div>
      </section>

      {/* GUEST BUILDER */}
      <section
        id="guest-builder"
        className="mt-6 scroll-mt-6 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="size-5 text-accent" />
            {editingId ? "Edit guest" : `Guest ${guests.length + 1}`}
          </h2>
          {editingId ? (
            <Button variant="ghost" size="sm" onClick={resetDraft}>
              <X /> Cancel edit
            </Button>
          ) : null}
        </div>

        <div className="mt-4">
          <Field label="Menu">
            <div className="inline-flex rounded-lg border p-1">
              {(["adult", "child"] as GuestKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() =>
                    setDraft((d) =>
                      d.kind === k
                        ? d
                        : { ...d, kind: k, starter: "", main: "", dessert: "", cooking: undefined, lobster: false },
                    )
                  }
                  aria-pressed={draft.kind === k}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    draft.kind === k ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  }`}
                >
                  {k === "adult"
                    ? `Adulto · ${formatMoney(PRICE_PER_PERSON)}`
                    : `Bambino · ${formatMoney(PRICE_PER_CHILD)}`}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Guest name">
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Guest name"
            />
          </Field>
          <Field label="Allergies / special requests">
            <Textarea
              rows={1}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Nut allergy, no garlic…"
              className="min-h-10"
            />
          </Field>
        </div>

        <div className="mt-6 space-y-6">
          {draft.kind === "adult" ? (
            <div className="rounded-xl border border-accent/50 bg-accent/10 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-accent">Included for everyone</p>
              <p className="mt-1 text-sm font-semibold">{INCLUDED_STARTER.name}</p>
              <p className="text-xs text-muted-foreground">{INCLUDED_STARTER.description}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-accent/50 bg-accent/10 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-accent">Children's menu</p>
              <p className="mt-1 text-sm font-semibold">
                {formatMoney(PRICE_PER_CHILD)} per child · below 12 years old
              </p>
            </div>
          )}
          <DishPicker
            course="starter"
            kind={draft.kind}
            selected={draft.starter}
            onSelect={pickDish("starter")}
          />
          <DishPicker course="main" kind={draft.kind} selected={draft.main} onSelect={pickDish("main")} />

          {draft.main && (draft.cooking || draft.lobster) ? (
            <button
              type="button"
              onClick={() => setSteakDish(draft.main)}
              className="w-full rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-left text-sm"
            >
              {draft.cooking ? `Cooked ${draft.cooking}` : "Cooking not set"}
              {draft.lobster ? ` · + Half Lobster (+£${LOBSTER_SUPPLEMENT})` : ""} — tap to change
            </button>
          ) : null}
          <DishPicker
            course="dessert"
            kind={draft.kind}
            selected={draft.dessert}
            onSelect={pickDish("dessert")}
          />
        </div>


        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={saveGuest} disabled={!draftReady} size="lg">
            <Plus /> {editingId ? "Save changes" : "Add guest"}
          </Button>
          <Button variant="outline" size="lg" onClick={() => setDraft({ ...EMPTY_DRAFT, name: draft.name })}>
            <RotateCcw /> Clear choices
          </Button>
        </div>
      </section>

      {/* SUMMARY */}
      {guests.length > 0 ? (
        <>
          <section className="mt-6 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <ul className="mt-4 space-y-3">
              {guests.map((guest, index) => (
                <li key={guest.id} className="rounded-xl border bg-parchment/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-base font-semibold">
                        {index + 1}. {guest.name}
                        {isChild(guest) ? (
                          <span className="ml-2 rounded-full border border-accent/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent">
                            Bambino
                          </span>
                        ) : null}
                      </p>
                      <dl className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                        <div>Antipasti: {guest.starter}</div>
                        <div>Secondo: {mainLabel(guest)}</div>
                        <div>Dolce: {guest.dessert}</div>
                        {guest.notes ? (
                          <div className="text-destructive">Notes: {guest.notes}</div>
                        ) : null}
                      </dl>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{formatMoney(guestPrice(guest))}</p>
                      <div className="no-print mt-2 flex gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit guest" onClick={() => editGuest(guest)}>
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Duplicate guest"
                          onClick={() => duplicateGuest(guest)}
                        >
                          <Copy />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove guest"
                          onClick={() => removeGuest(guest)}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-5 space-y-1 border-t pt-4 text-sm">
              <Row
                label="Covers"
                value={`${guests.length} (${guests.filter((g) => !isChild(g)).length} adulti, ${guests.filter(isChild).length} bambini)`}
              />
              <Row label="Total" value={formatMoney(total)} strong />
              <Row
                label={`Deposit due (${formatMoney(DEPOSIT_PER_PERSON)} pp)`}
                value={formatMoney(guests.length * DEPOSIT_PER_PERSON)}
              />
            </div>
          </section>

          <section className="mt-6 rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ChefHat className="size-5 text-accent" /> Kitchen production sheet
            </h2>
            <div className="mt-4">
              <KitchenSummary guests={guests} />
            </div>
          </section>

          <div className="no-print mt-6 flex flex-wrap gap-2">
            <Button size="lg" onClick={handlePdf}>
              <Download /> Download PDF
            </Button>
            <Button size="lg" variant="outline" onClick={handleWhatsApp}>
              Send on WhatsApp
            </Button>
            <Button size="lg" variant="outline" onClick={handleCopy}>
              <Copy /> Copy order
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            <Button size="lg" variant="ghost" onClick={clearAll}>
              <Trash2 /> Clear all
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No guests added yet — build the first guest above.
        </p>
      )}

      {/* Sticky total bar */}
      {guests.length > 0 ? (
        <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {guests.length} {guests.length === 1 ? "guest" : "guests"}
            </span>
            <span className="font-display text-lg font-semibold">{formatMoney(total)}</span>
            <Button onClick={handlePdf}>
              <Download /> PDF
            </Button>
          </div>
        </div>
      ) : null}

      <SteakDialog
        open={Boolean(steakDish)}
        dishName={steakDish ?? ""}
        initialCooking={draft.main === steakDish ? draft.cooking : undefined}
        initialLobster={draft.main === steakDish ? draft.lobster : false}
        onCancel={() => setSteakDish(null)}
        onConfirm={(cooking, lobster) => {
          setDraft((d) => ({ ...d, main: steakDish ?? d.main, cooking, lobster }));
          setSteakDish(null);
        }}
      />

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">How to take a pre-order</DialogTitle>
            <DialogDescription>
              {SERVICE_DATE_LABEL} — {formatMoney(PRICE_PER_PERSON)} per person,{" "}
              {formatMoney(PRICE_PER_CHILD)} per child.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>Fill in the booking details (customer, time, contact) — the date is always 25 December.</li>
            <li>Choose Adulto or Bambino, then pick one Antipasto, one Secondo and one Dolce.</li>
            <li>Enter a guest name, then pick one Antipasto, one Secondo and one Dolce.</li>
            <li>
              For Filetto di Manzo choose the cooking temperature; Half Lobster in Garlic Butter can be
              added for +£{LOBSTER_SUPPLEMENT}.
            </li>
            <li>Note any allergies — they appear highlighted on the kitchen sheet.</li>
            <li>Add the guest and repeat. You can edit, duplicate or remove any guest later.</li>
            <li>Download the PDF (customer order + kitchen sheet), or send it by WhatsApp.</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            The order is saved on this device automatically, so a refresh will not lose your work.
          </p>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-semibold" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
