import { supabase } from "@/integrations/supabase/client";
import { getGeolocationInfo } from "./geolocation";

export interface Template {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  created_at: string;
  updated_at: string;
  owner_id?: string;
  desc?: string;
}

export interface TeamMembership {
  id: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Member';
  status: 'Active' | 'Pending' | 'Declined';
  invited_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  document_id: string;
  user_id?: string | null;
  action: string;
  details: string;
  ip_address?: string | null;
  location?: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  status: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  payment_fee?: number | null;
}

export interface Signatory {
  id: string;
  document_id: string;
  email: string;
  name: string;
  order_num: number;
  status: string;
  signed_at?: string | null;
  signature_data?: string | null;
  ip_address?: string | null;
  location?: string | null;
  access_code?: string | null;
  color?: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  { 
    id: "t1", 
    title: "Standard NDA", 
    file_name: "standard_nda.pdf",
    file_url: "",
    desc: "Non-disclosure template with dual signature panels.", 
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
  },
  { 
    id: "t2", 
    title: "Independent Contractor Agreement", 
    file_name: "independent_contractor.pdf",
    file_url: "",
    desc: "Consulting agreement with scope milestones & payment fields.", 
    created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  },
  { 
    id: "t3", 
    title: "W-9 Form (2026)", 
    file_name: "w9_form.pdf",
    file_url: "",
    desc: "Standard tax identification form pre-arranged.", 
    created_at: new Date(Date.now() - 24 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 24 * 3600 * 1000).toISOString()
  },
];

const DEFAULT_TEAM_MEMBERS: TeamMembership[] = [
  { id: "tm1", email: "meets@example.com", role: "Admin", status: "Active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "tm2", email: "sarah.jenkins@corp.com", role: "Member", status: "Active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "tm3", email: "m.chen@EZSignNow.com", role: "Member", status: "Pending", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

export const fallbackService = {
  // ==========================================
  // TEMPLATES API
  // ==========================================
  async fetchTemplates(ownerId?: string): Promise<Template[]> {
    try {
      const { data, error } = await supabase
        .from("templates" as any)
        .select("*");
      
      if (error) throw error;
      return (data || []) as unknown as Template[];
    } catch (err) {
      console.warn("Supabase templates table fetch failed, falling back to localStorage", err);
      const local = localStorage.getItem("ez_templates");
      if (local) {
        return JSON.parse(local);
      }
      localStorage.setItem("ez_templates", JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
  },

  async createTemplate(template: Omit<Template, "id" | "created_at" | "updated_at">, ownerId: string): Promise<Template> {
    const newTemplate: Template = {
      ...template,
      id: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner_id: ownerId
    };

    try {
      const { data, error } = await supabase
        .from("templates" as any)
        .insert(newTemplate)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as Template;
    } catch (err) {
      console.warn("Supabase templates insert failed, saving to localStorage", err);
      const current = await this.fetchTemplates();
      const updated = [newTemplate, ...current];
      localStorage.setItem("ez_templates", JSON.stringify(updated));
      return newTemplate;
    }
  },

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("templates" as any)
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("Supabase templates delete failed, updating localStorage", err);
      const current = await this.fetchTemplates();
      const filtered = current.filter(t => t.id !== id);
      localStorage.setItem("ez_templates", JSON.stringify(filtered));
      return true;
    }
  },

  // ==========================================
  // TEAM MEMBERSHIPS API
  // ==========================================
  async fetchTeamMembers(): Promise<TeamMembership[]> {
    try {
      const { data, error } = await supabase
        .from("team_memberships" as any)
        .select("*");
      
      if (error) throw error;
      return (data || []) as unknown as TeamMembership[];
    } catch (err) {
      console.warn("Supabase team_memberships fetch failed, falling back to localStorage", err);
      const local = localStorage.getItem("ez_team_memberships");
      if (local) {
        return JSON.parse(local);
      }
      localStorage.setItem("ez_team_memberships", JSON.stringify(DEFAULT_TEAM_MEMBERS));
      return DEFAULT_TEAM_MEMBERS;
    }
  },

  async inviteTeamMember(email: string, invitedBy?: string): Promise<TeamMembership> {
    const newMember: TeamMembership = {
      id: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 9),
      email,
      role: 'Member',
      status: 'Pending',
      invited_by: invitedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from("team_memberships" as any)
        .insert(newMember)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as TeamMembership;
    } catch (err) {
      console.warn("Supabase team_memberships insert failed, saving to localStorage", err);
      const current = await this.fetchTeamMembers();
      // Avoid duplicate emails in fallback
      const filtered = current.filter(m => m.email !== email);
      const updated = [...filtered, newMember];
      localStorage.setItem("ez_team_memberships", JSON.stringify(updated));
      return newMember;
    }
  },

  /**
   * Verification routine for verifying dynamic team invite
   */
  async verifyTeamInvite(email: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("team_memberships" as any)
        .update({ status: "Active", updated_at: new Date().toISOString() })
        .eq("email", email);
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("Supabase team invite verification update failed, updating localStorage", err);
      const current = await this.fetchTeamMembers();
      const updated = current.map(m => {
        if (m.email.toLowerCase() === email.toLowerCase()) {
          return { ...m, status: "Active" as const, updated_at: new Date().toISOString() };
        }
        return m;
      });
      localStorage.setItem("ez_team_memberships", JSON.stringify(updated));
      return true;
    }
  },

  // ==========================================
  // AUDIT LOGS API
  // ==========================================
  async fetchAuditLogs(documentId: string): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .eq("document_id", documentId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as AuditLog[];
    } catch (err) {
      console.warn("Supabase audit_logs fetch failed, falling back to localStorage", err);
      const local = localStorage.getItem(`ez_audit_logs_${documentId}`);
      if (local) {
        return JSON.parse(local);
      }
      return [];
    }
  },

  async createAuditLog(
    documentId: string, 
    action: string, 
    details: string, 
    ipAddress?: string | null, 
    location?: string | null,
    userId?: string | null
  ): Promise<AuditLog> {
    let resolvedIp = ipAddress;
    let resolvedLoc = location;

    if (!resolvedIp || !resolvedLoc) {
      try {
        const geo = await getGeolocationInfo();
        if (!resolvedIp) resolvedIp = geo.ip;
        if (!resolvedLoc) resolvedLoc = geo.location;
      } catch (err) {
        console.error("Failed to automatically resolve geo details for log:", err);
      }
    }

    const newLog: AuditLog = {
      id: crypto.randomUUID?.() || Math.random().toString(36).substring(2, 9),
      document_id: documentId,
      user_id: userId || null,
      action,
      details,
      ip_address: resolvedIp || "127.0.0.1",
      location: resolvedLoc || "Local Sandbox",
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from("audit_logs" as any)
        .insert(newLog)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as AuditLog;
    } catch (err) {
      console.warn("Supabase audit_logs insert failed, saving to localStorage", err);
      const current = await this.fetchAuditLogs(documentId);
      const updated = [...current, newLog];
      localStorage.setItem(`ez_audit_logs_${documentId}`, JSON.stringify(updated));
      return newLog;
    }
  },

  // ==========================================
  // DOCUMENTS HYBRID API WITH PAYMENT FEE
  // ==========================================
  async fetchDocument(id: string): Promise<Document | null> {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Document;
    } catch (err) {
      console.warn(`Supabase document fetch for ${id} failed, falling back to localStorage`, err);
      const local = localStorage.getItem(`ez_doc_${id}`);
      if (local) {
        return JSON.parse(local);
      }
      const allDocsRaw = localStorage.getItem("supabase_documents");
      if (allDocsRaw) {
        const allDocs = JSON.parse(allDocsRaw);
        const doc = allDocs.find((d: any) => d.id === id);
        if (doc) return doc as Document;
      }
      return null;
    }
  },

  async saveDocument(document: Document): Promise<Document> {
    try {
      const { data, error } = await supabase
        .from("documents")
        .upsert(document)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Document;
    } catch (err) {
      console.warn("Supabase document upsert failed, saving to localStorage", err);
      localStorage.setItem(`ez_doc_${document.id}`, JSON.stringify(document));
      
      const allDocsRaw = localStorage.getItem("supabase_documents");
      let allDocs = allDocsRaw ? JSON.parse(allDocsRaw) : [];
      allDocs = allDocs.filter((d: any) => d.id !== document.id);
      allDocs.push(document);
      localStorage.setItem("supabase_documents", JSON.stringify(allDocs));
      
      return document;
    }
  },

  // ==========================================
  // SIGNATORIES HYBRID API WITH ACCESS CODE
  // ==========================================
  async fetchSignatories(documentId: string): Promise<Signatory[]> {
    try {
      const { data, error } = await supabase
        .from("signatories")
        .select("*")
        .eq("document_id", documentId)
        .order("order_num");
      if (error) throw error;
      return (data || []) as unknown as Signatory[];
    } catch (err) {
      console.warn(`Supabase signatories fetch for ${documentId} failed, falling back to localStorage`, err);
      const local = localStorage.getItem(`supabase_signatories_${documentId}`);
      if (local) {
        return JSON.parse(local);
      }
      return [];
    }
  },

  async saveSignatories(documentId: string, signatories: Signatory[]): Promise<Signatory[]> {
    try {
      // Clear existing
      await supabase.from("signatories").delete().eq("document_id", documentId);
      const { data, error } = await supabase
        .from("signatories")
        .insert(signatories)
        .select();
      if (error) throw error;
      return (data || []) as unknown as Signatory[];
    } catch (err) {
      console.warn("Supabase signatories insert/sync failed, saving to localStorage", err);
      localStorage.setItem(`supabase_signatories_${documentId}`, JSON.stringify(signatories));
      return signatories;
    }
  },

  async updateSignatory(signatory: Signatory): Promise<Signatory> {
    try {
      const { data, error } = await supabase
        .from("signatories")
        .update(signatory)
        .eq("id", signatory.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Signatory;
    } catch (err) {
      console.warn("Supabase signatory update failed, updating localStorage", err);
      const current = await this.fetchSignatories(signatory.document_id);
      const updated = current.map(s => s.id === signatory.id ? signatory : s);
      localStorage.setItem(`supabase_signatories_${signatory.document_id}`, JSON.stringify(updated));
      return signatory;
    }
  }
};
