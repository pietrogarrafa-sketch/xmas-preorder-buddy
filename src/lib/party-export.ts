import {
  PRICE_PER_PERSON,
  formatDate,
  formatMoney,
  kitchenSummary,
  mainLabel,
  orderTotal,
  type Booking,
  type Guest,
} from "./menu-party";

function bookingLines(booking: Booking, guests: Guest[]) {
  return [
    `Customer: ${booking.customerName || "-"}`,
    `Date: ${formatDate(booking.date)}   Time: ${booking.time || "-"}`,
    `Phone: ${booking.phone || "-"}`,
    `Email: ${booking.email || "-"}`,
    `Covers: ${guests.length}`,
    booking.tableNotes ? `Table notes: ${booking.tableNotes}` : null,
  ].filter(Boolean) as string[];
}

export function orderAsText(booking: Booking, guests: Guest[]) {
  const total = orderTotal(guests);
  const lines: string[] = [
    "LA CASA — CHRISTMAS PARTY PRE-ORDER 2026",
    "",
    ...bookingLines(booking, guests),
    "",
    "GUESTS",
  ];

  guests.forEach((g, i) => {
    lines.push(
      `${i + 1}. ${g.name} — ${formatMoney(PRICE_PER_PERSON)}`,
    );
    lines.push(`   Starter: ${g.starter}`);
    lines.push(`   Main: ${mainLabel(g)}`);
    lines.push(`   Dessert: ${g.dessert}`);
    if (g.notes?.trim()) lines.push(`   Notes: ${g.notes.trim()}`);
  });


  lines.push("", `TOTAL: ${formatMoney(total)}`);

  return lines.join("\n");
}

/* ---------------------------------------------------------------------------
 * Shared design language with the on-screen / printable page:
 * parchment paper, forest green, gold rules, serif display type.
 * ------------------------------------------------------------------------- */
const PARCHMENT: [number, number, number] = [250, 246, 235];
const FOREST: [number, number, number] = [26, 71, 50];
const GOLD: [number, number, number] = [178, 138, 62];
const GOLD_SOFT: [number, number, number] = [219, 197, 150];
const CRANBERRY: [number, number, number] = [141, 34, 38];
const INK: [number, number, number] = [46, 52, 47];
const MUTED: [number, number, number] = [122, 124, 112];

/** Selectable Christmas looks for the printed place cards. */
export const PLACE_CARD_THEMES = [
  {
    id: "classic",
    name: "Classic parchment",
    description: "Green crown band, gold frame and snowfall — matches the order pages.",
  },
  {
    id: "midnight",
    name: "Midnight forest",
    description: "Deep green card with gold stars and the La Casa logo in gold.",
  },
  {
    id: "minimal",
    name: "Ivory & logo",
    description: "Quiet ivory card with the restaurant logo crest and a fine gold rule.",
  },
] as const;

export type PlaceCardTheme = (typeof PLACE_CARD_THEMES)[number]["id"];

let logoCache: { dataUrl: string; width: number; height: number } | null | undefined;

/** Loads the restaurant logo as a data URL so jsPDF can embed it. */
async function loadLogo() {
  if (logoCache !== undefined) return logoCache;
  try {
    const logo = (await import("@/assets/lacasa-logo-transparent.png.asset.json"))
      .default as { url: string };
    const res = await fetch(logo.url);
    if (!res.ok) throw new Error("logo fetch failed");
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    logoCache = { dataUrl, ...size };
  } catch {
    logoCache = null;
  }
  if (!logoCache) throw new Error("Restaurant logo unavailable. Please try again.");
  return logoCache;
}

async function buildOrderPdf(
  booking: Booking,
  guests: Guest[],
  theme: PlaceCardTheme = "classic",
) {

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 54;
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  let y = margin;

  /** Snowflake / star mark used as a repeating decorative motif. */
  const star = (x: number, cy: number, r: number, colour: [number, number, number], w = 0.6) => {
    doc.setDrawColor(...colour);
    doc.setLineWidth(w);
    for (let i = 0; i < 3; i += 1) {
      const a = (Math.PI / 3) * i;
      doc.line(x - Math.cos(a) * r, cy - Math.sin(a) * r, x + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  };

  /** Small holly / fir sprig. */
  const sprig = (x: number, cy: number, scale = 1) => {
    doc.setFillColor(...FOREST);
    doc.ellipse(x - 6 * scale, cy, 7 * scale, 2.6 * scale, "F");
    doc.ellipse(x + 6 * scale, cy - 1 * scale, 7 * scale, 2.6 * scale, "F");
    doc.setFillColor(...CRANBERRY);
    doc.circle(x - 2 * scale, cy + 4.5 * scale, 2.4 * scale, "F");
    doc.circle(x + 2.6 * scale, cy + 4.5 * scale, 2.4 * scale, "F");
    doc.circle(x + 0.3 * scale, cy + 8.5 * scale, 2.4 * scale, "F");
  };

  /** Parchment page + double gold frame, matching the card styling on screen. */
  const dressPage = () => {
    doc.setFillColor(...PARCHMENT);
    doc.rect(0, 0, width, height, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1.2);
    doc.rect(28, 28, width - 56, height - 56);
    doc.setDrawColor(...GOLD_SOFT);
    doc.setLineWidth(0.5);
    doc.rect(34, 34, width - 68, height - 68);
    star(width / 2, 28, 5, GOLD, 0.8);
    star(width / 2, height - 28, 5, GOLD, 0.8);
  };

  const newPage = () => {
    doc.addPage();
    dressPage();
    y = margin + 6;
  };

  dressPage();

  const line = (
    text: string,
    size = 10.5,
    style: "normal" | "bold" | "italic" = "normal",
    gap = 15,
    colour: [number, number, number] = INK,
    font: "helvetica" | "times" = "helvetica",
  ) => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);
    for (const chunk of doc.splitTextToSize(text, width - margin * 2) as string[]) {
      if (y > height - margin) newPage();
      doc.text(chunk, margin, y);
      y += gap;
    }
  };

  /** Letter-spaced small-caps section label with a gold hairline. */
  const sectionLabel = (text: string) => {
    if (y > height - margin - 30) newPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...GOLD);
    doc.text(text.toUpperCase(), margin, y, { charSpace: 2.4 });
    const w = doc.getTextWidth(text.toUpperCase()) + text.length * 2.4;
    doc.setDrawColor(...GOLD_SOFT);
    doc.setLineWidth(0.5);
    doc.line(margin + w + 10, y - 3, width - margin, y - 3);
    y += 18;
  };

  const rule = (soft = false) => {
    doc.setDrawColor(...(soft ? GOLD_SOFT : GOLD));
    doc.setLineWidth(soft ? 0.5 : 0.8);
    doc.line(margin, y, width - margin, y);
    y += 18;
  };

  /** Centres letter-spaced text properly (jsPDF ignores charSpace when centring). */
  const centredSpaced = (text: string, cx: number, ty: number, charSpace: number) => {
    const w = doc.getTextWidth(text) + charSpace * Math.max(0, text.length - 1);
    doc.text(text, cx - w / 2, ty, { charSpace });
  };

  /** Masthead reproducing the on-screen header. */
  const masthead = (title: string, subtitle: string) => {
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...GOLD);
    centredSpaced("RISTORANTE", width / 2, y, 3);
    y += 30;
    doc.setFont("times", "bold");
    doc.setFontSize(34);
    doc.setTextColor(...FOREST);
    doc.text("La Casa", width / 2, y, { align: "center" });
    y += 12;
    sprig(width / 2, y + 2, 0.9);
    y += 26;
    doc.setFont("times", "italic");
    doc.setFontSize(17);
    doc.setTextColor(...GOLD);
    doc.text(title, width / 2, y, { align: "center" });
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    centredSpaced(subtitle.toUpperCase(), width / 2, y, 2.6);
    y += 22;
    rule();
  };

  masthead("Christmas Party Pre-Order 2026", formatDate(booking.date));

  sectionLabel("Booking");
  bookingLines(booking, guests).forEach((l) => line(l));
  y += 6;

  sectionLabel("Guest orders");
  guests.forEach((g, i) => {
    if (y > height - margin - 74) newPage();
    line(`${i + 1}. ${g.name} — ${formatMoney(PRICE_PER_PERSON)}`, 13, "bold", 17, FOREST, "times");
    [`Starter: ${g.starter}`, `Main: ${mainLabel(g)}`, `Dessert: ${g.dessert}`].forEach(t => line(t, 9.5, "normal", 13));
    if (g.notes) line(`Notes: ${g.notes}`, 9.5, "bold", 13, CRANBERRY);
    y += 12;
  });

  if (y > height - margin - 70) newPage();
  rule();
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...FOREST);
  doc.text("Total", margin, y + 4);
  doc.setTextColor(...GOLD);
  doc.text(formatMoney(orderTotal(guests)), width - margin, y + 4, { align: "right" });
  y += 24;
  // ---------------------------------------------------------------- Kitchen
  newPage();
  masthead("Kitchen Production Sheet", `${formatDate(booking.date)} · ${guests.length} covers`);
  line(`${booking.customerName || "Booking"} — ${booking.time || "-"}`, 10.5, "italic", 20, MUTED, "times");

  const summary = kitchenSummary(guests);
  const block = (title: string, rows: [string, number][]) => {
    sectionLabel(title);
    if (!rows.length) line("—", 10.5, "normal", 15, MUTED);
    rows.forEach(([name, count]) => {
      if (y > height - margin) newPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...FOREST);
      doc.text(`${count}`.padStart(2, " "), margin + 6, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...INK);
      for (const chunk of doc.splitTextToSize(name, width - margin * 2 - 30) as string[]) {
        if (y > height - margin) newPage();
        doc.text(chunk, margin + 30, y); y += 15;
      }
    });
    y += 6;
  };

  block("Starters", summary.starters);
  block("Mains", summary.mains);
  block("Desserts", summary.desserts);
  if (summary.notes.length) {
    sectionLabel("Allergies / notes");
    summary.notes.forEach((n) => line(n, 10, "bold", 14, CRANBERRY));
  }

  // -------------------------------------------------------- Place cards
  const cardGap = 16;
  const cardWidth = (width - margin * 2 - cardGap) / 2;
  const cardHeight = (height - margin * 2 - cardGap) / 2;

  const fir = (cx: number, baseY: number, h: number, colour: [number, number, number] = FOREST) => {
    doc.setFillColor(...colour);
    const w = h * 0.55;
    for (let i = 0; i < 3; i += 1) {
      const tierTop = baseY - h + (h / 3) * i;
      const tierW = (w * (i + 1.4)) / 3;
      doc.triangle(cx, tierTop, cx - tierW, tierTop + h / 2.4, cx + tierW, tierTop + h / 2.4, "F");
    }
    doc.setFillColor(...GOLD);
    doc.circle(cx, baseY - h - 2, 1.8, "F");
  };

  const cardText = (
    text: string,
    x: number,
    top: number,
    maxWidth: number,
    size: number,
    style: "normal" | "bold" | "italic" = "normal",
    colour: [number, number, number] = INK,
    font: "helvetica" | "times" = "helvetica",
  ) => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...colour);
    const chunks = doc.splitTextToSize(text, maxWidth) as string[];
    chunks.forEach((chunk, index) => doc.text(chunk, x, top + index * (size + 3.4)));
    return top + chunks.length * (size + 3.4);
  };

  const logo = await loadLogo();
  const drawLogo = (cx: number, cy: number, boxWidth: number) => {
    if (!logo) return false;
    const w = boxWidth;
    const h = (logo.height / logo.width) * w;
    doc.addImage(logo.dataUrl, "PNG", cx - w / 2, cy - h / 2, w, h, undefined, "FAST");
    return true;
  };

  const menuLines = (guest: Guest) =>
    [
      `Starter · ${guest.starter}`,
      `Main · ${mainLabel(guest)}`,
      `Dessert · ${guest.dessert}`,
    ].filter(Boolean) as string[];

  guests.forEach((guest, index) => {
    const dark = theme === "midnight";
    if (index % 4 === 0) {
      doc.addPage();
      doc.setFillColor(...(dark ? FOREST : PARCHMENT));
      doc.rect(0, 0, width, height, "F");
    }
    const slot = index % 4;
    const x = margin + (slot % 2) * (cardWidth + cardGap);
    const top = margin + Math.floor(slot / 2) * (cardHeight + cardGap);
    const centre = top + cardHeight / 2;
    const displayName = guest.name || `Guest ${index + 1}`;
    const textX = x + 24;
    const textWidth = cardWidth - 48;

    const foldGuide = () => {
      doc.setDrawColor(...(theme === "midnight" ? GOLD : GOLD_SOFT));
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([3, 4], 0);
      doc.line(x + 14, centre, x + cardWidth - 14, centre);
      doc.setLineDashPattern([], 0);
    };

    const surface = dark ? FOREST : PARCHMENT;
    const ink = dark ? PARCHMENT : INK;
    doc.setFillColor(...surface);
    doc.setDrawColor(...(theme === "minimal" ? GOLD_SOFT : GOLD));
    doc.setLineWidth(0.8);
    doc.roundedRect(x, top, cardWidth, cardHeight, 6, 6, "FD");
    if (theme !== "minimal") {
      for (let i = 0; i < 9; i++) star(x + 18 + (i * 43 % (cardWidth - 36)), top + 18 + (i * 29 % 55), 2.5, GOLD_SOFT);
      doc.setDrawColor(...GOLD_SOFT);
      doc.rect(x + 6, top + 6, cardWidth - 12, cardHeight - 12);
    }
    // All designs embed the original restaurant logo on an ivory plaque for contrast.
    doc.setFillColor(...PARCHMENT);
    doc.roundedRect(x + cardWidth / 2 - 57, top + 16, 114, 48, 4, 4, "F");
    drawLogo(x + cardWidth / 2, top + 40, 98);
    doc.setFont("times", "bolditalic");
    let nameSize = 25;
    let nameLines: string[] = [];
    do {
      doc.setFontSize(nameSize);
      nameLines = doc.splitTextToSize(displayName, cardWidth - 40) as string[];
      if (nameLines.length * (nameSize + 2) <= 68) break;
      nameSize -= 1;
    } while (nameSize > 9);
    doc.setTextColor(...ink);
    const nameTop = top + 90;
    nameLines.forEach((name, n) => doc.text(name, x + cardWidth / 2, nameTop + n * (nameSize + 2), { align: "center" }));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...(dark ? GOLD_SOFT : MUTED));
    doc.text(`Christmas Party · ${formatDate(booking.date)}`, x + cardWidth / 2, centre - 12, { align: "center" });
    foldGuide();
    const texts = [...menuLines(guest), ...(guest.notes ? [`Notes: ${guest.notes}`] : [])];
    let size = 9;
    let wrapped: string[][] = [];
    do {
      doc.setFont("helvetica", "normal"); doc.setFontSize(size);
      wrapped = texts.map(text => doc.splitTextToSize(text, textWidth) as string[]);
      if (wrapped.reduce((sum, lines) => sum + lines.length * (size + 3.4) + 2, 0) <= cardHeight / 2 - 48) break;
      size -= 0.25;
    } while (size > 5);
    let cardY = centre + 22;
    texts.forEach((text, n) => {
      cardY = cardText(text, textX, cardY, textWidth, size, n === texts.length - 1 && guest.notes ? "bold" : "normal", n === texts.length - 1 && guest.notes ? (dark ? GOLD_SOFT : CRANBERRY) : ink);
      cardY += 2;
    });
    if (theme !== "minimal") fir(x + 26, top + cardHeight - 20, 18, dark ? GOLD_SOFT : FOREST);
    doc.setFont("times", "italic"); doc.setFontSize(10); doc.setTextColor(...GOLD);
    doc.text("Merry Christmas", x + cardWidth / 2, top + cardHeight - 18, { align: "center" });

  });


  const safeName = (booking.customerName || "order").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return { doc, filename: `lacasa-christmas-party-${safeName}.pdf` };
}

export async function downloadOrderPdf(
  booking: Booking,
  guests: Guest[],
  theme: PlaceCardTheme = "classic",
) {
  const { doc, filename } = await buildOrderPdf(booking, guests, theme);
  doc.save(filename);
}

export async function orderPdfFile(
  booking: Booking,
  guests: Guest[],
  theme: PlaceCardTheme = "classic",
) {
  const { doc, filename } = await buildOrderPdf(booking, guests, theme);
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
