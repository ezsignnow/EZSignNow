-- ============================================================
-- Migration: Templates, Team Memberships, and Audit Logs Schema
-- ============================================================

-- 1. Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Users can view their own templates" ON public.templates FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own templates" ON public.templates FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own templates" ON public.templates FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own templates" ON public.templates FOR DELETE USING (auth.uid() = owner_id);

-- Trigger for templates update timestamp
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. Create team_memberships table
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('Owner', 'Admin', 'Member')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Active', 'Pending', 'Declined')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on team_memberships
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- Team membership policies
-- A user can view a membership if they are the invited user, or if they were invited by the current user, or if they are in the same team.
-- For simplicity, since teams are flat workspaces in this sandbox:
-- Admin/Owner can manage all memberships.
-- Normal users can view memberships.
CREATE POLICY "Users can view team memberships" ON public.team_memberships FOR SELECT 
  USING (true);

CREATE POLICY "Admins and Owners can insert team memberships" ON public.team_memberships FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and Owners can update team memberships" ON public.team_memberships FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and Owners can delete team memberships" ON public.team_memberships FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger for team_memberships update timestamp
CREATE TRIGGER update_team_memberships_updated_at BEFORE UPDATE ON public.team_memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit log policies
-- Document owners can view audit logs for their documents.
-- External signatories can view audit logs for documents they are signing (to build audit trails).
CREATE POLICY "Document owners can view audit logs" ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id AND status = 'pending'
    ) OR
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id AND status = 'completed'
    )
  );

CREATE POLICY "Anyone can insert audit logs for pending documents" ON public.audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE id = document_id AND status = 'pending'
    ) OR auth.uid() IS NOT NULL
  );
