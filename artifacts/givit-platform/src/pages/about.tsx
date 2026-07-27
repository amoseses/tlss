import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Reveal } from "@/components/ui/reveal";
import { generatedProfilePhotoUrl } from "@/lib/avatar";

type TeamMember = { name: string; title: string; photo: string; zoom?: number };

// Photo files go in artifacts/givit-platform/public/team/ using these exact
// names -- drop a same-named file in and it's picked up automatically, no
// code change needed. Falls back to a generated avatar until then so a
// missing file never shows a broken image.
const TEAM: TeamMember[] = [
  { name: "Atticus Moes", title: "Chief Executive Officer", photo: "/team/atticus.jpeg" },
  { name: "Abhiram Kaakarla", title: "Co-Chief Executive Officer", photo: "/team/abhiram.jpeg" },
  { name: "Swanith Vuppalapati", title: "Chief Technology Officer", photo: "/team/swanith.jpeg" },
  // The source photo has visible white padding above/below the subject,
  // so it doesn't fill the card the way the others do even with
  // object-cover (which already fills the box completely -- what's left
  // is padding baked into the image itself). Scaling up crops that
  // padding out of the visible frame.
  { name: "Revant Palivela", title: "Chief Marketing Officer", photo: "/team/revant.jpeg", zoom: 1.35 },
];

function MicrosoftForStartupsLogo({ className }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-center gap-2.5 ${className ?? ""}`}>
      <svg viewBox="0 0 21 21" className="h-5 w-5" aria-hidden="true">
        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
      </svg>
      <span className="whitespace-nowrap text-sm font-semibold text-foreground">Microsoft for Startups</span>
    </div>
  );
}

function GoogleForStartupsLogo({ className }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-center gap-2.5 ${className ?? ""}`}>
      <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
        <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
        <path fill="#FBBC05" d="M11.69 28.18A13.98 13.98 0 0 1 10.9 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
        <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
      </svg>
      <span className="whitespace-nowrap text-sm font-semibold text-foreground">Google for Startups</span>
    </div>
  );
}

function AwsActivateLogo({ className }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-center gap-2.5 ${className ?? ""}`}>
      <svg viewBox="0 0 60 34" className="h-6 w-11" aria-hidden="true">
        <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="22" fill="currentColor" className="text-foreground">aws</text>
        <path d="M2 27 Q30 38 58 27" stroke="#FF9900" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
      <span className="whitespace-nowrap text-sm font-semibold text-foreground">AWS Activate</span>
    </div>
  );
}

const SPONSOR_LOGOS = [MicrosoftForStartupsLogo, GoogleForStartupsLogo, AwsActivateLogo];

function SponsorMarquee() {
  const track = [...SPONSOR_LOGOS, ...SPONSOR_LOGOS];
  return (
    <div className="relative overflow-hidden py-2">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div className="animate-marquee flex w-max items-center gap-14">
        {track.map((Logo, i) => (
          <Logo key={i} className="opacity-60 grayscale transition duration-200 hover:opacity-100 hover:grayscale-0" />
        ))}
      </div>
    </div>
  );
}

function TeamPhoto({ member }: { member: TeamMember }) {
  const [src, setSrc] = useState(member.photo);
  return (
    <img
      src={src}
      alt={member.name}
      onError={() => setSrc(generatedProfilePhotoUrl(member.name))}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      style={member.zoom ? { transform: `scale(${member.zoom})` } : undefined}
    />
  );
}

export default function AboutPage() {
  return (
    <PageShell className="max-w-4xl">
      <Reveal>
        <div className="py-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">About</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-givit-ink md:text-4xl">Built to make gifting effortless</h1>
          <div className="mx-auto mt-4 h-1 w-14 rounded-full givit-gradient" />
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
            GIVIT is a Pennsylvania-registered company built on a simple idea: the people you care about deserve better than a last-minute, half-guessed gift. We started GIVIT to be the one place that actually remembers who you're shopping for, so nothing important ever slips through.
          </p>
        </div>
      </Reveal>

      <Reveal variant="triangle">
        <section className="pb-16">
          <h2 className="mb-6 text-center font-serif text-xl font-bold text-givit-ink">Our team</h2>
          <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((member) => (
              <div
                key={member.name}
                className="slide-up group overflow-hidden rounded-2xl border border-border/50 bg-card opacity-0 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-givit-ember/30 hover:shadow-xl hover:shadow-black/10"
              >
                <div className="aspect-[4/5] w-full overflow-hidden bg-givit-sand">
                  <TeamPhoto member={member} />
                </div>
                <div className="p-4">
                  <p className="font-semibold text-givit-ink">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal variant="triangle">
        <section className="border-t border-border/50 pb-16 pt-10">
          <p className="mb-5 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Backed by</p>
          <SponsorMarquee />
        </section>
      </Reveal>
    </PageShell>
  );
}
