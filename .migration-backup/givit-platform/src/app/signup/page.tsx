import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/layout/auth-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <AuthShell>
      <div className="flex flex-col gap-4">
        <div className="mb-2 text-center">
          <Link href="/" className="text-2xl font-bold text-givit-ink">
            Hive<span className="brand-mark">Markets</span>
          </Link>
        </div>
        <Card className="givit-panel rounded-sm shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-normal">Create account</CardTitle>
            <CardDescription>
              Register your business to purchase in bulk and track orders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
              <SignupForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
