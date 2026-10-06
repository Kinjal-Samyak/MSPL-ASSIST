
-- ============================================================
-- 1. UNIQUE constraint on vehicles.vin (dedupe safety net)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vehicles_vin_unique' AND conrelid = 'public.vehicles'::regclass
  ) THEN
    ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_vin_unique UNIQUE (vin);
  END IF;
END $$;

-- ============================================================
-- 2. Cached current-insurance dates on vehicles
-- ============================================================
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS insurance_start_date date,
  ADD COLUMN IF NOT EXISTS insurance_end_date date;

-- ============================================================
-- 3. vehicle_insurance_policies — renewal history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicle_insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_vin text NOT NULL REFERENCES public.vehicles(vin) ON UPDATE CASCADE ON DELETE CASCADE,
  order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
  policy_number text NOT NULL,
  start_date date,
  end_date date,
  file_name text,
  file_size text,
  file_url text,
  is_current boolean NOT NULL DEFAULT true,
  uploaded_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_insurance_policies TO authenticated;
GRANT ALL ON public.vehicle_insurance_policies TO service_role;

ALTER TABLE public.vehicle_insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view vehicle insurance"
  ON public.vehicle_insurance_policies FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin/Rajat can insert vehicle insurance"
  ON public.vehicle_insurance_policies FOR INSERT
  TO authenticated WITH CHECK (public.is_admin_or_rajat(auth.uid()));

CREATE POLICY "Admin/Rajat can update vehicle insurance"
  ON public.vehicle_insurance_policies FOR UPDATE
  TO authenticated USING (public.is_admin_or_rajat(auth.uid()));

CREATE POLICY "Admin/Rajat can delete vehicle insurance"
  ON public.vehicle_insurance_policies FOR DELETE
  TO authenticated USING (public.is_admin_or_rajat(auth.uid()));

CREATE INDEX IF NOT EXISTS vip_vin_current_idx
  ON public.vehicle_insurance_policies (vehicle_vin, is_current);
CREATE INDEX IF NOT EXISTS vip_end_date_idx
  ON public.vehicle_insurance_policies (end_date);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vip_touch_updated_at ON public.vehicle_insurance_policies;
CREATE TRIGGER vip_touch_updated_at
  BEFORE UPDATE ON public.vehicle_insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 4. Trigger: only one is_current per VIN; cache dates on vehicle
-- ============================================================
CREATE OR REPLACE FUNCTION public.vip_enforce_single_current()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_current IS TRUE THEN
    UPDATE public.vehicle_insurance_policies
      SET is_current = false
      WHERE vehicle_vin = NEW.vehicle_vin
        AND id <> NEW.id
        AND is_current = true;

    UPDATE public.vehicles
      SET insurance_start_date = NEW.start_date,
          insurance_end_date   = NEW.end_date,
          policy_number        = COALESCE(NEW.policy_number, policy_number)
      WHERE vin = NEW.vehicle_vin;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vip_enforce_single_current_ins ON public.vehicle_insurance_policies;
CREATE TRIGGER vip_enforce_single_current_ins
  AFTER INSERT ON public.vehicle_insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.vip_enforce_single_current();

DROP TRIGGER IF EXISTS vip_enforce_single_current_upd ON public.vehicle_insurance_policies;
CREATE TRIGGER vip_enforce_single_current_upd
  AFTER UPDATE OF is_current, start_date, end_date ON public.vehicle_insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.vip_enforce_single_current();

-- ============================================================
-- 5. Backfill from existing insurance_policies
-- ============================================================
INSERT INTO public.vehicle_insurance_policies
  (vehicle_vin, order_id, policy_number, file_name, file_size, file_url, is_current, uploaded_by, notes)
SELECT
  v.vin,
  ip.order_id,
  ip.policy_number,
  ip.file_name,
  ip.file_size,
  ip.file_url,
  true,
  ip.uploaded_by,
  'Backfilled from insurance_policies on migration'
FROM public.insurance_policies ip
JOIN public.vehicles v
  ON v.policy_number = ip.policy_number
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_insurance_policies x
  WHERE x.vehicle_vin = v.vin AND x.policy_number = ip.policy_number
);
