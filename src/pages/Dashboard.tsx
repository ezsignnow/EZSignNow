import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentList } from "@/components/documents/DocumentList";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
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
  Star
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

  // States for interactive mock sub-views
  const [teamMembers, setTeamMembers] = useState([
    { email: "meets@example.com", role: "Admin", status: "Active" },
    { email: "sarah.jenkins@corp.com", role: "Member", status: "Active" },
    { email: "m.chen@EZSignNow.com", role: "Member", status: "Pending" }
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  
  const [profileName, setProfileName] = useState("Meets User");
  const [profileEmail, setProfileEmail] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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

  // Interaction handlers for mock views
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
    setTeamMembers([...teamMembers, { email: inviteEmail, role: "Member", status: "Pending" }]);
    setInviteEmail("");
    toast({
      title: "Invitation Sent",
      description: `Successfully sent workspace invite to ${inviteEmail}.`
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
                    navigator.clipboard.writeText(`${window.location.origin}/signup?ref=meets`);
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

                {/* Your Documents listing */}
                <div>
                  <h2 className="mb-4 text-sm font-bold text-slate-700">Your Signature Pipeline</h2>
                  <DocumentList />
                </div>
              </div>
            )}

            {activeTab === "templates" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800">Templates Library</h1>
                  <p className="text-sm text-slate-500 mt-1">Save time by keeping reusable document forms with signature fields pre-configured.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[
                    { title: "Standard NDA", desc: "Non-disclosure template with dual signature panels.", duration: "Last updated 3 days ago" },
                    { title: "Independent Contractor", desc: "Consulting agreement with scope milestones & payment fields.", duration: "Last updated 1 week ago" },
                    { title: "W-9 Form (2026)", desc: "Standard tax identification form pre-arranged.", duration: "Created on May 2, 2026" },
                  ].map((item) => (
                    <Card key={item.title} className="border-slate-100 hover:shadow-md transition-all group flex flex-col justify-between">
                      <CardContent className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-2.5">
                          <div className="h-10 w-10 bg-[#258ffb]/5 rounded-lg flex items-center justify-center">
                            <Copy className="h-5 w-5 text-[#258ffb]" />
                          </div>
                          <h3 className="font-bold text-slate-800 text-[15px]">{item.title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                        </div>
                        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400">{item.duration}</span>
                          <button 
                            onClick={() => {
                              toast({ title: "Template Activated", description: `Loading ${item.title} workspace layout.` });
                              setActiveTab("sign");
                            }}
                            className="text-xs font-bold text-[#258ffb] flex items-center gap-1 group-hover:underline"
                          >
                            Use Layout
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Create Template layout */}
                  <Card className="border-dashed border-slate-200 flex flex-col items-center justify-center p-5 text-center min-h-[180px] bg-slate-50/20">
                    <CardContent className="p-0 space-y-3.5">
                      <div className="h-11 w-11 rounded-full border-[1.5px] border-[#258ffb]/30 flex items-center justify-center mx-auto text-[#258ffb]">
                        <Plus className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-slate-700">Create New Template</h4>
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
              <div className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800">Team Workspace</h1>
                  <p className="text-sm text-slate-500 mt-1">Invite team members to upload contracts, edit shared templates, and inspect mutual signature audits.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left column - invite box */}
                  <Card className="border-slate-100 lg:col-span-1">
                    <CardContent className="p-5">
                      <form onSubmit={handleInviteMember} className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            <UserPlus className="h-4 w-4 text-[#258ffb]" />
                            Invite Member
                          </h3>
                          <p className="text-xs text-slate-400 leading-normal">Your team plan currently allows up to 5 collaborators.</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400">EMAIL ADDRESS</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input 
                              type="email"
                              placeholder="colleague@company.com"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              className="w-full text-xs font-semibold pl-9 pr-3 py-2 border border-slate-200 rounded focus:border-[#258ffb]/50 focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <Button type="submit" className="w-full bg-[#258ffb] hover:bg-[#1a7ae0] rounded-[4px] h-[36px] font-bold text-xs shadow-md shadow-[#258ffb]/10">
                          Send Invitation
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Right column - members list */}
                  <Card className="border-slate-100 lg:col-span-2">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                              <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">MEMBER EMAIL</th>
                              <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">WORKSPACE ROLE</th>
                              <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-right">STATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamMembers.map((member) => (
                              <tr key={member.email} className="border-b border-slate-100/60">
                                <td className="px-5 py-4">
                                  <span className="text-[13px] font-bold text-slate-700">{member.email}</span>
                                </td>
                                <td className="px-5 py-4">
                                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{member.role}</span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                    member.status === "Active" 
                                      ? "bg-emerald-500/10 text-emerald-500" 
                                      : "bg-amber-500/10 text-amber-500 animate-pulse"
                                  }`}>
                                    {member.status}
                                  </span>
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
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800">Account Settings</h1>
                  <p className="text-sm text-slate-500 mt-1">Configure your personal profile details, branding themes, and legal signature configurations.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Profile Edit Card */}
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
                            <select className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded bg-white focus:border-[#258ffb]/50 focus:outline-none">
                              <option>Signature Script Regular</option>
                              <option>Dancing Script Bold</option>
                              <option>Great Vibes Cursive</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400">MOCK SIGNATURE PREVIEW</label>
                            <div className="h-10 border border-slate-100 rounded bg-slate-50/50 flex items-center justify-center p-2">
                              <span className="font-serif italic text-lg text-slate-700 tracking-wider">
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

                  {/* Sandbox details card */}
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
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

