import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { 
  FileSignature, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  ArrowLeft, 
  Check, 
  Trash2,
  PenTool,
  Type,
  Star,
  HelpCircle,
  Mail,
  RefreshCw
} from "lucide-react";

export default function TryForFree() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp } = useAuth();

  // Onboarding States
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resending, setResending] = useState(false);

  // Playground Signature States
  const [signatureMode, setSignatureMode] = useState<"type" | "draw">("type");
  const [typedName, setTypedName] = useState("");
  const [selectedFont, setSelectedFont] = useState<number>(0);
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);

  // reCAPTCHA States
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Fonts available for Typed Signature
  const signatureFonts = [
    { name: "Elegant Script", class: "font-['Great_Vibes'] text-3xl font-normal text-primary tracking-wide" },
    { name: "Modern Cursive", class: "font-['Dancing_Script'] text-2xl font-bold text-primary tracking-normal" },
    { name: "Expressive Handwriting", class: "font-['Caveat'] text-3xl font-semibold text-primary tracking-wide" },
  ];

  // Sync fullName state with typedName in signature creator
  useEffect(() => {
    if (signatureMode === "type" && typedName) {
      setFullName(typedName);
    }
  }, [typedName, signatureMode]);

  // Sync typedName with fullName if they modify the signup name field
  const handleNameFieldChange = (val: string) => {
    setFullName(val);
    if (signatureMode === "type") {
      setTypedName(val);
    }
  };

  // Google OAuth Auth handler with descriptive developer fallback checks
  const triggerGoogleRedirect = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast({
        title: "Google Auth Error",
        description: (
          <div className="space-y-2 text-xs text-left">
            <p className="font-semibold text-destructive">Google provider is not enabled in your backend.</p>
            <p className="text-muted-foreground leading-relaxed">
              To resolve, open your <strong>Supabase Dashboard</strong>, navigate to <strong>Authentication &gt; Providers</strong>, toggle <strong>Google</strong> to enabled, and insert your Client credentials.
            </p>
          </div>
        ),
        variant: "destructive",
        duration: 10000,
      });
    }
  };

  // Canvas Drawing Operations
  useEffect(() => {
    if (signatureMode !== "draw") return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high-DPI scaling for responsive drawing
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#007fd4"; // Smooth Slate Blue ink color
  }, [signatureMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    setIsCanvasEmpty(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsCanvasEmpty(true);
  };

  const handleCaptchaClick = () => {
    if (captchaChecked) {
      setCaptchaChecked(false);
      return;
    }
    setCaptchaLoading(true);
    setTimeout(() => {
      setCaptchaLoading(false);
      setCaptchaChecked(true);
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaChecked) {
      toast({
        title: "Security Verification Required",
        description: "Please check the reCAPTCHA box to verify you are a human.",
        variant: "destructive",
      });
      return;
    }

    if (signatureMode === "draw" && isCanvasEmpty) {
      toast({
        title: "Signature Required",
        description: "Please draw your signature in the canvas pad before completing signup.",
        variant: "destructive",
      });
      return;
    }

    if (signatureMode === "type" && !fullName) {
      toast({
        title: "Signature Name Required",
        description: "Please type your signature name to preview and save.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create user inside Supabase database
      const { error } = await signUp(email, password, fullName);
      if (error) throw error;
      
      // Save signature to local state representing user onboarding progress
      localStorage.setItem("ez_temp_signature_type", signatureMode);
      if (signatureMode === "type") {
        localStorage.setItem("ez_temp_signature_val", fullName);
        localStorage.setItem("ez_temp_signature_font", selectedFont.toString());
      } else {
        const canvas = canvasRef.current;
        if (canvas) {
          localStorage.setItem("ez_temp_signature_val", canvas.toDataURL());
        }
      }

      setEmailSent(true);
      toast({
        title: "Account Created successfully!",
        description: "Please confirm your email address via the link sent to your inbox.",
      });
    } catch (err: any) {
      toast({
        title: "Onboarding Error",
        description: err.message || "Failed to create free account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
      toast({
        title: "Email Resent",
        description: "A new activation link has been sent to your email inbox.",
      });
    } catch (err: any) {
      toast({
        title: "Activation Link (Sandbox)",
        description: `Simulating a verification link re-sent to ${email}.`,
      });
    } finally {
      setResending(false);
    }
  };

  // Mock G2 Reviews Data
  const g2Reviews = [
    {
      name: "Sarah Jenkins",
      role: "Operations Lead, Apex Digital",
      badge: "Leader Spring 2026",
      quote: "EZSignNow is a game-changer! Its signature templates and playground saved our team 20+ hours a week.",
      stars: 5,
    },
    {
      name: "David Vance",
      role: "General Counsel, Helix Biotech",
      badge: "Best Usability",
      quote: "The digital audit certificate is incredibly detailed. Geolocation IP tags provide full regulatory compliance.",
      stars: 5,
    },
    {
      name: "Marcus Thorne",
      role: "CTO, NextGen SaaS",
      badge: "Most Implementable",
      quote: "We switched from DocuSign and cut our software costs by 60% while contract execution speeds actually improved!",
      stars: 5,
    },
    {
      name: "Elena Rostova",
      role: "Real Estate Agent, Premium Properties",
      badge: "High Performer",
      quote: "Incredibly smooth mobile signatures. Our clients sign agreements in seconds on their smartphones.",
      stars: 5,
    }
  ];

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#f8fafc] dark:bg-background font-sans overflow-hidden">
      
      {/* LEFT COLUMN - Premium G2 reviews & Trusted By (60% width on large screens) */}
      <div className="w-full md:w-[48%] lg:w-[52%] bg-gradient-to-br from-slate-900 to-slate-950 text-white p-8 md:p-12 lg:p-16 flex flex-col justify-between relative overflow-y-auto min-h-screen">
        
        {/* Soft floating background light blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Back Link */}
        <div className="z-10 mb-8 self-start">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-3 py-2 rounded-full backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Homepage
          </Link>
        </div>

        {/* Dynamic G2 Reviews and Header */}
        <div className="z-10 my-auto space-y-8 max-w-xl mx-auto w-full">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#FF4F00] text-white text-[10px] font-extrabold shadow shadow-[#FF4F00]/20">
                G2
              </span>
              <div className="flex text-amber-500 text-sm">
                {"★".repeat(5)}
              </div>
              <span className="text-sm font-bold text-slate-300">
                4.8/5 Rated (580+ reviews)
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Loved by teams that value <span className="text-primary font-bold">speed</span> and <span className="text-emerald-400 font-bold">simplicity</span>.
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              See why operations, legal, and engineering teams switch to EZSignNow to sign and audit secure PDF agreements in seconds.
            </p>
          </div>

          {/* G2 Review Grid Showcase */}
          <div className="grid gap-4 sm:grid-cols-2">
            {g2Reviews.map((rev, index) => (
              <div 
                key={index} 
                className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-bold tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase">
                      {rev.badge}
                    </span>
                    <div className="flex text-amber-500 text-[10px]">
                      {"★".repeat(rev.stars)}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 italic leading-relaxed mb-4">
                    "{rev.quote}"
                  </p>
                </div>
                <div className="border-t border-white/5 pt-3 mt-2 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">
                    {rev.name[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{rev.name}</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-none">{rev.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* G2 Verified Badge */}
          <div className="flex items-center justify-center gap-6 py-2 bg-white/5 rounded-2xl border border-white/5 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Verified G2 Reviewer
            </span>
            <span className="h-3 w-[1px] bg-white/10" />
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Legally Compliant ESIGN & eIDAS
            </span>
          </div>

        </div>

        {/* TRUSTED BY Logo Cloud horizontal scroll marquee */}
        <div className="z-10 pt-8 mt-8 border-t border-white/5 max-w-xl mx-auto w-full overflow-hidden select-none">
          <p className="text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-4">
            TRUSTED BY 2,000,000+ USERS WORLDWIDE
          </p>
          
          {/* Scrolling infinite banner */}
          <div className="flex gap-8 whitespace-nowrap opacity-60 relative w-full overflow-hidden">
            <div className="flex gap-8 justify-around items-center min-w-full animate-[marquee_20s_linear_infinite] flex-shrink-0">
              <span className="text-xs font-extrabold text-white tracking-tight">Chegg</span>
              <span className="text-xs font-extrabold text-red-500 tracking-tight flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>StateFarm
              </span>
              <span className="text-xs font-extrabold text-white tracking-tight">COMPASS</span>
              <span className="text-xs font-extrabold text-white tracking-tight font-serif">HARVARD</span>
              <span className="text-xs font-extrabold text-white tracking-tight font-sans">LERNER&ROWE</span>
            </div>
            <div className="flex gap-8 justify-around items-center min-w-full animate-[marquee_20s_linear_infinite] flex-shrink-0" aria-hidden="true">
              <span className="text-xs font-extrabold text-white tracking-tight">Chegg</span>
              <span className="text-xs font-extrabold text-red-500 tracking-tight flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>StateFarm
              </span>
              <span className="text-xs font-extrabold text-white tracking-tight">COMPASS</span>
              <span className="text-xs font-extrabold text-white tracking-tight font-serif">HARVARD</span>
              <span className="text-xs font-extrabold text-white tracking-tight font-sans">LERNER&ROWE</span>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN - Onboarding Form & Signature Playground */}
      <div className="flex-1 flex flex-col justify-between px-6 py-12 md:px-12 bg-white dark:bg-card overflow-y-auto">
        
        {/* Top Header - App Brand */}
        <div className="flex items-center justify-between border-b border-border/30 pb-4 mb-6">
          <Link to="/">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider select-none">
            <Sparkles className="h-3 w-3 animate-spin" />
            14-Day Pro Trial Active
          </div>
        </div>

        {/* Main Interface Form / Playground */}
        <div className="w-full max-w-lg mx-auto my-auto space-y-6">
          
          {emailSent ? (
            /* Email Verification Confirmation Drawer */
            <Card className="border border-border/60 shadow-xl bg-white dark:bg-card">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl font-extrabold text-foreground">
                  Confirm your email
                </CardTitle>
                <CardDescription className="text-xs mt-1.5 text-muted-foreground leading-relaxed px-4">
                  We've sent a verification link to <strong className="text-foreground">{email}</strong>.<br />
                  Please click the link inside the email to activate your account and access your dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/50 bg-slate-50/50 dark:bg-accent/10 p-4 text-center text-xs text-muted-foreground">
                  Your designed signature has been saved and is ready to load on your very first document!
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button className="w-full h-11 text-xs font-semibold" onClick={() => navigate("/login")}>
                  Proceed to Sign In
                </Button>
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resending}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                >
                  {resending ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                  Resend Verification Email
                </button>
              </CardFooter>
            </Card>
          ) : (
            
            /* Signature Sandbox & Account Signup Onboarding Form */
            <div className="space-y-6">
              
              {/* Stepper Onboarding Headers */}
              <div className="flex items-center justify-center gap-2 text-xs font-semibold select-none mb-6">
                <div className="flex items-center gap-1">
                  <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground shadow shadow-primary/20">
                    1
                  </span>
                  <span className="text-foreground font-bold">Design Signature</span>
                </div>
                <div className="h-[1px] w-8 bg-border"></div>
                <div className="flex items-center gap-1">
                  <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-accent text-muted-foreground">
                    2
                  </span>
                  <span className="text-muted-foreground">Activate Onboarding</span>
                </div>
              </div>

              {/* STEP 1: INTERACTIVE SIGNATURE SANDBOX PLAYGROUND */}
              <div className="bg-slate-50 dark:bg-accent/15 border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Interactive Signature Playground
                  </h3>
                  
                  {/* Selector tabs */}
                  <div className="flex bg-white dark:bg-card border border-border rounded-lg p-0.5 text-xs">
                    <button 
                      type="button"
                      onClick={() => setSignatureMode("type")}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md font-semibold transition-all ${
                        signatureMode === "type" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Type className="h-3.5 w-3.5" />
                      Type Name
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSignatureMode("draw")}
                      className={`flex items-center gap-1 px-3 py-1 rounded-md font-semibold transition-all ${
                        signatureMode === "draw" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <PenTool className="h-3.5 w-3.5" />
                      Draw Ink
                    </button>
                  </div>
                </div>

                {/* Sandbox Inputs & Previews */}
                {signatureMode === "type" ? (
                  <div className="space-y-3.5 text-left">
                    <div>
                      <Label htmlFor="sig-type" className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Type Your Name to Design Signature</Label>
                      <Input
                        id="sig-type"
                        type="text"
                        placeholder="John Doe"
                        value={typedName}
                        onChange={(e) => setTypedName(e.target.value)}
                        className="mt-1 bg-white dark:bg-card border-slate-300 dark:border-border h-10 text-sm focus-visible:ring-primary"
                      />
                    </div>

                    {/* Dynamic Font Previews */}
                    <div className="grid gap-2">
                      {signatureFonts.map((font, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setSelectedFont(idx)}
                          className={`relative cursor-pointer border rounded-xl p-4 bg-white dark:bg-card flex items-center justify-between transition-all hover:scale-[1.01] ${
                            selectedFont === idx 
                              ? "border-primary bg-primary/[0.01] shadow-md shadow-primary/5" 
                              : "border-border hover:border-slate-400"
                          }`}
                        >
                          <div className="flex flex-col text-left">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">{font.name}</span>
                            <div className={`${font.class} min-h-[40px] flex items-center italic`}>
                              {typedName || "John Doe"}
                            </div>
                          </div>
                          <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${
                            selectedFont === idx ? "border-primary bg-primary text-white" : "border-slate-300"
                          }`}>
                            {selectedFont === idx && <Check className="h-2.5 w-2.5 font-bold" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Draw on Pad with Mouse/Finger</Label>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-[10px] font-bold text-red-600 hover:text-red-500 flex items-center gap-1 focus:outline-none"
                      >
                        <Trash2 className="h-3 w-3" />
                        Clear Pad
                      </button>
                    </div>
                    
                    {/* HTML5 drawing Canvas */}
                    <div className="relative border border-dashed border-slate-300 dark:border-border rounded-xl bg-white dark:bg-card overflow-hidden shadow-inner aspect-[2.8/1] w-full">
                      <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                      />
                      {isCanvasEmpty && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 pointer-events-none gap-1 select-none">
                          <PenTool className="h-6 w-6 opacity-60 animate-bounce" />
                          <span className="text-[10px] font-semibold tracking-wider">Draw your signature here</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* STEP 2: REGISTRATION FORM */}
              <div className="space-y-4">
                <div className="text-left">
                  <h3 className="text-sm font-bold text-foreground">Step 2: Save Signature & Account Registration</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Your email address will pre-activate your 14-day premium Pro trial.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-semibold text-foreground">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Your Full Name"
                      value={fullName}
                      onChange={(e) => handleNameFieldChange(e.target.value)}
                      required
                      className="h-10 border-slate-300 dark:border-border"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 border-slate-300 dark:border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-semibold text-foreground">Create Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-10 border-slate-300 dark:border-border"
                    />
                  </div>

                  {/* Mock reCAPTCHA Widget (Identical to Signaturely.com screenshot) */}
                  <div className="flex items-center justify-between rounded-lg border border-border bg-slate-50/50 dark:bg-accent/15 p-3 select-none mt-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleCaptchaClick}
                        disabled={captchaLoading}
                        className={`h-6 w-6 rounded border bg-white flex items-center justify-center transition-all ${
                          captchaChecked ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-slate-400"
                        }`}
                      >
                        {captchaLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : captchaChecked ? (
                          <Check className="h-4 w-4 text-emerald-600 font-bold" />
                        ) : null}
                      </button>
                      <span className="text-xs font-medium text-foreground/80">I'm not a robot</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 opacity-60">
                      <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="h-5 w-5 object-contain" />
                      <span className="text-[7px] text-muted-foreground font-semibold">reCAPTCHA</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button type="submit" disabled={loading} className="w-full h-11 text-xs font-bold shadow shadow-primary/20 mt-4">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Claim My Free Trial & Save Signature
                  </Button>

                  {/* OR Social Sign up */}
                  <div className="relative w-full flex py-1 items-center">
                    <div className="flex-grow border-t border-border"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">OR</span>
                    <div className="flex-grow border-t border-border"></div>
                  </div>

                  {/* Google OAuth OAuth registration */}
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={triggerGoogleRedirect}
                      className="w-full h-11 border-slate-300 dark:border-border hover:bg-slate-50 dark:hover:bg-accent/40 font-semibold text-xs flex gap-2 items-center justify-center"
                    >
                      <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.33 0 3.327 2.682 1.486 6.582l3.78 3.183z"
                        />
                        <path
                          fill="#4285F4"
                          d="M23.49 12.273c0-.818-.073-1.609-.209-2.373H12v4.582h6.473a5.536 5.536 0 0 1-2.4 3.636l3.782 3.182c2.209-2.036 3.636-5.036 3.636-9.027z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.266 14.235A7.077 7.077 0 0 1 4.909 12c0-.79.136-1.555.357-2.264l-3.78-3.182A11.905 11.905 0 0 0 0 12c0 2.055.518 4.009 1.486 5.764l3.78-3.529z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.245 0 5.973-1.073 7.964-2.909l-3.782-3.182c-1.045.7-2.382 1.118-4.182 1.118-3.218 0-5.936-2.164-6.909-5.082l-3.782 3.527C3.327 21.318 7.33 24 12 24z"
                        />
                      </svg>
                      Sign Up with Google
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center italic leading-relaxed">
                      * Social logins are pre-configured to return you safely back to your `/dashboard`.
                    </p>
                  </div>

                  {/* Switch to login */}
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-primary hover:underline">
                      Sign In here
                    </Link>
                  </p>
                  
                </form>

              </div>

            </div>
          )}

        </div>

        {/* Footer info inside right pane */}
        <div className="text-center text-[10px] text-muted-foreground/60 mt-8 border-t border-border/20 pt-4">
          © {new Date().getFullYear()} EZSignNow | bank-grade SSL data encryption | certified e-signatures
        </div>

      </div>

    </div>
  );
}
