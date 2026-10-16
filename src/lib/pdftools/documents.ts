import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { logDocumentEvent } from "@/utils/auditLogger";
import type { InputFile } from "./core";
import { fileId } from "./handoff";

export interface DocSummary {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  status: string;
  created_at: string;
}

export async function listMyDocuments(userId: string): Promise<DocSummary[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id,title,file_name,file_url,status,created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as DocSummary[];
}

export async function downloadDocument(doc: DocSummary): Promise<InputFile> {
  const path = doc.file_url.split("/documents/")[1];
  if (!path) throw new Error("Document file not found");
  const { data, error } = await supabase.storage.from("documents").download(decodeURIComponent(path));
  if (error || !data) throw error || new Error("Download failed");
  return { id: fileId(), name: doc.file_name?.toLowerCase().endsWith(".pdf") ? doc.file_name : `${doc.title}.pdf`, type: "application/pdf", bytes: new Uint8Array(await data.arrayBuffer()) };
}

/** Uploads a PDF and adds it to the user's documents as a draft. Returns the new id. */
export async function saveToMyDocuments(user: User, name: string, bytes: Uint8Array): Promise<string> {
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.pdf`;
  const { error: upErr } = await supabase.storage.from("documents").upload(path, new Blob([bytes], { type: "application/pdf" }), { contentType: "application/pdf" });
  if (upErr) throw upErr;
  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
  const title = name.replace(/\.pdf$/i, "");
  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: user.id, title, file_url: urlData.publicUrl, file_name: name, file_size: bytes.length, status: "draft" })
    .select()
    .single();
  if (error || !data) throw error || new Error("Could not create the document");
  logDocumentEvent(data.id, "upload", undefined, user.email || undefined, (user.user_metadata?.full_name || "Document Owner") as string).catch(() => undefined);
  return data.id;
}
