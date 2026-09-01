// Gifter personality cohorts -- "gifting is a two-way street": the
// recommendation engine has always scored purely on the RECIPIENT's
// interests. This adds a light signal from the GIFTER's own style too, on
// the idea that a poetic/sentimental gifter and a practical/utilitarian
// gifter would often pick differently for the exact same recipient.
//
// Traits are deliberately drawn only from words that already exist in the
// real interest-tag vocabulary (see TAG_MAP in gift-recommend.ts and the
// `interests` arrays across the marketplace catalog) -- an invented tag
// here would never match anything and the whole signal would be a no-op.
//
// This is intentionally a light tie-breaking nudge, not a second scoring
// axis: it only ever adds a few points on top of the existing
// interest-match score (see gift-recommend.ts's cohortBoost), so a strong
// recipient-interest match always still wins. The "quiz" is a simple
// self-report, not a validated psychometric instrument -- treat it the
// same way a horoscope or a Buzzfeed quiz is treated: a fun, honest-effort
// personalization signal, not a scientific claim.

// `icon` names a lucide-react component (matching the icon language used
// everywhere else in the app) -- kept as a string here rather than
// importing React components into a plain data file, resolved via
// COHORT_ICONS in the UI components that render it. `emoji` is kept
// separately, only for share text (a text message benefits from an emoji;
// the actual on-site UI doesn't use it anymore -- raw emoji-in-a-circle
// badges read as generic "quiz app" decoration next to the rest of the
// site's considered, single-color icon treatment).
export type GiftingCohort = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  traits: string[];
  icon: "PenLine" | "Gem" | "Anchor" | "Zap" | "Users" | "Building2";
  emoji: string;
};

export const GIFTING_COHORTS: GiftingCohort[] = [
  {
    id: "poet",
    name: "The Poet",
    tagline: "You gift what can't be bought off a shelf.",
    description: "You reach for something with meaning behind it -- a note, a story, a detail only they'd catch. The wrapping matters as much as what's inside.",
    traits: ["keepsake", "reading", "writing", "journaling", "art"],
    icon: "PenLine",
    emoji: "🖋️",
  },
  {
    id: "curator",
    name: "The Curator",
    tagline: "You'd rather give one perfect thing than five good ones.",
    description: "You have a specific eye, and it shows in what you pick. Generic gift sets aren't really your thing -- you're after something that feels chosen, not grabbed.",
    traits: ["unique", "lifestyle", "art", "creative"],
    icon: "Gem",
    emoji: "🎨",
  },
  {
    id: "anchor",
    name: "The Anchor",
    tagline: "You gift what people actually reach for.",
    description: "Useful beats flashy. You're the one who remembers what someone mentioned needing weeks ago and shows up with exactly that.",
    traits: ["tools", "desk setup", "organization", "office"],
    icon: "Anchor",
    emoji: "🔧",
  },
  {
    id: "spark",
    name: "The Spark",
    tagline: "You gift moments, not objects.",
    description: "A ticket, a trip, a reservation -- if it can turn into a memory, you're in. Stuff sits on a shelf; experiences don't.",
    traits: ["fun", "travel", "outdoor", "entertainment"],
    icon: "Zap",
    emoji: "✨",
  },
  {
    id: "connector",
    name: "The Connector",
    tagline: "You gift to make someone feel remembered.",
    description: "You track birthdays other people forget and notice when someone's had a rough month. Your gifts say \"I see you\" more than \"happy birthday.\"",
    traits: ["home", "family", "self care", "comfort"],
    icon: "Users",
    emoji: "🤝",
  },
  {
    id: "architect",
    name: "The Architect",
    tagline: "You gift things built to last.",
    description: "Quality over quantity, always. You'd rather someone unwrap one well-made thing they'll still be using in five years than a pile of stuff.",
    traits: ["coffee", "kitchen", "tech", "professional"],
    icon: "Building2",
    emoji: "🏛️",
  },
];

export function getCohort(id: string | null | undefined): GiftingCohort | null {
  return GIFTING_COHORTS.find((c) => c.id === id) ?? null;
}

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: { label: string; cohortId: string }[];
};

// 6 questions x 6 options each, one option per cohort per question (order
// shuffled per question so cohort position isn't a giveaway) -- short
// enough to actually finish, specific enough that answers don't cluster.
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "default-gift",
    prompt: "Your default \"I don't know what to get them\" gift is...",
    options: [
      { label: "A book or journal with a note inside", cohortId: "poet" },
      { label: "Something from a small brand they've never heard of", cohortId: "curator" },
      { label: "A gift card, so they pick exactly what they need", cohortId: "anchor" },
      { label: "Tickets to something, not a thing", cohortId: "spark" },
      { label: "A handwritten card, whatever else I add on", cohortId: "connector" },
      { label: "One nice item they'll use for years", cohortId: "architect" },
    ],
  },
  {
    id: "biggest-fear",
    prompt: "What you least want to give is...",
    options: [
      { label: "Something impersonal", cohortId: "poet" },
      { label: "Something generic everyone already owns", cohortId: "curator" },
      { label: "Something that just sits unused", cohortId: "anchor" },
      { label: "Something they'll forget by next month", cohortId: "spark" },
      { label: "Something that feels like an afterthought", cohortId: "connector" },
      { label: "Something cheaply made", cohortId: "architect" },
    ],
  },
  {
    id: "best-gift-received",
    prompt: "The best gift you ever received was...",
    options: [
      { label: "Something with a story or a message attached", cohortId: "poet" },
      { label: "Something no one else would've thought to get me", cohortId: "curator" },
      { label: "Something I actually needed", cohortId: "anchor" },
      { label: "A trip or an experience, not an object", cohortId: "spark" },
      { label: "Something that showed they'd been paying attention", cohortId: "connector" },
      { label: "Something built well enough to last", cohortId: "architect" },
    ],
  },
  {
    id: "shopping-style",
    prompt: "When you're shopping for someone, you...",
    options: [
      { label: "Think about what would mean something to them specifically", cohortId: "poet" },
      { label: "Look for the thing nobody else would find", cohortId: "curator" },
      { label: "Think back to what they've complained about not having", cohortId: "anchor" },
      { label: "Look for something to do together, not buy", cohortId: "spark" },
      { label: "Think about how to make them feel thought of", cohortId: "connector" },
      { label: "Look for the best-made version of something classic", cohortId: "architect" },
    ],
  },
  {
    id: "wrapping",
    prompt: "How a gift is presented...",
    options: [
      { label: "Matters a lot -- the reveal is part of it", cohortId: "poet" },
      { label: "Should match the thing's own personality", cohortId: "curator" },
      { label: "Isn't the point, the usefulness is", cohortId: "anchor" },
      { label: "Barely matters, the plan is the gift", cohortId: "spark" },
      { label: "Should feel personal, even if it's simple", cohortId: "connector" },
      { label: "Should be clean and understated", cohortId: "architect" },
    ],
  },
  {
    id: "compliment",
    prompt: "The compliment you'd most want about your gifting is...",
    options: [
      { label: "\"That felt like it was really from you\"", cohortId: "poet" },
      { label: "\"I would never have found that myself\"", cohortId: "curator" },
      { label: "\"I use this literally every day\"", cohortId: "anchor" },
      { label: "\"That was the best day I've had in ages\"", cohortId: "spark" },
      { label: "\"I can't believe you remembered that\"", cohortId: "connector" },
      { label: "\"This is going to last me forever\"", cohortId: "architect" },
    ],
  },
];

export function scoreQuiz(answers: Record<string, string>): string {
  const tally = new Map<string, number>();
  for (const cohortId of Object.values(answers)) {
    tally.set(cohortId, (tally.get(cohortId) ?? 0) + 1);
  }
  let best = GIFTING_COHORTS[0]!.id;
  let bestScore = -1;
  // Iterate cohorts in fixed declaration order (not tally's insertion
  // order) so a tie always resolves the same way, deterministically.
  for (const cohort of GIFTING_COHORTS) {
    const score = tally.get(cohort.id) ?? 0;
    if (score > bestScore) { bestScore = score; best = cohort.id; }
  }
  return best;
}
