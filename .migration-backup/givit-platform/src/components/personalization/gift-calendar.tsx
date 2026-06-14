"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CalendarDays, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const KEY = "givit-gift-calendar";
const EVENT_TYPES = ["Birthday", "Anniversary", "Holiday", "Graduation", "Wedding"];

type GiftEvent = {
  id: string;
  name: string;
  type: string;
  date: string;
  interests: string;
};

function readEvents(): GiftEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GiftEvent[]) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: GiftEvent[]) {
  window.localStorage.setItem(KEY, JSON.stringify(events));
}

function daysUntil(date: string) {
  const today = new Date();
  const target = new Date(`${date}T12:00:00`);
  target.setFullYear(today.getFullYear());
  if (target.getTime() < today.getTime()) target.setFullYear(today.getFullYear() + 1);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function GiftCalendar() {
  const [events, setEvents] = useState<GiftEvent[]>(() => readEvents());
  const [draft, setDraft] = useState({ name: "Mom", type: "Birthday", date: "", interests: "coffee, books, cozy home" });

  const sorted = useMemo(() => [...events].sort((a, b) => daysUntil(a.date) - daysUntil(b.date)), [events]);
  const next = sorted[0];

  function save(nextEvents: GiftEvent[]) {
    setEvents(nextEvents);
    writeEvents(nextEvents);
  }

  return (
    <section className="givit-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-givit-ember"><CalendarDays className="h-4 w-4" /> Personal gift calendar</p>
          <h2 className="mt-2 font-serif text-2xl font-bold text-givit-ink">Bring users back before big moments.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Track birthdays, anniversaries, holidays, graduations, and weddings. Givit turns each reminder into AI-ranked gift options.</p>
        </div>
        {next ? (
          <div className="rounded-2xl bg-givit-sand p-4 text-sm text-givit-ink">
            <div className="flex items-center gap-2 font-bold"><Bell className="h-4 w-4 text-givit-ember" /> Alert preview</div>
            <p className="mt-1 text-muted-foreground">Your {next.name}&apos;s {next.type.toLowerCase()} is in {daysUntil(next.date)} days. Based on their profile, here are 3 excellent options.</p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_160px_160px_1fr_auto]">
        <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} className="h-11 rounded-xl border border-border px-3 text-sm" placeholder="Person" />
        <select value={draft.type} onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value }))} className="h-11 rounded-xl border border-border px-3 text-sm">
          {EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}
        </select>
        <input type="date" value={draft.date} onChange={(e) => setDraft((prev) => ({ ...prev, date: e.target.value }))} className="h-11 rounded-xl border border-border px-3 text-sm" />
        <input value={draft.interests} onChange={(e) => setDraft((prev) => ({ ...prev, interests: e.target.value }))} className="h-11 rounded-xl border border-border px-3 text-sm" placeholder="Interests" />
        <Button type="button" className="h-11 rounded-xl bg-givit-ember text-white hover:bg-givit-ember-hover" onClick={() => {
          if (!draft.name || !draft.date) return;
          save([{ id: crypto.randomUUID(), ...draft }, ...events]);
        }}><Plus className="h-4 w-4" /> Add</Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map((event) => (
          <div key={event.id} className="rounded-2xl border border-border/70 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-givit-ink">{event.name} · {event.type}</p>
                <p className="text-xs text-muted-foreground">{daysUntil(event.date)} days away · {event.interests}</p>
              </div>
              <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => save(events.filter((item) => item.id !== event.id))}><Trash2 className="h-4 w-4" /></button>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-3 rounded-full">
              <Link href={`/gift?prompt=${encodeURIComponent(`Gift for ${event.name}, ${event.type}, likes ${event.interests}`)}`}>Get 3 options</Link>
            </Button>
          </div>
        ))}
        {sorted.length === 0 ? <p className="rounded-2xl border border-dashed border-givit-ember/30 bg-givit-sand/40 p-4 text-sm text-muted-foreground">Add a first reminder to unlock monthly gift alerts.</p> : null}
      </div>
    </section>
  );
}
