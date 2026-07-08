import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // The reset-link click lands here carrying a recovery token in the URL;
  // the Supabase client (detectSessionInUrl: true) exchanges it for a
  // session automatically, but that exchange is itself async — updateUser()
  // below would silently fail against no session if we don't wait for it.
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setSessionReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError(updateError.message); return; }
      setDone(true);
      setTimeout(() => navigate("/home"), 1800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Set a new password." subtitle="Choose something you haven't used here before.">
      <Card className="givit-panel rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-normal">Reset password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm text-muted-foreground">Password updated. Taking you to Givit…</p>
            </div>
          ) : !sessionReady ? (
            <div className="space-y-3 py-2 text-center">
              <p className="text-sm text-muted-foreground">Waiting for your reset link to verify… if this doesn't finish in a few seconds, the link may have expired.</p>
              <Link href="/forgot-password" className="givit-link text-sm font-medium">Request a new link</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="password">New password</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="confirm">Confirm password</label>
                <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
                {loading ? "Saving…" : "Save new password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
