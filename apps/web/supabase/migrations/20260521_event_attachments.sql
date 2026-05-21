-- Attachments on events

CREATE TABLE IF NOT EXISTS public.event_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_attachments_event_id ON public.event_attachments (event_id);

ALTER TABLE public.event_attachments ENABLE ROW LEVEL SECURITY;

-- Storage bucket for event attachments (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-attachments', 'event-attachments', true)
ON CONFLICT (id) DO NOTHING;
