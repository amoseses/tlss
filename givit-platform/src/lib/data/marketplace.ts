import type { Category, Product, ProductImage, ProductRatingStats } from "@/types/database";

export type MarketplaceProduct = Product & {
  affiliate_url: string;
  retailer: string;
  brand: string;
  price_range: string;
  rank: number;
  category_rank: number;
  gift_match_score: number;
  tested_badge: string;
  sale_price_cents?: number;
  deal_badge?: string;
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
  salePrice?: number;
  dealBadge?: string;
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

  { slug: "pilot-g2-gel-pen-pack", name: "Pilot G2 Premium Gel Pen Set", brand: "Pilot", category: "writing", price: 1299, priceRange: "$10-$20", retailer: "Pilot Pen", affiliateUrl: "https://www.pilotpen.us/categories/gel-ink-rolling-ball-pens/g2/", image: img("photo-1583585089259-09147d1c36d2"), rank: 31, score: 84, interests: ["pens", "writing", "school", "office"], occasions: ["back to school", "stocking stuffer", "teacher appreciation"], recipients: ["student", "teacher", "coworker", "writer"], summary: "A reliable everyday gel pen set for notes, planning, studying, and desk drawers.", why: "An affordable pen gift with broad appeal and a reputation for smooth everyday writing.", badge: "Best everyday pen" },
  { slug: "sharpie-s-gel-metal-barrel", name: "Sharpie S-Gel Metal Barrel Pen", brand: "Sharpie", category: "writing", price: 899, priceRange: "$8-$15", retailer: "Sharpie", affiliateUrl: "https://www.sharpie.com/pens/s-gel/", image: img("photo-1598301257982-0cf014dabbcd"), rank: 32, score: 83, interests: ["pens", "office", "journaling", "writing"], occasions: ["coworker gift", "graduation", "stocking stuffer"], recipients: ["coworker", "student", "planner", "writer"], summary: "A polished metal gel pen that feels upgraded without becoming expensive.", why: "Great for searchers who want a pen gift under $15 that still feels intentional.", badge: "Budget upgrade" },
  { slug: "uni-ball-jetstream-4-and-1", name: "Uni Jetstream 4&1 Multi Pen", brand: "Uni-ball", category: "writing", price: 2299, priceRange: "$20-$30", retailer: "Uni-ball", affiliateUrl: "https://www.unibrands.co/products/jetstream", image: img("photo-1517971071642-34a2d3ecc9cd"), rank: 33, score: 86, interests: ["pens", "planning", "school", "office"], occasions: ["graduation", "back to school", "birthday"], recipients: ["student", "teacher", "professional", "planner"], summary: "A multi-color pen plus mechanical pencil in one streamlined everyday writer.", why: "Useful for planners, students, and anyone who color-codes notes.", badge: "Planner favorite" },
  { slug: "sakura-pigma-micron-set", name: "Sakura Pigma Micron Fineliner Set", brand: "Sakura", category: "writing", price: 1799, priceRange: "$15-$25", retailer: "Sakura", affiliateUrl: "https://www.sakuraofamerica.com/product/pigma-micron/", image: img("photo-1517842645767-c639042777db"), rank: 34, score: 85, interests: ["pens", "art", "journaling", "drawing"], occasions: ["birthday", "graduation", "holiday"], recipients: ["artist", "journaler", "student", "designer"], summary: "Archival fineliners for sketching, bullet journaling, notes, and clean line work.", why: "A safer creative gift because multiple nib sizes make it useful even when you do not know their exact style.", badge: "Creative pick" },
  { slug: "lamy-safari-fountain-pen", name: "LAMY Safari Fountain Pen", brand: "LAMY", category: "writing", price: 2999, priceRange: "$25-$40", retailer: "LAMY", affiliateUrl: "https://www.lamy.com/en/lamy-safari/", image: img("photo-1503602642458-232111445657"), rank: 35, score: 87, interests: ["pens", "writing", "journaling", "design"], occasions: ["graduation", "birthday", "retirement"], recipients: ["writer", "student", "designer", "professional"], summary: "A beginner-friendly fountain pen with iconic design and a smoother writing ritual.", why: "Excellent first fountain pen for someone curious about nicer writing tools.", badge: "Starter fountain pen" },
  { slug: "leuchtturm1917-notebook-pen-loop", name: "Leuchtturm1917 Notebook + Pen Loop", brand: "Leuchtturm1917", category: "writing", price: 2895, priceRange: "$25-$35", retailer: "Leuchtturm1917", affiliateUrl: "https://www.leuchtturm1917.us/", image: img("photo-1531346878377-a5be20888e57"), rank: 36, score: 82, interests: ["pens", "journaling", "writing", "planning"], occasions: ["new job", "graduation", "birthday"], recipients: ["journaler", "student", "professional", "writer"], summary: "A dotted notebook setup that pairs well with favorite pens for planning and reflection.", why: "Makes a pen search more giftable by turning writing supplies into a complete kit.", badge: "Complete desk kit" },
  { slug: "brooklinen-super-plush-robe", name: "Brooklinen Super-Plush Robe", brand: "Brooklinen", category: "home", price: 9900, priceRange: "$85-$120", retailer: "Brooklinen", affiliateUrl: "https://www.brooklinen.com/products/super-plush-robe", image: img("photo-1604014237800-1c9102c219da"), rank: 30, score: 80, interests: ["self care", "home", "spa"], occasions: ["mother's day", "anniversary", "christmas"], recipients: ["partner", "parent", "homebody"], summary: "A soft hotel-style robe for slow mornings and self-care routines.", why: "Feels luxurious while staying safer than scent, skincare, or clothing sizes.", badge: "Cozy classic" },
];


const EXPANSION_BASE: Omit<SeedProduct, "rank" | "score" | "occasions" | "recipients">[] = [
  { slug: "apple-airpods-pro-2", name: "Apple AirPods Pro 2", brand: "Apple", category: "tech", price: 24900, priceRange: "$190-$250", retailer: "Apple", affiliateUrl: "https://www.apple.com/airpods-pro/", image: img("photo-1606220945770-b5b6c2c55bf1"), interests: ["music", "travel", "tech", "work"], summary: "Compact noise-canceling earbuds for commuting, calls, workouts, and everyday listening.", why: "A broadly loved tech gift that is easy to use and easy to carry.", badge: "Highly ranked", salePrice: 19900, dealBadge: "High-score deal" },
  { slug: "anker-737-power-bank", name: "Anker 737 Power Bank", brand: "Anker", category: "tech", price: 14999, priceRange: "$110-$160", retailer: "Anker", affiliateUrl: "https://www.anker.com/products/a1289", image: img("photo-1609091839311-d5365f9ff1c5"), interests: ["travel", "tech", "organization"], summary: "A high-capacity portable charger for laptops, phones, tablets, and travel days.", why: "It solves battery anxiety for students, commuters, and travelers.", badge: "Travel utility", salePrice: 11999, dealBadge: "Power deal" },
  { slug: "backbone-one-controller", name: "Backbone One Mobile Gaming Controller", brand: "Backbone", category: "gaming", price: 9999, priceRange: "$80-$110", retailer: "Backbone", affiliateUrl: "https://playbackbone.com/products/backbone-one/", image: img("photo-1612287230202-1ff1d85d1bdf"), interests: ["gaming", "tech", "travel"], summary: "Turns a phone into a handheld gaming setup for cloud and mobile games.", why: "A fun upgrade for gamers without buying a full console.", badge: "Gamer pick" },
  { slug: "nintendo-switch-oled", name: "Nintendo Switch OLED", brand: "Nintendo", category: "gaming", price: 34999, priceRange: "$300-$350", retailer: "Nintendo", affiliateUrl: "https://www.nintendo.com/us/store/products/nintendo-switch-oled-model-white-set/", image: img("photo-1578303512597-81e6cc155b3e"), interests: ["gaming", "family", "entertainment"], summary: "A flexible console for solo play, family games, and travel entertainment.", why: "One of the safest big gifts for households that like games.", badge: "Big gift" },
  { slug: "logitech-mx-master-3s", name: "Logitech MX Master 3S Mouse", brand: "Logitech", category: "tech", price: 9999, priceRange: "$80-$110", retailer: "Logitech", affiliateUrl: "https://www.logitech.com/en-us/products/mice/mx-master-3s.html", image: img("photo-1527814050087-3793815479db"), interests: ["desk setup", "work", "tech"], summary: "A premium ergonomic mouse for productivity, school, design, and work-from-home desks.", why: "A daily-use upgrade that feels premium but remains practical.", badge: "Desk upgrade" },
  { slug: "breville-bambino", name: "Breville Bambino Espresso Machine", brand: "Breville", category: "kitchen", price: 29995, priceRange: "$250-$350", retailer: "Breville", affiliateUrl: "https://www.breville.com/us/en/products/espresso/bes450.html", image: img("photo-1517668808822-9ebb02f2a0e6"), interests: ["coffee", "kitchen", "home"], summary: "A compact espresso machine for people who want cafe drinks at home.", why: "Feels special for coffee lovers while fitting smaller kitchens.", badge: "Coffee splurge", salePrice: 24995, dealBadge: "Cafe deal" },
  { slug: "fellow-stagg-ekg", name: "Fellow Stagg EKG Electric Kettle", brand: "Fellow", category: "kitchen", price: 16500, priceRange: "$140-$180", retailer: "Fellow", affiliateUrl: "https://fellowproducts.com/products/stagg-ekg-electric-pour-over-kettle", image: img("photo-1544787219-7f47ccb76574"), interests: ["coffee", "tea", "design", "kitchen"], summary: "A precise electric kettle for pour-over coffee, tea, and beautiful counters.", why: "A design-forward gift with daily utility.", badge: "Design favorite" },
  { slug: "oxo-good-grips-15-piece", name: "OXO Good Grips Kitchen Tool Set", brand: "OXO", category: "kitchen", price: 13999, priceRange: "$100-$150", retailer: "OXO", affiliateUrl: "https://www.oxo.com/", image: img("photo-1556911220-bff31c812dba"), interests: ["cooking", "kitchen", "home"], summary: "A dependable kitchen tool refresh for new homes, weddings, and practical cooks.", why: "Useful across skill levels and safer than niche kitchen gadgets.", badge: "Practical kitchen" },
  { slug: "kitchenaid-artisan-mixer", name: "KitchenAid Artisan Stand Mixer", brand: "KitchenAid", category: "kitchen", price: 44999, priceRange: "$350-$500", retailer: "KitchenAid", affiliateUrl: "https://www.kitchenaid.com/countertop-appliances/stand-mixers/tilt-head-stand-mixers.html", image: img("photo-1590794056226-79ef3a8147e1"), interests: ["baking", "cooking", "kitchen"], summary: "A long-lasting mixer for bakers, hosts, and family kitchens.", why: "A classic milestone gift for weddings, holidays, and serious bakers.", badge: "Registry classic", salePrice: 37999, dealBadge: "Registry deal" },
  { slug: "instant-pot-duo", name: "Instant Pot Duo", brand: "Instant", category: "kitchen", price: 9995, priceRange: "$80-$120", retailer: "Instant", affiliateUrl: "https://www.instanthome.com/product/instant-pot/duo/6-quart-pressure-cooker", image: img("photo-1556909114-f6e7ad7d3136"), interests: ["cooking", "meal prep", "family"], summary: "A multi-cooker for fast dinners, soups, rice, and batch cooking.", why: "Great for busy people who want easier meals.", badge: "Meal-prep helper", salePrice: 7995, dealBadge: "Kitchen sale" },
  { slug: "dyson-airwrap", name: "Dyson Airwrap Multi-Styler", brand: "Dyson", category: "beauty", price: 59999, priceRange: "$500-$650", retailer: "Dyson", affiliateUrl: "https://www.dyson.com/hair-care/hair-stylers/airwrap", image: img("photo-1522335789203-aabd1fc54bc9"), interests: ["beauty", "self care", "hair"], summary: "A premium styling tool for smoothing, curling, drying, and salon-like routines.", why: "A luxury beauty gift that feels memorable for the right recipient.", badge: "Luxury beauty" },
  { slug: "olaplex-hair-repair-set", name: "Olaplex Hair Repair Set", brand: "Olaplex", category: "beauty", price: 6000, priceRange: "$50-$75", retailer: "Olaplex", affiliateUrl: "https://olaplex.com/", image: img("photo-1596462502278-27bfdc403348"), interests: ["beauty", "self care", "hair"], summary: "A repair-focused haircare set for people who enjoy beauty routines.", why: "Giftable without requiring exact clothing sizes.", badge: "Self-care set" },
  { slug: "lululemon-everywhere-belt-bag", name: "lululemon Everywhere Belt Bag", brand: "lululemon", category: "fitness", price: 3800, priceRange: "$35-$45", retailer: "lululemon", affiliateUrl: "https://shop.lululemon.com/p/bags/Everywhere-Belt-Bag/_/prod8900747", image: img("photo-1553062407-98eeb64c6a62"), interests: ["fitness", "travel", "style"], summary: "A small everyday bag for errands, walks, travel, and concerts.", why: "Useful, trend-aware, and easier than guessing apparel sizes.", badge: "Everyday carry" },
  { slug: "allbirds-wool-runners", name: "Allbirds Wool Runners", brand: "Allbirds", category: "fitness", price: 11000, priceRange: "$95-$125", retailer: "Allbirds", affiliateUrl: "https://www.allbirds.com/products/mens-wool-runners", image: img("photo-1542291026-7eec264c27ff"), interests: ["walking", "travel", "comfort"], summary: "Comfortable everyday sneakers for travel, errands, and casual wear.", why: "Best when you know the size and want a comfortable upgrade.", badge: "Comfort pick" },
  { slug: "patagonia-black-hole-duffel", name: "Patagonia Black Hole Duffel", brand: "Patagonia", category: "outdoor", price: 15900, priceRange: "$140-$180", retailer: "Patagonia", affiliateUrl: "https://www.patagonia.com/product/black-hole-duffel-bag-55-liters/49343.html", image: img("photo-1553062407-98eeb64c6a45"), interests: ["travel", "outdoor", "adventure"], summary: "A rugged duffel for weekend trips, road trips, camping, and gear hauling.", why: "A durable travel gift that gets better with use.", badge: "Adventure ready" },
  { slug: "aeropress-clear", name: "AeroPress Clear Coffee Maker", brand: "AeroPress", category: "kitchen", price: 4995, priceRange: "$40-$60", retailer: "AeroPress", affiliateUrl: "https://aeropress.com/products/aeropress-clear", image: img("photo-1495474472287-4d71bcdd2085"), interests: ["coffee", "travel", "camping"], summary: "A compact coffee maker for home, office, travel, and camping.", why: "Affordable, loved by coffee nerds, and hard to break.", badge: "Coffee classic" },
  { slug: "yeti-rambler", name: "YETI Rambler Bottle", brand: "YETI", category: "outdoor", price: 4000, priceRange: "$35-$50", retailer: "YETI", affiliateUrl: "https://www.yeti.com/drinkware/bottles/", image: img("photo-1523362628745-0c100150b504"), interests: ["outdoor", "hydration", "fitness"], summary: "A durable insulated bottle for hikes, school, work, and workouts.", why: "Personalizable and useful for almost anyone.", badge: "Rugged staple" },
  { slug: "rei-co-op-camp-chair", name: "REI Co-op Camp Chair", brand: "REI Co-op", category: "outdoor", price: 5995, priceRange: "$45-$70", retailer: "REI", affiliateUrl: "https://www.rei.com/c/camp-chairs", image: img("photo-1504280390367-361c6d9f38f4"), interests: ["camping", "outdoor", "sports"], summary: "A comfortable folding chair for campsites, sidelines, beaches, and backyard nights.", why: "A practical outdoor gift that gets used repeatedly.", badge: "Camp comfort" },
  { slug: "garmin-forerunner-165", name: "Garmin Forerunner 165", brand: "Garmin", category: "fitness", price: 24999, priceRange: "$220-$280", retailer: "Garmin", affiliateUrl: "https://www.garmin.com/en-US/p/1055469", image: img("photo-1523275335684-37898b6baf30"), interests: ["running", "fitness", "wellness"], summary: "A GPS running watch for training, workouts, health metrics, and daily wear.", why: "Strong for runners who want data without a huge watch.", badge: "Runner upgrade" },
  { slug: "yoga-manduka-pro", name: "Manduka PRO Yoga Mat", brand: "Manduka", category: "fitness", price: 13800, priceRange: "$120-$150", retailer: "Manduka", affiliateUrl: "https://www.manduka.com/products/manduka-pro-yoga-mat", image: img("photo-1599901860904-17e6ed7083a0"), interests: ["yoga", "fitness", "wellness"], summary: "A dense long-lasting yoga mat for home practice, studios, and stretching.", why: "An upgrade that wellness-focused recipients can use for years.", badge: "Wellness upgrade" },
  { slug: "chewy-barkbox", name: "BarkBox Subscription", brand: "BarkBox", category: "pets", price: 3500, priceRange: "$25-$40", retailer: "BarkBox", affiliateUrl: "https://www.barkbox.com/", image: img("photo-1583337130417-3346a1be7dee"), interests: ["dogs", "pets", "fun"], summary: "A box of dog toys and treats that turns the pet into part of the gift.", why: "Great for dog parents and hard-to-shop-for friends.", badge: "Pet parent pick" },
  { slug: "catit-flower-fountain", name: "Catit Flower Fountain", brand: "Catit", category: "pets", price: 3299, priceRange: "$25-$40", retailer: "Catit", affiliateUrl: "https://catit.us/products/flower-fountain", image: img("photo-1514888286974-6c03e2ca1dba"), interests: ["cats", "pets", "home"], summary: "A cat water fountain that encourages hydration and feels thoughtful for pet owners.", why: "A pet-focused gift with daily practical value.", badge: "Cat parent pick" },
  { slug: "masterclass-membership", name: "MasterClass Membership", brand: "MasterClass", category: "books", price: 12000, priceRange: "$100-$150", retailer: "MasterClass", affiliateUrl: "https://www.masterclass.com/", image: img("photo-1516321318423-f06f85e504b3"), interests: ["learning", "cooking", "writing", "music"], summary: "A learning membership for curious people who like cooking, writing, business, arts, and more.", why: "Experience-like without choosing a specific date.", badge: "Experience gift" },
  { slug: "audible-membership", name: "Audible Membership", brand: "Audible", category: "books", price: 4500, priceRange: "$30-$60", retailer: "Audible", affiliateUrl: "https://www.audible.com/", image: img("photo-1519682337058-a94d519337bc"), interests: ["reading", "commuting", "learning"], summary: "Audiobooks for readers, commuters, walkers, and lifelong learners.", why: "A flexible digital gift when shipping time is tight.", badge: "Last-minute friendly" },
  { slug: "criterion-channel", name: "The Criterion Channel Gift Subscription", brand: "Criterion", category: "books", price: 9999, priceRange: "$90-$110", retailer: "Criterion", affiliateUrl: "https://www.criterionchannel.com/", image: img("photo-1489599849927-2ee91cede3ba"), interests: ["movies", "art", "culture"], summary: "A streaming membership for movie lovers and culture-minded recipients.", why: "More personal than a generic streaming card for film fans.", badge: "Film lover" },
  { slug: "moleskine-smart-writing-set", name: "Moleskine Smart Writing Set", brand: "Moleskine", category: "writing", price: 27900, priceRange: "$225-$300", retailer: "Moleskine", affiliateUrl: "https://www.moleskine.com/en-us/shop/smart-writing-system/", image: img("photo-1517842645767-c639042777db"), interests: ["writing", "tech", "journaling"], summary: "A notebook and smart pen system for digitizing handwritten notes.", why: "Bridges analog writing and digital organization.", badge: "Smart notebook" },
  { slug: "cricut-joy", name: "Cricut Joy Xtra", brand: "Cricut", category: "art", price: 19900, priceRange: "$175-$220", retailer: "Cricut", affiliateUrl: "https://cricut.com/en-us/cutting-machines/cricut-joy-xtra", image: img("photo-1452860606245-08befc0ff44b"), interests: ["crafts", "art", "diy"], summary: "A compact cutting machine for labels, cards, stickers, and creative projects.", why: "A meaningful gift for makers who love personalized projects.", badge: "Maker gift" },
  { slug: "prismacolor-premier-pencils", name: "Prismacolor Premier Colored Pencils", brand: "Prismacolor", category: "art", price: 4999, priceRange: "$40-$60", retailer: "Prismacolor", affiliateUrl: "https://www.prismacolor.com/colored-pencils/premier-soft-core-colored-pencil-sets/", image: img("photo-1513364776144-60967b0f800f"), interests: ["art", "drawing", "creative"], summary: "Soft-core colored pencils for artists, students, and creative downtime.", why: "A safer art gift because quality supplies work across styles.", badge: "Artist staple" },
  { slug: "goldbelly-pizza-kit", name: "Goldbelly Regional Pizza Kit", brand: "Goldbelly", category: "food", price: 8995, priceRange: "$75-$110", retailer: "Goldbelly", affiliateUrl: "https://www.goldbelly.com/foods/pizza", image: img("photo-1565299624946-b28f40a0ae38"), interests: ["food", "experience", "family"], summary: "A shipped food experience from beloved regional restaurants.", why: "Great for people who prefer experiences over more stuff.", badge: "Food experience" },
  { slug: "jacques-torres-chocolate", name: "Jacques Torres Chocolate Gift Box", brand: "Jacques Torres", category: "food", price: 6500, priceRange: "$50-$80", retailer: "Jacques Torres", affiliateUrl: "https://mrchocolate.com/", image: img("photo-1549007994-cb92caebd54b"), interests: ["chocolate", "food", "romantic"], summary: "A polished chocolate box for hosts, partners, thank-yous, and holidays.", why: "Premium consumables are excellent when you want low clutter.", badge: "Low-clutter gift" },
  { slug: "lego-ideas-typewriter", name: "LEGO Ideas Typewriter", brand: "LEGO", category: "home", price: 24999, priceRange: "$200-$260", retailer: "LEGO", affiliateUrl: "https://www.lego.com/en-us/product/typewriter-21327", image: img("photo-1516387938699-a93567ec168e"), interests: ["design", "writing", "crafts"], summary: "A display-worthy LEGO build for writers, designers, and nostalgic decor fans.", why: "A unique activity-plus-keepsake gift.", badge: "Display keepsake" },
  { slug: "philips-hue-starter-kit", name: "Philips Hue Starter Kit", brand: "Philips Hue", category: "home", price: 19999, priceRange: "$150-$220", retailer: "Philips Hue", affiliateUrl: "https://www.philips-hue.com/en-us", image: img("photo-1507473885765-e6ed057f782c"), interests: ["smart home", "tech", "design"], summary: "Smart lighting for ambiance, routines, gaming rooms, and cozy nights.", why: "A visible home upgrade that feels fun immediately.", badge: "Smart home" },
  { slug: "hatch-restore", name: "Hatch Restore 2", brand: "Hatch", category: "home", price: 19999, priceRange: "$170-$220", retailer: "Hatch", affiliateUrl: "https://www.hatch.co/restore", image: img("photo-1500530855697-b586d89ba3ee"), interests: ["sleep", "wellness", "home"], summary: "A sunrise alarm and sleep routine device for better mornings and evenings.", why: "A thoughtful wellness gift for busy adults.", badge: "Sleep upgrade", salePrice: 16999, dealBadge: "Wellness sale" },
  { slug: "sonos-roam", name: "Sonos Roam Portable Speaker", brand: "Sonos", category: "tech", price: 17900, priceRange: "$150-$190", retailer: "Sonos", affiliateUrl: "https://www.sonos.com/en-us/shop/roam", image: img("photo-1608043152269-423dbba4e7e1"), interests: ["music", "travel", "home"], summary: "A portable speaker for kitchens, patios, trips, and small gatherings.", why: "A music gift that works both at home and away.", badge: "Audio pick" },
  { slug: "tile-mate", name: "Tile Mate Tracker", brand: "Tile", category: "tech", price: 2499, priceRange: "$20-$30", retailer: "Tile", affiliateUrl: "https://www.tile.com/products/tile-mate", image: img("photo-1586953208448-b95a79798f07"), interests: ["organization", "travel", "tech"], summary: "A small Bluetooth tracker for keys, bags, and everyday essentials.", why: "A budget-friendly gift that prevents real headaches.", badge: "Stocking stuffer" },
  { slug: "oura-ring", name: "Oura Ring", brand: "Oura", category: "fitness", price: 29900, priceRange: "$280-$350", retailer: "Oura", affiliateUrl: "https://ouraring.com/", image: img("photo-1516574187841-cb9cc2ca948b"), interests: ["sleep", "fitness", "wellness"], summary: "A health-tracking ring for sleep, readiness, recovery, and wellness trends.", why: "A sleek wearable for data-loving wellness people.", badge: "Wellness tech" },
  { slug: "caraway-cookware-set", name: "Caraway Cookware Set", brand: "Caraway", category: "kitchen", price: 39500, priceRange: "$350-$450", retailer: "Caraway", affiliateUrl: "https://www.carawayhome.com/products/cookware-sets/", image: img("photo-1556909114-44e3e9699e2b"), interests: ["cooking", "home", "design"], summary: "A coordinated cookware set for new homes, registries, and design-minded cooks.", why: "A premium practical gift when you know they need a kitchen upgrade.", badge: "Home upgrade" },
  { slug: "barefoot-dreams-throw", name: "Barefoot Dreams CozyChic Throw", brand: "Barefoot Dreams", category: "home", price: 14700, priceRange: "$120-$160", retailer: "Barefoot Dreams", affiliateUrl: "https://www.barefootdreams.com/", image: img("photo-1600369672770-985fd30004eb"), interests: ["cozy", "home", "self care"], summary: "A plush throw blanket for sofas, reading corners, and cozy evenings.", why: "Comfort gifts work well for people who are hard to size.", badge: "Cozy favorite" },
  { slug: "brooklinen-luxe-sheets", name: "Brooklinen Luxe Sheet Set", brand: "Brooklinen", category: "home", price: 18900, priceRange: "$150-$220", retailer: "Brooklinen", affiliateUrl: "https://www.brooklinen.com/products/luxe-core-sheet-set", image: img("photo-1505693416388-ac5ce068fe85"), interests: ["sleep", "home", "comfort"], summary: "Soft upgraded sheets for better sleep and a hotel-bed feel.", why: "A practical luxury gift for partners and new homes.", badge: "Sleep luxury", salePrice: 15900, dealBadge: "Home sale" },
  { slug: "thermos-food-jar", name: "Thermos Stainless King Food Jar", brand: "Thermos", category: "kitchen", price: 2999, priceRange: "$25-$35", retailer: "Thermos", affiliateUrl: "https://thermos.com/", image: img("photo-1547592180-85f173990554"), interests: ["meal prep", "school", "work"], summary: "An insulated food jar for lunches, soups, leftovers, and school days.", why: "A practical budget gift that saves money and time.", badge: "Lunch helper" },
  { slug: "rocketbook-core", name: "Rocketbook Core Reusable Notebook", brand: "Rocketbook", category: "writing", price: 3499, priceRange: "$25-$40", retailer: "Rocketbook", affiliateUrl: "https://getrocketbook.com/products/core", image: img("photo-1506784983877-45594efa4cbe"), interests: ["writing", "school", "tech", "planning"], summary: "A reusable notebook that scans notes to cloud services.", why: "A clever writing gift for students, teachers, and planners.", badge: "Smart writing" },
  { slug: "field-notes-subscription", name: "Field Notes Subscription", brand: "Field Notes", category: "writing", price: 13000, priceRange: "$100-$140", retailer: "Field Notes", affiliateUrl: "https://fieldnotesbrand.com/products/subscription", image: img("photo-1494438639946-1ebd1d20bf85"), interests: ["writing", "journaling", "design"], summary: "Quarterly pocket notebooks for writers, designers, travelers, and note takers.", why: "A recurring surprise for people who love paper.", badge: "Notebook club" },
  { slug: "calm-premium", name: "Calm Premium Subscription", brand: "Calm", category: "fitness", price: 6999, priceRange: "$60-$80", retailer: "Calm", affiliateUrl: "https://www.calm.com/", image: img("photo-1506126613408-eca07ce68773"), interests: ["wellness", "sleep", "mindfulness"], summary: "Meditations, sleep stories, music, and calming routines.", why: "A caring gift for stressed friends, students, and busy parents.", badge: "Calm gift" },
  { slug: "hydro-flask", name: "Hydro Flask Wide Mouth Bottle", brand: "Hydro Flask", category: "fitness", price: 4495, priceRange: "$35-$50", retailer: "Hydro Flask", affiliateUrl: "https://www.hydroflask.com/", image: img("photo-1602143407151-7111542de6e8"), interests: ["hydration", "fitness", "school"], summary: "A colorful insulated bottle for school, hikes, workouts, and commuting.", why: "Easy to personalize and useful every day.", badge: "Daily carry" },
  { slug: "board-game-wingspan", name: "Wingspan Board Game", brand: "Stonemaier Games", category: "gaming", price: 6500, priceRange: "$50-$75", retailer: "Stonemaier Games", affiliateUrl: "https://store.stonemaiergames.com/products/wingspan", image: img("photo-1610890716171-6b1bb98ffd09"), interests: ["board games", "nature", "family"], summary: "A beautiful strategy board game about birds, engines, and relaxed competition.", why: "Great for game-night households and nature lovers.", badge: "Game night" },
  { slug: "cards-against-humanity-family", name: "Cards Against Humanity: Family Edition", brand: "Cards Against Humanity", category: "gaming", price: 2500, priceRange: "$20-$30", retailer: "Cards Against Humanity", affiliateUrl: "https://www.cardsagainsthumanityfamilyedition.com/", image: img("photo-1606167668584-78701c57f13d"), interests: ["games", "family", "fun"], summary: "A party card game designed for family-friendly ridiculous answers.", why: "A low-cost way to create laughs and shared time.", badge: "Fun pick" },
  { slug: "mejuri-hoops", name: "Mejuri Small Hoops", brand: "Mejuri", category: "beauty", price: 7800, priceRange: "$70-$90", retailer: "Mejuri", affiliateUrl: "https://mejuri.com/", image: img("photo-1515562141207-7a88fb7ce338"), interests: ["style", "minimal", "jewelry"], summary: "Minimal everyday hoops that feel polished without being overdone.", why: "Good when you know their metal preference and style is simple.", badge: "Minimal style" },
  { slug: "glossier-you", name: "Glossier You Eau de Parfum", brand: "Glossier", category: "beauty", price: 7800, priceRange: "$70-$90", retailer: "Glossier", affiliateUrl: "https://www.glossier.com/products/glossier-you", image: img("photo-1541643600914-78b084683601"), interests: ["beauty", "fragrance", "self care"], summary: "A soft personal fragrance for beauty fans who like subtle scents.", why: "Best when fragrance is welcome and you know they like perfume.", badge: "Beauty favorite" },
  { slug: "nisolo-huarache", name: "Nisolo Huarache Sandal", brand: "Nisolo", category: "fitness", price: 15000, priceRange: "$125-$170", retailer: "Nisolo", affiliateUrl: "https://nisolo.com/", image: img("photo-1562273138-f46be4ebdf33"), interests: ["style", "travel", "comfort"], summary: "A travel-friendly leather sandal for warm weather and casual outfits.", why: "Strong only when you know sizing; otherwise wishlist it first.", badge: "Style pick" },
  { slug: "solo-stove-ranger", name: "Solo Stove Ranger", brand: "Solo Stove", category: "outdoor", price: 19999, priceRange: "$170-$230", retailer: "Solo Stove", affiliateUrl: "https://www.solostove.com/en-us/p/solo-stove-ranger", image: img("photo-1478131143081-80f7f84ca84d"), interests: ["outdoor", "backyard", "family"], summary: "A smokeless fire pit for patios, camping, s’mores, and outdoor hangouts.", why: "A memorable group gift for households with outdoor space.", badge: "Backyard gift", salePrice: 16999, dealBadge: "Outdoor sale" },
  { slug: "bird-feeder-camera", name: "Bird Buddy Smart Bird Feeder", brand: "Bird Buddy", category: "outdoor", price: 23900, priceRange: "$200-$260", retailer: "Bird Buddy", affiliateUrl: "https://mybirdbuddy.com/", image: img("photo-1444464666168-49d633b86797"), interests: ["birds", "nature", "tech"], summary: "A smart bird feeder that captures bird photos and turns backyard watching into a hobby.", why: "Unique for nature lovers and grandparents who enjoy daily surprises.", badge: "Novelty nature" },
  { slug: "nixplay-frame", name: "Nixplay Digital Photo Frame", brand: "Nixplay", category: "home", price: 16999, priceRange: "$140-$190", retailer: "Nixplay", affiliateUrl: "https://www.nixplay.com/", image: img("photo-1519741497674-611481863552"), interests: ["family", "photos", "home"], summary: "A connected frame for sharing family photos across homes.", why: "Excellent for parents, grandparents, and long-distance families.", badge: "Family keepsake" },
  { slug: "aura-frame", name: "Aura Digital Picture Frame", brand: "Aura", category: "home", price: 17900, priceRange: "$150-$200", retailer: "Aura", affiliateUrl: "https://auraframes.com/", image: img("photo-1511895426328-dc8714191300"), interests: ["family", "photos", "home"], summary: "A polished Wi-Fi photo frame for easy photo sharing and gifting.", why: "A sentimental gift that keeps updating after the occasion.", badge: "Sentimental tech" },
  { slug: "apple-pencil-pro", name: "Apple Pencil Pro", brand: "Apple", category: "art", price: 12900, priceRange: "$110-$140", retailer: "Apple", affiliateUrl: "https://www.apple.com/apple-pencil/", image: img("photo-1586717791821-3f44a563fa4c"), interests: ["art", "tech", "school", "design"], summary: "A creative stylus for iPad artists, students, note takers, and designers.", why: "A strong targeted gift if they already use a compatible iPad.", badge: "Creative tech" },
  { slug: "wacom-one", name: "Wacom One Drawing Tablet", brand: "Wacom", category: "art", price: 9995, priceRange: "$80-$120", retailer: "Wacom", affiliateUrl: "https://estore.wacom.com/en-us/wacom-one.html", image: img("photo-1516321497487-e288fb19713f"), interests: ["art", "drawing", "digital"], summary: "A drawing tablet for digital art, photo edits, teaching, and creative work.", why: "Good for emerging artists who want to try digital tools.", badge: "Digital art" },
];

const EXPANSION_PERSONAS = [
  { suffix: "mom", label: "for Mom", recipients: ["mom", "parent", "homebody"], occasions: ["birthday", "mother's day", "christmas"], scoreBoost: 1 },
  { suffix: "dad", label: "for Dad", recipients: ["dad", "parent", "practical person"], occasions: ["birthday", "father's day", "holiday"], scoreBoost: 0 },
  { suffix: "partner", label: "for Partners", recipients: ["partner", "spouse", "date night"], occasions: ["anniversary", "birthday", "valentine's day"], scoreBoost: 2 },
  { suffix: "friend", label: "for Friends", recipients: ["friend", "coworker", "host"], occasions: ["birthday", "thank you", "holiday"], scoreBoost: -1 },
  { suffix: "grad", label: "for Graduates", recipients: ["student", "graduate", "young adult"], occasions: ["graduation", "back to school", "new job"], scoreBoost: 1 },
  { suffix: "holiday", label: "Holiday Pick", recipients: ["family", "friend", "wishlist"], occasions: ["christmas", "holiday", "stocking stuffer"], scoreBoost: 0 },
  { suffix: "wedding", label: "Wedding Gift", recipients: ["couple", "newlywed", "host"], occasions: ["wedding", "housewarming", "anniversary"], scoreBoost: 1 },
];

const EXPANDED_SEED_PRODUCTS: SeedProduct[] = EXPANSION_BASE.flatMap((base, baseIndex) =>
  EXPANSION_PERSONAS.map((persona, personaIndex) => {
    const rank = SEED_PRODUCTS.length + baseIndex * EXPANSION_PERSONAS.length + personaIndex + 1;
    const score = Math.max(70, Math.min(97, 92 - (baseIndex % 11) + persona.scoreBoost - Math.floor(personaIndex / 3)));
    const salePrice = base.salePrice && (baseIndex + personaIndex) % 2 === 0 ? base.salePrice : undefined;
    return {
      ...base,
      slug: `${base.slug}-${persona.suffix}`,
      name: `${base.name} ${persona.label}`,
      rank,
      score,
      occasions: persona.occasions,
      recipients: persona.recipients,
      summary: `${base.summary} Tuned by Givit for ${persona.recipients[0]} profiles with ${persona.occasions[0]} timing in mind.`,
      why: `${base.why} This version is indexed for ${persona.label.toLowerCase()} searches, wishlist planning, and calendar reminders.`,
      salePrice,
      dealBadge: salePrice ? base.dealBadge ?? "Givit deal" : undefined,
    };
  }),
);

const ALL_SEED_PRODUCTS = [...SEED_PRODUCTS, ...EXPANDED_SEED_PRODUCTS];

const categoryBySlug = new Map(MARKETPLACE_CATEGORIES.map((category) => [category.slug, category]));

export const MARKETPLACE_PRODUCTS: MarketplaceProduct[] = ALL_SEED_PRODUCTS.map((seed, index) => {
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
    category_rank: ALL_SEED_PRODUCTS.filter((candidate) => candidate.category === seed.category && candidate.rank <= seed.rank).length,
    gift_match_score: seed.score,
    tested_badge: seed.badge,
    sale_price_cents: seed.salePrice,
    deal_badge: seed.dealBadge,
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
      review_count: Math.max(38, 4200 - product.rank * 10),
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
    productSlugs: ["pilot-custom-823", "lamy-safari-fountain-pen", "uni-ball-jetstream-4-and-1", "sakura-pigma-micron-set"],
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


export function getMarketplaceProductCategoryRank(product: MarketplaceProduct) {
  return product.category_rank;
}

export function formatMarketplaceRankLabel(product: MarketplaceProduct, context?: { query?: string; categoryName?: string; position?: number }) {
  const rank = context?.position ?? product.category_rank;
  const label = context?.query?.trim() || context?.categoryName?.trim() || product.category?.name || "Marketplace";
  return `#${rank} in ${label}`;
}
