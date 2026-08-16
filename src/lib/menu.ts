export const PRICE_PER_PERSON = 110;
export const LOBSTER_SUPPLEMENT = 10;
export const DEPOSIT_PER_PERSON = 20;

export const COOKING_LEVELS = [
  "Rare",
  "Medium Rare",
  "Medium",
  "Medium Well",
  "Well Done",
] as const;

export type CookingLevel = (typeof COOKING_LEVELS)[number];

export type Course = "starter" | "main" | "dessert";

export type Dish = {
  name: string;
  description?: string;
  vegetarian?: boolean;
  /** Requires cooking temperature + optional lobster upgrade */
  steak?: boolean;
};

export const MENU: Record<Course, Dish[]> = {
  starter: [
    { name: "Arancino al Tartufo", description: "Truffle risotto ball, parmesan fondue" },
    { name: "Zuppa di Porro e Patate", description: "Leek & potato velouté", vegetarian: true },
    { name: "Cocktail di Gamberetti", description: "Prawn cocktail, Marie Rose" },
    { name: "Capesante Gratinate", description: "Gratinated scallops, herb crumb" },
    { name: "Carpaccio di Manzo", description: "Beef carpaccio, rocket, parmesan" },
    { name: "Gamberoni alla Busara", description: "King prawns, tomato & white wine" },
    { name: "Tortino di Formaggio", description: "Warm cheese tart", vegetarian: true },
  ],
  main: [
    { name: "Tacchino Natalizio", description: "Christmas turkey, all the trimmings" },
    { name: "Filetto di Manzo", description: "Beef fillet, red wine jus", steak: true },
    { name: "Branzino Natalizio", description: "Sea bass, saffron potatoes" },
    { name: "Wellington ai Funghi", description: "Mushroom wellington", vegetarian: true },
    { name: "Agnello in Crosta di Erbe", description: "Herb-crusted lamb" },
  ],
  dessert: [
    { name: "Tiramisù Tradizionale" },
    { name: "Profiteroles" },
    { name: "Sicilian Pistachio Semifreddo" },
    { name: "Classic Crème Brûlée" },
    { name: "Christmas Pudding" },
  ],
};

export const COURSE_LABEL: Record<Course, string> = {
  starter: "Entrée",
  main: "Secondi",
  dessert: "Dolci",
};

export type Guest = {
  id: string;
  name: string;
  starter: string;
  main: string;
  dessert: string;
  cooking?: CookingLevel | undefined;
  lobster?: boolean | undefined;
  notes?: string | undefined;
};

export type Booking = {
  customerName: string;
  date: string;
  time: string;
  phone: string;
  email: string;
  tableNotes: string;
};

export const EMPTY_BOOKING: Booking = {
  customerName: "",
  date: "2026-12-25",
  time: "13:00",
  phone: "",
  email: "",
  tableNotes: "",
};

export function guestPrice(guest: Guest) {
  return PRICE_PER_PERSON + (guest.lobster ? LOBSTER_SUPPLEMENT : 0);
}

export function orderTotal(guests: Guest[]) {
  return guests.reduce((sum, g) => sum + guestPrice(g), 0);
}

export function mainLabel(guest: Guest) {
  const extras = [guest.cooking, guest.lobster ? "+ Half Lobster" : null].filter(Boolean);
  return extras.length ? `${guest.main} (${extras.join(", ")})` : guest.main;
}

export function formatMoney(value: number) {
  return `£${value.toFixed(2)}`;
}

/** Aggregated dish counts for the kitchen. */
export function kitchenSummary(guests: Guest[]) {
  const build = (get: (g: Guest) => string) => {
    const map = new Map<string, number>();
    for (const g of guests) {
      const key = get(g);
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  return {
    starters: build((g) => g.starter),
    mains: build((g) => (g.cooking ? `${g.main} — ${g.cooking}` : g.main)),
    desserts: build((g) => g.dessert),
    lobsters: guests.filter((g) => g.lobster).length,
    notes: guests.filter((g) => g.notes?.trim()).map((g) => `${g.name}: ${g.notes!.trim()}`),
  };
}
