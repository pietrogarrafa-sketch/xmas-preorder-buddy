ALTER TABLE public.preorders ADD COLUMN event_type text NOT NULL DEFAULT 'christmas_day';
ALTER TABLE public.preorders ADD CONSTRAINT preorders_event_type_check CHECK (event_type IN ('christmas_day', 'christmas_party'));
ALTER TABLE public.preorders ADD CONSTRAINT party_order_values CHECK (event_type <> 'christmas_party' OR (service_date BETWEEN DATE '2026-11-23' AND DATE '2026-12-23' AND guest_count >= 10 AND guest_count <= 200 AND child_count = 0 AND adult_count = guest_count AND total_amount = guest_count * 45.95));
CREATE INDEX preorders_event_date_idx ON public.preorders(event_type, service_date);
DROP POLICY "Anyone can submit a pre-order" ON public.preorders;
CREATE POLICY "Legacy Christmas Day submissions" ON public.preorders FOR INSERT TO anon, authenticated WITH CHECK (event_type = 'christmas_day');