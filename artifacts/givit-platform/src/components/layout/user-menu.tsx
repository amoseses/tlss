import { HeaderProfileButton } from "@/components/layout/header-profile-button";
import { useAuth } from "@/lib/auth/use-auth";

export function UserMenu() {
  const { user, profile } = useAuth();
  return (
    <HeaderProfileButton
      loggedIn={Boolean(user && profile)}
      email={profile?.email}
      displayName={profile?.full_name ?? undefined}
      role={profile?.role}
    />
  );
}
