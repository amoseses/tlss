import { useState } from "react";
import { Link } from "wouter";
import { CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Don't reveal whether the email is registered — always show the same
      // "check your inbox" confirmation either way.
      if (resetError) console.error("resetPasswordForEmail failed:", resetError.message);
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="We'll email you a link to set a new one.">
      <Card className="givit-panel rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-normal">Reset password</CardTitle>
          <CardDescription>Enter the email on your account and we'll send a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm text-muted-foreground">
                If an account exists for <strong className="text-foreground">{email}</strong>, a reset link is on its way. Check your inbox (and spam folder).
              </p>
              <Link href="/login" className="givit-link mt-2 text-sm font-medium">Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="email">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover">
                {loading ? "Sending…" : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="givit-link font-medium">Back to sign in</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
