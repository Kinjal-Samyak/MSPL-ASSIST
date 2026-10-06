-- Wipe legacy stage_documents and reseed with the new 8-stage layout.
DELETE FROM public.stage_documents;

ALTER TABLE public.stage_documents DROP CONSTRAINT IF EXISTS stage_documents_stage_id_check;
ALTER TABLE public.stage_documents ADD CONSTRAINT stage_documents_stage_id_check
  CHECK (stage_id IN ('pi','billing','pdi_initial','invoices','form21_22','rto','insurance','pdi_final'));

-- Seed all 8 stage slots for every existing order.
WITH slots(stage_id, document_name) AS (
  VALUES
    ('pi','Proforma Invoice'),
    ('billing','Billing Details & Invoice'),
    ('pdi_initial','Initial PDI Sheet'),
    ('invoices','Bulk Invoice'),
    ('invoices','Individual Invoices'),
    ('form21_22','Form 21 / 22'),
    ('rto','RTO Slips'),
    ('rto','Excel from RTO'),
    ('insurance','Excel from Insurance'),
    ('insurance','Insurance Policies'),
    ('pdi_final','Final PDI Sheet')
)
INSERT INTO public.stage_documents (order_id, stage_id, document_name, status)
SELECT o.id, s.stage_id, s.document_name, 'pending'
FROM public.orders o CROSS JOIN slots s;