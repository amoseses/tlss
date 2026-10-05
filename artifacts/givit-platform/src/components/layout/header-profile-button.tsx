import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { useTheme } from "next-themes";
import { CircleUser, Check, Circle, Sparkles, Wand2 } from "lucide-react";
import { generatedProfilePhotoUrl } from "@/lib/avatar";
import { useAuth } from "@/lib/auth/use-auth";
import { createClient } from "@/lib/supabase/client";
import { getUserAddresses, getUserPaymentMethods, getGiftRecipients, updateProfile } from "@/lib/supabase/db";
import { getCohort } from "@/lib/data/gifting-cohorts";
import { GiftingQuizModal } from "@/components/personalization/gifting-quiz-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/types/database";

type Props = {
  loggedIn: boolean;
  email?: string;
  displayName?: string;
  role?: UserRole;
  avatarUrl?: string | null;
};

export function HeaderProfileButton({ loggedIn, email, displayName, role, avatarUrl: realAvatarUrl }: Props) {
  const [, navigate] = useLocation();
  const { user, profile, refresh } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const iconClass = isDark ? "text-white hover:bg-white/10" : "text-givit-ink hover:bg-black/5";

  const [open, setOpen] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  const [completion, setCompletion] = useState({
    hasName: false,
    hasPhone: false,
    hasPhoto: false,
    hasRecipient: false,
    hasCohort: false,
    cohortId: null as string | null,
    percentage: 20,
    loading: true,
  });

  useEffect(() => {
    if (!loggedIn || !user?.id) return;
    let isMounted = true;

    async function checkCompletion() {
      try {
        const recipients = await getGiftRecipients(user!.id);
        if (!isMounted) return;

        const hasName = Boolean(profile?.full_name?.trim());
        const hasPhone = Boolean(profile?.phone?.trim());
        const hasPhoto = Boolean((profile as any)?.avatar_url);
        const hasRecipient = recipients.length > 0;
        const cohortId = (profile as any)?.gifting_cohort as string | null;
        const hasCohort = Boolean(cohortId);

        const items = [hasName, hasPhone, hasPhoto, hasRecipient, hasCohort];
        const completedCount = items.filter(Boolean).length;
        const pct = Math.round((completedCount / items.length) * 100);

        setCompletion({
          hasName,
          hasPhone,
          hasPhoto,
          hasRecipient,
          hasCohort,
          cohortId,
          percentage: pct,
          loading: false,
        });
      } catch (e) {
        console.warn("Failed to calculate profile completion:", e);
      }
    }

    checkCompletion();
    return () => {
      isMounted = false;
    };
  }, [loggedIn, user?.id, displayName, profile]);

  if (!loggedIn) {
    return (
      <Link
        href="/login"
        aria-label="Sign in"
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${iconClass}`}
      >
        <CircleUser className="h-6 w-6" />
      </Link>
    );
  }

  const isAdmin = role === "admin";
  const avatarUrl = realAvatarUrl || generatedProfilePhotoUrl(email || displayName);
  const cohort = getCohort(completion.cohortId);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    navigate("/");
    window.location.reload();
  }

  async function handleSaveCohort(cohortId: string) {
    if (!user) return;
    await updateProfile(user.id, { gifting_cohort: cohortId });
    refresh();
    setShowQuiz(false);
  }

  return (
    <>
      <div
        className="relative flex items-center justify-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            aria-label="Profile menu"
            className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-all outline-none ${iconClass}`}
          >
            {/* Avatar Photo */}
            <img
              src={avatarUrl}
              alt={displayName || email || "Account"}
              className={`h-8 w-8 rounded-full bg-white object-cover ring-2 transition-all ${
                isDark ? "ring-white/30" : "ring-black/10"
              }`}
            />

            {/* Glowing Neon Green Progress Arc hugging the avatar icon curve */}
            <svg
              className="absolute inset-0 h-11 w-11 pointer-events-none overflow-visible"
              viewBox="0 0 44 44"
            >
              {/* Background track */}
              <circle
                cx="22"
                cy="22"
                r="18.5"
                fill="none"
                stroke={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}
                strokeWidth="2"
              />

              {/* Glowing Neon Green Arc hugging the avatar icon curve */}
              <circle
                cx="22"
                cy="22"
                r="18.5"
                fill="none"
                stroke="#00FF66"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="116.24"
                strokeDashoffset={116.24 - (116.24 * completion.percentage) / 100}
                transform="rotate(135 22 22)"
                className="transition-all duration-500 ease-out"
                style={{
                  filter: "drop-shadow(0 0 4px #00FF66)",
                }}
              />
            </svg>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-72 rounded-2xl p-3 shadow-xl backdrop-blur-md"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <DropdownMenuLabel className="font-normal px-2 py-1 flex items-center justify-between">
              <div>
                <p className="font-semibold text-givit-ink text-sm">{displayName || "Account"}</p>
                {email ? <p className="text-muted-foreground text-xs truncate">{email}</p> : null}
              </div>
              {cohort && (
                <span className="text-lg" title={cohort.name}>
                  {cohort.emoji}
                </span>
              )}
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="my-2" />

            {/* Profile Completion Dropdown Box */}
            <div className="rounded-xl bg-black/5 dark:bg-white/5 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-givit-ink flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#00FF66]" /> Profile Completion
                </span>
                <span className="text-xs font-bold text-[#00FF66]">{completion.percentage}%</span>
              </div>

              {/* Neon Green Progress Bar */}
              <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#00FF66] transition-all duration-500"
                  style={{
                    width: `${completion.percentage}%`,
                    boxShadow: "0 0 8px #00FF66",
                  }}
                />
              </div>

              {/* 5 Profile Completion Tasks */}
              <div className="space-y-1.5 pt-1">
                {/* Task 1: Name */}
                <div
                  onClick={() => {
                    setOpen(false);
                    navigate("/account");
                  }}
                  className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {completion.hasName ? (
                      <Check className="h-3.5 w-3.5 text-[#00FF66] shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className={completion.hasName ? "text-givit-ink font-medium" : "text-muted-foreground"}>
                      Add your name
                    </span>
                  </div>
                  {!completion.hasName && (
                    <span className="text-[10px] font-bold text-[#00FF66] hover:underline">Add</span>
                  )}
                </div>

                {/* Task 2: Phone */}
                <div
                  onClick={() => {
                    setOpen(false);
                    navigate("/account");
                  }}
                  className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {completion.hasPhone ? (
                      <Check className="h-3.5 w-3.5 text-[#00FF66] shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className={completion.hasPhone ? "text-givit-ink font-medium" : "text-muted-foreground"}>
                      Add a phone number
                    </span>
                  </div>
                  {!completion.hasPhone && (
                    <span className="text-[10px] font-bold text-[#00FF66] hover:underline">Add</span>
                  )}
                </div>

                {/* Task 3: Profile Photo */}
                <div
                  onClick={() => {
                    setOpen(false);
                    navigate("/account");
                  }}
                  className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {completion.hasPhoto ? (
                      <Check className="h-3.5 w-3.5 text-[#00FF66] shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className={completion.hasPhoto ? "text-givit-ink font-medium" : "text-muted-foreground"}>
                      Add a profile photo
                    </span>
                  </div>
                  {!completion.hasPhoto && (
                    <span className="text-[10px] font-bold text-[#00FF66] hover:underline">Add</span>
                  )}
                </div>

                {/* Task 4: First Person */}
                <div
                  onClick={() => {
                    setOpen(false);
                    navigate("/people");
                  }}
                  className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {completion.hasRecipient ? (
                      <Check className="h-3.5 w-3.5 text-[#00FF66] shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className={completion.hasRecipient ? "text-givit-ink font-medium" : "text-muted-foreground"}>
                      Add your first person
                    </span>
                  </div>
                  {!completion.hasRecipient && (
                    <span className="text-[10px] font-bold text-[#00FF66] hover:underline">Add</span>
                  )}
                </div>

                {/* Task 5: Gifting Personality Quiz */}
                <div
                  onClick={() => {
                    setOpen(false);
                    setShowQuiz(true);
                  }}
                  className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {completion.hasCohort ? (
                      <Check className="h-3.5 w-3.5 text-[#00FF66] shrink-0" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5 text-[#00FF66] shrink-0" />
                    )}
                    <span className={completion.hasCohort ? "text-givit-ink font-medium" : "text-muted-foreground"}>
                      {cohort ? cohort.name : "Gifting Personality Quiz"}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-[#00FF66] hover:underline">
                    {completion.hasCohort ? "Retake" : "Start"}
                  </span>
                </div>
              </div>
            </div>

            <DropdownMenuSeparator className="my-2" />

            {/* Navigation Links */}
            <DropdownMenuItem onClick={() => navigate("/account")}>Account</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/orders")}>Orders</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/wishlist")}>Wishlist</DropdownMenuItem>
            {isAdmin ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/manager")}>Manager console</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin")}>Admin products</DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/secret-santa")}>Secret Santa</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/people")}>People</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/concierge")}>AutoGift</DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Gifting Quiz Modal */}
      {showQuiz && (
        <GiftingQuizModal
          onClose={() => setShowQuiz(false)}
          onComplete={handleSaveCohort}
        />
      )}
    </>
  );
}
