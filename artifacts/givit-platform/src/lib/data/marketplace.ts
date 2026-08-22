import type { Category, Product, ProductImage, ProductRatingStats } from "@/types/database";
import { EXPANDED_CURATED_PRODUCTS } from "@/lib/data/marketplace-expanded";
import { getImportedMarketplaceProducts } from "@/lib/admin/imported-products";
import { productPhotoFallback } from "@/lib/product-photo";
import livePricesData from "@/lib/data/live-prices.json";

export type MarketplaceProduct = Product & {
  affiliate_url: string;
  retailer: string;
  brand: string;
  price_range: string;
  // Only ever set from a real source (retailer page text via the admin
  // import AI extraction) -- never a guess, so this is undefined for the
  // seed catalog until each product's real page has actually been checked.
  ships_in_days?: number | null;
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
  { id: "cat-experiences", slug: "experiences", name: "Experiences", sort_order: 13 },
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
  rank?: number;
  score?: number;
  interests: string[];
  occasions?: string[];
  recipients?: string[];
  summary: string;
  why: string;
  badge: string;
  salePrice?: number;
  dealBadge?: string;
  shipsInDays?: number;
};

const img = (id: string) => `https://images.unsplash.com/${id}?w=1100&q=86&auto=format&fit=crop`;

const RESOLVED_PRODUCT_IMAGES: Record<string, string> = {
  "anker-737-power-bank": "https://cdn.shopify.com/s/files/1/0493/9834/9974/products/A1289011-Anker_737_Power_Bank_PowerCore_24K_1.png?v=1775967275",
  "apple-pencil-pro": "https://www.apple.com/v/apple-pencil/ag/images/meta/apple-pencil__e54ff7ft4f0i_og.png?202604221757",
  // Previous URL was Logitech's homepage "logi" wordmark og:image, not a
  // photo of the mouse itself.
  "logitech-mx-master-3s": "https://resource.logitech.com/w_1100,ar_7:6,c_pad,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/mice/mx-master-3s/2025-update/mx-master-3s-bluetooth-edition-top-view-black-new-1.png",
  "elgato-key-light-mini": "https://images.ctfassets.net/h50kqpe25yx1/43o0MaPFvGeFAccpTIxZx6/d71ed1ec841fa499921f05edcd5f2949/key-light-mini.jpg",
  "vitruvi-stone-diffuser": "https://vitruvi.com/cdn/shop/files/pdp_stone-diffuser_front_white_gallery_1_v9_image.png?v=1759291810",
  "hatch-restore-2": "https://www.datocms-assets.com/98401/1769721785-restore-3-carousel-putty-1-v2.webp",
  "great-jones-dutchess": "https://greatjonesgoods.com/cdn/shop/products/dutchess_45_01-yellow_1024x1024.png?v=1762440585",
  "brightland-olive-oil-duo": "https://brightland.co/cdn/shop/files/TheDuo920x1124_22825_1.jpg?v=1762198657&width=2048",
  "material-reboard": "https://cdn.shopify.com/s/files/1/2304/7781/files/FreeBoardOceanDominoBadge_bigger_ef3cc832-9a3b-445f-a9b0-39eb90cad977.png?v=1761748727",
  "audible-membership": "https://m.media-amazon.com/images/G/01/Audible/en_US/images/Facebook_Placement_v1_OG_Tag.jpg",
  "criterion-channel": "https://signup.criterionchannel.com/assets/img/png/channel_signup_preview.jpg",
  "therabody-theraface-mask": "https://www.therabody.com/cdn/shop/files/Theraface-Mask-PLP-Thumbnail-1.png?v=1740016375",
  // Both entries below previously pointed at bare brand wordmarks (a black
  // "Necessaire" logo card, a black "slip" logo card) rather than a photo of
  // the actual bottles/pillowcase.
  "necessaire-body-ritual": "https://necessaire.com/cdn/shop/files/01_TheBodyEssentials_Trio_EU_e179728f-8e1b-43a4-9eb8-8c4aa5dd515d.jpg?v=1758839169&width=1400",
  "slip-silk-pillowcase": "https://www.slip.com/cdn/shop/files/SLIP_QPC_DARKBROWN_SHOT1.jpg?v=1773896169&width=1000",
  "rumpl-original-puffy": "https://www.rumpl.com/cdn/shop/files/rumpl-solid-original-1-person-original-puffy-blanket-deepwater-ru01014111p-1193687888.webp?v=1758240391",
  "biolite-campstove-2": "https://www.bioliteenergy.com/cdn/shop/files/campstove-2csc0200-382115.png?v=1711827654&width=1024",
  "eno-doublenest-hammock": "https://eaglesnestoutfittersinc.com/cdn/shop/files/eagles-nest-outfitters-inc-hammock-coastal-cocktail-doublenest-hammock-1229152566.jpg?v=1774456176",
  "garmin-forerunner-165": "https://res.garmin.com/en/products/010-02863-21/v/cf-lg.jpg",
  "manduka-pro-yoga-mat": "https://www.manduka.com/cdn/shop/products/111011460-Mats-Pro71-Elderberry-01.jpg?v=1768944270",
  "whoop-one-year": "https://images.ctfassets.net/rbzqg6pelgqa/3CCQWI1KRdKsfMkGIgNfls/1db1bc98dbbca4f4c288cca02729e964/Not_a_whoop_member_image__1_.png",
  "hyperice-venom-go": "https://hyperice.com/cdn/shop/files/VenomGo1.png?v=1782333962&width=1200",
  // Previous URL here pointed at a seasonal cat-treat marketing banner from
  // catit.com's homepage carousel (wrong product entirely, just same domain)
  // -- swapped for the actual flower fountain's own product-page hero photo.
  "catit-flower-fountain": "https://www.catit.com/wp-content/uploads/2021/11/Catit-Original-Flower-Fountain-Hero.jpg.webp",
  "wild-one-walk-kit": "https://wildone.com/cdn/shop/files/WO_VM_WalkKitHarness_Bubblegum_OnDog_PDP_01_4x5_Web_1.jpg?v=1771436060",
  "furbo-360-dog-camera": "https://cdn.shopify.com/s/files/1/1362/5949/files/dog_cat_thumbnail.jpg?v=1769160413",
  "tuft-paw-cove-litter-box": "https://www.tuftandpaw.com/cdn/shop/files/CovePDP-1.jpg?crop=center&height=630&v=1764682754&width=1200",
  // Both entries below previously pointed at brand wordmark/logo files
  // (filenames literally said "logo") instead of a photo of the actual
  // product -- rendered as a near-blank white card, which is what a
  // reviewer flagged as a "missing image" bug.
  "jacques-torres-chocolate": "https://mrchocolate.com/cdn/shop/files/GiftBox_Web_Sampler_0925_019.jpg?v=1758832684&width=990",
  "diaspora-spice-set": "https://www.diasporaco.com/cdn/shop/files/The_Trio_3d1307be-d472-4dc3-9b35-8d22ec43105d.png?v=1781593599&width=1000",
  // Previous URL was a generic link-preview/OG card with no tea visible at
  // all -- swapped for the actual gift collection's product photo.
  "rainey-day-tea-sampler": "https://rareteacompany.com/cdn/shop/files/Rare-Tea-Company-The-Rare-Tea-Gift-Collection-1000x1000px-1.jpg?v=1753106265&width=1000",
  "yeti-rambler-bottle": "https://yeti-webmedia.imgix.net/asset/52f4e49a-ef2c-45a8-bd21-242ecda0004f/W/Site_Studio_Drinkware_Rambler_Flip_Chug_Bottle_26oz_Rescue_Red_Front_012_A.png?bg=0fff&auto=format,compress&w=1100&q=86",
};

const IMAGE_POOLS: Record<string, string[]> = {
  tech: ["photo-1516321318423-f06f85e504b3", "photo-1517336714731-489689fd1ca8", "photo-1550009158-9ebf69173e03", "photo-1498049794561-7780e7231661", "photo-1519389950473-47ba0277781c"],
  gaming: ["photo-1542751371-adc38448a05e", "photo-1493711662062-fa541adb3fc8", "photo-1511512578047-dfb367046420", "photo-1593305841991-05c297ba4575", "photo-1606144042614-b2417e99c4e3"],
  home: ["photo-1513694203232-719a280e022f", "photo-1524758631624-e2822e304c36", "photo-1484154218962-a197022b5858", "photo-1556228453-efd6c1ff04f6", "photo-1522444195799-478538b28823"],
  kitchen: ["photo-1556911220-bff31c812dba", "photo-1514432324607-a09d9b4aefdd", "photo-1556909114-f6e7ad7d3136", "photo-1551218808-94e220e084d2", "photo-1484300681262-5cca666b0954"],
  books: ["photo-1512820790803-83ca734da794", "photo-1524995997946-a1c2e315a42f", "photo-1519682337058-a94d519337bc", "photo-1521587760476-6c12a4b040da", "photo-1516321318423-f06f85e504b3"],
  writing: ["photo-1455390582262-044cdead277a", "photo-1517842645767-c639042777db", "photo-1517971129774-8a2b38fa128e", "photo-1499750310107-5fef28a66643", "photo-1484480974693-6ca0a78fb36b"],
  beauty: ["photo-1596462502278-27bfdc403348", "photo-1598440947619-2c35fc9aa908", "photo-1570172619644-dfd03ed5d881", "photo-1522335789203-aabd1fc54bc9", "photo-1616394584738-fc6e612e71b9"],
  // The first and third slots here used to be pure landscape shots (an empty
  // desert road, a mountain range with no gear in frame) with nothing
  // product-like in them -- a reviewer screenshot caught one landing on the
  // YETI bottle card looking like a random travel photo. Swapped for shots
  // that actually show gear (backpacks, a bottle in a side pocket).
  outdoor: ["photo-1499803270242-467f7311582d", "photo-1504280390367-361c6d9f38f4", "photo-1509762774605-f07235a08f1f", "photo-1445307806294-bff7f67ff225", "photo-1496545672447-f699b503d270"],
  fitness: ["photo-1518611012118-696072aa579a", "photo-1571019613454-1cb2f99b2d8b", "photo-1517836357463-d25dfeac3438", "photo-1599901860904-17e6ed7083a0", "photo-1526506118085-60ce8714f8c5"],
  pets: ["photo-1583337130417-3346a1be7dee", "photo-1514888286974-6c03e2ca1dba", "photo-1548199973-03cce0bbc87b", "photo-1543852786-1cf6624b9987", "photo-1558944351-c02fe5cd1e93"],
  art: ["photo-1513364776144-60967b0f800f", "photo-1460661419201-fd4cecdf8a8b", "photo-1452860606245-08befc0ff44b", "photo-1516321497487-e288fb19713f", "photo-1586717791821-3f44a563fa4c"],
  food: ["photo-1549007994-cb92caebd54b", "photo-1565299624946-b28f40a0ae38", "photo-1481391319762-47dff72954d9", "photo-1493770348161-369560ae357d", "photo-1504674900247-0877df9cc836"],
  experiences: ["photo-1501281668745-f7f57925c3b4", "photo-1492684223066-81342ee5ff30", "photo-1527529482837-4698179dc6ce", "photo-1500530855697-b586d89ba3ee", "photo-1511795409834-ef04bbd61622"],
};

const CORE_PRODUCTS: SeedProduct[] = [
  { slug: "sony-wh-1000xm5", name: "Sony WH-1000XM5 Noise Canceling Headphones", brand: "Sony", category: "tech", price: 39800, priceRange: "$300-$400", retailer: "Sony", affiliateUrl: "https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b", image: "https://d1ncau8tqf99kp.cloudfront.net/converted/103364_original_local_1200x1050_v3_converted.webp", score: 91, interests: ["music", "travel", "work from home"], occasions: ["birthday", "graduation", "christmas"], recipients: ["partner", "student", "commuter"], summary: "Premium headphones for quiet focus, flights, and better everyday listening.", why: "Comfortable, broadly useful, and a clear upgrade most recipients understand fast.", badge: "Editor pick" },
  { slug: "kindle-paperwhite", name: "Kindle Paperwhite", brand: "Amazon", category: "books", price: 15999, priceRange: "$125-$175", retailer: "Amazon", affiliateUrl: "https://www.amazon.com/dp/B08KTZ8249", image: "https://m.media-amazon.com/images/I/61P+vrvFZ9L._AC_SL1000_.jpg", score: 90, interests: ["reading", "travel", "minimalism"], occasions: ["birthday", "mother's day", "father's day"], recipients: ["reader", "parent", "traveler"], summary: "Waterproof e-reader for people who always have a book nearby.", why: "High utility, low clutter, and better than reading long-form on a phone.", badge: "Practical classic" },
  { slug: "pilot-custom-823", name: "Pilot Custom 823 Fountain Pen", brand: "Pilot", category: "writing", price: 41600, priceRange: "$350-$450", retailer: "Goulet Pens", affiliateUrl: "https://www.gouletpens.com/products/pilot-custom-823-fountain-pen-amber", image: productPhotoFallback("pilot-custom-823", "writing"), score: 89, interests: ["writing", "journaling", "pens"], occasions: ["graduation", "anniversary", "retirement"], recipients: ["writer", "professional", "collector"], summary: "A grail-level fountain pen for writers who care about ritual and craft.", why: "Special without being obscure, fragile, or trend-dependent.", badge: "Keepsake" },
  { slug: "apple-airtags-4-pack", name: "Apple AirTag 4 Pack", brand: "Apple", category: "tech", price: 9900, priceRange: "$75-$110", retailer: "Apple", affiliateUrl: "https://www.apple.com/airtag/", image: "https://www.apple.com/v/airtag/g/images/meta/og__ck3n0k1jl6j6.png?202603251025", score: 88, interests: ["travel", "organization", "tech"], occasions: ["stocking stuffer", "graduation", "travel"], recipients: ["traveler", "student", "parent"], summary: "Item trackers for keys, bags, wallets, and luggage.", why: "Small, useful immediately, and easy to split across daily carry items.", badge: "Everyday save" },
  { slug: "lego-botanicals-orchid", name: "LEGO Botanicals Orchid", brand: "LEGO", category: "home", price: 4999, priceRange: "$40-$60", retailer: "LEGO", affiliateUrl: "https://www.lego.com/en-us/product/orchid-10311", image: productPhotoFallback("lego-botanicals-orchid", "home"), score: 86, interests: ["plants", "design", "crafts"], occasions: ["housewarming", "mother's day", "birthday"], recipients: ["plant lover", "creative", "coworker"], summary: "A relaxing build that becomes decor and never needs watering.", why: "Activity plus keepsake beats a generic bouquet for many recipients.", badge: "Keepsake pick" },
  { slug: "ember-temperature-control-mug", name: "Ember Temperature Control Smart Mug 2", brand: "Ember", category: "home", price: 12995, priceRange: "$100-$150", retailer: "Ember", affiliateUrl: "https://ember.com/products/ember-mug-2", image: "https://ember.com/cdn/shop/files/ember_CM1910_00-black.jpg?v=1762439501", score: 84, interests: ["coffee", "desk setup", "work"], occasions: ["father's day", "birthday", "christmas"], recipients: ["coffee lover", "remote worker", "teacher"], summary: "A desk mug that keeps coffee or tea warm through long sessions.", why: "Indulgent, but solves a real daily annoyance.", badge: "Daily delight" },
  { slug: "theragun-mini", name: "Therabody Theragun Mini", brand: "Therabody", category: "fitness", price: 19900, priceRange: "$150-$225", retailer: "Therabody", affiliateUrl: "https://www.therabody.com/us/en-us/theragun-mini.html", image: productPhotoFallback("theragun-mini", "fitness"), score: 82, interests: ["fitness", "wellness", "running"], occasions: ["birthday", "father's day", "holiday"], recipients: ["athlete", "runner", "busy parent"], summary: "Compact massage device for soreness and recovery.", why: "Portable and less intimidating than full-size recovery gear.", badge: "Recovery pick" },
  { slug: "stanley-quencher-h2-0", name: "Stanley Quencher H2.0 FlowState Tumbler", brand: "Stanley", category: "fitness", price: 4500, priceRange: "$35-$55", retailer: "Stanley", affiliateUrl: "https://www.stanley1913.com/products/adventure-quencher-travel-tumbler-40-oz", image: "https://www.stanley1913.com/cdn/shop/files/Web_PNG_Square-The_Quencher_H2.0_FlowState_Tumbler_40OZ_-_Purple_Dust_-_Front.png?v=1770952011", score: 80, interests: ["fitness", "hydration", "commute"], occasions: ["birthday", "holiday", "thank you"], recipients: ["friend", "student", "coworker"], summary: "A durable everyday tumbler for commutes, desks, and workouts.", why: "Simple, popular, and useful without needing a size guess.", badge: "Under $50" },
  { slug: "aeropress-clear", name: "AeroPress Clear Coffee Maker", brand: "AeroPress", category: "kitchen", price: 4995, priceRange: "$40-$60", retailer: "AeroPress", affiliateUrl: "https://aeropress.com/products/aeropress-clear", image: "https://aeropress.com/cdn/shop/files/AP_Clear_PDP_ATF_1_7864c61b-7c05-4faa-bdbe-42c3d49daca5_1200x1200.png?v=1771041275", score: 78, interests: ["coffee", "travel", "kitchen"], occasions: ["birthday", "father's day", "housewarming"], recipients: ["coffee lover", "traveler", "minimalist"], summary: "Portable coffee maker for smooth cups at home or on the road.", why: "A reliable upgrade for coffee people without taking over the counter.", badge: "Coffee favorite" },
  { slug: "patagonia-black-hole-duffel", name: "Patagonia Black Hole Duffel", brand: "Patagonia", category: "outdoor", price: 15900, priceRange: "$140-$180", retailer: "Patagonia", affiliateUrl: "https://www.patagonia.com/product/black-hole-duffel-bag-55l/49344.html", image: productPhotoFallback("patagonia-black-hole-duffel", "outdoor"), score: 76, interests: ["travel", "outdoor", "weekends"], occasions: ["graduation", "birthday", "christmas"], recipients: ["traveler", "camper", "student"], summary: "Rugged weekender bag for road trips, camping, and gym overflow.", why: "Versatile enough to become their default carryall.", badge: "Road-trip ready" },
  { slug: "nintendo-switch-oled", name: "Nintendo Switch OLED", brand: "Nintendo", category: "gaming", price: 34999, priceRange: "$300-$375", retailer: "Nintendo", affiliateUrl: "https://www.nintendo.com/us/store/products/nintendo-switch-oled-model-white-set/", image: "https://assets.nintendo.com/image/upload/c_fill,w_1200/q_auto:best/f_auto/dpr_2.0/ncom/en_US/products/hardware/nintendo-switch-oled-model-white-set/115461-switch-oled-white-boxart-1200x675", score: 85, interests: ["gaming", "family", "travel"], occasions: ["birthday", "holiday", "graduation"], recipients: ["gamer", "family", "student"], summary: "Portable console for solo gaming, parties, and travel days.", why: "Still one of the easiest gaming gifts to share across ages.", badge: "Family fun" },
  { slug: "backbone-one-controller", name: "Backbone One Mobile Controller", brand: "Backbone", category: "gaming", price: 9999, priceRange: "$90-$110", retailer: "Backbone", affiliateUrl: "https://playbackbone.com/products/backbone-one/", image: productPhotoFallback("backbone-one-controller", "gaming"), score: 74, interests: ["gaming", "phone", "travel"], occasions: ["birthday", "holiday", "graduation"], recipients: ["gamer", "student", "commuter"], summary: "Phone controller that makes mobile and cloud gaming feel legit.", why: "A compact upgrade that avoids buying a whole console.", badge: "Gaming add-on" },
  { slug: "dyson-airwrap", name: "Dyson Airwrap Multi-Styler", brand: "Dyson", category: "beauty", price: 59999, priceRange: "$550-$650", retailer: "Dyson", affiliateUrl: "https://www.dyson.com/hair-care/hair-stylers/airwrap", image: productPhotoFallback("dyson-airwrap", "beauty"), score: 79, interests: ["beauty", "hair", "self care"], occasions: ["anniversary", "birthday", "holiday"], recipients: ["partner", "beauty fan", "self-care person"], summary: "Premium styling tool for blowouts, curls, and daily hair routines.", why: "A splurge that feels unmistakably gift-level.", badge: "Splurge" },
  { slug: "brooklinen-super-plush-robe", name: "Brooklinen Super-Plush Robe", brand: "Brooklinen", category: "home", price: 9900, priceRange: "$85-$120", retailer: "Brooklinen", affiliateUrl: "https://www.brooklinen.com/products/super-plush-robes", image: productPhotoFallback("brooklinen-super-plush-robe", "home"), score: 77, interests: ["cozy", "self care", "home"], occasions: ["mother's day", "birthday", "holiday"], recipients: ["parent", "partner", "homebody"], summary: "Hotel-style robe for slower mornings and better evenings.", why: "Feels personal and luxurious while staying practical.", badge: "Cozy pick" },
  { slug: "masterclass-membership", name: "MasterClass Membership", brand: "MasterClass", category: "experiences", price: 12000, priceRange: "$100-$150", retailer: "MasterClass", affiliateUrl: "https://www.masterclass.com/", image: productPhotoFallback("masterclass-membership", "experiences"), score: 80, interests: ["learning", "cooking", "writing", "music"], occasions: ["birthday", "holiday", "retirement"], recipients: ["curious person", "creative", "lifelong learner"], summary: "A learning membership for cooking, writing, business, arts, and more.", why: "Experience-like without choosing a specific date.", badge: "Experience" },
  { slug: "goldbelly-pizza-kit", name: "Goldbelly Regional Pizza Kit", brand: "Goldbelly", category: "food", price: 8995, priceRange: "$75-$110", retailer: "Goldbelly", affiliateUrl: "https://www.goldbelly.com/foods/pizza", image: productPhotoFallback("goldbelly-pizza-kit", "food"), score: 73, interests: ["food", "experience", "family"], occasions: ["birthday", "thank you", "holiday"], recipients: ["foodie", "family", "host"], summary: "A shipped food experience from regional restaurants.", why: "Great for people who prefer memories and meals over more stuff.", badge: "Food experience" },
  { slug: "aura-frame", name: "Aura Digital Picture Frame", brand: "Aura", category: "home", price: 17900, priceRange: "$150-$200", retailer: "Aura", affiliateUrl: "https://auraframes.com/digital-frame/carver", image: "https://static.pushd.com/assets/marketing/product/images/CARVER_GRAVEL/schema-bd91b698fc44455d8fc1842f8d90a9714ffca30e23e06148825123986ae9c3ec.jpg", score: 77, interests: ["family", "photos", "home"], occasions: ["mother's day", "father's day", "holiday"], recipients: ["grandparent", "parent", "family"], summary: "Wi-Fi photo frame for easy family photo sharing.", why: "A sentimental gift that keeps getting better after delivery.", badge: "Sentimental tech" },
  { slug: "personalized-cutting-board-family-name", name: "Personalized Cutting Board", brand: "Uncommon Goods", category: "kitchen", price: 17900, priceRange: "$175-$225", retailer: "Uncommon Goods", affiliateUrl: "https://www.uncommongoods.com/product/personalized-cutting-board", image: "https://images.uncommongoods.com/images/items/25200/25202_1_640px.jpg", score: 78, interests: ["engraved", "personalized", "kitchen", "keepsake", "handmade"], occasions: ["wedding", "housewarming", "anniversary"], recipients: ["newlyweds", "host", "parent"], summary: "Handcrafted maple cutting board engraved with a family name.", why: "A hand-cut, individually made keepsake that still earns daily counter use.", badge: "Engraved keepsake" },
  { slug: "mejuri-nameplate-necklace", name: "Nameplate Necklace", brand: "Mejuri", category: "beauty", price: 20800, priceRange: "$175-$250", retailer: "Mejuri", affiliateUrl: "https://mejuri.com/products/nameplate-necklace", image: "https://cdn.shopify.com/s/files/1/0631/8568/2616/files/0-Liquid_Nameplate_Necklace_Liquid_Font__julia_Silver_Off_Figure_Front_View_2160x2580_4152e6bb-f53d-4dad-8612-800e939e7f71.jpg?v=1783105788&width=800", score: 79, interests: ["personalized jewelry", "engraved", "keepsake", "self care"], occasions: ["birthday", "anniversary", "graduation"], recipients: ["partner", "daughter", "friend"], summary: "Sterling silver necklace personalized with a name or word in your choice of font.", why: "Wearable and unmistakably made for one specific person, not just anyone on the list.", badge: "Personalized jewelry" },
  { slug: "wonderbly-lost-my-name-book", name: "The Little Boy or Girl Who Lost Their Name", brand: "Wonderbly", category: "books", price: 3499, priceRange: "$25-$45", retailer: "Wonderbly", affiliateUrl: "https://www.wonderbly.com/personalized-products/lost-my-name-v2-book", image: "https://images.prismic.io/wonderbly/FnrT_SVFhffdSusA_LMN_carousel_01_EN.jpg?auto=format,compress", score: 76, interests: ["custom book", "personalized", "reading", "keepsake"], occasions: ["baby shower", "new baby", "birthday"], recipients: ["kid", "new parent", "godchild"], summary: "A storybook where the plot is built entirely from a child's own name.", why: "Every page is specific to that one kid, not a generic keepsake with their name stamped on it.", badge: "Custom storybook" },
  { slug: "diaspora-cookbook-spice-trio-bundle", name: "The Cookbook + Spice Trio Bundle", brand: "Diaspora Co.", category: "food", price: 6000, priceRange: "$50-$75", retailer: "Diaspora Co.", affiliateUrl: "https://www.diasporaco.com/products/the-cookbook-spice-trio-bundle", image: "https://www.diasporaco.com/cdn/shop/files/Diaspora_CookbookCollabs_MelatiCitrawireja_100ppi__19.jpg?v=1772443587&width=1600", score: 75, interests: ["diwali", "cooking", "food", "hosting"], occasions: ["diwali", "housewarming", "thank you"], recipients: ["home cook", "host", "foodie"], summary: "Single-origin cumin, coriander, and turmeric paired with the cookbook that puts them to use.", why: "A festive, consumable gift that skips the guesswork of picking one specific dish.", badge: "Diwali pick" },
  { slug: "stay-cool-adjustable-laptop-desk", name: "Stay Cool Adjustable Laptop Desk", brand: "Uncommon Goods", category: "tech", price: 4500, priceRange: "$40-$60", retailer: "Uncommon Goods", affiliateUrl: "https://www.uncommongoods.com/product/stay-cool-adjustable-laptop-desk", image: "https://images.uncommongoods.com/images/items/58400/58492_1_640px.jpg", score: 74, interests: ["desk setup", "tech", "work from home", "office"], occasions: ["promotion", "new job", "goodbye gift"], recipients: ["coworker", "remote worker", "graduate"], summary: "Bamboo laptop desk with built-in USB-powered cooling fans.", why: "Marks a career milestone with something they'll actually use at the new desk.", badge: "Career milestone" },
  { slug: "hidden-pocket-scrunchies-set-of-two", name: "Hidden Pocket Scrunchies, Set of Two", brand: "Uncommon Goods", category: "beauty", price: 2000, priceRange: "$15-$25", retailer: "Uncommon Goods", affiliateUrl: "https://www.uncommongoods.com/product/hidden-pocket-scrunchies-set-of-two", image: "https://images.uncommongoods.com/images/items/55500/55505_1_640px.jpg", score: 73, interests: ["secret santa", "white elephant", "beauty", "fun"], occasions: ["secret santa", "white elephant", "birthday"], recipients: ["coworker", "friend", "college student"], summary: "Velvet scrunchies with a hidden zippered pocket for cash or a key.", why: "Cheap enough for a gift exchange, but a genuinely useful surprise once opened.", badge: "Gift exchange pick" },
  { slug: "framebridge-mercer-slim-frame", name: "Mercer Slim Gallery Frame", brand: "Framebridge", category: "home", price: 7000, priceRange: "$60-$90", retailer: "Framebridge", affiliateUrl: "https://www.framebridge.com/products/mercer-slim-black-frame", image: "https://www.framebridge.com/cdn/shop/files/rebrand_product_mercerslim-03.jpg?v=1763734293", score: 75, interests: ["photo gift", "personalized", "home", "design"], occasions: ["housewarming", "anniversary", "mother's day"], recipients: ["parent", "partner", "grandparent"], summary: "Custom-framed print with archival printing and a UV-protective mat.", why: "Turns one specific photo into something they'll actually hang, not just print and forget.", badge: "Photo gift" },
];

const GENERATED_IDEAS = Object.entries({
  tech: [
    ["anker-737-power-bank", "Anker 737 Power Bank", "Anker", 14999, "Anker", "https://www.anker.com/products/a1289", ["travel", "tech", "commute"], "High-capacity fast charger for laptops, tablets, and phones.", "Very useful for travelers, students, and anyone who forgets outlets.", "Power move"],
    ["apple-pencil-pro", "Apple Pencil Pro", "Apple", 12900, "Apple", "https://www.apple.com/apple-pencil/", ["art", "school", "tech"], "Creative stylus for compatible iPads.", "Perfect when you know they sketch, annotate, or take digital notes.", "Creative tech"],
    ["tile-mate", "Tile Mate Tracker", "Tile", 2499, "Tile", "https://www.tile.com/products/tile-mate", ["organization", "keys", "travel"], "Bluetooth tracker for keys and bags.", "A small everyday fix for people who misplace essentials.", "Under $25"],
    ["logitech-mx-master-3s", "Logitech MX Master 3S Mouse", "Logitech", 9999, "Logitech", "https://www.logitech.com/en-us/products/mice/mx-master-3s.html", ["desk setup", "work", "productivity"], "Premium ergonomic mouse for serious desk time.", "Turns a home office into a smoother daily setup.", "Desk upgrade"],
    ["nanoleaf-lines", "Nanoleaf Lines Smarter Kit", "Nanoleaf", 19999, "Nanoleaf", "https://nanoleaf.me/en-US/products/nanoleaf-lines/", ["gaming", "decor", "tech"], "Modular wall lighting for rooms and streaming spaces.", "Visual, fun, and easier than guessing decor style.", "Room glow"],
  ],
  gaming: [
    ["ps5-dualsense-edge", "DualSense Edge Wireless Controller", "PlayStation", 19999, "PlayStation", "https://direct.playstation.com/en-us/buy-accessories/dualsense-edge-wireless-controller", ["gaming", "playstation", "competitive"], "Customizable PS5 controller for serious players.", "A premium gaming upgrade without buying games they may own.", "Pro controller"],
    ["xbox-game-pass-ultimate", "Xbox Game Pass Ultimate", "Xbox", 4499, "Xbox", "https://www.xbox.com/en-US/xbox-game-pass/ultimate", ["gaming", "subscription", "family"], "Game subscription for console, PC, and cloud play.", "Flexible if you do not know their exact game wishlist.", "Digital easy"],
    ["secretlab-magnus-desk-mat", "Secretlab MAGPAD Desk Mat", "Secretlab", 7900, "Secretlab", "https://secretlab.co/products/magpad-desk-mat", ["gaming", "desk setup", "decor"], "Magnetic desk mat that upgrades a gaming or work surface.", "A cool-looking setup gift with practical daily use.", "Setup flex"],
    ["elgato-key-light-mini", "Elgato Key Light Mini", "Elgato", 9999, "Elgato", "https://www.elgato.com/us/en/p/key-light-mini", ["streaming", "video", "gaming"], "Portable light for streams, calls, and content.", "Great for creators who want better video without a studio.", "Creator gear"],
    ["8bitdo-ultimate-controller", "8BitDo Ultimate Controller", "8BitDo", 6999, "8BitDo", "https://www.8bitdo.com/ultimate-bluetooth-controller/", ["gaming", "switch", "retro"], "Comfortable multi-platform controller with dock.", "A stylish alternative controller for Switch and PC players.", "Retro modern"],
  ],
  home: [
    ["vitruvi-stone-diffuser", "Vitruvi Stone Diffuser", "Vitruvi", 12300, "Vitruvi", "https://vitruvi.com/products/stone-diffuser", ["home", "wellness", "cozy"], "Ceramic diffuser that looks like decor.", "A softer home gift that feels elevated, not gadgety.", "Calm home"],
    ["parachute-cloud-cotton-throw", "Parachute Cloud Cotton Throw", "Parachute", 12900, "Parachute", "https://www.parachutehome.com/products/cloud-cotton-throw", ["cozy", "home", "design"], "Lightweight throw for couches, beds, and reading corners.", "Easy to love and does not require precise sizing.", "Soft landing"],
    ["hatch-restore-2", "Hatch Restore 2", "Hatch", 19999, "Hatch", "https://www.hatch.co/restore", ["sleep", "wellness", "home"], "Smart sunrise alarm and sleep routine device.", "Thoughtful for anyone trying to make mornings less brutal.", "Sleep reset"],
    ["flikr-personal-fireplace", "FLIKR Personal Fireplace", "FLIKR", 12900, "FLIKR", "https://flikrfire.com/products/flikr-fire-personal-fireplace", ["home", "cozy", "design"], "Small tabletop fireplace for indoor ambience.", "Cooler than a candle and memorable for hosts.", "Ambient"],
    ["smeg-milk-frother", "Smeg Milk Frother", "Smeg", 22995, "Smeg", "https://www.smegusa.com/products/MFF11", ["coffee", "home", "kitchen"], "Countertop frother for lattes and hot chocolate.", "A design-forward kitchen gift for cafe-at-home people.", "Cafe vibe"],
  ],
  kitchen: [
    ["fellow-stagg-ekg-kettle", "Fellow Stagg EKG Kettle", "Fellow", 16500, "Fellow", "https://fellowproducts.com/products/stagg-ekg-electric-kettle", ["coffee", "tea", "design"], "Precision gooseneck kettle for coffee and tea.", "Looks sharp and improves a daily ritual.", "Counter icon"],
    ["great-jones-dutchess", "Great Jones The Dutchess", "Great Jones", 18000, "Great Jones", "https://greatjonesgoods.com/products/the-dutchess", ["cooking", "hosting", "home"], "Colorful enameled Dutch oven for stews, roasts, and bread.", "Statement cookware that is actually useful.", "Host gift"],
    ["oxo-cold-brew-maker", "OXO Cold Brew Coffee Maker", "OXO", 5199, "OXO", "https://www.oxo.com/cold-brew-coffee-maker.html", ["coffee", "kitchen", "summer"], "Simple cold brew setup for the fridge.", "Budget-friendly and used all season by coffee people.", "Coffee kit"],
    ["brightland-olive-oil-duo", "Brightland Olive Oil Duo", "Brightland", 7400, "Brightland", "https://brightland.co/products/the-duo", ["food", "cooking", "hosting"], "Giftable olive oil set for cooking and finishing.", "Premium pantry gifts feel useful and low clutter.", "Pantry flex"],
    ["material-reboard", "Material reBoard Cutting Board", "Material", 3500, "Material", "https://materialkitchen.com/products/the-reboard", ["cooking", "design", "sustainable"], "Colorful recycled cutting board.", "A practical kitchen upgrade with personality.", "Useful color"],
  ],
  books: [
    ["bookshop-gift-card", "Bookshop.org Gift Card", "Bookshop.org", 5000, "Bookshop.org", "https://bookshop.org/gift_cards", ["reading", "indie shops", "books"], "Flexible book credit that supports independent bookstores.", "Great when you know they read but not what they own.", "Reader safe"],
    ["audible-membership", "Audible Membership", "Audible", 4500, "Audible", "https://www.audible.com/ep/giftcenter", ["reading", "commuting", "learning"], "Audiobooks for commutes, walks, and chores.", "A last-minute-friendly gift with broad appeal.", "Digital read"],
    ["folio-society-classic", "Folio Society Illustrated Classic", "Folio Society", 8500, "Folio Society", "https://www.foliosociety.com/usa", ["books", "collecting", "design"], "Beautiful illustrated edition for display and rereading.", "A book that feels like an object worth keeping.", "Collector edition"],
    ["criterion-channel", "Criterion Channel Gift Subscription", "Criterion", 9999, "Criterion", "https://www.criterionchannel.com/checkout/subscribe/purchase", ["movies", "art", "culture"], "Streaming membership for film lovers.", "More personal than a generic streaming card.", "Film lover"],
    ["nyt-games-subscription", "NYT Games Subscription", "New York Times", 5000, "NYT", "https://www.nytimes.com/subscription/games", ["puzzles", "word games", "daily ritual"], "Daily crossword, Wordle tools, and puzzle archive.", "Perfect for people with a puzzle streak.", "Daily ritual"],
  ],
  writing: [
    ["lamy-safari-fountain-pen", "Lamy Safari Fountain Pen", "Lamy", 2960, "Lamy", "https://www.lamy.com/en/lamy-safari/", ["writing", "journaling", "school"], "Iconic starter fountain pen.", "Affordable, colorful, and safer than buying an ultra-niche nib.", "Writer starter"],
    ["moleskine-smart-writing-set", "Moleskine Smart Writing Set", "Moleskine", 27900, "Moleskine", "https://www.moleskine.com/en-us/shop/smart-writing-system/", ["writing", "tech", "journaling"], "Notebook and smart pen system for digitizing notes.", "Bridges analog thought and digital organization.", "Smart notebook"],
    ["baronfig-confidant", "Baronfig Confidant Notebook", "Baronfig", 2200, "Baronfig", "https://baronfig.com/products/confidant", ["journaling", "writing", "planning"], "Clothbound notebook with smooth paper.", "A premium-feeling everyday notebook without a huge price.", "Paper pick"],
    ["field-notes-subscription", "Field Notes Quarterly Subscription", "Field Notes", 12000, "Field Notes", "https://fieldnotesbrand.com/subscriptions", ["writing", "edc", "collecting"], "Quarterly pocket notebook drops.", "Fun for note-takers who like small limited editions.", "Pocket notes"],
    ["uni-ball-jetstream-4-and-1", "Uni Jetstream 4&1 Multi Pen", "Uni", 1800, "JetPens", "https://www.jetpens.com/Uni-Jetstream-4-1-Multi-Pens/ct/354", ["writing", "office", "school"], "Smooth multi-pen with pencil built in.", "A tiny everyday upgrade people actually keep using.", "EDC pen"],
  ],
  beauty: [
    ["therabody-theraface-mask", "Therabody TheraFace Mask", "Therabody", 59900, "Therabody", "https://www.therabody.com/us/en-us/theraface-mask.html", ["beauty", "self care", "wellness"], "LED skincare mask for at-home routines.", "A memorable splurge for skincare devotees.", "Beauty tech"],
    ["aesop-resurrection-hand-care", "Aesop Resurrection Hand Care Duo", "Aesop", 13500, "Aesop", "https://www.aesop.com/us/p/body-hand/hand-care/resurrection-aromatique-hand-care-duet/", ["self care", "home", "beauty"], "Sink-side hand wash and balm set.", "Elevates something used every day.", "Low-risk luxe"],
    ["necessaire-body-ritual", "Necessaire Body Ritual Set", "Necessaire", 9500, "Necessaire", "https://necessaire.com/products/the-body-essentials", ["beauty", "self care", "minimalism"], "Clean-lined body care routine.", "Feels premium without relying on exact fragrance preferences.", "Self-care set"],
    ["slip-silk-pillowcase", "Slip Silk Pillowcase", "Slip", 8900, "Slip", "https://www.slip.com/products/queen-zippered-pillowcase-white", ["sleep", "beauty", "hair"], "Silk pillowcase for hair and skin routines.", "A polished gift that also upgrades bedtime.", "Sleep beauty"],
    ["dossier-discovery-set", "Dossier Fragrance Discovery Set", "Dossier", 4900, "Dossier", "https://dossier.co/products/discovery-set", ["fragrance", "beauty", "date night"], "Discovery set for trying multiple scents.", "Avoids guessing one full-size fragrance.", "Scent sample"],
  ],
  outdoor: [
    ["yeti-rambler-bottle", "YETI Rambler Bottle", "YETI", 5000, "YETI", "https://www.yeti.com/drinkware/bottles/21071500000.html", ["outdoor", "travel", "fitness"], "Tough insulated bottle for trails, gyms, and road trips.", "Durable enough for almost anyone.", "Trail staple"],
    ["rumpl-original-puffy", "Rumpl Original Puffy Blanket", "Rumpl", 12500, "Rumpl", "https://www.rumpl.com/products/original-puffy-blanket", ["camping", "picnic", "outdoor"], "Packable blanket for camping, concerts, and couches.", "Outdoor gear that still works indoors.", "Camp cozy"],
    ["biolite-campstove-2", "BioLite CampStove 2+", "BioLite", 14995, "BioLite", "https://www.bioliteenergy.com/products/campstove-2-plus", ["camping", "gadgets", "outdoor"], "Wood-burning camp stove that can charge devices.", "A clever gear gift for gadget-minded campers.", "Camp tech"],
    ["eno-doublenest-hammock", "ENO DoubleNest Hammock", "ENO", 7495, "ENO", "https://eaglesnestoutfittersinc.com/products/doublenest-hammock", ["outdoor", "relaxing", "camping"], "Packable hammock for parks and campsites.", "Fun, easy, and more experiential than another bottle.", "Hangout gift"],
    ["alltrails-plus", "AllTrails+ Subscription", "AllTrails", 3599, "AllTrails", "https://www.alltrails.com/plus", ["hiking", "travel", "outdoor"], "Trail maps and offline navigation.", "Great for hikers without guessing their gear size.", "Trail pass"],
  ],
  fitness: [
    ["garmin-forerunner-165", "Garmin Forerunner 165", "Garmin", 24999, "Garmin", "https://www.garmin.com/en-US/p/1055469", ["running", "fitness", "wellness"], "GPS running watch for workouts and health metrics.", "Strong for runners who want data without a huge watch.", "Runner upgrade"],
    ["manduka-pro-yoga-mat", "Manduka PRO Yoga Mat", "Manduka", 13800, "Manduka", "https://www.manduka.com/products/manduka-pro-yoga-mat", ["yoga", "fitness", "wellness"], "Dense long-lasting yoga mat.", "An upgrade wellness recipients can use for years.", "Studio grade"],
    ["whoop-one-year", "WHOOP 12-Month Membership", "WHOOP", 23900, "WHOOP", "https://www.whoop.com/", ["fitness", "sleep", "recovery"], "Wearable coaching for strain, sleep, and recovery.", "Best for data-curious athletes.", "Recovery data"],
    ["lululemon-everywhere-belt-bag", "lululemon Everywhere Belt Bag", "lululemon", 3800, "lululemon", "https://shop.lululemon.com/p/bags/Everywhere-Belt-Bag-1L/_/prod10050055", ["fitness", "travel", "everyday carry"], "Compact belt bag for walks, travel, and errands.", "Popular, useful, and safer than clothing sizes.", "Carry small"],
    ["hyperice-venom-go", "Hyperice Venom Go", "Hyperice", 12900, "Hyperice", "https://hyperice.com/products/venom-go/", ["fitness", "recovery", "wellness"], "Wearable heat and vibration patch.", "A compact recovery gift for sore backs and shoulders.", "Heat therapy"],
  ],
  pets: [
    ["barkbox-subscription", "BarkBox Subscription", "BarkBox", 3500, "BarkBox", "https://www.barkbox.com/", ["dogs", "pets", "fun"], "Monthly dog toys and treats.", "Turns the pet into part of the celebration.", "Dog joy"],
    ["catit-flower-fountain", "Catit Flower Fountain", "Catit", 3299, "Catit", "https://catit.us/products/flower-fountain", ["cats", "pets", "home"], "Cat water fountain that encourages hydration.", "Practical for pet owners and cute enough to gift.", "Cat parent"],
    ["wild-one-walk-kit", "Wild One Walk Kit", "Wild One", 9800, "Wild One", "https://wildone.com/products/walk-kit", ["dogs", "style", "walks"], "Matching leash, collar, and waste bag carrier.", "Looks good and gets daily use.", "Stylish walks"],
    ["furbo-360-dog-camera", "Furbo 360 Dog Camera", "Furbo", 21000, "Furbo", "https://furbo.com/products/furbo-360-dog-camera", ["pets", "tech", "dogs"], "Rotating pet camera with treat tossing.", "A fun gift for pet parents who hate leaving pets home.", "Pet tech"],
    ["tuft-paw-cove-litter-box", "Tuft + Paw Cove Litter Box", "Tuft + Paw", 19900, "Tuft + Paw", "https://www.tuftandpaw.com/products/cove-litter-box", ["cats", "home", "design"], "Modern litter box system with cleanup tools.", "A premium practical upgrade for cat households.", "Cat home"],
  ],
  art: [
    ["cricut-joy-xtra", "Cricut Joy Xtra", "Cricut", 19900, "Cricut", "https://cricut.com/en-us/cutting-machines/cricut-joy-xtra", ["crafts", "art", "diy"], "Compact cutting machine for labels, cards, and stickers.", "Great for makers who love personalized projects.", "Maker gift"],
    ["prismacolor-premier-pencils", "Prismacolor Premier Colored Pencils", "Prismacolor", 4999, "Prismacolor", "https://www.prismacolor.com/colored-pencils/premier-soft-core-colored-pencil-sets/", ["art", "drawing", "creative"], "Soft-core colored pencils for artists and downtime.", "Quality supplies work across many art styles.", "Artist staple"],
    ["wacom-one", "Wacom One Drawing Tablet", "Wacom", 9995, "Wacom", "https://estore.wacom.com/en-us/wacom-one.html", ["art", "drawing", "digital"], "Drawing tablet for digital art and photo edits.", "Good for emerging artists trying digital tools.", "Digital art"],
    ["blick-studio-acrylic-set", "Blick Studio Acrylic Set", "Blick", 4499, "Blick", "https://www.dickblick.com/products/blick-studio-acrylics/", ["painting", "art", "creative"], "Acrylic paint set with strong beginner-to-intermediate value.", "Easy to pair with canvases or a class.", "Paint kit"],
    ["museum-membership-credit", "Local Museum Membership Credit", "GIVIT Experiences", 10000, "Admin sourced", "https://givit.site/gift?q=Request+Local+Museum+Membership+Credit", ["art", "culture", "experience"], "Admin-sourced museum membership or pass.", "Turns an art interest into real weekends out.", "Culture pass"],
  ],
  food: [
    ["jacques-torres-chocolate", "Jacques Torres Chocolate Gift Box", "Jacques Torres", 6500, "Jacques Torres", "https://mrchocolate.com/products/chocolate-gift-box", ["chocolate", "food", "romantic"], "Premium chocolate box for hosts and partners.", "Consumable, polished, and low clutter.", "Chocolate"],
    ["atlas-coffee-club", "Atlas Coffee Club Subscription", "Atlas Coffee Club", 6000, "Atlas Coffee", "https://atlascoffeeclub.com/pages/gift-subscription", ["coffee", "travel", "food"], "Coffee subscription featuring beans from different countries.", "A recurring gift for people who like trying new cups.", "Coffee trip"],
    ["murray-cheese-board", "Murray's Cheese Board Kit", "Murray's", 9500, "Murray's Cheese", "https://www.murrayscheese.com/", ["cheese", "hosting", "food"], "Curated cheese board shipment.", "Great for hosts and date nights.", "Host board"],
    ["diaspora-spice-set", "Diaspora Co. Spice Set", "Diaspora Co.", 5800, "Diaspora Co.", "https://www.diasporaco.com/products/the-trio", ["cooking", "spices", "food"], "Vibrant single-origin spices for home cooks.", "Small pantry upgrade with a strong story.", "Spice flex"],
    ["rainey-day-tea-sampler", "Rare Tea Sampler", "Rare Tea Company", 5200, "Rare Tea", "https://rareteacompany.com/products/the-rare-tea-gift-collection", ["tea", "cozy", "food"], "Loose-leaf tea sampler for slow mornings.", "Gentle, elegant, and easy to pair with a mug.", "Tea ritual"],
  ],
  experiences: [
    ["private-pottery-class", "Private Pottery Wheel Class", "GIVIT Experiences", 14000, "Admin sourced", "https://givit.site/gift?q=Request+Private+Pottery+Wheel+Class", ["art", "date night", "experience"], "Local pottery session sourced by the concierge team.", "Hands-on and memorable without adding clutter.", "Date night"],
    ["jazz-club-night", "Jazz Club Night Out", "GIVIT Experiences", 16000, "Admin sourced", "https://givit.site/gift?q=Request+Jazz+Club+Night+Out", ["music", "night out", "experience"], "Tickets or gift card for a nearby jazz club.", "Feels personal when music is in their profile.", "Live music"],
    ["chef-table-credit", "Chef's Table Dinner Credit", "GIVIT Experiences", 25000, "Admin sourced", "https://givit.site/gift?q=Request+Chef+Table+Dinner+Credit", ["food", "romantic", "experience"], "Concierge-sourced dinner credit for a standout local spot.", "A strong anniversary or milestone gift.", "Dinner plan"],
    ["botanical-garden-membership", "Botanical Garden Membership", "GIVIT Experiences", 9000, "Admin sourced", "https://givit.site/gift?q=Request+Botanical+Garden+Membership", ["plants", "outdoor", "family"], "Membership or passes to a nearby garden.", "Great for plant lovers and low-pressure outings.", "Garden pass"],
    ["sports-ticket-credit", "Sports Ticket Credit", "GIVIT Experiences", 18000, "Admin sourced", "https://givit.site/gift?q=Request+Sports+Ticket+Credit", ["sports", "event", "experience"], "Ticket budget for a team, match, or game they care about.", "Lets admin source around team, city, and schedule.", "Game day"],
  ],
}).reduce<Record<string, Omit<SeedProduct, "category" | "image" | "rank" | "score" | "priceRange">[]>>((acc, [category, rows]) => {
  acc[category] = rows.map(([slug, name, brand, price, retailer, affiliateUrl, interests, summary, why, badge]) => ({
    slug: slug as string,
    name: name as string,
    brand: brand as string,
    price: price as number,
    retailer: retailer as string,
    affiliateUrl: affiliateUrl as string,
    interests: interests as string[],
    summary: summary as string,
    why: why as string,
    badge: badge as string,
  }));
  return acc;
}, {});

const OCCASION_ROTATION = ["birthday", "holiday", "anniversary", "graduation", "thank you", "housewarming", "mother's day", "father's day", "retirement", "new job"];
const RECIPIENT_ROTATION = ["partner", "parent", "friend", "sibling", "coworker", "student", "host", "traveler", "creative", "hard-to-shop-for person"];

function priceRange(price: number) {
  if (price < 3000) return "Under $30";
  if (price < 6000) return "$30-$60";
  if (price < 10000) return "$60-$100";
  if (price < 17500) return "$100-$175";
  if (price < 30000) return "$175-$300";
  return "$300+";
}

function expandIdeas() {
  let rank = CORE_PRODUCTS.length + 1;
  return Object.entries(GENERATED_IDEAS).flatMap(([category, ideas]) =>
    ideas.map((idea, ideaIndex) => {
      const categoryImages = IMAGE_POOLS[category] ?? IMAGE_POOLS.home;
      const productRank = rank++;
      return {
        ...idea,
        slug: idea.slug,
        category,
        priceRange: priceRange(idea.price),
        image: img(categoryImages[ideaIndex % categoryImages.length]!),
        rank: productRank,
        score: Math.max(70, 82 - (ideaIndex % 6) * 3),
        occasions: [OCCASION_ROTATION[(ideaIndex + productRank) % OCCASION_ROTATION.length]!, OCCASION_ROTATION[(ideaIndex + productRank + 3) % OCCASION_ROTATION.length]!],
        recipients: [RECIPIENT_ROTATION[(ideaIndex + productRank) % RECIPIENT_ROTATION.length]!, RECIPIENT_ROTATION[(ideaIndex + productRank + 4) % RECIPIENT_ROTATION.length]!],
        salePrice: (productRank + ideaIndex) % 4 === 0 ? Math.round(idea.price * 0.88) : undefined,
        dealBadge: (productRank + ideaIndex) % 4 === 0 ? "Good deal" : undefined,
      } satisfies SeedProduct;
    }),
  );
}

type ExtraGiftTemplate = {
  category: string;
  products: string[];
  brands: string[];
  interests: string[];
  summary: string;
  why: string;
  badge: string;
  basePrice: number;
};

const EXTRA_GIFT_TEMPLATES: ExtraGiftTemplate[] = [
  { category: "tech", products: ["Foldable Travel Keyboard", "USB-C Docking Station", "Smart Plug Starter Pack", "Portable Photo Printer", "Laptop Privacy Screen", "MagSafe Charging Stand", "Noise-Reducing Sleep Buds", "E-Ink Digital Notebook", "Bluetooth Record Player", "Desk Cable Management Kit", "Smart Bird Feeder Camera", "Portable Wi-Fi Hotspot", "Mini Video Projector", "Rechargeable Hand Warmer", "Solar Power Bank", "Smart Luggage Scale", "Wireless Charging Mouse Pad", "Smart Door Sensor Kit", "Pocket Drone Camera", "Digital Photo Frame", "Bone Conduction Headphones", "Smart Water Leak Detector", "Bluetooth Tracker Card", "Mechanical Numpad", "Smart Light Strip Kit", "Travel Router", "USB Microscope", "Smart Thermostat Sensor", "Laptop Stand Riser", "Ergonomic Vertical Mouse", "Smart Alarm Clock Lamp", "Pocket Language Translator"], brands: ["Logitech", "Anker", "Belkin", "HP", "Twelve South", "Mophie", "Bose", "reMarkable", "Audio-Technica", "Orbitkey", "Bird Buddy", "GlocalMe", "Nebula", "Ocoopa", "Goal Zero", "Etekcity", "Corsair", "Aqara", "DJI", "Aura", "Shokz", "Govee", "Chipolo", "NuPhy", "Philips Hue", "TP-Link", "Celestron", "Ecobee", "Rain Design", "Logitech Ergo", "Hatch", "Pocketalk"], interests: ["tech", "travel", "desk setup", "organization"], summary: "Useful tech accessory selected for everyday problem solving rather than novelty.", why: "It is specific enough to feel thoughtful while staying broadly practical.", badge: "Smart utility", basePrice: 6400 },
  { category: "gaming", products: ["Switch Carrying Case", "Mechanical Gaming Keyboard", "Wireless Gaming Headset", "Controller Charging Dock", "RGB Monitor Light Bar", "Streaming Capture Card", "Gaming Mouse Pad XL", "Retro Handheld Console", "VR Face Interface Kit", "Console Storage Expansion", "Arcade Fight Stick", "Game-Themed Desk Lamp", "Co-op Board Game", "Premium Dice Vault", "Miniature Paint Starter", "Tabletop Terrain Set", "Gaming Chair Lumbar Pillow", "Headset Stand with RGB", "Trading Card Binder", "Deck Box Tower", "Strategy Board Game Classic", "Party Card Game Pack", "Console Travel Backpack", "Custom Controller Skin", "Streaming Ring Light", "Gaming Glasses", "Speedcube Set", "Chess Set Tournament", "Puzzle Sorting Trays", "Mystery Puzzle Game", "Dungeon Master Screen", "Dice Tray Foldable"], brands: ["Tomtoc", "Keychron", "SteelSeries", "PowerA", "BenQ", "Elgato", "Razer", "Analogue", "KIWI design", "Seagate", "HORI", "Paladone", "Cephalofair", "Wyrmwood", "Army Painter", "Dwarven Forge", "Secretlab", "Corsair Gear", "Ultra Pro", "Gamegenic", "Days of Wonder", "Exploding Kittens", "Tomtoc Travel", "dbrand", "Lume Cube", "Gunnar", "GAN", "House of Staunton", "Ravensburger", "Hunt A Killer", "Beadle & Grimm's", "Forged Gaming"], interests: ["gaming", "setup", "play", "friends"], summary: "Gaming gift that improves play sessions, setup comfort, or game-night rituals.", why: "It avoids guessing a specific title and instead upgrades how they play.", badge: "Play upgrade", basePrice: 7200 },
  { category: "home", products: ["Linen Sheet Set", "Weighted Knit Blanket", "Ceramic Table Lamp", "Wool Dryer Ball Set", "Entryway Catchall Tray", "Smart Air Purifier", "Organic Cotton Bath Towel Set", "Modular Shoe Rack", "Essential Oil Candle Trio", "Bedside Water Carafe", "Framed Photo Print Credit", "Compact Tool Kit", "Cordless Hand Vacuum", "Decorative Bookends", "Window Herb Planter", "Velvet Storage Ottoman", "Sunrise Alarm Lamp", "Cast Iron Door Stop", "Woven Storage Baskets", "Marble Coaster Set", "Heated Throw Blanket", "Indoor Smart Garden", "Linen Apron", "Doormat Personalized", "Wall-Mounted Key Cabinet", "Ceramic Vase Trio", "Picture Ledge Shelves", "Glass Terrarium Kit", "Scented Drawer Liners", "Stoneware Serving Platter", "Chunky Knit Pouf", "Brass Plant Mister"], brands: ["Quince", "Bearaby", "Schoolhouse", "Grove", "Yamazaki", "Coway", "Boll & Branch", "Open Spaces", "P.F. Candle Co.", "Hawkins New York", "Artifact Uprising", "iFixit", "Shark", "Umbra", "Modern Sprout", "Article", "Hatch Restore", "Crate & Barrel", "The Container Store", "CB2", "Sunbeam", "Click & Grow", "Hedley & Bennett", "Letterfolk", "Yamazaki Home", "West Elm", "Pottery Barn", "NCYP", "The Laundress", "East Fork", "Lorena Canals", "Haws"], interests: ["home", "cozy", "organization", "design"], summary: "Home upgrade that makes daily routines feel calmer, tidier, or more personal.", why: "It feels elevated while still being easy to place in most homes.", badge: "Home win", basePrice: 8800 },
  { category: "kitchen", products: ["Carbon Steel Fry Pan", "Ceramic Mixing Bowl Set", "Digital Meat Thermometer", "Pour-Over Coffee Scale", "Magnetic Knife Strip", "Handmade Pasta Tool", "Insulated Picnic Basket", "Fermentation Jar Kit", "Reusable Silicone Bags", "Countertop Compost Bin", "Bamboo Steamer Set", "Japanese Mandoline Slicer", "Cocktail Smoking Kit", "Marble Salt Cellar", "Microplane Zester", "Ice Cream Maker Bowl", "Dutch Oven Mini Set", "Espresso Tamper Kit", "Sourdough Banneton Basket", "Cold Brew Pitcher", "Spice Grinder Electric", "Wood Cutting Board Engraved", "Matcha Whisk Set", "Raclette Tabletop Grill", "Citrus Juicer Press", "Bread Lame Kit", "Donabe Clay Pot", "Tortilla Press Cast Iron", "Salad Spinner Premium", "Butter Crock", "Honey Pot with Dipper", "Stovetop Espresso Maker"], brands: ["Made In", "Mason Cash", "ThermoWorks", "Hario", "Material", "Marcato", "Business & Pleasure", "Kilner", "Stasher", "Bamboozle", "Joyce Chen", "Benriner", "Aged & Charred", "Fox Run", "Microplane", "KitchenAid", "Le Creuset", "Normcore", "Brod & Taylor", "OXO", "Krups", "Words with Boards", "Ippodo", "Boska", "Chef'n", "Wire Monkey", "Toiro", "Victoria", "Zyliss", "Norpro", "Mosser Glass", "Bialetti"], interests: ["cooking", "kitchen", "hosting", "food"], summary: "Kitchen tool that supports real cooking, hosting, or cafe-at-home habits.", why: "It is more useful than a novelty gadget and easy to pair with pantry extras.", badge: "Kitchen helper", basePrice: 5800 },
  { category: "books", products: ["Personal Library Embosser", "Reading Journal", "Book Nook Shelf Insert", "Rechargeable Book Light", "Literary Tote Bag", "Signed Cookbook Credit", "Poetry Anthology", "Independent Magazine Bundle", "Book Club Box", "Classic Paperback Set", "Library Card Socks", "Adjustable Reading Pillow", "Page Anchor Set", "Audiobook Sleep Headband", "Bookstore Crawl Gift Card", "Rare Bookmark Collection", "First Edition Display Stand", "Literary Candle Set", "Book Darts Tin", "Annotated Classics Set", "Bookish Enamel Pin Set", "Reading Tracker Poster", "Banned Books Matchbox Set", "Book Page Holder Thumb Ring", "Personalized Bookplate Stamps", "Literary Map Print", "Novel Tea Sampler", "Bookshelf Reading Lamp", "Short Story Dispenser Credit", "Author Signature Frame", "Book Subscription Trial", "Poetry Magnet Set"], brands: ["Paper Source", "Papier", "Robotime", "Glocusent", "Out of Print", "Now Serving", "Everyman's Library", "Stack", "Once Upon a Book Club", "Penguin Classics", "Library of Congress", "Nestl", "TILISMA", "Perytong", "GIVIT Experiences", "Etsy", "Umbra Books", "Frostbeard Studio", "Book Darts", "Norton", "Ideal Bookshelf", "Pop Chart", "Obvious State", "GoneReading", "Noteworthy", "Wendy Gold", "NovelTea Tins", "OttLite", "Short Edition", "Framebridge", "Book of the Month", "Fridge Poems"], interests: ["reading", "books", "cozy", "learning"], summary: "Reader-friendly gift that supports the ritual around books, not just another random title.", why: "Great when you know they love reading but do not know their exact shelf.", badge: "Reader pick", basePrice: 4200 },
  { category: "writing", products: ["Brass Rollerball Pen", "Desk Notepad System", "Archive Ink Bottle", "Leather Pen Sleeve", "Daily Planner", "Calligraphy Starter Set", "Pocket Fountain Pen", "Brass Pencil", "Writer's Block Timer", "Manuscript Editing Pencils", "Index Card Organizer", "Wax Seal Kit", "Stationery Wardrobe", "Portable Lap Desk", "Zine Making Kit", "Typewriter Ribbon Set", "Glass Dip Pen Set", "Letterpress Notecards", "Pen Plotter Mini", "Washi Tape Library", "Habit Tracker Journal", "Brush Lettering Pens", "Document Wallet Leather", "Pocket Notebook 12-Pack", "Ink Sample Flight", "Desk Blotter Pad", "Vintage Postcard Set", "Correspondence Kit", "Gel Pen Rainbow Set", "Fountain Pen Flush Kit", "Bullet Journal Stencils", "Five Year Diary"], brands: ["Traveler's Company", "Rhodia", "Platinum", "Galen Leather", "Hobonichi", "Tombow", "Kaweco", "Midori", "Time Timer", "Blackwing", "Levenger", "Artisaire", "Crane", "LapGear", "Riso Club", "Baco", "J. Herbin", "Sugar Paper", "AxiDraw", "MT Tape", "Clever Fox", "Pentel", "Bellroy", "Field Notes", "Goulet Pens", "Dacasso", "Found Image Press", "Mignon", "Sakura", "Goulet", "Sunny Streak", "Leuchtturm1917"], interests: ["writing", "journaling", "desk setup", "creative"], summary: "Writing accessory chosen for people who enjoy notes, letters, drafts, or planning.", why: "It makes an everyday creative habit feel more intentional.", badge: "Writer gear", basePrice: 3600 },
  { category: "beauty", products: ["Ceramic Hair Dryer", "Gua Sha Tool Set", "Travel Skincare Organizer", "Mineral Bath Soak", "Luxury Lip Balm Trio", "Scalp Massage Brush", "Reusable Makeup Remover Pads", "LED Vanity Mirror", "Clean Fragrance Sampler", "Cuticle Care Kit", "Silk Sleep Mask", "Body Oil Set", "Facial Steamer", "Makeup Brush Roll", "Shower Steamers", "Hand Cream Wardrobe", "Jade Face Roller", "Heatless Curl Set", "Nail Art Stamping Kit", "Perfume Discovery Set", "Bath Pillow Spa", "Dry Brush Body Set", "Hair Towel Wrap Microfiber", "Under-Eye Patch Jar", "Lip Mask Overnight Trio", "Aromatherapy Shower Set", "Heated Eye Massager", "Satin Pillowcase Pair", "Foot Peel Spa Kit", "Blue Light Face Shield", "Roll-On Essential Oils", "Velvet Hair Bow Set"], brands: ["T3", "Mount Lai", "Cadence", "Osea", "Fresh", "Briogeo", "MakeUp Eraser", "Simplehuman", "Ellis Brooklyn", "Olive & June", "Lunya", "Necessaire", "Conair", "Sonia Kashuk", "Cleverfy", "L'Occitane", "Skin Gym", "Kitsch", "Maniology", "Sephora", "IndulgeMe", "Goop", "Volo", "Patchology", "Laneige", "Saje Wellness", "Therabody", "Slip", "Baby Foot", "Supergoop", "Plant Therapy", "Lele Sadoughi"], interests: ["beauty", "self care", "wellness", "travel"], summary: "Self-care item with a polished feel and low-risk daily usefulness.", why: "It avoids overly personal shade matching while still feeling luxurious.", badge: "Self-care", basePrice: 5400 },
  { category: "outdoor", products: ["Packable Camp Chair", "Insulated Trail Mug", "National Parks Pass", "Merino Hiking Socks", "Compact Hammock", "Waterproof Dry Bag", "Headlamp", "Campfire Popcorn Popper", "Birding Binoculars", "Trail First Aid Kit", "Portable Camp Table", "Reusable Picnic Blanket", "Navigation Compass", "Rain Shell Poncho", "Camp Lantern", "Travel Fly Rod Starter", "Camping Coffee Press", "Trekking Poles Carbon", "Stargazing Star Map", "Packable Daypack", "Camp Cooking Set", "Solar Camp Shower", "Trail Camera", "Insect Repellent Lantern", "Microspikes Traction", "Camp Pillow Compressible", "Bear Bell and Spray Holder", "Field Guide Set", "Waterproof Phone Pouch", "Tent String Lights", "Camp Axe Compact", "Emergency Weather Radio"], brands: ["Helinox", "YETI", "America the Beautiful", "Darn Tough", "ENO", "Sea to Summit", "Black Diamond", "Rome", "Nocs", "Adventure Medical Kits", "REI Co-op", "Rumpl", "Suunto", "Frogg Toggs", "BioLite", "Orvis", "AeroPress Go", "Leki", "Under Lucky Stars", "Osprey", "GSI Outdoors", "Advanced Elements", "Bushnell", "Thermacell", "Kahtoola", "NEMO", "Counter Assault", "National Geographic", "JOTO", "Brightz", "Gerber", "Midland"], interests: ["outdoor", "travel", "camping", "adventure"], summary: "Outdoor gift that makes day trips, camping, or park time easier to enjoy.", why: "Durable gear feels thoughtful for people who like getting outside.", badge: "Trail ready", basePrice: 6900 },
  { category: "fitness", products: ["Adjustable Jump Rope", "Yoga Block Set", "Running Belt", "Grip Strength Trainer", "Foam Roller", "Pilates Ring", "Smart Body Tape Measure", "Sweat-Wicking Gym Towel", "Resistance Band Kit", "Recovery Sandals", "Cycling Phone Mount", "Pickleball Paddle Set", "Balance Board", "Cold Therapy Roller", "Training Log Book", "Hydration Vest", "Massage Gun Mini", "Kettlebell Adjustable", "Workout Sliders Set", "Compression Sleeve Pack", "Gym Bag Convertible", "Wrist Wraps Pair", "Reflective Running Vest", "Yoga Mat Travel", "Ab Roller Wheel", "Climbing Chalk Bag", "Swim Goggles Polarized", "Agility Ladder Kit", "Posture Trainer", "Heart Rate Chest Strap", "Weighted Vest Slim", "Stretch Strap Loop"], brands: ["Crossrope", "Manduka", "FlipBelt", "Captains of Crush", "TriggerPoint", "Balanced Body", "Renpho", "Nomadix", "Fit Simplify", "OOFOS", "Quad Lock", "Selkirk", "Revbalance", "Recoup", "Believe Training", "Nathan", "Theragun", "Bowflex", "Synergee", "Copper Fit", "Vooray", "Rogue", "Noxgear", "Manduka Travel", "Perfect Fitness", "Organic Climbing", "Speedo", "SKLZ", "Upright", "Polar", "Hyperwear", "OPTP"], interests: ["fitness", "wellness", "training", "recovery"], summary: "Fitness item focused on recovery, consistency, or making workouts more convenient.", why: "It supports their routine without assuming exact apparel sizing.", badge: "Active pick", basePrice: 4700 },
  { category: "pets", products: ["Personalized Pet Portrait", "Puzzle Treat Toy", "Washable Pet Blanket", "Slow Feeder Bowl", "Window Cat Perch", "Dog Travel Water Bottle", "Pet Hair Detailer", "GPS Pet Tracker", "Snuffle Mat", "Modern Scratching Post", "Pet First Aid Kit", "Custom Collar Tag", "Hands-Free Dog Leash", "Cat Tunnel", "Calming Pet Bed", "Pet Birthday Box", "Automatic Ball Launcher", "Cat Water Fountain", "Dog Paw Balm Kit", "Pet Camera Treat Tosser", "Custom Pet Socks", "Dog Cooling Mat", "Cat Window Hammock", "Lick Mat Set", "Dog Rain Jacket", "Pet Memory Frame", "Interactive Laser Toy", "Dog Training Pouch", "Cat Grass Growing Kit", "Pet Stroller Compact", "Dog Birthday Bandana", "Aquarium Starter Kit"], brands: ["West & Willow", "Outward Hound", "Molly Mutt", "SodaPup", "K&H", "MalsiPree", "Lilly Brush", "Fi", "AWOOF", "Mau", "Kurgo", "The Foggy Dog", "Tuff Mutt", "PAWZ Road", "Best Friends by Sheri", "PupBox", "iFetch", "Catit", "Natural Dog Company", "Furbo", "DivvyUp", "Green Pet Shop", "K&H Pet", "Hyper Pet", "RC Pets", "Pearhead", "PetSafe", "Doggone Good", "The Cat Ladies", "Pet Gear", "Pet Krewe", "Tetra"], interests: ["pets", "dogs", "cats", "home"], summary: "Pet-parent gift that includes the animal in the celebration while staying useful.", why: "It feels personal because it acknowledges a beloved companion.", badge: "Pet joy", basePrice: 5200 },
  { category: "art", products: ["Watercolor Travel Palette", "Sketchbook Bundle", "Embroidery Starter Kit", "Pottery Tool Set", "Screen Printing Kit", "Analog Photography Film Pack", "Mini Easel Set", "Alcohol Marker Set", "Linocut Block Kit", "Jewelry Making Pliers", "Mosaic Coaster Kit", "Cyanotype Paper Set", "Digital Brush Pack", "Canvas Panel Pack", "Origami Paper Library", "Creative Class Credit", "Gouache Paint Set", "Wood Burning Kit", "Candle Making Kit", "Macrame Plant Hanger Kit", "Acrylic Pour Starter", "Stained Glass Suncatcher Kit", "Calligraphy Ink Sampler", "Needle Felting Animals Kit", "Air Dry Clay Studio", "Paint by Number Custom", "Charcoal Drawing Set", "Weaving Loom Kit", "Resin Jewelry Kit", "Block Printing Fabric Kit", "Sticker Making Machine", "Art Print Subscription"], brands: ["Winsor & Newton", "Stillman & Birn", "DMC", "Xiem", "Speedball", "Kodak", "U.S. Art Supply", "Ohuhu", "Essdee", "Beadsmith", "Mosaic Mercantile", "Jacquard", "True Grit", "Blick", "Tuttle", "GIVIT Experiences", "Himi", "Walnut Hollow", "Makesy", "Mkono", "Arteza", "Lee Wards", "Tom Norton", "Woolbuddy", "Das", "Winnie's Picks", "General Pencil", "Harrisville", "Let's Resin", "Speedball Fabric", "Xyron", "Turnaround Arts"], interests: ["art", "creative", "crafts", "learning"], summary: "Creative supply or class credit that invites hands-on making.", why: "It is easy to tailor to a hobby and still enjoyable for curious beginners.", badge: "Make it", basePrice: 4900 },
  { category: "food", products: ["Hot Sauce Flight", "Small-Batch Jam Trio", "Premium Tinned Fish Box", "Artisan Pasta Sampler", "Japanese Snack Box", "Maple Syrup Set", "Craft Bitters Trio", "Olive Wood Honey Dipper Set", "Regional BBQ Sauce Pack", "Sourdough Starter Kit", "Fancy Nut Butter Duo", "Gourmet Popcorn Tin", "Vegan Cookie Box", "Zero-Proof Cocktail Set", "Chili Crisp Trio", "Birthday Cake Delivery", "Truffle Oil Duo", "Single-Origin Chocolate Flight", "Loose Leaf Tea Chest", "Specialty Coffee Subscription", "Charcuterie Gift Crate", "Infused Sea Salt Set", "Mochi Ice Cream Box", "Hot Chocolate Bomb Set", "Artisan Vinegar Trio", "Dried Flower Cake Topper Kit", "Bagel Brunch Box", "Miso Tasting Set", "Stroopwafel Tin", "Saffron Threads Jar", "Kimchi Sampler", "Macaron Gift Tower"], brands: ["Heatonist", "Sqirl", "Fishwife", "Sfoglini", "Bokksu", "Runamok", "Fee Brothers", "Bee Seasonal", "Fly By Jing", "King Arthur", "Big Spoon", "Garrett", "Partake", "Ghia", "Mila", "Milk Bar", "Brightland", "Dandelion", "Vahdam", "Trade Coffee", "Murray's", "Jacobsen Salt Co.", "My Mochi", "Thoughtfully", "Acid League", "Petal & Stem", "Russ & Daughters", "South River", "Daelmans", "Rumi Spice", "Mother-in-Law's", "Pierre Herme"], interests: ["food", "hosting", "snacks", "cooking"], summary: "Consumable gift with enough personality to feel more special than a grocery run.", why: "Food gifts are low clutter and easy to share with partners or family.", badge: "Tasteful", basePrice: 5600 },
  { category: "experiences", products: ["Rooftop Cinema Tickets", "Cooking Class Credit", "Escape Room Night", "Spa Day Credit", "Dance Lesson Voucher", "Guided Hike", "Wine Tasting Pass", "Comedy Club Tickets", "Aquarium Membership", "Kayak Rental Day", "Flower Arranging Workshop", "Glassblowing Class", "Tea Ceremony Booking", "Photography Walk", "Indoor Climbing Pass", "Local Food Tour", "Pottery Wheel Session", "Hot Air Balloon Ride Credit", "Mixology Class", "Botanical Garden Membership", "Axe Throwing Night", "Stargazing Tour", "Paint and Sip Evening", "Horseback Trail Ride", "Museum Membership Duo", "Sailing Lesson Intro", "Chocolate Making Workshop", "Improv Comedy Class", "Hot Springs Day Pass", "Perfume Blending Session", "City Bike Tour", "Candlelight Concert Tickets"], brands: ["GIVIT Experiences", "Cozymeal", "The Escape Game", "Admin sourced", "Arthur Murray", "REI Experiences", "Local vineyard", "Admin sourced", "Admin sourced", "Admin sourced", "Admin sourced", "Admin sourced", "Admin sourced", "GIVIT Experiences", "Admin sourced", "GIVIT Experiences", "Admin sourced", "GIVIT Experiences", "Admin sourced", "Local gardens", "Admin sourced", "Admin sourced", "Admin sourced", "Admin sourced", "Local museums", "Admin sourced", "Admin sourced", "Admin sourced", "Admin sourced", "Admin sourced", "Admin sourced", "Fever"], interests: ["experience", "date night", "local", "memories"], summary: "Experience gift that creates a plan instead of adding another object to the shelf.", why: "Admin can source the best local version around city, date, and budget.", badge: "Memory maker", basePrice: 12000 },
];

function expandExtraGiftIdeas(): SeedProduct[] {
  const maxExtraProducts = 416;
  return EXTRA_GIFT_TEMPLATES.flatMap((template, templateIndex) => {
    const categoryImages = IMAGE_POOLS[template.category] ?? IMAGE_POOLS.home;
    return template.products.map((productName, productIndex) => {
      const brand = template.brands[productIndex % template.brands.length]!;
      const price = template.basePrice + ((productIndex % 8) - 3) * 1100 + templateIndex * 175;
      const occasions = [OCCASION_ROTATION[(productIndex + templateIndex) % OCCASION_ROTATION.length]!, OCCASION_ROTATION[(productIndex + templateIndex + 5) % OCCASION_ROTATION.length]!];
      const recipients = [RECIPIENT_ROTATION[(productIndex + templateIndex) % RECIPIENT_ROTATION.length]!, RECIPIENT_ROTATION[(productIndex + templateIndex + 3) % RECIPIENT_ROTATION.length]!];
      const slug = `${slugSafe(brand)}-${slugSafe(productName)}`;

      return {
        slug,
        name: `${brand} ${productName}`,
        brand,
        category: template.category,
        price: Math.max(1800, price),
        priceRange: priceRange(Math.max(1800, price)),
        retailer: brand,
        affiliateUrl: `https://www.amazon.com/s?k=${encodeURIComponent(`${brand} ${productName}`)}`,
        image: img(categoryImages[(productIndex + templateIndex) % categoryImages.length]!),
        interests: Array.from(new Set([...template.interests, template.category, ...productName.toLowerCase().split(/\s+/).slice(0, 2)])),
        occasions,
        recipients,
        summary: `${template.summary} Featured item: ${productName}.`,
        why: template.why,
        badge: template.badge,
        score: Math.max(70, 80 - ((productIndex + templateIndex) % 9) * 2),
        salePrice: (productIndex + templateIndex) % 9 === 0 ? Math.round(Math.max(1800, price) * 0.9) : undefined,
        dealBadge: (productIndex + templateIndex) % 9 === 0 ? "Curated deal" : undefined,
      } satisfies SeedProduct;
    });
  }).slice(0, maxExtraProducts);
}

function slugSafe(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function expandCuratedLinks(): SeedProduct[] {
  let rank = CORE_PRODUCTS.length + expandIdeas().length + expandExtraGiftIdeas().length + 1;
  return EXPANDED_CURATED_PRODUCTS.map((item, index) => {
    const categoryImages = IMAGE_POOLS[item.category] ?? IMAGE_POOLS.home;
    const productRank = rank + index;
    return {
      slug: item.slug,
      name: item.name,
      brand: item.brand,
      category: item.category,
      price: item.price,
      priceRange: priceRange(item.price),
      retailer: item.brand,
      affiliateUrl: item.affiliateUrl,
      image: img(categoryImages[index % categoryImages.length]!),
      interests: item.interests,
      summary: item.summary,
      why: item.why,
      badge: item.badge,
      score: Math.max(70, 82 - (index % 10) * 2),
      rank: productRank,
      occasions: [OCCASION_ROTATION[index % OCCASION_ROTATION.length]!, OCCASION_ROTATION[(index + 4) % OCCASION_ROTATION.length]!],
      recipients: [RECIPIENT_ROTATION[index % RECIPIENT_ROTATION.length]!, RECIPIENT_ROTATION[(index + 3) % RECIPIENT_ROTATION.length]!],
    } satisfies SeedProduct;
  });
}

// expandExtraGiftIdeas() and expandCuratedLinks() (~624 entries combined)
// generate synthetic brand x generic-descriptor combinations — e.g. a
// "Nike Wireless Earbuds Pro" that Nike never made — with affiliate URLs
// that point to a retailer *search* page, not a real product. That's the
// actual reason product photos never matched: there was no real product
// to photograph. Only real, individually-sourced products belong in the
// catalog now; kept the generator functions themselves (unused) rather
// than deleting them in case a future curated batch reuses the templates
// for genuinely real products.
const ALL_SEED_PRODUCTS = [...CORE_PRODUCTS, ...expandIdeas()]
  .filter((product, index, products) => products.findIndex((candidate) => candidate.slug === product.slug) === index)
  .map((product, index) => ({ ...product, rank: index + 1, score: product.score ?? Math.max(70, 90 - Math.floor(index / 10)) }));

const categoryBySlug = new Map(MARKETPLACE_CATEGORIES.map((category) => [category.slug, category]));

const usedMarketplaceImages = new Set<string>();

function productPageImageFor(seed: SeedProduct) {
  // This static ~700-product seed catalog isn't live inventory, so resolving
  // a fresh photo per product via a live API call on every page load doesn't
  // scale (706 simultaneous lookups thundering-herd the photo API and each
  // other). Live per-URL resolution (api/photo.ts) is reserved for one-at-a-
  // time real submissions — see imported-products.ts — where exactly one
  // lookup happens per user action. RESOLVED_PRODUCT_IMAGES is the batch
  // equivalent: real retailer-hosted photos looked up once and baked in
  // here, checked first so a product with a real photo on file never shows
  // its generic stock fallback.
  return RESOLVED_PRODUCT_IMAGES[seed.slug] || seed.image;
}

function marketplaceImageFor(seed: SeedProduct) {
  const resolved = RESOLVED_PRODUCT_IMAGES[seed.slug];
  if (resolved) return resolved;

  if (!usedMarketplaceImages.has(seed.image)) {
    usedMarketplaceImages.add(seed.image);
    return seed.image;
  }

  // Deterministic curated fallback instead of picsum.photos' random,
  // unrelated noise images.
  return productPhotoFallback(seed.slug);
}

export const MARKETPLACE_PRODUCTS: MarketplaceProduct[] = ALL_SEED_PRODUCTS.map((seed, index) => {
  const category = categoryBySlug.get(seed.category) ?? null;
  const now = new Date(Date.UTC(2026, 5, 1, 12, 0, 0) - index * 86400000).toISOString();
  const id = `gift-${seed.slug}`;

  return {
    id,
    slug: seed.slug,
    name: seed.name,
    description: `${seed.summary}\n\nWhy GIVIT picked it: ${seed.why}\n\nBest for: ${(seed.recipients ?? []).join(", ")}. Interests: ${seed.interests.join(", ")}. Occasions: ${(seed.occasions ?? []).join(", ")}.`,
    sku: `GIVIT-${String(seed.rank).padStart(4, "0")}`,
    price_cents: seed.price,
    weight_oz: category?.slug === "experiences" || seed.affiliateUrl.includes("subscription") ? 0 : Math.max(4, Math.round(seed.price / 650)),
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
    rank: seed.rank!,
    category_rank: ALL_SEED_PRODUCTS.filter((candidate) => candidate.category === seed.category && (candidate.rank ?? 0) <= seed.rank!).length,
    gift_match_score: seed.score!,
    ships_in_days: seed.shipsInDays ?? null,
    tested_badge: seed.badge,
    sale_price_cents: seed.salePrice,
    deal_badge: seed.dealBadge,
    interests: seed.interests,
    occasions: seed.occasions ?? ["birthday", "holiday"],
    recipients: seed.recipients ?? ["friend", "partner"],
    ai_summary: seed.summary,
    why_we_picked_it: seed.why,
    category,
    images: [
      {
        id: `${id}-image-1`,
        product_id: id,
        storage_path: productPageImageFor(seed),
        sort_order: 0,
      },
      {
        id: `${id}-image-2`,
        product_id: id,
        storage_path: marketplaceImageFor(seed),
        sort_order: 1,
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

function getLocalLiveOverrides(): Record<string, { price_cents: number; sale_price_cents?: number | null; updated_at?: string }> {
  let overrides: Record<string, any> = { ...livePricesData };
  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(window.localStorage.getItem("givit-live-price-overrides") ?? "{}");
      overrides = { ...stored, ...overrides };
    } catch {
      // Ignore storage errors
    }
  }
  return overrides;
}

export function syncLivePricesClient() {
  if (typeof window === "undefined") return;
  fetch("/api/live-prices")
    .then((res) => res.json())
    .then((data) => {
      if (data && typeof data === "object" && Object.keys(data).length > 0) {
        const stored = JSON.parse(window.localStorage.getItem("givit-live-price-overrides") ?? "{}");
        window.localStorage.setItem("givit-live-price-overrides", JSON.stringify({ ...stored, ...data }));
      }
    })
    .catch(() => {});
}

if (typeof window !== "undefined") {
  syncLivePricesClient();
}

function applyLivePriceOverrides(product: MarketplaceProduct): MarketplaceProduct {
  const overrides = getLocalLiveOverrides();
  const entry = overrides[product.affiliate_url] || overrides[product.slug] || overrides[product.id];
  if (!entry) return product;

  const priceCents = typeof entry.price_cents === "number" ? entry.price_cents : product.price_cents;
  const salePriceCents = typeof entry.sale_price_cents === "number" ? entry.sale_price_cents : product.sale_price_cents;

  return {
    ...product,
    price_cents: priceCents,
    sale_price_cents: salePriceCents ?? undefined,
    deal_badge: salePriceCents ? "Live Deal" : product.deal_badge,
    updated_at: entry.updated_at || product.updated_at,
  };
}

export function getAllMarketplaceProducts(): MarketplaceProduct[] {
  const base = typeof window === "undefined" ? MARKETPLACE_PRODUCTS : [...MARKETPLACE_PRODUCTS, ...getImportedMarketplaceProducts()];
  return base.map(applyLivePriceOverrides);
}

export function getMarketplaceProductBySlug(slug: string) {
  return getAllMarketplaceProducts().find((product) => product.slug === slug) ?? null;
}

export function getMarketplaceProducts(options?: { categorySlug?: string; q?: string }) {
  const q = options?.q?.trim().toLowerCase();

  return getAllMarketplaceProducts().filter((product) => {
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
  return getAllMarketplaceProducts().filter((candidate) => candidate.id !== product.id)
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
    title: "Pens worth keeping",
    description: "Sharp notebooks, desk tools, and pens that feel personal.",
    query: "writing",
    productSlugs: ["pilot-custom-823", "lamy-safari-fountain-pen", "uni-ball-jetstream-4-and-1", "field-notes-subscription"],
  },
  {
    slug: "future-christmas-gifts",
    title: "Holiday hits",
    description: "High-confidence ideas to save before the rush.",
    query: "holiday",
    productSlugs: ["kindle-paperwhite", "lego-botanicals-orchid", "nintendo-switch-oled", "theragun-mini"],
  },
  {
    slug: "experiences-over-stuff",
    title: "Experiences over stuff",
    description: "Tickets, classes, food nights, and local passes the admin can source.",
    query: "experience",
    productSlugs: ["private-pottery-class", "jazz-club-night", "chef-table-credit", "sports-ticket-credit"],
  },
  {
    slug: "cool-tech-under-150",
    title: "Cool tech under $150",
    description: "Useful gadgets that solve real problems without clutter.",
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