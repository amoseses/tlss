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
//
// Redesigned Sept 2026 into 4 "Master Gifting Families" (Guilds) per the
// product blueprint: fewer, more distinct cohorts read as more premium and
// more shareable than 6 similar-feeling ones, and simplify the AI tone hook
// below into 4 clean personas instead of 6 overlapping ones.

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
  guildName: string;
  tagline: string;
  description: string;
  traits: string[];
  icon: "Feather" | "PartyPopper" | "Building2" | "Heart";
  emoji: string;
};

export const GIFTING_COHORTS: GiftingCohort[] = [
  {
    id: "bard",
    name: "The Bard",
    guildName: "The Bards",
    tagline: "Gifting is a narrative, not a transaction.",
    description: "A gift is a vessel for an unspoken bond, a memory, or a shared history -- the written sentiment is the heart of it. You reach for what tells the story of your relationship, not just what's on a shelf.",
    traits: ["keepsake", "reading", "writing", "journaling", "art", "creative"],
    icon: "Feather",
    emoji: "🖋️",
  },
  {
    id: "troubadour",
    name: "The Troubadour",
    guildName: "The Troubadours",
    tagline: "Gifting is an act of sudden, unadulterated joy.",
    description: "A gift is at its most magical when it's unexpected -- no calendar obligation, just pure spontaneous delight. You prioritize immediate smiles, surprise packages, and sensory thrills over anything that feels planned.",
    traits: ["fun", "travel", "outdoor", "entertainment", "experience"],
    icon: "PartyPopper",
    emoji: "🎉",
  },
  {
    id: "architect",
    name: "The Architect",
    guildName: "The Architects",
    tagline: "Gifting is a lifestyle upgrade.",
    description: "If it doesn't structurally optimize, organize, or improve a daily routine, it's clutter. You value lifetime durability and functional excellence, and you'd rather find the best-engineered version of something than the flashiest.",
    traits: ["tools", "desk setup", "organization", "office", "tech", "professional"],
    icon: "Building2",
    emoji: "🏛️",
  },
  {
    id: "nourisher",
    name: "The Nourisher",
    guildName: "The Nourishers",
    tagline: "Gifting is decompression.",
    description: "In a hyper-stimulated world, the ultimate luxury is a restorative reset -- slow living and deep sanctuary. You protect the nervous systems of the people you love, and your gifts say \"rest\" more than anything else.",
    traits: ["home", "family", "self care", "comfort"],
    icon: "Heart",
    emoji: "🕯️",
  },
];

export function getCohort(id: string | null | undefined): GiftingCohort | null {
  return GIFTING_COHORTS.find((c) => c.id === id) ?? null;
}

// Groq system-prompt tone hooks, one per guild -- appended to the AI
// card-drafting prompt (see gift-ai.ts's personalizeAutogiftSuggestions)
// so the same candidate list produces a note that actually sounds like a
// different person wrote it, not just a different pick order.
export const COHORT_TONE_HOOKS: Record<string, string> = {
  bard: "The gifter's own gifting personality is 'The Bard': draft the card note in an elegant, warm, and highly lyrical voice. Weave in emotional resonance, connection, and nostalgia. Avoid transactional, dry phrasing.",
  troubadour: "The gifter's own gifting personality is 'The Troubadour': draft the card note with explosive, high-energy joy. Use exclamation points, celebratory inside-joke energy, and fun, playful, spontaneous language.",
  architect: "The gifter's own gifting personality is 'The Architect': draft the card note in a clean, professional, minimalist tone. Focus on structural utility, lifetime quality, and sleek, functional appreciation.",
  nourisher: "The gifter's own gifting personality is 'The Nourisher': draft the card note in a soothing, comforting, restorative tone. Offer deep permission to slow down, breathe, and decompress in a cozy space.",
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: { label: string; cohortId: string }[];
};

// 20 situational questions x 4 options each (A=bard, B=troubadour,
// C=architect, D=nourisher) -- see the Sept 2026 product blueprint. Kept in
// that fixed A/B/C/D order per question (not shuffled) to match the source
// spec exactly; four fairly distinct voices per question already avoids the
// "obvious pattern" problem a shuffle would otherwise guard against.
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "birthday-objective",
    prompt: "When you select a gift for someone's birthday, what is your primary objective?",
    options: [
      { label: "To write a message or choose an item that tells the unique story of your relationship.", cohortId: "bard" },
      { label: "To create an exciting 'wow' moment and see immediate delight on their face.", cohortId: "troubadour" },
      { label: "To solve a specific, practical challenge they face or upgrade an item they use daily.", cohortId: "architect" },
      { label: "To help them decompress, relax, and enjoy some luxurious, peaceful downtime.", cohortId: "nourisher" },
    ],
  },
  {
    id: "shop-window",
    prompt: "It's a random Tuesday and you see something in a shop window that reminds you of your friend. What do you do?",
    options: [
      { label: "Bookmark it or buy it, then wait for a meaningful milestone to present it with a long letter.", cohortId: "bard" },
      { label: "Buy it immediately and have it sent to their house as a 'just because' mid-week surprise.", cohortId: "troubadour" },
      { label: "Analyze if they actually have a functional space or need for it before making a purchase.", cohortId: "architect" },
      { label: "Choose a comforting, sensory alternative instead, like a warm beverage or a self-care treat.", cohortId: "nourisher" },
    ],
  },
  {
    id: "card-message",
    prompt: "When writing a greeting card to accompany a gift, your message is typically:",
    options: [
      { label: "Highly personal, nostalgic, and long -- often recalling a specific shared memory.", cohortId: "bard" },
      { label: "Enthusiastic, playful, and high-energy -- full of warm inside jokes and celebratory cheers.", cohortId: "troubadour" },
      { label: "Short, clean, and practical -- focusing on the utility of the gift or a straightforward congrats.", cohortId: "architect" },
      { label: "Soothing, gentle, and warm -- offering permission to rest, recharge, and slow down.", cohortId: "nourisher" },
    ],
  },
  {
    id: "likely-buy",
    prompt: "Which of the following gift items are you most likely to buy for a loved one?",
    options: [
      { label: "A custom-bound book of letters or a framed map of where you first met.", cohortId: "bard" },
      { label: "Tickets to an underground pop-up culinary event or a colorful, interactive unboxing puzzle.", cohortId: "troubadour" },
      { label: "A lifetime-guaranteed, over-engineered multi-tool or a sleek ergonomic charging station.", cohortId: "architect" },
      { label: "A premium weighted blanket, an organic botanical candle, or a luxury lavender bath set.", cohortId: "nourisher" },
    ],
  },
  {
    id: "unboxing",
    prompt: "How do you feel about the 'unboxing' experience of a gift?",
    options: [
      { label: "The wrapping should contain subtle clues or a card that must be read first to understand the gift.", cohortId: "bard" },
      { label: "It should be a major event -- using creative layers, unique materials, or playful mechanics to build suspense.", cohortId: "troubadour" },
      { label: "The packaging should be minimal, structural, and recyclable -- clean design is what matters most.", cohortId: "architect" },
      { label: "The unboxing should feel therapeutic -- using soft, textured tissue papers and calming scents.", cohortId: "nourisher" },
    ],
  },
  {
    id: "new-job",
    prompt: "Your friend is starting a demanding new job next week. What do you send them?",
    options: [
      { label: "A handwritten letter sharing how proud you are, highlighting their journey and strengths.", cohortId: "bard" },
      { label: "A surprise celebratory cupcake or delivery coffee sent directly to their office on morning one.", cohortId: "troubadour" },
      { label: "A modular, highly organized desk planner or a premium ergonomic lumbar support cushion.", cohortId: "architect" },
      { label: "An anti-stress care package containing chamomile tea, essential oils, and eye relaxation masks.", cohortId: "nourisher" },
    ],
  },
  {
    id: "pet-peeve",
    prompt: "What is your biggest pet peeve when receiving a gift from someone else?",
    options: [
      { label: "When the gift feels generic or implies they don't actually know who I am inside.", cohortId: "bard" },
      { label: "When the exchange feels overly rigid, transactional, or lacks any sense of fun or surprise.", cohortId: "troubadour" },
      { label: "When the gift is a cheap, flimsy trinket that serves no purpose and immediately accumulates dust.", cohortId: "architect" },
      { label: "When the gift is highly active or demanding, forcing me to do work rather than letting me relax.", cohortId: "nourisher" },
    ],
  },
  {
    id: "artisan-market",
    prompt: "When you walk through a local artisan market, what catches your eye first?",
    options: [
      { label: "Objects that carry a rich local history, a compelling backstory, or a poetic origin.", cohortId: "bard" },
      { label: "High-spirited, colorful, or highly unusual items that make you laugh or spark immediate curiosity.", cohortId: "troubadour" },
      { label: "Highly durable, master-crafted tools, structured leather bags, or technical gadgets.", cohortId: "architect" },
      { label: "Soft hand-woven textiles, herbal bath salts, single-origin honey, and aromatic soy candles.", cohortId: "nourisher" },
    ],
  },
  {
    id: "one-word",
    prompt: "If you had to describe your personal gifting philosophy in one word, it would be:",
    options: [
      { label: "Connection.", cohortId: "bard" },
      { label: "Surprise.", cohortId: "troubadour" },
      { label: "Utility.", cohortId: "architect" },
      { label: "Sanctuary.", cohortId: "nourisher" },
    ],
  },
  {
    id: "burnt-out",
    prompt: "A close family member is feeling burnt out and exhausted. Your immediate instinct is to gift them:",
    options: [
      { label: "A memory book capturing past family vacations to remind them of happier, slower times.", cohortId: "bard" },
      { label: "An impromptu, fun road trip or a ticket to a lively concert to break up the monotony.", cohortId: "troubadour" },
      { label: "A smart home device that automates their home tasks to shave 30 minutes off their chores.", cohortId: "architect" },
      { label: "A luxurious 'do-nothing' day kit -- complete with gourmet cocoa, cozy socks, and a sleeping mask.", cohortId: "nourisher" },
    ],
  },
  {
    id: "budget",
    prompt: "How do you decide on the budget for a gift?",
    options: [
      { label: "Budget is secondary; I'll spend whatever is necessary to bring a highly specific, meaningful vision to life.", cohortId: "bard" },
      { label: "I love spending on interactive experiences or high-impact reveals, prioritizing fun over cost-containment.", cohortId: "troubadour" },
      { label: "I view budget as a strict spec -- aiming to find the absolute highest-engineered, durable item in that range.", cohortId: "architect" },
      { label: "I prioritize premium, luxurious materials that feel high-quality to the touch, ensuring a sensory indulgence.", cohortId: "nourisher" },
    ],
  },
  {
    id: "housewarming",
    prompt: "Your friend has moved into a new apartment. Your housewarming gift is:",
    options: [
      { label: "A personalized, custom drawing of their old house to preserve the memories of where they came from.", cohortId: "bard" },
      { label: "A playful, fast-paced tabletop board game to kick off their very first housewarming party.", cohortId: "troubadour" },
      { label: "A high-efficiency cordless vacuum, a smart power strip, or a master chef's utility knife.", cohortId: "architect" },
      { label: "A beautifully scented botanical diffuser or a luxurious, heavy waffle-weave bath towel set.", cohortId: "nourisher" },
    ],
  },
  {
    id: "colleague-thanks",
    prompt: "You want to show appreciation to a work colleague who helped you finish a major project. You:",
    options: [
      { label: "Leave a deeply thoughtful, personalized thank-you letter on their desk detailing their impact.", cohortId: "bard" },
      { label: "Walk up to their desk with an unexpected, premium iced coffee and their favorite artisanal pastry.", cohortId: "troubadour" },
      { label: "Buy them a premium, highly fluid writing pen or a sleek, double-walled commuter coffee flask.", cohortId: "architect" },
      { label: "Gift them a voucher for a local massage or a premium, relaxing herbal infusion desk set.", cohortId: "nourisher" },
    ],
  },
  {
    id: "secret-santa",
    prompt: "When planning a gift exchange event (like Secret Santa), your favorite part is:",
    options: [
      { label: "Quietly researching my assigned person to uncover a highly sentimental, unexpected connection.", cohortId: "bard" },
      { label: "Setting up the games, the funny reveal rules, and capturing the energetic reactions of the group.", cohortId: "troubadour" },
      { label: "Ensuring the logistics run flawlessly -- using spreadsheet budget trackers and clear wishlists.", cohortId: "architect" },
      { label: "Curating the warm atmosphere -- making sure there are cozy drinks, soft blankets, and ambient music.", cohortId: "nourisher" },
    ],
  },
  {
    id: "social-post",
    prompt: "Which of these social media posts about a gift would make you feel most proud?",
    options: [
      { label: "\"This letter made me cry... they remembered something I said three years ago!\"", cohortId: "bard" },
      { label: "\"I can't believe they set up a scavenger hunt just to reveal these concert tickets!\"", cohortId: "troubadour" },
      { label: "\"This is the most bulletproof, high-spec gear I've ever owned. I use it literally every day.\"", cohortId: "architect" },
      { label: "\"I'm currently wrapped in the absolute coziest blanket, drinking the best tea. Total bliss.\"", cohortId: "nourisher" },
    ],
  },
  {
    id: "book-gift",
    prompt: "If you are gifting a book, you are most drawn to:",
    options: [
      { label: "A rare, out-of-print classic or a poetry anthology with your own handwritten margin notes.", cohortId: "bard" },
      { label: "A highly interactive art book, a graphic novel, or a collection of fun, conversational trivia.", cohortId: "troubadour" },
      { label: "A comprehensive, technical manual on master craft, behavioral systems, or life-optimization hacks.", cohortId: "architect" },
      { label: "A beautiful, slow-living coffee table book focused on interior sanctuary, gardening, or slow baking.", cohortId: "nourisher" },
    ],
  },
  {
    id: "relationships-purpose",
    prompt: "What do you think is the ultimate purpose of human relationships?",
    options: [
      { label: "To share deep, meaningful emotional stories and walk through life's chapters together.", cohortId: "bard" },
      { label: "To create shared moments of high-spirited adventure, play, and unforgettable laughter.", cohortId: "troubadour" },
      { label: "To support each other's growth, optimize daily workflows, and build stable, efficient lives.", cohortId: "architect" },
      { label: "To provide a safe haven of comfort, mutual care, and sanctuary from the chaotic outside world.", cohortId: "nourisher" },
    ],
  },
  {
    id: "kid-gift",
    prompt: "You are buying a gift for a child. Your instinct is to select:",
    options: [
      { label: "A nostalgic fairy tale book that you loved when you were their age, with a personal dedication.", cohortId: "bard" },
      { label: "A colorful, high-suspense cooperative action game or a DIY science experiment kit.", cohortId: "troubadour" },
      { label: "A beautifully structured building blocks set or a high-durability kids' toolset.", cohortId: "architect" },
      { label: "An incredibly soft, comforting plush animal or a cozy sensory night-light projector.", cohortId: "nourisher" },
    ],
  },
  {
    id: "travel-gift",
    prompt: "Your partner is planning a major, stressful travel trip. You gift them:",
    options: [
      { label: "A travel diary with a sweet note on the first page, encouraging them to document every feeling.", cohortId: "bard" },
      { label: "A playful travel challenge list or a high-impact surprise booking for a secret local tour.", cohortId: "troubadour" },
      { label: "A set of modular, compression-packing cubes and a multi-device universal travel adapter.", cohortId: "architect" },
      { label: "A luxurious travel comfort kit with a silk eye mask, lavender mist, and a memory foam neck pillow.", cohortId: "nourisher" },
    ],
  },
  {
    id: "recipient-feeling",
    prompt: "Ultimately, how do you want the recipient to feel the moment they receive your gift?",
    options: [
      { label: "Deeply loved, remembered, and emotionally connected to you.", cohortId: "bard" },
      { label: "Delighted, surprised, and filled with playful, high-spirited energy.", cohortId: "troubadour" },
      { label: "Equipped, organized, and structurally upgraded for their daily life.", cohortId: "architect" },
      { label: "Soothed, comforted, and given permission to slow down and rest.", cohortId: "nourisher" },
    ],
  },
];

// Deterministic tie-break priority per the product blueprint, independent
// of GIFTING_COHORTS' own (display) order: Bards (emotional/relationship
// bedrock of the app) > Nourishers (retention/sanctuary driver) >
// Architects (practical/utility monetization) > Troubadours (viral/
// spontaneous engine).
const TIE_BREAK_ORDER = ["bard", "nourisher", "architect", "troubadour"];

export function scoreQuiz(answers: Record<string, string>): string {
  const tally = new Map<string, number>();
  for (const cohortId of Object.values(answers)) {
    tally.set(cohortId, (tally.get(cohortId) ?? 0) + 1);
  }
  let best = TIE_BREAK_ORDER[0]!;
  let bestScore = -1;
  for (const cohortId of TIE_BREAK_ORDER) {
    const score = tally.get(cohortId) ?? 0;
    if (score > bestScore) { bestScore = score; best = cohortId; }
  }
  return best;
}
