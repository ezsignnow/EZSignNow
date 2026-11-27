import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getAbsoluteUrl } from "@/utils/url";
import { FieldPalette } from "@/components/documents/FieldPalette";
import { SignatoryManager, Signatory, signatoryColors, renumberSteps } from "@/components/documents/SignatoryManager";
import {
  CHOICE_FIELD_TYPES,
  FIELD_TYPE_LABELS,
  defaultFieldSize,
  encodeSignerData,
  insertFieldRows,
  isCopyRecipient,
  normalizeFieldRow,
  signingPath,
  stepCount,
} from "@/lib/signing/workflow";
import { DocumentCanvas, Field } from "@/components/documents/DocumentCanvas";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft, faSave, faPaperPlane, faSpinner, faCopy, faCheck,
  faFileSignature, faChevronDown, faBriefcase, faUser, faPenNib,
  faCreditCard, faStar, faRightFromBracket, faHeadset, faFileLines, faClock,
  faSun, faMoon, faLaptop
} from "@fortawesome/free-solid-svg-icons";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { apiUrl, apiJsonHeaders } from "@/lib/api";

export default function PrepareDocument() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [document, setDocument] = useState<any>(null);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedSignatory, setSelectedSignatory] = useState<number | null>(null);
  const [signInOrder, setSignInOrder] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sentLinks, setSentLinks] = useState<Array<{ name: string; email: string; url: string; notified: boolean }>>([]);
  const [inPersonSigning, setInPersonSigning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [sentDialogOpen, setSentDialogOpen] = useState(false);
  const [lastEmailSent, setLastEmailSent] = useState(true);
  const [copied, setCopied] = useState<string | false>(false);
  const [depositFee, setDepositFee] = useState("");

  const [isPremium, setIsPremium] = useState(localStorage.getItem("is_premium") === "true");
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  
  const [isDark, setIsDark] = useState(() => window.document.documentElement.classList.contains("dark"));

  const toggleDarkMode = () => {
    const nextDark = !isDark;
    if (nextDark) {
      window.document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      window.document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setIsDark(nextDark);
    toast({
      title: `${nextDark ? "Dark" : "Light"} Mode Enabled`,
      description: `Interface style switched to ${nextDark ? "dark" : "light"} mode.`,
    });
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
    if (shouldBeDark) {
      window.document.documentElement.classList.add("dark");
    } else {
      window.document.documentElement.classList.remove("dark");
    }
    setIsDark(shouldBeDark);
  }, []);


  const fetchStats = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("status")
        .eq("owner_id", user.id);

      if (error) throw error;

      if (data) {
        const total = data.length;
        const pending = data.filter((d) => d.status === "pending").length;
        const completed = data.filter((d) => d.status === "completed").length;
        setStats({ total, pending, completed });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);


  useEffect(() => {
    const fetchDocument = async () => {
      if (!id || !user) return;

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .eq("owner_id", user.id)
        .single();

      if (error || !data) {
        toast({
          title: "Document not found",
          description: "The document you're looking for doesn't exist.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setDocument(data);

      // Download the PDF from Supabase storage and create a local blob URL
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

      // Fetch existing signatories
      const { data: sigData } = await supabase
        .from("signatories")
        .select("*")
        .eq("document_id", id)
        .order("order_num");

      let loadedSignatories: Signatory[] = [];
      if (sigData) {
        loadedSignatories = sigData.map((s: any, i) => {
          const savedPasscode = localStorage.getItem(`signatory_passcode_${id}_${s.email}`) || "";
          const resolvedCode = s.access_code || savedPasscode || undefined;
          return {
            ...s,
            role: isCopyRecipient(s) ? "cc" : "signer",
            color: signatoryColors[i % signatoryColors.length],
            access_code: resolvedCode,
            passcode: resolvedCode,
          } as Signatory;
        });
        // Copy recipients go last so the signing steps read top to bottom.
        loadedSignatories.sort((a, b) => (a.role === "cc" ? 1 : 0) - (b.role === "cc" ? 1 : 0));
        setSignatories(loadedSignatories);
        const firstSigner = loadedSignatories.findIndex((s) => s.role !== "cc");
        setSelectedSignatory(firstSigner >= 0 ? firstSigner : null);
      }

      // Fetch existing deposit fee
      const savedDepositFee = data.payment_fee ? String(data.payment_fee) : (localStorage.getItem(`document_deposit_fee_${id}`) || "");
      setDepositFee(savedDepositFee);

      // Signing order is on when signers sit in more than one step. Documents
      // from before signing steps existed kept the choice in localStorage.
      const savedStrictRouting = localStorage.getItem(`document_strict_routing_${id}`) === "true";
      setSignInOrder(stepCount(loadedSignatories) > 1 || savedStrictRouting);
      setEmailSubject(`Signature Request: ${data.title}`);

      const savedInPersonSigning = localStorage.getItem(`document_in_person_signing_${id}`) === "true";
      setInPersonSigning(savedInPersonSigning);

      // Fetch existing fields
      const { data: fieldData } = await supabase
        .from("signature_fields")
        .select("*")
        .eq("document_id", id);

      if (fieldData) {
        setFields(
          fieldData.map((raw) => {
            const f = normalizeFieldRow(raw);
            let signatoryIndex = f.signatory_id
              ? loadedSignatories.findIndex((s) => s.id === f.signatory_id)
              : -1;

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
              options: f.options,
            };
          })
        );
      }

      setLoading(false);
    };

    fetchDocument();
    // Deliberately depend on user?.id (a stable primitive) rather than the
    // user object itself — Supabase's onAuthStateChange hands back a new
    // user/session object on every token refresh, and depending on the
    // whole object here would re-run this fetch (and silently clobber any
    // signatories/fields the user had just added but not yet saved) every
    // time that fires in the background.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id, navigate]);

  const signerIndexes = signatories
    .map((s, i) => (s.role === "cc" ? -1 : i))
    .filter((i) => i >= 0);

  const handleAddSignatory = async (signatory: Omit<Signatory, "id" | "status">) => {
    const next = [...signatories, signatory as Signatory];
    setSignatories(next);
    if (selectedSignatory === null && signatory.role !== "cc") {
      setSelectedSignatory(next.length - 1);
    }
  };

  const handleRemoveSignatory = (index: number) => {
    setSignatories(signatories.filter((_, i) => i !== index));
    // Keep each field pointing at the same person after the list shifts.
    setFields(
      fields.map((f) => {
        if (f.signatoryIndex === null) return f;
        if (f.signatoryIndex === index) return { ...f, signatoryIndex: null };
        return f.signatoryIndex > index ? { ...f, signatoryIndex: f.signatoryIndex - 1 } : f;
      })
    );
    if (selectedSignatory === index) {
      setSelectedSignatory(null);
    } else if (selectedSignatory !== null && selectedSignatory > index) {
      setSelectedSignatory(selectedSignatory - 1);
    }
  };

  const handleReorderSignatories = (next: Signatory[]) => {
    // Rows can move, so remap field owners by identity rather than position.
    const oldOwner = fields.map((f) => (f.signatoryIndex !== null ? signatories[f.signatoryIndex] : null));
    setSignatories(next);
    setFields(
      fields.map((f, i) => {
        const owner = oldOwner[i];
        if (!owner) return f;
        const newIndex = next.findIndex((s) => s.email === owner.email);
        return { ...f, signatoryIndex: newIndex >= 0 ? newIndex : null };
      })
    );
  };

  const handleSignInOrderChange = (checked: boolean) => {
    setSignInOrder(checked);
    setSignatories(
      checked
        ? renumberSteps(signatories)
        : signatories.map((s) => (s.role === "cc" ? s : { ...s, order_num: 1 }))
    );
  };

  const handleAddField = (type: string, x?: number, y?: number) => {
    const { width, height } = defaultFieldSize(type);
    const owner =
      selectedSignatory !== null && signatories[selectedSignatory]?.role !== "cc"
        ? selectedSignatory
        : signerIndexes[0] ?? null;

    const newField: Field = {
      id: `field-${Date.now()}`,
      type,
      x: x !== undefined ? x : 100 + Math.random() * 200,
      y: y !== undefined ? y : 100 + Math.random() * 200,
      width,
      height,
      required: type !== "label",
      signatoryIndex: type === "label" ? null : owner,
      label: type === "label" ? "Label" : undefined,
      options: CHOICE_FIELD_TYPES.has(type) ? ["Option 1", "Option 2"] : undefined,
    };
    setFields([...fields, newField]);
  };

  /** Saves signers and fields. Returns the saved signer rows, or null when the save failed. */
  const handleSave = async (opts: { quiet?: boolean } = {}): Promise<any[] | null> => {
    if (!id) return null;
    setSaving(true);

    localStorage.setItem(`document_in_person_signing_${id}`, String(inPersonSigning));
    // Signing order now lives in each signer's step; drop the old toggle.
    localStorage.removeItem(`document_strict_routing_${id}`);

    try {
      // Save signatories
      await supabase.from("signatories").delete().eq("document_id", id);

      // The live `documents` table has no payment_fee column either, so the
      // deposit fee is persisted via localStorage below instead, which
      // already round-trips correctly on reload (see `savedDepositFee` in
      // fetchDocument above).

      // The sender's address rides along with each signer so a signer who
      // declines (and has no access to the sender's profile) can notify them.
      const senderData = encodeSignerData({
        senderEmail: user?.email || undefined,
        senderName: (user?.user_metadata as any)?.full_name || undefined,
      });

      let insertedSignatories: any[] = [];
      if (signatories.length > 0) {
        const { data: sigData, error: sigError } = await supabase
          .from("signatories")
          .insert(
            signatories.map((s) => ({
              document_id: id,
              email: s.email,
              name: s.name,
              // Signing step; signers sharing a step sign at the same time.
              // Copy recipients are stored as 0 (see lib/signing/workflow.ts).
              order_num: s.role === "cc" ? 0 : signInOrder ? Math.max(1, s.order_num || 1) : 1,
              signature_data: senderData,
              // The live `signatories` table has no access_code column —
              // inserting one throws "Could not find the 'access_code'
              // column ... in the schema cache" and aborts this whole save.
              // The passcode is persisted via localStorage just below.
            }))
          )
          .select();
        if (sigError) throw sigError;
        insertedSignatories = sigData || [];
      }

      // Save passcodes to localStorage
      signatories.forEach((s) => {
        const code = s.access_code || s.passcode || "";
        if (code) {
          localStorage.setItem(`signatory_passcode_${id}_${s.email}`, code);
        } else {
          localStorage.removeItem(`signatory_passcode_${id}_${s.email}`);
        }
      });

      // Save deposit fee to localStorage
      if (depositFee.trim()) {
        localStorage.setItem(`document_deposit_fee_${id}`, depositFee.trim());
      } else {
        localStorage.removeItem(`document_deposit_fee_${id}`);
      }

      // Save fields
      await supabase.from("signature_fields").delete().eq("document_id", id);

      if (fields.length > 0) {
        const { error: fieldError } = await insertFieldRows(
          supabase,
          fields.map((f) => {
            const owner = f.signatoryIndex !== null ? signatories[f.signatoryIndex] : null;
            const saved = owner ? insertedSignatories.find((r) => r.email === owner.email) : null;
            return {
              document_id: id,
              x_position: f.x,
              y_position: f.y,
              width: f.width,
              height: f.height,
              label: f.label,
              required: f.required,
              signatory_id: owner?.role === "cc" ? null : saved?.id ?? null,
              __meta: { type: f.type, tooltip: f.tooltip, options: f.options },
            };
          })
        );
        if (fieldError) throw fieldError;
      }

      // Pick up the new row ids so later saves and links stay consistent.
      setSignatories((prev) =>
        prev.map((s) => {
          const saved = insertedSignatories.find((r) => r.email === s.email);
          return saved ? { ...s, id: saved.id, status: saved.status } : s;
        })
      );

      if (!opts.quiet) toast({ title: "Changes saved" });
      return insertedSignatories;
    } catch (error: any) {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    const signers = signatories.filter((s) => s.role !== "cc");
    if (signers.length === 0) {
      toast({
        title: "No signers",
        description: "Add at least one person who needs to sign. Copy recipients only get the finished document.",
        variant: "destructive",
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: "No fields",
        description: "Please add at least one field for signing.",
        variant: "destructive",
      });
      return;
    }

    const withoutFields = signers.filter(
      (s) => !fields.some((f) => f.signatoryIndex !== null && signatories[f.signatoryIndex]?.email === s.email)
    );
    if (withoutFields.length > 0) {
      toast({
        title: "Some signers have no fields",
        description: `Place at least one field for ${withoutFields.map((s) => s.name).join(", ")}.`,
        variant: "destructive",
      });
      setStep(2);
      return;
    }

    const emptyChoices = fields.filter((f) => CHOICE_FIELD_TYPES.has(f.type) && (f.options?.length || 0) < 2);
    if (emptyChoices.length > 0) {
      toast({
        title: "Add choices",
        description: `Each ${emptyChoices.map((f) => FIELD_TYPE_LABELS[f.type].toLowerCase()).join(" and ")} field needs at least two options. Double-click it to edit.`,
        variant: "destructive",
      });
      setStep(2);
      return;
    }

    setSending(true);
    try {
      const saved = await handleSave({ quiet: true });
      if (!saved) return;

      // Update document status
      const { error: updateError } = await supabase
        .from("documents")
        .update({ status: "pending" })
        .eq("id", id);

      if (updateError) throw updateError;

      // Only the first signing step is invited now; later steps are invited
      // as each step finishes (see ViewDocument). Copy recipients are sent
      // the finished document when everyone has signed.
      const savedSigners = saved.filter((r) => !isCopyRecipient(r));
      const firstStep = Math.min(...savedSigners.map((r) => Number(r.order_num)));
      const invited = savedSigners.filter((r) => Number(r.order_num) === firstStep);

      let emailDispatched = true;
      let emailErrorMessage = "";
      try {
        const response = await fetch(apiUrl("/api/send-signing-email"), {
          method: "POST",
          headers: await apiJsonHeaders(),
          body: JSON.stringify({
            signatories: invited.map((r) => ({ name: r.name, email: r.email, signerId: r.id })),
            documentId: id,
            documentTitle: document?.title || "Untitled Document",
            ownerEmail: user?.email || "support@ezsignnow.com",
            ownerName: (user?.user_metadata?.full_name as string | undefined) || undefined,
            subject: emailSubject.trim() || undefined,
            message: emailMessage.trim() || undefined,
          }),
        });

        if (!response.ok) {
          let errorText = "Failed to dispatch signing emails";
          try {
            const errorData = await response.json();
            errorText = errorData.error || errorText;
          } catch (e) {
            // Ignore parse errors on non-ok response
          }
          throw new Error(errorText);
        }
      } catch (emailErr: any) {
        console.warn("Email dispatch failed, falling back to direct link sharing:", emailErr);
        emailDispatched = false;
        emailErrorMessage = emailErr?.message || "";
      }

      setSentLinks(
        savedSigners
          .sort((a, b) => Number(a.order_num) - Number(b.order_num))
          .map((r) => ({
            name: r.name,
            email: r.email,
            url: getAbsoluteUrl(signingPath(id!, r.id)),
            notified: emailDispatched && invited.some((i) => i.id === r.id),
          }))
      );

      if (emailDispatched) {
        const waiting = savedSigners.length - invited.length;
        toast({
          title: "Document sent!",
          description:
            `Invitations sent to ${invited.length} signer(s).` +
            (waiting > 0 ? ` ${waiting} more will be invited when it's their turn.` : ""),
        });
      } else {
        toast({
          title: "Document saved, but the email didn't send",
          description: emailErrorMessage
            ? `${emailErrorMessage} Copy each signer's link to invite them in the meantime.`
            : "Document successfully saved. Copy each signer's link to invite them.",
          variant: "destructive",
        });
      }
      setLastEmailSent(emailDispatched);
      setSentDialogOpen(true);
    } catch (err: any) {
      toast({
        title: "Failed to prepare document",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-250">
        <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 animate-spin text-[#5ba114]" />
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9f5] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-250 antialiased">
      {/* Top Trial Banner */}
      {isPremium ? (
        <div className="bg-[#f4fbec] text-[#3a6215] border-b border-[#73c41d]/25 py-2 px-4 text-center text-xs font-medium select-none flex items-center justify-center gap-1.5 shrink-0 dark:bg-[#73c41d]/10 dark:text-[#abdb74]">
          <span>🌟 Business Trial Active. You have 7 days remaining on your trial.</span>
          <button 
            onClick={() => { 
              localStorage.removeItem("is_premium"); 
              setIsPremium(false); 
              toast({ title: "Trial Deactivated", description: "Returned to the free sandbox plan." }); 
            }} 
            className="font-semibold underline underline-offset-2 ml-1.5 focus:outline-none"
          >
            Manage Plan
          </button>
        </div>
      ) : (
        <div className="bg-[#f4fbec] text-[#3a6215] border-b border-[#73c41d]/25 py-2 px-4 text-center text-xs font-medium select-none flex items-center justify-center gap-1.5 shrink-0 dark:bg-[#73c41d]/10 dark:text-[#abdb74]">
          <span>You have a 7-day Free Business Trial.</span>
          <button onClick={() => navigate("/try-trial")} className="font-semibold underline underline-offset-2 focus:outline-none">Try now</button>
        </div>
      )}

      {/* Header bar matching Signaturely */}
      <header className="border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0 transition-colors">
        <BrandLogo onClick={() => navigate("/dashboard")} className="cursor-pointer" />

        <div className="flex items-center gap-6">
          {/* Monthly usage */}
          {isPremium ? (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold select-none">
              <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full text-[11px] font-bold">
                Active
              </span>
              <span>Business Trial plan</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold select-none">
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-[11px] font-bold">
                {statsLoading ? "..." : stats.total} of 3
              </span>
              <span>signature requests this month</span>
            </div>
          )}

          {/* Upgrade button */}
          <Button 
            onClick={() => navigate("/try-trial")}
            className={`rounded-full h-[34px] px-5 font-bold text-xs shadow-sm transition-all border-[1.5px] bg-white dark:bg-slate-900 ${
              isPremium 
                ? "border-blue-500 dark:border-blue-600 text-blue-500 dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20" 
                : "border-[#5ba114] text-[#5ba114] dark:text-blue-400 hover:bg-[#5ba114]/5 dark:hover:bg-blue-950/20"
            }`}
          >
            {isPremium ? "Premium" : "Upgrade"}
          </Button>

          {/* User profile dropdown & support dropdown */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 p-1.5 rounded-lg transition-all bg-white dark:bg-slate-900 select-none focus:outline-none">
                  {/* User green logo avatar circle */}
                  <div className="h-7 w-7 rounded-full bg-[#5ba114] border border-slate-100 dark:border-slate-800 flex items-center justify-center text-[10px] font-extrabold text-white shadow-sm shrink-0 uppercase">
                    {user.email ? user.email.slice(0, 2) : "US"}
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden md:inline max-w-[120px] truncate">
                    {user.email ? user.email.split("@")[0] : "User"}
                  </span>
                  <FontAwesomeIcon icon={faChevronDown} className="h-3.5 w-3.5 text-slate-400 dark:text-slate-550" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 w-52 p-1 border border-slate-100/85 dark:border-slate-800 shadow-md dark:shadow-slate-950/80 select-none">
                
                {/* 1. Company item */}
                <DropdownMenuItem 
                  onClick={() => navigate("/dashboard?tab=team")}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 cursor-pointer focus:outline-none"
                >
                  <FontAwesomeIcon icon={faBriefcase} className="mr-3 h-4 w-4 text-slate-400" />
                  Company
                </DropdownMenuItem>

                {/* 2. Profile item */}
                <DropdownMenuItem 
                  onClick={() => navigate("/dashboard?tab=settings")}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 cursor-pointer mt-0.5 focus:outline-none"
                >
                  <FontAwesomeIcon icon={faUser} className="mr-3 h-4 w-4 text-slate-400" />
                  Profile
                </DropdownMenuItem>

                {/* 3. Edit Signature item */}
                <DropdownMenuItem 
                  onClick={() => {
                    navigate("/dashboard?tab=settings");
                    setTimeout(() => {
                      toast({ title: "Edit Signature Active", description: "Select your default cursive script fonts below." });
                    }, 500);
                  }}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 cursor-pointer mt-0.5 focus:outline-none"
                >
                  <FontAwesomeIcon icon={faPenNib} className="mr-3 h-4 w-4 text-slate-400" />
                  Edit Signature
                </DropdownMenuItem>

                {/* 4. Billing item */}
                <DropdownMenuItem 
                  onClick={() => navigate("/try-trial")}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 cursor-pointer mt-0.5 focus:outline-none"
                >
                  <FontAwesomeIcon icon={faCreditCard} className="mr-3 h-4 w-4 text-slate-400" />
                  Billing
                </DropdownMenuItem>

                {/* 5. Share & Earn item */}
                <DropdownMenuItem 
                  onClick={() => {
                    navigator.clipboard.writeText(getAbsoluteUrl(`/signup?ref=${user?.email?.split("@")[0] || "ezsignnow"}`));
                    toast({ title: "Share & Earn Copied!", description: "Your unique referral link has been copied to clipboard!" });
                  }}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 cursor-pointer mt-0.5 focus:outline-none"
                >
                  <FontAwesomeIcon icon={faStar} className="mr-3 h-4 w-4 text-slate-400" />
                  Share & Earn
                </DropdownMenuItem>

                {/* Separator */}
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                {/* 6. Logout item */}
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-xs font-bold text-destructive hover:text-destructive/95 py-2.5 cursor-pointer focus:outline-none"
                >
                  <FontAwesomeIcon icon={faRightFromBracket} className="mr-3 h-4 w-4 text-slate-400" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dark/Light Mode Toggle Button */}
            <button 
              onClick={toggleDarkMode}
              className="h-[34px] w-[34px] rounded-full border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 bg-white dark:bg-slate-900 shadow-sm transition-all focus:outline-none"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <FontAwesomeIcon icon={faSun} className="h-4.5 w-4.5 text-amber-500" />
              ) : (
                <FontAwesomeIcon icon={faMoon} className="h-4.5 w-4.5" />
              )}
            </button>

            {/* Help Button — opens Support page */}
            <button 
              onClick={() => navigate("/support")}
              className="h-[34px] flex items-center justify-center gap-1.5 px-3 rounded-full bg-slate-50 dark:bg-slate-500/10 hover:bg-slate-100 dark:hover:bg-slate-500/20 border border-slate-100 dark:border-indigo-500/20 text-slate-600 dark:text-indigo-400 font-bold text-[11px] shadow-sm transition-all focus:outline-none ml-1"
            >
              <FontAwesomeIcon icon={faHeadset} className="h-4 w-4" />
              <span className="hidden sm:inline uppercase tracking-wider">Support</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-6 py-5 max-w-[1400px]">
        {/* Header Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/dashboard")} 
              className="h-9 w-9 rounded-full border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all focus:outline-none focus:ring-1 focus:ring-slate-200 dark:focus:ring-slate-800"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hidden sm:block">
                <FontAwesomeIcon icon={faFileLines} className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                    {document?.title || "Untitled Document"}
                  </h1>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${step === 1 ? "bg-[#5ba114] text-white" : step > 1 ? "bg-[#73c41d]/15 text-[#3a6215] dark:text-[#abdb74]" : "text-slate-400"}`}>1. Recipients</span>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${step === 2 ? "bg-[#5ba114] text-white" : step > 2 ? "bg-[#73c41d]/15 text-[#3a6215] dark:text-[#abdb74]" : "text-slate-400"}`}>2. Fields</span>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${step === 3 ? "bg-[#5ba114] text-white" : step > 3 ? "bg-[#73c41d]/15 text-[#3a6215] dark:text-[#abdb74]" : "text-slate-400"}`}>3. Review and send</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2.5 items-center">
            {step > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setStep(step - 1)} 
                className="rounded-lg border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 h-10 px-4 font-semibold text-sm"
              >
                Back
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => handleSave()}
              disabled={saving}
              className="rounded-lg border-slate-300 text-slate-700 hover:border-[#5ba114] hover:text-[#477c13] bg-white h-10 px-4 font-semibold text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
            >
              {saving ? <FontAwesomeIcon icon={faSpinner} className="mr-2 h-3.5 w-3.5 animate-spin" /> : <FontAwesomeIcon icon={faSave} className="mr-2 h-3.5 w-3.5" />}
              Save draft
            </Button>
            {step < 3 ? (
              <Button 
                onClick={() => setStep(step + 1)}
                className="rounded-lg bg-[#5ba114] hover:bg-[#477c13] text-white h-10 px-5 font-semibold text-sm shadow-sm"
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSend}
                disabled={saving || sending}
                className="rounded-lg bg-[#5ba114] hover:bg-[#477c13] text-white h-10 px-5 font-semibold text-sm shadow-sm"
              >
                {sending ? <FontAwesomeIcon icon={faSpinner} className="mr-2 h-3.5 w-3.5 animate-spin" /> : <FontAwesomeIcon icon={faPaperPlane} className="mr-2 h-3.5 w-3.5" />}
                {sending ? "Sending…" : "Send"}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        {step === 1 && (
          <div className="max-w-4xl mx-auto space-y-6 mt-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.02)] border border-slate-100/80 dark:border-slate-800">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">Add Recipients</h2>
              <p className="text-xs font-semibold text-slate-500 mb-6">
                Add up to 25 people who need to sign, in the order they sign, and anyone who only needs a copy of the finished document.
              </p>

              <SignatoryManager
                signatories={signatories}
                onAdd={handleAddSignatory}
                onRemove={handleRemoveSignatory}
                onReorder={handleReorderSignatories}
                selectedSignatory={selectedSignatory}
                onSelectSignatory={setSelectedSignatory}
                signInOrder={signInOrder}
                onSignInOrderChange={handleSignInOrderChange}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="space-y-4 h-[calc(100vh-180px)] overflow-y-auto pr-2 custom-scrollbar">
              {signerIndexes.length > 0 ? (
                <div className="rounded-2xl border border-slate-100/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Placing fields for</p>
                  <div className="flex flex-col gap-1.5">
                    {signerIndexes.map((i) => {
                      const s = signatories[i];
                      const active = selectedSignatory === i;
                      const count = fields.filter((f) => f.signatoryIndex === i).length;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedSignatory(i)}
                          aria-pressed={active}
                          className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all ${
                            active
                              ? "border-[#73c41d] bg-[#73c41d]/[0.05]"
                              : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                          }`}
                        >
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="flex-1 min-w-0 text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{s.name}</span>
                          {signInOrder && <span className="text-[10px] font-bold text-slate-400">Step {s.order_num}</span>}
                          <span className="text-[10px] font-bold text-slate-400">{count} field{count === 1 ? "" : "s"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40">
                  Add a signer in step 1 before placing fields.
                </p>
              )}
              <FieldPalette onAddField={handleAddField} />
            </div>
            <div className="bg-slate-100/50 dark:bg-slate-950/50 rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800 h-[calc(100vh-180px)] flex justify-center">
              <DocumentCanvas
                fields={fields}
                onFieldsChange={setFields}
                signatories={signatories}
                selectedSignatory={selectedSignatory}
                fileUrl={pdfUrl}
                onDropField={handleAddField}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-3xl mx-auto space-y-6 mt-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.02)] border border-slate-100/80 dark:border-slate-800">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-6">Review & Send</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Email Message</h3>
                  <div className="space-y-3">
                    <Input
                      placeholder="Email Subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      maxLength={200}
                      className="font-semibold text-sm h-11"
                    />
                    <textarea
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      maxLength={2000}
                      className="w-full min-h-[120px] rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-sm font-medium text-slate-700 dark:text-slate-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5ba114] resize-y bg-white dark:bg-slate-900"
                      placeholder="Add a note for your signers (optional)"
                    ></textarea>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Recipients ({signatories.length})</h3>
                  <p className="text-[11px] font-semibold text-slate-400 mb-3">
                    {signInOrder
                      ? "Signers in step 1 are emailed now. Each later step is emailed when the step before it is finished."
                      : "All signers are emailed now and can sign in any order."}{" "}
                    Copy recipients get the signed document when everyone has signed.
                  </p>
                  <div className="space-y-2">
                    {[...signatories]
                      .sort((a, b) => (a.role === "cc" ? 999 : a.order_num) - (b.role === "cc" ? 999 : b.order_num))
                      .map((sig, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {sig.role === "cc" ? "CC" : signInOrder ? sig.order_num : <FontAwesomeIcon icon={faFileSignature} className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{sig.name}</p>
                          <p className="text-xs font-semibold text-slate-500">{sig.email}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {sig.role === "cc" ? "Gets a copy" : signInOrder ? `Step ${sig.order_num}` : "Signer"}
                        </span>
                      </div>
                    ))}
                    {signatories.length === 0 && (
                      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">You haven't added any signers. You must add at least one signer to send.</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* In-Person Kiosk Mode Card */}
                  <Card className="border-slate-100/80 dark:border-slate-800 rounded-xl shadow-none bg-slate-50/50 dark:bg-slate-900/50">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faLaptop} className="h-3.5 w-3.5 text-[#5ba114]" />
                        In-Person Kiosk Mode
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="inPersonSigning" className="text-xs font-bold text-slate-700 dark:text-slate-350">
                          Enable Local Signing
                        </Label>
                        <Switch id="inPersonSigning" checked={inPersonSigning} onCheckedChange={setInPersonSigning} />
                      </div>
                      {inPersonSigning && (
                        <p className="text-[10px] text-slate-500 mt-2">Direct signing will launch a high-fidelity handoff gate between each sequential signatory on this screen.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Premium Deposit Configuration Panel */}
                  <Card className="border-slate-100/80 dark:border-slate-800 rounded-xl shadow-none bg-slate-50/50 dark:bg-slate-900/50">
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faCreditCard} className="h-3.5 w-3.5 text-[#5ba114]" />
                        Require Payment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                        <Input
                          id="depositFee" type="number" min="0" step="0.01" placeholder="0.00" value={depositFee} onChange={(e) => setDepositFee(e.target.value)}
                          className="pl-6 h-8 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">Signatories must pay this amount via Stripe to finalize signature.</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Document Sent Dialog */}
      <Dialog open={sentDialogOpen} onOpenChange={(open) => {
        setSentDialogOpen(open);
        if (!open) {
          navigate("/dashboard");
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 p-6 transition-colors duration-250">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-lg font-extrabold text-slate-800 dark:text-slate-100">
              <FontAwesomeIcon icon={faCheck} className="h-6 w-6 text-blue-500 bg-blue-50 dark:bg-blue-950/30 rounded-full p-1 border border-blue-100 dark:border-blue-900 shrink-0" />
              {lastEmailSent ? "Document Sent Successfully!" : "Document Saved"}
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
              {lastEmailSent
                ? "Invitations went to the signers whose turn it is. Each signer has their own link, which you can also copy and share yourself:"
                : "The document is saved, but the invitation emails couldn't be sent right now. Share each signer's own link with them in the meantime:"}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2 max-h-[320px] overflow-y-auto">
            {sentLinks.map((link) => (
              <div key={link.url} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300 leading-tight truncate">{link.name}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal truncate">{link.email}</p>
                  <p className={`text-[10px] font-bold mt-0.5 ${link.notified ? "text-emerald-600" : "text-slate-400"}`}>
                    {link.notified ? "Emailed now" : lastEmailSent ? "Emailed when it's their turn" : "Not emailed"}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(link.url);
                    setCopied(link.url);
                    toast({ title: `Link for ${link.name} copied` });
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="h-8 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 bg-[#5ba114] hover:bg-[#477c13] shadow-sm shrink-0"
                >
                  <FontAwesomeIcon icon={copied === link.url ? faCheck : faCopy} className="h-3.5 w-3.5" />
                  {copied === link.url ? "Copied" : "Copy link"}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => {
              setSentDialogOpen(false);
              navigate("/dashboard");
            }} className="w-full sm:w-auto rounded-full bg-[#5ba114] hover:bg-[#477c13] font-bold text-xs h-9.5 shadow-sm px-6">
              Go to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}





