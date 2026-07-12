import { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHalved,
  faScaleBalanced,
  faLock,
  faMapPin,
  faServer,
  faCircleCheck,
  faFileSignature,
  faWandMagicSparkles,
  faArrowRight,
  faDatabase,
  faEye,
  faHeartPulse,
  faCircleExclamation
} from "@fortawesome/free-solid-svg-icons";

export default function Security() {
  const [activeTab, setActiveTab] = useState<"compliance" | "encryption" | "auditing">("compliance");

  // Simulated live verification logs
  const securityCertificates = [
    { name: "US ESIGN Act of 2000", standard: "Federal Admissibility", status: "Compliant" },
    { name: "Uniform Electronic Transactions Act (UETA)", standard: "US State Laws", status: "Compliant" },
    { name: "European Union eIDAS (No 910/2014)", standard: "Advanced Electronic Signatures", status: "Compliant" },
    { name: "HIPAA Privacy Rule Alignment", standard: "Protected Health Info (PHI)", status: "Aligned" },
    { name: "SOC 2 Type II Security Standard", standard: "Trust Services Criteria", status: "Aligned" }
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-background">
      <SEO 
        title="Security & Legal Compliance Standards | EZSignNow"
        description="Learn about the legally binding electronic signature compliance, cryptographic document seals, bank-grade encryption, and secure geolocations auditing that powers EZSignNow."
        keywords="e-signature compliance, legally binding digital signature, ESIGN Act compliance, UETA digital signature, secure electronic contract, court admissible e-signature"
        faqs={[
          {
            question: "Are e-signatures created on EZSignNow court-admissible?",
            answer: "Yes, signatures captured on EZSignNow comply fully with the US ESIGN Act of 2000 and the Uniform Electronic Transactions Act (UETA). They hold the identical legal standing, weight, and enforceability as standard ink signatures."
          },
          {
            question: "How does EZSignNow ensure my documents cannot be tampered with?",
            answer: "Upon signing completion, EZSignNow locks the PDF document payload with a mathematical SHA-256 cryptographic hash seal. Any subsequent edit, page insertion, or content modification immediately breaks the seal, rendering the digital audit certificate void."
          }
        ]}
      />
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28 bg-gradient-to-br from-slate-900 via-secondary to-slate-950 text-white border-b border-border/10">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#1e293b]/10 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 max-w-6xl relative z-10 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary-foreground mb-6 uppercase tracking-wider">
            <FontAwesomeIcon icon={faShieldHalved} className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span>Bank-Grade Trust Standard</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">
            Security, Trust, and <br />
            <span className="text-primary bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Legal Compliance</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mb-10 leading-relaxed">
            Every signature captured on EZSignNow is court-admissible, fully encrypted at rest and in transit, and sealed with advanced cryptographic hashes to protect your contracts from tampering.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 max-w-md">
            <Button size="lg" className="h-12 px-8 text-sm font-bold bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20" asChild>
              <Link to="/try-for-free">
                Create Free Account
                <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" className="h-12 px-8 text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md" asChild>
              <Link to="/compare/signnow">Compare Security Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Badges Matrix */}
      <section className="py-12 bg-white dark:bg-card border-b border-border/40">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-85">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Vetted and Aligned with</div>
            <div className="text-sm font-black tracking-tight flex items-center gap-1.5"><FontAwesomeIcon icon={faScaleBalanced} className="h-4.5 w-4.5 text-primary" /> ESIGN Act</div>
            <div className="text-sm font-black tracking-tight flex items-center gap-1.5"><FontAwesomeIcon icon={faCircleCheck} className="h-4.5 w-4.5 text-emerald-500" /> UETA Compliant</div>
            <div className="text-sm font-black tracking-tight flex items-center gap-1.5"><FontAwesomeIcon icon={faLock} className="h-4.5 w-4.5 text-indigo-500" /> eIDAS Compliant</div>
            <div className="text-sm font-black tracking-tight flex items-center gap-1.5"><FontAwesomeIcon icon={faServer} className="h-4.5 w-4.5 text-rose-500" /> HIPAA Aligned</div>
          </div>
        </div>
      </section>

      {/* Interactive Feature Pillars Swapper */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
              <FontAwesomeIcon icon={faWandMagicSparkles} className="h-3.5 w-3.5" />
              Security Architecture
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-foreground sm:text-4xl">
              Strict Protections for High-Stakes Operations
            </h2>
            <p className="mt-4 text-md text-muted-foreground max-w-xl mx-auto">
              We leverage bank-grade infrastructures, millisecond geo-audits, and decentralized cryptography to keep document pipelines secure.
            </p>

            {/* Segmented Selector Tabs */}
            <div className="flex bg-white dark:bg-card border border-border rounded-full p-1 max-w-md mx-auto mt-8 shadow-sm justify-between">
              {[
                { id: "compliance", label: "Legal Compliance", icon: <FontAwesomeIcon icon={faScaleBalanced} className="h-4 w-4" /> },
                { id: "encryption", label: "Data Encryption", icon: <FontAwesomeIcon icon={faLock} className="h-4 w-4" /> },
                { id: "auditing", label: "Audit Tracking", icon: <FontAwesomeIcon icon={faMapPin} className="h-4 w-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                    activeTab === tab.id 
                      ? "bg-primary text-white shadow" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Content Columns */}
          <div className="bg-white dark:bg-card border border-border/80 rounded-3xl p-8 md:p-12 shadow-xl text-left min-h-[400px] flex items-center">
            {activeTab === "compliance" && (
              <div className="grid gap-8 md:grid-cols-12 items-center w-full">
                <div className="md:col-span-7 space-y-6">
                  <h3 className="text-2xl font-black text-foreground">Court-Admissible Legal Standings</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Under the federal Electronic Signatures in Global and National Commerce Act (ESIGN) of 2000 and the Uniform Electronic Transactions Act (UETA) in 49 states, electronic signatures carry the identical legal weight and enforceability as standard hand-written signatures in all civil and criminal courts.
                  </p>
                  
                  <div className="space-y-3 pt-2">
                    {[
                      { title: "Intent & Consent", desc: "Explicit signer confirmation checkbox required prior to unlocking active document canvases." },
                      { title: "Tamper Evidence Protection", desc: "PDF files are sealed with secure SHA-256 hash digests dynamically, locking modifications." },
                      { title: "eIDAS Compliance Standards", desc: "Satisfies Advanced Electronic Signature requirements across all EU member states." }
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <FontAwesomeIcon icon={faCircleCheck} className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-foreground">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-5 bg-slate-50 dark:bg-accent/10 border border-border rounded-2xl p-6 space-y-4">
                  <h4 className="font-extrabold text-sm uppercase text-slate-400 tracking-wider">Compliance Status Matrix</h4>
                  <div className="space-y-3">
                    {securityCertificates.map((cert, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs pb-2 border-b border-border/40 last:border-0 last:pb-0">
                        <div>
                          <p className="font-bold text-foreground">{cert.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{cert.standard}</p>
                        </div>
                        <span className="inline-flex px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full">
                          {cert.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "encryption" && (
              <div className="grid gap-8 md:grid-cols-12 items-center w-full">
                <div className="md:col-span-7 space-y-6">
                  <h3 className="text-2xl font-black text-foreground">Bank-Grade Infrastructure & Data Seals</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We treat your legal documents with absolute isolation. All PDF contracts are stored inside private, securely structured Supabase storage buckets protected by advanced row-level security (RLS) policies.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div className="bg-slate-50 dark:bg-accent/5 border border-border rounded-xl p-4 text-left">
                      <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-indigo-950/20 text-slate-600 flex items-center justify-center mb-3">
                        <FontAwesomeIcon icon={faLock} className="h-4.5 w-4.5" />
                      </div>
                      <p className="text-xs font-bold text-foreground">AES-256 Protection</p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">All active contracts, databases, and logs are encrypted at rest using Advanced Encryption Standards.</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-accent/5 border border-border rounded-xl p-4 text-left">
                      <div className="h-8 w-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 flex items-center justify-center mb-3">
                        <FontAwesomeIcon icon={faDatabase} className="h-4.5 w-4.5" />
                      </div>
                      <p className="text-xs font-bold text-foreground">SSL/TLS Transit</p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">All data transfer between client browsers and server API nodes uses HTTPS TLS 1.3 cryptographic pipelines.</p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-5 bg-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-lg border border-primary/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                  <h4 className="font-extrabold text-xs uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faHeartPulse} className="h-3.5 w-3.5 text-primary" />
                    Cryptographic Seal Verification
                  </h4>
                  <div className="space-y-3 font-mono text-[10px] text-slate-300">
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-white/5">
                      <span className="text-primary font-black uppercase text-[8px] block mb-1">Mathematical Hash Alg</span>
                      <p className="text-emerald-400">SHA-256 Cryptographic Digest</p>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-lg border border-white/5">
                      <span className="text-slate-400 font-black uppercase text-[8px] block mb-1">Encrypted Payload Digest</span>
                      <p className="break-all font-mono">f849cda99de720fc8f93f908ec2ee7334a4be71cd</p>
                    </div>
                    <div className="flex gap-2 items-center bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-emerald-400 font-sans text-xs">
                      <FontAwesomeIcon icon={faCircleCheck} className="h-4 w-4 shrink-0" />
                      <span>Integrity Verified: Untampered PDF Payload</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "auditing" && (
              <div className="grid gap-8 md:grid-cols-12 items-center w-full">
                <div className="md:col-span-7 space-y-6">
                  <h3 className="text-2xl font-black text-foreground">Millisecond IP & Geolocation Auditing</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Every signature request, document view, access gate authentication, and signature seal dispatches a permanent, immutable audit trail event. This ensures high court admissibility, capturing essential forensic metadata.
                  </p>

                  <div className="space-y-3 pt-2">
                    {[
                      { icon: <FontAwesomeIcon icon={faMapPin} className="h-4 w-4 text-rose-500" />, title: "IP Geolocation Resolving", desc: "Queries global network carrier coordinates to record the precise city and coordinates of the signatory." },
                      { icon: <FontAwesomeIcon icon={faHeartPulse} className="h-4 w-4 text-cyan-500" />, title: "Atomic Timestamps", desc: "Every transaction step is logged securely down to the exact millisecond using NTP network servers." },
                      { icon: <FontAwesomeIcon icon={faEye} className="h-4 w-4 text-emerald-500" />, title: "Forensic Metadata capturing", desc: "Logs signer operating systems, browser engines, network carriers, and reference paths." }
                    ].map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-accent/15 border border-border flex items-center justify-center shrink-0">
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-5 bg-white dark:bg-card border border-border/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between max-h-[350px]">
                  <h4 className="font-extrabold text-xs uppercase text-slate-400 tracking-wider">Live Audit Event Dispatcher</h4>
                  
                  <div className="space-y-3 mt-4 overflow-y-auto max-h-[220px] font-mono text-[9px] text-left leading-normal">
                    {[
                      { action: "DOCUMENT CREATED", text: "Envelope generated by owner meets@example.com", time: "18:49:01" },
                      { action: "PASSCODE VERIFIED", text: "Signatory authenticated successfully using 2FA OTP code", time: "18:49:15" },
                      { action: "GEOLOCATION STAMPED", text: "Logged: Sydney, AU. IP: 202.14.152.12", time: "18:49:22" },
                      { action: "DOCUMENT SEALED", text: "SHA-256 cryptographic seal applied dynamically", time: "18:49:33" }
                    ].map((log, idx) => (
                      <div key={idx} className="border-b border-border/30 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between text-[8px] font-bold text-primary">
                          <span>{log.action}</span>
                          <span className="text-slate-400">{log.time}</span>
                        </div>
                        <p className="text-slate-650 mt-0.5">{log.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trust Seals and Secure FAQ */}
      <section className="py-24 bg-slate-50 dark:bg-background border-t border-border/40">
        <div className="container mx-auto px-4 max-w-4xl text-left space-y-16">
          <div className="bg-white dark:bg-card rounded-3xl p-8 border border-border/80 shadow-md flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-slate-50 border border-indigo-150 text-slate-600 uppercase tracking-widest">
                Data Sovereignty
              </span>
              <h3 className="text-xl font-extrabold text-foreground">HIPAA & GDPR Privacy Protection</h3>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                We satisfy all key global parameters for medical, legal, and banking privacy mandates. Documents are fully sealed in transition and rest securely within your local sovereign partitions.
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
              <Button size="lg" className="bg-primary hover:bg-primary/95 text-white font-bold text-xs" asChild>
                <Link to="/try-for-free">Claim Unlimited Envelopes</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-xs border-border font-semibold" asChild>
                <Link to="/compare/signnow">Switch & Save 75% Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Security Incident Warning Card */}
      <section className="pb-24 bg-slate-50 dark:bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 flex gap-4 items-start text-left">
            <FontAwesomeIcon icon={faCircleExclamation} className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="text-xs font-black uppercase text-red-500 tracking-wider">A Note on Legality</h4>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Electronic signature validity is universally court-admissible under ESIGN & UETA standards. However, local regulations may require physical signing (wet ink) for high-stakes filings like Wills, Trusts, Divorce Decrees, or Power of Attorney documentations. Always verify local state and county courthouse procedures.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}



