import Link from "next/link";

import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { updateProfileAction } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, company_name, email, role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as string | undefined;
  const isSeller = role === "staff" || role === "admin";

  return (
    <PageShell narrow>
      <PageHeader
        title="Account"
        description={
          <>
            Manage your buyer profile. Your role:{" "}
            <span className="text-foreground font-medium">{profile?.role}</span>
          </>
        }
      />

      {!isSeller ? (
        <div className="border-primary/20 bg-primary/5 givit-panel mx-auto max-w-md p-5 text-center">
          <p className="text-sm font-medium">Sell on GIVIT</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Register as a seller to list wholesale products and manage orders from the seller
            console.
          </p>
          <Button asChild className="mt-3" size="sm">
            <Link href="/account/become-seller">Become a seller</Link>
          </Button>
        </div>
      ) : (
        <div className="flex justify-center">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">Open seller console →</Link>
          </Button>
        </div>
      )}
      <form action={updateProfileAction} className="mx-auto mt-8 max-w-md space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={profile?.email ?? user.email ?? ""} disabled readOnly />
        </div>
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            defaultValue={profile?.full_name ?? ""}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company_name">Company name</Label>
          <Input
            id="company_name"
            name="company_name"
            defaultValue={profile?.company_name ?? ""}
            placeholder="Business name"
          />
        </div>
        <Button type="submit" className="w-full sm:w-auto">Save profile</Button>
      </form>
      <p className="text-muted-foreground mt-6 text-center text-sm">
        <Link href="/orders" className="text-primary hover:underline">
          View order history →
        </Link>
      </p>
    </PageShell>
  );
}
