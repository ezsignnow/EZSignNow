import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

// Admin-only analytics. Not linked from any navigation, kept out of search
// indexing, and every number comes from get_admin_analytics() in Supabase,
// which refuses anyone who isn't a signed-in site admin or holding a valid
// private-link key (supabase/migrations/20261126_admin_analytics.sql).

interface Totals {
  page_views: number;
  visitors: number;
  sessions: number;
  visitors_today: number;
  page_views_today: number;
  checkout_views: number;
  checkout_visitors: number;
  checkouts_completed: number;
  checkouts_with_promo: number;
  free_plan_chosen: number;
  promo_applied: number;
  promo_rejected: number;
  signups: number;
  users_total: number;
  documents_created: number;
  documents_completed: number;
  signatures: number;
}

interface Report {
  generated_at: string;
  days: number;
  all_time_visits: number | null;
  totals: Totals;
  daily: { day: string; page_views: number; visitors: number; checkouts: number; signups: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
  referrers: { referrer: string; visits: number }[];
  devices: { device: string; visitors: number }[];
  promo_codes: { promo_code: string; applied: number; rejected: number; checkouts: number }[];
  recent_checkouts: {
    created_at: string;
    event_type: string;
    plan: string | null;
    promo_code: string | null;
    trial_days: number | null;
    email: string | null;
  }[];
}

type State =
  | { kind: "loading" }
  | { kind: "denied" }
  | { kind: "error"; message: string }
  | { kind: "ready"; report: Report };

const RANGES = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

const LINE = "#477c13";
const FILL = "#73c41d";

function useNoIndex() {
  useEffect(() => {
    const added: HTMLMetaElement[] = [];
    const set = (name: string, content: string) => {
      const prev = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      const prevContent = prev?.getAttribute("content") ?? null;
      const el = prev ?? document.createElement("meta");
      el.setAttribute("name", name);
      el.setAttribute("content", content);
      if (!prev) {
        document.head.appendChild(el);
        added.push(el);
      }
      return () => {
        if (prev && prevContent !== null) prev.setAttribute("content", prevContent);
      };
    };
    const restoreRobots = set("robots", "noindex, nofollow, noarchive");
    // Keeps a private-link key out of the Referer header if a link on this page is followed.
    const restoreReferrer = set("referrer", "no-referrer");
    const prevTitle = document.title;
    document.title = "Analytics · EZSignNow";
    return () => {
      restoreRobots();
      restoreReferrer();
      added.forEach((el) => el.remove());
      document.title = prevTitle;
    };
  }, []);
}

const n = (v: number | null | undefined) => (v ?? 0).toLocaleString();
const pct = (num: number, den: number) => (den > 0 ? `${Math.round((num / den) * 100)}%` : "–");

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  );
}

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">{title}</h2>
        {note && <span className="text-xs text-slate-500 dark:text-slate-400">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{children}</p>;
}

/** A ranked list with an inline bar, so each row carries its own number. */
function BarList({ rows, mono = true }: { rows: { label: string; value: number; sub?: string }[]; mono?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="relative overflow-hidden rounded-md px-2 py-1.5 text-sm" title={`${r.label}: ${r.value.toLocaleString()}`}>
          <div className="absolute inset-y-0 left-0 rounded-md bg-[#73c41d]/15 dark:bg-[#73c41d]/20" style={{ width: `${(r.value / max) * 100}%` }} />
          <div className="relative flex items-center justify-between gap-3">
            <span className={`truncate text-slate-700 dark:text-slate-200 ${mono ? "font-mono text-xs" : ""}`}>{r.label}</span>
            <span className="shrink-0 tabular-nums text-slate-900 dark:text-slate-50">
              {r.value.toLocaleString()}
              {r.sub && <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{r.sub}</span>}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DailyChart({ data, dataKey, label }: { data: Report["daily"]; dataKey: "page_views" | "visitors"; label: string }) {
  return (
    <div className="h-56 w-full" role="img" aria-label={`${label} per day`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.15} />
          <XAxis
            dataKey="day"
            tickFormatter={(d: string) => format(parseISO(d), "MMM d")}
            tick={{ fontSize: 11, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "currentColor" }} tickLine={false} axisLine={false} />
          <Tooltip
            labelFormatter={(d: string) => format(parseISO(d), "EEE, MMM d")}
            formatter={(v: number) => [v.toLocaleString(), label]}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Area type="monotone" dataKey={dataKey} stroke={LINE} strokeWidth={2} fill={FILL} fillOpacity={0.15} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminAnalytics() {
  useNoIndex();
  const { accessKey } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [days, setDays] = useState(30);
  const [state, setState] = useState<State>({ kind: "loading" });
  const [metric, setMetric] = useState<"visitors" | "page_views">("visitors");

  const load = useCallback(async () => {
    setState((s) => (s.kind === "ready" ? s : { kind: "loading" }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("get_admin_analytics", {
      p_days: days,
      p_key: accessKey ?? null,
    });
    if (error) {
      if (error.code === "42501" || /not authorized/i.test(error.message)) setState({ kind: "denied" });
      else setState({ kind: "error", message: error.message });
      return;
    }
    setState({ kind: "ready", report: data as Report });
  }, [days, accessKey]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, user?.id, load]);

  if (state.kind === "loading" || authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950">Loading…</div>;
  }

  if (state.kind === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">This page is private</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {user ? "Your account doesn't have access to it." : "Sign in with an admin account to view it."}
          </p>
          {!user && (
            <Button asChild className="mt-4 bg-[#73c41d] hover:bg-[#477c13]">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">Analytics isn't available</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            The report couldn't be loaded. If this is a new setup, run
            <code className="mx-1 rounded bg-slate-200 px-1 dark:bg-slate-800">supabase/migrations/20261126_admin_analytics.sql</code>
            in Supabase.
          </p>
          <p className="mt-2 font-mono text-xs text-slate-500">{state.message}</p>
          <Button variant="outline" className="mt-4" onClick={load}>Try again</Button>
        </div>
      </div>
    );
  }

  const r = state.report;
  const t = r.totals;
  const rangeLabel = RANGES.find((x) => x.days === r.days)?.label.toLowerCase() ?? `${r.days} days`;
  const thank = r.promo_codes.find((p) => p.promo_code === "THANK180");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Analytics</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Updated {format(parseISO(r.generated_at), "MMM d, h:mm a")}
              {r.all_time_visits != null && ` · ${n(r.all_time_visits)} visits all time`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900" role="group" aria-label="Date range">
              {RANGES.map((x) => (
                <button
                  key={x.days}
                  type="button"
                  onClick={() => setDays(x.days)}
                  aria-pressed={days === x.days}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    days === x.days ? "bg-[#73c41d] text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {x.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Visitors" value={n(t.visitors)} hint={`${n(t.visitors_today)} today`} />
          <Stat label="Page views" value={n(t.page_views)} hint={`${n(t.page_views_today)} today · ${n(t.sessions)} sessions`} />
          <Stat label="Sign-ups" value={n(t.signups)} hint={`${n(t.users_total)} accounts in total`} />
          <Stat
            label="Trials started"
            value={n(t.checkouts_completed)}
            hint={`${pct(t.checkouts_completed, t.checkout_visitors)} of checkout visitors`}
          />
          <Stat label="THANK180 trials" value={n(thank?.checkouts)} hint={`${n(thank?.applied)} times applied`} />
          <Stat label="Checkout views" value={n(t.checkout_views)} hint={`${n(t.free_plan_chosen)} chose the free plan`} />
          <Stat label="Documents" value={n(t.documents_created)} hint={`${n(t.documents_completed)} completed`} />
          <Stat label="Signatures" value={n(t.signatures)} />
        </div>

        <div className="mt-4 grid gap-4">
          <Section title={metric === "visitors" ? "Visitors per day" : "Page views per day"} note={`Last ${rangeLabel}`}>
            <div className="mb-2 flex gap-1" role="group" aria-label="Chart metric">
              {(["visitors", "page_views"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  aria-pressed={metric === m}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    metric === m ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {m === "visitors" ? "Visitors" : "Page views"}
                </button>
              ))}
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              <DailyChart data={r.daily} dataKey={metric} label={metric === "visitors" ? "Visitors" : "Page views"} />
            </div>
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Page visits" note="views · visitors">
              {r.top_pages.length ? (
                <BarList rows={r.top_pages.map((p) => ({ label: p.path, value: p.views, sub: `${p.visitors.toLocaleString()}` }))} />
              ) : (
                <Empty>No page views yet.</Empty>
              )}
            </Section>

            <div className="grid min-w-0 gap-4">
              <Section title="Checkout funnel" note="Checkout is simulated, no money is charged yet">
                <BarList
                  mono={false}
                  rows={[
                    { label: "Visited checkout", value: t.checkout_visitors },
                    { label: "Applied a promo code", value: t.promo_applied },
                    { label: "Started a trial", value: t.checkouts_completed },
                    { label: "…with a promo code", value: t.checkouts_with_promo },
                    { label: "Chose the free plan", value: t.free_plan_chosen },
                  ]}
                />
              </Section>

              <Section title="Promo codes" note="applied · rejected · trials">
                {r.promo_codes.length ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                        <th className="pb-1 font-semibold">Code</th>
                        <th className="pb-1 text-right font-semibold">Applied</th>
                        <th className="pb-1 text-right font-semibold">Rejected</th>
                        <th className="pb-1 text-right font-semibold">Trials</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.promo_codes.map((p) => (
                        <tr key={p.promo_code} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="py-1.5 font-mono text-xs">{p.promo_code}</td>
                          <td className="py-1.5 text-right tabular-nums">{n(p.applied)}</td>
                          <td className="py-1.5 text-right tabular-nums">{n(p.rejected)}</td>
                          <td className="py-1.5 text-right tabular-nums">{n(p.checkouts)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <Empty>No promo codes used yet.</Empty>
                )}
              </Section>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="Where visitors come from" note="sessions">
              {r.referrers.length ? (
                <BarList rows={r.referrers.map((x) => ({ label: x.referrer, value: x.visits }))} />
              ) : (
                <Empty>No referrers yet. Direct visits aren't listed.</Empty>
              )}
            </Section>
            <Section title="Devices" note="visitors">
              {r.devices.length ? (
                <BarList rows={r.devices.map((x) => ({ label: x.device, value: x.visitors }))} />
              ) : (
                <Empty>No visits yet.</Empty>
              )}
            </Section>
          </div>

          <Section title="Recent checkouts">
            {r.recent_checkouts.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                      <th className="pb-1 font-semibold">When</th>
                      <th className="pb-1 font-semibold">Account</th>
                      <th className="pb-1 font-semibold">Choice</th>
                      <th className="pb-1 font-semibold">Promo</th>
                      <th className="pb-1 text-right font-semibold">Free days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.recent_checkouts.map((c, i) => (
                      <tr key={`${c.created_at}-${i}`} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1.5 whitespace-nowrap">{format(parseISO(c.created_at), "MMM d, h:mm a")}</td>
                        <td className="py-1.5">{c.email ?? "–"}</td>
                        <td className="py-1.5">{c.event_type === "checkout_completed" ? `${c.plan ?? "Business"} trial` : "Free plan"}</td>
                        <td className="py-1.5 font-mono text-xs">{c.promo_code ?? "–"}</td>
                        <td className="py-1.5 text-right tabular-nums">{c.event_type === "checkout_completed" ? c.trial_days ?? "–" : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No checkouts yet.</Empty>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
