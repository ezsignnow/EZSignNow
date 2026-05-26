import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { 
  FileSignature, 
  Users, 
  Shield, 
  Zap, 
  CheckCircle2,
  ArrowRight,
  FileText,
  Clock,
  Globe,
  ChevronDown,
  LayoutTemplate,
  UserCheck,
  Building2,
  HelpCircle,
  Check,
  Play,
  Calendar,
  CheckSquare
} from "lucide-react";
import heroImage from "@/assets/hero-esign.jpg";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [signupEmail, setSignupEmail] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [activeTab, setActiveTab] = useState<number>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const features = [
    {
      icon: FileSignature,
      title: "Legally Binding Signatures",
      description: "Fully compliant with the US ESIGN Act, UETA, and European eIDAS regulations. Every signature is legally binding.",
    },
    {
      icon: Users,
      title: "Multi-Signer Orchestration",
      description: "Define signing orders, map custom signatory fields, and track real-time progression natively from your dashboard.",
    },
    {
      icon: Shield,
      title: "Digital Audit Logs",
      description: "Every contract downloads with a tamper-evident digital certificate capturing IP address, city, country, and precise timestamps.",
    },
    {
      icon: Zap,
      title: "Lightning-Fast Execution",
      description: "Send, track, and complete signature collections in minutes. Zero printing, zero scanning, 100% digital operations.",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Upload & Configure",
      description: "Upload any standard PDF contract directly from your device. Our secure systems prepare the document in milliseconds.",
      illustration: (
        <div className="relative w-full h-[220px] rounded-lg border border-border bg-accent/40 flex items-center justify-center p-6 shadow-inner">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
              <FileText className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">Drag and drop your PDF here</p>
            <p className="text-xs text-muted-foreground">Secure SSL Upload | Max size 15MB</p>
          </div>
        </div>
      )
    },
    {
      step: "02",
      title: "Drag & Place Fields",
      description: "Select custom signature box, date picker, checkbox, or text field placeholders and map them to specific signatories with dynamic tint colors.",
      illustration: (
        <div className="relative w-full h-[220px] rounded-lg border border-border bg-white p-4 shadow-inner overflow-hidden select-none">
          <div className="w-full h-4 bg-muted rounded mb-2 w-2/3"></div>
          <div className="w-full h-4 bg-muted rounded mb-4 w-1/2"></div>
          {/* Mock Drag Field */}
          <div className="absolute top-[80px] left-[60px] flex items-center gap-1 px-2 py-1 rounded border-2 border-primary bg-primary/10 shadow-sm animate-bounce">
            <FileSignature className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-primary">Signature Place</span>
          </div>
          <div className="w-full h-4 bg-muted rounded mb-2 w-3/4"></div>
          <div className="w-full h-4 bg-muted rounded mb-2 w-1/3"></div>
        </div>
      )
    },
    {
      step: "03",
      title: "Sign & Download Certified PDF",
      description: "Signers draw their signature on any device. Once all parties complete, download a digitally certified PDF with legal geolocation metadata.",
      illustration: (
        <div className="relative w-full h-[220px] rounded-lg border border-border bg-emerald-50/50 dark:bg-emerald-950/15 p-4 flex flex-col justify-between shadow-inner">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-semibold">Document Signed & Secured</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">IP: 192.168.1.72 | New York, US</p>
          </div>
          <div className="h-[60px] w-2/3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-card flex items-center justify-center p-2 self-center">
            <span className="text-xs italic text-slate-500 font-serif">Sridharan Udayakumar</span>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-7 self-end">
            Download Certified PDF
          </Button>
        </div>
      )
    }
  ];

  const templates = [
    {
      title: "Non-Disclosure Agreement (NDA)",
      desc: "Protect sensitive intellectual property, client assets, and proprietary information before business discussions.",
      fields: "2 Signatures | 2 Dates",
      time: "2 mins setup"
    },
    {
      title: "Independent Contractor Contract",
      desc: "Perfect for onboarding freelance developers, writers, or consultants. Outlines milestones, hourly rates, and IP rights.",
      fields: "2 Signatures | 2 Text Boxes",
      time: "3 mins setup"
    },
    {
      title: "Sales Contract & Order Form",
      desc: "Close business deals faster. Outlines purchase orders, delivery details, pricing schedules, and terms of service.",
      fields: "1 Signature | 1 Date | 1 Checkbox",
      time: "1 min setup"
    },
    {
      title: "LLC Operating Agreement",
      desc: "Establish standard operational rules, profit-sharing distributions, and management systems for your business.",
      fields: "4 Signatures | 4 Dates | 4 Names",
      time: "5 mins setup"
    }
  ];

  const faqs = [
    {
      q: "Are electronic signatures legally binding on EZSignNow?",
      a: "Yes, absolutely. EZSignNow meets all conditions specified by the US Electronic Signatures in Global and National Commerce (ESIGN) Act, the Uniform Electronic Transactions Act (UETA), and European eIDAS regulations. Every transaction produces a legally binding document."
    },
    {
      q: "How does the digital audit certificate work?",
      a: "When a signatory places a signature, EZSignNow queries global geolocation APIs to capture their public IP address and physical city/country location. This data, alongside precise millisecond timestamps, is embedded directly inside the PDF in an elegant, certified certificate block underneath the signature."
    },
    {
      q: "Is my uploaded document secure?",
      a: "We prioritize bank-grade security. All uploaded PDF contracts are stored securely inside private, isolated Supabase storage buckets. All data transfer is encrypted using advanced SSL/TLS encryption, ensuring that only authenticated document owners and assigned signers can ever view the contents."
    },
    {
      q: "Can I create custom team templates?",
      a: "Yes, with our Business Enterprise plan, you can save custom signature field overlays as team templates. This enables any team member to send standard contracts in one click without manually placing the fields every time."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28 bg-gradient-to-b from-slate-50 to-white dark:from-secondary dark:to-background border-b border-border/50">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            
            {/* Left Column Copywriting */}
            <div className="space-y-6 text-left">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
                Super simple signatures
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Upload a document now — get it legally signed blazing fast.
              </p>
              
              {/* Try for Free Capsule (Identical to Signaturely.com screenshot) */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!signupEmail) return;
                  navigate(`/try-for-free?email=${encodeURIComponent(signupEmail)}`);
                }}
                className="relative flex items-center max-w-md w-full bg-white dark:bg-card border border-slate-300 dark:border-border rounded-full p-1 shadow-md hover:border-slate-400 focus-within:border-primary transition-all"
              >
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="flex-grow bg-transparent px-4 py-2 text-sm text-foreground outline-none border-none placeholder-slate-400"
                />
                <Button 
                  type="submit" 
                  size="lg" 
                  className="rounded-full bg-primary hover:bg-primary/95 text-white font-semibold text-xs px-6 h-10 shadow"
                >
                  Try for Free
                </Button>
              </form>

              {/* G2 Rating Badge (Identical to Signaturely.com screenshot) */}
              <div className="flex items-center gap-2 select-none pt-1">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#FF4F00] text-white text-[9px] font-extrabold shadow shadow-[#FF4F00]/20">
                  G2
                </span>
                <div className="flex text-amber-500 text-sm">
                  {"★".repeat(5)}
                </div>
                <span className="text-xs font-bold text-foreground/80">
                  4.8/5
                </span>
                <span className="text-xs text-muted-foreground">
                  (580 reviews)
                </span>
              </div>

              {/* Trusted by Section with Infinite Scrolling Marquee */}
              <div className="space-y-4 pt-6 border-t border-border/50 max-w-xl overflow-hidden select-none">
                <p className="text-left text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                  TRUSTED BY 2,000,000+ USERS
                </p>
                <div className="flex gap-8 whitespace-nowrap opacity-75 relative w-full overflow-hidden">
                  <div className="flex gap-8 justify-around items-center min-w-full animate-[marquee_20s_linear_infinite] flex-shrink-0">
                    <span className="text-xs font-extrabold text-foreground tracking-tight">Chegg</span>
                    <span className="text-xs font-extrabold text-red-600 dark:text-red-500 tracking-tight flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-600"></span>StateFarm
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">COMPASS</span>
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 tracking-tight font-serif">HARVARD</span>
                    <span className="text-xs font-extrabold text-slate-500 tracking-tight font-sans">LERNER&ROWE</span>
                  </div>
                  <div className="flex gap-8 justify-around items-center min-w-full animate-[marquee_20s_linear_infinite] flex-shrink-0" aria-hidden="true">
                    <span className="text-xs font-extrabold text-foreground tracking-tight">Chegg</span>
                    <span className="text-xs font-extrabold text-red-600 dark:text-red-500 tracking-tight flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-600"></span>StateFarm
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">COMPASS</span>
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 tracking-tight font-serif">HARVARD</span>
                    <span className="text-xs font-extrabold text-slate-500 tracking-tight font-sans">LERNER&ROWE</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Premium CSS Mock Laptop & Contract Illustration */}
            <div className="relative w-full max-w-md mx-auto aspect-[1.15/1] bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-6 shadow-2xl flex flex-col justify-end overflow-hidden border border-border/60 hover:scale-[1.01] transition-transform duration-500">
              {/* Soft background grid/curves */}
              <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, var(--border) 1px, transparent 1px)`, backgroundSize: "16px 16px" }} />
              
              {/* Mock Floating Laptop Screen Document */}
              <div className="relative bg-white dark:bg-card border border-border shadow-2xl rounded-2xl p-6 w-[88%] mx-auto transform -translate-y-4 hover:translate-y-[-20px] transition-transform duration-500 select-none">
                <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
                  <FileSignature className="h-4.5 w-4.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">EZSignNow-agreement.pdf</span>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="h-3 w-3/4 bg-slate-100 dark:bg-accent rounded"></div>
                  <div className="h-3 w-1/2 bg-slate-100 dark:bg-accent rounded"></div>
                  <div className="h-3 w-2/3 bg-slate-100 dark:bg-accent rounded"></div>
                </div>

                {/* Signature signature line stamp */}
                <div className="border-t border-dashed border-border pt-4 flex justify-between items-center">
                  <div>
                    <span className="text-[8px] text-muted-foreground font-semibold block mb-1">Subcontractor Signature</span>
                    <span className="text-xs italic font-serif text-primary font-semibold block animate-pulse">Sridharan Udayakumar</span>
                  </div>
                  <div className="h-8 w-16 bg-primary/5 rounded border border-primary/20 flex items-center justify-center">
                    <FileSignature className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>      {/* Integrations Grid Section */}
      <section className="py-20 bg-slate-50 dark:bg-accent/5 border-b border-border/40" id="integrations">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
              Connected Ecosystem
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-foreground sm:text-4xl">
              Powering Your Business Workflows
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              EZSignNow connects directly with your favorite tools to automate contract preparation, secure payments, and instant notifications.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {/* Integration 1: Google Drive */}
            <div className="group rounded-2xl border border-border bg-white dark:bg-card p-8 shadow-sm hover:border-[#258ffb]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#258ffb]/10 text-[#258ffb] transition-colors group-hover:bg-[#258ffb] group-hover:text-white">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 22h20L12 2z" />
                  <path d="M12 2l5 8.5" />
                  <path d="M22 22l-10-17.3" />
                </svg>
              </div>
              <span className="text-[10px] font-extrabold text-[#258ffb] bg-[#258ffb]/10 px-2.5 py-1 rounded-full uppercase tracking-wider mb-3.5 inline-block">
                Google Drive
              </span>
              <h3 className="mb-2 font-bold text-foreground text-xl">Interactive File Picker</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect your account securely to search, select, and import PDF files directly from Google Drive in one click using the secure Google Picker API.
              </p>
            </div>

            {/* Integration 2: Stripe */}
            <div className="group rounded-2xl border border-border bg-white dark:bg-card p-8 shadow-sm hover:border-[#635bff]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#635bff]/10 text-[#635bff] transition-colors group-hover:bg-[#635bff] group-hover:text-white">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <span className="text-[10px] font-extrabold text-[#635bff] bg-[#635bff]/10 px-2.5 py-1 rounded-full uppercase tracking-wider mb-3.5 inline-block">
                Stripe Payments
              </span>
              <h3 className="mb-2 font-bold text-foreground text-xl">Instant Account Upgrades</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unlock unlimited signature requests instantly using Stripe's secure, bank-grade global payment processing network directly inside your billing settings.
              </p>
            </div>

            {/* Integration 3: Zoho Mail */}
            <div className="group rounded-2xl border border-border bg-white dark:bg-card p-8 shadow-sm hover:border-[#e21a22]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e21a22]/10 text-[#e21a22] transition-colors group-hover:bg-[#e21a22] group-hover:text-white">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </div>
              <span className="text-[10px] font-extrabold text-[#e21a22] bg-[#e21a22]/10 px-2.5 py-1 rounded-full uppercase tracking-wider mb-3.5 inline-block">
                Zoho SMTP Relay
              </span>
              <h3 className="mb-2 font-bold text-foreground text-xl">Verified Notifications</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ensure maximum email deliverability. All signatory invitations and verification codes route seamlessly through custom Zoho Mail SMTP dispatch servers.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Features Grid */}
      <section className="py-20 bg-background" id="features">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              Everything You Need in One Screen
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Skip the complexity. We provide an intuitive, high-performance toolkit to handle standard SaaS contracting workflows.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feat.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-bold text-foreground text-lg">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Legally Binding eSignature Laws Section */}
      <section className="py-24 bg-slate-50 dark:bg-accent/5 border-y border-border/40 relative overflow-hidden">
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            
            {/* Left Column Copywriting */}
            <div className="space-y-6 text-left max-w-xl">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
                Legally Binding
              </span>
              <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl leading-[1.15]">
                eSignatures have the same legal standing as handwritten ones
              </h2>
              <p className="text-md text-muted-foreground leading-relaxed">
                Over 60 international laws* ensure the validity and legal effect of eSignatures.
              </p>
              
              <Link 
                to="/try-for-free" 
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline hover:gap-2 transition-all"
              >
                Learn more about eSignature's laws
                <ArrowRight className="h-4 w-4" />
              </Link>

              <div className="pt-8 border-t border-border/60">
                <p className="text-[10px] leading-relaxed text-muted-foreground/80 font-mono">
                  * ESIGN Act Sec 106 (US Federal law), UETA (US State law), eIDAS regulation (European Union), Electronic Transactions Act 1999 (Australia), PIPEDA (Canadian federal law), Law of the People's Republic of China on Electronic Signature (China), IT Act 2000 (India), among others.
                </p>
              </div>
            </div>

            {/* Right Column - Network Flag Node Diagram */}
            <div className="relative aspect-square w-full max-w-md mx-auto flex items-center justify-center">
              
              {/* Connecting Dashed Line Network SVGs */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 dark:opacity-30" viewBox="0 0 400 400">
                {/* Central circular mesh lines */}
                <circle cx="200" cy="200" r="140" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" className="text-slate-400" />
                <circle cx="200" cy="200" r="80" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 5" className="text-slate-400" />
                {/* Radial lines */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const angle = (i * 360) / 8;
                  const x2 = 200 + 140 * Math.cos((angle * Math.PI) / 180);
                  const y2 = 200 + 140 * Math.sin((angle * Math.PI) / 180);
                  return (
                    <line 
                      key={i} 
                      x1="200" 
                      y1="200" 
                      x2={x2} 
                      y2={y2} 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeDasharray="4 4" 
                      className="text-slate-400" 
                    />
                  );
                })}
              </svg>

              {/* Center Globe Node */}
              <div className="z-10 h-24 w-24 rounded-full bg-white dark:bg-card border border-border shadow-2xl flex flex-col items-center justify-center p-3 text-center scale-95 hover:scale-100 transition-all duration-500">
                <FileSignature className="h-6 w-6 text-primary mb-1 animate-pulse" />
                <span className="text-[9px] font-extrabold text-foreground tracking-tight leading-none uppercase">GLOBAL</span>
                <span className="text-[7px] font-bold text-slate-400 mt-0.5 leading-none">VALIDITY</span>
              </div>

              {/* Radial Flag Nodes */}
              {[
                // USA
                { angle: 0, flag: (
                  <svg className="h-full w-full" viewBox="0 0 30 20">
                    <rect width="30" height="20" fill="#B22234" />
                    <rect width="30" height="1.54" fill="#B22234" />
                    {Array.from({ length: 7 }).map((_, idx) => (
                      <rect key={idx} y={(idx * 2 * 20) / 13} width="30" height={20 / 13} fill="#fff" />
                    ))}
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <rect key={idx} y={((idx * 2 + 1) * 20) / 13} width="30" height={20 / 13} fill="#B22234" />
                    ))}
                    <rect width="12" height="10.7" fill="#3C3B6E" />
                  </svg>
                ), label: "USA" },
                // China
                { angle: 45, flag: (
                  <svg className="h-full w-full" viewBox="0 0 30 20">
                    <rect width="30" height="20" fill="#DE2910" />
                    <polygon points="4,3 5.5,5.5 3,4.5 5,4.5 2.5,5.5" fill="#FFDE00" transform="scale(1.2) translate(1,0.5)" />
                  </svg>
                ), label: "China" },
                // Canada
                { angle: 90, flag: (
                  <svg className="h-full w-full" viewBox="0 0 30 20">
                    <rect width="30" height="20" fill="#FF0000" />
                    <rect x="7.5" width="15" height="20" fill="#FFFFFF" />
                    <path d="M15,5 L16,8 L19,7 L17.5,10 L19.5,12 L16.5,12 L15,15 L13.5,12 L10.5,12 L12.5,10 L11,7 L14,8 Z" fill="#FF0000" />
                  </svg>
                ), label: "Canada" },
                // France
                { angle: 135, flag: (
                  <svg className="h-full w-full" viewBox="0 0 30 20">
                    <rect width="10" height="20" fill="#002395" />
                    <rect x="10" width="10" height="20" fill="#FFFFFF" />
                    <rect x="20" width="10" height="20" fill="#ED2939" />
                  </svg>
                ), label: "France" },
                // India
                { angle: 180, flag: (
                  <svg className="h-full w-full" viewBox="0 0 30 20">
                    <rect width="30" height="6.66" fill="#FF9933" />
                    <rect y="6.66" width="30" height="6.66" fill="#FFFFFF" />
                    <rect y="13.32" width="30" height="6.68" fill="#128807" />
                    <circle cx="15" cy="10" r="2.2" fill="none" stroke="#000080" strokeWidth="0.4" />
                  </svg>
                ), label: "India" },
                // Germany
                { angle: 225, flag: (
                  <svg className="h-full w-full" viewBox="0 0 30 20">
                    <rect width="30" height="6.66" fill="#000000" />
                    <rect y="6.66" width="30" height="6.66" fill="#DD0000" />
                    <rect y="13.32" width="30" height="6.68" fill="#FFCC00" />
                  </svg>
                ), label: "Germany" },
                // Brazil
                { angle: 270, flag: (
                  <svg className="h-full w-full" viewBox="0 0 30 20">
                    <rect width="30" height="20" fill="#009739" />
                    <polygon points="15,2 27,10 15,18 3,10" fill="#FEDF00" />
                    <circle cx="15" cy="10" r="4.5" fill="#002776" />
                  </svg>
                ), label: "Brazil" },
                // Italy
                { angle: 315, flag: (
                  <svg className="h-full w-full" viewBox="0 0 30 20">
                    <rect width="10" height="20" fill="#009246" />
                    <rect x="10" width="10" height="20" fill="#F1F2F1" />
                    <rect x="20" width="10" height="20" fill="#CE2B37" />
                  </svg>
                ), label: "Italy" }
              ].map((node, i) => {
                const radius = 135;
                const x = 200 + radius * Math.cos((node.angle * Math.PI) / 180);
                const y = 200 + radius * Math.sin((node.angle * Math.PI) / 180);
                return (
                  <div 
                    key={i} 
                    className="absolute z-20 flex flex-col items-center gap-1 group"
                    style={{ 
                      left: `calc(${x}px - 22px)`, 
                      top: `calc(${y}px - 22px)` 
                    }}
                  >
                    <div className="h-10 w-10 rounded-full border border-border bg-white dark:bg-card shadow-lg p-0.5 overflow-hidden group-hover:scale-110 transition-transform duration-300 select-none">
                      <div className="h-full w-full rounded-full overflow-hidden border border-slate-100 flex items-center justify-center bg-slate-50">
                        {node.flag}
                      </div>
                    </div>
                    <span className="text-[7.5px] font-extrabold text-foreground bg-white/95 dark:bg-card/95 border border-border px-1.5 py-0.5 rounded-full leading-none shadow shadow-slate-200 opacity-80 group-hover:opacity-100 transition-opacity">
                      {node.label}
                    </span>
                  </div>
                );
              })}

            </div>

          </div>
        </div>
      </section>

      {/* Why choose YalTech EZSignNow Section */}
      <section className="py-24 bg-[#f8fafc] dark:bg-slate-950 border-b border-border/40 overflow-hidden transition-colors duration-250">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            
            {/* Left Column Copywriting */}
            <div className="space-y-7 text-left max-w-xl">
              <span className="text-xs font-bold text-[#258ffb] uppercase tracking-widest leading-none block">
                BE READY TO GET MORE
              </span>
              
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white leading-[1.1] tracking-tight">
                Why choose <span className="text-slate-800 dark:text-white">YalTech</span> <span className="text-[#258ffb]">EZSignNow</span>
              </h2>
              
              <div className="space-y-6 pt-2">
                {/* Point 1 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-[#258ffb] transition-colors">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Free 7-day trial. <span className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed block mt-1">Choose the plan you need and try it risk-free.</span>
                    </h3>
                  </div>
                </div>

                {/* Point 2 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-[#258ffb] transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Honest pricing for full-featured plans. <span className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed block mt-1">YalTech EZSignNow offers subscription plans with no overages or hidden fees at renewal.</span>
                    </h3>
                  </div>
                </div>

                {/* Point 3 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-[#258ffb] transition-colors">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Enterprise-grade security. <span className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed block mt-1">YalTech EZSignNow helps you comply with global security standards.</span>
                    </h3>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => navigate("/try-trial")}
                  size="lg"
                  className="rounded-full bg-[#258ffb] hover:bg-[#1d7ee6] text-white font-bold text-sm px-8 h-12 shadow-md shadow-[#258ffb]/20"
                >
                  Start free trial
                </Button>
              </div>
            </div>

            {/* Right Column - Premium E-Signature Interactive Simulation Panel */}
            <div className="relative w-full max-w-lg mx-auto bg-slate-100/50 dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner flex gap-4 overflow-hidden h-[420px] select-none scale-[1.02] transition-colors">
              
              {/* Document Sheet */}
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg border border-slate-100 dark:border-slate-850 flex flex-col justify-between transition-colors">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2">
                    Construction Contract
                  </h4>
                  
                  <div className="space-y-2">
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                      This Construction Contract is being entered into between [Client Name] ("Owner") and [Company Name] ("Contractor") (collectively, the "Parties").
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                      The effective date of this Construction Contract will be the last date of signature below.
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">
                      This Construction Contract, along with incorporated documents, sets forth terms and conditions agreed between the Parties.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 dark:border-slate-850 pt-4 transition-colors">
                  {/* Owner field block */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase w-12 text-left">Owner</span>
                    <div className="flex-1 h-9 rounded-lg border border-[#258ffb] bg-[#258ffb]/[0.02] flex items-center justify-center p-2 relative">
                      {/* Animated cursive signature representation */}
                      <span className="text-xs italic text-[#258ffb] font-serif font-bold animate-pulse select-none">
                        Sridharan Udayakumar
                      </span>
                    </div>
                  </div>

                  {/* Company field block */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase w-12 text-left">Company</span>
                    {/* Pulsing Drag Target Field */}
                    <div className="flex-1 h-9 rounded-lg border border-dashed border-[#635bff] bg-[#635bff]/5 flex items-center justify-center relative select-none animate-pulse">
                      <span className="text-[9px] font-extrabold text-[#635bff] uppercase tracking-wider flex items-center gap-1 select-none">
                        <FileSignature className="h-3 w-3" />
                        Signature Field
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drag Palette Sidebar */}
              <div className="w-[165px] bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-850 shadow-md flex flex-col justify-between overflow-hidden shrink-0 transition-colors">
                <div className="space-y-3.5">
                  {/* Select signatory header */}
                  <div className="space-y-1">
                    <div className="h-7 w-full rounded-lg bg-[#258ffb] text-white flex items-center gap-2 px-2.5 shadow-sm text-[9px] font-bold">
                      <div className="h-4.5 w-4.5 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-black">
                        O
                      </div>
                      Owner
                    </div>
                    <div className="h-7 w-full rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 text-slate-500 dark:text-slate-400 flex items-center gap-2 px-2.5 text-[9px] font-bold transition-colors">
                      <div className="h-4.5 w-4.5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[8px] font-black">
                        C
                      </div>
                      Company
                    </div>
                  </div>

                  {/* Edit signers control */}
                  <div className="h-7 w-full rounded bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 flex items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-400 transition-colors">
                    Edit Signers
                  </div>

                  {/* Tools List */}
                  <div className="space-y-1.5 overflow-hidden text-left">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tools</p>
                    {[
                      { icon: FileSignature, label: "Signature Field" },
                      { icon: FileText, label: "Text Field" },
                      { icon: Calendar, label: "Date/Time Field" },
                      { icon: CheckSquare, label: "Checkbox Field" },
                      { icon: UserCheck, label: "Initials Field" },
                    ].map((tool, idx) => {
                      const Icon = tool.icon;
                      const isDraggingMock = tool.label === "Signature Field";
                      return (
                        <div 
                          key={idx}
                          className={`h-7 rounded border flex items-center gap-2 px-2 text-[9px] font-semibold transition-all ${
                            isDraggingMock 
                              ? "border-[#635bff] bg-[#635bff]/5 text-[#635bff] shadow-sm translate-x-[-2px] animate-pulse" 
                              : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          <Icon className={`h-3 w-3 shrink-0 ${isDraggingMock ? 'text-[#635bff]' : 'text-slate-400'}`} />
                          <span className="truncate">{tool.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="text-[7.5px] text-slate-350 dark:text-slate-650 font-bold tracking-widest text-center mt-2 uppercase select-none">
                  EZSIGNNOW SECURE
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Ditch paper, go EZSignNow Metrics Grid */}
      <section className="py-16 bg-white dark:bg-card border-b border-border/40">
        <div className="container mx-auto px-4 max-w-7xl text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight tracking-tight mb-12">
            Ditch paper, go <span className="text-primary font-bold">EZSignNow</span>
          </h2>
          
          <div className="grid gap-6 grid-cols-2 md:grid-cols-5 max-w-5xl mx-auto">
            {[
              { val: "92%", label: "Cut in scanning errors" },
              { val: "80%", label: "Improved audit efficiency" },
              { val: "66%", label: "Fewer missing files" },
              { val: "5x", label: "eSignature speed vs paper" },
              { val: "$20", label: "Average savings per document" }
            ].map((stat, idx) => (
              <div 
                key={idx}
                className="p-6 bg-slate-50/50 dark:bg-accent/10 border border-border/50 rounded-2xl flex flex-col justify-center items-center hover:bg-slate-50 dark:hover:bg-accent/20 transition-colors shadow-inner"
              >
                <span className="text-4xl sm:text-5xl font-extrabold text-primary tracking-tight block mb-2 font-mono">
                  {stat.val}
                </span>
                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground leading-relaxed block text-center max-w-[130px]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-card border-y border-border/40" id="how-it-works">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              Simple 3-Step Signature Lifecycle
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Sign documents legally in minutes. Drag-and-drop overlays lock instantly.
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            
            {/* Step triggers */}
            <div className="space-y-4">
              {steps.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={`cursor-pointer rounded-2xl border p-5 text-left transition-all duration-300 flex gap-4 ${
                    activeTab === idx
                      ? "border-primary/50 bg-background shadow-md shadow-primary/5"
                      : "border-border/60 hover:border-border hover:bg-background/40"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    activeTab === idx ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"
                  }`}>
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Step illustration */}
            <div className="rounded-2xl border border-border bg-background p-6 shadow-xl w-full max-w-lg mx-auto">
              <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
                <span className="text-xs font-semibold text-muted-foreground">Live Workflow Simulator</span>
                <div className="flex gap-1.5">
                  <div className="h-3.5 w-3.5 rounded-full bg-red-400/20"></div>
                  <div className="h-3.5 w-3.5 rounded-full bg-amber-400/20"></div>
                  <div className="h-3.5 w-3.5 rounded-full bg-emerald-400/20"></div>
                </div>
              </div>
              {steps[activeTab].illustration}
            </div>

          </div>
        </div>
      </section>

      {/* G2 Customer Reviews Showcase Section */}
      <section className="py-20 bg-slate-50 dark:bg-accent/5 border-y border-border/40" id="reviews">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              G2 Customer Choice
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-foreground sm:text-4xl">
              What Real Users Say on G2
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Our customers consistently rate us 4.8/5 stars for ease of use, swift document signatures, and legally certified audit logs.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
            {[
              {
                name: "Robert Waltko",
                role: "Director of Talent Acquisition",
                company: "eNGINE",
                text: "EZSignNow has completely modernized our contracting. Capturing signed timestamps alongside real-time IP audit trail metadata makes compliance review effortless.",
                stars: 5,
                badge: "Leader Spring 2026",
                avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face"
              },
              {
                name: "Sarah Jenkins",
                role: "Operations Lead",
                company: "Apex Digital",
                text: "The signature templates and playground saved our team 20+ hours a week. It had to be the smoothest digital signature app I've ever used. The UI is exceptionally clean.",
                stars: 5,
                badge: "Best Usability",
                avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=face"
              },
              {
                name: "David Vance",
                role: "General Counsel",
                company: "Helix Biotech",
                text: "Downloading a certified PDF with full geolocation metadata was exactly what we needed to secure our enterprise agency contracts. 100% compliant and legally binding.",
                stars: 5,
                badge: "High Performer",
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face"
              }
            ].map((rev, idx) => (
              <div
                key={idx}
                className="bg-background rounded-2xl border border-border/60 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
                      {rev.badge}
                    </span>
                    <div className="flex text-amber-500 text-xs">
                      {"★".repeat(rev.stars)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic mb-6">
                    "{rev.text}"
                  </p>
                </div>
                
                <div className="border-t border-border/50 pt-4 flex items-center gap-3">
                  <img 
                    src={rev.avatar} 
                    alt={rev.name}
                    className="h-9 w-9 rounded-full object-cover border border-slate-100 shadow-sm shrink-0"
                  />
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-foreground leading-tight">{rev.name}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{rev.role}, {rev.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <Button size="lg" className="h-11 font-semibold" asChild>
              <Link to="/try-for-free">
                Try for Free & Design Signature
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contract Templates Library */}
      <section className="py-20 bg-background" id="templates">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              Standard Legal Document Templates
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Access commonly drafted agreements. Upload your document and save templates to reuse across multiple parties.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {templates.map((temp, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:border-primary/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="inline-block text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase mb-4">
                    Ready Template
                  </span>
                  <h3 className="font-bold text-foreground text-md mb-2 leading-tight">{temp.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{temp.desc}</p>
                </div>
                <div className="border-t border-border/50 pt-4 flex items-center justify-between mt-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground">{temp.fields}</p>
                    <p className="text-[10px] font-semibold text-foreground">{temp.time}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] font-semibold" asChild>
                    <Link to="/try-for-free">Use Template</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Teams Section */}
      <section className="py-20 bg-primary/[0.02] border-t border-border/40" id="teams">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            
            <div className="space-y-6 text-left">
              <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
                Built for Collaborative Teams
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Empower your organization with multi-party signature routing, shared templates, activity audit feeds, and custom organizational branding.
              </p>
              
              <ul className="space-y-4">
                {[
                  { icon: LayoutTemplate, title: "Shared Team Templates", desc: "Share standard NDAs and independent contractor agreements across your department." },
                  { icon: UserCheck, title: "Role-Based Delegation", desc: "Assign specific roles to team members: creator, editor, signer, or manager." },
                  { icon: Building2, title: "Company Brand Customization", desc: "Upload your company logo, set custom brand email layouts, and create branded portals." }
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-4 items-start">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-md mb-0.5">{item.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <Button size="lg" className="mt-4" asChild>
                <Link to="/try-for-free">Start Team Account</Link>
              </Button>
            </div>

            {/* Teams visual block */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto w-full">
              {[
                { icon: Clock, value: "62%", label: "Faster Contract Close" },
                { icon: FileText, value: "10K+", label: "Signed Documents" },
                { icon: Globe, value: "24/7", label: "Global Legal Legality" },
                { icon: Shield, value: "Bank-Grade", label: "SSL Data Security" },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm hover:scale-[1.02] transition-all"
                >
                  <stat.icon className="mx-auto h-8 w-8 text-primary" />
                  <p className="mt-3 text-2xl font-extrabold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Plans Table */}
      <section className="py-20 bg-background border-t border-border/40" id="pricing">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              Transparent, Value-Based Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Choose the perfect plan for your legal signature requirements.
            </p>

            {/* Annual toggle */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <span className={`text-sm ${billingCycle === "monthly" ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors focus:outline-none"
              >
                <span
                  className={`${
                    billingCycle === "annual" ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
              <span className={`text-sm flex items-center gap-1.5 ${billingCycle === "annual" ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                Annual
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                  Save 20%
                </span>
              </span>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Free Starter",
                price: "0",
                desc: "Excellent for single signers getting occasional contracts completed.",
                features: [
                  "3 Documents per month",
                  "1 Sender account",
                  "Standard Signature fields",
                  "Secure Geolocation IP logs",
                  "Download signed certified PDF"
                ],
                btn: "Get Started Free",
                popular: false
              },
              {
                title: "Personal Pro",
                price: billingCycle === "annual" ? "2" : "3",
                desc: "Great for freelancers, realtors, and solo legal practitioners.",
                features: [
                  "Unlimited document uploads",
                  "1 Sender account",
                  "Custom templates creation",
                  "Signatory date & checkboxes",
                  "Digital audit trail certificate",
                  "Supabase private cloud backup"
                ],
                btn: "Go Pro Now",
                popular: true
              },
              {
                title: "Business Enterprise",
                price: billingCycle === "annual" ? "4" : "5",
                desc: "Perfect for scaling businesses requiring robust team coordination.",
                features: [
                  "Unlimited document uploads",
                  "Unlimited shared templates",
                  "Multiple sender accounts",
                  "Team templates collaboration",
                  "Granular permission controls",
                  "Custom company branding",
                  "API Access & developer keys"
                ],
                btn: "Start Free Trial",
                popular: false
              }
            ].map((plan, idx) => (
              <div
                key={idx}
                className={`relative rounded-3xl border p-8 flex flex-col justify-between shadow-sm transition-all duration-300 ${
                  plan.popular
                    ? "border-primary bg-card scale-105 shadow-xl shadow-primary/5 md:-translate-y-2"
                    : "border-border bg-card"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold bg-primary text-primary-foreground uppercase tracking-wider">
                    Most Popular
                  </span>
                )}
                <div>
                  <h3 className="font-extrabold text-foreground text-xl mb-2">{plan.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-6">{plan.desc}</p>
                  
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-foreground">${plan.price}</span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>

                  <ul className="space-y-3.5 border-t border-border/50 pt-6">
                    {plan.features.map((feat, fidx) => (
                      <li key={fidx} className="flex gap-2.5 items-start">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-foreground/80 leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button size="lg" className={`w-full mt-8 text-xs font-semibold ${plan.popular ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow" : ""}`} variant={plan.popular ? "default" : "outline"} asChild>
                  <Link to="/try-for-free">{plan.btn}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="py-20 bg-card border-t border-border/40" id="faq">
        <div className="container mx-auto px-4 max-w-3xl text-left">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to know about EZSignNow compliance and usage.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/60 bg-background/50 hover:bg-background/80 transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-bold text-foreground text-md flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 flex-shrink-0 ${
                    openFaq === idx ? "transform rotate-180" : ""
                  }`} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/30">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Bottom Section */}
      <section className="py-24 bg-secondary relative overflow-hidden border-t border-border/50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
        <div className="container relative mx-auto px-4 text-center max-w-4xl">
          <h2 className="text-3xl font-extrabold text-secondary-foreground sm:text-4xl leading-[1.2]">
            Ready to Streamline Your Contracts?
          </h2>
          <p className="mt-4 text-lg text-secondary-foreground/75 max-w-xl mx-auto leading-relaxed">
            Create your account today and start signing documents completely free. No card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="h-12 px-8 text-sm font-semibold" asChild>
              <Link to="/try-for-free">
                Create Free Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" className="h-12 px-8 text-sm font-semibold border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10" variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
