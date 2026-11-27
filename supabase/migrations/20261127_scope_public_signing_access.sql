-- ============================================================
-- Security: scope public signing access to the one document a signer opened.
--
-- The policies from 20260524_public_signing_access.sql and
-- 20260524b_public_signing_update.sql let anyone holding the public anon key
-- read EVERY pending or completed document, its signatories (names, emails,
-- signatures, access codes) and fields, download any file in the private
-- `documents` bucket, overwrite any pending signer's record and mark any
-- pending document completed. Row Level Security cannot tell "open by id"
-- from "list everything", so a plain `status = 'pending'` check exposes all
-- rows.
--
-- The signing page now sends the document id it is showing in an
-- `x-signing-document` request header (see src/integrations/supabase/client.ts).
-- PostgREST and Storage expose request headers to policies through
-- `request.headers`, so the public policies below only match that one
-- document. Knowing a signing link (a random UUID) is still what grants
-- access, but rows can no longer be listed or reached without it.
--
-- Owner policies and the signed-in signer (email claim) policies are unchanged.
-- ============================================================

-- The document id the caller says it is signing, or NULL.
CREATE OR REPLACE FUNCTION public.signing_document_scope()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  v := nullif(current_setting('request.headers', true), '')::json ->> 'x-signing-document';
  RETURN v::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.signing_document_scope() TO anon, authenticated;

-- True when every signer (order_num > 0; copy recipients are order_num <= 0)
-- of the document has signed. SECURITY DEFINER so the documents policy can
-- check signatories without the two tables' policies recursing into each
-- other. It only returns a boolean.
CREATE OR REPLACE FUNCTION public.signing_document_all_signed(doc_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
           SELECT 1 FROM public.signatories s
           WHERE s.document_id = doc_id AND s.order_num > 0
         )
     AND NOT EXISTS (
           SELECT 1 FROM public.signatories s
           WHERE s.document_id = doc_id AND s.order_num > 0 AND s.status <> 'signed'
         );
$$;

REVOKE ALL ON FUNCTION public.signing_document_all_signed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signing_document_all_signed(uuid) TO anon, authenticated;

-- ---------- documents ----------
DROP POLICY IF EXISTS "Public can view pending documents for signing" ON public.documents;
DROP POLICY IF EXISTS "Public can view completed documents" ON public.documents;
DROP POLICY IF EXISTS "Public can mark pending documents as completed" ON public.documents;

DROP POLICY IF EXISTS "Signing link can view its document" ON public.documents;
CREATE POLICY "Signing link can view its document"
  ON public.documents FOR SELECT
  USING (
    id = (SELECT public.signing_document_scope())
    AND status IN ('pending', 'completed')
  );

-- Only flips a pending document to completed, and only once every signer has signed.
DROP POLICY IF EXISTS "Signing link can complete its document" ON public.documents;
CREATE POLICY "Signing link can complete its document"
  ON public.documents FOR UPDATE
  USING (
    id = (SELECT public.signing_document_scope())
    AND status = 'pending'
  )
  WITH CHECK (
    id = (SELECT public.signing_document_scope())
    AND status = 'completed'
    AND public.signing_document_all_signed(id)
  );

-- ---------- signatories ----------
DROP POLICY IF EXISTS "Public can view signatories of pending documents" ON public.signatories;
DROP POLICY IF EXISTS "Public can view signatories of completed documents" ON public.signatories;
DROP POLICY IF EXISTS "Public signatories can update their own signing record" ON public.signatories;

DROP POLICY IF EXISTS "Signing link can view its signatories" ON public.signatories;
CREATE POLICY "Signing link can view its signatories"
  ON public.signatories FOR SELECT
  USING (
    document_id = (SELECT public.signing_document_scope())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = signatories.document_id
        AND d.status IN ('pending', 'completed')
    )
  );

DROP POLICY IF EXISTS "Signing link can update its signatories" ON public.signatories;
CREATE POLICY "Signing link can update its signatories"
  ON public.signatories FOR UPDATE
  USING (
    document_id = (SELECT public.signing_document_scope())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = signatories.document_id
        AND d.status = 'pending'
    )
  )
  WITH CHECK (
    document_id = (SELECT public.signing_document_scope())
  );

-- ---------- signature_fields ----------
DROP POLICY IF EXISTS "Public can view signature fields of pending documents" ON public.signature_fields;
DROP POLICY IF EXISTS "Public can view signature fields of completed documents" ON public.signature_fields;

DROP POLICY IF EXISTS "Signing link can view its signature fields" ON public.signature_fields;
CREATE POLICY "Signing link can view its signature fields"
  ON public.signature_fields FOR SELECT
  USING (
    document_id = (SELECT public.signing_document_scope())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = signature_fields.document_id
        AND d.status IN ('pending', 'completed')
    )
  );

-- ---------- document_audit_logs ----------
DROP POLICY IF EXISTS "Public can insert audit logs for pending documents" ON public.document_audit_logs;
DROP POLICY IF EXISTS "Public can view audit logs" ON public.document_audit_logs;

DROP POLICY IF EXISTS "Signing link can add audit logs" ON public.document_audit_logs;
CREATE POLICY "Signing link can add audit logs"
  ON public.document_audit_logs FOR INSERT
  WITH CHECK (
    document_id = (SELECT public.signing_document_scope())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_audit_logs.document_id
        AND d.status = 'pending'
    )
  );

DROP POLICY IF EXISTS "Signing link can view audit logs" ON public.document_audit_logs;
CREATE POLICY "Signing link can view audit logs"
  ON public.document_audit_logs FOR SELECT
  USING (
    document_id = (SELECT public.signing_document_scope())
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_audit_logs.document_id
        AND d.status IN ('pending', 'completed')
    )
  );

-- ---------- audit_logs ----------
-- The old SELECT policy also exposed every pending/completed document's log,
-- and the INSERT policy let any signed-in user write to any document's log.
DROP POLICY IF EXISTS "Document owners can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Anyone can insert audit logs for pending documents" ON public.audit_logs;

DROP POLICY IF EXISTS "Document owners can view audit logs" ON public.audit_logs;
CREATE POLICY "Document owners can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = audit_logs.document_id AND d.owner_id = auth.uid()
    )
    OR (
      document_id = (SELECT public.signing_document_scope())
      AND EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = audit_logs.document_id AND d.status IN ('pending', 'completed')
      )
    )
  );

DROP POLICY IF EXISTS "Owners and signing link can add audit logs" ON public.audit_logs;
CREATE POLICY "Owners and signing link can add audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = audit_logs.document_id AND d.owner_id = auth.uid()
    )
    OR (
      document_id = (SELECT public.signing_document_scope())
      AND EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = audit_logs.document_id AND d.status = 'pending'
      )
    )
  );

-- ---------- storage: documents bucket ----------
-- Was: any object in the private `documents` bucket readable by anyone.
-- Now: only the file of the document the signing link points at.
DROP POLICY IF EXISTS "Public can download documents for signing" ON storage.objects;

DROP POLICY IF EXISTS "Signing link can download its document file" ON storage.objects;
CREATE POLICY "Signing link can download its document file"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = (SELECT public.signing_document_scope())
        AND d.status IN ('pending', 'completed')
        AND right(d.file_url, length(objects.name) + 11) = '/documents/' || objects.name
    )
  );
