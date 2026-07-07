import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/use-auth";

type GiftReview = {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  giftedTo: string;
  date: string;
  isUser?: boolean;
};

const STORAGE_KEY = "givit-gift-reviews";

const REVIEWER_NAMES = ["Maya R.", "Jordan T.", "Priya S.", "Chris L.", "Sam W.", "Elena V.", "Marcus B.", "Avery K.", "Nina P.", "Diego M."];
const GIFTED_TO = ["my mom", "my best friend", "my partner", "my dad", "my sister", "a coworker", "my brother", "my grandma"];
const TITLES = [
  "Perfect gift, big reaction",
  "Exactly what they wanted",
  "Great quality for the price",
  "They use it every day",
  "Safe pick that landed well",
  "Better in person than the photos",
];
const BODIES = [
  "Wrapped beautifully and arrived on time. The recipient lit up when they opened it — already getting daily use.",
  "I was nervous about picking something they didn't already have, but this was a hit. Quality feels well above the price.",
  "Bought this through Givit's recommendation and it matched their interests perfectly. Would gift again.",
  "Solid, practical gift that doesn't feel boring. They mentioned it again a week later, which never happens.",
  "Packaging was gift-ready and the item itself feels premium. Easy win for a tricky person to shop for.",
  "Took a chance on this and it paid off. It fit their hobby exactly and they said it was the most thoughtful gift this year.",
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function seededReviews(productId: string): GiftReview[] {
  const seed = hashString(productId);
  const count = 3 + (seed % 3);
  return Array.from({ length: count }, (_, index) => {
    const offset = seed + index * 7;
    return {
      id: `${productId}-seed-${index}`,
      author: REVIEWER_NAMES[offset % REVIEWER_NAMES.length]!,
      rating: 4 + ((offset >> 2) % 2),
      title: TITLES[offset % TITLES.length]!,
      body: BODIES[(offset >> 1) % BODIES.length]!,
      giftedTo: GIFTED_TO[offset % GIFTED_TO.length]!,
      date: new Date(Date.UTC(2026, (offset % 5), 1 + (offset % 27))).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  });
}

function readUserReviews(productId: string): GiftReview[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, GiftReview[]>;
    return Array.isArray(all[productId]) ? all[productId] : [];
  } catch {
    return [];
  }
}

function writeUserReview(productId: string, review: GiftReview) {
  try {
    const all = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, GiftReview[]>;
    all[productId] = [review, ...(all[productId] ?? [])];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore storage failures
  }
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} className={`h-4 w-4 ${index < value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </span>
  );
}

export function GiftReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [userReviews, setUserReviews] = useState<GiftReview[]>(() => readUserReviews(productId));
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);

  const reviews = [...userReviews, ...seededReviews(productId)];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const review: GiftReview = {
      id: `user-${Date.now()}`,
      author: String(data.get("author") || "Givit shopper").trim() || "Givit shopper",
      rating,
      title: String(data.get("title") || "Gift review").trim() || "Gift review",
      body: String(data.get("body") || "").trim(),
      giftedTo: String(data.get("gifted_to") || "someone special").trim() || "someone special",
      date: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      isUser: true,
    };
    if (!review.body) {
      toast.error("Add a few words about how the gift landed.");
      return;
    }
    writeUserReview(productId, review);
    setUserReviews((current) => [review, ...current]);
    setShowForm(false);
    form.reset();
    toast.success("Gift review added. Thanks for helping other gifters!");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif text-xl font-bold text-givit-ink">Gift reviews</h3>
        {user ? (
          <Button type="button" variant="outline" className="rounded-full" onClick={() => setShowForm((value) => !value)}>
            {showForm ? "Cancel" : "Write a gift review"}
          </Button>
        ) : (
          <Button asChild type="button" variant="outline" className="rounded-full">
            <Link href={`/login?next=${encodeURIComponent(location)}`}>Log in to write a review</Link>
          </Button>
        )}
      </div>

      {showForm && user ? (
        <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl border border-border/70 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="gift-review-author">Your name</Label>
              <Input id="gift-review-author" name="author" placeholder="Alex G." />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="gift-review-gifted-to">Who you gifted it to</Label>
              <Input id="gift-review-gifted-to" name="gifted_to" placeholder="my sister" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Rating</Label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, index) => (
                <button key={index} type="button" aria-label={`${index + 1} stars`} onClick={() => setRating(index + 1)}>
                  <Star className={`h-6 w-6 ${index < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gift-review-title">Headline</Label>
            <Input id="gift-review-title" name="title" placeholder="Perfect gift, big reaction" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="gift-review-body">How did the gift land?</Label>
            <Textarea id="gift-review-body" name="body" rows={4} placeholder="What was the reaction? Was it useful? Worth the price?" required />
          </div>
          <Button className="w-fit bg-givit-ember text-white hover:bg-givit-ember-hover">Post gift review</Button>
        </form>
      ) : null}

      <div className="grid gap-3">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-border/70 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Stars value={review.rating} />
              <span className="font-semibold text-givit-ink">{review.title}</span>
              {review.isUser ? <span className="rounded-full bg-givit-ember/10 px-2 py-0.5 text-xs font-medium text-givit-ember">Your review</span> : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {review.author} · gifted to {review.giftedTo} · {review.date}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
