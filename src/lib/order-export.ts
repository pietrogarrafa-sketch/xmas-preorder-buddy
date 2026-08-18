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

  // Printable Christmas place cards — four per A4 page.
  // Each card can be cut out and folded along the centre guide.
  const pageHeight = doc.internal.pageSize.getHeight();
  const cardGap = 14;
  const cardWidth = (width - margin * 2 - cardGap) / 2;
  const cardHeight = (pageHeight - margin * 2 - cardGap) / 2;

  const drawHolly = (x: number, top: number) => {
    doc.setFillColor(35, 92, 62);
    doc.ellipse(x, top, 8, 3, "F");
    doc.ellipse(x + 10, top + 1, 8, 3, "F");
    doc.setFillColor(151, 38, 45);
    doc.circle(x + 5, top + 5, 2.8, "F");
    doc.circle(x + 10, top + 5, 2.8, "F");
    doc.circle(x + 7.5, top + 9, 2.8, "F");
  };

  const cardText = (
    text: string,
    x: number,
    top: number,
    maxWidth: number,
    size: number,
    style: "normal" | "bold" = "normal",
    colour: [number, number, number] = [39, 55, 45],
  ) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);
    const chunks = doc.splitTextToSize(text, maxWidth) as string[];
    chunks.forEach((chunk, index) => doc.text(chunk, x, top + index * (size + 3)));
    return top + chunks.length * (size + 3);
  };

  guests.forEach((guest, index) => {
    if (index % 4 === 0) doc.addPage();
    const slot = index % 4;
    const col = slot % 2;
    const row = Math.floor(slot / 2);
    const x = margin + col * (cardWidth + cardGap);
    const top = margin + row * (cardHeight + cardGap);
    const centre = top + cardHeight / 2;

    doc.setFillColor(252, 249, 240);
    doc.setDrawColor(177, 139, 58);
    doc.setLineWidth(1.4);
    doc.roundedRect(x, top, cardWidth, cardHeight, 7, 7, "FD");
    doc.setFillColor(31, 83, 57);
    doc.roundedRect(x, top, cardWidth, 34, 7, 7, "F");
    doc.rect(x, top + 20, cardWidth, 14, "F");
    doc.setDrawColor(177, 139, 58);
    doc.setLineDashPattern([3, 3], 0);
    doc.line(x + 12, centre, x + cardWidth - 12, centre);
    doc.setLineDashPattern([], 0);
    drawHolly(x + cardWidth - 31, top + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(248, 239, 210);
    doc.text("LA CASA  ·  CHRISTMAS DAY 2026", x + 14, top + 21);

    doc.setFont("times", "bold");
    doc.setFontSize(21);
    doc.setTextColor(38, 83, 58);
    const displayName = guest.name || `Guest ${index + 1}`;
    const nameLines = doc.splitTextToSize(displayName, cardWidth - 34) as string[];
    nameLines.slice(0, 2).forEach((name, nameIndex) => {
      doc.text(name, x + cardWidth / 2, top + 65 + nameIndex * 23, { align: "center" });
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(151, 38, 45);
    doc.text(isChild(guest) ? "CHILDREN'S MENU" : "ADULT MENU", x + cardWidth / 2, top + 105, {
      align: "center",
    });

    let cardY = centre + 22;
    const textX = x + 16;
    const textWidth = cardWidth - 32;
    if (!isChild(guest)) {
      cardY = cardText(`Welcome: ${INCLUDED_STARTER.name}`, textX, cardY, textWidth, 8, "bold", [177, 107, 40]);
    }
    cardY = cardText(`Antipasto: ${guest.starter}`, textX, cardY + 3, textWidth, 8);
    cardY = cardText(`Secondo: ${mainLabel(guest)}`, textX, cardY + 3, textWidth, 8);
    cardY = cardText(`Dolce: ${guest.dessert}`, textX, cardY + 3, textWidth, 8);
    if (guest.notes?.trim()) {
      cardText(`NOTE: ${guest.notes.trim()}`, textX, cardY + 4, textWidth, 8, "bold", [151, 38, 45]);
    }

    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.setTextColor(177, 139, 58);
    doc.text("Buon Natale", x + cardWidth - 16, top + cardHeight - 14, { align: "right" });
  });

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
export async function sharePdfFile(file: File) {
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
  return "unsupported" as const;
}
