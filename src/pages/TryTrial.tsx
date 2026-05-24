import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { 
  FileSignature, 
  Check, 
  HelpCircle, 
  ChevronDown, 
  LogOut, 
  Loader2, 
  CreditCard,
  Lock,
  ArrowRight,
  Info,
  User,
  Briefcase,
  Star,
  PenTool
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TryTrial() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form states
  const [nameOnCard, setNameOnCard] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [zip, setZip] = useState("");
  const [coupon, setCoupon] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stripeStep, setStripeStep] = useState("");

  // Dynamic Trial Dates
  const todayFormatted = format(new Date(), "MMMM d");
  const reminderDate = format(addDays(new Date(), 4), "MMMM d");
  const billDate = format(addDays(new Date(), 7), "MMMM d");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, "");
    const parts = [];
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.substring(i, i + 4));
    }
    setCardNumber(parts.join(" "));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, "");
    if (clean.length > 2) {
      setExpiry(`${clean.substring(0, 2)} / ${clean.substring(2, 4)}`);
    } else {
      setExpiry(clean);
    }
  };

  const getCardBrandIcon = () => {
    const cardClean = cardNumber.replace(/\D/g, "");
    if (cardClean.startsWith("4")) {
      return <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded italic leading-none font-serif select-none shrink-0 shadow-sm">VISA</span>;
    }
    if (cardClean.startsWith("5")) {
      return <span className="text-[9px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded italic leading-none select-none shrink-0 shadow-sm">MC</span>;
    }
    if (cardClean.startsWith("3")) {
      return <span className="text-[9px] font-black bg-teal-500 text-white px-1.5 py-0.5 rounded italic leading-none select-none shrink-0 shadow-sm">AMEX</span>;
    }
    if (cardClean.startsWith("6")) {
      return <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded italic leading-none select-none shrink-0 shadow-sm">DISC</span>;
    }
    return <CreditCard className="h-4.5 w-4.5 text-slate-400 shrink-0" />;
  };

  const handleAutofill = () => {
    setNameOnCard("John Doe");
    setCardNumber("4242 4242 4242 4242");
    setExpiry("12 / 29");
    setCvv("123");
    setZip("90210");
    toast({
      title: "Test Card Populated",
      description: "Secure Stripe Elements test card (4242) loaded.",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameOnCard || !cardNumber || !expiry || !cvv || !zip) {
      toast({
        title: "Missing Details",
        description: "Please complete all billing fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setStripeStep("Connecting to Stripe API secure servers...");

    setTimeout(() => {
      setStripeStep("Tokenizing card details via Stripe Elements (tok_sandbox)...");
    }, 450);

    setTimeout(() => {
      setStripeStep("Validating Stripe token on server-side webhook...");
    }, 900);

    setTimeout(() => {
      setStripeStep("Registering Stripe Customer & Active Subscription...");
    }, 1350);

    setTimeout(() => {
      setIsSubmitting(false);
      localStorage.setItem("is_premium", "true");
      toast({
        title: "Stripe Subscription Activated!",
        description: "Welcome to ezsignnow Pro. Unlimited signature requests active!",
      });
      navigate("/dashboard");
    }, 1800);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-[#258ffb]" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfcfd] antialiased">
      {/* Header matching Signaturely */}
      <header className="border-b border-slate-100 bg-white px-6 py-4 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.015)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#258ffb]/10 p-1.5 rounded-lg">
            <FileSignature className="h-6 w-6 text-[#258ffb]" />
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">ezsignnow</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-semibold select-none">
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
              0 of 3
            </span>
            <span>signature requests this month</span>
          </div>

          <Button 
            className="rounded-full h-[34px] px-5 border-[#258ffb] text-[#258ffb] bg-white border-[1.5px] hover:bg-[#258ffb]/5 font-bold text-xs shadow-sm transition-all cursor-not-allowed"
            disabled
          >
            Upgrade
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
                  onClick={() => navigate("/dashboard?tab=team")}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer"
                >
                  <Briefcase className="mr-3 h-4 w-4 text-slate-400" />
                  Company
                </DropdownMenuItem>

                {/* 2. Profile item */}
                <DropdownMenuItem 
                  onClick={() => navigate("/dashboard?tab=settings")}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5"
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
                    }, 400);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5"
                >
                  <PenTool className="mr-3 h-4 w-4 text-slate-400" />
                  Edit Signature
                </DropdownMenuItem>

                {/* 4. Billing item */}
                <DropdownMenuItem 
                  onClick={() => toast({ title: "Subscription Screen Active", description: "You are currently on the plan activation form." })}
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

      {/* Main Billing Flow */}
      <main className="flex-1 container mx-auto px-4 py-10 max-w-[1100px] flex flex-col items-center">
        
        {/* Step Timeline Indicator */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#258ffb] text-[10px] font-bold text-white">
              ✓
            </span>
            <span className="text-xs font-bold text-slate-500">Create an account</span>
          </div>
          <div className="h-[2px] w-12 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#258ffb] text-[10px] font-bold text-white">
              2
            </span>
            <span className="text-xs font-bold text-slate-700">Activate your trial</span>
          </div>
        </div>

        {/* Action Title */}
        <div className="text-center max-w-[650px] mb-10 space-y-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-tight">
            Please add your payment details to start the free trial.
          </h1>
          <p className="text-sm font-semibold text-slate-500 flex items-center justify-center gap-1">
            You can cancel anytime before the free trial ends to avoid being billed.
            <Info className="h-3.5 w-3.5 text-slate-400 cursor-pointer" onClick={() => toast({ title: "Billing Details", description: "Your trial lasts exactly 7 days. No charges will be incurred if cancelled." })} />
          </p>
        </div>

        {/* 3-Column Plan Layout */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Column 1: Your Plan Details (4 cols) */}
          <div className="lg:col-span-4 bg-[#f8fafc]/50 rounded-2xl border border-slate-100 p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Your plan</h3>
                <p className="text-lg font-extrabold text-slate-800 mt-1">7-day free trial, then $50/month</p>
              </div>

              <div className="space-y-3.5">
                <p className="text-xs font-extrabold text-slate-700">All Features Included:</p>
                <ul className="space-y-2.5">
                  {[
                    "Unlimited signature requests",
                    "Unlimited reusable templates",
                    "Google Drive integration",
                    "Dropbox integration",
                    "One Drive integration",
                    "Box integration",
                    "Notifications and reminders",
                    "Audit log and history",
                    "Team management",
                    "Custom business branding"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5 text-xs font-semibold text-slate-600">
                      <span className="h-4.5 w-4.5 rounded-full bg-[#258ffb]/10 text-[#258ffb] flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Column 2: Billing Info Form (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.015)] p-6">
            <h3 className="text-sm font-bold text-slate-700 pb-3 border-b border-slate-100 mb-5">Billing Information</h3>
            
            {isSubmitting ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#258ffb]/10 animate-ping" />
                  <div className="relative bg-white border border-slate-100 rounded-full p-4 shadow-md">
                    <Loader2 className="h-8 w-8 animate-spin text-[#258ffb]" />
                  </div>
                </div>
                
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">Processing Subscription</h4>
                  <p className="text-xs font-semibold text-slate-400">Please do not refresh or close this window.</p>
                </div>

                <div className="w-full bg-[#f8fafc] border border-slate-100 rounded-xl p-4 space-y-3.5 text-xs font-semibold text-slate-600">
                  {[
                    "Connecting to Stripe API secure servers...",
                    "Tokenizing card details via Stripe Elements (tok_sandbox)...",
                    "Validating Stripe token on server-side webhook...",
                    "Registering Stripe Customer & Active Subscription..."
                  ].map((stepText, idx) => {
                    const steps = [
                      "Connecting to Stripe API secure servers...",
                      "Tokenizing card details via Stripe Elements (tok_sandbox)...",
                      "Validating Stripe token on server-side webhook...",
                      "Registering Stripe Customer & Active Subscription..."
                    ];
                    const currentStepIdx = steps.indexOf(stripeStep);
                    const isCompleted = idx < currentStepIdx;
                    const isCurrent = idx === currentStepIdx;

                    return (
                      <div key={stepText} className="flex items-center gap-3">
                        {isCompleted ? (
                          <span className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm animate-in fade-in zoom-in duration-200">
                            ✓
                          </span>
                        ) : isCurrent ? (
                          <Loader2 className="h-5 w-5 animate-spin text-[#258ffb] shrink-0" />
                        ) : (
                          <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold shrink-0" />
                        )}
                        <span className={`${isCompleted ? 'text-slate-400 line-through' : isCurrent ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>
                          {stepText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FULL NAME ON CARD</label>
                  <input 
                    type="text" 
                    value={nameOnCard} 
                    onChange={(e) => setNameOnCard(e.target.value)} 
                    placeholder="Your Name" 
                    className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded focus:border-[#258ffb]/50 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CARD DETAILS</label>
                    <button 
                      type="button" 
                      onClick={handleAutofill}
                      className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-sm transition-all"
                    >
                      Autofill test card
                    </button>
                  </div>
                  
                  {/* Stripe Element Unified Input Container */}
                  <div className="flex items-center gap-2 w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded bg-slate-50/50 focus-within:border-[#258ffb] focus-within:ring-1 focus-within:ring-[#258ffb]/20 transition-all select-none">
                    {getCardBrandIcon()}
                    
                    <input 
                      type="text" 
                      value={cardNumber} 
                      onChange={handleCardNumberChange} 
                      placeholder="Card number" 
                      className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 min-w-0 font-mono text-[13px] tracking-wider"
                      maxLength={19}
                      required
                    />
                    
                    <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                    
                    <input 
                      type="text" 
                      value={expiry} 
                      onChange={handleExpiryChange} 
                      placeholder="MM / YY" 
                      className="w-14 text-center bg-transparent border-none focus:outline-none focus:ring-0 shrink-0 min-w-0 font-mono text-[13px]"
                      maxLength={7}
                      required
                    />
                    
                    <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                    
                    <input 
                      type="text" 
                      value={cvv} 
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))} 
                      placeholder="CVC" 
                      className="w-10 text-center bg-transparent border-none focus:outline-none focus:ring-0 shrink-0 min-w-0 font-mono text-[13px]"
                      maxLength={4}
                      required
                    />
                    
                    <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </div>
                  
                  {/* Secure Payments Badge */}
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold select-none pt-1">
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3 text-emerald-500" />
                      Payments are secure and encrypted
                    </span>
                    <span className="flex items-center gap-0.5">
                      Powered by <span className="text-[#635bff] font-black uppercase tracking-wider text-[10px]">stripe</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ZIP CODE</label>
                    <input 
                      type="text" 
                      value={zip} 
                      onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))} 
                      placeholder="00000" 
                      className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded focus:border-[#258ffb]/50 focus:outline-none"
                      maxLength={6}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">COUPON (OPTIONAL)</label>
                    <div className="relative">
                      <select 
                        value={coupon} 
                        onChange={(e) => setCoupon(e.target.value)}
                        className="w-full appearance-none text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded bg-white focus:border-[#258ffb]/50 focus:outline-none cursor-pointer text-slate-400"
                      >
                        <option value="">Apply Promo Code</option>
                        <option value="welcome">WELCOME20 (20% OFF)</option>
                        <option value="annual">FREEONE (1 month free)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#258ffb] hover:bg-[#1a7ae0] h-[44px] rounded-lg text-xs font-bold text-white shadow-md shadow-[#258ffb]/20 mt-6"
                >
                  Start My 7-day Free Trial
                </Button>

                <div className="text-center mt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      localStorage.setItem("is_premium", "false");
                      navigate("/dashboard");
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 underline transition-all"
                  >
                    Continue with the Free Plan for Now
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Column 3: How Free Trial Works (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between">
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-slate-700 pb-3 border-b border-slate-100">How your free trial works</h3>
              
              <div className="relative pl-6 space-y-6 border-l border-slate-100 ml-3">
                {/* Milestone 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4.5 w-4.5 rounded-full bg-[#258ffb] text-white flex items-center justify-center border-4 border-white shadow-sm">
                    <Check className="h-2 w-2" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-[#258ffb] uppercase tracking-wide">Create An Account</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">You successfully created your free account.</p>
                  </div>
                </div>

                {/* Milestone 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4.5 w-4.5 rounded-full bg-[#258ffb]/10 text-[#258ffb] flex items-center justify-center border-4 border-white shadow-sm">
                    <Lock className="h-2 w-2" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Today: Get Instant Access</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">Sign documents by yourself or send for signature. Unlimited # of documents.</p>
                  </div>
                </div>

                {/* Milestone 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4.5 w-4.5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border-4 border-white shadow-sm">
                    <Info className="h-2 w-2" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Day 4: Trial Reminder ({reminderDate})</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">We'll send you an email/notification 3 days before billing. Cancel anytime.</p>
                  </div>
                </div>

                {/* Milestone 4 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0 h-4.5 w-4.5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border-4 border-white shadow-sm">
                    <ArrowRight className="h-2 w-2" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Day 7: Trial Ends ({billDate})</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">You will be billed for the Business monthly plan ($50/month) on {billDate}.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer bar */}
      <footer className="border-t border-slate-100 bg-white py-6 text-center text-[10px] font-bold text-slate-400 tracking-wider shrink-0 select-none">
        <span>© 2026 ezsignnow | Terms and Conditions</span>
      </footer>
    </div>
  );
}
