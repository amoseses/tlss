import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthShell } from "@/components/auth/auth-shell";
import { safeNextPath } from "@/lib/utils";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const nextPath = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    searchParams.get("error") === "auth" ? "That sign-in link didn't work -- it may have expired. Please sign in again." : "",
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError(authError.message); return; }
      navigate(nextPath);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your AutoGift schedule, saved boards, and orders.">
      <Card className="givit-panel rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-normal">Sign in</CardTitle>
          <CardDescription>Access your orders, cart, and account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? <div role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <Link href="/forgot-password" className="givit-link text-xs font-medium">Forgot password?</Link>
              </div>
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href={`/signup${search ? `?${search}` : ""}`} className="givit-link font-medium">Sign up</Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
