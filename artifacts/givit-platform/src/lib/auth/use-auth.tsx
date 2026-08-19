import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

type Profile = {
  full_name: string | null;
  email: string;
  role: UserRole;
  phone?: string | null;
  default_reminder_lead_days?: number | null;
  sms_opt_in?: boolean | null;
  sms_opted_out_at?: string | null;
};

type AuthContext = {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => void;
};

const Ctx = createContext<AuthContext>({ user: null, profile: null, loading: true, refresh: () => {} });

function withTimeout<T>(promise: PromiseLike<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Auth request timed out")), ms);
    Promise.resolve(promise).then(
      (value) => { window.clearTimeout(timer); resolve(value); },
      (error) => { window.clearTimeout(timer); reject(error); },
    );
  });
}

function fallbackProfile(user: { email?: string; user_metadata?: { full_name?: string } }): Profile {
  return {
    full_name: user.user_metadata?.full_name ?? null,
    email: user.email ?? "",
    role: "customer",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(initial = false, silent = false) {
    if (!silent) setLoading(true);
    try {
      const supabase = createClient();
      const sessionResult = await withTimeout(supabase.auth.getSession());
      let authUser = sessionResult.data.session?.user ?? null;

      if (!authUser && !initial) {
        const userResult = await withTimeout(supabase.auth.getUser());
        authUser = userResult.data.user;
      }

      if (!authUser) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser({ id: authUser.id, email: authUser.email });
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, role, phone, default_reminder_lead_days, sms_opt_in, sms_opted_out_at")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) console.warn("[Auth] Profile lookup failed; using auth user fallback", error);
      setProfile((data as Profile | null) ?? fallbackProfile(authUser));
    } catch (err) {
      console.error("[Auth] Failed to load user:", err);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      void load();
    });

    // Re-fetch the profile when the tab regains focus so changes made
    // elsewhere (e.g. flipping a role in the Supabase dashboard) show up
    // without requiring a full sign-out/sign-in. Silent: this fires on
    // every tab/window focus change, and flipping `loading` back to true
    // for it was making content across the site (homepage, people,
    // relationship graph, everything gated on `loading`) blink out and
    // back in on every alt-tab.
    function onVisible() {
      if (document.visibilityState === "visible") void load(false, true);
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return <Ctx.Provider value={{ user, profile, loading, refresh: load }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
