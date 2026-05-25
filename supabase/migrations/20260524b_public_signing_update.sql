-- ============================================================
-- Migration: Allow public (anon) to update document status to 'completed'
-- when all signatories have signed, and allow completed documents to be read.
-- Run this AFTER 20260524_public_signing_access.sql
-- ============================================================

-- 1. Allow anon to UPDATE a document to 'completed' when it is currently 'pending'.
--    This is called by ViewDocument.tsx after confirming all signatories signed.
CREATE POLICY "Public can mark pending documents as completed"
  ON public.documents FOR UPDATE
  USING (status = 'pending')
  WITH CHECK (status = 'completed');

-- 2. Allow anyone to SELECT completed documents (so the success state renders correctly).
CREATE POLICY "Public can view completed documents"
  ON public.documents FOR SELECT
  USING (status = 'completed');

-- 3. Allow anyone to SELECT signatories of completed documents (for audit trail display).
CREATE POLICY "Public can view signatories of completed documents"
  ON public.signatories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id
        AND status = 'completed'
    )
  );

-- 4. Allow anyone to SELECT signature_fields of completed documents.
CREATE POLICY "Public can view signature fields of completed documents"
  ON public.signature_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id
        AND status = 'completed'
    )
  );
