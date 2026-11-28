import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { BrandLogo } from "./BrandLogo";
import { useAuth, isEmailVerified } from "@/contexts/AuthContext";
import { Link, Navigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

interface LayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function AppLayout({ children, requireAuth = true }: LayoutProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Below md the sidebar is a drawer instead of a fixed 256px column, which
  // would otherwise leave phones about 130px for the page itself.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5ba114]"></div>
      </div>
    );
  }

  // A session existing isn't enough — an unconfirmed account (mid email
  // verification) must not reach the Dashboard or any other protected
  // screen. Sending them to /login is deliberate: AuthForm itself checks
  // confirmation status and shows the OTP screen for an unconfirmed
  // session instead of bouncing back here, so this can't loop.
  if (requireAuth && (!user || !isEmailVerified(user))) {
    return <Navigate to="/login" replace />;
  }
  // Public screens inside the app (the signing page opened from an email
  // link) render on their own for signed-out visitors: the sidebar is
  // account navigation they have no use for.
  if (!user) {
    return <div className="min-h-screen bg-[#f7f9f5] dark:bg-slate-950 font-sans">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-[#f7f9f5] dark:bg-slate-950 font-sans">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="flex-1 md:ms-64 min-w-0 flex flex-col">
        <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 md:hidden dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
          </button>
          <Link to="/dashboard" aria-label="EZSignNow dashboard">
            <BrandLogo />
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
