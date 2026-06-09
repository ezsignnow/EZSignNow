import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Briefcase, Save, Palette, FileSignature, LayoutTemplate, 
  ChevronDown, LogOut, Headset, CreditCard, Star, User, PenTool, Image as ImageIcon,
  RotateCcw, MousePointerClick, RefreshCw, X, Link as LinkIcon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAbsoluteUrl } from "@/utils/url";
import DashboardSidebar from "@/components/layout/DashboardSidebar";

export default function Company() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Workspace Profile States
  const [workspaceName, setWorkspaceName] = useState("Techladder Antigravity Workspace");
  const [workspaceSlug, setWorkspaceSlug] = useState("techladder-antigravity");
  
  // Custom Branding States
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandLogoUrlInput, setBrandLogoUrlInput] = useState("");
  const [companyName, setCompanyName] = useState("EZSignNow");
  const [tagline, setTagline] = useState("Secure Document Signing");
  const [emailHeaderText, setEmailHeaderText] = useState("You have been invited to sign a document.");
  const [brandFont, setBrandFont] = useState("Inter");
  const [primaryColor, setPrimaryColor] = useState("#258ffb");
  const [secondaryColor, setSecondaryColor] = useState("#0f172a");
  const [accentColor, setAccentColor] = useState("#10b981");
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Load existing branding on mount
  useEffect(() => {
    const savedBranding = localStorage.getItem("custom_branding");
    if (savedBranding) {
      try {
        const parsed = JSON.parse(savedBranding);
        if (parsed.logoUrl) setBrandLogoUrl(parsed.logoUrl);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.tagline) setTagline(parsed.tagline);
        if (parsed.emailHeaderText) setEmailHeaderText(parsed.emailHeaderText);
        if (parsed.brandFont) setBrandFont(parsed.brandFont);
        if (parsed.primaryColor) setPrimaryColor(parsed.primaryColor);
        if (parsed.secondaryColor) setSecondaryColor(parsed.secondaryColor);
        if (parsed.accentColor) setAccentColor(parsed.accentColor);
      } catch (e) {
        console.error("Failed to parse saved branding", e);
      }
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  const handleSaveWorkspaceProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim() || !workspaceSlug.trim()) {
      toast({
        title: "Validation Error",
        description: "Workspace name and URL slug are required.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Workspace Saved",
      description: "Workspace profile updated successfully. (Sandbox Mode)"
    });
  };

  const applyBrandingCssVars = (p: string, s: string, a: string) => {
    document.documentElement.style.setProperty("--brand-primary", p);
    document.documentElement.style.setProperty("--brand-secondary", s);
    document.documentElement.style.setProperty("--brand-accent", a);
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    
    setTimeout(() => {
      const payload = {
        logoUrl: brandLogoUrl,
        primaryColor,
        secondaryColor,
        accentColor,
        companyName,
        tagline,
        emailHeaderText,
        brandFont,
      };
      
      localStorage.setItem("custom_branding", JSON.stringify(payload));
      applyBrandingCssVars(primaryColor, secondaryColor, accentColor);
      setIsSavingBranding(false);
      
      window.dispatchEvent(new Event("branding_updated"));
      
      toast({
        title: "✅ Workspace Branding Saved",
        description: "Your brand colors, logo and copy have been applied across all signing flows!"
      });
    }, 900);
  };

  const handleResetBranding = () => {
    localStorage.removeItem("custom_branding");
    setBrandLogoUrl(null);
    setBrandLogoUrlInput("");
    setCompanyName("EZSignNow");
    setTagline("Secure Document Signing");
    setEmailHeaderText("You have been invited to sign a document.");
    setBrandFont("Inter");
    setPrimaryColor("#258ffb");
    setSecondaryColor("#0f172a");
    setAccentColor("#10b981");
    applyBrandingCssVars("#258ffb", "#0f172a", "#10b981");
    window.dispatchEvent(new Event("branding_updated"));
    toast({
      title: "Workspace Branding Reset",
      description: "Returned to the classic EZSignNow brand colors and defaults."
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <header className="h-[60px] bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-10 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => navigate("/dashboard")}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#258ffb] to-[#1a7ae0] flex items-center justify-center shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          >
            <PenTool className="text-white h-4.5 w-4.5" />
          </div>
          <span className="font-black text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 hidden sm:inline-block cursor-pointer" onClick={() => navigate("/dashboard")}>
            EZSign<span className="text-[#258ffb]">Now</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-l border-slate-100 pl-4 ml-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-slate-50 py-1.5 px-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#258ffb]/20">
                  <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-black shrink-0 border border-emerald-200">
                    {user?.email ? user.email.slice(0, 2).toUpperCase() : "U"}
                  </div>
                  <span className="text-xs font-bold text-slate-600 hidden md:inline max-w-[120px] truncate">
                    {user?.email ? user.email.split("@")[0] : "User"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover w-52 p-1 border border-slate-100/80 shadow-md select-none">
                <DropdownMenuItem onClick={() => navigate("/company")} className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer">
                  <Briefcase className="mr-3 h-4 w-4 text-slate-400" />
                  Company
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard?tab=settings")} className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5">
                  <User className="mr-3 h-4 w-4 text-slate-400" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  navigate("/dashboard?tab=settings");
                  setTimeout(() => toast({ title: "Edit Signature Active", description: "Select your default cursive script fonts below." }), 300);
                }} className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5">
                  <PenTool className="mr-3 h-4 w-4 text-slate-400" />
                  Edit Signature
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/try-trial")} className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5">
                  <CreditCard className="mr-3 h-4 w-4 text-slate-400" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  navigator.clipboard.writeText(getAbsoluteUrl(`/signup?ref=${user?.email?.split("@")[0] || "ezsignnow"}`));
                  toast({ title: "Share & Earn Copied!", description: "Your unique referral link has been copied to clipboard!" });
                }} className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5">
                  <Star className="mr-3 h-4 w-4 text-slate-400" />
                  Share & Earn
                </DropdownMenuItem>
                <div className="border-t border-slate-100 my-1" />
                <DropdownMenuItem onClick={handleSignOut} className="text-xs font-bold text-destructive hover:text-destructive/95 py-2.5 cursor-pointer">
                  <LogOut className="mr-3 h-4 w-4 text-slate-400" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={() => navigate("/support")} className="h-[34px] flex items-center justify-center gap-1.5 px-3 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-600 font-bold text-[11px] shadow-sm transition-all focus:outline-none ml-1">
              <Headset className="h-4 w-4" />
              <span className="hidden sm:inline uppercase tracking-wider">Support</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />

        <main className="flex-1 overflow-y-auto bg-[#fafafa]">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">Company Settings</h1>
              <p className="text-sm text-slate-500 mt-1">Configure your corporate workspace details and custom branding themes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Left Column: Workspace Profile Details */}
              <div className="lg:col-span-1 space-y-6">
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
              </div>

              {/* Right Column: Custom Branding Workspace */}
              <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleSaveBranding} className="space-y-6">
                  {/* Brand Identity Inputs */}
                  <Card className="border-slate-100/80 bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileSignature className="h-4 w-4 text-[#258ffb]" />
                        Brand Identity
                      </h3>
                      <p className="text-xs text-slate-400">These values appear in signing email headers, document footers, and client-facing signing flows.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company / Brand Name</Label>
                        <Input
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="EZSignNow"
                          className="h-9 text-xs font-semibold border-slate-200 rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brand Tagline</Label>
                        <Input
                          value={tagline}
                          onChange={(e) => setTagline(e.target.value)}
                          placeholder="Secure Document Signing"
                          className="h-9 text-xs font-semibold border-slate-200 rounded-lg"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Header Message</Label>
                        <Input
                          value={emailHeaderText}
                          onChange={(e) => setEmailHeaderText(e.target.value)}
                          placeholder="You have been invited to sign a document."
                          className="h-9 text-xs font-semibold border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Aesthetic Layout Configuration */}
                  <Card className="border-slate-100/80 bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.01)] space-y-5">
                    <div className="space-y-1 border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <LayoutTemplate className="h-4 w-4 text-[#258ffb]" />
                        Visual Aesthetics
                      </h3>
                      <p className="text-xs text-slate-400">Customize the colors and typography to match your corporate brand guidelines.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2">
                      {/* Brand Logo URL */}
                      <div className="space-y-3">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Brand Logo URL</Label>
                        
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                              type="url"
                              placeholder="https://example.com/logo.png"
                              value={brandLogoUrlInput}
                              onChange={(e) => setBrandLogoUrlInput(e.target.value)}
                              className="pl-9 h-9 text-xs font-semibold border-slate-200"
                            />
                          </div>
                          <Button 
                            type="button" 
                            variant="secondary" 
                            className="h-9 text-xs font-bold shrink-0"
                            onClick={() => {
                              if (brandLogoUrlInput.startsWith("http")) {
                                setBrandLogoUrl(brandLogoUrlInput);
                              } else {
                                toast({ title: "Invalid URL", description: "Must be a valid HTTP URL", variant: "destructive" });
                              }
                            }}
                          >
                            Apply
                          </Button>
                        </div>

                        <div className="h-[90px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center p-2 relative overflow-hidden group">
                          {brandLogoUrl ? (
                            <>
                              <img src={brandLogoUrl} alt="Brand Logo" className="max-h-[60px] max-w-full object-contain" />
                              <button 
                                type="button"
                                onClick={() => { setBrandLogoUrl(null); setBrandLogoUrlInput(""); }}
                                className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-slate-400">
                              <ImageIcon className="h-5 w-5 opacity-40" />
                              <span className="text-[10px] font-bold uppercase tracking-wide">Logo Preview</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Brand Colors */}
                      <div className="space-y-4">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Palette Colors</Label>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-semibold text-slate-500">Primary Color</span>
                            <div className="flex items-center gap-2">
                              <div className="relative w-8 h-8 rounded border border-slate-200 overflow-hidden shrink-0 shadow-inner">
                                <input 
                                  type="color" 
                                  value={primaryColor} 
                                  onChange={(e) => setPrimaryColor(e.target.value)}
                                  className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                />
                              </div>
                              <Input 
                                value={primaryColor} 
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                className="h-8 text-xs font-mono uppercase text-slate-600"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-semibold text-slate-500">Secondary Color</span>
                            <div className="flex items-center gap-2">
                              <div className="relative w-8 h-8 rounded border border-slate-200 overflow-hidden shrink-0 shadow-inner">
                                <input 
                                  type="color" 
                                  value={secondaryColor} 
                                  onChange={(e) => setSecondaryColor(e.target.value)}
                                  className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                                />
                              </div>
                              <Input 
                                value={secondaryColor} 
                                onChange={(e) => setSecondaryColor(e.target.value)}
                                className="h-8 text-xs font-mono uppercase text-slate-600"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Presets */}
                        <div className="pt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Curated Presets</span>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { setPrimaryColor("#258ffb"); setSecondaryColor("#0f172a"); setAccentColor("#10b981"); toast({ title: "Palette Applied", description: "Default blue loaded." }); }} className="w-6 h-6 rounded-full bg-[#258ffb] shadow-sm hover:ring-2 hover:ring-offset-1 hover:ring-[#258ffb] transition-all" title="Default Blue" />
                            <button type="button" onClick={() => { setPrimaryColor("#8b5cf6"); setSecondaryColor("#2e1065"); setAccentColor("#f59e0b"); toast({ title: "Palette Applied", description: "Royal purple loaded." }); }} className="w-6 h-6 rounded-full bg-[#8b5cf6] shadow-sm hover:ring-2 hover:ring-offset-1 hover:ring-[#8b5cf6] transition-all" title="Royal Purple" />
                            <button type="button" onClick={() => { setPrimaryColor("#ec4899"); setSecondaryColor("#4c1d95"); setAccentColor("#06b6d4"); toast({ title: "Palette Applied", description: "Vibrant pink loaded." }); }} className="w-6 h-6 rounded-full bg-[#ec4899] shadow-sm hover:ring-2 hover:ring-offset-1 hover:ring-[#ec4899] transition-all" title="Vibrant Pink" />
                            <button type="button" onClick={() => { setPrimaryColor("#14b8a6"); setSecondaryColor("#042f2e"); setAccentColor("#f43f5e"); toast({ title: "Palette Applied", description: "Teal emerald loaded." }); }} className="w-6 h-6 rounded-full bg-[#14b8a6] shadow-sm hover:ring-2 hover:ring-offset-1 hover:ring-[#14b8a6] transition-all" title="Teal Emerald" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="flex items-center justify-between pt-2">
                    <Button 
                      type="button"
                      variant="ghost" 
                      onClick={handleResetBranding}
                      className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold h-10 px-4 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Defaults
                    </Button>
                    
                    <Button 
                      type="submit" 
                      disabled={isSavingBranding}
                      className="bg-[#258ffb] hover:bg-[#1a7ae0] text-white rounded-full h-10 px-8 font-bold text-xs shadow-lg shadow-[#258ffb]/25 flex items-center gap-2 transition-all hover:scale-[1.02]"
                    >
                      {isSavingBranding ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Applying Layout...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Branding Layout
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
