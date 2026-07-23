import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Share2, UserRound } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { getGiftRecipients } from "@/lib/supabase/db";

type GraphPerson = { id: string; name: string; interests: string[] };

const WIDTH = 560;
const HEIGHT = 230;
const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };
const PERSON_RADIUS = 100;
const MAX_PEOPLE = 6;

function polar(cx: number, cy: number, radius: number, angleRad: number) {
  return { x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) };
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * A compact visual map of what Givit remembers — you, the people you've
 * saved, and a one-line preview of what's known about each. Earlier
 * versions fanned each interest out as its own satellite node/label, which
 * both bloated the footprint and caused adjacent labels to visually
 * collide for anyone with more than one interest saved (e.g. "skincare"
 * and "haircare" sitting close enough to overlap). A single truncated
 * summary line per person avoids that entirely, with the full list
 * available as a native tooltip on hover.
 */
export function RelationshipGraph() {
  const { user } = useAuth();
  const [people, setPeople] = useState<GraphPerson[] | null>(null);

  useEffect(() => {
    if (!user) { setPeople(null); return; }
    let mounted = true;
    getGiftRecipients(user.id).then((rows: any[]) => {
      if (!mounted) return;
      setPeople(rows.slice(0, MAX_PEOPLE).map((r) => ({ id: r.id, name: r.name, interests: r.interests ?? [] })));
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

      <div className="rounded-2xl border border-border/60 bg-card p-3 sm:p-4">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto h-auto w-full max-w-md" role="img" aria-label="Graph of saved people and what Givit knows about each">
          {people.map((person, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            const personPos = polar(CENTER.x, CENTER.y, PERSON_RADIUS, angle);
            return <line key={`edge-${person.id}`} x1={CENTER.x} y1={CENTER.y} x2={personPos.x} y2={personPos.y} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1.5} className="text-givit-ember" />;
          })}

          <circle cx={CENTER.x} cy={CENTER.y} r={18} className="fill-black" />
          <text x={CENTER.x} y={CENTER.y + 4} textAnchor="middle" className="fill-white text-[10px] font-bold">You</text>

          {people.map((person, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            const pos = polar(CENTER.x, CENTER.y, PERSON_RADIUS, angle);
            const hasInterests = person.interests.length > 0;
            const summary = hasInterests ? truncate(person.interests.join(", "), 16) : "nothing known yet";
            return (
              <g key={`node-${person.id}`}>
                {person.interests.length > 0 && <title>{`${person.name}: ${person.interests.join(", ")}`}</title>}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={14}
                  className={hasInterests ? "fill-givit-ember" : "fill-none stroke-givit-ember"}
                  strokeWidth={hasInterests ? 0 : 2}
                  strokeDasharray={hasInterests ? undefined : "4 3"}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" className={hasInterests ? "fill-white text-[10px] font-bold" : "fill-givit-ember text-[10px] font-bold"}>
                  {person.name[0]?.toUpperCase()}
                </text>
                <text x={pos.x} y={pos.y + 26} textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
                  {truncate(person.name, 12)}
                </text>
                <text x={pos.x} y={pos.y + 39} textAnchor="middle" className={`text-[8px] ${hasInterests ? "fill-muted-foreground" : "fill-muted-foreground italic"}`}>
                  {summary}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2.5 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-givit-ember" /> Interests known</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-dashed border-givit-ember" /> Still learning</span>
      </p>
    </section>
  );
}
