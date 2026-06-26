import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

type Profile = {
  full_name: string | null;
  email: string;
  role: UserRole;
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

  async function load(initial = false) {
    setLoading(true);
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
        .select("full_name, email, role")
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
    return () => subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ user, profile, loading, refresh: load }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
