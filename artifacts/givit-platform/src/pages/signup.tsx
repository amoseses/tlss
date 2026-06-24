import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const nextPath = new URLSearchParams(search).get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth-callback`,
        },
      });
      if (authError) { setError(authError.message); return; }
      // Set flag so login prompt auto-dismisses after signup
      window.localStorage.setItem("givit-just-signed-up", "1");
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-[calc(100vh-160px)] items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-givit-ember/10 text-3xl">🎉</div>
          <h2 className="font-serif text-2xl font-bold text-givit-ink">Check your email</h2>
          <p className="mt-2 text-muted-foreground">We sent a confirmation link to {email}. Click it to activate your account.</p>
          <Button asChild className="mt-6 rounded-full bg-givit-ember text-white">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-givit-ember">
              <Gift className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-serif text-2xl font-bold text-givit-ink">GIV<span className="text-givit-coral">IT</span></span>
          </Link>
        </div>
        <Card className="givit-panel rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-normal">Create account</CardTitle>
            <CardDescription>Start gifting smarter with Givit.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="name">Full name</label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="email">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href={`/login${search ? `?${search}` : ""}`} className="givit-link font-medium">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
