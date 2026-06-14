import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { BecomeSellerForm } from "./become-seller-form";

export default async function BecomeSellerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_name")
    .eq("id", user.id)
    .single();

  const role = profile?.role as string | undefined;

  if (role === "staff" || role === "admin") {
    redirect("/admin");
  }

  return (
    <PageShell narrow>
      <Link
        href="/account"
        className="text-muted-foreground mb-6 inline-block text-sm transition-colors hover:text-foreground"
      >
        ← Account
      </Link>
      <PageHeader
        title="Become a seller"
        description="List wholesale products on GIVIT, manage your catalog, and fulfill buyer orders from the seller console."
      />

      <Card className="givit-panel shadow-lg">
        <CardHeader>
          <CardTitle>Seller registration</CardTitle>
          <CardDescription>
            Confirm your business details. Your account will be upgraded immediately with seller
            permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BecomeSellerForm defaultCompanyName={profile?.company_name} />
        </CardContent>
      </Card>

      <div className="text-muted-foreground mx-auto mt-8 max-w-md space-y-2 text-center text-sm">
        <p className="font-medium text-foreground">Seller access includes:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>Product catalog management and image uploads</li>
          <li>Order status updates for your buyers</li>
        </ul>
        <Button asChild variant="link" className="h-auto p-0">
          <Link href="/products">Continue browsing as a buyer</Link>
        </Button>
      </div>
    </PageShell>
  );
}
