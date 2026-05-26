-- ============================================================
-- Migration: Add secure document audit logging
-- Required for logging views, uploads, and sign events.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.document_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  signatory_id UUID REFERENCES public.signatories(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('upload', 'view', 'signature')),
  email TEXT,
  name TEXT,
  ip_address TEXT,
  location TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Allow public (anonymous) inserts for views and signatures if document is pending
CREATE POLICY "Public can insert audit logs for pending documents"
  ON public.document_audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id
        AND status = 'pending'
    )
  );

-- 2. Allow document owners to insert/manage logs
CREATE POLICY "Document owners can manage audit logs"
  ON public.document_audit_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id
        AND owner_id = auth.uid()
    )
  );

-- 3. Allow anyone to select audit logs for completed or pending documents (to show audit trail)
CREATE POLICY "Public can view audit logs"
  ON public.document_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id
        AND status IN ('pending', 'completed')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id
        AND owner_id = auth.uid()
    )
  );
