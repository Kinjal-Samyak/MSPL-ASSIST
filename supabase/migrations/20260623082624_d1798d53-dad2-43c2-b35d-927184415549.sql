
-- Change 1: Add finance_partner to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS finance_partner text;

-- Change 2: billing_notes table
CREATE TABLE IF NOT EXISTS public.billing_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_notes TO authenticated;
GRANT ALL ON public.billing_notes TO service_role;

ALTER TABLE public.billing_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_notes read all auth"
  ON public.billing_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "billing_notes write by admin/rajat/accounts"
  ON public.billing_notes FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'rajat_team')
    OR public.has_role(auth.uid(), 'accounts')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'rajat_team')
    OR public.has_role(auth.uid(), 'accounts')
  );

-- Change 3: Backfill "Bulk Invoice Zip" stage_documents for existing orders
INSERT INTO public.stage_documents (order_id, stage_id, document_name, status)
SELECT o.id, 'invoices', 'Bulk Invoice Zip', 'pending'
FROM public.orders o
WHERE NOT EXISTS (
  SELECT 1 FROM public.stage_documents sd
  WHERE sd.order_id = o.id AND sd.stage_id = 'invoices' AND sd.document_name = 'Bulk Invoice Zip'
);
