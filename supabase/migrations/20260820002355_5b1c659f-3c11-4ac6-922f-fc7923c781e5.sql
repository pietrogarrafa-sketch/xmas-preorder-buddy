CREATE TABLE public.preorders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  service_date date NOT NULL DEFAULT '2026-12-25',
  customer_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  service_time text NOT NULL DEFAULT '',
  table_notes text NOT NULL DEFAULT '',
  adult_count integer NOT NULL DEFAULT 0,
  child_count integer NOT NULL DEFAULT 0,
  guest_count integer NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  deposit_amount numeric(10,2) NOT NULL DEFAULT 0,
  guests jsonb NOT NULL DEFAULT '[]'::jsonb
);

GRANT INSERT ON public.preorders TO anon;
GRANT SELECT, INSERT ON public.preorders TO authenticated;
GRANT ALL ON public.preorders TO service_role;

ALTER TABLE public.preorders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a pre-order"
  ON public.preorders FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX preorders_created_at_idx ON public.preorders (created_at DESC);