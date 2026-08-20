import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const guestSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["adult", "child"]).optional(),
  starter: z.string(),
  main: z.string(),
  dessert: z.string(),
  cooking: z.string().optional(),
  lobster: z.boolean().optional(),
  notes: z.string().optional(),
});

const payloadSchema = z.object({
  customerName: z.string().min(1).max(120),
  phone: z.string().max(60).default(""),
  email: z.string().max(160).default(""),
  serviceTime: z.string().max(40).default(""),
  tableNotes: z.string().max(1000).default(""),
  adultCount: z.number().int().min(0).max(200),
  childCount: z.number().int().min(0).max(200),
  totalAmount: z.number().min(0),
  depositAmount: z.number().min(0),
  guests: z.array(guestSchema).min(1).max(200),
});

export type SavedPreorder = {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  email: string;
  service_time: string;
  table_notes: string;
  adult_count: number;
  child_count: number;
  guest_count: number;
  total_amount: number;
  deposit_amount: number;
  guests: unknown[];
};

/** Stores a submitted pre-order. Public: the booking form has no login. */
export const savePreorder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => payloadSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("preorders")
      .insert({
        customer_name: data.customerName,
        phone: data.phone,
        email: data.email,
        service_time: data.serviceTime,
        table_notes: data.tableNotes,
        adult_count: data.adultCount,
        child_count: data.childCount,
        guest_count: data.adultCount + data.childCount,
        total_amount: data.totalAmount,
        deposit_amount: data.depositAmount,
        guests: data.guests,
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: "Could not save the order" };
    return { ok: true as const, id: row.id as string };
  });

/** Staff-only listing, guarded by the restaurant passcode. */
export const listPreorders = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ passcode: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const expected = process.env["STAFF_PASSCODE"];
    if (!expected || data.passcode !== expected) {
      return { ok: false as const, orders: [] as SavedPreorder[] };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("preorders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error("Could not load orders");
    return { ok: true as const, orders: (rows ?? []) as unknown as SavedPreorder[] };
  });
