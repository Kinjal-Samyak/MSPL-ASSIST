
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_pi_type_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_pi_type_check CHECK (pi_type IN ('purchase','lease'));

ALTER TABLE public.stage_documents DROP CONSTRAINT IF EXISTS stage_documents_stage_id_check;
ALTER TABLE public.stage_documents ADD CONSTRAINT stage_documents_stage_id_check CHECK (stage_id IN ('pi','production','invoicing','rto','insurance','pdi_dispatch'));

ALTER TABLE public.stage_documents DROP CONSTRAINT IF EXISTS stage_documents_status_check;
ALTER TABLE public.stage_documents ADD CONSTRAINT stage_documents_status_check CHECK (status IN ('pending','required','uploaded'));
