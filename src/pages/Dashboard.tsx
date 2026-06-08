import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentList } from "@/components/documents/DocumentList";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getAbsoluteUrl } from "@/utils/url";
import { 
  PenTool, 
  FileText, 
  Copy, 
  CheckSquare, 
  Users, 
  Layers, 
  Settings,
  HelpCircle,
  ChevronDown,
  LogOut,
  FileSignature,
  Clock,
  CheckCircle2,
  Plus,
  Loader2,
  Mail,
  UserPlus,
  Save,
  Check,
  ArrowRight,
  ExternalLink,
  Laptop,
  User,
  Briefcase,
  CreditCard,
  Star,
  Trash2,
  Image,
  Palette,
  Sparkles,
  RefreshCw,
  Globe
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLogo } from "@/components/layout/BrandLogo";

// Cloud and integration icons
const GoogleDriveIcon = () => (
  <svg viewBox="0 0 87.3 78" className="h-6 w-6 shrink-0">
    <path d="M58.3 70.8L29.1 20.3 14.6 45.5l29.1 50.5c3.2-5.4 14.6-25.2 14.6-25.2z" fill="#00832d" />
    <path d="M58.3 70.8L87.3 20.3H29.1l-14.5 25.2h58.2c-4.4 7.5-14.5 25.3-14.5 25.3z" fill="#0066da" />
    <path d="M29.1 20.3L0 70.8h58.3l14.5-25.3H14.6c4.5-7.7 14.5-25.2 14.5-25.2z" fill="#ffba00" />
  </svg>
);

const OneDriveIcon = () => (
  <svg viewBox="0 0 256 256" className="h-6 w-6 shrink-0">
    <path fill="#0364B8" d="M192.5 98.7c-2.3-37.4-33-66.9-70.5-66.9-24.1 0-45.5 12-58.2 30.5-1.5-.1-3-.2-4.5-.2-23.7 0-43.2 18-45.6 41C5.1 106.6 0 115.3 0 125c0 24.3 19.7 44 44 44h168c24.3 0 44-19.7 44-44 0-14.2-6.7-26.8-17.1-34.9-1.9-2.2-4.1-4.2-6.4-6.4z"/>
  </svg>
);

const DropboxIcon = () => (
  <svg viewBox="0 0 256 256" className="h-6 w-6 shrink-0">
    <path fill="#0061FE" d="M128 171.1L30.6 112 128 52.9 225.4 112 128 171.1zM30.6 112L128 171.1 30.6 230.2 0 186.6 30.6 112zm194.8 0l-97.4 59.1 97.4 59.1 30.6-43.6-30.6-74.6zM128 52.9l-97.4-59.1L0 37.4 97.4 96.5 128 52.9zm0 0l97.4-59.1L256 37.4l-97.4 59.1-30.6-43.6z"/>
  </svg>
);

const BoxIcon = () => (
  <svg viewBox="0 0 256 256" className="h-6 w-6 shrink-0">
    <path fill="#0061D5" d="M165.7 131.5c15.6-1.5 25.1-12.7 25.1-27.4 0-18.7-13.6-30.2-34.8-30.2H103v108.6h55c23.6 0 38.6-11.9 38.6-31 0-13.7-8.1-25.1-22.9-28.5L185 163h-25.6l-10-31.5h-10zm-42.9-42h11c11.1 0 16.5 5 16.5 14.8 0 9.7-5.4 14.6-16.5 14.6h-11v-29.4zm0 43.8h13.2c12.2 0 18.2 5.5 18.2 16.2 0 10.7-6 16.2-18.2 16.2h-13.2V133.3z"/>
  </svg>
);

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "sign";
  const { toast } = useToast();
  const [isPremium, setIsPremium] = useState(localStorage.getItem("is_premium") === "true");

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Expanded states for Templates, Branding, and Team Workspace Workflows
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [settingsSubTab, setSettingsSubTab] = useState<"profile" | "branding">("profile");
  
  // Custom Branding Panel States
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#258ffb");
  const [secondaryColor, setSecondaryColor] = useState("#0f172a");
  const [accentColor, setAccentColor] = useState("#10b981");
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Expanded Team Workspace States
  const [workspaceName, setWorkspaceName] = useState("Techladder Antigravity Workspace");
  const [workspaceSlug, setWorkspaceSlug] = useState("techladder-antigravity");
  const [teamMembers, setTeamMembers] = useState([
    { email: "meets@example.com", role: "Admin", status: "Active" },
    { email: "sarah.jenkins@corp.com", role: "Member", status: "Active" },
    { email: "john.doe@techladder.com", role: "Viewer", status: "Active" }
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [pendingInvites, setPendingInvites] = useState([
    { email: "m.chen@EZSignNow.com", role: "Member", invitedAt: "May 24, 2026" },
    { email: "alex.rivera@corp.com", role: "Manager", invitedAt: "May 25, 2026" }
  ]);
  const [collaborativeFeatures, setCollaborativeFeatures] = useState({
    shareTemplates: true,
    auditTrailsPublic: true,
    enforceSso: false
  });
  
  const [profileName, setProfileName] = useState("Meets User");
  const [profileEmail, setProfileEmail] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Signature font
  const FONT_OPTIONS = [
    { label: "Dancing Script Bold",    value: "Dancing Script",    google: "Dancing+Script:wght@700" },
    { label: "Great Vibes Cursive",     value: "Great Vibes",       google: "Great+Vibes" },
    { label: "Pacifico Regular",        value: "Pacifico",          google: "Pacifico" },
    { label: "Pinyon Script",           value: "Pinyon Script",     google: "Pinyon+Script" },
    { label: "Sacramento Cursive",      value: "Sacramento",        google: "Sacramento" },
    { label: "Allura Script",           value: "Allura",            google: "Allura" },
  ];
  const [signingFont, setSigningFont] = useState(
    () => localStorage.getItem("signing_font") || "Dancing Script"
  );

  // Load the Google Font whenever signingFont changes
  useEffect(() => {
    const selected = FONT_OPTIONS.find(f => f.value === signingFont);
    if (!selected) return;
    const linkId = `gfont-${selected.value.replace(/\s/g, "-")}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${selected.google}&display=swap`;
      document.head.appendChild(link);
    }
  }, [signingFont]);

  const [integrations, setIntegrations] = useState([
    { id: "gdrive", name: "Google Drive", connected: true, description: "Import files directly from your Google Drive account.", icon: GoogleDriveIcon },
    { id: "onedrive", name: "OneDrive", connected: false, description: "Access documents stored in your Microsoft OneDrive account.", icon: OneDriveIcon },
    { id: "dropbox", name: "Dropbox", connected: false, description: "Sync and pull files seamlessly from your Dropbox workspace.", icon: DropboxIcon },
    { id: "box", name: "Box", connected: false, description: "Retrieve business files from your Box enterprise account.", icon: BoxIcon }
  ]);

  const [forms, setForms] = useState([
    { id: "f1", name: "Client Intake Agreement", status: "Active", responses: 12, link: "ezsign.now/f/intake-42" },
    { id: "f2", name: "Liability Waiver Form", status: "Active", responses: 24, link: "ezsign.now/f/waiver-10" },
    { id: "f3", name: "Consulting Feedback Form", status: "Inactive", responses: 0, link: "ezsign.now/f/feedback-03" }
  ]);
  
  const [newFormName, setNewFormName] = useState("");
  const [isCreatingForm, setIsCreatingForm] = useState(false);

  // Load Custom Templates & Branding settings from localStorage
  useEffect(() => {
    // Templates
    const listStored = localStorage.getItem("custom_templates_list");
    if (listStored) {
      try {
        setCustomTemplates(JSON.parse(listStored));
      } catch (err) {
        console.error("Error reading templates:", err);
      }
    }

    // Branding
    const storedBranding = localStorage.getItem("custom_branding");
    if (storedBranding) {
      try {
        const parsed = JSON.parse(storedBranding);
        if (parsed.logoUrl) setBrandLogoUrl(parsed.logoUrl);
        if (parsed.primaryColor) setPrimaryColor(parsed.primaryColor);
        if (parsed.secondaryColor) setSecondaryColor(parsed.secondaryColor);
        if (parsed.accentColor) setAccentColor(parsed.accentColor);
      } catch (err) {
        console.error("Error loading custom branding:", err);
      }
    }
  }, [activeTab]);

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

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
    if (user) {
      setProfileEmail(user.email || "");
      fetchStats();

      // Realtime listener for stats update
      const channel = supabase
        .channel("dashboard-realtime-stats")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "documents",
            filter: `owner_id=eq.${user.id}`,
          },
          () => {
            fetchStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const setActiveTab = (tabName: string) => {
    setSearchParams({ tab: tabName });
  };

  // Expanded Interaction Handlers

  // 1. Templates Handlers
  const handleDeleteTemplate = (id: string, name: string) => {
    localStorage.removeItem(`template_${id}`);
    const updated = customTemplates.filter(item => item.id !== id);
    setCustomTemplates(updated);
    localStorage.setItem("custom_templates_list", JSON.stringify(updated));
    toast({
      title: "Template Deleted",
      description: `"${name}" has been permanently removed.`
    });
  };

  const handleUseTemplate = async (template: any) => {
    if (!user) return;
    toast({
      title: "Initializing Document",
      description: `Creating new document copy from "${template.title}"...`,
    });
    
    try {
      // Generate a proper UUID — Supabase documents.id is type uuid, not text
      const { data, error } = await supabase
        .from("documents")
        .insert({
          owner_id: user.id,
          title: `${template.title} Copy`,
          file_name: `${template.title.toLowerCase().replace(/\s+/g, "_")}_copy.pdf`,
          file_url: "https://ejvpyjzhwmsxshqpsuhq.supabase.co/storage/v1/object/public/documents/default_template.pdf",
          file_size: 102400,
          status: "draft",
        })
        .select()
        .single();
        
      if (error) throw error;

      // Use the Supabase-generated UUID as docId for all subsequent relations
      const docId = data.id;
      
      // If it is a custom template, read and copy full signatories & fields configuration
      if (!template.isDefault) {
        const fullTemplateRaw = localStorage.getItem(`template_${template.id}`);
        if (fullTemplateRaw) {
          const fullTemplate = JSON.parse(fullTemplateRaw);
          
          if (fullTemplate.roles && fullTemplate.roles.length > 0) {
            const sigsToInsert = fullTemplate.roles.map((role: any, idx: number) => ({
              document_id: docId,
              email: `${role.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
              name: role.name,
              order_num: idx + 1,
              status: "pending"
            }));
            const { data: insertedSigs, error: sigErr } = await supabase
              .from("signatories")
              .insert(sigsToInsert)
              .select();
              
            if (sigErr) throw sigErr;
            
            if (fullTemplate.fields && fullTemplate.fields.length > 0 && insertedSigs) {
              const fieldsToInsert = fullTemplate.fields.map((f: any) => {
                const roleIdx = fullTemplate.roles.findIndex((r: any) => r.id === f.roleId);
                const signatoryId = roleIdx !== -1 && insertedSigs[roleIdx] ? insertedSigs[roleIdx].id : null;
                return {
                  document_id: docId,
                  field_type: f.type,
                  x_position: f.x,
                  y_position: f.y,
                  width: f.width,
                  height: f.height,
                  label: f.label || null,
                  tooltip: f.tooltip || null,
                  required: f.required,
                  signatory_id: signatoryId
                };
              });
              const { error: fieldErr } = await supabase.from("signature_fields").insert(fieldsToInsert);
              if (fieldErr) throw fieldErr;
            }
          }
        }
      } else {
        // Default standard placeholders
        const { data: defaultSigs } = await supabase
          .from("signatories")
          .insert([
            { document_id: docId, email: "client@example.com", name: "Client Partner", order_num: 1, status: "pending" },
            { document_id: docId, email: "admin@corp.com", name: "Internal Officer", order_num: 2, status: "pending" },
          ])
          .select();
          
        if (defaultSigs) {
          await supabase.from("signature_fields").insert([
            { document_id: docId, field_type: "signature", x_position: 120, y_position: 450, width: 140, height: 36, required: true, signatory_id: defaultSigs[0].id },
            { document_id: docId, field_type: "signature", x_position: 340, y_position: 450, width: 140, height: 36, required: true, signatory_id: defaultSigs[1].id },
          ]);
        }
      }
      
      toast({
        title: "Layout Framework Loaded",
        description: `Successfully loaded "${template.title}" configuration. Ready for final signing send!`
      });
      navigate(`/document/${docId}/prepare`);
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Instantiate Failed",
        description: err.message || "Failed to initialize standard document template.",
        variant: "destructive"
      });
    }
  };

  // 2. Custom Branding Handlers
  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    
    setTimeout(() => {
      const payload = {
        logoUrl: brandLogoUrl,
        primaryColor,
        secondaryColor,
        accentColor,
      };
      
      localStorage.setItem("custom_branding", JSON.stringify(payload));
      setIsSavingBranding(false);
      
      // Dispatch standard custom event to notify components like BrandLogo to re-render logo instantly
      window.dispatchEvent(new Event("branding_updated"));
      
      toast({
        title: "Workspace Branding Saved",
        description: "Your brand colors and logo have been loaded dynamically across all signing headers!"
      });
    }, 900);
  };

  const handleResetBranding = () => {
    localStorage.removeItem("custom_branding");
    setBrandLogoUrl(null);
    setPrimaryColor("#258ffb");
    setSecondaryColor("#0f172a");
    setAccentColor("#10b981");
    window.dispatchEvent(new Event("branding_updated"));
    toast({
      title: "Workspace Branding Reset",
      description: "Returned to the classic Signaturely brand colors and icons."
    });
  };

  // 3. Expanded Workspace and Invite Handlers
  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    if (teamMembers.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      toast({
        title: "Already Member",
        description: "This email is already an active member of this workspace.",
        variant: "destructive"
      });
      return;
    }

    if (pendingInvites.some(i => i.email.toLowerCase() === inviteEmail.toLowerCase())) {
      toast({
        title: "Already Invited",
        description: "This email already has an active pending workspace invitation.",
        variant: "destructive"
      });
      return;
    }

    // Add to pending invitations
    const newInvite = {
      email: inviteEmail,
      role: inviteRole,
      invitedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    };
    
    setPendingInvites([...pendingInvites, newInvite]);
    setInviteEmail("");
    
    toast({
      title: "Workspace Invite Dispatched",
      description: `Dynamic Zoho mail relay has sent an active collaborator invite to ${inviteEmail} as "${inviteRole}".`
    });
  };

  const handleRevokeInvite = (email: string) => {
    setPendingInvites(pendingInvites.filter(i => i.email !== email));
    toast({
      title: "Invitation Revoked",
      description: `Cancelled pending collaborator credentials for ${email}.`
    });
  };

  const handleResendInvite = (email: string) => {
    toast({
      title: "Invitation Re-sent",
      description: `Dispatched fresh verification token to ${email} workspace link.`
    });
  };

  const handleUpdateMemberRole = (email: string, nextRole: string) => {
    setTeamMembers(teamMembers.map(m => m.email === email ? { ...m, role: nextRole } : m));
    toast({
      title: "Collaborator Role Updated",
      description: `Access role for ${email} is now configured as ${nextRole}.`
    });
  };

  const handleRemoveMember = (email: string) => {
    setTeamMembers(teamMembers.filter(m => m.email !== email));
    toast({
      title: "Member Terminated",
      description: `Removed ${email} workspace authorization privileges.`,
      variant: "destructive"
    });
  };

  const handleSaveWorkspaceProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Workspace Profile Applied",
      description: `Workspace details updated to "${workspaceName}" (${workspaceSlug})`
    });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setTimeout(() => {
      setIsSavingSettings(false);
      toast({
        title: "Settings Saved",
        description: "Your workspace profile changes have been applied."
      });
    }, 1000);
  };

  const toggleIntegration = (id: string, name: string) => {
    setIntegrations(integrations.map(integ => {
      if (integ.id === id) {
        const nextState = !integ.connected;
        toast({
          title: nextState ? `${name} Connected` : `${name} Disconnected`,
          description: nextState 
            ? `Successfully connected ${name} in sandbox mode.` 
            : `Unlinked ${name} integration from your account.`
        });
        return { ...integ, connected: nextState };
      }
      return integ;
    }));
  };

  const handleCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormName) return;
    setIsCreatingForm(true);
    setTimeout(() => {
      setForms([
        {
          id: `f${Date.now()}`,
          name: newFormName,
          status: "Active",
          responses: 0,
          link: `ezsign.now/f/${newFormName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
        },
        ...forms
      ]);
      setNewFormName("");
      setIsCreatingForm(false);
      toast({
        title: "Form Created",
        description: "Your shareable web form is now active and ready for links!"
      });
    }, 800);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#258ffb]" />
      </div>
    );
  }

  if (!user) return null;

  const sidebarItems = [
    { id: "sign", label: "Sign", icon: PenTool },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "templates", label: "Templates", icon: Copy },
    { id: "forms", label: "Forms", icon: CheckSquare },
    { id: "team", label: "Team", icon: Users },
    { id: "integrations", label: "Integrations", icon: Layers },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfdfd] antialiased">
      {/* Top Trial Banner */}
      {isPremium ? (
        <div className="bg-emerald-600 text-white py-2 px-4 text-center text-xs font-semibold select-none flex items-center justify-center gap-1.5 shadow-sm shrink-0">
          <span>🌟 Business Trial Active. You have 7 days remaining on your trial.</span>
          <button 
            onClick={() => { 
              localStorage.removeItem("is_premium"); 
              setIsPremium(false); 
              toast({ title: "Trial Deactivated", description: "Returned to the free sandbox plan." }); 
            }} 
            className="underline hover:text-white/95 transition-all font-bold ml-1.5"
          >
            Manage Plan
          </button>
        </div>
      ) : (
        <div className="bg-[#258ffb] text-white py-2 px-4 text-center text-xs font-semibold select-none flex items-center justify-center gap-1.5 shadow-sm shrink-0">
          <span>You have a 7-day Free Business Trial.</span>
          <button onClick={() => navigate("/try-trial")} className="underline hover:text-white/95 transition-all font-bold">Try now</button>
        </div>
      )}

      {/* Header bar matching Signaturely */}
      <header className="border-b border-slate-100 bg-white px-6 py-4 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0">
        <BrandLogo onClick={() => navigate("/dashboard")} className="cursor-pointer" />

        <div className="flex items-center gap-6">
          {/* Monthly usage */}
          {isPremium ? (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-semibold select-none">
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
                Active
              </span>
              <span>Business Trial plan</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-semibold select-none">
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
                {statsLoading ? "..." : stats.total} of 3
              </span>
              <span>signature requests this month</span>
            </div>
          )}

          {/* Upgrade button */}
          <Button 
            onClick={() => navigate("/try-trial")}
            className={`rounded-full h-[34px] px-5 font-bold text-xs shadow-sm transition-all border-[1.5px] bg-white ${
              isPremium 
                ? "border-emerald-500 text-emerald-500 hover:bg-emerald-50/50" 
                : "border-[#258ffb] text-[#258ffb] hover:bg-[#258ffb]/5"
            }`}
          >
            {isPremium ? "Premium" : "Upgrade"}
          </Button>

          {/* User profile dropdown & support dropdown */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-slate-50/50 p-1.5 rounded-lg transition-all bg-white select-none">
                  {/* User green logo avatar circle */}
                  <div className="h-7 w-7 rounded-full bg-[#10b981] border border-slate-100 flex items-center justify-center text-[10px] font-extrabold text-white shadow-sm shrink-0 uppercase">
                    {user.email ? user.email.slice(0, 2) : "US"}
                  </div>
                  <span className="text-xs font-bold text-slate-600 hidden md:inline max-w-[120px] truncate">
                    {user.email ? user.email.split("@")[0] : "User"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover w-52 p-1 border border-slate-100/80 shadow-md select-none">
                
                {/* 1. Company item */}
                <DropdownMenuItem 
                  onClick={() => setSearchParams({ tab: "team" })}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer"
                >
                  <Briefcase className="mr-3 h-4 w-4 text-slate-400" />
                  Company
                </DropdownMenuItem>

                {/* 2. Profile item */}
                <DropdownMenuItem 
                  onClick={() => setSearchParams({ tab: "settings" })}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5"
                >
                  <User className="mr-3 h-4 w-4 text-slate-400" />
                  Profile
                </DropdownMenuItem>

                {/* 3. Edit Signature item */}
                <DropdownMenuItem 
                  onClick={() => {
                    setSearchParams({ tab: "settings" });
                    setTimeout(() => {
                      toast({ title: "Edit Signature Active", description: "Select your default cursive script fonts below." });
                    }, 300);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5"
                >
                  <PenTool className="mr-3 h-4 w-4 text-slate-400" />
                  Edit Signature
                </DropdownMenuItem>

                {/* 4. Billing item */}
                <DropdownMenuItem 
                  onClick={() => navigate("/try-trial")}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5"
                >
                  <CreditCard className="mr-3 h-4 w-4 text-slate-400" />
                  Billing
                </DropdownMenuItem>

                {/* 5. Share & Earn item */}
                <DropdownMenuItem 
                  onClick={() => {
                    navigator.clipboard.writeText(getAbsoluteUrl("/signup?ref=meets"));
                    toast({ title: "Share & Earn Copied!", description: "Unique referral link copied to clipboard. Earn free requests!" });
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5"
                >
                  <Star className="mr-3 h-4 w-4 text-slate-400" />
                  Share & Earn
                </DropdownMenuItem>

                {/* Separator */}
                <div className="border-t border-slate-100 my-1" />

                {/* 6. Logout item */}
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-xs font-bold text-destructive hover:text-destructive/95 py-2.5 cursor-pointer"
                >
                  <LogOut className="mr-3 h-4 w-4 text-slate-400" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Help Button (outside the dropdown) */}
            <button 
              onClick={() => toast({ title: "Customer Support", description: "Opening interactive documentation..." })}
              className="h-[34px] w-[34px] rounded-full border border-slate-100 hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 bg-white shadow-sm transition-all"
            >
              <HelpCircle className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main screen container split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside className="w-[200px] border-r border-slate-100 bg-white p-4 space-y-1 hidden md:block shrink-0 shadow-[1px_0_2px_rgba(0,0,0,0.01)]">
          {sidebarItems.map((item) => {
            const isDocActive = activeTab === "documents" && item.id === "documents";
            const docStatus = searchParams.get("status") || "all";
            
            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => {
                    if (item.id === "documents") {
                      setSearchParams({ tab: "documents", status: "all" });
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-lg text-xs font-bold transition-all ${
                    activeTab === item.id
                      ? "bg-[#258ffb]/5 text-[#258ffb] shadow-[inset_3px_0_0_#258ffb]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <item.icon className={`h-4.5 w-4.5 ${activeTab === item.id ? "text-[#258ffb]" : "text-slate-400"}`} />
                  {item.label}
                </button>
                
                {/* Nested sub-menu for Documents when active */}
                {isDocActive && (
                  <div className="pl-6.5 py-1 space-y-1 select-none border-l border-slate-100 ml-5.5 animate-in slide-in-from-top-1.5 duration-200">
                    {[
                      { id: "completed", label: "Completed", color: "bg-emerald-500" },
                      { id: "pending", label: "Awaiting Signature", color: "bg-amber-500" },
                      { id: "cancelled", label: "Voided", color: "bg-red-500" },
                      { id: "draft", label: "Draft", color: "bg-slate-400" },
                      { id: "received", label: "Received", color: "bg-[#258ffb]" },
                      { id: "trash", label: "Trash", color: "bg-slate-300" },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setSearchParams({ tab: "documents", status: sub.id })}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-bold transition-all ${
                          docStatus === sub.id
                            ? "text-[#258ffb] bg-[#258ffb]/5"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${sub.color}`} />
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        {/* Right view panel */}
        <main className="flex-1 bg-[#f8fafc]/40 p-6 md:p-8 lg:p-10 overflow-y-auto">
          <div className="max-w-[1000px] mx-auto w-full">
            
            {/* View Pane Switch */}
            {activeTab === "sign" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="mb-4">
                  <h1 className="text-2xl font-extrabold text-slate-800">Prepare & Sign Documents</h1>
                  <p className="text-sm text-slate-500 mt-1">Upload a PDF or choose a template to add signers and fields.</p>
                </div>
                <DocumentUpload />
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-800">Documents Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Monitor, track status, and manage your electronic signatures.</p>
                  </div>
                  <Button onClick={() => setActiveTab("sign")} className="bg-[#258ffb] hover:bg-[#1a7ae0] font-bold text-xs h-9 rounded-full px-5 shadow-sm gap-2">
                    <Plus className="h-4 w-4" />
                    New Document
                  </Button>
                </div>

                {/* Dashboard stats cards */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                  {[
                    { icon: FileText, label: "Total Documents", value: statsLoading ? "-" : stats.total.toString(), color: "bg-[#258ffb]/10 text-[#258ffb]" },
                    { icon: Clock, label: "Pending Signatures", value: statsLoading ? "-" : stats.pending.toString(), color: "bg-amber-500/10 text-amber-500" },
                    { icon: CheckCircle2, label: "Completed Signatures", value: statsLoading ? "-" : stats.completed.toString(), color: "bg-emerald-500/10 text-emerald-500" },
                  ].map((stat) => (
                    <Card key={stat.label} className="border-slate-100 shadow-[0_2px_4px_rgba(0,0,0,0.01)] hover:shadow-md transition-shadow">
                      <CardContent className="flex items-center gap-4.5 p-5">
                        <div className={`rounded-xl p-3 ${stat.color} shrink-0`}>
                          <stat.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-extrabold text-slate-800 leading-tight">{stat.value}</p>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">{stat.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Kiosk Mode Quick-Launch Banner */}
                {stats.pending > 0 && (
                  <Card className="border border-[#258ffb]/20 bg-gradient-to-r from-blue-50/40 to-indigo-50/20 dark:from-slate-900/40 dark:to-slate-950/20 rounded-2xl shadow-[0_2px_8px_rgba(37,143,251,0.01)] overflow-hidden select-none animate-in fade-in slide-in-from-top-1.5 duration-300 mb-6">
                    <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#258ffb] to-indigo-500 text-white flex items-center justify-center shadow-md shadow-[#258ffb]/10 shrink-0">
                          <Laptop className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Host In-Person Signing Kiosk</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-450 mt-0.5">You have {stats.pending} pending envelope(s) ready to sign in-person on this local device.</p>
                        </div>
                      </div>
                      <Button
                        onClick={async () => {
                          try {
                            const { data } = await supabase
                              .from("documents")
                              .select("id")
                              .eq("status", "pending")
                              .order("created_at", { ascending: false })
                              .limit(1)
                              .maybeSingle();
                            if (data) {
                              navigate(`/document/${data.id}/view?kiosk=true`);
                            } else {
                              toast({ title: "No pending envelopes", description: "All envelopes are completed or in draft status." });
                            }
                          } catch (err) {
                            console.error("Kiosk launch error:", err);
                          }
                        }}
                        className="rounded-full bg-gradient-to-r from-[#258ffb] to-indigo-600 hover:from-[#1d7ee6] hover:to-indigo-700 text-white font-bold text-xs h-9 px-5 shadow-sm shrink-0 flex items-center gap-1.5 transition-all"
                      >
                        Launch Kiosk Mode
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Your Documents listing */}
                <div>
                  <h2 className="mb-4 text-sm font-bold text-slate-700">Your Signature Pipeline</h2>
                  <DocumentList />
                </div>
              </div>
            )}

            {activeTab === "templates" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-800">Templates Library</h1>
                    <p className="text-sm text-slate-500 mt-1">Save time by keeping reusable document forms with signature fields pre-configured.</p>
                  </div>
                  <Button 
                    onClick={() => navigate("/template/new")}
                    className="bg-[#258ffb] hover:bg-[#1a7ae0] font-bold text-xs h-9.5 rounded-full px-5 shadow-sm gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Template
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Custom Templates from localStorage */}
                  {customTemplates.map((item) => (
                    <Card key={item.id} className="border-slate-100 hover:shadow-md transition-all group flex flex-col justify-between relative bg-white overflow-hidden shadow-[0_2px_4px_rgba(0,0,0,0.01)] hover:-translate-y-0.5 duration-250">
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        <button
                          onClick={() => navigate(`/template/${item.id}/edit`)}
                          className="p-1.5 rounded-lg bg-white border border-slate-100 text-slate-500 hover:text-slate-800 hover:shadow-sm transition-all focus:outline-none"
                          title="Edit Template"
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(item.id, item.title)}
                          className="p-1.5 rounded-lg bg-rose-50 border border-rose-100 text-rose-500 hover:text-rose-700 hover:shadow-sm transition-all focus:outline-none"
                          title="Delete Template"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      
                      <CardContent className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-2.5">
                          <div className="h-10 w-10 bg-blue-50/50 border border-blue-100 text-[#258ffb] rounded-xl flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                            <Copy className="h-5 w-5" />
                          </div>
                          <h3 className="font-extrabold text-slate-800 text-[14.5px] truncate pr-12">{item.title}</h3>
                          <p className="text-[11.5px] text-slate-400 leading-relaxed line-clamp-2">{item.desc || "No description provided."}</p>
                        </div>
                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50/50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-[0_1px_2px_rgba(0,0,0,0.01)] select-none">Custom Layout</span>
                          <button 
                            onClick={() => handleUseTemplate(item)}
                            className="text-xs font-bold text-[#258ffb] flex items-center gap-1 group-hover:underline focus:outline-none"
                          >
                            Use Layout
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Standard Default Templates */}
                  {[
                    { id: "t-nda", title: "Standard NDA", desc: "Non-disclosure template with dual signature panels.", duration: "Last updated 3 days ago", isDefault: true },
                    { id: "t-contract", title: "Independent Contractor", desc: "Consulting agreement with scope milestones & payment fields.", duration: "Last updated 1 week ago", isDefault: true },
                    { id: "t-w9", title: "W-9 Form (2026)", desc: "Standard tax identification form pre-arranged.", duration: "Created on May 2, 2026", isDefault: true },
                  ].map((item) => (
                    <Card key={item.id} className="border-slate-100 hover:shadow-md hover:-translate-y-0.5 duration-250 transition-all group flex flex-col justify-between bg-white shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                      <CardContent className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-2.5">
                          <div className="h-10 w-10 bg-slate-50 border border-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
                            <Copy className="h-5 w-5" />
                          </div>
                          <h3 className="font-extrabold text-slate-800 text-[14.5px]">{item.title}</h3>
                          <p className="text-[11.5px] text-slate-400 leading-relaxed line-clamp-2">{item.desc}</p>
                        </div>
                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400">{item.duration}</span>
                          <button 
                            onClick={() => handleUseTemplate(item)}
                            className="text-xs font-bold text-[#258ffb] flex items-center gap-1 group-hover:underline focus:outline-none"
                          >
                            Use Layout
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Create Template layout */}
                  <Card 
                    onClick={() => navigate("/template/new")}
                    className="border-dashed border-slate-200 hover:border-[#258ffb]/55 hover:bg-blue-50/10 cursor-pointer flex flex-col items-center justify-center p-5 text-center min-h-[180px] bg-slate-50/20 transition-all group shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"
                  >
                    <CardContent className="p-0 space-y-3.5">
                      <div className="h-11 w-11 rounded-full border-[1.5px] border-[#258ffb]/30 group-hover:border-[#258ffb] flex items-center justify-center mx-auto text-[#258ffb] transition-all bg-white shadow-sm">
                        <Plus className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-extrabold text-slate-700 group-hover:text-slate-900 transition-colors">Create New Template</h4>
                        <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto mt-1 leading-normal">Save fields setup for repeat sends.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "forms" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800">Online Forms</h1>
                  <p className="text-sm text-slate-500 mt-1">Publish open links that anyone can visit, fill out details, and legally sign on their browser.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left Form Builder Controls */}
                  <Card className="border-slate-100 lg:col-span-1">
                    <CardContent className="p-5">
                      <form onSubmit={handleCreateForm} className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700">Quick Form Generator</h3>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-slate-400">FORM NAME</label>
                          <input 
                            type="text"
                            value={newFormName}
                            onChange={(e) => setNewFormName(e.target.value)}
                            placeholder="e.g. Guest Release Form"
                            className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded focus:border-[#258ffb]/50 focus:outline-none"
                            required
                          />
                        </div>
                        <Button 
                          type="submit" 
                          disabled={isCreatingForm}
                          className="w-full bg-[#258ffb] hover:bg-[#1a7ae0] rounded-[4px] h-[36px] font-bold text-xs shadow-md shadow-[#258ffb]/10"
                        >
                          {isCreatingForm ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Active Link"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Right Forms Table */}
                  <Card className="border-slate-100 lg:col-span-2">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                              <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">ACTIVE FORM</th>
                              <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">PUBLIC SHARE LINK</th>
                              <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-center">RESPONSES</th>
                            </tr>
                          </thead>
                          <tbody>
                            {forms.map((item) => (
                              <tr key={item.id} className="border-b border-slate-100/60 hover:bg-slate-50/20 transition-all">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${item.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                                    <span className="text-[13px] font-bold text-slate-700">{item.name}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(`https://${item.link}`);
                                      toast({ title: "Link Copied", description: "Public URL loaded into clipboard." });
                                    }}
                                    className="text-xs text-[#258ffb] font-semibold hover:underline flex items-center gap-1.5"
                                  >
                                    {item.link}
                                    <ExternalLink className="h-3 w-3" />
                                  </button>
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">{item.responses}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "team" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800">Workspace Management</h1>
                  <p className="text-sm text-slate-500 mt-1">Configure your corporate workspace details, edit user access roles, and monitor team activities.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* Left Column: Workspace Config & Invites */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Workspace Profile details */}
                    <Card className="border-slate-100/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] bg-white p-5 space-y-4">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-[#258ffb]" />
                        Workspace Profile
                      </h3>
                      
                      <form onSubmit={handleSaveWorkspaceProfile} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-400">WORKSPACE NAME</Label>
                          <Input 
                            value={workspaceName} 
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            className="text-xs font-semibold h-9 rounded-lg border-slate-200"
                            placeholder="e.g. Acme Corp Workspace"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-400">WORKSPACE URL SLUG</Label>
                          <div className="flex rounded-lg overflow-hidden border border-slate-200 h-9">
                            <span className="bg-slate-50 text-[10px] font-bold text-slate-400 border-r border-slate-200 px-2.5 flex items-center select-none uppercase tracking-tight">
                              ez/ws/
                            </span>
                            <input
                              value={workspaceSlug}
                              onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                              className="text-xs font-semibold px-3 py-1 flex-1 focus:outline-none w-full"
                              placeholder="acme-corp"
                            />
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          variant="outline"
                          className="w-full text-xs font-bold border-slate-200 h-9 rounded-lg flex items-center gap-1.5 hover:bg-slate-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Apply Profile
                        </Button>
                      </form>
                    </Card>

                    {/* Invite Collaborator Form */}
                    <Card className="border-slate-100/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] bg-white p-5 space-y-4">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-[#258ffb]" />
                        Invite Collaborator
                      </h3>

                      <form onSubmit={handleInviteMember} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-400 font-semibold">EMAIL ADDRESS</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input 
                              type="email" 
                              placeholder="colleague@company.com" 
                              value={inviteEmail} 
                              onChange={(e) => setInviteEmail(e.target.value)}
                              className="text-xs font-semibold pl-9 h-9 rounded-lg border-slate-200"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-400 font-semibold">COLLABORATOR ROLE</Label>
                          <select 
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="w-full text-xs font-semibold h-9 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none"
                          >
                            <option value="Member">Member (Create & send documents)</option>
                            <option value="Admin">Admin (Full administrative controls)</option>
                            <option value="Manager">Manager (Review team records)</option>
                            <option value="Viewer">Viewer (Read-only access)</option>
                          </select>
                        </div>

                        <Button 
                          type="submit"
                          className="w-full bg-[#258ffb] hover:bg-[#1a7ae0] font-bold text-xs h-9.5 rounded-full px-5 shadow-sm"
                        >
                          Send Invitation
                        </Button>
                      </form>
                    </Card>

                    {/* Collaborative Settings Switches */}
                    <Card className="border-slate-100/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] bg-white p-5 space-y-3.5">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Collaboration Policies</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                          <div>
                            <p className="text-[11.5px] font-bold text-slate-700 leading-tight">Shared Library</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Let members view & use saved templates.</p>
                          </div>
                          <button 
                            onClick={() => setCollaborativeFeatures({ ...collaborativeFeatures, shareTemplates: !collaborativeFeatures.shareTemplates })}
                            className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 outline-none focus:ring-0 ${
                              collaborativeFeatures.shareTemplates ? "bg-emerald-500" : "bg-slate-200"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-250 ${
                              collaborativeFeatures.shareTemplates ? "translate-x-4" : "translate-x-0"
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                          <div>
                            <p className="text-[11.5px] font-bold text-slate-700 leading-tight">Audit Trail Access</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Allow public viewing of signature certificate hashes.</p>
                          </div>
                          <button 
                            onClick={() => setCollaborativeFeatures({ ...collaborativeFeatures, auditTrailsPublic: !collaborativeFeatures.auditTrailsPublic })}
                            className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 outline-none focus:ring-0 ${
                              collaborativeFeatures.auditTrailsPublic ? "bg-emerald-500" : "bg-slate-200"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-250 ${
                              collaborativeFeatures.auditTrailsPublic ? "translate-x-4" : "translate-x-0"
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <p className="text-[11.5px] font-bold text-slate-700 leading-tight flex items-center gap-1">
                              Enforce SSO/MFA
                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Require multi-factor login for all members.</p>
                          </div>
                          <button 
                            onClick={() => {
                              toast({
                                title: "Enterprise Policy",
                                description: "Enforcing corporate SSO requires a premium Antigravity enterprise contract.",
                              });
                            }}
                            className="w-9 h-5 rounded-full bg-slate-100 flex items-center p-0.5 cursor-not-allowed border border-slate-200"
                          >
                            <div className="w-4 h-4 rounded-full bg-slate-350 shadow-sm translate-x-0" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Right Column: Members and Pending Invites */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Active Collaborators list */}
                    <Card className="border-slate-100/80 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.02)] bg-white overflow-hidden">
                      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                          <Users className="h-4.5 w-4.5 text-[#258ffb]" />
                          Active Workspace Members ({teamMembers.length})
                        </h3>
                        <span className="text-[10px] font-bold text-slate-450 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Collaborators Plan
                        </span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse select-none">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                              <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">EMAIL ADDRESS</th>
                              <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">ACCESS ROLE</th>
                              <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-center">STATUS</th>
                              <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-right">ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamMembers.map((member) => (
                              <tr key={member.email} className="border-b border-slate-100/60 hover:bg-slate-50/10 transition-colors">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8.5 w-8.5 bg-blue-50 border border-blue-100 text-[#258ffb] font-black rounded-full flex items-center justify-center text-xs shrink-0 shadow-sm uppercase">
                                      {member.email.slice(0, 2)}
                                    </div>
                                    <div>
                                      <p className="text-[12.5px] font-bold text-slate-700 leading-none">{member.email}</p>
                                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Invited via direct link</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  {member.email === "meets@example.com" ? (
                                    <span className="text-[10.5px] font-bold text-slate-650 bg-slate-100/80 border border-slate-200/80 px-2 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.01)] uppercase select-none">
                                      {member.role}
                                    </span>
                                  ) : (
                                    <select
                                      value={member.role}
                                      onChange={(e) => handleUpdateMemberRole(member.email, e.target.value)}
                                      className="text-xs font-bold text-slate-500 bg-white hover:text-slate-700 border border-slate-100 hover:border-slate-250 rounded px-1.5 py-0.5 focus:outline-none"
                                    >
                                      <option value="Admin">Admin</option>
                                      <option value="Member">Member</option>
                                      <option value="Manager">Manager</option>
                                      <option value="Viewer">Viewer</option>
                                    </select>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-[0_1px_2px_rgba(0,0,0,0.01)] uppercase select-none">
                                    {member.status}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  {member.email !== "meets@example.com" && (
                                    <button
                                      onClick={() => handleRemoveMember(member.email)}
                                      className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:underline p-1 cursor-pointer focus:outline-none"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>

                    {/* Pending invitations table */}
                    {pendingInvites.length > 0 && (
                      <Card className="border-slate-100/80 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.02)] bg-white overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                            <Clock className="h-4.5 w-4.5 text-amber-500" />
                            Pending Collaborator Invitations ({pendingInvites.length})
                          </h3>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse select-none">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">PENDING EMAIL</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">ASSIGNED ROLE</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">DATE SENT</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-right">ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pendingInvites.map((invite) => (
                                <tr key={invite.email} className="border-b border-slate-100/60 hover:bg-slate-50/5 transition-colors">
                                  <td className="px-5 py-4">
                                    <span className="text-[12.5px] font-bold text-slate-700">{invite.email}</span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                      {invite.role}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className="text-xs text-slate-400 font-semibold">{invite.invitedAt}</span>
                                  </td>
                                  <td className="px-5 py-4 text-right flex justify-end gap-3.5">
                                    <button
                                      onClick={() => handleResendInvite(invite.email)}
                                      className="text-xs font-bold text-[#258ffb] hover:text-[#1d7ee6] hover:underline cursor-pointer focus:outline-none"
                                    >
                                      Resend Link
                                    </button>
                                    <button
                                      onClick={() => handleRevokeInvite(invite.email)}
                                      className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer focus:outline-none"
                                    >
                                      Revoke Invite
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    )}
                  </div>
                  
                </div>
              </div>
            )}

            {activeTab === "integrations" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800">Cloud Integrations</h1>
                  <p className="text-sm text-slate-500 mt-1">Connect your workspace with third-party providers for unified file imports and cloud backup storage.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {integrations.map((item) => (
                    <Card key={item.id} className="border-slate-100 shadow-[0_2px_4px_rgba(0,0,0,0.015)] hover:shadow-md transition-shadow">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 bg-slate-50/80 border border-slate-100 rounded-lg flex items-center justify-center">
                              <item.icon />
                            </div>
                            <div>
                              <h3 className="font-extrabold text-slate-800 text-[15px]">{item.name}</h3>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${item.connected ? "text-emerald-500" : "text-slate-400"}`}>
                                {item.connected ? "Connected" : "Disconnected"}
                              </span>
                            </div>
                          </div>
                          
                          {/* Toggle switch */}
                          <button 
                            onClick={() => toggleIntegration(item.id, item.name)}
                            className={`w-11 h-6 rounded-full transition-colors flex items-center p-0.5 outline-none focus:ring-0 ${
                              item.connected ? "bg-emerald-500" : "bg-slate-200"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                              item.connected ? "translate-x-5" : "translate-x-0"
                            }`} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 leading-normal">{item.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Header and Sub-Tab Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-800">Account Settings</h1>
                    <p className="text-sm text-slate-500 mt-1">Configure your personal profile details, signature presets, and workspace branding themes.</p>
                  </div>
                  
                  {/* Segmented Sub-Tab Switcher */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 select-none">
                    <button
                      onClick={() => setSettingsSubTab("profile")}
                      className={`px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none ${
                        settingsSubTab === "profile"
                          ? "bg-white text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Personal Profile
                    </button>
                    <button
                      onClick={() => setSettingsSubTab("branding")}
                      className={`px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none flex items-center gap-1 ${
                        settingsSubTab === "branding"
                          ? "bg-white text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Palette className="h-3.5 w-3.5" />
                      Custom Branding
                    </button>
                  </div>
                </div>

                {/* Tab content 1: Personal Profile */}
                {settingsSubTab === "profile" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <Card className="border-slate-100 lg:col-span-2">
                      <CardContent className="p-6">
                        <form onSubmit={handleSaveSettings} className="space-y-6">
                          <h3 className="text-sm font-bold text-slate-700 pb-2 border-b border-slate-100">Personal Information</h3>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-400">FULL NAME</label>
                              <input 
                                type="text"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded focus:border-[#258ffb]/50 focus:outline-none"
                                required
                              />
                            </div>
                            
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-400">EMAIL ADDRESS (PRIMARY)</label>
                              <input 
                                type="email"
                                value={profileEmail}
                                disabled
                                className="w-full text-xs font-semibold px-3.5 py-2.5 border border-slate-200 rounded bg-slate-50 text-slate-400 cursor-not-allowed"
                              />
                            </div>
                          </div>

                          <h3 className="text-sm font-bold text-slate-700 pt-4 pb-2 border-b border-slate-100">Signature Config</h3>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-400">DEFAULT SIGNING FONT</label>
                              <select
                                value={signingFont}
                                onChange={(e) => {
                                  setSigningFont(e.target.value);
                                  localStorage.setItem("signing_font", e.target.value);
                                }}
                                className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded bg-white focus:border-[#258ffb]/50 focus:outline-none"
                              >
                                {FONT_OPTIONS.map((f) => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-400">MOCK SIGNATURE PREVIEW</label>
                              <div className="h-14 border border-slate-200 rounded-lg bg-white shadow-inner flex items-center justify-center px-4 transition-all">
                                <span
                                  style={{ fontFamily: `'${signingFont}', cursive`, fontSize: "1.5rem", lineHeight: 1 }}
                                  className="text-slate-800 tracking-wide select-none"
                                >
                                  {profileName || "Signer Name"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 flex items-center justify-end">
                            <Button 
                              type="submit" 
                              disabled={isSavingSettings}
                              className="bg-[#258ffb] hover:bg-[#1a7ae0] rounded-full h-[38px] px-6 font-bold text-xs shadow-md shadow-[#258ffb]/20 flex items-center gap-2"
                            >
                              {isSavingSettings ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Saving Details...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4" />
                                  Save Changes
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Environment info info panel */}
                    <Card className="border-slate-100 lg:col-span-1">
                      <CardContent className="p-5 space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                          <Laptop className="h-4 w-4 text-[#258ffb]" />
                          Environment Info
                        </h3>
                        <div className="space-y-2 text-xs font-semibold text-slate-400">
                          <div className="flex items-center justify-between border-b border-slate-100/60 pb-2">
                            <span>Developer Node</span>
                            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px]">Sandbox</span>
                          </div>
                          <div className="flex items-center justify-between border-b border-slate-100/60 pb-2">
                            <span>Secure Keys</span>
                            <span className="text-slate-600 font-mono text-[10px]">GOCSPX-...e75Ky3</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>OAuth Login</span>
                            <span className="text-emerald-500 flex items-center gap-1 text-[10px]">
                              <Check className="h-3 w-3" />
                              Active
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Tab content 2: Custom Branding Workspace */}
                {settingsSubTab === "branding" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    
                    {/* Left: Upload Logo & Pick Colors */}
                    <div className="lg:col-span-2 space-y-6">
                      <form onSubmit={handleSaveBranding} className="space-y-6">
                        
                        {/* Logo Upload Card */}
                        <Card className="border-slate-100/80 bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                              <Image className="h-4 w-4 text-[#258ffb]" />
                              Corporate Brand Logo
                            </h3>
                            <p className="text-xs text-slate-400">Upload your organization logo to replace Techladder / Signaturely default headers in all signer flows.</p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-6 pt-2 select-none">
                            {brandLogoUrl ? (
                              <div className="relative h-20 w-32 rounded-2xl border border-slate-150 p-2 flex items-center justify-center bg-white shadow-sm shrink-0 group">
                                <img src={brandLogoUrl} alt="Workspace Logo" className="max-h-full max-w-full object-contain" />
                                <button
                                  type="button"
                                  onClick={() => setBrandLogoUrl(null)}
                                  className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 shadow transition-all focus:outline-none"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="h-20 w-32 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-3 text-center shrink-0 bg-slate-50/50">
                                <FileText className="h-5 w-5 text-slate-350" />
                                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">No logo</span>
                              </div>
                            )}

                            <div className="flex-1 w-full space-y-3">
                              <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-20 border border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/20 hover:bg-slate-50/50 transition-colors">
                                  <div className="flex flex-col items-center justify-center py-4 text-center">
                                    <Plus className="h-4.5 w-4.5 text-slate-450 mb-1" />
                                    <p className="text-[11px] font-bold text-slate-500 leading-normal">
                                      Click to upload brand logo
                                    </p>
                                    <p className="text-[9px] text-slate-400 mt-0.5 leading-none">
                                      Supports SVG, PNG, JPG (Max 2MB)
                                    </p>
                                  </div>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        if (file.size > 2 * 1024 * 1024) {
                                          toast({
                                            title: "File too large",
                                            description: "Brand logo must be less than 2MB.",
                                            variant: "destructive"
                                          });
                                          return;
                                        }
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                          setBrandLogoUrl(reader.result as string);
                                          toast({
                                            title: "Logo Loaded",
                                            description: "Review your custom branding in the signature simulation panel!"
                                          });
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        </Card>

                        {/* Brand Theme Colors Picker Card */}
                        <Card className="border-slate-100/80 bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-4">
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                              <Palette className="h-4 w-4 text-[#258ffb]" />
                              Corporate Theme Colors
                            </h3>
                            <p className="text-xs text-slate-400">Personalize document sign buttons, border outlines, and email banners to align with your corporate style guide.</p>
                          </div>

                          {/* Pre-curated Brand Palettes presets */}
                          <div className="pt-2 space-y-2">
                            <Label className="text-[10px] font-extrabold text-slate-400 tracking-wider">PRE-CURATED BRAND PALETTES</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              {[
                                { name: "Signaturely Blue", p: "#258ffb", s: "#0f172a", a: "#10b981" },
                                { name: "Workspace Indigo", p: "#635bff", s: "#1e293b", a: "#f43f5e" },
                                { name: "Forest Classic", p: "#059669", s: "#064e3b", a: "#f59e0b" },
                                { name: "Premium Onyx", p: "#334155", s: "#0f172a", a: "#06b6d4" },
                              ].map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => {
                                    setPrimaryColor(preset.p);
                                    setSecondaryColor(preset.s);
                                    setAccentColor(preset.a);
                                    toast({
                                      title: "Preset Applied",
                                      description: `Selected "${preset.name}" corporate theme.`
                                    });
                                  }}
                                  className="flex items-center gap-2 border border-slate-100 hover:border-slate-200 hover:bg-slate-50 p-2 rounded-xl transition-all text-left text-[11px] font-bold text-slate-650 focus:outline-none"
                                >
                                  <span className="flex gap-0.5 shrink-0">
                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.p }} />
                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.s }} />
                                  </span>
                                  <span className="truncate leading-none">{preset.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Individual Color Selectors */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-50 select-none">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                                PRIMARY BRAND COLOR
                              </Label>
                              <div className="flex gap-2 items-center">
                                <input 
                                  type="color" 
                                  value={primaryColor} 
                                  onChange={(e) => setPrimaryColor(e.target.value)}
                                  className="h-8.5 w-10 border border-slate-200 rounded-lg p-0.5 cursor-pointer"
                                />
                                <Input 
                                  value={primaryColor.toUpperCase()} 
                                  onChange={(e) => setPrimaryColor(e.target.value)}
                                  className="h-9 text-xs font-bold font-mono border-slate-200"
                                />
                              </div>
                              <p className="text-[9px] text-slate-400">Used for prime call-to-actions, primary buttons, and signature badges.</p>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: secondaryColor }} />
                                SECONDARY TEXT COLOR
                              </Label>
                              <div className="flex gap-2 items-center">
                                <input 
                                  type="color" 
                                  value={secondaryColor} 
                                  onChange={(e) => setSecondaryColor(e.target.value)}
                                  className="h-8.5 w-10 border border-slate-200 rounded-lg p-0.5 cursor-pointer"
                                />
                                <Input 
                                  value={secondaryColor.toUpperCase()} 
                                  onChange={(e) => setSecondaryColor(e.target.value)}
                                  className="h-9 text-xs font-bold font-mono border-slate-200"
                                />
                              </div>
                              <p className="text-[9px] text-slate-400">Applied to visual card borders, workspace headers, and menu text styles.</p>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
                                ACCENT HIGHLIGHT
                              </Label>
                              <div className="flex gap-2 items-center">
                                <input 
                                  type="color" 
                                  value={accentColor} 
                                  onChange={(e) => setAccentColor(e.target.value)}
                                  className="h-8.5 w-10 border border-slate-200 rounded-lg p-0.5 cursor-pointer"
                                />
                                <Input 
                                  value={accentColor.toUpperCase()} 
                                  onChange={(e) => setAccentColor(e.target.value)}
                                  className="h-9 text-xs font-bold font-mono border-slate-200"
                                />
                              </div>
                              <p className="text-[9px] text-slate-400">Controls highlight focus states, active switches, and verified signature flags.</p>
                            </div>
                          </div>
                        </Card>

                        {/* Branding Controls */}
                        <div className="flex justify-between items-center gap-4 select-none">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={handleResetBranding}
                            className="text-xs font-bold hover:bg-slate-100 h-9 px-4.5 rounded-full text-slate-500 flex items-center gap-1"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Reset Defaults
                          </Button>

                          <Button
                            type="submit"
                            disabled={isSavingBranding}
                            className="bg-[#258ffb] hover:bg-[#1a7ae0] font-bold text-xs h-9.5 px-6 rounded-full shadow-md shadow-[#258ffb]/20 flex items-center gap-2"
                          >
                            {isSavingBranding ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Saving Branding...
                              </>
                            ) : (
                              <>
                                <Save className="h-3.5 w-3.5" />
                                Save Branding Layout
                              </>
                            )}
                          </Button>
                        </div>

                      </form>
                    </div>

                    {/* Right: Live Document Signing Preview Box */}
                    <div className="lg:col-span-1 h-full select-none">
                      <div className="sticky top-6 space-y-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            Live Signing Preview
                          </Label>
                          <p className="text-[10px] text-slate-400 leading-normal">This is what signatories will inspect when signing your contracts.</p>
                        </div>

                        {/* Interactive Simulated Sign Screen */}
                        <Card className="border-slate-150 rounded-2xl shadow-lg bg-white overflow-hidden max-w-[340px] mx-auto border-[1.5px] transition-all">
                          {/* Corporate Email Banner Header */}
                          <div 
                            className="p-4 flex items-center justify-between border-b"
                            style={{ 
                              borderBottomColor: `${primaryColor}20`,
                              backgroundColor: `${primaryColor}06`
                            }}
                          >
                            {brandLogoUrl ? (
                              <img src={brandLogoUrl} alt="Workspace Logo" className="h-8 max-w-[90px] object-contain" />
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-800">
                                <FileSignature className="h-4.5 w-4.5 text-[#258ffb]" style={{ color: primaryColor }} />
                                <span className="text-[10px] font-black uppercase tracking-wider">EZSignNow</span>
                              </div>
                            )}
                            <span 
                              className="text-[8px] font-bold px-2 py-0.5 rounded-full border"
                              style={{ 
                                color: accentColor, 
                                backgroundColor: `${accentColor}10`,
                                borderColor: `${accentColor}25`
                              }}
                            >
                              Secured
                            </span>
                          </div>

                          {/* Email Body Content Simulation */}
                          <div className="p-5 space-y-4 text-left">
                            <div className="space-y-2">
                              <h4 className="text-[13px] font-extrabold text-slate-800 leading-snug">
                                {workspaceName} invites you to sign:
                              </h4>
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                                <div className="h-8 w-8 bg-blue-50 border border-blue-100 text-[#258ffb] rounded-lg flex items-center justify-center shrink-0">
                                  <FileText className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-slate-700 truncate leading-none">mutual_nda_final.pdf</p>
                                  <p className="text-[9px] text-slate-400 font-semibold mt-1">142 KB • 1 template field</p>
                                </div>
                              </div>
                            </div>

                            <p className="text-[10.5px] text-slate-500 leading-relaxed font-semibold">
                              Hi client,
                              <br />
                              Please review, place your digital signature, and complete the engagement contract using Techladder security frameworks.
                            </p>

                            {/* CTA Action Button dynamically colored */}
                            <button
                              type="button"
                              onClick={() => toast({ title: "Custom Branding Preview", description: "This button will inherit your exact brand colors!" })}
                              className="w-full text-white font-bold text-xs h-9.5 rounded-xl shadow transition-all duration-300 hover:brightness-105 active:scale-[0.99] flex items-center justify-center"
                              style={{ backgroundColor: primaryColor }}
                            >
                              Review & Sign Document
                            </button>
                          </div>

                          {/* Footer details */}
                          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 text-center text-[9px] font-semibold text-slate-400">
                            Powered by Antigravity Compliance Systems
                          </div>
                        </Card>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

