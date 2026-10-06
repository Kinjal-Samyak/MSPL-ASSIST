CREATE TABLE public.vehicle_assignment_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_vin TEXT NOT NULL,
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('assigned','unassigned','reassigned')),
  previous_order_id TEXT,
  actor_user_id UUID,
  actor_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vae_vehicle_vin ON public.vehicle_assignment_events(vehicle_vin);
CREATE INDEX idx_vae_order_id ON public.vehicle_assignment_events(order_id);
CREATE INDEX idx_vae_created_at ON public.vehicle_assignment_events(created_at DESC);

GRANT SELECT ON public.vehicle_assignment_events TO authenticated;
GRANT ALL ON public.vehicle_assignment_events TO service_role;

ALTER TABLE public.vehicle_assignment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assignment events"
  ON public.vehicle_assignment_events
  FOR SELECT
  TO authenticated
  USING (true);