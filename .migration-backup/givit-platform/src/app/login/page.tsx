import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/layout/auth-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

type Props = {
  searchParams: Promise<{ banned?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;

  return (
    <AuthShell>
      <div className="flex flex-col gap-4">
        <div className="mb-2 text-center">
          <Link href="/" className="text-2xl font-bold text-givit-ink">
            Hive<span className="brand-mark">Markets</span>
          </Link>
        </div>
        {sp.banned ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
            Your account has been suspended. Contact support if you believe this is a mistake.
          </div>
        ) : null}
        <Card className="givit-panel rounded-sm shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-normal">Sign in</CardTitle>
            <CardDescription>Access your orders, cart, and company profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
        <p className="text-muted-foreground text-center text-xs">
          By continuing, you agree to GIVIT&apos; wholesale terms.
        </p>
      </div>
    </AuthShell>
  );
}
