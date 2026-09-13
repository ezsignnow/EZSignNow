import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session, AuthResponse } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getAbsoluteUrl } from "@/utils/url";
import { reminderScheduler } from "@/utils/reminderScheduler";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

/**
 * A session existing isn't the same as the account being verified — with
 * email confirmation enabled, Supabase won't issue a session until the user
 * confirms, but this is still worth checking explicitly at every route guard
 * rather than assuming `user` truthy implies confirmed (e.g. if email
 * confirmation is ever disabled project-side, Supabase sets
 * email_confirmed_at immediately, so this stays correct either way).
 */
export function isEmailVerified(user: User | null): boolean {
  return !!user?.email_confirmed_at;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Only run the reminder scheduler for an authenticated session — it was
  // previously started unconditionally for every visitor (including
  // anonymous marketing-page traffic) in main.tsx, which combined with a
  // 60s scan interval and a 2-minute per-signatory cooldown was sending
  // real reminder emails often enough to exhaust the daily send quota.
  useEffect(() => {
    if (user?.id) {
      reminderScheduler.start();
    } else {
      reminderScheduler.stop();
    }
    return () => reminderScheduler.stop();
  }, [user?.id]);

  const signUp = async (email: string, password: string, fullName: string) => {
    // Returns the full response (not just { error }) so callers can check
    // data.session — if it's already set, Supabase didn't require email
    // confirmation for this project and the account is usable immediately;
    // if it's null, confirmation is required and there's no session yet.
    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAbsoluteUrl("/dashboard"),
        data: { full_name: fullName },
      },
    });
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}



