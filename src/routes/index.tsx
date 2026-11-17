import { createFileRoute, Link } from "@tanstack/react-router";
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
import { PartyDatePicker } from "@/components/preorder/PartyDatePicker";
import { useServerFn } from "@tanstack/react-start";
import { KitchenSummary } from "@/components/preorder/KitchenSummary";
import {
  EMPTY_BOOKING,
  PRICE_PER_PERSON,
  formatDate,
  guestSchema,
  orderSchema,
  formatMoney,
  mainLabel,
  orderTotal,
  type Booking,
  type CookingLevel,
  type Dish,
  type Guest,
  type Sauce,
} from "@/lib/menu-party";
import {
  PLACE_CARD_THEMES,
  downloadOrderPdf,
  orderAsText,
  orderPdfFile,
  sharePdfFile,
  type PlaceCardTheme,
} from "@/lib/party-export";
import { savePartyPreorder as savePreorder } from "@/lib/preorders.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "La Casa · Christmas Party Pre-Order 2026" },
      {
        name: "description",
        content:
          "Take Christmas Party pre-orders at La Casa: guest-by-guest menu choices, allergies, totals, kitchen sheet and PDF export.",
      },
      { property: "og:title", content: "La Casa · Christmas Party Pre-Order 2026" },
      {
        property: "og:description",
        content:
          "Christmas Party menu pre-order tool: per-guest choices, kitchen production sheet and one-tap PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PreOrderPage,
});

const STORAGE_KEY = "lacasa-christmas-party-2026";

type Draft = {
  name: string;
  starter: string;
  main: string;
  dessert: string;
  cooking?: CookingLevel | undefined;
  sauce?: Sauce | undefined;
  pizzaName: string;
  notes: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  starter: "",
  main: "",
  dessert: "",
  cooking: undefined,
  sauce: undefined,
  pizzaName: "",
  notes: "",
};


function PreOrderPage() {
  const [booking, setBooking] = useState<Booking>(EMPTY_BOOKING);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [steakDish, setSteakDish] = useState<string | null>(null);
  const saveOrder = useServerFn(savePreorder);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [cardTheme, setCardTheme] = useState<PlaceCardTheme>("classic");

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
  const draftReady = guestSchema.safeParse({ ...draft, id: editingId ?? "00000000-0000-4000-8000-000000000001" }).success;

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
        sauce: undefined,
  pizzaName: "",
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
      starter: draft.starter,
      main: draft.main,
      dessert: draft.dessert,
      cooking: draft.cooking,
      sauce: draft.sauce,
      pizzaName: draft.pizzaName,
      notes: draft.notes.trim() || undefined,
    };

    const validGuest = guestSchema.safeParse(payload);
    if (!validGuest.success) { toast.error(validGuest.error.issues[0]?.message); return; }
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
      starter: guest.starter,
      main: guest.main,
      dessert: guest.dessert,
      cooking: guest.cooking,
      sauce: guest.sauce,
      pizzaName: guest.pizzaName ?? "",
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
      await downloadOrderPdf(booking, guests, cardTheme);
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

  const validatedOrder = () => {
    const result = orderSchema().safeParse({ booking, guests });
    if (!result.success) { toast.error(result.error.issues[0]?.message ?? "Check the order details."); return null; }
    return result.data;
  };

  const handleWhatsApp = async () => {
    if (!pdfFile || !validatedOrder()) return;
    setSending(true);
    try {
      const result = await sharePdfFile(pdfFile);
      if (result === "unsupported") toast.info("Download the PDF and attach it in WhatsApp. Your order is already saved.");
      if (result === "shared") toast.success("PDF shared");
    } catch { toast.error("Could not share the PDF. Download it and attach it manually."); }
    finally { setSending(false); }
  };

  const confirmOrder = async () => {
    const data = validatedOrder();
    if (!data) return;
    setSending(true);
    try {
      const stored = await saveOrder({ data });
      if (!stored.ok) { toast.error("Order not saved. Please try again."); return; }
      setSavedId(stored.id);
      toast.success("Christmas Party pre-order saved for the restaurant");
    } catch { toast.error("Order not saved. Check the date and booking details, then try again."); }
    finally { setSending(false); }
  };

  const openConfirm = () => {
    if (!validatedOrder()) return;
    setSavedId(null);
    setPdfFile(null);
    setPdfError(false);
    setConfirmOpen(true);
    orderPdfFile(booking, guests, cardTheme)
      .then(setPdfFile)
      .catch(() => {
        setPdfFile(null);
        setPdfError(true);
      });
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-28 pt-8 sm:px-6">
      <header className="text-center">
        <img src={logo.url} alt="La Casa restaurant" className="mx-auto h-20 w-auto object-contain" />
        <h1 className="script-title mt-4 text-5xl sm:text-6xl">Christmas Party 2026</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.35em] text-muted-foreground">
          23 November – 23 December 2026 · Available all day
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.35em] text-muted-foreground">
          {formatMoney(PRICE_PER_PERSON)} per person · 10 guests minimum
        </p>

        <div className="gold-rule mx-auto mt-5 w-40" />
        <p className="mt-3 text-sm text-destructive">Pre-order required at least 7 days in advance</p>
      </header>

      {/* BOOKING */}
      <section className="mt-8 border-t py-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="size-5 text-accent" /> Booking details
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Customer name">
            <Input
              value={booking.customerName}
              onChange={(e) => setField("customerName")(e.target.value)}
              aria-label="Customer name" maxLength={120}
              placeholder="e.g. Mr Rossi"
            />
          </Field>
          <Field label="Phone">
            <Input
              aria-label="Phone" maxLength={60}
              type="tel"
              value={booking.phone}
              onChange={(e) => setField("phone")(e.target.value)}
              placeholder="07…"
            />
          </Field>
          <Field label="Date">
            <PartyDatePicker value={booking.date} onChange={setField("date")} />
          </Field>

          <Field label="Time">
            <Input aria-label="Time" type="time" value={booking.time} onChange={(e) => setField("time")(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input
              aria-label="Email" maxLength={160}
              type="email"
              value={booking.email}
              onChange={(e) => setField("email")(e.target.value)}
              placeholder="name@email.com"
            />
          </Field>
          <Field label="Table notes">
            <Input
              aria-label="Table notes" maxLength={1000}
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
        className="mt-6 scroll-mt-6 border-t py-6"
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

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Guest name">
            <Input
              aria-label="Guest name" maxLength={80}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Guest name"
            />
          </Field>
          <Field label="Allergies / special requests">
            <Textarea
              aria-label="Allergies / special requests" maxLength={240}
              rows={1}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Nut allergy, no garlic…"
              className="min-h-10"
            />
          </Field>
        </div>

        <div className="mt-6 space-y-6">
          <DishPicker
            course="starter"
            selected={draft.starter}
            onSelect={pickDish("starter")}
          />
          <DishPicker course="main" selected={draft.main} onSelect={pickDish("main")} />

          {draft.main === "Sirloin Steak" && draft.cooking ? (
            <Button variant="outline" className="w-full justify-start" onClick={() => setSteakDish(draft.main)}>
              {draft.cooking} · {draft.sauce} <Pencil />
            </Button>
          ) : null}
          {draft.main === "Pizza of Choice" ? (
            <Field label="Pizza name (from our a la carte)">
              <Input aria-label="Pizza name" maxLength={100} value={draft.pizzaName} onChange={e => setDraft(d => ({ ...d, pizzaName: e.target.value }))} />
            </Field>
          ) : null}
          <DishPicker
            course="dessert"
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
          <section className="mt-6 border-t py-6">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <ul className="mt-4 space-y-3">
              {guests.map((guest, index) => (
                <li key={guest.id} className="rounded-lg border bg-parchment/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-base font-semibold">
                        {index + 1}. {guest.name}
                      </p>
                      <dl className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                        <div>Starter: {guest.starter}</div>
                        <div>Main: {mainLabel(guest)}</div>
                        <div>Dessert: {guest.dessert}</div>
                        {guest.notes ? (
                          <div className="text-destructive">Notes: {guest.notes}</div>
                        ) : null}
                      </dl>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{formatMoney(PRICE_PER_PERSON)}</p>
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
                value={String(guests.length)}
              />
              <Row label="Total" value={formatMoney(total)} strong />
            </div>
          </section>

          <section className="mt-6 border-t py-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ChefHat className="size-5 text-accent" /> Kitchen production sheet
            </h2>
            <div className="mt-4">
              <p className="mb-3 text-sm text-muted-foreground">Christmas Party · {formatDate(booking.date)} · {booking.time}</p>
              <KitchenSummary guests={guests} />
            </div>
          </section>

          <section className="no-print mt-6 border-t py-6">
            <h2 className="text-lg font-semibold">Place card design</h2>
            
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {PLACE_CARD_THEMES.map((t) => (
                <Button variant="outline"
                  key={t.id}
                  type="button"
                  onClick={() => setCardTheme(t.id)}
                  aria-pressed={cardTheme === t.id}
                  className={`h-auto min-w-0 flex-col items-start whitespace-normal rounded-lg border p-3 text-left transition-colors ${
                    cardTheme === t.id ? "border-accent bg-accent/10" : "hover:bg-muted/40"
                  }`}
                >
                  <span className="block font-display text-base font-semibold">{t.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{t.description}</span>
                </Button>
              ))}
            </div>
          </section>

          <div className="no-print mt-6 flex flex-wrap gap-2">
            <Button size="lg" onClick={handlePdf}>
              <Download /> Download PDF
            </Button>
            <Button size="lg" variant="outline" onClick={openConfirm}>
              Confirm pre-order
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

      {/* Confirmation before sending the pre-order */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm the pre-order</DialogTitle>
            <DialogDescription>
              Check the summary. The PDF includes the order, the kitchen sheet and the Christmas place cards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="font-medium">{booking.customerName || "Unnamed customer"}</p>
              <p className="text-muted-foreground">
                {formatDate(booking.date)}
                {booking.time ? ` · ${booking.time}` : ""}
              </p>
              {booking.phone ? <p className="text-muted-foreground">{booking.phone}</p> : null}
              {booking.email ? <p className="text-muted-foreground">{booking.email}</p> : null}
              {booking.tableNotes ? (
                <p className="mt-1 text-muted-foreground">Table notes: {booking.tableNotes}</p>
              ) : null}
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Christmas Party · {guests.length} covers
              </p>
              <ul className="mt-2 divide-y">
                {guests.map((g, i) => (
                  <li key={g.id} className="py-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">
                        {i + 1}. {g.name}
                      </span>
                      <span className="tabular-nums">{formatMoney(PRICE_PER_PERSON)}</span>
                    </div>
                    <p className="text-muted-foreground">
                      {g.starter} · {mainLabel(g)} · {g.dessert}
                    </p>
                    {g.notes?.trim() ? (
                      <p className="text-destructive">Notes: {g.notes.trim()}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-1 border-t pt-3">
              <Row label="Total" value={formatMoney(total)} strong />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={sending}>
              Back to editing
            </Button>
            {savedId ? (
              <>
                <p role="status" className="w-full break-all text-sm text-primary">Order saved · {savedId}</p>
                <Button variant="outline" onClick={handlePdf}><Download /> Download PDF</Button>
                <Button onClick={handleWhatsApp} disabled={sending || !pdfFile}>Share PDF</Button>
              </>
            ) : <Button onClick={confirmOrder} disabled={sending}>{sending ? "Saving…" : "Confirm and save pre-order"}</Button>}
            {pdfError ? <p className="text-sm text-destructive">PDF unavailable. Retry the download.</p> : null}
          </div>
        </DialogContent>
      </Dialog>

      <SteakDialog
        open={Boolean(steakDish)}
        dishName={steakDish ?? ""}
        initialCooking={draft.main === steakDish ? draft.cooking : undefined}
        initialSauce={draft.main === steakDish ? draft.sauce : undefined}
        onCancel={() => setSteakDish(null)}
        onConfirm={(cooking, sauce) => {
          setDraft((d) => ({ ...d, main: steakDish ?? d.main, cooking, sauce }));
          setSteakDish(null);
        }}
      />

      <p className="no-print mt-10 text-center text-xs text-muted-foreground">
        Restaurant staff:{" "}
        <Link to="/orders" className="underline underline-offset-4 hover:text-accent">
          view saved pre-orders
        </Link>
      </p>
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
