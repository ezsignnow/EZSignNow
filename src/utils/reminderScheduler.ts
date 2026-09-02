import { supabase } from "@/integrations/supabase/client";
import { fallbackService } from "./fallbackService";

interface Signatory {
  id: string;
  document_id: string;
  email: string;
  name: string;
  order_num: number;
  status: string;
  signed_at?: string | null;
  access_code?: string | null;
}

interface Document {
  id: string;
  title: string;
  owner_id: string;
  status: string;
  payment_fee?: number | null;
}

// Cooldown interval for sending reminders (e.g., 2 minutes for sandbox testing)
const REMINDER_COOLDOWN_MS = 2 * 60 * 1000; 

let schedulerIntervalId: any = null;

export const reminderScheduler = {
  /**
   * Scan all pending documents and dispatch Resend reminder emails
   * to signatories who have not yet signed.
   */
  async scanAndRemind(): Promise<{ dispatchedCount: number; checkedCount: number }> {
    console.log("[Reminder Scheduler] Scanning for delayed signatories...");
    let checkedCount = 0;
    let dispatchedCount = 0;

    try {
      // 1. Fetch pending documents
      let pendingDocs: Document[] = [];
      try {
        const { data, error } = await supabase
          .from("documents")
          .select("*")
          .eq("status", "pending");
        
        if (error) throw error;
        pendingDocs = data || [];
      } catch (err) {
        console.warn("[Reminder Scheduler] Supabase fetch documents failed, falling back to localStorage");
        // Try reading documents from local storage if table is not migrated
        const localDocsRaw = localStorage.getItem("supabase_documents");
        if (localDocsRaw) {
          const allDocs = JSON.parse(localDocsRaw);
          pendingDocs = allDocs.filter((d: any) => d.status === "pending");
        }
      }

      console.log(`[Reminder Scheduler] Found ${pendingDocs.length} pending documents.`);
      checkedCount = pendingDocs.length;

      // 2. Loop through each document and inspect signatories
      for (const doc of pendingDocs) {
        let signatories: Signatory[] = [];

        try {
          const { data, error } = await supabase
            .from("signatories")
            .select("*")
            .eq("document_id", doc.id);
          
          if (error) throw error;
          signatories = data || [];
        } catch (err) {
          console.warn(`[Reminder Scheduler] Supabase signatories fetch failed for doc ${doc.id}`);
          const localSigsRaw = localStorage.getItem(`supabase_signatories_${doc.id}`);
          if (localSigsRaw) {
            signatories = JSON.parse(localSigsRaw);
          }
        }

        // Filter signatories who haven't signed yet
        const unsignedSigs = signatories.filter(s => s.status === "pending");
        if (unsignedSigs.length === 0) continue;

        console.log(`[Reminder Scheduler] Document "${doc.title}" has ${unsignedSigs.length} unsigned signatories.`);

        for (const sig of unsignedSigs) {
          const lastReminderKey = `last_reminder_sent_${sig.id}`;
          const lastSentStr = localStorage.getItem(lastReminderKey);
          const now = Date.now();

          if (lastSentStr) {
            const lastSent = Number(lastSentStr);
            if (now - lastSent < REMINDER_COOLDOWN_MS) {
              console.log(`[Reminder Scheduler] Skipping signatory ${sig.email} - reminder sent too recently.`);
              continue;
            }
          }

          // Trigger Resend email
          console.log(`[Reminder Scheduler] Triggering reminder email to ${sig.name} (${sig.email}) for document "${doc.title}"`);
          
          let emailDispatched = false;
          try {
            // We use the same Resend-backed endpoint
            const response = await fetch("/api/send-signing-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                signatories: [sig],
                documentId: doc.id,
                documentTitle: `[REMINDER] ${doc.title}`,
                ownerEmail: "support@ezsignnow.com",
              }),
            });

            if (response.ok) {
              emailDispatched = true;
            }
          } catch (fetchErr) {
            console.error("[Reminder Scheduler] API trigger failed:", fetchErr);
          }

          // Store reminder timestamp to enforce cooldown
          localStorage.setItem(lastReminderKey, String(now));
          dispatchedCount++;

          // Create audit log entry
          await fallbackService.createAuditLog(
            doc.id,
            "reminder_sent",
            `Automatic reminder sent to signatory: ${sig.name} (${sig.email}).`,
            "127.0.0.1",
            "Automatic Cron Scheduler"
          );
        }
      }
    } catch (globalErr) {
      console.error("[Reminder Scheduler] Error during scanning:", globalErr);
    }

    return { checkedCount, dispatchedCount };
  },

  /**
   * Start the scheduler interval to run every scanIntervalMs (default 45 seconds)
   */
  start(scanIntervalMs: number = 45000) {
    if (schedulerIntervalId) {
      console.log("[Reminder Scheduler] Already running.");
      return;
    }

    console.log(`[Reminder Scheduler] Starting cron scheduler with ${scanIntervalMs}ms interval...`);
    
    // Run once immediately
    this.scanAndRemind();

    schedulerIntervalId = setInterval(async () => {
      await this.scanAndRemind();
    }, scanIntervalMs);
  },

  /**
   * Stop the scheduler interval
   */
  stop() {
    if (schedulerIntervalId) {
      clearInterval(schedulerIntervalId);
      schedulerIntervalId = null;
      console.log("[Reminder Scheduler] Stopped.");
    }
  }
};
