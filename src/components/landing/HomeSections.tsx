import { useState } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCircleCheck,
  faCloudArrowUp,
  faEnvelopeOpenText,
  faFileShield,
  faListOl,
  faPenNib,
  faUserCheck,
  faBan,
  faCreditCard,
  faLaptop,
  faLayerGroup,
  faShieldHalved,
  faFingerprint,
  faScaleBalanced,
  faFileCircleCheck,
  faObjectGroup,
  faScissors,
  faCompress,
  faFileWord,
  faEye,
  faLock,
} from "@fortawesome/free-solid-svg-icons";

function SectionHeading({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="mx-auto mb-14 max-w-2xl text-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#5ba114]">{eyebrow}</p>
      <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{title}</h2>
      {intro && <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">{intro}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function FactStrip() {
  const facts = [
    { icon: faScaleBalanced, label: "ESIGN, UETA and eIDAS", sub: "Legally binding signatures" },
    { icon: faUserCheck, label: "No signer accounts", sub: "Sign from any device" },
    { icon: faListOl, label: "Up to 25 signers", sub: "In order or at once" },
    { icon: faFileShield, label: "Audit certificate", sub: "On every signed PDF" },
  ];
  return (
    <section className="border-b border-slate-200/70 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="container mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#5ba114] shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <FontAwesomeIcon icon={f.icon} className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{f.label}</p>
              <p className="text-xs text-slate-500">{f.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    {
      icon: faCloudArrowUp,
      title: "Upload and place fields",
      body: "Upload a PDF from your computer, Google Drive, OneDrive, Dropbox or Box. Add signers, then drop signature, initials, date, text, checkbox, dropdown and radio fields for each one.",
    },
    {
      icon: faEnvelopeOpenText,
      title: "Signers get their own link",
      body: "Each signer is emailed when it's their turn. They agree to sign electronically, fill in their fields, and draw or type a signature. No account, no download.",
    },
    {
      icon: faFileCircleCheck,
      title: "Everyone gets the signed copy",
      body: "When the last person signs, signers, copy recipients and you are emailed. The PDF has every signature in place and a completion certificate with the audit trail.",
    },
  ];
  return (
    <section id="how-it-works" className="bg-white py-24 dark:bg-background">
      <div className="container mx-auto max-w-7xl px-4">
        <SectionHeading eyebrow="How it works" title="Upload, sign, done" intro="Three steps from a PDF on your desktop to a signed agreement everyone has a copy of." />
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="group relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#73c41d]/15 text-[#477c13] dark:text-[#8ccd45]">
                  <FontAwesomeIcon icon={s.icon} className="h-5 w-5" />
                </span>
                <span className="font-heading text-4xl font-extrabold text-slate-100 dark:text-slate-800">{i + 1}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

const FEATURE_TABS = [
  {
    id: "send",
    label: "Send",
    title: "Signing that follows your process",
    points: [
      "Up to 25 signers, in the order they sign",
      "Give signers the same step and they sign at the same time",
      "Copy recipients who just get the finished document",
      "Access codes for signers who need more than an email link",
      "A personal subject line and note on every invitation",
    ],
  },
  {
    id: "sign",
    label: "Sign",
    title: "Easy for signers, on any device",
    points: [
      "Their own link, no account and no app",
      "Consent to electronic records, recorded in the audit trail",
      "Fields from other signers stay visible and locked",
      "Download the document before signing, or decline with a reason",
      "In-person signing on one device with kiosk mode",
    ],
  },
  {
    id: "track",
    label: "Track",
    title: "Know where every document stands",
    points: [
      "Status for every document: draft, awaiting signature, declined, completed",
      "See whose turn it is and who has signed",
      "Remind the people whose turn it is with one click",
      "Search and filter your documents",
      "Email when someone signs, declines, or everyone has finished",
    ],
  },
];

function FeatureTabs() {
  const [tab, setTab] = useState(FEATURE_TABS[0].id);
  const active = FEATURE_TABS.find((t) => t.id === tab)!;
  return (
    <section id="features" className="border-y border-slate-200/70 bg-slate-50/60 py-24 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="container mx-auto max-w-7xl px-4">
        <SectionHeading eyebrow="Features" title="Everything it takes to get a document signed" />
        <div className="mx-auto mb-10 flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900" role="tablist">
          {FEATURE_TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
                tab === t.id ? "bg-[#5ba114] text-white shadow-sm" : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h3 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">{active.title}</h3>
            <ul className="mt-6 space-y-3">
              {active.points.map((p) => (
                <li key={p} className="flex gap-3 text-slate-700 dark:text-slate-300">
                  <FontAwesomeIcon icon={faCircleCheck} className="mt-1 h-4 w-4 shrink-0 text-[#5ba114]" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <Link to="/try-for-free" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#477c13] hover:underline dark:text-[#8ccd45]">
              Try it free <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: faPenNib, t: "9 field types", d: "Signature, initials, name, date, text, number, checkbox, dropdown, radio" },
              { icon: faBan, t: "Decline with a reason", d: "The sender is told right away" },
              { icon: faCreditCard, t: "Collect payment", d: "Take a Stripe deposit as part of signing" },
              { icon: faLaptop, t: "Kiosk mode", d: "Hand one device from signer to signer" },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[#73c41d]/15 text-[#477c13] dark:text-[#8ccd45]">
                  <FontAwesomeIcon icon={c.icon} className="h-4 w-4" />
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{c.t}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function TrustSection() {
  const items = [
    { icon: faFingerprint, t: "Evidence on every signature", d: "Each signature is stored with the signer's IP address, location and time." },
    { icon: faEye, t: "A complete audit trail", d: "Every view, consent, signature and decline is logged, in order." },
    { icon: faFileShield, t: "Completion certificate", d: "The signed PDF ends with a certificate listing every signer and event." },
    { icon: faLock, t: "Private storage", d: "Documents live in private storage and travel over encrypted connections." },
  ];
  return (
    <section id="security" className="relative overflow-hidden bg-[#172d07] py-24 text-white">
      <div aria-hidden className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#73c41d]/20 blur-3xl" />
      <div className="container relative mx-auto grid max-w-7xl gap-12 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#abdb74]">Trust and compliance</p>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Signatures that hold up</h2>
          <p className="mt-4 max-w-md leading-relaxed text-[#cdeaa9]/90">
            EZSignNow signatures are legally binding under the U.S. ESIGN Act and UETA and the EU's eIDAS
            regulation, with the record to back each one.
          </p>
          <Link
            to="/security"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#73c41d] px-5 py-3 text-sm font-semibold text-[#172d07] transition hover:bg-[#8ccd45]"
          >
            <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4" /> How we keep documents safe
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((i) => (
            <div key={i.t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <FontAwesomeIcon icon={i.icon} className="h-5 w-5 text-[#8ccd45]" />
              <p className="mt-4 font-semibold">{i.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#cdeaa9]/80">{i.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

function PdfToolsStrip() {
  const tools = [
    { icon: faObjectGroup, t: "Merge" },
    { icon: faScissors, t: "Split" },
    { icon: faCompress, t: "Compress" },
    { icon: faFileWord, t: "Convert" },
    { icon: faPenNib, t: "Edit" },
    { icon: faLayerGroup, t: "Workflows" },
  ];
  return (
    <section id="pdf-tools" className="bg-white py-24 dark:bg-background">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid items-center gap-12 rounded-3xl border border-slate-200 bg-gradient-to-br from-[#f4fbec] to-white p-10 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 lg:grid-cols-2 lg:p-14">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#5ba114]">Included</p>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">More than signatures</h2>
            <p className="mt-4 max-w-md leading-relaxed text-slate-600 dark:text-slate-300">
              A PDF editor and 40+ tools, right in your browser: merge, split, compress, convert, OCR,
              watermark, protect and more. Chain them into workflows.
            </p>
            <Link to="/tools" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#477c13] hover:underline dark:text-[#8ccd45]">
              Explore PDF tools <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {tools.map((t) => (
              <Link
                key={t.t}
                to="/tools"
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#73c41d] hover:text-[#477c13] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <FontAwesomeIcon icon={t.icon} className="h-5 w-5 text-[#5ba114]" />
                {t.t}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeSections() {
  return (
    <>
      <FactStrip />
      <HowItWorks />
      <FeatureTabs />
      <TrustSection />
      <PdfToolsStrip />
    </>
  );
}
