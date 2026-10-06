-- Tighten vehicle_insurance_policies invariants

-- 1) Ensure start_date is always provided (a policy without a start is meaningless).
UPDATE public.vehicle_insurance_policies SET start_date = created_at::date WHERE start_date IS NULL;
ALTER TABLE public.vehicle_insurance_policies ALTER COLUMN start_date SET NOT NULL;

-- 2) Prevent inverted date ranges.
ALTER TABLE public.vehicle_insurance_policies
  DROP CONSTRAINT IF EXISTS vip_end_after_start_chk;
ALTER TABLE public.vehicle_insurance_policies
  ADD CONSTRAINT vip_end_after_start_chk
  CHECK (end_date IS NULL OR end_date >= start_date);

-- 3) Only one current policy per vehicle, enforced at the index level
--    (defence-in-depth on top of vip_enforce_single_current trigger).
DROP INDEX IF EXISTS public.vip_one_current_per_vin;
CREATE UNIQUE INDEX vip_one_current_per_vin
  ON public.vehicle_insurance_policies (vehicle_vin)
  WHERE is_current = true;

-- 4) Re-affirm Data API grants in case anything was dropped.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_insurance_policies TO authenticated;
GRANT ALL ON public.vehicle_insurance_policies TO service_role;