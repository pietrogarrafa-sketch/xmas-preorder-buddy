import {
  DEPOSIT_PER_PERSON,
  INCLUDED_STARTER,
  SERVICE_DATE_LABEL,
  formatMoney,
  guestPrice,
  isChild,
  kitchenSummary,
  mainLabel,
  orderTotal,
  type Booking,
  type Guest,
} from "./menu";

function bookingLines(booking: Booking, guests: Guest[]) {
  const children = guests.filter(isChild).length;
  return [
    `Customer: ${booking.customerName || "-"}`,
    `Date: ${SERVICE_DATE_LABEL}   Time: ${booking.time || "-"}`,
    `Phone: ${booking.phone || "-"}`,
    `Email: ${booking.email || "-"}`,
    `Covers: ${guests.length} (${guests.length - children} adults, ${children} children)`,
    booking.tableNotes ? `Table notes: ${booking.tableNotes}` : null,
  ].filter(Boolean) as string[];
}

export function orderAsText(booking: Booking, guests: Guest[]) {
  const total = orderTotal(guests);
  const adults = guests.filter((g) => !isChild(g)).length;
  const lines: string[] = [
    "LA CASA — CHRISTMAS DAY PRE-ORDER 2026",
    "",
    ...bookingLines(booking, guests),
    "",
    `INCLUDED FOR ALL ADULTS: ${INCLUDED_STARTER.name} x ${adults}`,
    "",
    "GUESTS",
  ];

  guests.forEach((g, i) => {
    lines.push(
      `${i + 1}. ${g.name}${isChild(g) ? " (child)" : ""} — ${formatMoney(guestPrice(g))}`,
    );
    lines.push(`   Antipasti: ${g.starter}`);
    lines.push(`   Secondo: ${mainLabel(g)}`);
    lines.push(`   Dolce: ${g.dessert}`);
    if (g.notes?.trim()) lines.push(`   Notes: ${g.notes.trim()}`);
  });


  lines.push("", `TOTAL: ${formatMoney(total)}`);
  lines.push(`Deposit due (${formatMoney(DEPOSIT_PER_PERSON)} pp): ${formatMoney(guests.length * DEPOSIT_PER_PERSON)}`);
  return lines.join("\n");
}

async function buildOrderPdf(booking: Booking, guests: Guest[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth();
  let y = margin;

  const line = (text: string, size = 11, style: "normal" | "bold" = "normal", gap = 16) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    for (const chunk of doc.splitTextToSize(text, width - margin * 2) as string[]) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(chunk, margin, y);
      y += gap;
    }
  };

  const rule = () => {
    doc.setDrawColor(180, 150, 80);
    doc.line(margin, y, width - margin, y);
    y += 18;
  };

  doc.setTextColor(120, 90, 30);
  line("La Casa", 26, "bold", 28);
  doc.setTextColor(40, 40, 40);
  line("Christmas Day Pre-Order 2026", 13, "bold", 22);
  rule();

  bookingLines(booking, guests).forEach((l) => line(l));
  y += 8;
  rule();

  line("Guest Orders", 14, "bold", 22);
  guests.forEach((g, i) => {
    line(
      `${i + 1}. ${g.name}${isChild(g) ? "  (child)" : ""}  —  ${formatMoney(guestPrice(g))}`,
      12,
      "bold",
      16,
    );
    line(`Antipasti: ${g.starter}`);
    line(`Secondo: ${mainLabel(g)}`);
    line(`Dolce: ${g.dessert}`);
    if (g.notes?.trim()) line(`Notes: ${g.notes.trim()}`);
    y += 6;
  });

  rule();
  line(`Total: ${formatMoney(orderTotal(guests))}`, 13, "bold", 18);
  line(`Deposit due (${formatMoney(DEPOSIT_PER_PERSON)} per person): ${formatMoney(guests.length * DEPOSIT_PER_PERSON)}`);

  // Kitchen page
  doc.addPage();
  y = margin;
  line("Kitchen Production Sheet", 18, "bold", 26);
  line(`${booking.customerName || "Booking"} — ${SERVICE_DATE_LABEL} ${booking.time} — ${guests.length} covers`, 11, "normal", 22);
  rule();

  const summary = kitchenSummary(guests);
  const block = (title: string, rows: [string, number][]) => {
    line(title.toUpperCase(), 12, "bold", 18);
    if (!rows.length) line("—");
    rows.forEach(([name, count]) => line(`${count} x  ${name}`));
    y += 8;
  };

  line(`${summary.adultCount} x  ${INCLUDED_STARTER.name} (included for all adults)`, 11, "bold", 18);
  y += 8;
  block("Antipasti", summary.starters);
  block("Secondi", summary.mains);
  block("Dolci", summary.desserts);
  if (summary.childCount) {
    line(`CHILDREN'S MENU — ${summary.childCount} children`, 12, "bold", 20);
    block("Kids starters", summary.kidsStarters);
    block("Kids mains", summary.kidsMains);
    block("Kids desserts", summary.kidsDesserts);
  }
  if (summary.lobsters) line(`${summary.lobsters} x  Half Lobster in Garlic Butter (extra)`, 11, "bold", 18);

  if (summary.notes.length) {
    y += 8;
    line("ALLERGIES / NOTES", 12, "bold", 18);
    summary.notes.forEach((n) => line(n));
  }

  const safeName = (booking.customerName || "order").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return { doc, filename: `lacasa-christmas-preorder-${safeName}.pdf` };
}

export async function downloadOrderPdf(booking: Booking, guests: Guest[]) {
  const { doc, filename } = await buildOrderPdf(booking, guests);
  doc.save(filename);
}

export async function orderPdfFile(booking: Booking, guests: Guest[]) {
  const { doc, filename } = await buildOrderPdf(booking, guests);
  const blob = doc.output("blob") as Blob;
  return new File([blob], filename, { type: "application/pdf" });
}

export function canSharePdf(file: File) {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  return Boolean(typeof nav.share === "function" && nav.canShare?.({ files: [file] }));
}

/**
 * Shares an already-built PDF. Must be called directly from the click handler
 * (no awaits before it) or the browser drops the user gesture and share() fails.
 */
export async function sharePdfFile(file: File, text: string) {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    // Some WhatsApp targets drop the attachment when text is also present.
    try {
      await nav.share({ files: [file], title: "La Casa — Christmas Pre-Order" });
      return "shared" as const;
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return "cancelled" as const;
      throw err;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  return "fallback" as const;
}
