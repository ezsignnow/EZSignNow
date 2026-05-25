-- ============================================================
-- Migration: Add ip_address and location columns to signatories
-- Required for the audit trail captured during document signing.
-- ============================================================

ALTER TABLE public.signatories
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS location   TEXT;
