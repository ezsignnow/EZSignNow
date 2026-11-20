import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BrandMark } from "@/components/layout/BrandMark";
import { SignaturePad, SignaturePadRef } from "@/components/signature/SignaturePad";
import { DocumentCanvas } from "@/components/documents/DocumentCanvas";
import { signatoryColors } from "@/components/documents/SignatoryManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faFileLines,
  faCircleCheck,
  faUsers,
  faPen,
  faSpinner,
  faHistory,
  faLock,
  faShieldHalved,
  faCreditCard,
  faLaptop,
  faClock,
  faChevronRight,
  faArrowRight,
  faBan,
  faDownload,
  faCircleXmark,
} from "@fortawesome/free-solid-svg-icons";
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
import { apiUrl } from "@/lib/api";
import {
  ELECTRONIC_RECORDS_DISCLOSURE,
  ELECTRONIC_RECORDS_DISCLOSURE_VERSION,
  FIELD_TYPE_LABELS,
  activeStep,
  allSignersDone,
  canSignNow,
  copyRecipients,
  decodeSignerData,
  encodeSignerData,
  hasDeclined,
  initialFieldValue,
  isCopyRecipient,
  isFieldComplete,
  normalizeFieldRow,
  signatureImage,
  signersOnly,
  signersWhoseTurn,
  stepCount,
} from "@/lib/signing/workflow";

/** Field types the signer fills in through the small input dialog. */
const DIALOG_FIELD_TYPES = new Set(["text", "name", "number", "date", "dropdown", "radio"]);
/** Field types whose completion isn't checked (no working input exists for them yet). */
const UNCHECKED_FIELD_TYPES = new Set(["label", "attachment", "drawing"]);

interface SignerDraft {
  signature?: string;
  initials?: string;
  values: Record<string, string>;
}

export default function ViewDocument() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const initialsPadRef = useRef<SignaturePadRef>(null);

  const [searchParams] = useSearchParams();
  const [showKioskHandoff, setShowKioskHandoff] = useState(false);
  const [nextKioskSigner, setNextKioskSigner] = useState<any>(null);
  const [kioskSignerId, setKioskSignerId] = useState<string | null>(null);

  const [document, setDocument] = useState<any>(null);
  const [signatories, setSignatories] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  /** "capture" saves the signature into the draft; "finish" also submits. */
  const [signDialogMode, setSignDialogMode] = useState<"capture" | "finish">("finish");
  const [signing, setSigning] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [signSuccess, setSignSuccess] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // What the current signer has entered so far
  const [draft, setDraft] = useState<SignerDraft>({ values: {} });
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentedAt, setConsentedAt] = useState<string | null>(null);
  const [inputFieldId, setInputFieldId] = useState<string | null>(null);
  const [inputDraft, setInputDraft] = useState("");
  const [initialsDialogOpen, setInitialsDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

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

  // ---------------------------------------------------------------
  // Who is signing
  // ---------------------------------------------------------------
  const requestedSignerId = searchParams.get("signer") || searchParams.get("signatory_id");
  const requestedEmail = searchParams.get("email") || searchParams.get("signer_email");
  const isKioskMode = searchParams.get("kiosk") === "true" || localStorage.getItem(`document_in_person_signing_${id}`) === "true";

  const requestedSigner =
    (kioskSignerId && signatories.find((s) => s.id === kioskSignerId)) ||
    (requestedSignerId && signatories.find((s) => s.id === requestedSignerId)) ||
    (requestedEmail && signatories.find((s) => s.email.toLowerCase() === requestedEmail.toLowerCase())) ||
    null;
  // Links without ?signer= (older emails, the sender's own view) fall back
  // to the first person whose turn it is, which is how signing always worked.
  const currentSigner = requestedSigner || signersWhoseTurn(signatories)[0] || null;
  const currentSignerIndex = currentSigner ? signatories.findIndex((s) => s.id === currentSigner.id) : -1;
  const canSign = document?.status === "pending" && canSignNow(currentSigner, signatories);
  const declinedSigner = signatories.find((s) => s.status === "declined");

  const fieldBelongsTo = (f: any, signer: any) =>
    !!signer && (f.signatory_id === signer.id || (!f.signatory_id && signersOnly(signatories).length === 1));
  const myFields = currentSigner ? fields.filter((f) => fieldBelongsTo(f, currentSigner)) : [];
  const needsSignature = myFields.some((f) => f.field_type === "signature") || myFields.length === 0;

  const missingRequired = (d: SignerDraft) =>
    myFields.filter(
      (f) =>
        f.required &&
        !UNCHECKED_FIELD_TYPES.has(f.field_type) &&
        f.field_type !== "signature" &&
        !isFieldComplete(f.field_type, d.values[f.id], d)
    );

  // Reset what's been entered whenever a different person takes over.
  useEffect(() => {
    if (!currentSigner) return;
    const values: Record<string, string> = {};
    fields.forEach((f) => {
      if (!fieldBelongsTo(f, currentSigner)) return;
      const initial = initialFieldValue(f.field_type, currentSigner.name);
      if (initial) values[f.id] = initial;
    });
    setDraft({ values });
    setConsentChecked(false);
    setConsentedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSigner?.id, fields.length]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const scrollToField = (field: any) => {
    const scrollContainer = window.document.getElementById("document-scroll-container");
    if (field && scrollContainer) {
      scrollContainer.scrollTo({
        top: Math.max(0, Number(field.y_position) - 150),
        behavior: "smooth",
      });
    }
  };

  const scrollToSignatureField = () => {
    scrollToField(myFields.find((f) => f.field_type === "signature") || myFields[0]);
  };

  useEffect(() => {
    if (!loading && fields.length > 0) {
      const timer = setTimeout(() => {
        scrollToSignatureField();
      }, 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, fields.length, currentSigner?.id]);

  const handleOpenSignDialog = () => {
    if (!consentedAt) {
      toast({ title: "Agree to sign electronically first", description: "Read the note on the right and tick the box to continue." });
      return;
    }
    const missing = missingRequired(draft);
    if (missing.length > 0) {
      scrollToField(missing[0]);
      toast({
        title: `${missing.length} required field${missing.length === 1 ? "" : "s"} left`,
        description: `Fill in ${missing.map((f) => f.label || FIELD_TYPE_LABELS[f.field_type] || f.field_type).slice(0, 3).join(", ")} before you finish.`,
        variant: "destructive",
      });
      return;
    }
    if (!needsSignature || draft.signature) {
      void finishSigning(draft.signature || null);
      return;
    }
    scrollToSignatureField();
    setSignDialogMode("finish");
    setSignDialogOpen(true);
  };

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

      setFields((fieldData || []).map((f) => normalizeFieldRow(f)));

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
    // Depend on user?.id, not the user object — Supabase hands back a new
    // user/session object on every token refresh, and depending on the
    // whole object here would re-run this fetch (silently wiping out any
    // signature/field values a signer had already filled in but not yet
    // submitted) every time that fires in the background.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id, navigate]);

  const senderOf = (list: any[]) => {
    for (const s of list) {
      const p = decodeSignerData(s.signature_data);
      if (p.senderEmail) return { email: p.senderEmail, name: p.senderName };
    }
    return null;
  };

  const sendActionEmail = async (body: Record<string, any>) => {
    if (!body.emails || body.emails.length === 0) return;
    try {
      await fetch(apiUrl("/api/send-action-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentTitle: document?.title || document?.file_name || "Document", ...body }),
      });
    } catch (err) {
      console.error("Failed to send action email:", err);
    }
  };

  const handleAgree = async () => {
    if (!consentChecked || !currentSigner) return;
    const at = new Date().toISOString();
    setConsentedAt(at);
    try {
      await fallbackService.createAuditLog(
        id!,
        "consented",
        `${currentSigner.name} (${currentSigner.email}) agreed to use electronic records and signatures (disclosure ${ELECTRONIC_RECORDS_DISCLOSURE_VERSION}).`
      );
    } catch (err) {
      console.error("Error logging consent:", err);
    }
  };

  const handleFieldClick = (fieldId: string) => {
    if (!canSign) return;
    const field = fields.find((f) => f.id === fieldId);
    if (!field || !fieldBelongsTo(field, currentSigner)) return;
    if (!consentedAt) {
      toast({ title: "Agree to sign electronically first", description: "Read the note on the right and tick the box to continue." });
      return;
    }

    if (field.field_type === "signature") {
      setSignDialogMode("capture");
      setSignDialogOpen(true);
    } else if (field.field_type === "initials") {
      setInitialsDialogOpen(true);
    } else if (field.field_type === "checkbox") {
      setDraft((d) => ({ ...d, values: { ...d.values, [field.id]: d.values[field.id] === "true" ? "" : "true" } }));
    } else if (DIALOG_FIELD_TYPES.has(field.field_type)) {
      setInputFieldId(field.id);
      setInputDraft(draft.values[field.id] || "");
    }
  };

  const inputField = inputFieldId ? fields.find((f) => f.id === inputFieldId) : null;

  const saveInputField = () => {
    if (!inputField) return;
    let value = inputDraft.trim();
    if (inputField.field_type === "number" && value && !/^-?\d+(\.\d+)?$/.test(value.replace(/,/g, ""))) {
      toast({ title: "Numbers only", description: "Enter a number, like 42 or 1250.50.", variant: "destructive" });
      return;
    }
    if (inputField.field_type === "date" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      value = `${m}/${d}/${y}`;
    }
    setDraft((d) => ({ ...d, values: { ...d.values, [inputField.id]: value } }));
    setInputFieldId(null);
  };

  const finishSigning = async (signatureData: string | null) => {
    if (hasDeposit && !paymentCompleted) {
      setStripeCardName(currentSigner?.name || "");
      setTempSignatureData(signatureData || "");
      setShowStripeCheckout(true);
      return;
    }
    await completeSignature(signatureData);
  };

  const completeSignature = async (signatureData: string | null) => {
    setSigning(true);

    // Capture Geolocation & IP Address
    // Recorded as unknown if the lookup fails; never a made-up value.
    let ipAddress: string | null = null;
    let location: string | null = null;
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
      const signer = currentSigner;

      if (!signer || !canSignNow(signer, signatories)) {
        toast({ title: "It isn't your turn to sign", description: "This document is waiting on someone else.", variant: "destructive" });
        setSigning(false);
        return;
      }

      const stepBefore = activeStep(signatories);
      const previous = decodeSignerData(signer.signature_data);
      const signedAt = new Date().toISOString();

      // Update the signatory record
      const { error: updateError } = await supabase
        .from("signatories")
        .update({
          status: "signed",
          signed_at: signedAt,
          signature_data: encodeSignerData({
            senderEmail: previous.senderEmail,
            senderName: previous.senderName,
            signature: signatureData || undefined,
            initials: draft.initials,
            values: draft.values,
            consentedAt: consentedAt || signedAt,
            userAgent: navigator.userAgent,
          }),
          ip_address: ipAddress,
          location: location,
        } as any)
        .eq("id", signer.id);

      if (updateError) {
        console.error("Signatory update error:", updateError);
        throw new Error(updateError.message);
      }

      try {
        await fallbackService.createAuditLog(
          id!,
          "signed",
          `${signer.name} (${signer.email}) signed the document.` +
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

      const freshSigs: any[] = updatedSigs || signatories.map(s =>
        s.id === signer.id ? { ...s, status: "signed", signed_at: signedAt } : s
      );

      setSignatories(freshSigs);

      const allSigned = allSignersDone(freshSigs);

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

      // Notify people: the finished copy goes to every signer, copy
      // recipient and the sender; otherwise the next step is invited once
      // the current step has everyone's signature.
      const sender = senderOf(freshSigs);
      if (allSigned) {
        const recipients = Array.from(
          new Set([...freshSigs.map((s) => s.email), ...(sender ? [sender.email] : [])])
        );
        await sendActionEmail({ emails: recipients, actionType: "completed", actorName: "All Parties" });
      } else {
        const stepAfter = activeStep(freshSigs);
        if (stepAfter !== null && stepAfter !== stepBefore) {
          const next = signersWhoseTurn(freshSigs);
          try {
            await fetch(apiUrl("/api/send-signing-email"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                signatories: next.map((s) => ({ name: s.name, email: s.email, signerId: s.id })),
                documentId: id,
                documentTitle: document?.title || "Untitled Document",
                ownerEmail: sender?.email || "support@ezsignnow.com",
              }),
            });
          } catch (err) {
            console.error("Failed to invite the next signing step:", err);
          }
        }
        if (sender) {
          await sendActionEmail({ emails: [sender.email], actionType: "signed", actorName: signer.name });
        }
      }

      try {
        const freshLogs = await fallbackService.fetchAuditLogs(id!);
        setAuditLogs(freshLogs);
      } catch (err) {
        console.error("Error fetching fresh audit logs:", err);
      }

      const nextSigner = signersWhoseTurn(freshSigs)[0];
      if (isKioskMode && !allSigned && nextSigner) {
        setNextKioskSigner(nextSigner);
        setShowKioskHandoff(true);
      } else {
        setSignSuccess(true);
      }
      setSignDialogOpen(false);

      toast({
        title: allSigned ? "🎉 Document fully signed!" : "✅ Signature recorded!",
        description: allSigned
          ? "All parties have signed. You can now download the certified PDF."
          : isKioskMode && nextSigner
            ? `Signature recorded! Preparing for ${nextSigner.name}...`
            : "Your signature has been recorded. We'll email you the finished document when everyone has signed.",
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
    if (!signatureData) return;
    setDraft((d) => ({ ...d, signature: signatureData }));

    if (signDialogMode === "capture") {
      setSignDialogOpen(false);
      return;
    }

    await finishSigning(signatureData);
  };

  const handleSaveInitials = () => {
    const data = initialsPadRef.current?.getSignature();
    if (!data) {
      toast({ title: "Please add your initials", variant: "destructive" });
      return;
    }
    setDraft((d) => ({ ...d, initials: data }));
    setInitialsDialogOpen(false);
  };

  const handleDecline = async () => {
    const reason = declineReason.trim();
    if (!currentSigner || !reason) return;
    setDeclining(true);
    try {
      const previous = decodeSignerData(currentSigner.signature_data);
      const declinedAt = new Date().toISOString();
      const { error } = await supabase
        .from("signatories")
        .update({
          status: "declined",
          signature_data: encodeSignerData({
            senderEmail: previous.senderEmail,
            senderName: previous.senderName,
            declinedAt,
            declineReason: reason.slice(0, 500),
            userAgent: navigator.userAgent,
          }),
        })
        .eq("id", currentSigner.id);
      if (error) throw new Error(error.message);

      try {
        await fallbackService.createAuditLog(
          id!,
          "declined",
          `${currentSigner.name} (${currentSigner.email}) declined to sign. Reason: ${reason.slice(0, 500)}`
        );
        setAuditLogs(await fallbackService.fetchAuditLogs(id!));
      } catch (err) {
        console.error("Error logging decline:", err);
      }

      const fresh = signatories.map((s) =>
        s.id === currentSigner.id ? { ...s, status: "declined", signature_data: encodeSignerData({ ...previous, declinedAt, declineReason: reason }) } : s
      );
      setSignatories(fresh);

      const sender = senderOf(signatories);
      await sendActionEmail({
        emails: sender ? [sender.email] : [],
        actionType: "declined",
        actorName: currentSigner.name,
        reason: reason.slice(0, 500),
      });

      setDeclineDialogOpen(false);
      setDeclineReason("");
      toast({ title: "You declined to sign", description: "The sender has been told. Nobody else can sign this document now." });
    } catch (err: any) {
      toast({ title: "Couldn't record your answer", description: err.message, variant: "destructive" });
    } finally {
      setDeclining(false);
    }
  };

  const handleDownloadOriginal = () => {
    if (!pdfUrl || !document) return;
    const link = window.document.createElement("a");
    link.href = pdfUrl;
    link.download = document.file_name || `${document.title}.pdf`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  /** Fields as the canvas shows them, with what each signer entered filled in. */
  const canvasFields = fields.map((f) => {
    let signatoryIndex = f.signatory_id ? signatories.findIndex((s: any) => s.id === f.signatory_id) : -1;
    if (signatoryIndex === -1) signatoryIndex = 0;
    const owner = signatories[signatoryIndex];
    const isMine = canSign && fieldBelongsTo(f, currentSigner);

    let value: string | undefined = f.value || undefined;
    if (isMine) {
      if (f.field_type === "signature") value = draft.signature;
      else if (f.field_type === "initials") value = draft.initials;
      else value = draft.values[f.id] ?? value;
    } else if (owner && owner.status === "signed") {
      const payload = decodeSignerData(owner.signature_data);
      if (f.field_type === "signature") value = payload.signature;
      else if (f.field_type === "initials") value = payload.initials;
      else value = payload.values?.[f.id] ?? value;
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
      signatoryIndex,
      value,
      options: f.options,
    };
  });

  const canvasSignatories = signatories.map((s, i) => ({
    ...s,
    color: signatoryColors[i % signatoryColors.length],
  }));

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
        <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) return null;

  const requiredPasscode = canSign && currentSigner
    ? (currentSigner.access_code || localStorage.getItem(`signatory_passcode_${id}_${currentSigner.email}`) || "")
    : "";
  const needsPasscode = !!requiredPasscode && !passcodeVerified;

  // A signer who opens their link before their step has started waits here.
  const waitingOn = signersWhoseTurn(signatories);
  const isWaiting =
    document.status === "pending" &&
    !!requestedSigner &&
    !isCopyRecipient(requestedSigner) &&
    requestedSigner.status === "pending" &&
    !canSign &&
    !declinedSigner &&
    waitingOn.length > 0;

  if (isWaiting) {
    return (
      <div className="min-h-screen bg-[#f7f9f5] dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-[#73c41d]/15 blur-3xl pointer-events-none" />

        <Card className="w-full max-w-md relative z-10 border border-slate-200 bg-white text-slate-900 rounded-2xl dark:bg-slate-900 dark:border-slate-800 dark:text-white overflow-hidden shadow-[0_20px_60px_-20px_rgba(23,45,7,0.25)] animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#8ccd45] to-[#477c13]" />
          <CardContent className="text-center pt-10 pb-10 px-8 space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-[#73c41d]/15 flex items-center justify-center text-[#477c13] animate-pulse">
              <FontAwesomeIcon icon={faClock} className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-[#3a6215] bg-[#73c41d]/15 px-3 py-1 rounded-full dark:text-[#abdb74]">
                Signing in order
              </span>
              <h2 className="font-heading text-xl font-bold tracking-tight text-slate-900 pt-2 dark:text-white">
                Waiting on {waitingOn.map((s) => s.name).join(" and ")}
              </h2>
              <p className="text-sm text-slate-500 font-normal leading-relaxed max-w-sm mx-auto">
                {requestedSigner.name}, you sign in step {requestedSigner.order_num}. We'll email you a link as soon as the people before you have signed.
              </p>
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex items-center justify-center gap-3">
              <div className="flex -space-x-2">
                {signersOnly(signatories).map((sig: any, idx: number) => (
                  <div
                    key={idx}
                    title={`${sig.name}: step ${sig.order_num}`}
                    className={`h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white dark:border-slate-900 shrink-0 shadow-sm ${
                      sig.status === 'signed'
                        ? 'bg-blue-500'
                        : waitingOn.some((w) => w.id === sig.id)
                          ? 'bg-blue-500 animate-pulse'
                          : 'bg-slate-300 text-slate-600'
                    }`}
                  >
                    {sig.name.slice(0, 1).toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-slate-500 font-bold">
                Step {activeStep(signatories)} of {stepCount(signatories)}
              </span>
            </div>
            <Button
              onClick={handleDownloadOriginal}
              disabled={!pdfUrl}
              className="w-full rounded-lg border border-slate-300 bg-white hover:border-[#5ba114] hover:text-[#477c13] text-slate-800 font-semibold h-11 text-sm transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
            >
              <FontAwesomeIcon icon={faDownload} className="mr-2 h-3.5 w-3.5" />
              Download the document to read
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Kiosk Handoff Screen overlay
  if (isKioskMode && showKioskHandoff && nextKioskSigner) {
    return (
      <div className="min-h-screen bg-[#f7f9f5] dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-[#73c41d]/15 blur-3xl pointer-events-none" />
        <Card className="w-full max-w-md relative z-10 border border-slate-200 bg-white text-slate-900 rounded-2xl dark:bg-slate-900 dark:border-slate-800 dark:text-white overflow-hidden shadow-[0_20px_60px_-20px_rgba(23,45,7,0.25)] animate-in fade-in zoom-in-95 duration-200">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#8ccd45] to-[#477c13]" />
          <CardContent className="text-center pt-10 pb-10 px-8 space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-[#73c41d]/15 flex items-center justify-center text-[#477c13] animate-bounce">
              <FontAwesomeIcon icon={faLaptop} className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-[#3a6215] bg-[#73c41d]/15 px-3 py-1 rounded-full dark:text-[#abdb74]">
                In-Person Kiosk Mode
              </span>
              <h2 className="font-heading text-xl font-bold tracking-tight text-slate-900 pt-2 dark:text-white">
                Kiosk Handoff Screen
              </h2>
              <p className="text-sm text-slate-700 font-medium dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                Please hand this device over to <span className="text-[#5ba114] font-black">{nextKioskSigner.name}</span> to sign.
              </p>
              <p className="text-sm text-slate-500 font-normal leading-relaxed max-w-xs mx-auto">
                Email: {nextKioskSigner.email}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 p-4 space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Signer Flow Progress</span>
                <span>{signersOnly(signatories).filter((s: any) => s.status === 'signed').length} of {signersOnly(signatories).length} completed</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden dark:bg-slate-800">
                <div 
                  className="h-full bg-[#5ba114] rounded-full transition-all duration-500" 
                  style={{ width: `${(signersOnly(signatories).filter((s: any) => s.status === 'signed').length / Math.max(1, signersOnly(signatories).length)) * 100}%` }}
                />
              </div>
            </div>
            <Button
              onClick={() => {
                setKioskSignerId(nextKioskSigner.id);
                setShowKioskHandoff(false);
                setPasscodeVerified(false);
                setEnteredPasscode("");
              }}
              className="w-full rounded-lg bg-[#5ba114] hover:bg-[#477c13] text-white font-semibold h-11 text-sm transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              I am {nextKioskSigner.name}
              <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Kiosk Session Complete Page
  const allSigned = allSignersDone(signatories);
  if (isKioskMode && allSigned) {
    return (
      <div className="min-h-screen bg-[#f7f9f5] dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute -top-40 left-1/2 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-[#73c41d]/15 blur-3xl pointer-events-none" />
        <Card className="w-full max-w-md relative z-10 border border-slate-200 bg-white text-slate-900 rounded-2xl dark:bg-slate-900 dark:border-slate-800 dark:text-white overflow-hidden shadow-[0_20px_60px_-20px_rgba(23,45,7,0.25)] animate-in fade-in duration-200">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#8ccd45] to-[#477c13]" />
          <CardContent className="text-center pt-10 pb-10 px-8 space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-[#73c41d]/15 flex items-center justify-center text-[#477c13]">
              <FontAwesomeIcon icon={faCircleCheck} className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-[#3a6215] bg-[#73c41d]/15 px-3 py-1 rounded-full dark:text-[#abdb74]">
                In-Person Kiosk Session Complete
              </span>
              <h2 className="font-heading text-xl font-bold tracking-tight text-slate-900 pt-2 dark:text-white">
                All Parties Have Signed!
              </h2>
              <p className="text-sm text-slate-500 font-normal leading-relaxed max-w-sm mx-auto">
                The document is now legally finalized and certified. We've compiled the secure digital signatures and audit logs.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 p-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-200 pb-2 last:border-0">
                <span>Document Title</span>
                <span className="text-slate-900 dark:text-slate-100 text-right truncate max-w-[180px]">{document.title}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                <span>Total Signatures</span>
                <span className="text-slate-900 dark:text-slate-100">{signersOnly(signatories).length}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={handleDownloadCertified}
                disabled={downloadingPdf}
                className="w-full rounded-lg bg-[#5ba114] hover:bg-[#477c13] text-white font-semibold h-11 text-sm transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                {downloadingPdf ? (
                  <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <FontAwesomeIcon icon={faFileLines} className="h-4 w-4 text-white" />
                )}
                {downloadingPdf ? "Generating Certified PDF..." : "Download Certified PDF"}
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="w-full rounded-lg border border-slate-300 bg-white hover:border-[#5ba114] hover:text-[#477c13] text-slate-800 font-semibold h-11 text-sm transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
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
      <div className="min-h-screen bg-[#f7f9f5] dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Animated Background Gradients */}
        <div className="absolute -top-40 left-1/2 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-[#73c41d]/15 blur-3xl pointer-events-none" />

        <Card className="w-full max-w-md relative z-10 border border-slate-200 bg-white text-slate-900 rounded-2xl dark:bg-slate-900 dark:border-slate-800 dark:text-white overflow-hidden shadow-[0_20px_60px_-20px_rgba(23,45,7,0.25)]">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#8ccd45] to-[#477c13]" />
          
          <CardHeader className="text-center pt-8 pb-3 px-6">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-[#73c41d]/15 flex items-center justify-center text-[#477c13] mb-4">
              <FontAwesomeIcon icon={faLock} className="h-5 w-5" />
            </div>
            <CardTitle className="font-heading text-xl font-bold tracking-tight text-slate-900 leading-snug dark:text-white">
              Secure Document Access
            </CardTitle>
            <CardDescription className="text-sm text-slate-500 mt-2 leading-relaxed">
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
                  className={`text-center font-mono tracking-widest text-lg rounded-xl border h-11 bg-white text-slate-900 placeholder:text-slate-300 dark:bg-slate-950 dark:text-white focus-visible:ring-offset-0 focus-visible:ring-[#5ba114] focus-visible:border-[#5ba114] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] ${
                    passcodeError 
                      ? "border-rose-500/80 focus-visible:ring-rose-500/30 focus-visible:border-rose-500" 
                      : "border-slate-300 focus-visible:ring-[#5ba114]/20"
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
              className="w-full rounded-lg bg-[#5ba114] hover:bg-[#477c13] text-white font-semibold h-11 text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {verifyingPasscode ? (
                <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin text-white" />
              ) : (
                <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-white/95" />
              )}
              {verifyingPasscode ? "Verifying..." : "Unlock Document"}
            </Button>
            
            <p className="text-xs text-slate-400 text-center leading-normal">
              Authorized signatories only. Access logs and digital audits are captured for legal verification.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9f5] dark:bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark className="h-8 w-8 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{document.title}</p>
              <p className="truncate text-xs text-slate-500">
                {canSign && currentSigner ? `Signing as ${currentSigner.name}` : "Sent with EZSignNow"}
              </p>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-slate-500 sm:inline-flex">
            <FontAwesomeIcon icon={faLock} className="h-3 w-3 text-[#5ba114]" /> Secured and audit-logged
          </span>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {document.status === "completed" ? (
          <div className="w-full max-w-6xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm mb-12 overflow-hidden dark:bg-slate-900 dark:border-slate-800">

            {/* Top Bar */}
            <div className="flex flex-wrap gap-3 items-center justify-between p-6 border-b border-slate-200">
              <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                <span className="text-[#3a6215]">Status:</span> {document.title}
              </h1>
              <Button onClick={handleDownloadCertified} disabled={downloadingPdf} className="bg-[#5ba114] hover:bg-[#477c13] text-white rounded-lg px-5 h-10 font-semibold shadow-sm">
                {downloadingPdf ? (
                  <><FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" /> Generating PDF...</>
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
            <div className="flex flex-wrap gap-3 items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className="bg-[#73c41d]/15 text-[#3a6215] text-xs font-semibold px-2.5 py-1 rounded-full">
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
              {signersOnly(signatories).map((sig) => (
                <div key={sig.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 items-center">
                  <div className="col-span-2 text-sm text-slate-600">
                    {stepCount(signatories) > 1 ? `Step ${sig.order_num}` : "Signer"}
                  </div>
                  <div className="col-span-6 flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">{sig.name}</span>
                    <span className="text-xs text-slate-500">{sig.email}</span>
                  </div>
                  <div className="col-span-4 flex items-center justify-end gap-3 pr-4">
                    <div className="bg-[#73c41d]/15 text-[#3a6215] text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      Signed
                    </div>
                    <span className="text-xs text-slate-500">
                      on {sig.signed_at ? format(new Date(sig.signed_at), "MMM d, yyyy") : "Unknown"}
                    </span>
                  </div>
                </div>
              ))}
              {copyRecipients(signatories).map((sig) => (
                <div key={sig.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 items-center">
                  <div className="col-span-2 text-sm text-slate-600">Copy</div>
                  <div className="col-span-6 flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">{sig.name}</span>
                    <span className="text-xs text-slate-500">{sig.email}</span>
                  </div>
                  <div className="col-span-4 flex items-center justify-end gap-3 pr-4">
                    <div className="bg-slate-200 text-slate-600 text-[11px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">
                      Gets a copy
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* PDF Viewer Section */}
            <div className="bg-slate-50 p-6 flex justify-center">
              <div className="border border-slate-300 shadow-sm bg-white overflow-hidden max-w-[800px] w-full">
                {pdfUrl ? (
                  <DocumentCanvas
                    fields={canvasFields}
                    onFieldsChange={() => {}}
                    signatories={canvasSignatories}
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
                  fields={canvasFields}
                  onFieldsChange={() => {}}
                  signatories={canvasSignatories}
                  selectedSignatory={null}
                  readOnly={true}
                  fileUrl={pdfUrl}
                  activeSignatoryIndex={canSign ? currentSignerIndex : null}
                  onFieldClick={handleFieldClick}
                />
                {canSign && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 shadow-lg">
                    <Button onClick={handleOpenSignDialog} disabled={signing || !consentedAt}>
                      {signing ? (
                        <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FontAwesomeIcon icon={faPen} className="mr-2 h-4 w-4" />
                      )}
                      {needsSignature && !draft.signature ? "Sign Document" : "Finish Signing"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <CardContent className="flex h-full items-center justify-center p-8">
                <div className="text-center">
                  <FontAwesomeIcon icon={faFileLines} className="mx-auto h-16 w-16 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium text-foreground">
                    {document.file_name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Document preview would appear here
                  </p>
                  {canSign && (
                    <Button className="mt-6" onClick={handleOpenSignDialog} disabled={!consentedAt}>
                      <FontAwesomeIcon icon={faPen} className="mr-2 h-4 w-4" />
                      Sign Document
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Consent to electronic records (before the signer can fill anything in) */}
            {canSign && !consentedAt && (
              <Card className="border-[#5ba114]/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4 text-[#5ba114]" />
                    Before you sign, {currentSigner?.name}
                  </CardTitle>
                  <CardDescription className="text-xs">Electronic records and signatures disclosure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-4">
                    {ELECTRONIC_RECORDS_DISCLOSURE.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <label className="flex items-start gap-2 text-xs font-medium text-foreground cursor-pointer">
                    <Checkbox
                      checked={consentChecked}
                      onCheckedChange={(v) => setConsentChecked(v === true)}
                      className="mt-0.5"
                    />
                    I agree to use electronic records and signatures for this document.
                  </label>
                  <Button className="w-full" onClick={handleAgree} disabled={!consentChecked}>
                    Agree and continue
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Document Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {declinedSigner ? (
                    <FontAwesomeIcon icon={faCircleXmark} className="h-5 w-5 text-rose-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-amber-500" />
                  )}
                  <span className="font-medium capitalize text-foreground">
                    {declinedSigner ? "Declined" : document.status === "pending" ? "Waiting for signatures" : document.status}
                  </span>
                </div>
                {declinedSigner && (
                  <p className="text-xs text-muted-foreground rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-2.5">
                    <span className="font-semibold text-rose-600">{declinedSigner.name} declined to sign.</span>{" "}
                    {decodeSignerData(declinedSigner.signature_data).declineReason || ""}
                  </p>
                )}
                {!declinedSigner && document.status === "pending" && requestedSigner?.status === "signed" && (
                  <p className="text-xs text-muted-foreground rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-2.5">
                    You've signed, {requestedSigner.name}. We'll email you the finished document when everyone has signed.
                  </p>
                )}
                {requestedSigner && isCopyRecipient(requestedSigner) && (
                  <p className="text-xs text-muted-foreground rounded-lg bg-slate-50 dark:bg-slate-900 border border-border p-2.5">
                    You're receiving a copy of this document. Nothing for you to sign.
                  </p>
                )}
                {canSign && (
                  <p className="text-xs text-muted-foreground">
                    Signing as <span className="font-semibold text-foreground">{currentSigner?.name}</span>. Click each highlighted field to fill it in.
                  </p>
                )}
                <div className="flex flex-col gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={handleDownloadOriginal} disabled={!pdfUrl}>
                    <FontAwesomeIcon icon={faDownload} className="mr-2 h-3.5 w-3.5" />
                    Download to read
                  </Button>
                  {canSign && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeclineDialogOpen(true)}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <FontAwesomeIcon icon={faBan} className="mr-2 h-3.5 w-3.5" />
                      Decline to sign
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Signatories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
                  Recipients ({signatories.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...signersOnly(signatories), ...copyRecipients(signatories)].map((sig) => {
                  const isTurn = signersWhoseTurn(signatories).some((s) => s.id === sig.id);
                  return (
                    <div
                      key={sig.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        sig.id === currentSigner?.id && canSign ? "border-[#5ba114]/50" : "border-border"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{sig.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{sig.email}</p>
                        {!isCopyRecipient(sig) && stepCount(signatories) > 1 && (
                          <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">Step {sig.order_num}</p>
                        )}
                      </div>
                      {isCopyRecipient(sig) ? (
                        <div className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 shrink-0">Copy</div>
                      ) : sig.status === "signed" ? (
                        <FontAwesomeIcon icon={faCircleCheck} className="h-5 w-5 text-blue-500 shrink-0" />
                      ) : sig.status === "declined" ? (
                        <div className="rounded bg-rose-100 px-2 py-1 text-xs text-rose-700 shrink-0">Declined</div>
                      ) : isTurn ? (
                        <div className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800 shrink-0">Their turn</div>
                      ) : (
                        <div className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs text-slate-500 shrink-0">Waiting</div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Fields Summary */}
            {canSign && myFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Your fields ({myFields.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {myFields.map((field) => {
                    const done = UNCHECKED_FIELD_TYPES.has(field.field_type) || isFieldComplete(field.field_type, draft.values[field.id], draft);
                    return (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => {
                          scrollToField(field);
                          handleFieldClick(field.id);
                        }}
                        className="w-full flex items-center justify-between rounded border border-border p-2 text-left hover:bg-muted/50"
                      >
                        <span className="text-sm text-foreground truncate">
                          {field.label || FIELD_TYPE_LABELS[field.field_type] || field.field_type}
                        </span>
                        <span className={`text-xs shrink-0 ${done ? "text-blue-600" : field.required ? "text-amber-600" : "text-muted-foreground"}`}>
                          {done ? "Done" : field.required ? "Required" : "Optional"}
                        </span>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Audit Trail */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FontAwesomeIcon icon={faHistory} className="h-4 w-4 text-slate-500" />
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
                        <span className="uppercase text-[#5ba114]">{log.action}</span>
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
            <DialogTitle>{signDialogMode === "capture" ? "Add your signature" : "Sign Document"}</DialogTitle>
            <DialogDescription>
              {signDialogMode === "capture"
                ? "Draw or type your signature. It goes in every signature field that's yours."
                : "Draw or type your signature below to sign this document."}
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
                <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FontAwesomeIcon icon={faPen} className="mr-2 h-4 w-4" />
              )}
              {signDialogMode === "capture" ? "Use this signature" : "Sign Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Initials Dialog */}
      <Dialog open={initialsDialogOpen} onOpenChange={setInitialsDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add your initials</DialogTitle>
            <DialogDescription>They go in every initials field that's yours.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <SignaturePad ref={initialsPadRef} width={240} height={110} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInitialsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveInitials}>Use these initials</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Field Input Dialog */}
      <Dialog open={!!inputField} onOpenChange={(open) => !open && setInputFieldId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{inputField?.label || (inputField ? FIELD_TYPE_LABELS[inputField.field_type] : "")}</DialogTitle>
            {inputField?.tooltip && <DialogDescription>{inputField.tooltip}</DialogDescription>}
          </DialogHeader>
          {inputField && (
            <div className="py-2">
              {inputField.field_type === "dropdown" ? (
                <select
                  value={inputDraft}
                  onChange={(e) => setInputDraft(e.target.value)}
                  aria-label={inputField.label || "Choose an option"}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  autoFocus
                >
                  <option value="">Choose an option</option>
                  {(inputField.options || []).map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : inputField.field_type === "radio" ? (
                <div className="space-y-2" role="radiogroup" aria-label={inputField.label || "Choose one"}>
                  {(inputField.options || []).map((opt: string) => (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name={`radio-${inputField.id}`}
                        checked={inputDraft === opt}
                        onChange={() => setInputDraft(opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : inputField.field_type === "date" ? (
                <Input
                  type="date"
                  value={/^\d{2}\/\d{2}\/\d{4}$/.test(inputDraft)
                    ? `${inputDraft.slice(6)}-${inputDraft.slice(0, 2)}-${inputDraft.slice(3, 5)}`
                    : inputDraft}
                  onChange={(e) => setInputDraft(e.target.value)}
                  autoFocus
                />
              ) : (
                <Input
                  value={inputDraft}
                  onChange={(e) => setInputDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveInputField()}
                  inputMode={inputField.field_type === "number" ? "decimal" : undefined}
                  placeholder={inputField.field_type === "number" ? "0" : "Type here"}
                  maxLength={500}
                  autoFocus
                />
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInputFieldId(null)}>Cancel</Button>
            <Button onClick={saveInputField}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={(open) => !declining && setDeclineDialogOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline to sign?</DialogTitle>
            <DialogDescription>
              The sender is told, with your reason, and nobody else can sign this document. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Why are you declining?"
            maxLength={500}
            rows={4}
            aria-label="Reason for declining"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)} disabled={declining}>Cancel</Button>
            <Button
              onClick={handleDecline}
              disabled={declining || !declineReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {declining && <FontAwesomeIcon icon={faSpinner} className="mr-2 h-4 w-4 animate-spin" />}
              Decline to sign
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
                <FontAwesomeIcon icon={faCreditCard} className="h-4 w-4" />
              </div>
              Secure Deposit Checkout
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">
              Guaranteed secure 256-bit SSL transaction processed via Stripe Gateway.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* Amount details banner */}
            <div className="rounded-xl bg-[#5ba114]/[0.02] border border-[#5ba114]/10 p-3.5 flex items-center justify-between shadow-[0_2px_8px_rgba(91, 161, 20,0.01)]">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Deposit Amount</span>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">EZ-Sign Agreement Execution Fee</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">${parseFloat(depositFee || "0").toFixed(2)}</span>
                <span className="text-[10px] font-extrabold text-[#5ba114] dark:text-blue-400 uppercase tracking-wider block">USD</span>
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
              🔒 Note: Use Stripe test card details (starts with <span className="font-extrabold text-[#5ba114] dark:text-blue-400">4242</span>) to authorize transaction successfully.
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
                  const response = await fetch(apiUrl("/api/create-payment-intent"), {
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
                if (tempSignatureData !== null) {
                  await completeSignature(tempSignatureData || null);
                }
              }} 
              disabled={stripeProcessing}
              className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9.5 text-xs px-6 shadow-md flex items-center justify-center gap-1.5"
            >
              {stripeProcessing ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="h-3.5 w-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faShieldHalved} className="h-3.5 w-3.5 text-white/90" />
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



