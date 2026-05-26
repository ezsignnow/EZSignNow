-- Add access_code (text) to public.signatories and payment_fee (numeric) to public.documents
ALTER TABLE public.signatories ADD COLUMN IF NOT EXISTS access_code TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS payment_fee NUMERIC;
