import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { SEO } from "@/components/SEO";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileSignature,
  faUsers,
  faShield,
  faBolt,
  faCircleCheck,
  faArrowRight,
  faFileLines,
  faClock,
  faGlobe,
  faChevronDown,
  faTableCellsLarge,
  faUserCheck,
  faBuildingColumns,
  faCircleQuestion,
  faCheck,
  faPlay,
  faCalendarDays,
  faSquareCheck,
  faDollarSign,
  faMobileScreen,
  faLock,
  faEye,
  faPaperPlane,
  faArrowsRotate,
  faCloud,
  faDatabase,
  faMapPin,
  faHeartPulse,
  faServer,
  faFire
} from "@fortawesome/free-solid-svg-icons";
import heroImage from "@/assets/hero-esign.jpg";
import { logoDevUrl, BRAND_DOMAINS } from "@/utils/logoDev";
import { BrandLogoImg } from "@/components/ui/brand-logo-img";

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [signupEmail, setSignupEmail] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [activeTab, setActiveTab] = useState<number>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Competitor-Beating Features Hub states
  const [activeFeatureTab, setActiveFeatureTab] = useState<"savings" | "satisfaction" | "workflows" | "security">("savings");
  const [calcDocVolume, setCalcDocVolume] = useState<number>(45);
  
  // Client Satisfaction Drawing Simulation states
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [simulatedPoints, setSimulatedPoints] = useState<{ x: number; y: number }[]>([]);
  const [autoDrawStep, setAutoDrawStep] = useState<number>(0);
  const [isAutoDrawing, setIsAutoDrawing] = useState<boolean>(true);

  // Workflow Simulation states
  const [workflowStep, setWorkflowStep] = useState<number>(0);
  const [isSimulatingWorkflow, setIsSimulatingWorkflow] = useState<boolean>(false);

  // Security Verification simulation state
  const [activeSecurityField, setActiveSecurityField] = useState<"sha" | "geo" | "ip" | "time">("sha");
  const [isVerifiedGlow, setIsVerifiedGlow] = useState<boolean>(false);

  // States for Security (Legally Binding & Secure) geolocation trackers
  const [geoHubIndex, setGeoHubIndex] = useState(0);
  const [geoCoordsJitter, setGeoCoordsJitter] = useState({ lat: 0, lng: 0 });

  const globalHubs = [
    { city: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, ip: "114.76.221.99", provider: "Telstra Enterprise", hash: "sha256:8f9a0b1c2d3e4f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a" },
    { city: "New York", country: "United States", lat: 40.7128, lng: -74.0060, ip: "192.168.1.108", provider: "Verizon Fios", hash: "sha256:7d8c92a18b3d4f5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e" },
    { city: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278, ip: "82.165.44.201", provider: "British Telecom", hash: "sha256:3f8a41b2c6d7e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5" },
    { city: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, ip: "210.140.10.45", provider: "NTT Docomo", hash: "sha256:9e0b12a3c4f5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1" },
    { city: "Paris", country: "France", lat: 48.8566, lng: 2.3522, ip: "176.132.89.12", provider: "Orange SA", hash: "sha256:5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setGeoHubIndex((prev) => (prev + 1) % globalHubs.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const jitterInterval = setInterval(() => {
      setGeoCoordsJitter({
        lat: (Math.random() - 0.5) * 0.0004,
        lng: (Math.random() - 0.5) * 0.0004
      });
    }, 1000);
    return () => clearInterval(jitterInterval);
  }, []);

  const activeHub = globalHubs[geoHubIndex];
  const displayLat = activeHub.lat + geoCoordsJitter.lat;
  const displayLng = activeHub.lng + geoCoordsJitter.lng;

  // Timeline Logs state (Better Tracking)
  const [activityLogs, setActivityLogs] = useState([
    { id: "1", event: "Document Created", details: "PDF secure upload completed. Audit key: ak_7a21", time: "10:05:22 AM", type: "system" },
    { id: "2", event: "Signer Invited", details: "Sent verification email with secure magic link.", time: "10:06:15 AM", type: "invite" },
    { id: "3", event: "Access Code Verified", details: "Signer verified 6-digit session OTP code.", time: "10:07:01 AM", type: "secure" }
  ]);

  const addSimulatedEvent = (type: "view" | "sign" | "sms" | "lock") => {
    const timeStr = new Date().toLocaleTimeString();
    let newEvent = { id: String(Date.now()), event: "", details: "", time: timeStr, type: "" };
    
    switch (type) {
      case "view":
        newEvent.event = "Document Viewed";
        newEvent.details = `Signer opened doc. IP: ${activeHub.ip} (${activeHub.city})`;
        newEvent.type = "view";
        break;
      case "sms":
        newEvent.event = "OTP Verification Sent";
        newEvent.details = "Secure 6-digit code routed via Resend.";
        newEvent.type = "secure";
        break;
      case "sign":
        newEvent.event = "Signature Affixed";
        newEvent.details = `Signed digitally. Fingerprint: ${activeHub.hash.slice(0, 15)}...`;
        newEvent.type = "sign";
        break;
      case "lock":
        newEvent.event = "Document Sealed";
        newEvent.details = "Tamper-evident cryptoseal locked. PDF compiled successfully!";
        newEvent.type = "lock";
        break;
    }
    
    setActivityLogs((prev) => [newEvent, ...prev].slice(0, 6));
  };

  // Cloud integration sync state (Automated Cloud Archiving)
  const [selectedCloud, setSelectedCloud] = useState<"gdrive" | "dropbox" | "onedrive">("gdrive");
  const [archiveStatus, setArchiveStatus] = useState<"idle" | "syncing" | "done">("idle");
  const [archiveProgress, setArchiveProgress] = useState(0);

  const startCloudSync = () => {
    if (archiveStatus === "syncing") return;
    setArchiveStatus("syncing");
    setArchiveProgress(0);
    
    const duration = 1500;
    const intervalTime = 50;
    const steps = duration / intervalTime;
    const increment = 100 / steps;
    
    let progress = 0;
    const timer = setInterval(() => {
      progress += increment;
      if (progress >= 100) {
        progress = 100;
        clearInterval(timer);
        setArchiveStatus("done");
        
        const timeStr = new Date().toLocaleTimeString();
        setActivityLogs((prev) => [
          {
            id: String(Date.now()),
            event: `Archived to ${selectedCloud === "gdrive" ? "Google Drive" : selectedCloud === "dropbox" ? "Dropbox" : "OneDrive"}`,
            details: `PDF copy securely mirrored in cloud storage slot.`,
            time: timeStr,
            type: "cloud"
          },
          ...prev
        ].slice(0, 6));
      }
      setArchiveProgress(Math.floor(progress));
    }, intervalTime);
  };

  const signaturePath = [
    { x: 30, y: 55 }, { x: 35, y: 48 }, { x: 40, y: 35 }, { x: 42, y: 25 }, { x: 40, y: 22 },
    { x: 37, y: 28 }, { x: 36, y: 45 }, { x: 42, y: 55 }, { x: 50, y: 58 }, { x: 60, y: 58 },
    { x: 65, y: 50 }, { x: 68, y: 35 }, { x: 65, y: 32 }, { x: 60, y: 38 }, { x: 62, y: 52 },
    { x: 70, y: 56 }, { x: 80, y: 56 }, { x: 85, y: 45 }, { x: 82, y: 38 }, { x: 80, y: 48 },
    { x: 86, y: 56 }, { x: 95, y: 56 }, { x: 105, y: 48 }, { x: 110, y: 35 }, { x: 105, y: 42 },
    { x: 112, y: 52 }, { x: 120, y: 56 }, { x: 130, y: 45 }, { x: 135, y: 35 }, { x: 140, y: 52 },
    { x: 155, y: 56 }, { x: 170, y: 48 }, { x: 180, y: 45 }
  ];

  useEffect(() => {
    if (activeFeatureTab !== "satisfaction") {
      setSimulatedPoints([]);
      setAutoDrawStep(0);
      setIsAutoDrawing(true);
      return;
    }

    if (!isAutoDrawing) return;

    const timer = setTimeout(() => {
      if (autoDrawStep < signaturePath.length) {
        setSimulatedPoints(prev => [...prev, signaturePath[autoDrawStep]]);
        setAutoDrawStep(prev => prev + 1);
      } else {
        const pauseTimer = setTimeout(() => {
          setSimulatedPoints([]);
          setAutoDrawStep(0);
        }, 2000);
        return () => clearTimeout(pauseTimer);
      }
    }, 45);

    return () => clearTimeout(timer);
  }, [activeFeatureTab, autoDrawStep, isAutoDrawing]);

  useEffect(() => {
    if (!isSimulatingWorkflow) return;

    if (workflowStep < 4) {
      const timer = setTimeout(() => {
        setWorkflowStep(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      const resetTimer = setTimeout(() => {
        setIsSimulatingWorkflow(false);
        setWorkflowStep(0);
      }, 5000);
      return () => clearTimeout(resetTimer);
    }
  }, [workflowStep, isSimulatingWorkflow]);

  const startWorkflowSimulation = () => {
    setWorkflowStep(0);
    setIsSimulatingWorkflow(true);
  };


  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsAutoDrawing(false);
    setSimulatedPoints([]);
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 200;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDrawingPoints([{ x, y }]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 200;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDrawingPoints(prev => [...prev, { x, y }]);
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    setIsAutoDrawing(false);
    setSimulatedPoints([]);
    setIsDrawing(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 200;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    setDrawingPoints([{ x, y }]);
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = ((touch.clientX - rect.left) / rect.width) * 200;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    setDrawingPoints(prev => [...prev, { x, y }]);
  };

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  // Features array replaced by the interactive Competitor-Beating Features Hub state machines below

  const steps = [
    {
      step: "01",
      title: "Upload & Configure",
      description: "Upload any standard PDF contract directly from your device. Our secure systems prepare the document in milliseconds.",
      illustration: (
        <div className="relative w-full h-[220px] rounded-lg border border-border bg-accent/40 flex items-center justify-center p-6 shadow-inner">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
              <FontAwesomeIcon icon={faFileLines} className="h-6 w-6" />
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
            <FontAwesomeIcon icon={faFileSignature} className="h-3.5 w-3.5 text-primary" />
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
              <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4" />
              <span className="text-xs font-semibold">Document Signed & Secured</span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">IP: 192.168.1.72 | New York, US</p>
          </div>
          <div className="h-[60px] w-2/3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-card flex items-center justify-center p-2 self-center">
            <span className="text-xs italic text-slate-500 font-serif">Joe Thomas</span>
          </div>
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-7 self-end">
            <Link to="/try-for-free">Download Certified PDF</Link>
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
      <SEO 
        title="EZSignNow | Super Simple Free Electronic Signatures"
        description="Upload PDF documents to sign online in seconds. EZSignNow is the fastest, legally binding free e-signature tool complying with ESIGN, UETA, & eIDAS."
        keywords="electronic signature, free e-signature, sign PDF online, digital signature, sign documents, online contract signature, e-sign tools"
        includeOrganization={true}
        includeWebSite={true}
        includeProductRating={true}
        faqs={faqs.map(f => ({ question: f.q, answer: f.a }))}
      />
      {/* Top GTM Promotion Bar */}
      <div className="bg-gradient-to-r from-primary via-slate-900 to-secondary text-white py-2.5 px-4 text-center text-xs font-bold shadow-md relative z-50 flex items-center justify-center gap-2 select-none">
        <span className="inline-flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-primary-foreground border border-white/10 animate-pulse">
          Limited Deal
        </span>
        <span>Why pay $20/mo? Switch from signNow to EZSignNow for just $5/mo with unlimited envelopes!</span>
        <Link to="/compare/signnow" className="underline hover:text-primary-foreground/90 inline-flex items-center gap-0.5 ml-1">
          Learn More <span className="no-underline">→</span>
        </Link>
      </div>

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
                    <BrandLogoImg src={logoDevUrl(BRAND_DOMAINS.chegg, 40)} alt="Chegg" className="h-5 w-auto object-contain" fallback={<span className="text-xs font-extrabold text-foreground tracking-tight">Chegg</span>} />
                    <BrandLogoImg src={logoDevUrl(BRAND_DOMAINS.stateFarm, 40)} alt="State Farm" className="h-5 w-auto object-contain" fallback={<span className="text-xs font-extrabold text-red-600 dark:text-red-500 tracking-tight flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-600"></span>StateFarm</span>} />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">COMPASS</span>
                    <BrandLogoImg src={logoDevUrl(BRAND_DOMAINS.harvard, 40)} alt="Harvard" className="h-5 w-auto object-contain" fallback={<span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 tracking-tight font-serif">HARVARD</span>} />
                    <BrandLogoImg src={logoDevUrl(BRAND_DOMAINS.lernerRowe, 40)} alt="Lerner & Rowe" className="h-5 w-auto object-contain" fallback={<span className="text-xs font-extrabold text-slate-500 tracking-tight font-sans">LERNER&ROWE</span>} />
                  </div>
                  <div className="flex gap-8 justify-around items-center min-w-full animate-[marquee_20s_linear_infinite] flex-shrink-0" aria-hidden="true">
                    <BrandLogoImg src={logoDevUrl(BRAND_DOMAINS.chegg, 40)} alt="Chegg" className="h-5 w-auto object-contain" fallback={<span className="text-xs font-extrabold text-foreground tracking-tight">Chegg</span>} />
                    <BrandLogoImg src={logoDevUrl(BRAND_DOMAINS.stateFarm, 40)} alt="State Farm" className="h-5 w-auto object-contain" fallback={<span className="text-xs font-extrabold text-red-600 dark:text-red-500 tracking-tight flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-600"></span>StateFarm</span>} />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">COMPASS</span>
                    <BrandLogoImg src={logoDevUrl(BRAND_DOMAINS.harvard, 40)} alt="Harvard" className="h-5 w-auto object-contain" fallback={<span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 tracking-tight font-serif">HARVARD</span>} />
                    <BrandLogoImg src={logoDevUrl(BRAND_DOMAINS.lernerRowe, 40)} alt="Lerner & Rowe" className="h-5 w-auto object-contain" fallback={<span className="text-xs font-extrabold text-slate-500 tracking-tight font-sans">LERNER&ROWE</span>} />
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
                  <FontAwesomeIcon icon={faFileSignature} className="h-4.5 w-4.5 text-primary" />
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
                    <span className="text-xs italic font-serif text-primary font-semibold block animate-pulse">Joe Thomas</span>
                  </div>
                  <div className="h-8 w-16 bg-primary/5 rounded border border-primary/20 flex items-center justify-center">
                    <FontAwesomeIcon icon={faFileSignature} className="h-4 w-4 text-primary" />
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
            <div className="group rounded-2xl border border-border bg-white dark:bg-card p-8 shadow-sm hover:border-[#22c55e]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#22c55e]/10 text-[#22c55e] transition-colors group-hover:bg-[#22c55e] group-hover:text-white">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 22h20L12 2z" />
                  <path d="M12 2l5 8.5" />
                  <path d="M22 22l-10-17.3" />
                </svg>
              </div>
              <span className="text-[10px] font-extrabold text-[#22c55e] bg-[#22c55e]/10 px-2.5 py-1 rounded-full uppercase tracking-wider mb-3.5 inline-block">
                Google Drive
              </span>
              <h3 className="mb-2 font-bold text-foreground text-xl">Interactive File Picker</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect your account securely to search, select, and import PDF files directly from Google Drive in one click using the secure Google Picker API.
              </p>
            </div>

            {/* Integration 2: Stripe */}
            <div className="group rounded-2xl border border-border bg-white dark:bg-card p-8 shadow-sm hover:border-[#1e293b]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1e293b]/10 text-[#1e293b] transition-colors group-hover:bg-[#1e293b] group-hover:text-white">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <span className="text-[10px] font-extrabold text-[#1e293b] bg-[#1e293b]/10 px-2.5 py-1 rounded-full uppercase tracking-wider mb-3.5 inline-block">
                Stripe Payments
              </span>
              <h3 className="mb-2 font-bold text-foreground text-xl">Instant Account Upgrades</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Unlock unlimited signature requests instantly using Stripe's secure, bank-grade global payment processing network directly inside your billing settings.
              </p>
            </div>

            {/* Integration 3: Resend */}
            <div className="group rounded-2xl border border-border bg-white dark:bg-card p-8 shadow-sm hover:border-[#e21a22]/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e21a22]/10 text-[#e21a22] transition-colors group-hover:bg-[#e21a22] group-hover:text-white">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </div>
              <span className="text-[10px] font-extrabold text-[#e21a22] bg-[#e21a22]/10 px-2.5 py-1 rounded-full uppercase tracking-wider mb-3.5 inline-block">
                Resend Email API
              </span>
              <h3 className="mb-2 font-bold text-foreground text-xl">Verified Notifications</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ensure maximum email deliverability. All signatory invitations and verification codes route seamlessly through Resend's verified sending domain.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Competitor-Beating Features Hub */}
      <section className="py-24 bg-background relative overflow-hidden" id="features">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.01] via-transparent to-primary/[0.01] pointer-events-none" />
        
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider select-none animate-pulse">
              Competitor-Beating Features Hub
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-foreground sm:text-4xl leading-tight font-sans tracking-tight">
              Why Legal Agencies Are Choosing EZSignNow
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Ditch the clunky, expensive legacy grids. Experience the premium features that put us years ahead of Signaturely and DocuSign.
            </p>
          </div>

          {/* Interactive Feature Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-4xl mx-auto">
            {[
              { id: "savings", label: "Cost Savings", icon: faDollarSign, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
              { id: "security", label: "Legally Binding & Secure", icon: faShield, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
              { id: "satisfaction", label: "Better Tracking", icon: faClock, color: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20" },
              { id: "workflows", label: "Automated Cloud Archiving", icon: faCloud, color: "text-[#1e293b] bg-[#1e293b]/10 border-[#1e293b]/20" }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFeatureTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeatureTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold border transition-all duration-300 shadow-sm ${
                    isActive
                      ? "bg-primary text-white border-primary scale-[1.03] shadow-md shadow-primary/20"
                      : "bg-card text-muted-foreground hover:text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <FontAwesomeIcon icon={Icon} className={`h-4 w-4 ${isActive ? 'text-white' : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Split Screen Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch bg-card/60 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 lg:p-10 border border-border/80 shadow-2xl transition-all duration-500">
            
            {/* Left Column: Premium Value Prop Card */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6 text-left">
              {activeFeatureTab === "savings" && (
                <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <FontAwesomeIcon icon={faDollarSign} className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                    Unprecedented Cost Savings
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Completely eliminate traditional expenses. While platforms like Signaturely charge $20+/month for standard features, EZSignNow offers premium performance starting at a fraction of the cost, saving thousands of dollars in print, paper, and courier shipping annually.
                  </p>
                  
                  <div className="space-y-3.5 pt-2">
                    <div className="flex items-start gap-2.5">
                      <FontAwesomeIcon icon={faCheck} className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">No Premium Markups</h4>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          Get unlimited envelopes and custom team collaboration without paying enterprise rates.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2.5">
                      <FontAwesomeIcon icon={faCheck} className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Eco-Friendly Efficiency</h4>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          Ditch printers and physical storage facilities forever. 100% paperless digital archiving.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === "security" && (
                <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <FontAwesomeIcon icon={faShield} className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                    Legally Binding & Secure
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    EZSignNow complies fully with ESIGN Act, UETA, and eIDAS regulations. Every transaction produces a legally binding document sealed with dynamic geolocation metadata, secure public IP logs, and SHA-256 digital seals.
                  </p>
                  
                  <div className="space-y-3.5 pt-2">
                    <div className="flex items-start gap-2.5">
                      <FontAwesomeIcon icon={faCheck} className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Court-Admissible Certificates</h4>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          Download signed PDFs complete with secure, untampered legal audit trail summary sheets.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2.5">
                      <FontAwesomeIcon icon={faCheck} className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Cryptographic SHA-256 Locking</h4>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          Any attempts to modify the document after finalization automatically voids the digital checksum.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === "satisfaction" && (
                <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                  <div className="h-10 w-10 rounded-xl bg-[#22c55e]/10 text-[#22c55e] flex items-center justify-center">
                    <FontAwesomeIcon icon={faClock} className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                    Better Tracking & Logs
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Get automated alerts and track document lifecycles in real-time. View precisely when envelopes are created, delivered, verified, or geolocated, with detailed audit trace history built dynamically.
                  </p>
                  
                  <div className="space-y-3.5 pt-2">
                    <div className="flex items-start gap-2.5">
                      <FontAwesomeIcon icon={faCheck} className="h-4.5 w-4.5 text-[#22c55e] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Chronological Event Logs</h4>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          Verify sign actions instantly. Keep permanent, immutable timestamps for all signatories.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2.5">
                      <FontAwesomeIcon icon={faCheck} className="h-4.5 w-4.5 text-[#22c55e] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Smart SMS Verification Trace</h4>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          Record authentication attempts automatically to guarantee identity validity under court standards.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeFeatureTab === "workflows" && (
                <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                  <div className="h-10 w-10 rounded-xl bg-[#1e293b]/10 text-[#1e293b] flex items-center justify-center">
                    <FontAwesomeIcon icon={faCloud} className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                    Automated Cloud Archiving
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Eliminate manual contract filing. Once all parties complete, EZSignNow automatically compiles a certified PDF and synchronizes copies directly to Dropbox, Google Drive, or OneDrive.
                  </p>
                  
                  <div className="space-y-3.5 pt-2">
                    <div className="flex items-start gap-2.5">
                      <FontAwesomeIcon icon={faCheck} className="h-4.5 w-4.5 text-[#1e293b] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Instant Sync Engines</h4>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          Automatically mirror completed agreements in dedicated, structured client directories in real-time.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2.5">
                      <FontAwesomeIcon icon={faCheck} className="h-4.5 w-4.5 text-[#1e293b] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">Seamless Folder Organization</h4>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          Files slide effortlessly from secure local Supabase storage directly into connected cloud partner vaults.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Card Footer Action */}
              <div className="pt-6 border-t border-border flex items-center gap-4">
                <Button size="lg" className="font-bold text-xs h-10 px-5 shadow bg-primary hover:bg-primary/95 text-white" asChild>
                  <Link to="/try-for-free">
                    Get Started Risk-Free
                    <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5 ml-1.5" />
                  </Link>
                </Button>
                <div className="text-[10px] text-muted-foreground font-semibold">
                  Free Starter Account • No Credit Card
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Interactive Tool Block */}
            <div className="lg:col-span-7 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-border/80 p-6 lg:p-8 flex flex-col justify-center items-center relative overflow-hidden min-h-[460px] shadow-inner transition-colors duration-300">
              
              {/* Savings Calculator (savings tab) */}
              {activeFeatureTab === "savings" && (
                <div className="w-full space-y-6 animate-[fadeIn_0.4s_ease-out]">
                  <div className="space-y-3.5 text-left">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-0.5">SLIDING SAVINGS CALCULATOR</span>
                        <label className="text-sm font-extrabold text-foreground">Monthly Document Volume</label>
                      </div>
                      <span className="text-2xl font-black text-[#22c55e] font-mono tracking-tight">{calcDocVolume} contracts/mo</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="300"
                      value={calcDocVolume}
                      onChange={(e) => setCalcDocVolume(Number(e.target.value))}
                      className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#22c55e] focus:outline-none"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5 select-none">
                      <span>5 Contracts</span>
                      <span>150 Contracts</span>
                      <span>300 Contracts</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-4 bg-white dark:bg-card border border-border/60 rounded-xl shadow-sm transition-all hover:shadow-md">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block mb-1">PAPER & PRINTING SAVED</span>
                      <span className="text-xl font-bold text-foreground font-mono">${(calcDocVolume * 1.5).toFixed(0)}</span>
                    </div>
                    <div className="p-4 bg-white dark:bg-card border border-border/60 rounded-xl shadow-sm transition-all hover:shadow-md">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block mb-1">COURIER & DELIVERY SAVED</span>
                      <span className="text-xl font-bold text-foreground font-mono">${(calcDocVolume * 8.5).toFixed(0)}</span>
                    </div>
                    <div className="p-4 bg-white dark:bg-card border border-border/60 rounded-xl shadow-sm transition-all hover:shadow-md">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block mb-1">ADMIN LABOR HOURS SAVED</span>
                      <span className="text-xl font-bold text-foreground font-mono">{(calcDocVolume * 0.8).toFixed(1)} hrs</span>
                    </div>
                    <div className="p-4 bg-white dark:bg-card border border-[#22c55e]/20 bg-[#22c55e]/[0.02] rounded-xl shadow-sm">
                      <span className="text-[10px] text-[#22c55e] font-bold block mb-1">EZSIGNNOW COST</span>
                      <span className="text-xl font-bold text-[#22c55e] font-mono">$2 / mo</span>
                    </div>
                  </div>

                  <div className="p-5 bg-emerald-500/[0.05] dark:bg-emerald-500/[0.03] border border-emerald-500/20 rounded-2xl flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5 leading-none">TOTAL COMBINED SAAS SAVINGS</span>
                    <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                      ${(calcDocVolume * 1.5 + calcDocVolume * 8.5 + calcDocVolume * 22).toFixed(0)}<span className="text-lg font-semibold">/mo</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-2 font-medium">
                      That amounts to <strong className="text-foreground dark:text-white font-bold">${((calcDocVolume * 1.5 + calcDocVolume * 8.5 + calcDocVolume * 22) * 12).toLocaleString()}</strong> saved per year!
                    </span>
                  </div>
                </div>
              )}

              {/* Certified Legal Certificate (security tab) */}
              {activeFeatureTab === "security" && (
                <div className="w-full flex flex-col gap-4 items-stretch text-left animate-[fadeIn_0.4s_ease-out]">
                  {/* Glowing Completion Certificate Frame */}
                  <div className="w-full bg-white dark:bg-slate-950 border-2 border-amber-500/25 dark:border-amber-500/15 rounded-2xl p-5 shadow-[0_0_25px_rgba(245,158,11,0.18)] flex flex-col justify-between relative overflow-hidden transition-all duration-300">
                    
                    {/* Glowing Stamp Badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[8.5px] font-black uppercase tracking-wider animate-pulse">
                      <FontAwesomeIcon icon={faShield} className="h-3 w-3" />
                      ESIGN & UETA CERTIFIED
                    </div>

                    <div className="space-y-4 text-left select-none">
                      {/* Header block with Logo and Title */}
                      <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex justify-between items-end">
                        <div>
                          <span className="text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none font-mono">EZSIGNNOW COMPLIANCE PORTAL</span>
                          <h4 className="text-xs font-bold text-foreground mt-1">CERTIFIED DIGITAL COMPLETION CERTIFICATE</h4>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                          <span>LIVE TRACKER ACTIVE</span>
                        </div>
                      </div>

                      {/* Dynamic Geolocation Live Stats */}
                      <div className="grid grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-border/80">
                        <div className="space-y-1">
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase">SIGNATURE ORIGIN</span>
                          <span className="text-xs font-bold text-foreground block flex items-center gap-1">
                            <FontAwesomeIcon icon={faMapPin} className="h-3.5 w-3.5 text-amber-500" />
                            {activeHub.city}, {activeHub.country}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase">GPS COORDINATES</span>
                          <span className="text-[11px] font-mono text-foreground font-semibold block font-sans">
                            Lat: {displayLat.toFixed(6)}°<br />
                            Lng: {displayLng.toFixed(6)}°
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase">PUBLIC IP ADDRESS</span>
                          <span className="text-xs font-mono font-bold text-foreground block">
                            {activeHub.ip}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase">ISP / PROVIDER</span>
                          <span className="text-xs font-semibold text-foreground block truncate">
                            {activeHub.provider}
                          </span>
                        </div>
                      </div>

                      {/* Audit Details */}
                      <div className="space-y-2.5 text-[10px] leading-relaxed border-t border-slate-100 dark:border-slate-850 pt-3">
                        <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 p-2 rounded border border-border/50">
                          <div className="min-w-0 flex-grow">
                            <strong className="text-foreground dark:text-white font-bold block mb-0.5">Secure Document Fingerprint</strong>
                            <code className="text-[9.5px] font-mono text-muted-foreground bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded truncate block">
                              {activeHub.hash}
                            </code>
                          </div>
                          <FontAwesomeIcon icon={faLock} className="h-4 w-4 text-emerald-500 shrink-0 ml-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[9px] text-muted-foreground font-semibold">
                          <div>Signer Email: owner@techladder.com.au</div>
                          <div className="text-right">Timestamp: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-850 pt-2.5 mt-3.5 flex items-center justify-between text-[8.5px] font-bold text-slate-400 select-none">
                      <span>AUDIT SERIAL: #ez-928-19c-{geoHubIndex}a7</span>
                      <button 
                        onClick={() => setGeoHubIndex((prev) => (prev + 1) % globalHubs.length)}
                        className="text-amber-500 hover:text-amber-600 flex items-center gap-1 uppercase tracking-wider font-extrabold cursor-pointer transition-colors"
                      >
                        <FontAwesomeIcon icon={faArrowsRotate} className="h-3 w-3 animate-spin-slow" />
                        Force Cycle Hub
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* Chronological Activity timeline (tracking/satisfaction tab) */}
              {activeFeatureTab === "satisfaction" && (
                <div className="w-full space-y-5 text-left animate-[fadeIn_0.4s_ease-out]">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-border/80">
                    <div>
                      <span className="text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase block">SIMULATOR LAB</span>
                      <h4 className="text-xs font-extrabold text-foreground">Trigger Document Actions Below:</h4>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5">
                      <Button 
                        onClick={() => addSimulatedEvent("view")}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[9px] font-bold uppercase tracking-wider gap-1 border-border hover:bg-slate-100 hover:text-foreground"
                      >
                        <FontAwesomeIcon icon={faEye} className="h-3 w-3 text-sky-500" />
                        View
                      </Button>
                      <Button 
                        onClick={() => addSimulatedEvent("sms")}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[9px] font-bold uppercase tracking-wider gap-1 border-border hover:bg-slate-100 hover:text-foreground"
                      >
                        <FontAwesomeIcon icon={faPaperPlane} className="h-3 w-3 text-amber-500" />
                        SMS OTP
                      </Button>
                      <Button 
                        onClick={() => addSimulatedEvent("sign")}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[9px] font-bold uppercase tracking-wider gap-1 border-border hover:bg-slate-100 hover:text-foreground"
                      >
                        <FontAwesomeIcon icon={faFileSignature} className="h-3 w-3 text-emerald-500" />
                        Sign
                      </Button>
                      <Button 
                        onClick={() => addSimulatedEvent("lock")}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-[9px] font-bold uppercase tracking-wider gap-1 border-border hover:bg-slate-100 hover:text-foreground"
                      >
                        <FontAwesomeIcon icon={faLock} className="h-3 w-3 text-primary" />
                        Seal
                      </Button>
                    </div>
                  </div>

                  {/* Log Dispatch Feed */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 select-none w-full">
                    {activityLogs.map((log, index) => {
                      const isNew = index === 0;
                      return (
                        <div 
                          key={log.id}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 ${
                            isNew 
                              ? "bg-primary/[0.04] dark:bg-primary/[0.02] border-primary/45 shadow-[0_0_15px_rgba(37,143,251,0.08)] scale-[1.01]" 
                              : "bg-white dark:bg-slate-950 border-border/80"
                          }`}
                        >
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                            log.type === "view" ? "bg-sky-500/10 text-sky-500" :
                            log.type === "secure" ? "bg-amber-500/10 text-amber-500" :
                            log.type === "sign" ? "bg-emerald-500/10 text-emerald-500" :
                            log.type === "lock" ? "bg-primary/10 text-primary animate-pulse" :
                            log.type === "cloud" ? "bg-purple-500/10 text-purple-500" :
                            "bg-slate-500/10 text-slate-500"
                          }`}>
                            {log.type === "view" && <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5" />}
                            {log.type === "secure" && <FontAwesomeIcon icon={faShield} className="h-3.5 w-3.5" />}
                            {log.type === "sign" && <FontAwesomeIcon icon={faFileSignature} className="h-3.5 w-3.5" />}
                            {log.type === "lock" && <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5" />}
                            {log.type === "cloud" && <FontAwesomeIcon icon={faCloud} className="h-3.5 w-3.5" />}
                            {log.type === "system" && <FontAwesomeIcon icon={faServer} className="h-3.5 w-3.5" />}
                            {log.type === "invite" && <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5" />}
                          </div>

                          <div className="flex-grow text-left space-y-0.5 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <h5 className="text-[11px] font-black text-foreground truncate">
                                {log.event}
                              </h5>
                              <span className="text-[8.5px] text-muted-foreground shrink-0 font-mono">
                                {log.time}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-normal truncate">
                              {log.details}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cloud Integration folders slide-in simulator (workflows tab) */}
              {activeFeatureTab === "workflows" && (
                <div className="w-full space-y-6 text-left animate-[fadeIn_0.4s_ease-out]">
                  {/* Select Destination Cloud */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/85 pb-3">
                    <div>
                      <span className="text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase block">INTEGRATION SYNC ENGINE</span>
                      <h4 className="text-xs font-extrabold text-foreground">Select Cloud Destination:</h4>
                    </div>
                    
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-border/50">
                      {[
                        { id: "gdrive", label: "Google Drive" },
                        { id: "dropbox", label: "Dropbox" },
                        { id: "onedrive", label: "OneDrive" }
                      ].map((cloudItem) => (
                        <button
                          key={cloudItem.id}
                          onClick={() => {
                            setSelectedCloud(cloudItem.id as any);
                            setArchiveStatus("idle");
                            setArchiveProgress(0);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                            selectedCloud === cloudItem.id
                              ? "bg-white dark:bg-slate-850 shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {cloudItem.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Simulation Theater */}
                  <div className="h-[210px] w-full bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-border/60 flex items-center justify-between p-6 relative overflow-hidden">
                    
                    {/* Vault (Left side) */}
                    <div className="flex flex-col items-center gap-2.5 z-10 shrink-0 select-none">
                      <div className="h-16 w-12 bg-white dark:bg-slate-950 rounded-xl border-2 border-primary/45 shadow-lg flex flex-col justify-between p-1.5 relative">
                        {/* Little pdf header */}
                        <div className="h-2 w-full bg-primary/20 rounded-sm"></div>
                        <div className="h-6 w-full flex items-center justify-center text-primary font-bold text-[8px] italic font-serif">
                          PDF
                        </div>
                        <div className="h-1.5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-sm mx-auto"></div>
                      </div>
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase">EZSignNow Vault</span>
                    </div>

                    {/* Laser Path / Loading Pipeline */}
                    <div className="flex-grow mx-4 relative h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex items-center justify-center">
                      {archiveStatus === "syncing" && (
                        <div 
                          className="absolute left-0 top-0 h-full bg-[#1e293b] transition-all duration-75"
                          style={{ width: `${archiveProgress}%` }}
                        />
                      )}
                      {archiveStatus === "done" && (
                        <div className="absolute inset-0 bg-emerald-500" />
                      )}
                    </div>

                    {/* Animated Floating Document Node */}
                    {archiveStatus === "syncing" && (
                      <div 
                        className="absolute h-9 w-7 bg-white dark:bg-slate-950 rounded border-2 border-primary shadow-lg flex items-center justify-center text-primary font-bold text-[6px] italic z-20 pointer-events-none transition-all"
                        style={{
                          left: `calc(24px + 12% + (${archiveProgress}% * 0.54))`,
                          top: `calc(50% - 18px)`,
                          transform: `scale(${1 - (archiveProgress / 200)}) rotate(${archiveProgress * 3.6}deg)`,
                          opacity: `${1 - (archiveProgress / 100)}`
                        }}
                      >
                        PDF
                      </div>
                    )}

                    {/* Destination Folders Slot (Right side) */}
                    <div className="flex flex-col items-center gap-2.5 z-10 shrink-0 select-none">
                      <div className={`h-16 w-16 rounded-2xl flex flex-col items-center justify-center shadow-lg border transition-all ${
                        archiveStatus === "done" 
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 scale-[1.04]"
                          : "bg-white dark:bg-slate-950 border-border text-slate-400"
                      }`}>
                        {selectedCloud === "gdrive" && (
                          <svg className="h-7 w-7 text-emerald-600 dark:text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2L2 22h20L12 2z" />
                          </svg>
                        )}
                        {selectedCloud === "dropbox" && (
                          <svg className="h-7 w-7 text-blue-600 dark:text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                          </svg>
                        )}
                        {selectedCloud === "onedrive" && (
                          <FontAwesomeIcon icon={faCloud} className="h-7 w-7 text-sky-500 shrink-0" />
                        )}
                      </div>
                      
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase block">
                        {selectedCloud === "gdrive" ? "Google Drive" : selectedCloud === "dropbox" ? "Dropbox" : "OneDrive"}
                      </span>
                    </div>

                  </div>

                  {/* Synchronization Trigger Panel */}
                  <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-border/80">
                    <div className="text-[10px] text-muted-foreground font-semibold leading-none">
                      {archiveStatus === "idle" && "Ready to trigger simulated transfer."}
                      {archiveStatus === "syncing" && `Syncing... ${archiveProgress}%`}
                      {archiveStatus === "done" && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5 animate-pulse">
                          <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                          ARCHIVED SUCCESSFULLY & COMPLETED
                        </span>
                      )}
                    </div>
                    
                    <Button
                      onClick={startCloudSync}
                      disabled={archiveStatus === "syncing"}
                      size="sm"
                      className="h-8 font-bold text-[9px] uppercase tracking-wider bg-primary hover:bg-primary/95 text-white"
                    >
                      {archiveStatus === "syncing" ? "Syncing..." : archiveStatus === "done" ? "Sync Again" : "Trigger Archive Sync"}
                    </Button>
                  </div>
                </div>
              )}
              
            </div>

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
                to="/security" 
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline hover:gap-2 transition-all"
              >
                Learn more about eSignature's laws
                <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
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
                <FontAwesomeIcon icon={faFileSignature} className="h-6 w-6 text-primary mb-1 animate-pulse" />
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

      {/* Why choose Techladder EZSignNow Section */}
      <section className="py-24 bg-[#f8fafc] dark:bg-slate-950 border-b border-border/40 overflow-hidden transition-colors duration-250">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            
            {/* Left Column Copywriting */}
            <div className="space-y-7 text-left max-w-xl">
              <span className="text-xs font-bold text-[#22c55e] uppercase tracking-widest leading-none block">
                BE READY TO GET MORE
              </span>
              
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white leading-[1.1] tracking-tight">
                Why choose <span className="text-slate-800 dark:text-white">Techladder</span> <span className="text-[#22c55e]">EZSignNow</span>
              </h2>
              
              <div className="space-y-6 pt-2">
                {/* Point 1 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-[#22c55e] transition-colors">
                    <FontAwesomeIcon icon={faClock} className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Free 7-day trial. <span className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed block mt-1">Choose the plan you need and try it risk-free.</span>
                    </h3>
                  </div>
                </div>

                {/* Point 2 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-[#22c55e] transition-colors">
                    <FontAwesomeIcon icon={faFileLines} className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Honest pricing for full-featured plans. <span className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed block mt-1">Techladder EZSignNow offers subscription plans with no overages or hidden fees at renewal.</span>
                    </h3>
                  </div>
                </div>

                {/* Point 3 */}
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm text-[#22c55e] transition-colors">
                    <FontAwesomeIcon icon={faShield} className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Enterprise-grade security. <span className="text-slate-500 dark:text-slate-400 font-semibold leading-relaxed block mt-1">Techladder EZSignNow helps you comply with global security standards.</span>
                    </h3>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={() => navigate("/try-trial")}
                  size="lg"
                  className="rounded-full bg-[#22c55e] hover:bg-[#1d7ee6] text-white font-bold text-sm px-8 h-12 shadow-md shadow-[#22c55e]/20"
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
                    <div className="flex-1 h-9 rounded-lg border border-[#22c55e] bg-[#22c55e]/[0.02] flex items-center justify-center p-2 relative">
                      {/* Animated cursive signature representation */}
                      <span className="text-xs italic text-[#22c55e] font-serif font-bold animate-pulse select-none">
                        Joe Thomas
                      </span>
                    </div>
                  </div>

                  {/* Company field block */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase w-12 text-left">Company</span>
                    {/* Pulsing Drag Target Field */}
                    <div className="flex-1 h-9 rounded-lg border border-dashed border-[#1e293b] bg-[#1e293b]/5 flex items-center justify-center relative select-none animate-pulse">
                      <span className="text-[9px] font-extrabold text-[#1e293b] uppercase tracking-wider flex items-center gap-1 select-none">
                        <FontAwesomeIcon icon={faFileSignature} className="h-3 w-3" />
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
                    <div className="h-7 w-full rounded-lg bg-[#22c55e] text-white flex items-center gap-2 px-2.5 shadow-sm text-[9px] font-bold">
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
                      { icon: faFileSignature, label: "Signature Field" },
                      { icon: faFileLines, label: "Text Field" },
                      { icon: faCalendarDays, label: "Date/Time Field" },
                      { icon: faSquareCheck, label: "Checkbox Field" },
                      { icon: faUserCheck, label: "Initials Field" },
                    ].map((tool, idx) => {
                      const Icon = tool.icon;
                      const isDraggingMock = tool.label === "Signature Field";
                      return (
                        <div
                          key={idx}
                          className={`h-7 rounded border flex items-center gap-2 px-2 text-[9px] font-semibold transition-all ${
                            isDraggingMock
                              ? "border-[#1e293b] bg-[#1e293b]/5 text-[#1e293b] shadow-sm translate-x-[-2px] animate-pulse"
                              : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          <FontAwesomeIcon icon={Icon} className={`h-3 w-3 shrink-0 ${isDraggingMock ? 'text-[#1e293b]' : 'text-slate-400'}`} />
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
                  { icon: faTableCellsLarge, title: "Shared Team Templates", desc: "Share standard NDAs and independent contractor agreements across your department." },
                  { icon: faUserCheck, title: "Role-Based Delegation", desc: "Assign specific roles to team members: creator, editor, signer, or manager." },
                  { icon: faBuildingColumns, title: "Company Brand Customization", desc: "Upload your company logo, set custom brand email layouts, and create branded portals." }
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-4 items-start">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
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
                { icon: faClock, value: "62%", label: "Faster Contract Close" },
                { icon: faFileLines, value: "10K+", label: "Signed Documents" },
                { icon: faGlobe, value: "24/7", label: "Global Legal Legality" },
                { icon: faShield, value: "Bank-Grade", label: "SSL Data Security" },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm hover:scale-[1.02] transition-all"
                >
                  <FontAwesomeIcon icon={stat.icon} className="mx-auto h-8 w-8 text-primary" />
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
                        <FontAwesomeIcon icon={faCheck} className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
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

          {/* Small Direct Comparison Grid */}
          <div className="mt-16 bg-card/50 backdrop-blur-md border border-border/80 rounded-3xl p-6 md:p-8 max-w-4xl mx-auto shadow-lg text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-border/50">
              <div>
                <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  <FontAwesomeIcon icon={faFire} className="h-5 w-5 text-primary animate-pulse" />
                  EZSignNow vs signNow: At a Glance
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  See how the standard Business plans compare directly.
                </p>
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/95 text-white font-bold text-xs self-start md:self-center" asChild>
                <Link to="/compare/signnow">
                  See Full Head-to-Head Details
                  <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 text-center">
              {[
                { label: "Seat Cost", ez: "$5 / mo", comp: "$20 / mo" },
                { label: "Envelopes", ez: "Unlimited", comp: "Restricted" },
                { label: "SMS OTP", ez: "Free", comp: "$10+ addon" },
                { label: "Custom Logo", ez: "Included", comp: "$30/mo tier" },
                { label: "Stripe Billing", ez: "Standard", comp: "Enterprise" }
              ].map((item, idx) => (
                <div key={idx} className="bg-background/85 dark:bg-slate-900/80 rounded-2xl p-4 border border-border/60 shadow-sm flex flex-col justify-between hover:scale-[1.03] transition-all">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">{item.label}</span>
                  <div className="space-y-1">
                    <div className="bg-primary/5 rounded-lg py-1 px-2 border border-primary/20">
                      <span className="text-xs font-bold text-primary flex items-center justify-center gap-1">
                        <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-emerald-500" />
                        {item.ez}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/80 line-through">
                      {item.comp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Forms Library Promotion Card */}
          <div className="mt-12 bg-gradient-to-r from-[#1e293b]/10 to-primary/10 border border-[#1e293b]/20 rounded-3xl p-6 md:p-8 max-w-4xl mx-auto shadow-md text-left flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/40 transition-colors">
            <div className="space-y-2 max-w-xl">
              <span className="inline-flex items-center gap-1 bg-[#1e293b]/20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-primary border border-primary/10">
                Templates Hub
              </span>
              <h3 className="text-xl font-extrabold text-foreground">
                Browse Vetted, Signable Form Templates
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Access standard IRS W-9s, NDAs, Residential Leases, and Freelance Consulting Agreements. Preview, customize, and sign them online in seconds without any paper, print, or shipping costs.
              </p>
            </div>
            <Button size="lg" className="bg-[#1e293b] hover:bg-[#1e293b]/90 text-white font-bold text-xs shrink-0 self-start md:self-center" asChild>
              <Link to="/forms">
                Explore Forms Library
                <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
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
                    <FontAwesomeIcon icon={faCircleQuestion} className="h-4 w-4 text-primary flex-shrink-0" />
                    {faq.q}
                  </span>
                  <FontAwesomeIcon icon={faChevronDown} className={`h-5 w-5 text-muted-foreground transition-transform duration-300 flex-shrink-0 ${
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
                <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-4 w-4" />
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



