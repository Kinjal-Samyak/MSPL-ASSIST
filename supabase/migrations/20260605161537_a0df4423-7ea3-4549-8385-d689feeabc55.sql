
-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM (
  'admin','rajat_team','accounts','pdi_team','rto_agent','insurance_agent','service_team'
);

-- =========================================================
-- PROFILES (display name / email mirror of auth.users)
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- =========================================================
-- USER ROLES
-- =========================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_read_own_and_all_for_authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_rajat(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','rajat_team')
  );
$$;

-- =========================================================
-- ORDERS
-- =========================================================
CREATE TABLE public.orders (
  id varchar(20) PRIMARY KEY,
  client_name varchar(200) NOT NULL,
  pi_type varchar(10) NOT NULL CHECK (pi_type IN ('Sale','Lease')),
  funded_by varchar(100),
  quantity integer NOT NULL CHECK (quantity >= 1),
  state varchar(100) NOT NULL,
  state_code varchar(5) NOT NULL,
  gst_number varchar(20),
  contact_person varchar(100),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_read_all_authenticated" ON public.orders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "orders_insert_admin_rajat" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_rajat(auth.uid()));
CREATE POLICY "orders_update_admin_rajat" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_admin_or_rajat(auth.uid()));

-- =========================================================
-- STAGE DOCUMENTS
-- =========================================================
CREATE TABLE public.stage_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar(20) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage_id varchar(10) NOT NULL CHECK (stage_id IN ('pi','pdi','inv','rto','ins','fpdi')),
  document_name varchar(200) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'required' CHECK (status IN ('required','uploaded')),
  file_name varchar(300),
  file_size varchar(30),
  file_url text,
  uploaded_by varchar(100),
  uploaded_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stage_documents_order ON public.stage_documents(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_documents TO authenticated;
GRANT ALL ON public.stage_documents TO service_role;
ALTER TABLE public.stage_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stage_docs_read_all_authenticated" ON public.stage_documents
  FOR SELECT TO authenticated USING (true);
-- writes mediated by serverFns using service role; deny direct client writes:
CREATE POLICY "stage_docs_write_admin_rajat" ON public.stage_documents
  FOR ALL TO authenticated
  USING (public.is_admin_or_rajat(auth.uid()))
  WITH CHECK (public.is_admin_or_rajat(auth.uid()));

-- =========================================================
-- VEHICLES
-- =========================================================
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id varchar(50) UNIQUE NOT NULL,
  vin varchar(50) UNIQUE NOT NULL,
  motor_id varchar(50),
  controller_id varchar(50),
  diu_number varchar(100),
  iot_imei varchar(50),
  iot_sim varchar(50),
  item_code varchar(50),
  item_name varchar(200),
  production_date varchar(50),
  customer_vendor varchar(300),
  is_low_speed boolean NOT NULL DEFAULT false,
  registration_number varchar(50),
  registration_date varchar(50),
  policy_number varchar(100),
  insurance_invoice_number varchar(100),
  assigned_order_id varchar(20) REFERENCES public.orders(id),
  assigned_client varchar(200),
  assigned_at timestamptz,
  assigned_by varchar(100),
  vendor_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicles_assigned_order ON public.vehicles(assigned_order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vehicles_read_all_authenticated" ON public.vehicles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehicles_write_admin_rajat_pdi" ON public.vehicles
  FOR ALL TO authenticated
  USING (public.is_admin_or_rajat(auth.uid()) OR public.has_role(auth.uid(),'pdi_team') OR public.has_role(auth.uid(),'service_team'))
  WITH CHECK (public.is_admin_or_rajat(auth.uid()) OR public.has_role(auth.uid(),'pdi_team') OR public.has_role(auth.uid(),'service_team'));

-- =========================================================
-- INDIVIDUAL INVOICES
-- =========================================================
CREATE TABLE public.individual_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar(20) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vehicle_vin varchar(50) NOT NULL,
  file_name varchar(300) NOT NULL,
  file_size varchar(30),
  file_url text,
  uploaded_by varchar(100),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, vehicle_vin)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.individual_invoices TO authenticated;
GRANT ALL ON public.individual_invoices TO service_role;
ALTER TABLE public.individual_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "individual_invoices_read_all" ON public.individual_invoices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "individual_invoices_write" ON public.individual_invoices
  FOR ALL TO authenticated
  USING (public.is_admin_or_rajat(auth.uid()) OR public.has_role(auth.uid(),'accounts'))
  WITH CHECK (public.is_admin_or_rajat(auth.uid()) OR public.has_role(auth.uid(),'accounts'));

-- =========================================================
-- RTO SLIPS
-- =========================================================
CREATE TABLE public.rto_slips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar(20) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  registration_number varchar(50) NOT NULL,
  file_name varchar(300) NOT NULL,
  file_size varchar(30),
  file_url text,
  uploaded_by varchar(100),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, registration_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rto_slips TO authenticated;
GRANT ALL ON public.rto_slips TO service_role;
ALTER TABLE public.rto_slips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rto_slips_read_all" ON public.rto_slips
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "rto_slips_write" ON public.rto_slips
  FOR ALL TO authenticated
  USING (public.is_admin_or_rajat(auth.uid()) OR public.has_role(auth.uid(),'rto_agent'))
  WITH CHECK (public.is_admin_or_rajat(auth.uid()) OR public.has_role(auth.uid(),'rto_agent'));

-- =========================================================
-- INSURANCE POLICIES
-- =========================================================
CREATE TABLE public.insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar(20) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  policy_number varchar(100) NOT NULL,
  file_name varchar(300) NOT NULL,
  file_size varchar(30),
  file_url text,
  uploaded_by varchar(100),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, policy_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_policies TO authenticated;
GRANT ALL ON public.insurance_policies TO service_role;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insurance_policies_read_all" ON public.insurance_policies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "insurance_policies_write" ON public.insurance_policies
  FOR ALL TO authenticated
  USING (public.is_admin_or_rajat(auth.uid()) OR public.has_role(auth.uid(),'insurance_agent'))
  WITH CHECK (public.is_admin_or_rajat(auth.uid()) OR public.has_role(auth.uid(),'insurance_agent'));

-- =========================================================
-- PDI UPLOADS
-- =========================================================
CREATE TABLE public.pdi_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar(20) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  pdi_type varchar(10) NOT NULL CHECK (pdi_type IN ('initial','final')),
  file_name varchar(300) NOT NULL,
  file_size varchar(30),
  file_url text,
  vehicle_count integer,
  uploaded_by varchar(100),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pdi_uploads_order ON public.pdi_uploads(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdi_uploads TO authenticated;
GRANT ALL ON public.pdi_uploads TO service_role;
ALTER TABLE public.pdi_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdi_uploads_read_all" ON public.pdi_uploads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "pdi_uploads_write" ON public.pdi_uploads
  FOR ALL TO authenticated
  USING (public.is_admin_or_rajat(auth.uid()) OR public.has_role(auth.uid(),'pdi_team') OR public.has_role(auth.uid(),'service_team'))
  WITH CHECK (public.is_admin_or_rajat(auth.uid()) OR public.has_role(auth.uid(),'pdi_team') OR public.has_role(auth.uid(),'service_team'));
