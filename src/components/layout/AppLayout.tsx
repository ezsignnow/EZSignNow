import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth, isEmailVerified } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface LayoutProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function AppLayout({ children, requireAuth = true }: LayoutProps) {
  const { user, loading } = useAuth();

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


  return (
    <div className="flex min-h-screen bg-[#f7f9f5] dark:bg-slate-950 font-sans">
      <Sidebar />
      <main className="flex-1 ms-64 min-w-0 flex flex-col">
        {children}
      </main>
    </div>
  );
}
