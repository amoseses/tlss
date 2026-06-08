"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Gift, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const KEY = "givit-login-prompt-dismissed-v2";

export function LoginPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(KEY);
    const timer = window.setTimeout(() => setOpen(!dismissed), 500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/40 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-givit-ember text-white"><Gift className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Start Givit Autopilot</p>
              <h2 className="font-serif text-2xl font-bold text-givit-ink">Log in before notification setup.</h2>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close login prompt"
            onClick={() => {
              window.localStorage.setItem(KEY, "1");
              setOpen(false);
            }}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-givit-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Givit now starts with an account prompt, then takes customers directly into the notification setup for dates, recipients, safe payment tokens, addresses, and the service on/off switch.
        </p>
        <div className="mt-4 rounded-2xl bg-givit-sand p-3 text-sm text-givit-ink">
          <div className="flex items-center gap-2 font-semibold"><Bell className="h-4 w-4 text-givit-ember" /> After login</div>
          <p className="mt-1 text-muted-foreground">Add each person and date. Givit schedules the survey five weeks before the date and waits for approval before ordering.</p>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button asChild className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover"><Link href="/login?next=%2Fconcierge">Log in and set up</Link></Button>
          <Button asChild variant="outline" className="rounded-full"><Link href="/signup?next=%2Fconcierge">Create account</Link></Button>
        </div>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(KEY, "1");
            setOpen(false);
          }}
          className="mt-3 w-full text-center text-xs font-semibold text-muted-foreground hover:text-givit-ember"
        >
          Browse first
        </button>
      </div>
    </div>
  );
}
