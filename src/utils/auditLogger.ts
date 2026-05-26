import { supabase } from "@/integrations/supabase/client";
import { getGeolocationInfo } from "./geolocation";

export type AuditEventType = "upload" | "view" | "signature";

export interface AuditLog {
  id: string;
  document_id: string;
  signatory_id?: string;
  event_type: AuditEventType;
  email?: string;
  name?: string;
  ip_address: string;
  location: string;
  user_agent: string;
  created_at: string;
}

const LOCAL_STORAGE_KEY = "ez_sign_audit_logs";

// Retrieve localStorage logs
function getLocalLogs(documentId: string): AuditLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditLog[];
    return parsed.filter(log => log.document_id === documentId);
  } catch (e) {
    console.error("Error reading local logs:", e);
    return [];
  }
}

// Save log to localStorage
function saveLocalLog(log: AuditLog) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AuditLog[]) : [];
    parsed.push(log);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.error("Error saving local log:", e);
  }
}

export async function logDocumentEvent(
  documentId: string,
  eventType: AuditEventType,
  signatoryId?: string,
  email?: string,
  name?: string
): Promise<AuditLog | null> {
  try {
    const geo = await getGeolocationInfo();
    const newLog: Omit<AuditLog, "id" | "created_at"> = {
      document_id: documentId,
      signatory_id: signatoryId || null,
      event_type: eventType,
      email: email || null,
      name: name || null,
      ip_address: geo.ip,
      location: geo.location,
      user_agent: geo.userAgent,
    };

    // Attempt to write to Supabase
    const { data, error } = await supabase
      .from("document_audit_logs" as any)
      .insert(newLog as any)
      .select()
      .single();

    if (error) {
      // If table doesn't exist, we fallback
      console.warn("Supabase logging failed, falling back to localStorage", error);
      const fallbackLog: AuditLog = {
        id: crypto.randomUUID(),
        ...newLog,
        created_at: new Date().toISOString(),
      };
      saveLocalLog(fallbackLog);
      return fallbackLog;
    }

    return data as any as AuditLog;
  } catch (err) {
    console.error("Error in logDocumentEvent", err);
    // Standard client side fallback
    const geo = { ip: "127.0.0.1", location: "Local Sandbox", userAgent: navigator.userAgent };
    const fallbackLog: AuditLog = {
      id: crypto.randomUUID(),
      document_id: documentId,
      signatory_id: signatoryId || null,
      event_type: eventType,
      email: email || null,
      name: name || null,
      ip_address: geo.ip,
      location: geo.location,
      user_agent: geo.userAgent,
      created_at: new Date().toISOString(),
    };
    saveLocalLog(fallbackLog);
    return fallbackLog;
  }
}

export async function getDocumentAuditLogs(documentId: string): Promise<AuditLog[]> {
  try {
    const { data, error } = await supabase
      .from("document_audit_logs" as any)
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Failed to fetch logs from Supabase, loading local logs", error);
      return getLocalLogs(documentId);
    }

    // Merge both to be safe
    const local = getLocalLogs(documentId);
    const dbLogs = (data as any as AuditLog[]) || [];
    
    // De-duplicate by event type, ip, email, and signatory_id to prevent redundant UI renderings
    const all = [...dbLogs];
    local.forEach(locLog => {
      const isDuplicated = all.some(
        dbLog => 
          dbLog.event_type === locLog.event_type && 
          dbLog.email === locLog.email &&
          Math.abs(new Date(dbLog.created_at).getTime() - new Date(locLog.created_at).getTime()) < 10000 // within 10s
      );
      if (!isDuplicated) {
        all.push(locLog);
      }
    });

    // Sort by timestamp
    return all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } catch (err) {
    console.error("Error in getDocumentAuditLogs", err);
    return getLocalLogs(documentId);
  }
}
