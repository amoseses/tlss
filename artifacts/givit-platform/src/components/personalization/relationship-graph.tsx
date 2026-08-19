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

// Muted, deliberately desaturated -- the brand's actual ember/coral are
// full-saturation accent colors meant for a button you click once, not for
// a dozen glowing, constantly-pulsing nodes sitting on screen the whole
// time a page is open. A reviewer flagged the graph as reading "AI-ish";
// swapping in dustier, quieter tones and dropping the glow filter and the
// looping motion is what actually fixes that, not just a palette swap.
const NODE_COLOR = "#c98a5c"; // muted rust -- person nodes
const SATELLITE_COLOR = "#b06e82"; // muted dusty rose -- interest satellites
const GRAPH_BG = "#16151a";

/**
 * A node-and-edge map of what GIVIT remembers: you at the center, each
 * saved person one ring out, their known interests as satellite nodes
 * branching further out. Deliberately still, not animated -- a calm,
 * legible diagram reads more confident than a screensaver.
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

      <div className="relative overflow-hidden rounded-2xl p-3 sm:p-4" style={{ background: GRAPH_BG }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="relative mx-auto h-auto w-full" role="img" aria-label="Map of saved people and their known interests">
          {/* faint static field of unconnected dots -- reads as "network",
              not just "diagram" */}
          {Array.from({ length: 26 }).map((_, i) => {
            const fx = (i * 137.5) % WIDTH;
            const fy = (i * 71.3) % HEIGHT;
            return <circle key={`field-${i}`} cx={fx} cy={fy} r={1} className="fill-white/[0.06]" />;
          })}

          {/* Center -> person spokes, curved, still (no traveling pulse --
              constant looping motion on every spoke read as a screensaver). */}
          {people.map((person, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            const personPos = polar(CENTER.x, CENTER.y, PERSON_RADIUS, angle);
            const d = curvePath(CENTER.x, CENTER.y, personPos.x, personPos.y);
            return <path key={`edge-${person.id}`} d={d} stroke={NODE_COLOR} strokeOpacity={0.35} strokeWidth={1.25} fill="none" />;
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
                      <path d={satD} stroke={SATELLITE_COLOR} strokeOpacity={0.4} strokeWidth={1} fill="none" />
                      <circle
                        cx={satPos.x}
                        cy={satPos.y}
                        r={4.5}
                        fill={isMore ? "none" : SATELLITE_COLOR}
                        stroke={isMore ? SATELLITE_COLOR : undefined}
                        strokeWidth={isMore ? 1.5 : 0}
                      />
                      <text x={textX} y={textY} textAnchor={anchor} className="fill-white/70 text-[11px] font-medium">
                        {isMore ? label : truncate(label, 16)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          <defs>
            <linearGradient id="you-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={NODE_COLOR} />
              <stop offset="100%" stopColor={SATELLITE_COLOR} />
            </linearGradient>
          </defs>
          <circle cx={CENTER.x} cy={CENTER.y} r={22} fill="url(#you-gradient)" />
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
                  fill={hasInterests ? NODE_COLOR : GRAPH_BG}
                  stroke={NODE_COLOR}
                  strokeWidth={hasInterests ? 0 : 2}
                  strokeDasharray={hasInterests ? undefined : "5 3"}
                />
                <text x={pos.x} y={pos.y + 5} textAnchor="middle" className="fill-white text-[13px] font-bold">
                  {initials(person.name)}
                </text>
                <text x={pos.x} y={pos.y + 35} textAnchor="middle" className="fill-white/85 text-[13px] font-semibold">
                  {truncate(person.name, 14)}
                </text>
                {!hasInterests && (
                  <text x={pos.x} y={pos.y + 51} textAnchor="middle" className="fill-white/45 text-[11px] italic">
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
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: `linear-gradient(135deg, ${NODE_COLOR}, ${SATELLITE_COLOR})` }} /> You</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_COLOR }} /> Person</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: SATELLITE_COLOR }} /> Interest</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-dashed" style={{ borderColor: NODE_COLOR }} /> Still learning</span>
        </div>
      </div>
    </section>
  );
}
