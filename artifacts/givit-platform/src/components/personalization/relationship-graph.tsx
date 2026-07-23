import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Share2, UserRound } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { getGiftRecipients } from "@/lib/supabase/db";

type GraphPerson = { id: string; name: string; interests: string[] };

const WIDTH = 760;
// Interest satellites sit an extra INTEREST_RADIUS beyond each person node,
// so the farthest possible point from CENTER is PERSON_RADIUS + INTEREST_RADIUS.
// HEIGHT/CENTER.y must clear that worst case (a node landing straight down,
// which happens for 2, 4, or 6 people given the -90°-start layout below) or
// its label silently renders past the viewBox edge and gets clipped.
const HEIGHT = 560;
const CENTER = { x: WIDTH / 2, y: 260 };
const PERSON_RADIUS = 130;
const INTEREST_RADIUS = 95;
const MAX_PEOPLE = 6;
const MAX_INTERESTS_SHOWN = 4;

function polar(cx: number, cy: number, radius: number, angleRad: number) {
  return { x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) };
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * A node-and-edge architecture diagram of what GIVIT remembers: you at the
 * center, each saved person one ring out, and their known interests as their
 * own satellite nodes branching further out from them. Each person's
 * satellites are confined to a narrow arc around that person's own angle
 * (scaled down as more people are added) so two people's interest clusters
 * can never visually collide with each other.
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
          <p className="max-w-sm text-sm text-muted-foreground">Add a person and this fills in automatically: you, them, and what GIVIT learns about them over time.</p>
        </Link>
      </section>
    );
  }

  const angleStep = (2 * Math.PI) / people.length;
  // Half-width (in degrees) of the angular slice each person "owns" for
  // their own interest satellites, with a safety margin subtracted so
  // adjacent people's clusters never reach into each other's slice even at
  // MAX_PEOPLE (the tightest spacing, 60° per person).
  const sectorHalfDeg = Math.min(28, 360 / people.length / 2 - 4);

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
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto h-auto w-full" role="img" aria-label="Diagram of saved people and their known interests">
          {/* Center -> person spokes */}
          {people.map((person, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            const personPos = polar(CENTER.x, CENTER.y, PERSON_RADIUS, angle);
            return <line key={`edge-${person.id}`} x1={CENTER.x} y1={CENTER.y} x2={personPos.x} y2={personPos.y} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1.5} className="text-givit-ember" />;
          })}

          {/* Person -> interest satellite spokes + nodes, drawn before the
              person nodes so each person's own circle paints on top of its
              spokes' inner endpoints. */}
          {people.map((person, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            const personPos = polar(CENTER.x, CENTER.y, PERSON_RADIUS, angle);
            const shown = person.interests.slice(0, MAX_INTERESTS_SHOWN);
            const extra = person.interests.length - shown.length;
            const items = extra > 0 ? [...shown, `+${extra} more`] : shown;
            if (items.length === 0) return null;
            const spread = items.length > 1 ? sectorHalfDeg : 0;

            return (
              <g key={`satellites-${person.id}`}>
                {items.map((label, idx) => {
                  const t = items.length > 1 ? idx / (items.length - 1) : 0.5;
                  const offsetDeg = (t - 0.5) * 2 * spread;
                  const satAngle = angle + (offsetDeg * Math.PI) / 180;
                  const satPos = polar(CENTER.x, CENTER.y, PERSON_RADIUS + INTEREST_RADIUS, satAngle);
                  const cos = Math.cos(satAngle);
                  const anchor = cos > 0.15 ? "start" : cos < -0.15 ? "end" : "middle";
                  const isVertical = anchor === "middle";
                  const textX = satPos.x + (anchor === "start" ? 9 : anchor === "end" ? -9 : 0);
                  const textY = isVertical ? satPos.y + 18 : satPos.y + 4;
                  const isMore = label.startsWith("+");
                  return (
                    <g key={`${person.id}-sat-${idx}`}>
                      {isMore && <title>{person.interests.slice(MAX_INTERESTS_SHOWN).join(", ")}</title>}
                      <line x1={personPos.x} y1={personPos.y} x2={satPos.x} y2={satPos.y} stroke="currentColor" strokeOpacity={0.2} strokeWidth={1} className="text-givit-coral" />
                      <circle cx={satPos.x} cy={satPos.y} r={6} className={isMore ? "fill-none stroke-givit-coral" : "fill-givit-coral"} strokeWidth={isMore ? 1.5 : 0} />
                      <text x={textX} y={textY} textAnchor={anchor} className="fill-foreground text-[11px] font-medium">
                        {isMore ? label : truncate(label, 16)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          <circle cx={CENTER.x} cy={CENTER.y} r={24} className="fill-black" />
          <text x={CENTER.x} y={CENTER.y + 5} textAnchor="middle" className="fill-white text-[13px] font-bold">You</text>

          {people.map((person, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            const pos = polar(CENTER.x, CENTER.y, PERSON_RADIUS, angle);
            const hasInterests = person.interests.length > 0;
            return (
              <g key={`node-${person.id}`}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={20}
                  className={hasInterests ? "fill-givit-ember" : "fill-none stroke-givit-ember"}
                  strokeWidth={hasInterests ? 0 : 2.5}
                  strokeDasharray={hasInterests ? undefined : "5 3"}
                />
                <text x={pos.x} y={pos.y + 5} textAnchor="middle" className={hasInterests ? "fill-white text-[13px] font-bold" : "fill-givit-ember text-[13px] font-bold"}>
                  {person.name[0]?.toUpperCase()}
                </text>
                <text x={pos.x} y={pos.y + 35} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
                  {truncate(person.name, 14)}
                </text>
                {!hasInterests && (
                  <text x={pos.x} y={pos.y + 51} textAnchor="middle" className="fill-muted-foreground text-[11px] italic">
                    nothing known yet
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{people.length}</span> {people.length === 1 ? "person" : "people"} mapped ·{" "}
          <span className="font-semibold">{people.filter((p) => p.interests.length > 0).length}</span> with interests known
        </p>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-black" /> You</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-givit-ember" /> Person</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-givit-coral" /> Interest</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-dashed border-givit-ember" /> Still learning</span>
        </div>
      </div>
    </section>
  );
}
