import { ConciergeDashboard } from "@/components/gifting/concierge-dashboard";
import { PageShell } from "@/components/layout/page-shell";
import { createClient } from "@/lib/supabase/server";

export default async function ConciergePage() {
  let isAuthenticated = false;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    isAuthenticated = Boolean(data.user);
  } catch {
    isAuthenticated = false;
  }

  return (
    <PageShell>
      <ConciergeDashboard isAuthenticated={isAuthenticated} />
    </PageShell>
  );
}
