import { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SEO } from "@/components/SEO";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faXmark,
  faCircleQuestion,
  faArrowRight,
  faWandMagicSparkles,
  faDollarSign,
  faUsers,
  faShieldHalved,
  faBolt,
  faClock,
  faAward,
  faChevronRight,
  faCalculator,
  faFire
} from "@fortawesome/free-solid-svg-icons";
import { logoDevUrl, BRAND_DOMAINS } from "@/utils/logoDev";
import { BrandLogoImg } from "@/components/ui/brand-logo-img";

export default function CompareSignNow() {
  // Slider states
  const [users, setUsers] = useState<number>(5);
  
  // Pricing assumptions
  const signNowPricePerUser = 20;
  const ezSignNowPricePerUser = 5;

  const signNowTotal = users * signNowPricePerUser;
  const ezSignNowTotal = users * ezSignNowPricePerUser;
  const monthlySavings = signNowTotal - ezSignNowTotal;
  const annualSavings = monthlySavings * 12;

  // Comparison items
  const matrixItems = [
    {
      feature: "Monthly Cost (per user)",
      ezSignNow: "$5 / mo",
      signNow: "$20 / mo",
      winner: "ez",
      desc: "Get full business capabilities without paying premium legacy markups."
    },
    {
      feature: "Active Envelopes / Sending",
      ezSignNow: "Unlimited",
      signNow: "Restricted / Volume Caps",
      winner: "ez",
      desc: "Send as many signature requests as your legal business needs without overage fees."
    },
    {
      feature: "Custom Branding & Logos",
      ezSignNow: "Included ($5/mo plan)",
      signNow: "Enterprise tier only ($30+/mo)",
      winner: "ez",
      desc: "Apply your corporate branding, colors, and logos on all client-facing sign pages."
    },
    {
      feature: "Secure Passcode / SMS Access",
      ezSignNow: "Included Free",
      signNow: "Add-on / High-Tier plan required",
      winner: "ez",
      desc: "Protect sensitive legal documents with dynamic 6-digit access codes."
    },
    {
      feature: "Stripe & App Integrations",
      ezSignNow: "Built-in / Standard",
      signNow: "Requires Integration Upgrades",
      winner: "ez",
      desc: "Seamless payment gates and picker imports included with zero complex setups."
    },
    {
      feature: "Digital Audit Trail & Geolocation",
      ezSignNow: "Millisecond Cert & IP Track",
      signNow: "Standard Trails",
      winner: "ez",
      desc: "Every signed document has embedded tamper-proof SHA-256 digital signature certificates."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-background">
      <SEO 
        title="ezsignnow vs signNow: The Smart, Cheap $5/mo Alternative"
        description="Why pay $20/mo per user for signNow? Switch to EZSignNow for just $5/mo. Get unlimited document envelopes, custom branding, and legal-grade digital certificates."
        keywords="signNow alternative, signNow competitor, cheap e-signature, signNow vs ezsignnow, free electronic signature templates"
        faqs={[
          {
            question: "Why is EZSignNow cheaper than signNow?",
            answer: "EZSignNow does not charge expensive corporate overhead. We offer identical compliant signature security, unlimited templates, and geolocations for just $5/mo compared to signNow's $20/mo tiers."
          },
          {
            question: "Is it easy to migrate my templates from signNow to EZSignNow?",
            answer: "Yes, our layout importer recreates all your signNow templates automatically in under 5 minutes, saving hours of manual field setup."
          }
        ]}
      />
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-28 bg-gradient-to-br from-slate-900 via-secondary to-slate-950 text-white border-b border-border/10">
        {/* Glassmorphic Ambient Highlights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#1e293b]/15 blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 max-w-7xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary-foreground mb-6 uppercase tracking-wider">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span>The Smart Alternative for 2026</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">
            Ditch <span className="text-rose-400 line-through decoration-rose-500/80 decoration-4">signNow</span>. <br className="sm:hidden" />
            Switch to <span className="text-primary bg-clip-text bg-gradient-to-r from-primary to-cyan-400">EZSignNow</span>.
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Why pay <span className="font-extrabold text-white">$20/user/mo</span> for basic document signing? Switch your legal templates to EZSignNow for just <span className="font-extrabold text-primary">$5/mo</span> with unlimited envelopes, secure passcodes, and direct Stripe payments.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto">
            <Button size="lg" className="h-12 px-8 text-sm font-bold bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20" asChild>
              <Link to="/try-for-free">
                Start Signing Free Now
                <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" className="h-12 px-8 text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md" asChild>
              <a href="#calculator">Compare Savings</a>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="mt-12 pt-10 border-t border-white/5 max-w-4xl mx-auto flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-75">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Trusted by modern firms</div>
            <BrandLogoImg src={logoDevUrl(BRAND_DOMAINS.harvard, 40)} alt="Harvard" className="h-6 w-auto object-contain" fallback={<div className="text-sm font-black tracking-tight">HARVARD Law Review</div>} />
            <BrandLogoImg src={logoDevUrl(BRAND_DOMAINS.stateFarm, 40)} alt="State Farm" className="h-6 w-auto object-contain" fallback={<div className="text-sm font-black tracking-tight text-red-500">StateFarm Legal</div>} />
            <div className="text-sm font-black tracking-tight">COMPASS RE</div>
            <BrandLogoImg src={logoDevUrl(BRAND_DOMAINS.lernerRowe, 40)} alt="Lerner & Rowe" className="h-6 w-auto object-contain" fallback={<div className="text-sm font-black tracking-tight text-slate-300 font-serif">LERNER & ROWE</div>} />
          </div>
        </div>
      </section>

      {/* Interactive Savings Calculator */}
      <section className="py-24 relative" id="calculator">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider">
              <FontAwesomeIcon icon={faCalculator} className="h-3.5 w-3.5" />
              ROI & Cost Comparison
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-foreground sm:text-4xl">
              Calculate Your Real Monthly Savings
            </h2>
            <p className="mt-4 text-md text-muted-foreground max-w-xl mx-auto">
              B2B pricing matrices usually hide actual costs. Drag the slider below to see how much your team saves by dumping signNow.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 items-stretch">
            {/* Slider Control Column */}
            <div className="lg:col-span-7 bg-white dark:bg-card border border-border/80 rounded-3xl p-8 shadow-xl flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 bg-emerald-500/10 text-emerald-600 rounded-bl-3xl flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                <FontAwesomeIcon icon={faFire} className="h-3 w-3 fill-emerald-600" />
                75% Savings Rate
              </div>

              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-1">TEAM ALLOCATION</span>
                  <label className="text-lg font-extrabold text-foreground flex items-center justify-between">
                    <span>Number of Active Users / Team Seats</span>
                    <span className="text-primary font-mono text-2xl font-black">{users} {users === 1 ? "seat" : "seats"}</span>
                  </label>
                </div>

                <div className="pt-2">
                  <Slider 
                    value={[users]}
                    onValueChange={(val) => setUsers(val[0])}
                    min={1}
                    max={100}
                    step={1}
                    className="my-6 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground font-medium px-1">
                    <span>1 User</span>
                    <span>25 Seats</span>
                    <span>50 Seats</span>
                    <span>75 Seats</span>
                    <span>100 Users</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/40">
                  <div className="bg-slate-50 dark:bg-accent/10 rounded-2xl p-4 border border-border/50 text-left">
                    <p className="text-xs text-muted-foreground font-semibold">EZSignNow Pricing</p>
                    <p className="text-lg font-bold text-foreground mt-1">$5<span className="text-xs font-normal text-muted-foreground">/mo per user</span></p>
                  </div>
                  <div className="bg-slate-50 dark:bg-accent/10 rounded-2xl p-4 border border-border/50 text-left">
                    <p className="text-xs text-muted-foreground font-semibold">signNow Pricing</p>
                    <p className="text-lg font-bold text-foreground mt-1">$20<span className="text-xs font-normal text-muted-foreground">/mo per user</span></p>
                  </div>
                </div>
              </div>

              <div className="pt-8 text-xs text-muted-foreground italic flex items-center gap-1.5 justify-center">
                <FontAwesomeIcon icon={faCircleQuestion} className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Calculations based on published signNow standard business tiers in 2026.</span>
              </div>
            </div>

            {/* Results Glassmorphic Banner */}
            <div className="lg:col-span-5 bg-gradient-to-br from-primary via-slate-900 to-secondary text-white rounded-3xl p-8 shadow-xl flex flex-col justify-between relative overflow-hidden border border-primary/20">
              {/* Glassmorphic light effect */}
              <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[1px] pointer-events-none" />
              
              <div>
                <span className="text-[10px] font-bold tracking-widest text-primary-foreground/80 uppercase block mb-1">ANNUAL FINANCIAL IMPACT</span>
                <h3 className="text-xl font-bold mb-6 text-white leading-tight">Your Total Capital Retained</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-baseline border-b border-white/10 pb-3">
                    <span className="text-sm text-slate-300">signNow Cost</span>
                    <span className="text-lg font-mono font-bold text-rose-300">${signNowTotal} / mo</span>
                  </div>
                  <div className="flex justify-between items-baseline border-b border-white/10 pb-3">
                    <span className="text-sm text-slate-300">EZSignNow Cost</span>
                    <span className="text-lg font-mono font-bold text-primary">${ezSignNowTotal} / mo</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-sm text-slate-200 font-bold">Monthly Saved</span>
                    <span className="text-2xl font-mono font-black text-emerald-400">+${monthlySavings} / mo</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 text-left">
                <p className="text-[10px] font-bold tracking-wider text-slate-300 uppercase">YEARLY RETAINED CAPITAL</p>
                <p className="text-4xl font-black text-emerald-400 tracking-tight mt-1 font-mono">${annualSavings.toLocaleString()}</p>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Stop overpaying for standard document templates and cryptographic sealings. Invest this capital back into your business growth.
                </p>

                <Button className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11 text-xs" asChild>
                  <Link to="/try-for-free">Claim Your $5/mo Seats Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Matrix Grid */}
      <section className="py-24 bg-white dark:bg-card border-y border-border/40 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
              <FontAwesomeIcon icon={faAward} className="h-3.5 w-3.5" />
              Feature-by-Feature Showdown
            </span>
            <h2 className="mt-3 text-3xl font-extrabold text-foreground sm:text-4xl">
              Compare EZSignNow vs signNow Head-to-Head
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              See how we provide a more compliant, modern, and cost-effective digital e-signing experience.
            </p>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-3xl border border-border/80 shadow-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-6 text-sm font-bold uppercase tracking-wider">Capability / Feature</th>
                  <th className="p-6 text-sm font-bold uppercase tracking-wider bg-primary text-center">EZSignNow (Enterprise)</th>
                  <th className="p-6 text-sm font-bold uppercase tracking-wider text-center">signNow</th>
                  <th className="p-6 text-sm font-bold uppercase tracking-wider">The Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {matrixItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="p-6">
                      <p className="font-bold text-foreground text-md">{item.feature}</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-normal">{item.desc}</p>
                    </td>
                    <td className="p-6 text-center font-bold text-primary bg-primary/5 border-x border-primary/20">
                      <span className="inline-flex items-center gap-1.5 justify-center">
                        <FontAwesomeIcon icon={faCheck} className="h-4 w-4 text-emerald-500" />
                        {item.ezSignNow}
                      </span>
                    </td>
                    <td className="p-6 text-center font-semibold text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 justify-center">
                        {item.signNow.includes("Enterprise") || item.signNow.includes("Restricted") ? (
                          <FontAwesomeIcon icon={faXmark} className="h-4 w-4 text-rose-500 shrink-0" />
                        ) : null}
                        {item.signNow}
                      </span>
                    </td>
                    <td className="p-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 uppercase tracking-wide">
                        EZSignNow Wins
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-6">
            {matrixItems.map((item, idx) => (
              <div key={idx} className="bg-card rounded-2xl border border-border p-6 text-left space-y-4 shadow-sm">
                <div>
                  <h3 className="font-bold text-foreground text-md">{item.feature}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-normal">{item.desc}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                  <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                    <span className="text-[10px] font-bold text-primary uppercase block mb-1">EZSIGNNOW</span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1">
                      <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-emerald-500" />
                      {item.ezSignNow}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-accent/10 rounded-xl p-3 border border-border/50">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">SIGNNOW</span>
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      {item.signNow.includes("Enterprise") || item.signNow.includes("Restricted") ? (
                        <FontAwesomeIcon icon={faXmark} className="h-3 w-3 text-rose-500" />
                      ) : null}
                      {item.signNow}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Migration CTA Box */}
          <div className="mt-16 bg-slate-900 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-xl border border-white/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 grid md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-8 space-y-4 text-left">
                <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-bold bg-white/10 text-primary-foreground uppercase tracking-widest">
                  MIGRATION PROMISE
                </span>
                <h3 className="text-2xl md:text-3xl font-extrabold">Migrate from signNow in Under 5 Minutes</h3>
                <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
                  Already have templates inside signNow? Our automated team importer downloads your PDF layouts and maps their signature fields over in one click. No manual recreating required!
                </p>
              </div>
              <div className="md:col-span-4 text-right">
                <Button size="lg" className="w-full md:w-auto h-12 px-8 bg-primary hover:bg-primary/95 text-white font-bold" asChild>
                  <Link to="/blog">
                    Read Migration Guide
                    <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Compliance Section */}
      <section className="py-24 bg-slate-50 dark:bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid gap-12 md:grid-cols-3">
            <div className="text-left space-y-3">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <FontAwesomeIcon icon={faShieldHalved} className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-foreground text-lg">100% Legally Compliant</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full compliance with the US ESIGN Act, UETA, and European Union eIDAS standards. Your contracts are fully court-admissible.
              </p>
            </div>
            <div className="text-left space-y-3">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <FontAwesomeIcon icon={faBolt} className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-foreground text-lg">Blazing Fast Audits</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Capture instant millisecond geolocations, public IP stamps, and cryptoseals with every signature event dynamically.
              </p>
            </div>
            <div className="text-left space-y-3">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <FontAwesomeIcon icon={faClock} className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-foreground text-lg">5-Min Support SLA</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Unlike legacy systems with long support lines, our legal agents respond to support tickets in minutes via live chat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 to-transparent pointer-events-none" />
        <div className="container relative mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl font-extrabold sm:text-4xl leading-tight">
            Stop Overpaying signNow Today
          </h2>
          <p className="mt-4 text-md text-slate-300 max-w-xl mx-auto leading-relaxed">
            Upgrade your legal signature pipelines, lock in bank-grade cryptographic certificates, and pay a fraction of standard bills.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" className="h-12 px-8 text-sm font-bold bg-primary hover:bg-primary/95 text-white" asChild>
              <Link to="/try-for-free">Create Free Account</Link>
            </Button>
            <Button size="lg" className="h-12 px-8 text-sm font-bold border-white/20 text-white hover:bg-white/10" variant="outline" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}



