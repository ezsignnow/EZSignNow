import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCircleCheck,
  faClock,
  faShieldHalved,
  faUserCheck,
  faFileContract,
  faLock,
} from "@fortawesome/free-solid-svg-icons";

const SIGNERS = [
  { name: "Maya Chen", role: "Step 1", initials: "MC" },
  { name: "Jordan Lee", role: "Step 1", initials: "JL" },
  { name: "Priya Raman", role: "Step 2", initials: "PR" },
];

/** Cycles the mock envelope through "who has signed" so the hero shows the product working. */
function useSigningProgress() {
  const [signed, setSigned] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setSigned(2);
      return;
    }
    const t = setInterval(() => setSigned((n) => (n + 1) % (SIGNERS.length + 2)), 1600);
    return () => clearInterval(t);
  }, []);
  return Math.min(signed, SIGNERS.length);
}

export function HomeHero() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const signed = useSigningProgress();
  const done = signed === SIGNERS.length;

  return (
    <section className="relative overflow-hidden border-b border-border/50 bg-white dark:bg-background">
      {/* soft green wash + grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#73c41d]/15 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(148 163 184 / 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.18) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="container relative mx-auto max-w-7xl px-4 pb-20 pt-24 lg:pb-28 lg:pt-32">
        <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          {/* Copy */}
          <div className="space-y-7 text-left">
            <Link
              to="/security"
              className="inline-flex items-center gap-2 rounded-full border border-[#73c41d]/30 bg-[#73c41d]/10 px-3 py-1 text-xs font-semibold text-[#3a6215] transition-colors hover:bg-[#73c41d]/15 dark:text-[#abdb74]"
            >
              <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" />
              Legally binding under ESIGN, UETA and eIDAS
              <FontAwesomeIcon icon={faArrowRight} className="h-2.5 w-2.5" />
            </Link>

            <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-[64px]">
              Get documents signed,{" "}
              <span className="bg-gradient-to-r from-[#5ba114] to-[#8ccd45] bg-clip-text text-transparent">
                in order and on record.
              </span>
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Upload a PDF, place fields for each signer, and send. Signers sign from any device without an
              account, and you keep the signed copy with its audit certificate.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!email) return;
                navigate(`/try-for-free?email=${encodeURIComponent(email)}`);
              }}
              className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
            >
              <label htmlFor="hero-email" className="sr-only">
                Work email
              </label>
              <input
                id="hero-email"
                type="email"
                required
                autoComplete="email"
                placeholder="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#5ba114] focus:ring-4 focus:ring-[#73c41d]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#5ba114] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#477c13] focus:outline-none focus:ring-4 focus:ring-[#73c41d]/30"
              >
                Start free
                <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
              </button>
            </form>

            <ul className="grid max-w-xl grid-cols-1 gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
              {[
                "No account needed to sign",
                "Up to 25 signers, in order or at once",
                "Audit trail and completion certificate",
                "PDF tools and editor included",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5 text-[#5ba114]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Product mock: an envelope moving through its signers */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-[#73c41d]/25 via-transparent to-[#477c13]/20 blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_30px_80px_-20px_rgba(23,45,7,0.35)] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#73c41d]/15 text-[#477c13]">
                    <FontAwesomeIcon icon={faFileContract} className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Master services agreement</p>
                    <p className="text-[11px] text-slate-500">3 signers · sent today</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    done ? "bg-[#73c41d]/15 text-[#3a6215] dark:text-[#abdb74]" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {done ? "Completed" : `${signed} of ${SIGNERS.length} signed`}
                </span>
              </div>

              {/* document preview */}
              <div className="space-y-2 bg-slate-50/70 px-6 py-5 dark:bg-slate-950/40">
                <div className="h-2.5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-2.5 w-11/12 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-2.5 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {SIGNERS.slice(0, 2).map((s, i) => (
                    <div
                      key={s.name}
                      className={`flex h-12 items-center rounded-md border px-3 transition-all ${
                        signed > i
                          ? "border-transparent bg-white dark:bg-slate-900"
                          : "border-dashed border-[#73c41d]/60 bg-[#73c41d]/5"
                      }`}
                    >
                      {signed > i ? (
                        <span className="font-['Great_Vibes',cursive] text-2xl text-slate-800 dark:text-slate-100">{s.name}</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#477c13]">Signature · {s.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* signers */}
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {SIGNERS.map((s, i) => {
                  const isSigned = signed > i;
                  const isTurn = !isSigned && (i < 2 ? true : signed >= 2);
                  return (
                    <li key={s.name} className="flex items-center gap-3 px-5 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {s.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{s.name}</p>
                        <p className="text-[11px] text-slate-500">{s.role}</p>
                      </div>
                      {isSigned ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#477c13] dark:text-[#8ccd45]">
                          <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5" /> Signed
                        </span>
                      ) : isTurn ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                          <FontAwesomeIcon icon={faClock} className="h-3.5 w-3.5" /> Their turn
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Waiting</span>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="flex items-center gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
                <span className="inline-flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faUserCheck} className="h-3 w-3 text-[#5ba114]" /> Consent recorded
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faLock} className="h-3 w-3 text-[#5ba114]" /> Audit trail on
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
