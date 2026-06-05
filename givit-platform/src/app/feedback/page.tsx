import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackForm } from "./feedback-form";

export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let email: string | null = null;
  if (user) {
    const { data: p } = await supabase.from("profiles").select("email").eq("id", user.id).single();
    email = p?.email ?? user.email ?? null;
  }

  return (
    <PageShell narrow>
      <PageHeader
        title="Feedback"
        description="Questions about an order, a product listing, or partnering with GIVIT? Send us a note and our team will follow up."
      />
      <Card className="givit-panel shadow-lg">
        <CardHeader className="text-center">
          <CardTitle>Contact us</CardTitle>
          <CardDescription>
            {user
              ? `We’ll reply to ${email}.`
              : "Sign in optional — leave your email so we can respond."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeedbackForm defaultEmail={user ? email : null} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
