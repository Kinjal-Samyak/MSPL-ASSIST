
-- 1) stage_skips table
CREATE TABLE public.stage_skips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage_id text NOT NULL,
  skipped_by text,
  skipped_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  UNIQUE (order_id, stage_id)
);
CREATE INDEX idx_stage_skips_order ON public.stage_skips(order_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_skips TO authenticated;
GRANT ALL ON public.stage_skips TO service_role;

ALTER TABLE public.stage_skips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stage_skips_read_all_authenticated"
  ON public.stage_skips FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "stage_skips_write_admin_rajat"
  ON public.stage_skips FOR ALL TO authenticated
  USING (public.is_admin_or_rajat(auth.uid()))
  WITH CHECK (public.is_admin_or_rajat(auth.uid()));

-- 2) VCU / MCU on vehicles
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS vcu_id text,
  ADD COLUMN IF NOT EXISTS mcu_id text;

-- 3) Backfill conditional slots — Agreement (lease), Sales Invoice (sale)
INSERT INTO public.stage_documents (order_id, stage_id, document_name, status)
SELECT o.id, 'pi', 'Agreement', 'pending'
FROM public.orders o
WHERE o.pi_type = 'lease'
  AND NOT EXISTS (
    SELECT 1 FROM public.stage_documents sd
    WHERE sd.order_id = o.id AND sd.document_name = 'Agreement'
  );

INSERT INTO public.stage_documents (order_id, stage_id, document_name, status)
SELECT o.id, 'invoices', 'Sales Invoice', 'pending'
FROM public.orders o
WHERE o.pi_type = 'purchase'
  AND NOT EXISTS (
    SELECT 1 FROM public.stage_documents sd
    WHERE sd.order_id = o.id AND sd.document_name = 'Sales Invoice'
  );

-- 4) Form 21/22 split
-- Rename existing slot rows to "Form 22"
UPDATE public.stage_documents
SET document_name = 'Form 22'
WHERE document_name = 'Form 21 / 22';

-- Add "Form 21" slot only for Maharashtra orders
INSERT INTO public.stage_documents (order_id, stage_id, document_name, status)
SELECT o.id, 'form21_22', 'Form 21', 'pending'
FROM public.orders o
WHERE o.state_code = 'MH'
  AND NOT EXISTS (
    SELECT 1 FROM public.stage_documents sd
    WHERE sd.order_id = o.id AND sd.document_name = 'Form 21'
  );
