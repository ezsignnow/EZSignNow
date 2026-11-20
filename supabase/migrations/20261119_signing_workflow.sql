-- ============================================================
-- Migration: Signing workflow (ported from SignuDoc)
--
-- Optional. The app works without it: new field types fall back to
-- field_type = 'text' with the real type kept in the tooltip column.
-- Running it lets those types be stored as themselves.
--
-- Conventions the app uses (no schema change needed):
--   * signatories.order_num = signing step. Signers that share a step sign
--     at the same time. order_num <= 0 marks a copy recipient.
--   * signatories.signature_data holds a JSON envelope with the signature,
--     initials, field values, consent time and any decline reason.
-- ============================================================

ALTER TABLE public.signature_fields
  DROP CONSTRAINT IF EXISTS signature_fields_field_type_check;

ALTER TABLE public.signature_fields
  ADD CONSTRAINT signature_fields_field_type_check
  CHECK (field_type IN (
    'signature', 'initials', 'date', 'name', 'text', 'number',
    'checkbox', 'dropdown', 'radio', 'label', 'attachment', 'drawing'
  ));

-- Copy recipients are stored with order_num = 0.
ALTER TABLE public.signatories
  ALTER COLUMN order_num SET DEFAULT 1;

CREATE INDEX IF NOT EXISTS signatories_document_order_idx
  ON public.signatories (document_id, order_num);
