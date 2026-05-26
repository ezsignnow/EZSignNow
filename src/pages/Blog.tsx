import { useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Video, 
  ArrowRight, 
  Calendar, 
  User, 
  Clock, 
  Search, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  Youtube,
  FileText,
  Copy,
  Check
} from "lucide-react";
import { toast } from "sonner";

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"articles" | "youtube">("articles");

  // Blog posts
  const posts = [
    {
      id: 1,
      title: "Why legal agencies are dumping signNow in 2026",
      category: "Market Analysis",
      date: "May 15, 2026",
      readTime: "6 min read",
      author: "Julius Sterling, Legal Tech Lead",
      summary: "Legacy electronic signature suites have stopped innovating while raising prices. Legal firms are discovering that paying $20+/mo per seat for signNow is a massive operational drain, especially when alternatives like EZSignNow provide faster cryptoseals, unlimited envelopes, and identical compliance safeguards for just $5/mo.",
      content: `The legal industry in 2026 is moving faster than ever. Cost-efficiency, security compliance, and frictionless client onboarding are now absolute requirements, not luxury items. Yet, legacy e-signing suites continue to charge exorbitant fees for features that should be standard.

Here are the primary reasons why legal agencies are dumping signNow and transitioning their entire envelope pipelines to EZSignNow this year:

1. Per-Seat Legacy Tax
With signNow, basic plans run upwards of $20 per seat, which quickly scales to hundreds of dollars a month for even small legal teams. EZSignNow offers identical legal-grade e-signing with team dashboard tools starting at just $5/mo.

2. Restrictive Envelope Volumetrics
Firms are tired of being penalized for scaling. signNow places strict caps on annual envelope dispatches, triggering high overage fees. EZSignNow offers unlimited document sending, meaning your operations can grow without scaling bills.

3. Outdated Client UX
Clients demand frictionless mobile signing. EZSignNow uses optimized WebGL signatures and faster page renderings that loads perfectly on any smartphone web browser in milliseconds. No app installs, no loading delays.

Summary: By transitioning to EZSignNow, law offices are retaining thousands of dollars in capital annually while speeding up contract signatures by an average of 42%.`
    },
    {
      id: 2,
      title: "ezsignnow vs signNow: The Head-to-Head Feature Showdown",
      category: "Comparison Guide",
      date: "May 20, 2026",
      readTime: "8 min read",
      author: "Clarissa Vance, SaaS Analyst",
      summary: "An objective, exhaustive analysis of e-signing features. We break down the differences in geolocation verification accuracy, custom branding, API key generation, Stripe integration configurations, and cost structures to help you make an informed organizational decision.",
      content: `Choosing the right document signature platform for your organization requires evaluating performance, security compliance, customizability, and ROI. Here is our head-to-head feature breakdown:

1. Security & Compliance
Both platforms fully comply with the US ESIGN Act, UETA, and eIDAS. However, EZSignNow excels in auditing detail: it query-resolves geolocation coordinates, ISP carriers, and public IP ranges, embedding them inside a cryptographic SHA-256 tamper-evident digital certificate dynamically.

2. Custom Branding & White-Labeling
To apply your own company logo and remove partner badges in signNow, you must pay for their highly expensive Enterprise levels ($30+/mo per user). EZSignNow provides granular custom branding assets natively inside the $5/mo seat tier.

3. Developer API Access
ezsignnow allows generating secure developer client API keys directly inside user account panels with simple documentation and webhooks. signNow keeps API keys locked behind separate custom sales contracts.

Features Comparison Matrix:
- Pricing per seat: ezsignnow ($5/mo) vs signNow ($20/mo)
- Templates: Unlimited (ezsignnow) vs Capped (signNow base)
- SMS passcode: Standard free (ezsignnow) vs Upgrade required (signNow)
- Stripe integration: Standard (ezsignnow) vs Enterprise addon (signNow)`
    },
    {
      id: 3,
      title: "How to migrate your active templates from signNow in under 5 minutes",
      category: "Tutorials & Guides",
      date: "May 24, 2026",
      readTime: "4 min read",
      author: "Vikram Mehta, Solution Engineer",
      summary: "Ready to migrate but worried about rebuilding dozens of templates? This guide details how our automated PDF template layout engine ingests signNow structure files and recreates all signature field overlays in seconds, making your transition seamless.",
      content: `Migrating your firm's entire active contract repository from signNow doesn't have to be a multi-day engineering headache. EZSignNow has engineered a seamless migration wizard that maps your document signature positions automatically.

Follow these 3 easy steps to transition in under 5 minutes:

Step 1: Download your PDFs from signNow
Export your current active contract templates as standard PDF files from your signNow dashboard.

Step 2: Upload into EZSignNow Migration Tool
Navigate to the Template Builder in EZSignNow. Click 'Migrate Competitor Layout' and drop your PDF files into our parser.

Step 3: Auto-Detect Fields
Our system automatically identifies lines, checkboxes, signature blocks, and text frames using smart heuristics. You simply assign the signatories (Signer A, Signer B) and hit 'Save'. Your new dynamic templates are instantly ready to distribute!

That's it! Your legal teams can immediately start sending documents without losing a single hour of productive time.`
    }
  ];

  // GTM Youtube Script Templates
  const scripts = [
    {
      title: "Video 1: The 'Why Pay 4x More?' Hook Review (For Solo Practitioners & Realtors)",
      length: "3-5 Minutes",
      hook: "Open by showing a physical receipt with '$240/year' on it, then rip it up in front of the camera.",
      narrative: `Intro (0:00 - 0:45)
"If you are a solo attorney, real estate agent, or consultant paying $20 a month for signNow, you are literally throwing money away. Today I'm showing you why legal professionals are transitioning to EZSignNow for just $5 a month, with absolutely zero loss in legal compliance or features."

Core Comparison (0:45 - 2:30)
"Let's look at the features. Both platforms give you legally binding contracts under the ESIGN Act. Both allow signatures on phones. But signNow caps your templates and envelope counts on their lower tiers. EZSignNow gives you unlimited sending, custom branding, and private Supabase backups for a fraction of the cost."

The Calculator Demo (2:30 - 3:30)
Show screen recording of the interactive cost slider on the ezsignnow site. "Look at this savings. If you have a small team of 5 people, signNow costs $100 a month. EZSignNow is $25. That is $900 saved every single year for the exact same signature certificate."

Outro (3:30 - end)
"Ditch the legacy pricing model. Click the link below to get your free starter seats on EZSignNow and start sending unlimited envelopes today."`,
      tags: ["#eSignature", "#RealtorTools", "#SoloAttorney", "#SaaSSavings"]
    },
    {
      title: "Video 2: The Security Deep-Dive (For Law Firms & Corporate Legal Teams)",
      length: "8-10 Minutes",
      hook: "Show a close-up of a court-admissible Digital Audit Certificate on a dual screen setup.",
      narrative: `Intro (0:00 - 1:15)
"Are cheap e-signatures legally binding in court? The short answer is yes—but only if you have a proper audit trail. Today we are comparing the security architecture of signNow and EZSignNow, and why high-stakes firms are making the migration."

The Compliance Stack (1:15 - 4:00)
"Let's talk about the ESIGN Act and eIDAS. Both platforms are legally compliant. But EZSignNow captures much richer metadata natively: detailed public IP geolocations, ISP identification, and secure SMS passcode access on all tiers. Any modification to the document after the signature voids the SHA-256 digital seal."

Migration Walkthrough (4:00 - 7:00)
Demonstrate the 5-minute template migration process. "Look at how fast this is. You don't need to manually re-place your fields. You just import, let the auto-builder run, and send."

The Verdict (7:00 - end)
"For enterprise compliance at a bootstrap price, EZSignNow wins. Stop paying legacy seat taxes. Check out the links below for a free migration consultation."`,
      tags: ["#LegalTech", "#Compliance", "#SecurityAudits", "#BusinessOperations"]
    }
  ];

  const handleCopyScript = (scriptText: string) => {
    navigator.clipboard.writeText(scriptText);
    toast.success("Script outline copied to clipboard!");
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-background">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative overflow-hidden pt-32 pb-16 bg-gradient-to-b from-slate-900 to-secondary text-white text-left">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--primary)/15,transparent_50%)]" />
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 border border-primary/20 text-primary-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span>Go-To-Market Center</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
                EZSignNow Hub & Resources
              </h1>
              <p className="text-slate-300 text-md max-w-2xl leading-relaxed">
                Expert insights on e-signature cost optimization, YouTube reviews, migration strategies, and competitive comparison analyses.
              </p>
            </div>
            
            {/* Tab Swapper */}
            <div className="flex bg-white/5 border border-white/10 backdrop-blur-md rounded-full p-1 self-start md:self-end">
              <button
                onClick={() => setActiveTab("articles")}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  activeTab === "articles" ? "bg-primary text-white shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Articles & Guides
              </button>
              <button
                onClick={() => setActiveTab("youtube")}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  activeTab === "youtube" ? "bg-primary text-white shadow-md" : "text-slate-300 hover:text-white"
                }`}
              >
                <Video className="h-3.5 w-3.5" />
                GTM YouTube Scripts
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-16 flex-grow">
        <div className="container mx-auto px-4 max-w-6xl">
          
          {activeTab === "articles" ? (
            <div className="space-y-12">
              {/* Search Bar */}
              <div className="relative max-w-md bg-white dark:bg-card border border-border rounded-full shadow-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search comparison articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent pl-11 pr-4 py-3 text-sm text-foreground outline-none rounded-full"
                />
              </div>

              {selectedPost === null ? (
                /* Grid of articles */
                <div className="grid gap-8 md:grid-cols-3">
                  {filteredPosts.map((post) => (
                    <div 
                      key={post.id}
                      className="group bg-white dark:bg-card border border-border/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 text-left relative overflow-hidden"
                    >
                      {/* Hover Glassmorphism highlight */}
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-primary/20 group-hover:bg-primary transition-colors" />

                      <div className="space-y-4">
                        <span className="inline-block text-[10px] font-extrabold text-primary bg-primary/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {post.category}
                        </span>

                        <h3 className="text-lg font-extrabold text-foreground leading-snug group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>

                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                          {post.summary}
                        </p>
                      </div>

                      <div className="pt-6 mt-6 border-t border-border/50 flex flex-col gap-4">
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {post.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {post.readTime}
                          </span>
                        </div>
                        
                        <Button 
                          onClick={() => setSelectedPost(post.id)}
                          size="sm"
                          className="w-full text-xs font-bold bg-slate-50 hover:bg-primary hover:text-white border border-border text-foreground transition-all"
                        >
                          Read Article
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {filteredPosts.length === 0 && (
                    <div className="col-span-3 text-center py-12 bg-white dark:bg-card border border-dashed border-border rounded-3xl">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm font-bold text-foreground">No comparison articles found</p>
                      <p className="text-xs text-muted-foreground mt-1">Try expanding your search query.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Full Post Expanded View */
                <div className="bg-white dark:bg-card border border-border rounded-3xl p-8 md:p-12 shadow-xl text-left max-w-4xl mx-auto animate-[fadeIn_0.3s_ease-out]">
                  <Button 
                    onClick={() => setSelectedPost(null)}
                    variant="ghost" 
                    size="sm" 
                    className="mb-8 font-bold text-xs hover:bg-slate-100"
                  >
                    ← Back to Articles
                  </Button>

                  {posts.filter(p => p.id === selectedPost).map((post) => (
                    <article key={post.id} className="space-y-6">
                      <div className="space-y-4">
                        <span className="inline-block text-xs font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">
                          {post.category}
                        </span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
                          {post.title}
                        </h2>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground font-semibold pt-2 border-y border-border/50 py-3">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-primary" />
                            {post.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {post.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {post.readTime}
                          </span>
                        </div>
                      </div>

                      <div className="text-foreground text-sm leading-relaxed whitespace-pre-line space-y-4 pt-4 font-normal font-sans">
                        {post.content}
                      </div>

                      <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-6 bg-slate-50 dark:bg-accent/5 p-6 rounded-2xl">
                        <div className="text-left space-y-1">
                          <h4 className="text-sm font-extrabold">Ready to put these features to the test?</h4>
                          <p className="text-xs text-muted-foreground">Sign up in seconds. No credit card required, unlimited sends.</p>
                        </div>
                        <Button size="lg" className="bg-primary hover:bg-primary/95 text-white font-bold text-xs" asChild>
                          <Link to="/try-for-free">
                            Try EZSignNow Free
                            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                          </Link>
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* YouTube Scripts Playbook View */
            <div className="space-y-12 animate-[fadeIn_0.3s_ease-out]">
              <div className="text-left max-w-3xl">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#e21a22]/10 text-[#e21a22] uppercase tracking-wider mb-2">
                  <Youtube className="h-3 w-3 text-[#e21a22] fill-[#e21a22]" />
                  Youtube GTM Scripts Playbook
                </span>
                <h2 className="text-2xl font-extrabold text-foreground">YouTube Comparison Review Scripts</h2>
                <p className="text-muted-foreground text-xs mt-1">
                  Ready-to-record scripts for marketing reviews. Copy the outlines below to produce engaging, organic comparative reviews.
                </p>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                {scripts.map((script, idx) => (
                  <div key={idx} className="bg-white dark:bg-card border border-border/80 rounded-3xl p-6 shadow-md flex flex-col justify-between text-left relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 text-[10px] font-bold text-muted-foreground uppercase">
                      Est. Length: {script.length}
                    </div>

                    <div className="space-y-5">
                      <h3 className="font-extrabold text-foreground text-md pr-16">{script.title}</h3>
                      
                      <div className="bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-3.5">
                        <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-500 uppercase block mb-1">SCENE HOOK</span>
                        <p className="text-xs italic text-foreground/80 leading-relaxed">"{script.hook}"</p>
                      </div>

                      <div className="space-y-4">
                        <span className="text-[10px] font-extrabold text-primary uppercase block">NARRATIVE SCRIPTLINE</span>
                        <div className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line font-mono bg-slate-50 dark:bg-accent/10 border border-border p-4 rounded-xl max-h-[280px] overflow-y-auto">
                          {script.narrative}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/50 flex justify-between items-center gap-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {script.tags.map((tag, tid) => (
                          <span key={tid} className="text-[9px] font-bold text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <Button 
                        onClick={() => handleCopyScript(script.narrative)}
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white text-[10px] font-bold h-8 px-4 flex items-center gap-1 shadow"
                      >
                        <Copy className="h-3 w-3" />
                        Copy Script
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </section>

      <Footer />
    </div>
  );
}
