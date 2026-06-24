import { useEffect } from "react";
import { useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallback() {
  const [, navigate] = useLocation();

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient();
      
      // Exchange the code from the URL for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      
      if (error) {
        console.error("Auth callback error:", error);
        navigate("/login?error=auth");
        return;
      }

      if (data.session) {
        // Successfully logged in - redirect to home or original destination
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next") || "/";
        navigate(next);
      } else {
        navigate("/login");
      }
    }

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-givit-ember border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}