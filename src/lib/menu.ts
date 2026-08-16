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

/** Served to every guest — no choice required. */
export const INCLUDED_STARTER: Dish = {
  name: "Arancino al Tartufo",
  description: "Crispy truffle arancino, parmesan fondue and pecorino romano — served to all guests",
};

export const MENU: Record<Course, Dish[]> = {
  starter: [
    {
      name: "Zuppa di Porro e Patate",
      description: "Leek & potato soup, served with Italian bread",
      vegetarian: true,
    },
    {
      name: "Cocktail di Gamberetti",
      description: "North Atlantic baby prawns, Marie Rose, lettuce, paprika, toasted bread & butter",
    },
    {
      name: "Capesante Gratinate",
      description: "Hand-dived scallops baked with garlic butter, Amalfi lemon and parsley crumb",
    },
    {
      name: "Carpaccio di Manzo",
      description: "Prime beef fillet carpaccio, truffle mayonnaise, aged parmesan, rocket, crispy capers",
    },
    {
      name: "Gamberoni alla Busara",
      description: "King prawns sautéed with garlic, chilli, cherry tomatoes and lobster bisque",
    },
    {
      name: "Tortino di Formaggio",
      description: "Filo tartlet, goat cheese & sundried tomatoes, home-made cranberry & raspberry dip",
      vegetarian: true,
    },
  ],
  main: [
    {
      name: "Tacchino Natalizio",
      description:
        "Free-range turkey crown, chestnut stuffing, pigs in blankets, roast parsnips, sprouts, honey carrots, Italian gravy",
    },
    {
      name: "Filetto di Manzo",
      description: "Prime fillet steak, Madeira jus, seasonal vegetables",
      steak: true,
    },
    {
      name: "Branzino Natalizio",
      description: "Pan-roasted sea bass fillet, king prawns, asparagus, lobster butter sauce",
    },
    {
      name: "Wellington ai Funghi",
      description: "Wild mushroom & chestnut wellington, creamy mushroom sauce, seasonal vegetables",
      vegetarian: true,
    },
    {
      name: "Agnello in Crosta di Erbe",
      description: "Herb-crusted lamb cutlets, rosemary & red wine sauce, seasonal vegetables",
    },
  ],
  dessert: [
    { name: "Tiramisù Tradizionale", description: "Mascarpone cream, espresso and cocoa" },
    { name: "Profiteroles", description: "Choux pastry filled with cream, rich chocolate sauce" },
    {
      name: "Sicilian Pistachio Semifreddo",
      description: "Topped with crunchy pistachio crumb",
    },
    { name: "Classic Crème Brûlée", description: "Vanilla bean, caramelised sugar topping" },
    { name: "Christmas Pudding", description: "Served warm with brandy sauce" },
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
