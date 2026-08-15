import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Share2, UserRound } from "lucide-react";

import { useAuth } from "@/lib/auth/use-auth";
import { getGiftRecipients } from "@/lib/supabase/db";
import { initials } from "@/lib/utils";

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

// A gently curved connector between two points instead of a straight line --
// real neural-net / graph visualizations almost never use dead-straight
// spokes, and the curve is what an <animateMotion> dot can actually glide
// along smoothly.
function curvePath(x1: number, y1: number, x2: number, y2: number, bow = 0.18) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = mx - dy * bow;
  const cy = my + dx * bow;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * A node-and-edge map of what GIVIT remembers, styled to actually read as a
 * live neural network rather than a boxed org chart: dark field, glowing
 * nodes, curved connectors with small pulses of "signal" animating outward
 * from center. You at the center, each saved person one ring out, their
 * known interests as satellite nodes branching further out from them.
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
        <div className="mb-5 flex items-center gap-2">
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
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-givit-ember" />
          <h2 className="font-serif text-2xl font-bold text-foreground md:text-3xl">Your memory graph</h2>
        </div>
        <Link href="/people" className="givit-link shrink-0 text-sm font-medium">Manage people →</Link>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-black p-3 sm:p-4">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-givit-ember/15 blur-3xl" />
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="relative mx-auto h-auto w-full" role="img" aria-label="Neural map of saved people and their known interests">
          <defs>
            <filter id="graph-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* faint static field of unconnected dots -- reads as "network",
              not just "diagram" */}
          {Array.from({ length: 26 }).map((_, i) => {
            const fx = (i * 137.5) % WIDTH;
            const fy = (i * 71.3) % HEIGHT;
            return <circle key={`field-${i}`} cx={fx} cy={fy} r={1} className="fill-white/10" />;
          })}

          {/* Center -> person spokes, curved, with a glowing pulse traveling
              outward on a loop so the whole thing reads as live, not static. */}
          {people.map((person, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            const personPos = polar(CENTER.x, CENTER.y, PERSON_RADIUS, angle);
            const d = curvePath(CENTER.x, CENTER.y, personPos.x, personPos.y);
            return (
              <g key={`edge-${person.id}`}>
                <path d={d} stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5} fill="none" className="text-givit-ember" />
                <circle r={2.5} className="fill-givit-ember" filter="url(#graph-glow)">
                  <animateMotion dur={`${2.4 + (i % 3) * 0.5}s`} begin={`${i * 0.3}s`} repeatCount="indefinite" path={d} />
                </circle>
              </g>
            );
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
                  const satD = curvePath(personPos.x, personPos.y, satPos.x, satPos.y, 0.12);
                  return (
                    <g key={`${person.id}-sat-${idx}`}>
                      {isMore && <title>{person.interests.slice(MAX_INTERESTS_SHOWN).join(", ")}</title>}
                      <path d={satD} stroke="currentColor" strokeOpacity={0.3} strokeWidth={1} fill="none" className="text-givit-coral" />
                      <circle
                        cx={satPos.x}
                        cy={satPos.y}
                        r={5}
                        filter="url(#graph-glow)"
                        className={isMore ? "fill-none stroke-givit-coral" : "fill-givit-coral"}
                        strokeWidth={isMore ? 1.5 : 0}
                      />
                      <text x={textX} y={textY} textAnchor={anchor} className="fill-white/80 text-[11px] font-medium">
                        {isMore ? label : truncate(label, 16)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          <circle cx={CENTER.x} cy={CENTER.y} r={30} className="fill-givit-ember/25">
            <animate attributeName="r" values="30;36;30" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.6s" repeatCount="indefinite" />
          </circle>
          <circle cx={CENTER.x} cy={CENTER.y} r={22} fill="url(#you-gradient)" filter="url(#graph-glow)" />
          <defs>
            <linearGradient id="you-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--givit-ember)" />
              <stop offset="100%" stopColor="var(--givit-coral)" />
            </linearGradient>
          </defs>
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
                  filter="url(#graph-glow)"
                  className={hasInterests ? "fill-givit-ember" : "fill-black stroke-givit-ember"}
                  strokeWidth={hasInterests ? 0 : 2.5}
                  strokeDasharray={hasInterests ? undefined : "5 3"}
                />
                <text x={pos.x} y={pos.y + 5} textAnchor="middle" className={hasInterests ? "fill-white text-[13px] font-bold" : "fill-givit-ember text-[13px] font-bold"}>
                  {initials(person.name)}
                </text>
                <text x={pos.x} y={pos.y + 35} textAnchor="middle" className="fill-white text-[13px] font-semibold">
                  {truncate(person.name, 14)}
                </text>
                {!hasInterests && (
                  <text x={pos.x} y={pos.y + 51} textAnchor="middle" className="fill-white/50 text-[11px] italic">
                    nothing known yet
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{people.length}</span> {people.length === 1 ? "person" : "people"} mapped ·{" "}
          <span className="font-semibold">{people.filter((p) => p.interests.length > 0).length}</span> with interests known
        </p>
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full givit-gradient" /> You</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-givit-ember" /> Person</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-givit-coral" /> Interest</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-dashed border-givit-ember" /> Still learning</span>
        </div>
      </div>
    </section>
  );
}
