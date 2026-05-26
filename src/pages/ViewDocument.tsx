import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { SignaturePad, SignaturePadRef } from "@/components/signature/SignaturePad";
import { DocumentCanvas } from "@/components/documents/DocumentCanvas";
import { Button } from "@/components/ui/button";
import { PDFDocument, rgb } from "pdf-lib";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  Users,
  PenLine,
  Loader2,
  History
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fallbackService, AuditLog } from "@/utils/fallbackService";
import { generateCertifiedPdf } from "@/utils/pdfGenerator";

export default function ViewDocument() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const signaturePadRef = useRef<SignaturePadRef>(null);
  
  const [document, setDocument] = useState<any>(null);
  const [signatories, setSignatories] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [signSuccess, setSignSuccess] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const scrollToSignatureField = () => {
    const firstUnsigned = signatories.find((s: any) => s.status !== "signed");
    const sigField = fields.find(
      (f: any) => f.field_type === "signature" && (f.signatory_id === firstUnsigned?.id || signatories.length === 1)
    );

    if (sigField) {
      const scrollContainer = window.document.getElementById("document-scroll-container");
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: Math.max(0, Number(sigField.y_position) - 150),
          behavior: "smooth",
        });
      }
    }
  };

  useEffect(() => {
    if (!loading && fields.length > 0) {
      const timer = setTimeout(() => {
        scrollToSignatureField();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, fields]);

  const handleOpenSignDialog = () => {
    scrollToSignatureField();
    setSignDialogOpen(true);
  };

  useEffect(() => {
    // Only redirect to login for authenticated-only views (like /dashboard).
    // ViewDocument is intentionally public so external signatories can sign
    // documents without needing an EZSignNow account.
    // No redirect here — allow unauthenticated access.
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id) {
      // Subscribe to signatory changes for real-time status updates
      const channel = supabase
        .channel(`signatories-view-${id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "signatories",
            filter: `document_id=eq.${id}`,
          },
          async () => {
            // Refresh signatories
            const { data: sigData } = await supabase
              .from("signatories")
              .select("*")
              .eq("document_id", id)
              .order("order_num");
            if (sigData) setSignatories(sigData);

            // Refresh document status
            const { data: docData } = await supabase
              .from("documents")
              .select("*")
              .eq("id", id)
              .single();
            if (docData) setDocument(docData);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id) return;

      // Fetch document by ID only — no owner_id filter so signatories
      // (who are NOT the document owner) can access pending documents.
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast({
          title: "Document not found",
          description: "This signing link may be invalid or the document has been removed.",
          variant: "destructive",
        });
        // Navigate to home for unauthenticated users, dashboard for logged-in owners
        navigate(user ? "/dashboard" : "/");
        return;
      }

      setDocument(data);

      // Download the PDF — try authenticated first, fall back to public path
      try {
        const path = data.file_url.split("/documents/")[1];
        if (path) {
          const { data: blob, error: downloadError } = await supabase.storage
            .from("documents")
            .download(path);

          if (downloadError) throw downloadError;

          if (blob) {
            const localUrl = URL.createObjectURL(blob);
            setPdfUrl(localUrl);
          }
        }
      } catch (err: any) {
        console.error("Error downloading PDF:", err);
      }

      const { data: sigData } = await supabase
        .from("signatories")
        .select("*")
        .eq("document_id", id)
        .order("order_num");

      setSignatories(sigData || []);

      const { data: fieldData } = await supabase
        .from("signature_fields")
        .select("*")
        .eq("document_id", id);

      setFields(fieldData || []);
      
      try {
        await fallbackService.createAuditLog(
          id,
          "opened",
          user ? `Document opened by owner (${user?.email || "unknown"})` : `Document opened for signing`
        );
        const logs = await fallbackService.fetchAuditLogs(id);
        setAuditLogs(logs);
      } catch (err) {
        console.error("Error creating audit log:", err);
      }

      setLoading(false);
    };

    fetchDocument();
  }, [id, user, navigate, toast]);

  const handleSign = async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast({
        title: "Please provide a signature",
        variant: "destructive",
      });
      return;
    }

    setSigning(true);
    const signatureData = signaturePadRef.current.getSignature();

    // Capture Geolocation & IP Address
    let ipAddress = "192.168.1.1";
    let location = "New York, USA";
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      ipAddress = ipData.ip;

      const locRes = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      const locData = await locRes.json();
      if (locData.city && locData.country_name) {
        location = `${locData.city}, ${locData.country_name}`;
      }
    } catch (err) {
      console.error("Error capturing geolocation:", err);
    }

    try {
      const firstUnsigned = signatories.find(s => s.status !== "signed");

      if (!firstUnsigned) {
        toast({ title: "All signatories have already signed.", variant: "destructive" });
        setSigning(false);
        return;
      }

      // Update the signatory record
      const { error: updateError } = await supabase
        .from("signatories")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          signature_data: signatureData,
          ip_address: ipAddress,
          location: location,
        })
        .eq("id", firstUnsigned.id);

      if (updateError) {
        console.error("Signatory update error:", updateError);
        throw new Error(updateError.message);
      }

      try {
        await fallbackService.createAuditLog(
          id!,
          "signed",
          `${firstUnsigned.name} (${firstUnsigned.email}) signed the document.`,
          ipAddress,
          location
        );
      } catch (err) {
        console.error("Error creating audit log:", err);
      }

      // Re-fetch signatories to get fresh data
      const { data: updatedSigs, error: fetchSigsError } = await supabase
        .from("signatories")
        .select("*")
        .eq("document_id", id)
        .order("order_num");

      if (fetchSigsError) {
        console.error("Refetch signatories error:", fetchSigsError);
      }

      const freshSigs = updatedSigs || signatories.map(s =>
        s.id === firstUnsigned.id ? { ...s, status: "signed", signed_at: new Date().toISOString(), signature_data: signatureData } : s
      );

      setSignatories(freshSigs);

      const allSigned = freshSigs.every((s) => s.status === "signed");

      if (allSigned) {
        const { error: docUpdateError } = await supabase
          .from("documents")
          .update({ status: "completed" })
          .eq("id", id);

        if (docUpdateError) {
          console.error("Document status update error:", docUpdateError);
        }

        try {
          await fallbackService.createAuditLog(
            id!,
            "completed",
            `Document fully signed and certified.`,
            ipAddress,
            location
          );
        } catch (err) {
          console.error("Error logging document completion:", err);
        }

        // Re-fetch document to confirm status change
        const { data: freshDoc } = await supabase
          .from("documents")
          .select("*")
          .eq("id", id)
          .single();

        if (freshDoc) {
          setDocument(freshDoc);
        } else {
          setDocument((prev: any) => prev ? { ...prev, status: "completed" } : null);
        }
      }

      try {
        const freshLogs = await fallbackService.fetchAuditLogs(id!);
        setAuditLogs(freshLogs);
      } catch (err) {
        console.error("Error fetching fresh audit logs:", err);
      }

      setSignSuccess(true);
      setSignDialogOpen(false);

      toast({
        title: allSigned ? "🎉 Document fully signed!" : "✅ Signature recorded!",
        description: allSigned
          ? "All parties have signed. You can now download the certified PDF."
          : "Your signature has been recorded. Waiting for remaining signatories.",
      });
    } catch (error: any) {
      toast({
        title: "Error signing",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadCertified = async () => {
    if (!id || !document || !pdfUrl) return;
    setDownloadingPdf(true);

    try {
      // 1. Fetch original PDF file from Supabase storage
      const path = document.file_url.split("/documents/")[1];
      if (!path) throw new Error("Document storage path not found");

      const { data: pdfBlob, error: downloadError } = await supabase.storage
        .from("documents")
        .download(path);

      if (downloadError || !pdfBlob) throw downloadError || new Error("Failed to download PDF from storage");

      const pdfBytes = await pdfBlob.arrayBuffer();

      // 2. Fetch fresh audit logs to compile the certificate page accurately
      let latestLogs = auditLogs;
      try {
        latestLogs = await fallbackService.fetchAuditLogs(id);
      } catch (err) {
        console.error("Error fetching latest audit logs for PDF generation:", err);
      }

      // 3. Generate the certified PDF containing signatures and appended completion certificate
      const certifiedPdfBytes = await generateCertifiedPdf(
        pdfBytes,
        document,
        signatories,
        fields,
        latestLogs as any[]
      );

      // 4. Download file
      const blob = new Blob([certifiedPdfBytes], { type: "application/pdf" });
      const link = window.document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${document.title.replace(/\s+/g, "_")}_Signed_Certified.pdf`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      toast({
        title: "Download complete!",
        description: "Your certified document and audit trail cover page have been downloaded successfully.",
      });
    } catch (err: any) {
      console.error("Error generating signed PDF:", err);
      toast({
        title: "Failed to generate certified PDF",
        description: err.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Only block render on the initial page load, not on Supabase auth state changes.
  // Anonymous signatories never have a user session so authLoading must not gate the view.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{document.title}</h1>
              <p className="text-sm text-muted-foreground">
                Created {format(new Date(document.created_at), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
          {document.status === "completed" && (
            <Button onClick={handleDownloadCertified} disabled={downloadingPdf} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              {downloadingPdf ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Download Certified PDF
                </>
              )}
            </Button>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
          {/* Document Preview */}
          <Card className="overflow-hidden flex flex-col h-[800px]">
            {pdfUrl ? (
              <div className="relative flex-1 bg-accent">
                <DocumentCanvas
                  fields={fields.map((f) => {
                    let signatoryIndex = f.signatory_id
                      ? signatories.findIndex((s: any) => s.id === f.signatory_id)
                      : -1;

                    // Fallback to first signatory if only one exists or if index is invalid
                    if (signatoryIndex === -1) {
                      signatoryIndex = 0;
                    }

                    return {
                      id: f.id,
                      type: f.field_type,
                      x: Number(f.x_position),
                      y: Number(f.y_position),
                      width: Number(f.width),
                      height: Number(f.height),
                      label: f.label || undefined,
                      tooltip: f.tooltip || undefined,
                      required: f.required,
                      signatoryIndex: signatoryIndex !== -1 ? signatoryIndex : null,
                      value: f.value || undefined,
                    };
                  })}
                  onFieldsChange={() => {}}
                  signatories={signatories.map((s, i) => {
                    const colors = [
                      "hsl(200, 98%, 39%)",
                      "hsl(142, 76%, 36%)",
                      "hsl(262, 83%, 58%)",
                      "hsl(24, 100%, 50%)",
                      "hsl(340, 82%, 52%)",
                    ];
                    return {
                      ...s,
                      color: colors[i % colors.length],
                    };
                  })}
                  selectedSignatory={null}
                  readOnly={true}
                  fileUrl={pdfUrl}
                  onFieldClick={() => document.status === "pending" && setSignDialogOpen(true)}
                />
                {document.status === "pending" && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 shadow-lg">
                    <Button onClick={handleOpenSignDialog}>
                      <PenLine className="mr-2 h-4 w-4" />
                      Sign Document
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <CardContent className="flex h-full items-center justify-center p-8">
                <div className="text-center">
                  <FileText className="mx-auto h-16 w-16 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium text-foreground">
                    {document.file_name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Document preview would appear here
                  </p>
                  {document.status === "pending" && (
                    <Button className="mt-6" onClick={handleOpenSignDialog}>
                      <PenLine className="mr-2 h-4 w-4" />
                      Sign Document
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Document Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {document.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-amber-500" />
                  )}
                  <span className="font-medium capitalize text-foreground">
                    {document.status}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Signatories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Signatories ({signatories.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {signatories.map((sig) => (
                  <div
                    key={sig.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">{sig.name}</p>
                      <p className="text-xs text-muted-foreground">{sig.email}</p>
                    </div>
                    {sig.status === "signed" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <div className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
                        Pending
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Fields Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fields ({fields.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between rounded border border-border p-2"
                  >
                    <span className="text-sm text-foreground capitalize">
                      {field.label || field.field_type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {field.required ? "Required" : "Optional"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Audit Trail */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-500" />
                  Audit Trail ({auditLogs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[250px] overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No audit logs captured yet.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0"
                    >
                      <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                        <span className="uppercase text-[#258ffb]">{log.action}</span>
                        <span>{format(new Date(log.created_at), "HH:mm:ss")}</span>
                      </div>
                      <p className="font-medium text-slate-700 mt-0.5">{log.details}</p>
                      {log.location && (
                        <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">
                          Via: {log.ip_address} ({log.location})
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Sign Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            <DialogDescription>
              Draw your signature below to sign this document.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <SignaturePad ref={signaturePadRef} width={380} height={150} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={signing}>
              {signing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="mr-2 h-4 w-4" />
              )}
              Sign Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
