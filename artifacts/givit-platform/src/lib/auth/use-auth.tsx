import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

type Profile = {
  full_name: string | null;
  email: string;
  role: UserRole;
};

type AuthContext = {
  user: { id: string } | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => void;
};

const Ctx = createContext<AuthContext>({ user: null, profile: null, loading: true, refresh: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { setUser(null); setProfile(null); setLoading(false); return; }
      setUser({ id: u.id });
      const { data } = await supabase.from("profiles").select("full_name, email, role").eq("id", u.id).single();
      setProfile(data as Profile | null);
    } catch (err) {
      console.error("[Auth] Failed to load user:", err);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load());
    return () => subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ user, profile, loading, refresh: load }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
