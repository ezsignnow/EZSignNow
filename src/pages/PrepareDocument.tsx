import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FieldPalette } from "@/components/documents/FieldPalette";
import { SignatoryManager, Signatory } from "@/components/documents/SignatoryManager";
import { DocumentCanvas, Field } from "@/components/documents/DocumentCanvas";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Save, Send, Loader2, Copy, Check,
  FileSignature, ChevronDown, Briefcase, User, PenTool,
  CreditCard, Star, LogOut, HelpCircle, FileText, Clock,
  Sun, Moon
} from "lucide-react";
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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [sentDialogOpen, setSentDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
        const colors = [
          "hsl(200, 98%, 39%)",
          "hsl(142, 76%, 36%)",
          "hsl(262, 83%, 58%)",
          "hsl(24, 100%, 50%)",
          "hsl(340, 82%, 52%)",
        ];
        loadedSignatories = sigData.map((s, i) => ({
          ...s,
          color: colors[i % colors.length],
        }));
        setSignatories(loadedSignatories);
      }

      // Fetch existing fields
      const { data: fieldData } = await supabase
        .from("signature_fields")
        .select("*")
        .eq("document_id", id);

      if (fieldData) {
        setFields(
          fieldData.map((f) => {
            let signatoryIndex = f.signatory_id
              ? loadedSignatories.findIndex((s) => s.id === f.signatory_id)
              : -1;

            if (signatoryIndex === -1 && loadedSignatories.length === 1) {
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
          })
        );
      }

      setLoading(false);
    };

    fetchDocument();
  }, [id, user, navigate, toast]);

  const handleAddSignatory = async (signatory: Omit<Signatory, "id" | "status">) => {
    setSignatories([...signatories, signatory as Signatory]);
  };

  const handleRemoveSignatory = (index: number) => {
    setSignatories(signatories.filter((_, i) => i !== index));
    if (selectedSignatory === index) {
      setSelectedSignatory(null);
    }
  };

  const handleAddField = (type: string) => {
    let width = 140;
    let height = 36;
    
    if (type === "checkbox") {
      width = 24;
      height = 24;
    } else if (type === "date" || type === "label") {
      width = 120;
      height = 36;
    }

    const newField: Field = {
      id: `field-${Date.now()}`,
      type,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width,
      height,
      required: true,
      signatoryIndex: selectedSignatory,
    };
    setFields([...fields, newField]);
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);

    try {
      // Save signatories
      await supabase.from("signatories").delete().eq("document_id", id);
      
      let insertedSignatories: any[] = [];
      if (signatories.length > 0) {
        const { data: sigData, error: sigError } = await supabase
          .from("signatories")
          .insert(
            signatories.map((s, i) => ({
              document_id: id,
              email: s.email,
              name: s.name,
              order_num: i + 1,
            }))
          )
          .select();
        if (sigError) throw sigError;
        insertedSignatories = sigData || [];
      }

      // Save fields
      await supabase.from("signature_fields").delete().eq("document_id", id);
      
      if (fields.length > 0) {
        const { error: fieldError } = await supabase.from("signature_fields").insert(
          fields.map((f) => {
            const signatoryId = f.signatoryIndex !== null && insertedSignatories[f.signatoryIndex]
              ? insertedSignatories[f.signatoryIndex].id
              : null;

            return {
              document_id: id,
              field_type: f.type,
              x_position: f.x,
              y_position: f.y,
              width: f.width,
              height: f.height,
              label: f.label,
              tooltip: f.tooltip,
              required: f.required,
              signatory_id: signatoryId,
            };
          })
        );
        if (fieldError) throw fieldError;
      }

      toast({ title: "Changes saved" });
    } catch (error: any) {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (signatories.length === 0) {
      toast({
        title: "No signatories",
        description: "Please add at least one signatory.",
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

    await handleSave();

    // Update document status
    const { error } = await supabase
      .from("documents")
      .update({ status: "pending" })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Document sent!",
      description: "Direct signing links generated.",
    });
    setSentDialogOpen(true);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 transition-colors duration-250">
        <Loader2 className="h-8 w-8 animate-spin text-[#258ffb]" />
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfdfd] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-250 antialiased">
      {/* Top Trial Banner */}
      {isPremium ? (
        <div className="bg-emerald-600 dark:bg-emerald-700 text-white py-2 px-4 text-center text-xs font-semibold select-none flex items-center justify-center gap-1.5 shadow-sm shrink-0">
          <span>🌟 Business Trial Active. You have 7 days remaining on your trial.</span>
          <button 
            onClick={() => { 
              localStorage.removeItem("is_premium"); 
              setIsPremium(false); 
              toast({ title: "Trial Deactivated", description: "Returned to the free sandbox plan." }); 
            }} 
            className="underline hover:text-white/95 transition-all font-bold ml-1.5 focus:outline-none"
          >
            Manage Plan
          </button>
        </div>
      ) : (
        <div className="bg-[#258ffb] dark:bg-[#1d7ee6] text-white py-2 px-4 text-center text-xs font-semibold select-none flex items-center justify-center gap-1.5 shadow-sm shrink-0">
          <span>You have a 7-day Free Business Trial.</span>
          <button onClick={() => navigate("/try-trial")} className="underline hover:text-white/95 transition-all font-bold focus:outline-none">Try now</button>
        </div>
      )}

      {/* Header bar matching Signaturely */}
      <header className="border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 px-6 py-4 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#258ffb]/10 dark:bg-[#258ffb]/20 p-1.5 rounded-lg cursor-pointer" onClick={() => navigate("/dashboard")}>
            <FileSignature className="h-6 w-6 text-[#258ffb] dark:text-[#258ffb]" />
          </div>
          <span className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight cursor-pointer" onClick={() => navigate("/dashboard")}>ezsignnow</span>
        </div>

        <div className="flex items-center gap-6">
          {/* Monthly usage */}
          {isPremium ? (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-semibold select-none">
              <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[11px] font-bold">
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
                ? "border-emerald-500 dark:border-emerald-600 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20" 
                : "border-[#258ffb] text-[#258ffb] dark:text-blue-400 hover:bg-[#258ffb]/5 dark:hover:bg-blue-950/20"
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
                  <div className="h-7 w-7 rounded-full bg-[#10b981] border border-slate-100 dark:border-slate-800 flex items-center justify-center text-[10px] font-extrabold text-white shadow-sm shrink-0 uppercase">
                    {user.email ? user.email.slice(0, 2) : "US"}
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 hidden md:inline max-w-[120px] truncate">
                    {user.email ? user.email.split("@")[0] : "User"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-550" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 w-52 p-1 border border-slate-100/85 dark:border-slate-800 shadow-md dark:shadow-slate-950/80 select-none">
                
                {/* 1. Company item */}
                <DropdownMenuItem 
                  onClick={() => navigate("/dashboard?tab=team")}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 cursor-pointer focus:outline-none"
                >
                  <Briefcase className="mr-3 h-4 w-4 text-slate-400" />
                  Company
                </DropdownMenuItem>

                {/* 2. Profile item */}
                <DropdownMenuItem 
                  onClick={() => navigate("/dashboard?tab=settings")}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 cursor-pointer mt-0.5 focus:outline-none"
                >
                  <User className="mr-3 h-4 w-4 text-slate-400" />
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
                  <PenTool className="mr-3 h-4 w-4 text-slate-400" />
                  Edit Signature
                </DropdownMenuItem>

                {/* 4. Billing item */}
                <DropdownMenuItem 
                  onClick={() => navigate("/try-trial")}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 cursor-pointer mt-0.5 focus:outline-none"
                >
                  <CreditCard className="mr-3 h-4 w-4 text-slate-400" />
                  Billing
                </DropdownMenuItem>

                {/* 5. Share & Earn item */}
                <DropdownMenuItem 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=meets`);
                    toast({ title: "Share & Earn Copied!", description: "Unique referral link copied to clipboard. Earn free requests!" });
                  }}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 cursor-pointer mt-0.5 focus:outline-none"
                >
                  <Star className="mr-3 h-4 w-4 text-slate-400" />
                  Share & Earn
                </DropdownMenuItem>

                {/* Separator */}
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                {/* 6. Logout item */}
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-xs font-bold text-destructive hover:text-destructive/95 py-2.5 cursor-pointer focus:outline-none"
                >
                  <LogOut className="mr-3 h-4 w-4 text-slate-400" />
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
                <Sun className="h-4.5 w-4.5 text-amber-500" />
              ) : (
                <Moon className="h-4.5 w-4.5" />
              )}
            </button>

            {/* Help Button (outside the dropdown) */}
            <button 
              onClick={() => toast({ title: "Customer Support", description: "Opening interactive documentation..." })}
              className="h-[34px] w-[34px] rounded-full border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 bg-white dark:bg-slate-900 shadow-sm transition-all focus:outline-none"
            >
              <HelpCircle className="h-4.5 w-4.5" />
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
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                    {document.title}
                  </h1>
                  <span className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-extrabold px-2.5 py-0.5 text-[9px] rounded-full uppercase select-none tracking-wider shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                    Draft
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 leading-normal">
                  Add fields and signatories to your document
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2.5 items-center">
            <Button 
              variant="outline" 
              onClick={handleSave} 
              disabled={saving}
              className="rounded-full border-[#258ffb] text-[#258ffb] dark:text-blue-400 hover:bg-[#258ffb]/5 dark:hover:bg-blue-950/20 bg-white dark:bg-slate-900 h-9.5 px-5 font-bold text-xs shadow-sm transition-all focus-visible:ring-1 focus-visible:ring-[#258ffb]/20"
            >
              {saving ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-2 h-3.5 w-3.5" />
              )}
              Save Draft
            </Button>
            <Button 
              onClick={handleSend}
              className="rounded-full bg-[#258ffb] hover:bg-[#1d7ee6] text-white h-9.5 px-6 font-bold text-xs shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-[#258ffb]/20"
            >
              <Send className="mr-2 h-3.5 w-3.5" />
              Send for Signing
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr_280px]">
          {/* Left Sidebar - Field Palette */}
          <div className="space-y-4">
            <FieldPalette onAddField={handleAddField} />
          </div>

          {/* Center - Document Canvas */}
          <DocumentCanvas
            fields={fields}
            onFieldsChange={setFields}
            signatories={signatories}
            selectedSignatory={selectedSignatory}
            fileUrl={pdfUrl}
          />

          {/* Right Sidebar - Signatories */}
          <div>
            <SignatoryManager
              signatories={signatories}
              onAdd={handleAddSignatory}
              onRemove={handleRemoveSignatory}
              onReorder={setSignatories}
              selectedSignatory={selectedSignatory}
              onSelectSignatory={setSelectedSignatory}
            />
          </div>
        </div>
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
              <Check className="h-6 w-6 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 rounded-full p-1 border border-emerald-100 dark:border-emerald-900 shrink-0" />
              Document Sent Successfully!
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
              Real email dispatch is simulated in this sandbox environment. You can copy the signing link below to manually share or test the signing flow:
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)]">
              <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Signatories
              </p>
              {signatories.map((sig, idx) => (
                <div key={idx} className="flex flex-col gap-0.5 border-b border-slate-100/50 dark:border-slate-800/50 pb-2 last:border-0 last:pb-0">
                  <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{sig.name}</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">{sig.email}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Direct Sign Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/document/${id}/view`}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-xs text-slate-500 dark:text-slate-400 outline-none select-all font-semibold shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.01)]"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/document/${id}/view`);
                    setCopied(true);
                    toast({ title: "Link copied to clipboard!" });
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="h-9.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1 bg-[#258ffb] hover:bg-[#1d7ee6] shadow-sm shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => {
              setSentDialogOpen(false);
              navigate("/dashboard");
            }} className="w-full sm:w-auto rounded-full bg-[#258ffb] hover:bg-[#1d7ee6] font-bold text-xs h-9.5 shadow-sm px-6">
              Go to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


