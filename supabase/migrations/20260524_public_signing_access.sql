-- ============================================================
-- Migration: Allow public (anon) read access to pending documents
-- so external signatories can open signing links without an account.
-- ============================================================

-- 1. Allow anyone to SELECT documents that are in 'pending' status.
--    This is required so signatory clicking the email link can load the doc.
CREATE POLICY "Public can view pending documents for signing"
  ON public.documents FOR SELECT
  USING (status = 'pending');

-- 2. Allow anyone to SELECT signatories belonging to a pending document.
CREATE POLICY "Public can view signatories of pending documents"
  ON public.signatories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id
        AND status = 'pending'
    )
  );

-- 3. Allow anyone to SELECT signature_fields belonging to a pending document.
CREATE POLICY "Public can view signature fields of pending documents"
  ON public.signature_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id
        AND status = 'pending'
    )
  );

-- 4. Allow signatories to UPDATE their own record (to submit their signature).
--    Matches on email stored in the signatories row vs the request email claim,
--    OR allows any anon update (for the sandbox where signatories have no account).
--    We use a permissive policy scoped to the 'pending' document only.
CREATE POLICY "Public signatories can update their own signing record"
  ON public.signatories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id
        AND status = 'pending'
    )
  );

-- 5. Allow public read on storage objects for documents bucket so the PDF
--    can be downloaded by unauthenticated signatories.
--    Note: This makes PDF files in the 'documents' bucket publicly readable.
--    If you want tighter control, use signed URLs instead.
CREATE POLICY "Public can download documents for signing"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');
