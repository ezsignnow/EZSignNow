import { useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faCheck, faChevronDown } from "@fortawesome/free-solid-svg-icons";

type Plan = {
  title: string;
  monthly: number | null; // null = custom pricing
  annual: number | null;
  desc: string;
  features: string[];
  cta: string;
  to: string;
  popular?: boolean;
  badge?: string;
};

const PLANS: Plan[] = [
  {
    title: "Personal",
    monthly: 0,
    annual: 0,
    desc: "For your own documents. Free forever.",
    features: [
      "Unlimited documents for personal use",
      "Signing order and copy recipients",
      "All 9 field types",
      "Audit trail and completion certificate",
      "PDF editor and 40+ PDF tools",
    ],
    cta: "Start free",
    to: "/try-for-free",
    badge: "Free forever",
  },
  {
    title: "Small Business",
    monthly: 5,
    annual: 4,
    desc: "For owners and small teams who send for work.",
    features: [
      "Everything in Personal, for business use",
      "Multiple senders",
      "Templates with signing links",
      "Collect payments with Stripe",
      "Your company logo",
      "In-person kiosk signing",
    ],
    cta: "Start 7-day free trial",
    to: "/try-trial",
    popular: true,
  },
  {
    title: "Enterprise",
    monthly: null,
    annual: null,
    desc: "For larger organizations with their own requirements.",
    features: [
      "Everything in Small Business",
      "Volume pricing for many senders",
      "Onboarding and priority support",
      "Help with security and compliance reviews",
    ],
    cta: "Contact sales",
    to: "/support",
  },
];

export function HomePricing() {
  const [annual, setAnnual] = useState(true);
  return (
    <section id="pricing" className="border-t border-slate-200/70 bg-slate-50/60 py-24 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#5ba114]">Pricing</p>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Free for personal use. Simple pricing for business.
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">Sign your own documents free, forever. Businesses pay per sender. Signers never pay and never need an account.</p>

          <div className="mx-auto mt-8 flex w-fit items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900" role="radiogroup" aria-label="Billing period">
            {[
              { v: false, l: "Monthly" },
              { v: true, l: "Annual" },
            ].map((o) => (
              <button
                key={o.l}
                role="radio"
                aria-checked={annual === o.v}
                onClick={() => setAnnual(o.v)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  annual === o.v ? "bg-[#5ba114] text-white shadow-sm" : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {o.l}
                {o.v && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${annual ? "bg-white/20" : "bg-[#73c41d]/15 text-[#477c13]"}`}>
                    Save 20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => {
            const price = annual ? p.annual : p.monthly;
            const custom = price === null;
            return (
              <div
                key={p.title}
                className={`relative flex flex-col rounded-2xl border bg-white p-8 dark:bg-slate-900 ${
                  p.popular
                    ? "border-[#5ba114] shadow-[0_20px_60px_-20px_rgba(71,124,19,0.45)] ring-1 ring-[#5ba114]"
                    : "border-slate-200 shadow-sm dark:border-slate-800"
                }`}
              >
                {(p.popular || p.badge) && (
                  <span className={`absolute -top-3 left-8 rounded-full px-3 py-1 text-[11px] font-semibold ${p.popular ? "bg-[#5ba114] text-white" : "bg-[#e6f5d3] text-[#3a6215]"}`}>
                    {p.popular ? "Most popular" : p.badge}
                  </span>
                )}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="font-heading text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {custom ? "Custom" : price === 0 ? "Free" : `$${price}`}
                  </span>
                  {!custom && price! > 0 && <span className="text-sm text-slate-500">/ sender / month</span>}
                </p>
                <p className="mt-1 h-4 text-xs text-slate-400">
                  {custom ? "Priced for your team" : price === 0 ? "No card, no time limit" : annual ? "Billed yearly" : "Billed monthly"}
                </p>
                <Link
                  to={p.to}
                  className={`mt-6 inline-flex h-11 items-center justify-center rounded-lg text-sm font-semibold transition ${
                    p.popular
                      ? "bg-[#5ba114] text-white hover:bg-[#477c13]"
                      : "border border-slate-300 text-slate-800 hover:border-[#5ba114] hover:text-[#477c13] dark:border-slate-700 dark:text-slate-100"
                  }`}
                >
                  {p.cta}
                </Link>
                <ul className="mt-8 space-y-3 border-t border-slate-100 pt-6 dark:border-slate-800">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                      <FontAwesomeIcon icon={faCheck} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5ba114]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm text-slate-500">
          Switching from signNow?{" "}
          <Link to="/compare/signnow" className="font-semibold text-[#477c13] hover:underline dark:text-[#8ccd45]">
            See how we compare
          </Link>
          {" · "}
          <Link to="/forms" className="font-semibold text-[#477c13] hover:underline dark:text-[#8ccd45]">
            Browse free form templates
          </Link>
        </p>
      </div>
    </section>
  );
}

export function HomeFaq({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-white py-24 dark:bg-background">
      <div className="container mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#5ba114]">FAQ</p>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Questions, answered
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            Can't find what you need?{" "}
            <Link to="/support" className="font-semibold text-[#477c13] hover:underline dark:text-[#8ccd45]">
              Contact support
            </Link>
            .
          </p>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className="font-semibold text-slate-900 dark:text-white">{f.q}</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180 text-[#5ba114]" : ""}`}
                  />
                </button>
                <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"}`}>
                  <p className="overflow-hidden text-sm leading-relaxed text-slate-600 dark:text-slate-300">{f.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HomeCta() {
  return (
    <section className="bg-white pb-24 dark:bg-background">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#477c13] via-[#3a6215] to-[#172d07] px-8 py-16 text-center text-white sm:px-16">
          <div aria-hidden className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#8ccd45]/30 blur-3xl" />
          <h2 className="relative font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Send your first document in minutes</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-[#e6f5d3]">Free to start. No card required.</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/try-for-free"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-7 text-sm font-semibold text-[#3a6215] transition hover:bg-[#f4fbec]"
            >
              Create free account <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/30 px-7 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
