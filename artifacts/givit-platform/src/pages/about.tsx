import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { SponsorMarquee } from "@/components/marketing/sponsor-marquee";
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
  { name: "Revant Palivela", title: "Chief Marketing Officer", photo: "/team/revant.jpeg" },
];

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
