import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
  Zap,
  BookOpen,
  FileQuestion,
  AlertCircle,
  Send,
  HeadphonesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  "Billing & Subscription",
  "Document Signing Issue",
  "Account & Login",
  "Cloud Storage Integration",
  "Templates & Forms",
  "Legal & Compliance",
  "API & Developer",
  "Other",
];

const FAQS = [
  {
    q: "How do I reset my signing password?",
    a: "Go to Account Settings → Personal Profile and click 'Change Password'. A secure reset link will be sent to your registered email address within 60 seconds.",
  },
  {
    q: "Are my signed documents legally binding?",
    a: "Yes. All documents signed through EZSignNow are fully compliant with the U.S. ESIGN Act and UETA, as well as EU eIDAS regulations. Each document receives a tamper-evident SHA-256 seal with timestamp and geolocation.",
  },
  {
    q: "How do I connect Google Drive, Dropbox, or OneDrive?",
    a: "From the Dashboard, click 'New Document' → 'Import files from' and select your cloud provider. Google Drive uses OAuth 2.0, Dropbox uses the Chooser SDK, and OneDrive uses the OneDrive File Picker v7.2.",
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Yes, you can cancel anytime from Dashboard → Settings → Billing. Your plan remains active until the end of the current billing cycle, and you'll never be charged again after cancellation.",
  },
  {
    q: "How long are signed documents stored?",
    a: "All documents are securely stored on Supabase-backed cloud storage with AES-256 encryption. Free plan documents are kept for 12 months; Pro and Business plans include unlimited storage.",
  },
  {
    q: "Do signers need an EZSignNow account?",
    a: "No. Signers receive a unique signing link via email and can complete the signature directly in their browser — no account or app download required.",
  },
];

export default function Support() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    category: "",
    subject: "",
    priority: "Normal",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.category || !form.message) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    // Simulate API call / ticket creation
    await new Promise((res) => setTimeout(res, 1800));
    setSubmitting(false);
    setSubmitted(true);
    toast({
      title: "Support ticket submitted! 🎉",
      description: `Ticket #ESN-${Math.floor(10000 + Math.random() * 90000)} created. We'll respond to ${form.email} within 4 hours.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow">
              <HeadphonesIcon className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-slate-800 text-[15px] tracking-tight">
              EZSignNow <span className="text-[#22c55e]">Support</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="hidden sm:flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-12">

        {/* ── Hero ── */}
        <section className="text-center space-y-4 pt-4">
          <div className="inline-flex items-center gap-2 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-xs font-bold px-4 py-1.5 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5" />
            Trusted Support · 4-Hour Response Guarantee
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
            How can we help you?
          </h1>
          <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">
            Reach our team by phone, email, or submit a support ticket below. We're
            here to ensure your signing experience is seamless.
          </p>
        </section>

        {/* ── Contact Cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Phone */}
          <a
            href="tel:4124445156"
            className="group flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-[#22c55e]/40 hover:shadow-[0_4px_24px_rgba(37,143,251,0.08)] transition-all text-center"
          >
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200 group-hover:scale-105 transition-transform">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Call Us</p>
              <p className="font-extrabold text-slate-800 text-[17px] mt-0.5">412-444-5156</p>
              <p className="text-[11px] text-slate-400 mt-1">Mon–Fri · 9am – 6pm EST</p>
            </div>
          </a>

          {/* Email */}
          <a
            href="mailto:support@ezsignnow.com"
            className="group flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:border-[#22c55e]/40 hover:shadow-[0_4px_24px_rgba(37,143,251,0.08)] transition-all text-center"
          >
            <div className="h-12 w-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Us</p>
              <p className="font-extrabold text-slate-800 text-[14px] mt-0.5 break-all">support@ezsignnow.com</p>
              <p className="text-[11px] text-slate-400 mt-1">Response within 4 hours</p>
            </div>
          </a>

          {/* Response time */}
          <div className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-center">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg. Response</p>
              <p className="font-extrabold text-slate-800 text-[17px] mt-0.5">&lt; 2 Hours</p>
              <p className="text-[11px] text-slate-400 mt-1">Live chat for Pro plans</p>
            </div>
          </div>
        </section>

        {/* ── Main Grid: Form + FAQ ── */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

          {/* Ticket Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="bg-emerald-600 p-5 flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-white" />
                <div>
                  <h2 className="font-extrabold text-white text-[15px]">Submit a Support Ticket</h2>
                  <p className="text-blue-100 text-[11px] mt-0.5">
                    Typical response time: under 4 hours on business days
                  </p>
                </div>
              </div>

              {submitted ? (
                <div className="p-10 flex flex-col items-center gap-4 text-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center animate-in zoom-in duration-300">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">Ticket Received!</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
                      We've sent a confirmation to <strong>{form.email}</strong>. Our team will review your query and respond shortly.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    <Button
                      onClick={() => { setSubmitted(false); setForm({ name: "", email: "", category: "", subject: "", priority: "Normal", message: "" }); }}
                      variant="outline"
                      className="text-xs font-bold rounded-full border-slate-200"
                    >
                      Submit Another Ticket
                    </Button>
                    <Button
                      onClick={() => navigate("/dashboard")}
                      className="text-xs font-bold rounded-full bg-[#22c55e] hover:bg-[#1a7ae0]"
                    >
                      Back to Dashboard
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Full Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Joe Thomas"
                        required
                        className="w-full text-sm font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-[#22c55e]/60 focus:ring-2 focus:ring-[#22c55e]/10 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Email Address <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@company.com"
                        required
                        className="w-full text-sm font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-[#22c55e]/60 focus:ring-2 focus:ring-[#22c55e]/10 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Category + Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Category <span className="text-rose-400">*</span>
                      </label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        required
                        className="w-full text-sm font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-[#22c55e]/60 focus:ring-2 focus:ring-[#22c55e]/10 outline-none transition-all"
                      >
                        <option value="">Select a category...</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                      <select
                        name="priority"
                        value={form.priority}
                        onChange={handleChange}
                        className="w-full text-sm font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-[#22c55e]/60 focus:ring-2 focus:ring-[#22c55e]/10 outline-none transition-all"
                      >
                        <option value="Low">🟢 Low — General question</option>
                        <option value="Normal">🟡 Normal — Need help soon</option>
                        <option value="High">🟠 High — Affecting my workflow</option>
                        <option value="Urgent">🔴 Urgent — Business blocked</option>
                      </select>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      placeholder="Brief summary of your issue..."
                      className="w-full text-sm font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-[#22c55e]/60 focus:ring-2 focus:ring-[#22c55e]/10 outline-none transition-all"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Message / Query Details <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder="Please describe your issue in detail — include any error messages, steps to reproduce, or screenshots links if available..."
                      className="w-full text-sm font-medium px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-[#22c55e]/60 focus:ring-2 focus:ring-[#22c55e]/10 outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Note */}
                  <div className="flex items-start gap-2.5 text-[11px] text-slate-400 bg-blue-50/60 border border-blue-100 rounded-xl p-3.5">
                    <AlertCircle className="h-3.5 w-3.5 text-[#22c55e] shrink-0 mt-0.5" />
                    <span>
                      For urgent billing or legal issues, please also call us at{" "}
                      <a href="tel:4124445156" className="text-[#22c55e] font-bold hover:underline">
                        412-444-5156
                      </a>{" "}
                      or email{" "}
                      <a href="mailto:support@ezsignnow.com" className="text-[#22c55e] font-bold hover:underline">
                        support@ezsignnow.com
                      </a>{" "}
                      directly.
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-11 text-sm shadow-lg shadow-blue-200 flex items-center gap-2 transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting Ticket...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Support Request
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: FAQ + Useful Links */}
          <div className="lg:col-span-2 space-y-5">

            {/* Quick Links */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 space-y-3">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Quick Resources
              </h3>
              {[
                { icon: BookOpen, label: "Documentation & API Guides", href: "/blog", color: "text-[#22c55e] bg-blue-50" },
                { icon: ShieldCheck, label: "Security & Compliance Center", href: "/security", color: "text-emerald-600 bg-emerald-50" },
                { icon: FileQuestion, label: "Forms Library & Templates", href: "/forms", color: "text-violet-600 bg-violet-50" },
              ].map(({ icon: Icon, label, href, color }) => (
                <button
                  key={label}
                  onClick={() => navigate(href)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[12.5px] font-semibold text-slate-700 group-hover:text-slate-900 transition-colors leading-tight">
                    {label}
                  </span>
                </button>
              ))}
            </div>

            {/* FAQ Accordion */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="p-5 border-b border-slate-50">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-[#22c55e]" />
                  Frequently Asked Questions
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {FAQS.map((faq, idx) => (
                  <div key={idx}>
                    <button
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50/50 transition-colors"
                    >
                      <span className="text-[12.5px] font-bold text-slate-700 leading-snug pr-2">
                        {faq.q}
                      </span>
                      {openFaq === idx ? (
                        <ChevronUp className="h-4 w-4 text-[#22c55e] shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {openFaq === idx && (
                      <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-150">
                        <p className="text-[12px] text-slate-500 leading-relaxed border-l-2 border-[#22c55e]/30 pl-3">
                          {faq.a}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SLA Badge */}
            <div className="bg-gradient-to-br from-[#22c55e]/5 to-blue-50 border border-[#22c55e]/15 rounded-2xl p-5 space-y-3">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Our Support SLA</h4>
              {[
                { label: "Email Response", value: "≤ 4 hours" },
                { label: "Phone Support", value: "Mon–Fri 9–6 EST" },
                { label: "Critical Issues", value: "≤ 1 hour" },
                { label: "Platform Uptime", value: "99.9% SLA" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11.5px] text-slate-500 font-medium">{label}</span>
                  <span className="text-[11.5px] font-extrabold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer strip */}
        <footer className="text-center text-[11.5px] text-slate-400 space-y-1 pb-4">
          <p className="font-semibold">
            EZSignNow Customer Support ·{" "}
            <a href="tel:4124445156" className="text-[#22c55e] hover:underline">412-444-5156</a>
            {" · "}
            <a href="mailto:support@ezsignnow.com" className="text-[#22c55e] hover:underline">support@ezsignnow.com</a>
          </p>
          <p>© {new Date().getFullYear()} EZSignNow. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}



