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

import { HomeHero } from "@/components/landing/HomeHero";
import { HomeSections } from "@/components/landing/HomeSections";
import { HomePricing, HomeFaq, HomeCta } from "@/components/landing/HomePricingFaq";

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
        newEvent.details = "Secure 6-digit code routed via Zoho SMTP relay.";
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
      {/* Top announcement bar */}
      <div className="bg-[#172d07] text-[#e6f5d3] py-2.5 px-4 text-center text-sm relative z-50 flex items-center justify-center gap-2.5">
        <span className="rounded-md bg-[#73c41d] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#172d07]">Free</span>
        <span>EZSignNow is free forever for personal use. Business plans from $4 per sender.</span>
        <a href="#pricing" className="font-semibold text-white underline-offset-2 hover:underline">See pricing →</a>
      </div>

      <Navbar />
      
      <HomeHero />

      <HomeSections />

      <HomePricing />
      <HomeFaq faqs={faqs} />
      <HomeCta />

      <Footer />
    </div>
  );
}



