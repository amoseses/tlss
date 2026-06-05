import type { Category, Product, ProductImage, ProductRatingStats } from "@/types/database";

export type MarketplaceProduct = Product & {
  affiliate_url: string;
  retailer: string;
  brand: string;
  price_range: string;
  rank: number;
  gift_match_score: number;
  tested_badge: string;
  interests: string[];
  occasions: string[];
  recipients: string[];
  ai_summary: string;
  why_we_picked_it: string;
  images: ProductImage[];
  category: Category | null;
};

export const MARKETPLACE_CATEGORIES: Category[] = [
  { id: "cat-tech", slug: "tech", name: "Tech", sort_order: 1 },
  { id: "cat-gaming", slug: "gaming", name: "Gaming", sort_order: 2 },
  { id: "cat-home", slug: "home", name: "Home", sort_order: 3 },
  { id: "cat-kitchen", slug: "kitchen", name: "Kitchen", sort_order: 4 },
  { id: "cat-books", slug: "books", name: "Books", sort_order: 5 },
  { id: "cat-writing", slug: "writing", name: "Writing", sort_order: 6 },
  { id: "cat-beauty", slug: "beauty", name: "Beauty", sort_order: 7 },
  { id: "cat-outdoor", slug: "outdoor", name: "Outdoor", sort_order: 8 },
  { id: "cat-fitness", slug: "fitness", name: "Fitness", sort_order: 9 },
  { id: "cat-pets", slug: "pets", name: "Pets", sort_order: 10 },
  { id: "cat-art", slug: "art", name: "Art", sort_order: 11 },
  { id: "cat-food", slug: "food", name: "Food", sort_order: 12 },
];

type SeedProduct = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  priceRange: string;
  retailer: string;
  affiliateUrl: string;
  image: string;
  rank: number;
  score: number;
  interests: string[];
  occasions: string[];
  recipients: string[];
  summary: string;
  why: string;
  badge: string;
};

const img = (id: string) => `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;

const SEED_PRODUCTS: SeedProduct[] = [
  { slug: "sony-wh-1000xm5", name: "Sony WH-1000XM5 Noise Canceling Headphones", brand: "Sony", category: "tech", price: 39800, priceRange: "$300-$400", retailer: "Sony", affiliateUrl: "https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b", image: img("photo-1505740420928-5e560c06d30e"), rank: 1, score: 98, interests: ["music", "travel", "work from home"], occasions: ["birthday", "graduation", "christmas"], recipients: ["partner", "student", "commuter"], summary: "Premium headphones for people who need quiet focus, long flights, or better everyday listening.", why: "Best all-around comfort, active noise canceling, and mainstream usability for most gift recipients.", badge: "Editor tested" },
  { slug: "kindle-paperwhite", name: "Kindle Paperwhite", brand: "Amazon", category: "books", price: 15999, priceRange: "$125-$175", retailer: "Amazon", affiliateUrl: "https://www.amazon.com/dp/B08KTZ8249", image: img("photo-1512820790803-83ca734da794"), rank: 2, score: 97, interests: ["reading", "travel", "minimalism"], occasions: ["birthday", "mother's day", "father's day"], recipients: ["reader", "parent", "traveler"], summary: "A lightweight waterproof e-reader that makes books easy to carry and easy to gift.", why: "High utility, broad appeal, and a clear upgrade over reading on a phone.", badge: "Certified practical" },
  { slug: "pilot-custom-823", name: "Pilot Custom 823 Fountain Pen", brand: "Pilot", category: "writing", price: 33600, priceRange: "$250-$350", retailer: "Pilot Pen", affiliateUrl: "https://www.pilotpen.us/categories/fountain-pens/custom-823-fountain/", image: img("photo-1455390582262-044cdead277a"), rank: 3, score: 96, interests: ["writing", "journaling", "pens"], occasions: ["graduation", "anniversary", "retirement"], recipients: ["writer", "professional", "collector"], summary: "A grail-level fountain pen for writers who value craft, smoothness, and daily ritual.", why: "A proven enthusiast favorite that feels special without being fragile or obscure.", badge: "Gift-worthy classic" },
  { slug: "apple-airtags-4-pack", name: "Apple AirTag 4 Pack", brand: "Apple", category: "tech", price: 9900, priceRange: "$75-$110", retailer: "Apple", affiliateUrl: "https://www.apple.com/airtag/", image: img("photo-1606220588913-b3aacb4d2f46"), rank: 4, score: 95, interests: ["travel", "organization", "tech"], occasions: ["stocking stuffer", "graduation", "travel"], recipients: ["traveler", "student", "parent"], summary: "Small item trackers that help people avoid losing keys, bags, wallets, and luggage.", why: "Useful immediately, easy to split across bags, and ideal for frequent travelers.", badge: "Everyday save" },
  { slug: "lego-botanicals-orchid", name: "LEGO Botanicals Orchid", brand: "LEGO", category: "home", price: 4999, priceRange: "$40-$60", retailer: "LEGO", affiliateUrl: "https://www.lego.com/en-us/product/orchid-10311", image: img("photo-1526047932273-341f2a7631f9"), rank: 5, score: 94, interests: ["plants", "design", "crafts"], occasions: ["housewarming", "mother's day", "birthday"], recipients: ["plant lover", "creative", "coworker"], summary: "A relaxing build that becomes tasteful decor and never needs watering.", why: "Combines activity plus keepsake, which makes it stronger than a generic bouquet.", badge: "Keepsake pick" },
  { slug: "ember-temperature-control-mug", name: "Ember Temperature Control Smart Mug 2", brand: "Ember", category: "home", price: 12995, priceRange: "$100-$150", retailer: "Ember", affiliateUrl: "https://ember.com/products/ember-mug-2", image: img("photo-1514432324607-a09d9b4aefdd"), rank: 6, score: 93, interests: ["coffee", "desk setup", "work"], occasions: ["father's day", "birthday", "christmas"], recipients: ["coffee lover", "remote worker", "teacher"], summary: "A desk-friendly mug that keeps coffee or tea warm through long work sessions.", why: "Feels indulgent but solves a daily annoyance for hot-drink people.", badge: "Daily delight" },
  { slug: "theragun-mini", name: "Therabody Theragun Mini", brand: "Therabody", category: "fitness", price: 19900, priceRange: "$150-$225", retailer: "Therabody", affiliateUrl: "https://www.therabody.com/us/en-us/theragun-mini.html", image: img("photo-1518611012118-696072aa579a"), rank: 7, score: 92, interests: ["fitness", "wellness", "running"], occasions: ["birthday", "father's day", "holiday"], recipients: ["athlete", "runner", "busy parent"], summary: "A compact massage device for soreness, recovery, and post-workout relief.", why: "Portable, less intimidating than full-size massage guns, and useful for many ages.", badge: "Recovery tested" },
  { slug: "stanley-quencher-h2-0", name: "Stanley Quencher H2.0 FlowState Tumbler", brand: "Stanley", category: "fitness", price: 4500, priceRange: "$35-$55", retailer: "Stanley", affiliateUrl: "https://www.stanley1913.com/products/adventure-quencher-travel-tumbler-40-oz", image: img("photo-1602143407151-7111542de6e8"), rank: 8, score: 91, interests: ["fitness", "hydration", "commuting"], occasions: ["birthday", "back to school", "teacher gifts"], recipients: ["student", "teacher", "gym friend"], summary: "A durable handled tumbler that encourages hydration at home, work, and the gym.", why: "Popular for a reason: it is practical, visible, and easy to personalize.", badge: "Crowd favorite" },
  { slug: "ninja-creami", name: "Ninja CREAMi Ice Cream Maker", brand: "Ninja", category: "kitchen", price: 19999, priceRange: "$175-$230", retailer: "Ninja Kitchen", affiliateUrl: "https://www.ninjakitchen.com/products/ninja-creami-ice-cream-maker-zidNC301", image: img("photo-1501443762994-82bd5dace89a"), rank: 9, score: 91, interests: ["food", "dessert", "family"], occasions: ["housewarming", "wedding", "christmas"], recipients: ["foodie", "family", "host"], summary: "A fun kitchen machine for custom ice cream, protein desserts, and weekend experiments.", why: "Turns gifting into an experience people can repeat and share.", badge: "Fun factor" },
  { slug: "aeropress-clear", name: "AeroPress Clear Coffee Maker", brand: "AeroPress", category: "kitchen", price: 4995, priceRange: "$40-$60", retailer: "AeroPress", affiliateUrl: "https://aeropress.com/products/aeropress-clear", image: img("photo-1495474472287-4d71bcdd2085"), rank: 10, score: 90, interests: ["coffee", "travel", "camping"], occasions: ["father's day", "stocking stuffer", "graduation"], recipients: ["coffee lover", "traveler", "student"], summary: "A compact manual brewer that makes smooth coffee almost anywhere.", why: "Low learning curve, easy cleanup, and strong value for coffee fans.", badge: "Best under $60" },
  { slug: "nintendo-switch-oled", name: "Nintendo Switch OLED Model", brand: "Nintendo", category: "gaming", price: 34999, priceRange: "$300-$375", retailer: "Nintendo", affiliateUrl: "https://www.nintendo.com/us/store/products/nintendo-switch-oled-model-white-set-112870/", image: img("photo-1606144042614-b2417e99c4e3"), rank: 11, score: 90, interests: ["gaming", "family", "travel"], occasions: ["birthday", "christmas", "graduation"], recipients: ["gamer", "kid", "family"], summary: "A flexible console for couch co-op, solo play, and portable gaming.", why: "One of the safest gaming gifts because its library spans kids, adults, and parties.", badge: "Family favorite" },
  { slug: "backbone-one-controller", name: "Backbone One Mobile Gaming Controller", brand: "Backbone", category: "gaming", price: 9999, priceRange: "$80-$120", retailer: "Backbone", affiliateUrl: "https://playbackbone.com/products/backbone-one/", image: img("photo-1593305841991-05c297ba4575"), rank: 12, score: 89, interests: ["gaming", "mobile", "travel"], occasions: ["birthday", "graduation", "christmas"], recipients: ["teen", "gamer", "commuter"], summary: "A phone controller that makes mobile and cloud gaming feel closer to a handheld console.", why: "Great for gamers who already have a phone but do not need another console.", badge: "Smart upgrade" },
  { slug: "dyson-airwrap", name: "Dyson Airwrap Multi-Styler", brand: "Dyson", category: "beauty", price: 59999, priceRange: "$500-$650", retailer: "Dyson", affiliateUrl: "https://www.dyson.com/hair-care/hair-stylers/airwrap", image: img("photo-1522335789203-aabd1fc54bc9"), rank: 13, score: 89, interests: ["beauty", "hair care", "self care"], occasions: ["anniversary", "christmas", "milestone"], recipients: ["partner", "beauty fan", "professional"], summary: "A premium hair tool set for styling with less extreme heat than traditional tools.", why: "Expensive, but memorable when the recipient has explicitly wanted a beauty splurge.", badge: "Splurge pick" },
  { slug: "sol-de-janeiro-bum-bum-set", name: "Sol de Janeiro Bum Bum Jet Set", brand: "Sol de Janeiro", category: "beauty", price: 3200, priceRange: "$25-$40", retailer: "Sol de Janeiro", affiliateUrl: "https://soldejaneiro.com/products/brazilian-bum-bum-jet-set", image: img("photo-1596462502278-27bfdc403348"), rank: 14, score: 88, interests: ["beauty", "travel", "self care"], occasions: ["stocking stuffer", "birthday", "valentine's day"], recipients: ["friend", "teen", "traveler"], summary: "A travel-size body-care set with a crowd-pleasing scent profile.", why: "Giftable packaging, reasonable price, and low sizing risk.", badge: "Easy win" },
  { slug: "yeti-rambler-mug", name: "YETI Rambler 14 oz Mug", brand: "YETI", category: "outdoor", price: 3000, priceRange: "$25-$40", retailer: "YETI", affiliateUrl: "https://www.yeti.com/drinkware/mugs/21071500588.html", image: img("photo-1500530855697-b586d89ba3ee"), rank: 15, score: 88, interests: ["camping", "coffee", "outdoor"], occasions: ["father's day", "stocking stuffer", "camping trip"], recipients: ["camper", "dad", "coffee lover"], summary: "A rugged insulated mug for camp mornings, garages, desks, and backyards.", why: "Durable enough to feel premium without requiring personal sizing details.", badge: "Rugged pick" },
  { slug: "patagonia-black-hole-duffel", name: "Patagonia Black Hole Duffel 55L", brand: "Patagonia", category: "outdoor", price: 16900, priceRange: "$150-$190", retailer: "Patagonia", affiliateUrl: "https://www.patagonia.com/product/black-hole-duffel-bag-55-liters/49343.html", image: img("photo-1488646953014-85cb44e25828"), rank: 16, score: 87, interests: ["travel", "outdoor", "adventure"], occasions: ["graduation", "birthday", "retirement"], recipients: ["traveler", "camper", "student"], summary: "A durable travel duffel that works for road trips, camps, gyms, and long weekends.", why: "One-bag utility with better longevity than trendy luggage.", badge: "Travel tested" },
  { slug: "our-place-always-pan", name: "Our Place Always Pan 2.0", brand: "Our Place", category: "kitchen", price: 15000, priceRange: "$125-$175", retailer: "Our Place", affiliateUrl: "https://fromourplace.com/products/always-essential-cooking-pan", image: img("photo-1556911220-bff31c812dba"), rank: 17, score: 87, interests: ["cooking", "home", "design"], occasions: ["housewarming", "wedding", "graduation"], recipients: ["new homeowner", "couple", "foodie"], summary: "A design-forward pan that covers many everyday cooking jobs in one attractive piece.", why: "Useful for new apartments and kitchens where storage space matters.", badge: "Housewarming hero" },
  { slug: "masterclass-membership", name: "MasterClass Membership", brand: "MasterClass", category: "books", price: 12000, priceRange: "$100-$180", retailer: "MasterClass", affiliateUrl: "https://www.masterclass.com/", image: img("photo-1503676260728-1c00da094a0b"), rank: 18, score: 86, interests: ["learning", "creativity", "career"], occasions: ["graduation", "birthday", "retirement"], recipients: ["lifelong learner", "creative", "professional"], summary: "A learning gift for people who like cooking, writing, business, music, film, and more.", why: "Flexible for recipients whose exact hobby you know but exact item you do not.", badge: "Experience gift" },
  { slug: "moleskine-classic-notebook", name: "Moleskine Classic Notebook", brand: "Moleskine", category: "writing", price: 2495, priceRange: "$20-$30", retailer: "Moleskine", affiliateUrl: "https://www.moleskine.com/en-us/shop/notebooks/the-original/classic-notebook-black-8056420850551.html", image: img("photo-1517842645767-c639042777db"), rank: 19, score: 86, interests: ["journaling", "school", "productivity"], occasions: ["stocking stuffer", "graduation", "teacher gifts"], recipients: ["writer", "student", "teacher"], summary: "A clean notebook that pairs well with pens, planners, and creative goals.", why: "Affordable, polished, and easy to bundle into a thoughtful gift board.", badge: "Bundle builder" },
  { slug: "anker-737-power-bank", name: "Anker 737 Power Bank", brand: "Anker", category: "tech", price: 14999, priceRange: "$120-$170", retailer: "Anker", affiliateUrl: "https://www.anker.com/products/a1289", image: img("photo-1609091839311-d5365f9ff1c5"), rank: 20, score: 85, interests: ["tech", "travel", "work"], occasions: ["graduation", "travel", "father's day"], recipients: ["traveler", "student", "remote worker"], summary: "A high-capacity portable charger for laptops, tablets, phones, and travel days.", why: "Less flashy, but often the gift people actually use every week.", badge: "Problem solver" },
  { slug: "fujifilm-instax-mini-12", name: "Fujifilm Instax Mini 12 Instant Camera", brand: "Fujifilm", category: "art", price: 7995, priceRange: "$70-$95", retailer: "Fujifilm", affiliateUrl: "https://instax.com/mini12/en/", image: img("photo-1516035069371-29a1b244cc32"), rank: 21, score: 85, interests: ["photography", "parties", "scrapbooking"], occasions: ["birthday", "graduation", "wedding"], recipients: ["teen", "creative", "host"], summary: "A cheerful instant camera for parties, dorms, trips, and memory boards.", why: "Creates an activity and a keepsake in the same gift.", badge: "Memory maker" },
  { slug: "barkbox-gift", name: "BarkBox Gift Subscription", brand: "BarkBox", category: "pets", price: 3500, priceRange: "$25-$45/mo", retailer: "BarkBox", affiliateUrl: "https://www.barkbox.com/gift", image: img("photo-1517849845537-4d257902454a"), rank: 22, score: 84, interests: ["dogs", "pets", "subscriptions"], occasions: ["birthday", "housewarming", "holiday"], recipients: ["dog owner", "family", "pet parent"], summary: "A recurring box of dog toys and treats for the recipient and their pet.", why: "Great when the recipient insists they do not need anything but loves their dog.", badge: "Pet-parent pick" },
  { slug: "chewy-goody-box", name: "Chewy Goody Box", brand: "Chewy", category: "pets", price: 2499, priceRange: "$20-$35", retailer: "Chewy", affiliateUrl: "https://www.chewy.com/b/goody-boxes-11348", image: img("photo-1548199973-03cce0bbc87b"), rank: 23, score: 84, interests: ["dogs", "cats", "pets"], occasions: ["stocking stuffer", "new pet", "birthday"], recipients: ["pet owner", "coworker", "neighbor"], summary: "A themed treat-and-toy box for cats or dogs with minimal guesswork.", why: "Budget-friendly and more personal than a generic bottle of wine.", badge: "Low-risk gift" },
  { slug: "jacquard-tie-dye-kit", name: "Jacquard Tie Dye Kit", brand: "Jacquard", category: "art", price: 2999, priceRange: "$20-$35", retailer: "Jacquard", affiliateUrl: "https://www.jacquardproducts.com/tie-dye-kits", image: img("photo-1513364776144-60967b0f800f"), rank: 24, score: 83, interests: ["art", "crafts", "kids"], occasions: ["birthday", "summer", "family night"], recipients: ["kid", "creative", "family"], summary: "A hands-on craft kit that turns plain shirts and totes into custom projects.", why: "Affordable activity gift with real output instead of screen time.", badge: "Activity gift" },
  { slug: "brightland-olive-oil-duo", name: "Brightland Olive Oil Duo", brand: "Brightland", category: "food", price: 7400, priceRange: "$60-$85", retailer: "Brightland", affiliateUrl: "https://brightland.co/products/the-duo", image: img("photo-1474979266404-7eaacbcd87c5"), rank: 25, score: 83, interests: ["food", "hosting", "cooking"], occasions: ["host gift", "housewarming", "wedding"], recipients: ["host", "foodie", "couple"], summary: "A beautiful olive-oil set that upgrades weeknight cooking and table presentation.", why: "Consumable, elegant, and safer than decor for hosts with specific taste.", badge: "Host approved" },
  { slug: "truff-hot-sauce-pack", name: "TRUFF Hot Sauce Variety Pack", brand: "TRUFF", category: "food", price: 6999, priceRange: "$50-$80", retailer: "TRUFF", affiliateUrl: "https://www.truff.com/products/variety-pack", image: img("photo-1583454110551-21f2fa2afe61"), rank: 26, score: 82, interests: ["food", "spicy", "grilling"], occasions: ["father's day", "host gift", "stocking stuffer"], recipients: ["foodie", "grill master", "coworker"], summary: "A polished hot sauce set for people who like bold flavor and easy kitchen upgrades.", why: "Better presentation than grocery hot sauce and easy to share at gatherings.", badge: "Flavor pick" },
  { slug: "casper-original-pillow", name: "Casper Original Pillow", brand: "Casper", category: "home", price: 6500, priceRange: "$55-$80", retailer: "Casper", affiliateUrl: "https://casper.com/pillows/original-casper-pillow.html", image: img("photo-1505693416388-ac5ce068fe85"), rank: 27, score: 82, interests: ["sleep", "home", "wellness"], occasions: ["housewarming", "self care", "birthday"], recipients: ["partner", "parent", "homebody"], summary: "A supportive pillow upgrade for someone who would not splurge on bedding themselves.", why: "Sleep improvements are practical, personal, and used every night.", badge: "Comfort upgrade" },
  { slug: "tile-mate", name: "Tile Mate Bluetooth Tracker", brand: "Tile", category: "tech", price: 2499, priceRange: "$20-$35", retailer: "Tile", affiliateUrl: "https://www.tile.com/product/black-mate", image: img("photo-1516321318423-f06f85e504b3"), rank: 28, score: 81, interests: ["organization", "travel", "tech"], occasions: ["stocking stuffer", "back to school", "travel"], recipients: ["student", "parent", "commuter"], summary: "A small tracker for keys, bags, and everyday things that go missing.", why: "Excellent affordable alternative when Apple-only tracking is not ideal.", badge: "Under $35" },
  { slug: "hydro-flask-wide-mouth", name: "Hydro Flask Wide Mouth Bottle", brand: "Hydro Flask", category: "outdoor", price: 4495, priceRange: "$35-$55", retailer: "Hydro Flask", affiliateUrl: "https://www.hydroflask.com/32-oz-wide-mouth", image: img("photo-1523362628745-0c100150b504"), rank: 29, score: 81, interests: ["outdoor", "fitness", "school"], occasions: ["graduation", "back to school", "birthday"], recipients: ["student", "hiker", "gym friend"], summary: "A dependable insulated bottle for school, hikes, commutes, and workouts.", why: "Durable, personalizable, and broadly useful across ages.", badge: "Practical pick" },
  { slug: "brooklinen-super-plush-robe", name: "Brooklinen Super-Plush Robe", brand: "Brooklinen", category: "home", price: 9900, priceRange: "$85-$120", retailer: "Brooklinen", affiliateUrl: "https://www.brooklinen.com/products/super-plush-robe", image: img("photo-1604014237800-1c9102c219da"), rank: 30, score: 80, interests: ["self care", "home", "spa"], occasions: ["mother's day", "anniversary", "christmas"], recipients: ["partner", "parent", "homebody"], summary: "A soft hotel-style robe for slow mornings and self-care routines.", why: "Feels luxurious while staying safer than scent, skincare, or clothing sizes.", badge: "Cozy classic" },
];

const categoryBySlug = new Map(MARKETPLACE_CATEGORIES.map((category) => [category.slug, category]));

export const MARKETPLACE_PRODUCTS: MarketplaceProduct[] = SEED_PRODUCTS.map((seed, index) => {
  const category = categoryBySlug.get(seed.category) ?? null;
  const now = new Date(Date.UTC(2026, 5, 1, 12, 0, 0) - index * 86400000).toISOString();
  const id = `gift-${seed.slug}`;

  return {
    id,
    slug: seed.slug,
    name: seed.name,
    description: `${seed.summary}\n\nWhy Givit picked it: ${seed.why}\n\nGreat for: ${seed.recipients.join(", ")}. Interests: ${seed.interests.join(", ")}. Occasions: ${seed.occasions.join(", ")}.`,
    sku: `GIVIT-${String(seed.rank).padStart(3, "0")}`,
    price_cents: seed.price,
    weight_oz: 0,
    min_order_qty: 1,
    stock: 999,
    is_published: true,
    category_id: category?.id ?? null,
    seller_id: null,
    created_at: now,
    updated_at: now,
    affiliate_url: seed.affiliateUrl,
    retailer: seed.retailer,
    brand: seed.brand,
    price_range: seed.priceRange,
    rank: seed.rank,
    gift_match_score: seed.score,
    tested_badge: seed.badge,
    interests: seed.interests,
    occasions: seed.occasions,
    recipients: seed.recipients,
    ai_summary: seed.summary,
    why_we_picked_it: seed.why,
    category,
    images: [
      {
        id: `${id}-image-1`,
        product_id: id,
        storage_path: seed.image,
        sort_order: 0,
      },
    ],
  };
});

export const MARKETPLACE_RATINGS = new Map<string, ProductRatingStats>(
  MARKETPLACE_PRODUCTS.map((product) => [
    product.id,
    {
      product_id: product.id,
      avg_rating: (4.9 - (product.rank % 5) * 0.08).toFixed(1),
      review_count: 4200 - product.rank * 87,
    },
  ]),
);

export function getMarketplaceProductBySlug(slug: string) {
  return MARKETPLACE_PRODUCTS.find((product) => product.slug === slug) ?? null;
}

export function getMarketplaceProducts(options?: { categorySlug?: string; q?: string }) {
  const q = options?.q?.trim().toLowerCase();

  return MARKETPLACE_PRODUCTS.filter((product) => {
    if (options?.categorySlug && product.category?.slug !== options.categorySlug) return false;
    if (!q) return true;

    const searchable = [
      product.name,
      product.brand,
      product.retailer,
      product.category?.name,
      product.ai_summary,
      product.why_we_picked_it,
      ...product.interests,
      ...product.occasions,
      ...product.recipients,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(q);
  });
}

export function getRelatedMarketplaceProducts(product: MarketplaceProduct) {
  return MARKETPLACE_PRODUCTS.filter((candidate) => candidate.id !== product.id)
    .map((candidate) => {
      const overlap = [
        ...candidate.interests.filter((interest) => product.interests.includes(interest)),
        ...candidate.occasions.filter((occasion) => product.occasions.includes(occasion)),
        ...(candidate.category?.slug === product.category?.slug ? [candidate.category?.slug ?? ""] : []),
      ].length;
      return { candidate, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap || a.candidate.rank - b.candidate.rank)
    .slice(0, 6)
    .map(({ candidate }) => candidate);
}

export const GIFT_COLLECTIONS = [
  {
    slug: "perfect-pens-for-writers",
    title: "Perfect Pens For Writers",
    description: "Pens, notebooks, and desk upgrades for people who think better on paper.",
    query: "pens",
    productSlugs: ["pilot-custom-823", "moleskine-classic-notebook", "ember-temperature-control-mug", "sony-wh-1000xm5"],
  },
  {
    slug: "future-christmas-gifts",
    title: "Future Christmas Gifts",
    description: "High-confidence ideas worth saving before the holiday rush.",
    query: "christmas",
    productSlugs: ["kindle-paperwhite", "lego-botanicals-orchid", "nintendo-switch-oled", "theragun-mini"],
  },
  {
    slug: "best-gifts-for-mom",
    title: "Best Gifts For Mom",
    description: "Thoughtful comfort, reading, beauty, and home picks without brand-sponsored ranking.",
    query: "mom",
    productSlugs: ["kindle-paperwhite", "brooklinen-super-plush-robe", "dyson-airwrap", "ember-temperature-control-mug"],
  },
  {
    slug: "cool-tech-under-150",
    title: "Cool Tech Under $150",
    description: "Useful gadgets that solve real problems without becoming clutter.",
    query: "tech",
    productSlugs: ["apple-airtags-4-pack", "anker-737-power-bank", "tile-mate", "backbone-one-controller"],
  },
];
