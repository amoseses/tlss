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
// time a page is open. Dustier, quieter tones stay the base palette; the
// one glow that exists (below) is scoped to a single node at a time for
// exactly that reason.
const NODE_COLOR = "#c98a5c"; // muted rust -- person nodes
const SATELLITE_COLOR = "#b06e82"; // muted dusty rose -- interest satellites
const GRAPH_BG = "#16151a";
const SCAN_INTERVAL_MS = 3200;

/**
 * A node-and-edge map of what GIVIT remembers: you at the center, each
 * saved person one ring out, their known interests as satellite nodes
 * branching further out. Mostly still -- a calm, legible diagram reads
 * more confident than a screensaver -- except for one deliberate signal:
 * a single node "under scan" at a time, glowing and read out in the data
 * panel, the way an instrument highlights the one channel it's currently
 * reporting rather than lighting up all of them at once.
 */
export function RelationshipGraph() {
  const { user } = useAuth();
  const [people, setPeople] = useState<GraphPerson[] | null>(null);
  const [scanIdx, setScanIdx] = useState(0);

  useEffect(() => {
    if (!user) { setPeople(null); return; }
    let mounted = true;
    getGiftRecipients(user.id).then((rows: any[]) => {
      if (!mounted) return;
      setPeople(rows.slice(0, MAX_PEOPLE).map((r) => ({ id: r.id, name: r.name, interests: r.interests ?? [] })));
    });
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (!people || people.length === 0) return;
    const id = setInterval(() => setScanIdx((i) => (i + 1) % people.length), SCAN_INTERVAL_MS);
    return () => clearInterval(id);
  }, [people]);

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
        {/* Ambient drift, not decoration bolted on top -- two slow, blurred
            fields of color moving underneath everything else, the same
            technique an ambient looping background reel uses to keep a dark
            panel from feeling static without ever drawing the eye. */}
        <div className="pointer-events-none absolute -left-16 top-6 h-56 w-56 rounded-full opacity-25 blur-3xl animate-drift" style={{ background: NODE_COLOR }} />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-64 w-64 rounded-full opacity-20 blur-3xl animate-drift-slow" style={{ background: SATELLITE_COLOR }} />

        {/* The data readout -- one node's real numbers stated plainly,
            cycling with which node is under scan, the way an instrument
            reports the channel it's currently reading rather than a
            decorative label sitting still. */}
        {(() => {
          const scanned = people[scanIdx];
          if (!scanned) return null;
          return (
            <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-[10px] uppercase leading-relaxed text-white/70 backdrop-blur-sm sm:right-4 sm:top-4">
              <p className="font-bold tracking-widest text-white/40">MEMORY SCAN</p>
              <p className="text-white/40">NODE {String(scanIdx + 1).padStart(2, "0")} / {String(people.length).padStart(2, "0")}</p>
              <p className="mt-1 font-bold tracking-wide text-white">{truncate(scanned.name, 18)}</p>
              <p className="text-white/50">{scanned.interests.length} INTEREST{scanned.interests.length === 1 ? "" : "S"} LOGGED</p>
            </div>
          );
        })()}

        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="relative mx-auto h-auto w-full" role="img" aria-label="Map of saved people and their known interests">
          <defs>
            {/* Scoped to whichever single node is under scan -- everything
                else on the graph stays flat and calm, which is what keeps
                this reading as an instrument taking one reading at a time
                instead of a dozen things glowing and pulsing at once. */}
            <filter id="scan-glow" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="5" result="blur" />
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
            return <circle key={`field-${i}`} cx={fx} cy={fy} r={1} className="fill-white/[0.06]" />;
          })}

          {/* Center -> person spokes, curved and still, except the one
              currently under scan: that edge glows and carries a single
              traveling pulse, restarting each scan cycle. */}
          {people.map((person, i) => {
            const angle = -Math.PI / 2 + i * angleStep;
            const personPos = polar(CENTER.x, CENTER.y, PERSON_RADIUS, angle);
            const d = curvePath(CENTER.x, CENTER.y, personPos.x, personPos.y);
            const isScanned = i === scanIdx;
            return (
              <g key={`edge-${person.id}`}>
                <path
                  d={d}
                  stroke={NODE_COLOR}
                  strokeOpacity={isScanned ? 0.8 : 0.3}
                  strokeWidth={isScanned ? 1.75 : 1.25}
                  fill="none"
                  filter={isScanned ? "url(#scan-glow)" : undefined}
                />
                {isScanned && (
                  <circle r={3} fill={NODE_COLOR}>
                    <animateMotion key={scanIdx} dur="1.6s" repeatCount="indefinite" path={d} />
                  </circle>
                )}
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
            const isScanned = i === scanIdx;
            return (
              <g key={`node-${person.id}`} filter={isScanned ? "url(#scan-glow)" : undefined}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isScanned ? 22 : 20}
                  fill={hasInterests ? NODE_COLOR : GRAPH_BG}
                  stroke={NODE_COLOR}
                  strokeWidth={hasInterests ? 0 : 2}
                  strokeDasharray={hasInterests ? undefined : "5 3"}
                  style={{ transition: "r 0.4s ease" }}
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
