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
    lines.push(`   Starter: ${g.starter}`);
    lines.push(`   Main: ${mainLabel(g)}`);
    lines.push(`   Dessert: ${g.dessert}`);
    if (g.notes?.trim()) lines.push(`   Notes: ${g.notes.trim()}`);
  });


  lines.push("", `TOTAL: ${formatMoney(total)}`);
  lines.push(`Deposit due (${formatMoney(DEPOSIT_PER_PERSON)} pp): ${formatMoney(guests.length * DEPOSIT_PER_PERSON)}`);
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
    const logo = (await import("@/assets/lacasa-logo.png.asset.json")).default as { url: string };
    const res = await fetch(logo.url);
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

  /** Masthead reproducing the on-screen header. */
  const masthead = (title: string, subtitle: string) => {
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...GOLD);
    doc.text("RISTORANTE", width / 2, y, { align: "center", charSpace: 3 });
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
    doc.text(subtitle.toUpperCase(), width / 2, y, { align: "center", charSpace: 2.6 });
    y += 22;
    rule();
  };

  masthead("Christmas Day Pre-Order 2026", SERVICE_DATE_LABEL);

  sectionLabel("Booking");
  bookingLines(booking, guests).forEach((l) => line(l));
  y += 6;

  sectionLabel("Included for every adult");
  line(
    `${guests.filter((g) => !isChild(g)).length} x  ${INCLUDED_STARTER.name}`,
    11,
    "bold",
    16,
    FOREST,
  );
  y += 8;

  sectionLabel("Guest orders");
  guests.forEach((g, i) => {
    if (y > height - margin - 74) newPage();
    const blockTop = y - 11;
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...FOREST);
    doc.text(`${i + 1}.  ${g.name}${isChild(g) ? "  (child)" : ""}`, margin + 12, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...GOLD);
    doc.text(formatMoney(guestPrice(g)), width - margin, y, { align: "right" });
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    [`Starter · ${g.starter}`, `Main · ${mainLabel(g)}`, `Dessert · ${g.dessert}`].forEach((t) => {
      for (const chunk of doc.splitTextToSize(t, width - margin * 2 - 24) as string[]) {
        doc.text(chunk, margin + 12, y);
        y += 13;
      }
    });
    if (g.notes?.trim()) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...CRANBERRY);
      for (const chunk of doc.splitTextToSize(
        `Note · ${g.notes.trim()}`,
        width - margin * 2 - 24,
      ) as string[]) {
        doc.text(chunk, margin + 12, y);
        y += 13;
      }
    }
    doc.setDrawColor(...GOLD_SOFT);
    doc.setLineWidth(1.4);
    doc.line(margin, blockTop, margin, y - 10);
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
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `Deposit due (${formatMoney(DEPOSIT_PER_PERSON)} per person): ${formatMoney(guests.length * DEPOSIT_PER_PERSON)}`,
    margin,
    y,
  );

  // ---------------------------------------------------------------- Kitchen
  newPage();
  masthead("Kitchen Production Sheet", `${SERVICE_DATE_LABEL} · ${guests.length} covers`);
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
      doc.text(name, margin + 30, y);
      y += 15;
    });
    y += 6;
  };

  block("Included", [[INCLUDED_STARTER.name, summary.adultCount]]);
  block("Starters", summary.starters);
  block("Mains", summary.mains);
  block("Desserts", summary.desserts);
  if (summary.childCount) {
    block(`Kids starters (${summary.childCount} children)`, summary.kidsStarters);
    block("Kids mains", summary.kidsMains);
    block("Kids desserts", summary.kidsDesserts);
  }
  if (summary.lobsters) block("Supplements", [["Half Lobster in Garlic Butter", summary.lobsters]]);
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
      !isChild(guest) ? `Welcome · ${INCLUDED_STARTER.name}` : null,
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

    if (theme === "classic") {
      // Cream panel, double gold frame, forest crown band with the logo.
      doc.setFillColor(253, 251, 244);
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(1.1);
      doc.roundedRect(x, top, cardWidth, cardHeight, 8, 8, "FD");
      doc.setDrawColor(...GOLD_SOFT);
      doc.setLineWidth(0.4);
      doc.roundedRect(x + 6, top + 6, cardWidth - 12, cardHeight - 12, 6, 6, "S");

      doc.setFillColor(...FOREST);
      doc.roundedRect(x, top, cardWidth, 30, 8, 8, "F");
      doc.rect(x, top + 18, cardWidth, 12, "F");
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.8);
      doc.line(x, top + 30, x + cardWidth, top + 30);
      doc.setFont("times", "italic");
      doc.setFontSize(10);
      doc.setTextColor(240, 231, 205);
      doc.text("La Casa  ·  Christmas Day 2026", x + cardWidth / 2, top + 20, { align: "center" });

      for (let i = 0; i < 7; i += 1) {
        star(
          x + 20 + ((i * 37) % (cardWidth - 40)),
          top + 44 + ((i * 23) % 26),
          i % 2 ? 2.6 : 3.6,
          GOLD_SOFT,
          0.45,
        );
      }

      doc.setFont("times", "bolditalic");
      doc.setFontSize(displayName.length > 18 ? 20 : 25);
      doc.setTextColor(...FOREST);
      const nameLines = doc.splitTextToSize(displayName, cardWidth - 52) as string[];
      nameLines.slice(0, 2).forEach((name, i2) => {
        doc.text(name, x + cardWidth / 2, top + 104 + i2 * 25, { align: "center" });
      });
      const underlineY = top + 104 + Math.min(nameLines.length, 2) * 25 - 8;
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.6);
      doc.line(x + cardWidth / 2 - 34, underlineY, x + cardWidth / 2 - 10, underlineY);
      doc.line(x + cardWidth / 2 + 10, underlineY, x + cardWidth / 2 + 34, underlineY);
      star(x + cardWidth / 2, underlineY, 4, GOLD, 0.7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...CRANBERRY);
      doc.text(isChild(guest) ? "CHILDREN'S MENU" : "ADULT MENU", x + cardWidth / 2, underlineY + 18, {
        align: "center",
        charSpace: 2,
      });

      foldGuide();

      let cardY = centre + 26;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...GOLD);
      doc.text("YOUR MENU", textX, cardY - 12, { charSpace: 2 });
      menuLines(guest).forEach((text, i2) => {
        cardY = cardText(text, textX, cardY + (i2 ? 4 : 0), textWidth, 8.5, i2 === 0 && !isChild(guest) ? "italic" : "normal", i2 === 0 && !isChild(guest) ? MUTED : INK);
      });
      if (guest.notes?.trim()) {
        cardY = cardText(`Note · ${guest.notes.trim()}`, textX, cardY + 5, textWidth, 8, "bold", CRANBERRY);
      }
      fir(x + 26, top + cardHeight - 22, 22);
      doc.setFont("times", "italic");
      doc.setFontSize(11);
      doc.setTextColor(...GOLD);
      doc.text("Merry Christmas", x + cardWidth - 22, top + cardHeight - 20, { align: "right" });
      return;
    }

    if (theme === "midnight") {
      // Deep forest card with a gold frame and the logo reversed out on green.
      doc.setFillColor(18, 51, 36);
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(1.2);
      doc.roundedRect(x, top, cardWidth, cardHeight, 8, 8, "FD");
      doc.setDrawColor(...GOLD_SOFT);
      doc.setLineWidth(0.4);
      doc.roundedRect(x + 7, top + 7, cardWidth - 14, cardHeight - 14, 6, 6, "S");

      for (let i = 0; i < 11; i += 1) {
        star(
          x + 18 + ((i * 53) % (cardWidth - 36)),
          top + 26 + ((i * 41) % (cardHeight / 2 - 40)),
          i % 3 ? 2.2 : 3.4,
          GOLD_SOFT,
          0.4,
        );
      }

      const hasLogo = drawLogo(x + cardWidth / 2, top + 46, Math.min(96, cardWidth * 0.42));
      if (!hasLogo) {
        doc.setFont("times", "bold");
        doc.setFontSize(16);
        doc.setTextColor(...GOLD);
        doc.text("La Casa", x + cardWidth / 2, top + 50, { align: "center" });
      }

      doc.setFont("times", "bolditalic");
      doc.setFontSize(displayName.length > 18 ? 20 : 25);
      doc.setTextColor(245, 238, 220);
      const nameLines = doc.splitTextToSize(displayName, cardWidth - 52) as string[];
      nameLines.slice(0, 2).forEach((name, i2) => {
        doc.text(name, x + cardWidth / 2, top + 108 + i2 * 25, { align: "center" });
      });
      const underlineY = top + 108 + Math.min(nameLines.length, 2) * 25 - 6;
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.6);
      doc.line(x + cardWidth / 2 - 40, underlineY, x + cardWidth / 2 + 40, underlineY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...GOLD_SOFT);
      doc.text(
        isChild(guest) ? "CHILDREN'S MENU · 25 DECEMBER 2026" : "CHRISTMAS DAY · 25 DECEMBER 2026",
        x + cardWidth / 2,
        underlineY + 16,
        { align: "center", charSpace: 1.6 },
      );

      foldGuide();

      let cardY = centre + 26;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...GOLD);
      doc.text("YOUR MENU", textX, cardY - 12, { charSpace: 2 });
      menuLines(guest).forEach((text, i2) => {
        cardY = cardText(text, textX, cardY + (i2 ? 4 : 0), textWidth, 8.5, "normal", [236, 230, 212]);
      });
      if (guest.notes?.trim()) {
        cardY = cardText(`Note · ${guest.notes.trim()}`, textX, cardY + 5, textWidth, 8, "bold", [240, 170, 170]);
      }
      fir(x + 26, top + cardHeight - 22, 22, [58, 110, 78]);
      doc.setFont("times", "italic");
      doc.setFontSize(11);
      doc.setTextColor(...GOLD);
      doc.text("Merry Christmas", x + cardWidth - 22, top + cardHeight - 20, { align: "right" });
      return;
    }

    // theme === "minimal" — quiet ivory card, thin gold hairline, logo crest.
    doc.setFillColor(255, 253, 249);
    doc.setDrawColor(...GOLD_SOFT);
    doc.setLineWidth(0.7);
    doc.roundedRect(x, top, cardWidth, cardHeight, 4, 4, "FD");

    const hasLogo = drawLogo(x + cardWidth / 2, top + 44, Math.min(88, cardWidth * 0.38));
    if (!hasLogo) {
      doc.setFont("times", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...FOREST);
      doc.text("La Casa", x + cardWidth / 2, top + 48, { align: "center" });
    }

    doc.setFont("times", "normal");
    doc.setFontSize(displayName.length > 18 ? 21 : 26);
    doc.setTextColor(...INK);
    const nameLines = doc.splitTextToSize(displayName, cardWidth - 52) as string[];
    nameLines.slice(0, 2).forEach((name, i2) => {
      doc.text(name, x + cardWidth / 2, top + 110 + i2 * 25, { align: "center" });
    });
    const underlineY = top + 110 + Math.min(nameLines.length, 2) * 25 - 4;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(x + cardWidth / 2 - 22, underlineY, x + cardWidth / 2 + 22, underlineY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("CHRISTMAS DAY 2026", x + cardWidth / 2, underlineY + 15, {
      align: "center",
      charSpace: 2.4,
    });

    foldGuide();

    let cardY = centre + 26;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text("YOUR MENU", textX, cardY - 12, { charSpace: 2 });
    menuLines(guest).forEach((text, i2) => {
      cardY = cardText(text, textX, cardY + (i2 ? 4 : 0), textWidth, 8.5, "normal", INK);
    });
    if (guest.notes?.trim()) {
      cardY = cardText(`Note · ${guest.notes.trim()}`, textX, cardY + 5, textWidth, 8, "bold", CRANBERRY);
    }
    doc.setFont("times", "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(...MUTED);
    doc.text("Merry Christmas", x + cardWidth / 2, top + cardHeight - 20, { align: "center" });
  });


  const safeName = (booking.customerName || "order").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return { doc, filename: `lacasa-christmas-preorder-${safeName}.pdf` };
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
