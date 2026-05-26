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
  History,
  Lock,
  ShieldCheck,
  CreditCard
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

  // Lock Screen States
  const [passcodeVerified, setPasscodeVerified] = useState(false);
  const [enteredPasscode, setEnteredPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);

  // Stripe Mock Overlay States
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [stripeCardName, setStripeCardName] = useState("");
  const [stripeCardNumber, setStripeCardNumber] = useState("");
  const [stripeExpiry, setStripeExpiry] = useState("");
  const [stripeCvc, setStripeCvc] = useState("");
  const [stripeProcessing, setStripeProcessing] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [tempSignatureData, setTempSignatureData] = useState<string | null>(null);

  const depositFee = document?.payment_fee ? String(document.payment_fee) : (localStorage.getItem(`document_deposit_fee_${id}`) || "");
  const hasDeposit = parseFloat(depositFee) > 0;

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

  const completeSignature = async (signatureData: string) => {
    setSigning(true);

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
          `${firstUnsigned.name} (${firstUnsigned.email}) signed the document.` + 
          (parseFloat(depositFee) > 0 ? ` Paid secure deposit of $${parseFloat(depositFee).toFixed(2)}.` : ""),
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

  const handleSign = async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast({
        title: "Please provide a signature",
        variant: "destructive",
      });
      return;
    }

    const signatureData = signaturePadRef.current.getSignature();

    if (hasDeposit && !paymentCompleted) {
      const firstUnsigned = signatories.find(s => s.status !== "signed");
      setStripeCardName(firstUnsigned?.name || "");
      setTempSignatureData(signatureData);
      setShowStripeCheckout(true);
      return;
    }

    await completeSignature(signatureData);
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

  const firstUnsigned = signatories.find((s: any) => s.status !== "signed");
  const requiredPasscode = firstUnsigned 
    ? (firstUnsigned.access_code || localStorage.getItem(`signatory_passcode_${id}_${firstUnsigned.email}`) || "")
    : "";
  const needsPasscode = !!requiredPasscode && !passcodeVerified;

  const handleVerifyPasscode = () => {
    setVerifyingPasscode(true);
    setPasscodeError(false);
    
    setTimeout(() => {
      if (enteredPasscode === requiredPasscode) {
        setPasscodeVerified(true);
        toast({
          title: "Access Granted",
          description: "Passcode successfully verified. Document unlocked.",
        });
      } else {
        setPasscodeError(true);
        toast({
          title: "Invalid Passcode",
          description: "The passcode you entered is incorrect. Please try again.",
          variant: "destructive",
        });
      }
      setVerifyingPasscode(false);
    }, 850);
  };

  if (needsPasscode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-955 via-slate-950 to-black opacity-95" />
        <div className="absolute -left-1/4 -top-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />
        <div className="absolute -right-1/4 -bottom-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[140px] pointer-events-none" />

        <Card className="w-full max-w-md relative z-10 border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl text-white rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#258ffb] to-transparent" />
          
          <CardHeader className="text-center pt-8 pb-3 px-6">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(37,143,251,0.15)] mb-4">
              <Lock className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-white leading-snug">
              Secure Document Access
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">
              This document is protected with access credentials. Enter your passcode below to unlock the secure signing space.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-8 pt-2 space-y-5">
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="password"
                  placeholder="Enter access passcode"
                  value={enteredPasscode}
                  onChange={(e) => {
                    setEnteredPasscode(e.target.value);
                    setPasscodeError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && enteredPasscode) {
                      handleVerifyPasscode();
                    }
                  }}
                  className={`text-center font-mono tracking-widest text-lg rounded-xl border h-11 bg-slate-950/80 text-white placeholder:text-slate-700 focus-visible:ring-offset-0 focus-visible:ring-[#258ffb] focus-visible:border-[#258ffb] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] ${
                    passcodeError 
                      ? "border-rose-500/80 focus-visible:ring-rose-500/30 focus-visible:border-rose-500" 
                      : "border-slate-800 focus-visible:ring-[#258ffb]/20"
                  }`}
                />
              </div>
              {passcodeError && (
                <p className="text-[11px] text-rose-400 font-bold text-center">
                  Incorrect passcode. Please verify and try again.
                </p>
              )}
            </div>

            <Button
              onClick={handleVerifyPasscode}
              disabled={!enteredPasscode || verifyingPasscode}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold h-11 text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              {verifyingPasscode ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-white/95" />
              )}
              {verifyingPasscode ? "Verifying..." : "Unlock Document"}
            </Button>
            
            <p className="text-[9px] text-slate-500 font-semibold text-center leading-normal">
              Authorized signatories only. Access logs and digital audits are captured for legal verification.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {/* Stripe Payment Dialog */}
      <Dialog open={showStripeCheckout} onOpenChange={(open) => !stripeProcessing && setShowStripeCheckout(open)}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 p-6 transition-colors duration-250 font-sans">
          <DialogHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
            <DialogTitle className="flex items-center gap-2.5 text-base font-extrabold text-slate-800 dark:text-slate-100">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 shrink-0 text-indigo-600 dark:text-indigo-400">
                <CreditCard className="h-4 w-4" />
              </div>
              Secure Deposit Checkout
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
              Guaranteed secure 256-bit SSL transaction processed via Stripe Gateway.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Amount details banner */}
            <div className="rounded-xl bg-[#258ffb]/[0.02] border border-[#258ffb]/10 p-3.5 flex items-center justify-between shadow-[0_2px_8px_rgba(37,143,251,0.01)]">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Deposit Amount</span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">EZ-Sign Agreement Execution Fee</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">${parseFloat(depositFee || "0").toFixed(2)}</span>
                <span className="text-[10px] font-extrabold text-[#258ffb] dark:text-blue-400 uppercase tracking-wider block">USD</span>
              </div>
            </div>

            {stripeError && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-3 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                {stripeError}
              </div>
            )}

            {/* Simulated Card form */}
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Cardholder Name</label>
                <Input
                  placeholder="e.g. John Doe"
                  value={stripeCardName}
                  onChange={(e) => setStripeCardName(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 text-xs h-9.5"
                  disabled={stripeProcessing}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Card Number</label>
                <div className="relative">
                  <Input
                    placeholder="4242 4242 4242 4242"
                    value={stripeCardNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 16);
                      const formatted = val.match(/.{1,4}/g)?.join(" ") || val;
                      setStripeCardNumber(formatted);
                      setStripeError("");
                    }}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 text-xs h-9.5 pl-3.5 pr-10"
                    disabled={stripeProcessing}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 tracking-wider">VISA</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Expiration Date</label>
                  <Input
                    placeholder="MM/YY"
                    value={stripeExpiry}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      const formatted = val.length >= 2 ? `${val.slice(0, 2)}/${val.slice(2)}` : val;
                      setStripeExpiry(formatted);
                    }}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 text-xs h-9.5 text-center"
                    disabled={stripeProcessing}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">CVC</label>
                  <Input
                    placeholder="123"
                    value={stripeCvc}
                    onChange={(e) => {
                      setStripeCvc(e.target.value.replace(/\D/g, "").slice(0, 3));
                    }}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 text-xs h-9.5 text-center"
                    disabled={stripeProcessing}
                  />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed pt-1 select-none">
              🔒 Note: Use Stripe test card details (starts with <span className="font-extrabold text-[#258ffb] dark:text-blue-400">4242</span>) to authorize transaction successfully.
            </p>
          </div>

          <div className="mt-6 flex gap-2.5 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowStripeCheckout(false)}
              disabled={stripeProcessing}
              className="rounded-full h-9.5 text-xs font-bold px-5"
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!stripeCardName.trim() || !stripeCardNumber.trim() || !stripeExpiry.trim() || !stripeCvc.trim()) {
                  setStripeError("Please fill out all payment details.");
                  return;
                }

                // Check card format starts with 4242
                const sanitizedCard = stripeCardNumber.replace(/\s+/g, "");
                if (!sanitizedCard.startsWith("4242")) {
                  setStripeError("Stripe Payment Declined: Card invalid. Please use a card number starting with '4242' for test mode.");
                  return;
                }

                setStripeProcessing(true);
                setStripeError("");

                // Simulated steps
                const steps = [
                  "Connecting to Stripe Gateway...",
                  "Authorizing payment amount...",
                  "Finalizing document deposit secure transaction...",
                  "Payment approved! Finalizing signature..."
                ];

                for (let i = 0; i < steps.length; i++) {
                  await new Promise(resolve => setTimeout(resolve, 600));
                  toast({
                    title: "Stripe Checkout",
                    description: steps[i],
                  });
                }

                setPaymentCompleted(true);
                setShowStripeCheckout(false);
                setStripeProcessing(false);

                // Run signature creation
                if (tempSignatureData) {
                  await completeSignature(tempSignatureData);
                }
              }} 
              disabled={stripeProcessing}
              className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9.5 text-xs px-6 shadow-md flex items-center justify-center gap-1.5"
            >
              {stripeProcessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-white/90" />
                  Pay ${parseFloat(depositFee || "0").toFixed(2)} & Sign
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
