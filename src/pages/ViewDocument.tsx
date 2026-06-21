import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  CreditCard,
  Laptop,
  Clock,
  ChevronRight,
  ArrowRight
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
  
  const [searchParams] = useSearchParams();
  const [showKioskHandoff, setShowKioskHandoff] = useState(false);
  const [nextKioskSigner, setNextKioskSigner] = useState<any>(null);
  
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
  
  // Advanced fields states
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [drawingDialogOpen, setDrawingDialogOpen] = useState(false);
  const [mockUploading, setMockUploading] = useState(false);
  const [mockUploadStep, setMockUploadStep] = useState("");

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

      // Dispatch action emails
      try {
        if (allSigned) {
          await fetch("/api/send-action-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emails: freshSigs.map(s => s.email),
              documentTitle: document?.title || document?.file_name || "Document",
              actionType: "completed",
              actorName: "All Parties",
            }),
          });
        } else {
          await fetch("/api/send-action-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              emails: [freshSigs.find(s => s.status !== "signed")?.email || "owner@ezsignnow.com"],
              documentTitle: document?.title || document?.file_name || "Document",
              actionType: "signed",
              actorName: firstUnsigned.name,
            }),
          });
        }
      } catch (err) {
        console.error("Failed to send action email:", err);
      }

      try {
        const freshLogs = await fallbackService.fetchAuditLogs(id!);
        setAuditLogs(freshLogs);
      } catch (err) {
        console.error("Error fetching fresh audit logs:", err);
      }

      const isKioskMode = searchParams.get("kiosk") === "true" || localStorage.getItem(`document_in_person_signing_${id}`) === "true";
      if (isKioskMode && !allSigned) {
        const nextSigner = freshSigs.find(s => s.status !== "signed");
        if (nextSigner) {
          setNextKioskSigner(nextSigner);
          setShowKioskHandoff(true);
        }
      } else {
        setSignSuccess(true);
      }
      setSignDialogOpen(false);

      toast({
        title: allSigned ? "🎉 Document fully signed!" : "✅ Signature recorded!",
        description: allSigned
          ? "All parties have signed. You can now download the certified PDF."
          : isKioskMode
            ? `Signature recorded! Preparing for ${freshSigs.find(s => s.status !== "signed")?.name || "next signer"}...`
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

  // Check strict routing order and kiosk mode settings
  const isStrictRoutingActive = localStorage.getItem(`document_strict_routing_${id}`) === "true";
  const isKioskMode = searchParams.get("kiosk") === "true" || localStorage.getItem(`document_in_person_signing_${id}`) === "true";
  
  const currentSignerEmail = searchParams.get("email") || searchParams.get("signer_email");
  const currentSignerId = searchParams.get("signer") || searchParams.get("signatory_id");

  let isDownstream = false;
  if (isStrictRoutingActive && firstUnsigned) {
    if (currentSignerEmail) {
      const visitor = signatories.find((s: any) => s.email.toLowerCase() === currentSignerEmail.toLowerCase());
      if (visitor && visitor.order_num > firstUnsigned.order_num) {
        isDownstream = true;
      }
    } else if (currentSignerId) {
      const visitor = signatories.find((s: any) => s.id === currentSignerId);
      if (visitor && visitor.order_num > firstUnsigned.order_num) {
        isDownstream = true;
      }
    }
  }

  // Downstream signer warning gate (Strict Routing Order)
  if (isStrictRoutingActive && isDownstream && firstUnsigned) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-95" />
        <div className="absolute -left-1/4 -top-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />
        
        <Card className="w-full max-w-md relative z-10 border border-blue-500/20 bg-blue-950/20 backdrop-blur-xl text-white rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#2563eb] to-transparent" />
          <CardContent className="text-center pt-10 pb-10 px-8 space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(37,143,251,0.2)] animate-pulse">
              <Clock className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-[#2563eb] tracking-wider uppercase bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                Strict Routing Order Active
              </span>
              <h2 className="text-xl font-black tracking-tight text-white pt-2">
                Waiting on {firstUnsigned.name}...
              </h2>
              <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                This document is configured with a sequential signing workflow. You will be notified via email once {firstUnsigned.name} (Signer {firstUnsigned.order_num}) has completed their signature.
              </p>
            </div>
            <div className="border-t border-slate-800/80 pt-5 flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                {signatories.map((sig: any, idx: number) => (
                  <div 
                    key={idx}
                    className={`h-7 w-7 rounded-full border border-slate-950 flex items-center justify-center text-[9px] font-black text-white shrink-0 shadow-sm ${
                      sig.status === 'signed' 
                        ? 'bg-blue-500' 
                        : sig.order_num === firstUnsigned.order_num 
                          ? 'bg-blue-500 animate-pulse' 
                          : 'bg-slate-850 text-slate-500'
                    }`}
                  >
                    {sig.name.slice(0, 1).toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-slate-500 font-bold">
                Signer {firstUnsigned.order_num} of {signatories.length} active
              </span>
            </div>
            <Button 
              onClick={() => navigate("/dashboard")}
              className="w-full rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white font-bold h-11 text-xs transition-all shadow-md"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Kiosk Handoff Screen overlay
  if (isKioskMode && showKioskHandoff && nextKioskSigner) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-95" />
        <Card className="w-full max-w-md relative z-10 border border-blue-500/20 bg-slate-900/40 backdrop-blur-xl text-white rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#2563eb] to-transparent" />
          <CardContent className="text-center pt-10 pb-10 px-8 space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(37,143,251,0.2)] animate-bounce">
              <Laptop className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-[#2563eb] tracking-wider uppercase bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                In-Person Kiosk Mode
              </span>
              <h2 className="text-xl font-black tracking-tight text-white pt-2">
                Kiosk Handoff Screen
              </h2>
              <p className="text-[13px] text-slate-300 font-bold leading-relaxed max-w-sm mx-auto">
                Please hand this device over to <span className="text-[#2563eb] font-black">{nextKioskSigner.name}</span> to sign.
              </p>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-xs mx-auto">
                Email: {nextKioskSigner.email}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Signer Flow Progress</span>
                <span>{signatories.filter((s: any) => s.status === 'signed').length} of {signatories.length} completed</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                  style={{ width: `${(signatories.filter((s: any) => s.status === 'signed').length / signatories.length) * 100}%` }}
                />
              </div>
            </div>
            <Button
              onClick={() => {
                setShowKioskHandoff(false);
                setPasscodeVerified(false);
                setEnteredPasscode("");
                setSignDialogOpen(true);
              }}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              I am {nextKioskSigner.name}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Kiosk Session Complete Page
  const allSigned = signatories.length > 0 && signatories.every((s: any) => s.status === "signed");
  if (isKioskMode && allSigned) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-95" />
        <Card className="w-full max-w-md relative z-10 border border-blue-500/20 bg-slate-900/40 backdrop-blur-xl text-white rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-in fade-in duration-200">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#10b981] to-transparent" />
          <CardContent className="text-center pt-10 pb-10 px-8 space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-[#10b981] tracking-wider uppercase bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                In-Person Kiosk Session Complete
              </span>
              <h2 className="text-xl font-black tracking-tight text-white pt-2">
                All Parties Have Signed!
              </h2>
              <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                The document is now legally finalized and certified. We've compiled the secure digital signatures and audit logs.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-850 pb-2 last:border-0">
                <span>Document Title</span>
                <span className="text-slate-200 text-right truncate max-w-[180px]">{document.title}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>Total Signatures</span>
                <span className="text-slate-200">{signatories.length}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={handleDownloadCertified}
                disabled={downloadingPdf}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold h-11 text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {downloadingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <FileText className="h-4 w-4 text-white" />
                )}
                {downloadingPdf ? "Generating Certified PDF..." : "Download Certified PDF"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white font-bold h-11 text-xs transition-all shadow-md"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-95" />
        <div className="absolute -left-1/4 -top-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none" />
        <div className="absolute -right-1/4 -bottom-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[140px] pointer-events-none" />

        <Card className="w-full max-w-md relative z-10 border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl text-white rounded-3xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#2563eb] to-transparent" />
          
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
                  className={`text-center font-mono tracking-widest text-lg rounded-xl border h-11 bg-slate-950/80 text-white placeholder:text-slate-700 focus-visible:ring-offset-0 focus-visible:ring-[#2563eb] focus-visible:border-[#2563eb] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] ${
                    passcodeError 
                      ? "border-rose-500/80 focus-visible:ring-rose-500/30 focus-visible:border-rose-500" 
                      : "border-slate-800 focus-visible:ring-[#2563eb]/20"
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
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 text-xs transition-all shadow-md flex items-center justify-center gap-2"
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
        {document.status === "completed" ? (
          <div className="w-full max-w-6xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm mb-12">
            
            {/* Top Bar */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <span className="text-[#1e0098]">Status:</span> {document.title}
              </h1>
              <Button onClick={handleDownloadCertified} disabled={downloadingPdf} className="bg-[#1e0098] hover:bg-[#15006b] text-white rounded-full px-6 shadow-md transition-transform hover:scale-105">
                {downloadingPdf ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating PDF...</>
                ) : (
                  "Download Document"
                )}
              </Button>
            </div>

            {/* Sender Row */}
            <div className="bg-slate-100/50 px-6 py-3 border-b border-slate-200 text-sm text-slate-600 text-center font-medium">
              Document sent via EZSignNow Secure Portal
            </div>

            {/* Document Details Row */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className="bg-blue-400 text-white text-xs font-bold px-3 py-1 rounded-sm uppercase tracking-wider">
                  Completed
                </div>
                <span className="text-sm font-semibold text-slate-800">{document.file_name}</span>
              </div>
              <div className="text-sm text-slate-500">
                Created on {format(new Date(document.created_at), "MMM d, yyyy")}
              </div>
            </div>

            {/* Signatories Table */}
            <div className="w-full">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <div className="col-span-2">Order</div>
                <div className="col-span-6">Recipient</div>
                <div className="col-span-4 text-right pr-12">Status</div>
              </div>
              {signatories.map((sig, idx) => (
                <div key={sig.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 items-center">
                  <div className="col-span-2 text-sm text-slate-600">Signer #{idx + 1}</div>
                  <div className="col-span-6 flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">{sig.name}</span>
                    <span className="text-xs text-slate-500">{sig.email}</span>
                  </div>
                  <div className="col-span-4 flex items-center justify-end gap-3 pr-4">
                    <div className="bg-blue-400 text-white text-[11px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">
                      Signed
                    </div>
                    <span className="text-xs text-slate-500">
                      on {sig.signed_at ? format(new Date(sig.signed_at), "MMM d, yyyy") : "Unknown"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* PDF Viewer Section */}
            <div className="bg-slate-50 p-6 flex justify-center">
              <div className="border border-slate-300 shadow-sm bg-white overflow-hidden max-w-[800px] w-full">
                {pdfUrl ? (
                  <DocumentCanvas
                    fields={fields.map((f) => ({
                      id: f.id,
                      type: f.field_type,
                      x: Number(f.x_position),
                      y: Number(f.y_position),
                      width: Number(f.width),
                      height: Number(f.height),
                      label: f.label || undefined,
                      value: f.value || undefined,
                      signatoryIndex: 0,
                    }))}
                    onFieldsChange={() => {}}
                    signatories={signatories}
                    selectedSignatory={null}
                    readOnly={true}
                    fileUrl={pdfUrl}
                    onFieldClick={() => {}}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400">Loading document preview...</div>
                )}
              </div>
            </div>

          </div>
        ) : (
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
                  onFieldClick={(fieldId) => {
                    if (document.status !== "pending") return;
                    const clickedField = fields.find(f => f.id === fieldId);
                    if (!clickedField) return;
                    
                    setSelectedFieldId(fieldId);
                    if (clickedField.field_type === "signature") {
                      setSignDialogOpen(true);
                    } else if (clickedField.field_type === "attachment") {
                      setAttachmentDialogOpen(true);
                    } else if (clickedField.field_type === "drawing") {
                      setDrawingDialogOpen(true);
                    }
                  }}
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
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
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
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
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
                        <span className="uppercase text-[#2563eb]">{log.action}</span>
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
        )}
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
              <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-indigo-950/30 flex items-center justify-center border border-slate-100 dark:border-indigo-900 shrink-0 text-slate-600 dark:text-indigo-400">
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
            <div className="rounded-xl bg-[#2563eb]/[0.02] border border-[#2563eb]/10 p-3.5 flex items-center justify-between shadow-[0_2px_8px_rgba(37,143,251,0.01)]">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Deposit Amount</span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">EZ-Sign Agreement Execution Fee</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">${parseFloat(depositFee || "0").toFixed(2)}</span>
                <span className="text-[10px] font-extrabold text-[#2563eb] dark:text-blue-400 uppercase tracking-wider block">USD</span>
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
              🔒 Note: Use Stripe test card details (starts with <span className="font-extrabold text-[#2563eb] dark:text-blue-400">4242</span>) to authorize transaction successfully.
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
                // API Call to Express Backend
                try {
                  toast({ title: "Stripe Checkout", description: "Connecting to secure payment gateway..." });
                  const response = await fetch("/api/create-payment-intent", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      amount: Math.round(parseFloat(depositFee) * 100),
                      currency: "usd"
                    }),
                  });

                  if (!response.ok) {
                    throw new Error("Failed to communicate with payment gateway.");
                  }

                  const { clientSecret } = await response.json();
                  
                  // Simulated confirmation delay (since we aren't loading actual Stripe elements in this demo)
                  toast({ title: "Stripe Checkout", description: "Authorizing payment amount..." });
                  await new Promise(resolve => setTimeout(resolve, 800));

                  toast({ title: "Payment Approved!", description: "Finalizing signature securely..." });
                  
                  setPaymentCompleted(true);
                  setShowStripeCheckout(false);

                } catch (err: any) {
                  setStripeError(err.message || "Payment processing failed");
                  setStripeProcessing(false);
                  return;
                }
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



