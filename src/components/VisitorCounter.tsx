import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "@/integrations/supabase/client";

const SESSION_FLAG = "site_visit_counted";

/**
 * Small fixed badge in the bottom-right corner showing the total number of
 * visits to the app. Each browser session bumps the count once (via the
 * increment_site_visits RPC); every render just reads the running total.
 *
 * Renders nothing if the backend isn't reachable (e.g. the site_stats table
 * / RPC from supabase/migrations/20260906_site_visit_counter.sql hasn't been
 * applied yet) so it never shows a broken widget.
 */
export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const alreadyCounted = sessionStorage.getItem(SESSION_FLAG);

        if (!alreadyCounted) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabase.rpc as any)("increment_site_visits");
          if (error) throw error;
          try {
            sessionStorage.setItem(SESSION_FLAG, "1");
          } catch {
            // sessionStorage can be unavailable (private mode / blocked) — ignore
          }
          if (!cancelled && typeof data === "number") setCount(data);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("site_stats" as any) as any)
          .select("visit_count")
          .eq("id", 1)
          .single();
        if (error) throw error;
        if (!cancelled && data?.visit_count != null) setCount(Number(data.visit_count));
      } catch {
        // Backend not set up / unreachable — stay hidden.
        if (!cancelled) setCount(null);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null) return null;

  return (
    <div className="fixed bottom-3 right-3 z-40 pointer-events-none select-none">
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
        <FontAwesomeIcon icon={faUsers} className="h-3.5 w-3.5 text-[#22c55e]" />
        <span className="tabular-nums">{count.toLocaleString()}</span>
        <span className="text-slate-400 dark:text-slate-500">visits</span>
      </div>
    </div>
  );
}
