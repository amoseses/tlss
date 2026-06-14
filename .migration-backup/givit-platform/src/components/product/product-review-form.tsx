"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { submitReviewAction } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  productId: string;
  productSlug: string;
};

export function ProductReviewForm({ productId, productSlug }: Props) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const rating = Number.parseInt(String(fd.get("rating")), 10);
    const title = String(fd.get("title") ?? "");
    const body = String(fd.get("body") ?? "");
    startTransition(async () => {
      try {
        await submitReviewAction({
          productId,
          productSlug,
          rating,
          title,
          body,
        });
        toast.success("Thanks — your review was saved.");
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not submit review");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rating">Rating</Label>
          <select
            id="rating"
            name="rating"
            required
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-ring focus-visible:ring-2"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} — {n === 5 ? "Excellent" : n === 1 ? "Poor" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title_heading">Title (optional)</Label>
          <Input id="title_heading" name="title" placeholder="Great for our shops" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Review</Label>
        <Textarea id="body" name="body" rows={4} placeholder="Share details that help other buyers." />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
      <p className="text-muted-foreground text-xs">
        One review per product — submitting again updates your existing review.
      </p>
    </form>
  );
}
