import { z } from "zod";

export const PRICE_PER_PERSON = 45.95;
export const PARTY_START = "2026-11-23";
export const PARTY_END = "2026-12-23";
export const COOKING_LEVELS = ["Rare", "Medium Rare", "Medium", "Medium Well", "Well Done"] as const;
export const SAUCES = ["Plain", "Peppercorn sauce"] as const;
export type CookingLevel = typeof COOKING_LEVELS[number];
export type Sauce = typeof SAUCES[number];
export type Course = "starter" | "main" | "dessert";
export type Dish = { name: string; description?: string; vegetarian?: boolean; steak?: boolean };
export const COURSE_LABEL = { starter: "Starters", main: "Mains", dessert: "Desserts" };
export const MENU: Record<Course, Dish[]> = {
  starter: [
    { name: "Gamberoni Luciana", description: "Whole prawns in a chilli, tomato & cream sauce, served with toasted bread" },
    { name: "Chicken Liver Pate", description: "Served with caramelised onions & sliced toast" },
    { name: "Polpette della Nonna", description: "Sicilian beef meatballs slow cooked in a basil & tomato sauce, served with toasted bread" },
    { name: "Costolette di Manzo", description: "Beef ribs in our barbeque sauce" },
    { name: "Avocado Tricolore", vegetarian: true, description: "Tomato slices with avocado & burrata" },
  ],
  main: [
    { name: "Tagliolini Amatriciana", description: "A classic Roman dish, long egg pasta with pancetta in a chilli tomato sauce" },
    { name: "Sirloin Steak", steak: true, description: "Plain or in a peppercorn sauce served with vegetables" },
    { name: "Traditional Turkey", description: "Turkey with chestnut stuffing served with Italian gravy & vegetables" },
    { name: "Rigatoni alla Norma", vegetarian: true, description: "Large pasta tubes in a tomato sauce with basil, aubergine & garlic topped with ricotta" },
    { name: "Branzino", description: "Pan fried seabass fillets floured in a buttery white wine sauce served with vegetables" },
    { name: "Pizza of Choice", description: "Please see our a la carte" },
  ],
  dessert: [ { name: "Traditional Tiramisu" }, { name: "Amaretti & Salted Caramel Cheesecake" }, { name: "Christmas Pudding" }, { name: "Vanilla Ice Cream" } ],
};
const text = (max: number) => z.string().trim().max(max);
export const guestSchema = z.object({
  id: z.string().uuid(), name: text(80).min(1, "Enter the guest name."),
  starter: text(100).refine(v => MENU.starter.some(d => d.name === v), "Choose a starter."),
  main: text(100).refine(v => MENU.main.some(d => d.name === v), "Choose a main."),
  dessert: text(100).refine(v => MENU.dessert.some(d => d.name === v), "Choose a dessert."),
  cooking: z.enum(COOKING_LEVELS).optional(), sauce: z.enum(SAUCES).optional(),
  pizzaName: text(100).optional(), notes: text(240).optional(),
}).superRefine((g, ctx) => {
  if (g.main === "Sirloin Steak" && (!g.cooking || !g.sauce)) ctx.addIssue({ code: "custom", message: "Choose steak cooking and sauce.", path: ["cooking"] });
  if (g.main === "Pizza of Choice" && !g.pizzaName) ctx.addIssue({ code: "custom", message: "Enter the pizza name from our a la carte.", path: ["pizzaName"] });
});
export type Guest = z.infer<typeof guestSchema>;
export const bookingSchema = z.object({
  customerName: text(120).min(1, "Enter the customer name."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a party date."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time."),
  phone: text(60).regex(/^[+\d\s().-]*$/, "Enter a valid phone number."),
  email: z.union([z.literal(""), text(160).email("Enter a valid email address.")]),
  tableNotes: text(1000),
}).refine(b => Boolean(b.phone || b.email), { message: "Enter a phone number or email.", path: ["phone"] });
export type Booking = z.infer<typeof bookingSchema>;
export const EMPTY_BOOKING: Booking = { customerName: "", date: "", time: "13:00", phone: "", email: "", tableNotes: "" };
export function londonToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function dateError(date: string, now = new Date()) {
  if (date < PARTY_START || date > PARTY_END || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Choose a date from 23 November to 23 December 2026.";
  if ((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${londonToday(now)}T00:00:00Z`)) / 86400000 < 7) return "Pre-orders must be submitted at least 7 days in advance.";
  return null;
}
export function orderSchema(now = new Date()) {
  return z.object({ booking: bookingSchema, guests: z.array(guestSchema).min(10, "Christmas parties require at least 10 guests.").max(200) }).superRefine((v, ctx) => {
    const error = dateError(v.booking.date, now);
    if (error) ctx.addIssue({ code: "custom", message: error, path: ["booking", "date"] });
  });
}
export function formatDate(date: string) { return date ? new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" }) : "Choose a date"; }
export function formatMoney(value: number) { return `£${value.toFixed(2)}`; }
export function orderTotal(guests: Guest[]) { return guests.length * 4595 / 100; }
export function mainLabel(g: Guest) { return g.main === "Sirloin Steak" ? `${g.main} (${g.cooking}, ${g.sauce})` : g.main === "Pizza of Choice" ? `Pizza: ${g.pizzaName}` : g.main; }
export function kitchenSummary(guests: Guest[]) {
  const count = (get: (g: Guest) => string) => [...guests.reduce((m, g) => { const key = get(g); m.set(key, (m.get(key) ?? 0) + 1); return m; }, new Map<string, number>()).entries()];
  return { starters: count(g => g.starter), mains: count(mainLabel), desserts: count(g => g.dessert), notes: guests.filter(g => g.notes).map(g => `${g.name}: ${g.notes}`) };
}