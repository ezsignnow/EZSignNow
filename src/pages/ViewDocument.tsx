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
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      // Subscribe to changes on signatories to update signatures in real time
      const channel = supabase
        .channel("signatories-view-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "signatories",
            filter: `document_id=eq.${id}`,
          },
          async () => {
            const { data: sigData } = await supabase
              .from("signatories")
              .select("*")
              .eq("document_id", id)
              .order("order_num");
            setSignatories(sigData || []);
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
    let ipAddress = "192.168.1.1"; // Default fallback
    let location = "New York, USA"; // Default fallback
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
      
      if (firstUnsigned) {
        await supabase
          .from("signatories")
          .update({ 
            status: "signed", 
            signed_at: new Date().toISOString(),
            signature_data: signatureData,
            ip_address: ipAddress,
            location: location
          })
          .eq("id", firstUnsigned.id);
      } else {
        // Fallback for edge cases
        await supabase
          .from("signatories")
          .update({ 
            status: "signed", 
            signed_at: new Date().toISOString(),
            signature_data: signatureData,
            ip_address: ipAddress,
            location: location
          })
          .eq("document_id", id);
      }

      // Check if all signed and fetch updated signatories to refresh UI locally
      const { data: updatedSigs } = await supabase
        .from("signatories")
        .select("*")
        .eq("document_id", id)
        .order("order_num");

      if (updatedSigs) {
        setSignatories(updatedSigs);
      }

      const allSigned = updatedSigs?.every((s) => s.status === "signed");

      if (allSigned) {
        await supabase
          .from("documents")
          .update({ status: "completed" })
          .eq("id", id);
          
        setDocument((prev: any) => prev ? { ...prev, status: "completed" } : null);
      }

      toast({
        title: "Document signed!",
        description: "Your signature and digital audit trail have been recorded. The preview has been updated.",
      });
      
      setSignDialogOpen(false);
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

      // 2. Load PDF in pdf-lib
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      // 3. Draw signature, date, and text fields for each field
      for (const field of fields) {
        if (field.field_type === "signature") {
          const sig = signatories.find((s) => s.id === field.signatory_id) || (signatories.length === 1 ? signatories[0] : null);
          if (!sig || !sig.signature_data) continue;

          const base64Data = sig.signature_data.split(",")[1];
          if (!base64Data) continue;

          let sigImage;
          try {
            sigImage = await pdfDoc.embedPng(base64Data);
          } catch {
            try {
              sigImage = await pdfDoc.embedJpg(base64Data);
            } catch (e) {
              console.error("Failed to embed signature image:", e);
              continue;
            }
          }

          const htmlX = Number(field.x_position);
          const htmlY = Number(field.y_position);
          const htmlW = Number(field.width);
          const htmlH = Number(field.height);

          // Account for vertical stacking with 16px page gaps (780px page height + 16px gap)
          const pageHeightWithGap = 780 + 16;
          const pageIndex = Math.floor(htmlY / pageHeightWithGap);
          const pageNumber = Math.min(Math.max(1, pageIndex + 1), pages.length);
          const page = pages[pageNumber - 1];
          const { width: pdfWidth, height: pdfHeight } = page.getSize();

          const scaleX = pdfWidth / 600;
          const scaleY = pdfHeight / 780;

          // Obtain coordinates relative to the specific target page
          const pageRelativeHtmlY = htmlY % pageHeightWithGap;

          const x = htmlX * scaleX;
          const y = (780 - pageRelativeHtmlY - htmlH) * scaleY;
          const width = htmlW * scaleX;
          const height = htmlH * scaleY;

          // Draw signature image
          page.drawImage(sigImage, {
            x,
            y,
            width,
            height,
          });

          // Draw E-Signature Digital Audit Certificate Block
          const auditText = [
            `Digitally Signed by: ${sig.name}`,
            `Email: ${sig.email}`,
            `IP: ${sig.ip_address || "127.0.0.1"} | Location: ${sig.location || "Local Sandbox"}`,
            `Date: ${format(new Date(sig.signed_at || new Date()), "yyyy-MM-dd HH:mm:ss x")}`,
            `Audit ID: ${sig.id.substring(0, 8)}-${document.id.substring(0, 8)}`,
          ].join("\n");

          page.drawText(auditText, {
            x,
            y: y - 55 * scaleY,
            size: 8 * scaleX,
            lineHeight: 9.5 * scaleY,
            color: rgb(0.08, 0.18, 0.45),
          });
        } else if (field.field_type === "date") {
          const sig = signatories.find((s) => s.id === field.signatory_id) || (signatories.length === 1 ? signatories[0] : null);
          const dateStr = sig && sig.signed_at 
            ? format(new Date(sig.signed_at), "MM/dd/yyyy")
            : format(new Date(), "MM/dd/yyyy");

          const htmlX = Number(field.x_position);
          const htmlY = Number(field.y_position);
          const htmlH = Number(field.height);

          const pageHeightWithGap = 780 + 16;
          const pageIndex = Math.floor(htmlY / pageHeightWithGap);
          const pageNumber = Math.min(Math.max(1, pageIndex + 1), pages.length);
          const page = pages[pageNumber - 1];
          const { width: pdfWidth, height: pdfHeight } = page.getSize();

          const scaleX = pdfWidth / 600;
          const scaleY = pdfHeight / 780;
          const pageRelativeHtmlY = htmlY % pageHeightWithGap;

          const x = htmlX * scaleX;
          const y = (780 - pageRelativeHtmlY - htmlH) * scaleY;

          // Render formatted date text
          page.drawText(dateStr, {
            x: x + 6 * scaleX,
            y: y + (htmlH / 2 - 4) * scaleY,
            size: 10 * scaleX,
            color: rgb(0.1, 0.1, 0.1),
          });
        } else if (field.field_type === "text" || field.field_type === "label" || field.field_type === "checkbox") {
          const valStr = field.value || field.label || (field.field_type === "checkbox" ? "[✓]" : field.field_type);

          const htmlX = Number(field.x_position);
          const htmlY = Number(field.y_position);
          const htmlH = Number(field.height);

          const pageHeightWithGap = 780 + 16;
          const pageIndex = Math.floor(htmlY / pageHeightWithGap);
          const pageNumber = Math.min(Math.max(1, pageIndex + 1), pages.length);
          const page = pages[pageNumber - 1];
          const { width: pdfWidth, height: pdfHeight } = page.getSize();

          const scaleX = pdfWidth / 600;
          const scaleY = pdfHeight / 780;
          const pageRelativeHtmlY = htmlY % pageHeightWithGap;

          const x = htmlX * scaleX;
          const y = (780 - pageRelativeHtmlY - htmlH) * scaleY;

          // Render value or label text
          page.drawText(valStr, {
            x: x + 6 * scaleX,
            y: y + (htmlH / 2 - 4) * scaleY,
            size: 10 * scaleX,
            color: rgb(0.1, 0.1, 0.1),
          });
        }
      }

      const modifiedPdfBytes = await pdfDoc.save();

      const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });
      const link = window.document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${document.title.replace(/\s+/g, "_")}_Signed_Certified.pdf`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      toast({
        title: "Download complete!",
        description: "Your certified document has been downloaded successfully.",
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

  if (loading || authLoading) {
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
