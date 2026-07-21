import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Share2, UserRound } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { getGiftRecipients } from "@/lib/supabase/db";

type GraphPerson = { id: string; name: string; interests: string[] };

const WIDTH = 640;
const HEIGHT = 380;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const PERSON_RADIUS = 140;
const INTEREST_RADIUS = 46;
const MAX_PEOPLE = 6;
const MAX_INTERESTS_PER_PERSON = 3;

function polar(cx: number, cy: number, radius: number, angleRad: number) {
  return { x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) };
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * A visual map of what Givit actually remembers — you, the people you've
 * saved, and the interests attached to each — rather than a stats panel.
 * Positions are plain trigonometry (small, fixed dataset), not a physics
 * simulation: no graph library needed for "you -> up to 6 people -> up to
 * 3 interests each".
 */
export function RelationshipGraph() {
  const { user } = useAuth();
  const [people, setPeople] = useState<GraphPerson[] | null>(null);

  useEffect(() => {
    if (!user) { setPeople(null); return; }
    let mounted = true;
    getGiftRecipients(user.id).then((rows: any[]) => {
      if (!mounted) return;
      setPeople(
        rows
          .slice(0, MAX_PEOPLE)
          .map((r) => ({ id: r.id, name: r.name, interests: (r.interests ?? []).slice(0, MAX_INTERESTS_PER_PERSON) })),
      );
    });
    return () => { mounted = false; };
  }, [user]);

  if (!user || !people) return null;

  if (people.length === 0) {
    return (
      <section className="container py-8 md:py-12">
        <div className="mb-5 flex items-center gap-2 border-b border-border/40 pb-4">
          <Share2 className="h-4 w-4 text-givit-ember" />
          <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Your memory graph</h2>
        </div>
        <Link
          href="/people"
          className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border py-12 text-center transition hover:border-givit-ember/40 hover:bg-givit-sand/40"
        >
          <UserRound className="h-8 w-8 text-givit-ember" />
          <p className="font-semibold text-givit-ink">Nothing to map yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">Add a person and this fills in automatically: you, them, and what Givit learns about them over time.</p>
        </Link>
      </section>
    );
  }

  const angleStep = (2 * Math.PI) / people.length;

  return (
    <section className="container py-8 md:py-12">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-givit-ember" />
          <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Your memory graph</h2>
        </div>
        <Link href="/people" className="givit-link shrink-0 text-sm font-medium">Manage people →</Link>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-2 sm:p-4">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Graph of saved people and their known interests">
          {people.map((person, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            const personPos = polar(CENTER.x, CENTER.y, PERSON_RADIUS, angle);
            return <line key={`edge-${person.id}`} x1={CENTER.x} y1={CENTER.y} x2={personPos.x} y2={personPos.y} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1.5} className="text-givit-ember" />;
          })}

          {people.map((person, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            const personPos = polar(CENTER.x, CENTER.y, PERSON_RADIUS, angle);
            return person.interests.map((interest, j) => {
              const spreadAngle = angle + (j - (person.interests.length - 1) / 2) * 0.55;
              const pos = polar(personPos.x, personPos.y, INTEREST_RADIUS, spreadAngle);
              return (
                <g key={`${person.id}-${interest}`}>
                  <line x1={personPos.x} y1={personPos.y} x2={pos.x} y2={pos.y} stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} className="text-muted-foreground" />
                  <circle cx={pos.x} cy={pos.y} r={3.5} className="fill-givit-coral" />
                  <text x={pos.x} y={pos.y - 8} textAnchor="middle" className="fill-muted-foreground text-[9px] font-medium capitalize">{truncate(interest, 12)}</text>
                </g>
              );
            });
          })}

          <circle cx={CENTER.x} cy={CENTER.y} r={20} className="fill-black" />
          <text x={CENTER.x} y={CENTER.y + 4} textAnchor="middle" className="fill-white text-[10px] font-bold">You</text>

          {people.map((person, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            const pos = polar(CENTER.x, CENTER.y, PERSON_RADIUS, angle);
            const hasInterests = person.interests.length > 0;
            return (
              <g key={`node-${person.id}`}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={16}
                  className={hasInterests ? "fill-givit-ember" : "fill-none stroke-givit-ember"}
                  strokeWidth={hasInterests ? 0 : 2}
                  strokeDasharray={hasInterests ? undefined : "4 3"}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" className={hasInterests ? "fill-white text-[11px] font-bold" : "fill-givit-ember text-[11px] font-bold"}>
                  {person.name[0]?.toUpperCase()}
                </text>
                <text x={pos.x} y={pos.y + 30} textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
                  {truncate(person.name, 12)}
                </text>
                {!hasInterests && (
                  <text x={pos.x} y={pos.y + 43} textAnchor="middle" className="fill-muted-foreground text-[8px] italic">
                    nothing known yet
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
