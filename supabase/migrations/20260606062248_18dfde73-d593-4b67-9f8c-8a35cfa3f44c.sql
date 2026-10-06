
ALTER TABLE public.stage_documents ADD COLUMN IF NOT EXISTS form_type TEXT;

CREATE TABLE IF NOT EXISTS public.bulk_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size TEXT,
  file_url TEXT NOT NULL,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_invoices TO authenticated;
GRANT ALL ON public.bulk_invoices TO service_role;
ALTER TABLE public.bulk_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read bulk_invoices" ON public.bulk_invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write bulk_invoices" ON public.bulk_invoices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rajat_team') OR public.has_role(auth.uid(),'accounts'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rajat_team') OR public.has_role(auth.uid(),'accounts'));

CREATE TABLE IF NOT EXISTS public.rto_excel_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size TEXT,
  file_url TEXT NOT NULL,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rto_excel_uploads TO authenticated;
GRANT ALL ON public.rto_excel_uploads TO service_role;
ALTER TABLE public.rto_excel_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read rto_excel_uploads" ON public.rto_excel_uploads FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write rto_excel_uploads" ON public.rto_excel_uploads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rajat_team') OR public.has_role(auth.uid(),'rto_agent'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rajat_team') OR public.has_role(auth.uid(),'rto_agent'));

CREATE TABLE IF NOT EXISTS public.insurance_excel_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size TEXT,
  file_url TEXT NOT NULL,
  vehicles_updated INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_excel_uploads TO authenticated;
GRANT ALL ON public.insurance_excel_uploads TO service_role;
ALTER TABLE public.insurance_excel_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read insurance_excel_uploads" ON public.insurance_excel_uploads FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write insurance_excel_uploads" ON public.insurance_excel_uploads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rajat_team') OR public.has_role(auth.uid(),'insurance_agent'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rajat_team') OR public.has_role(auth.uid(),'insurance_agent'));
