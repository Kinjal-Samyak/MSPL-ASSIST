CREATE TABLE IF NOT EXISTS public.final_pdi_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vehicle_vin text NOT NULL,
  vehicle_id text,
  check_type text NOT NULL,
  status text NOT NULL,
  expected text,
  actual text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.final_pdi_verifications TO authenticated;
GRANT ALL ON public.final_pdi_verifications TO service_role;

ALTER TABLE public.final_pdi_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "final_pdi_verifications_read_authenticated"
  ON public.final_pdi_verifications FOR SELECT TO authenticated USING (true);

CREATE POLICY "final_pdi_verifications_write_admin_rajat_service"
  ON public.final_pdi_verifications FOR ALL TO authenticated
  USING (public.is_admin_or_rajat(auth.uid()) OR public.has_role(auth.uid(),'service_team'::app_role))
  WITH CHECK (public.is_admin_or_rajat(auth.uid()) OR public.has_role(auth.uid(),'service_team'::app_role));

CREATE INDEX IF NOT EXISTS idx_final_pdi_verifications_order ON public.final_pdi_verifications(order_id);