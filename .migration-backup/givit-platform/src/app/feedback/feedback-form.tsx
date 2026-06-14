"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { submitFeedbackAction } from "@/app/actions/feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FeedbackForm({ defaultEmail }: { defaultEmail?: string | null }) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await submitFeedbackAction({
          subject: String(fd.get("subject")),
          message: String(fd.get("message")),
          email: defaultEmail ? undefined : String(fd.get("email")),
        });
        toast.success("Thank you — we’ve received your message.");
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not send feedback");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!defaultEmail ? (
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@company.com" />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" name="subject" required placeholder="How can we help?" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" required rows={6} placeholder="Details about your request…" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send feedback"}
      </Button>
    </form>
  );
}
