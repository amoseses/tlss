export type ExpandedSeed = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  affiliateUrl: string;
  interests: string[];
  summary: string;
  why: string;
  badge: string;
};

const CATEGORIES = ["tech", "gaming", "home", "kitchen", "books", "writing", "beauty", "outdoor", "fitness", "pets", "art", "food", "experiences"] as const;

const BRANDS: Record<string, string[]> = {
  tech: ["Anker", "Belkin", "Logitech", "Samsung", "JBL", "Razer", "HyperX", "SanDisk"],
  gaming: ["Nintendo", "Xbox", "PlayStation", "SteelSeries", "Razer", "8BitDo", "Secretlab", "Elgato"],
  home: ["Brooklinen", "Parachute", "Casper", "Dyson", "Vitruvi", "Nest", "iRobot", "CB2"],
  kitchen: ["Fellow", "OXO", "Le Creuset", "KitchenAid", "All-Clad", "Smeg", "Yeti", "ThermoWorks"],
  books: ["Penguin", "Audible", "Bookshop", "Folio Society", "Moleskine", "Chronicle", "Workman", "Abrams"],
  writing: ["Pilot", "Lamy", "Tombow", "Rhodia", "Baronfig", "Kaweco", "Cross", "Parker"],
  beauty: ["Aesop", "Glossier", "Fenty", "Olaplex", "Tatcha", "Laneige", "Rare Beauty", "Drunk Elephant"],
  outdoor: ["Patagonia", "REI", "Osprey", "Black Diamond", "Columbia", "Merrell", "Salomon", "Garmin"],
  fitness: ["Lululemon", "Nike", "Adidas", "Therabody", "Hyperice", "Manduka", "Garmin", "Fitbit"],
  pets: ["BarkBox", "Wild One", "Fi", "Furbo", "Kong", "Ruffwear", "Catit", "Chewy"],
  art: ["Prismacolor", "Winsor Newton", "Cricut", "Wacom", "Blick", "Arteza", "Sakura", "Pentel"],
  food: ["Goldbelly", "Milk Bar", "Jacques Torres", "Blue Bottle", "Murray Cheese", "Harry and David", "Vosges", "Compartes"],
  experiences: ["MasterClass", "ClassPass", "Spa Finder", "Ticketmaster", "Viator", "GetYourGuide", "Airbnb Experiences", "Goldstar"],
};

const PRODUCT_NAMES: Record<string, string[]> = {
  tech: ["Wireless Earbuds Pro", "Smart Home Hub", "Portable SSD", "Webcam 4K", "Ergonomic Keyboard", "USB-C Hub", "Smart Speaker", "Tablet Stand", "Power Bank Pro", "Bluetooth Speaker", "Smart Thermostat", "Mesh WiFi Node", "Mini Projector", "Wireless Mouse Pro", "Smart Scale", "Security Camera"],
  gaming: ["Pro Controller", "Gaming Headset", "Mechanical Keyboard", "Capture Card", "Gaming Chair Pillow", "VR Headset Strap", "Arcade Stick", "Streaming Mic", "Monitor Light Bar", "Retro Console Mini", "Game Pass Card", "Controller Grips", "Desk Mat XL", "Handheld Emulator", "Fighting Stick", "Esports Gift Card"],
  home: ["Weighted Blanket", "Linen Duvet", "Smart Diffuser", "Robot Vacuum Mini", "Ceramic Vase Set", "Wool Throw", "Memory Foam Pillow", "Blackout Curtains", "Essential Oil Set", "Plant Stand", "Marble Coasters", "Candle Trio", "Bedside Organizer", "Air Purifier", "Humidifier", "Digital Frame"],
  kitchen: ["Pour Over Set", "Cast Iron Skillet", "Stand Mixer Attachment", "Japanese Knife Set", "French Press", "Wine Decanter", "Spice Rack", "Cutting Board", "Immersion Blender", "Sous Vide", "Ice Cream Maker", "Espresso Maker", "Gooseneck Kettle", "Mixing Bowls", "Baking Mats", "Cocktail Shaker"],
  books: ["Fiction Box Set", "Cookbook Collection", "Poetry Hardcover", "Graphic Novel Set", "History Bestseller", "Biography Hardcover", "Art Coffee Table Book", "Travel Guide", "Mystery Set", "Fantasy Box Set", "Classic Literature", "Memoir Bestseller", "Science Explainer", "Short Stories", "Journal Prompt Book", "Audiobook Credit"],
  writing: ["Fountain Pen", "Gel Pen Set", "Calligraphy Kit", "Leather Journal", "Desk Pad", "Ink Bottle", "Mechanical Pencil", "Brush Pen Set", "Wax Seal Kit", "Letter Writing Set", "Dot Grid Notebook", "Planner Undated", "Sticky Notes Set", "Highlighter Set", "Sketchbook", "Stationery Gift Box"],
  beauty: ["Skincare Starter", "Hair Mask Trio", "Perfume Travel Set", "Makeup Brush Set", "Lip Care Set", "Vitamin C Serum", "Body Lotion Set", "Eye Cream", "Sunscreen SPF 50", "Bath Bomb Set", "Gua Sha Set", "Hair Dryer Ionic", "Nail Polish Set", "Beard Care Kit", "Hand Cream Set", "Facial Cleanser"],
  outdoor: ["Hiking Backpack", "Camping Tent", "Sleeping Bag", "Trekking Poles", "Camp Stove", "Headlamp", "Dry Bag", "Camp Chair", "Soft Cooler", "Hydration Pack", "Compass", "First Aid Kit", "Binoculars", "Fishing Tackle", "Kayak Paddle", "Climbing Harness"],
  fitness: ["Yoga Mat", "Resistance Bands", "Foam Roller", "Jump Rope", "Kettlebell", "Adjustable Dumbbells", "Pull Up Bar", "Ab Wheel", "Massage Gun", "Fitness Tracker", "Gym Bag", "Workout Gloves", "Ankle Weights", "Balance Board", "Pilates Ring", "Exercise Ball"],
  pets: ["Orthopedic Dog Bed", "Cat Tree", "Treat Puzzle", "Grooming Kit", "Pet Camera", "GPS Collar", "Auto Feeder", "Water Fountain", "Retractable Leash", "Pet Carrier", "Scratching Post", "Dog Rain Jacket", "Litter Mat", "Pet First Aid", "Birthday Bandana", "Slow Feeder Bowl"],
  art: ["Acrylic Paint Set", "Watercolor Set", "Canvas Pack", "Sketch Pencil Set", "Oil Paint Starter", "Palette Knives", "Tabletop Easel", "Charcoal Set", "Pastel Set", "Linocut Kit", "Embroidery Kit", "Macrame Kit", "Pottery Tools", "Jewelry Pliers", "Resin Art Kit", "Wood Burning Kit"],
  food: ["Chocolate Gift Box", "Artisan Coffee", "Tea Sampler", "Hot Sauce Flight", "Olive Oil Premium", "Raw Honey Jar", "Spice Collection", "BBQ Rub Set", "Pasta Basket", "Cheese Assortment", "Jerky Sampler", "Popcorn Set", "Maple Syrup", "Truffle Salt", "Cookie Gift Tin", "Granola Pack"],
  experiences: ["Cooking Class Credit", "Wine Tasting Pass", "Spa Day Credit", "Concert Tickets", "Museum Pass", "Hot Air Balloon Credit", "Photo Session", "Dance Lessons", "Escape Room", "Comedy Show Pass", "Pottery Workshop", "Glass Blowing Class", "Sailing Lesson", "Horseback Ride", "Food Tour", "Axe Throwing Night"],
};

function searchUrl(category: string, brand: string, product: string) {
  const q = encodeURIComponent(`${brand} ${product}`);
  switch (category) {
    case "gaming": return `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`;
    case "home": return `https://www.target.com/s?searchTerm=${q}`;
    case "kitchen": return `https://www.williams-sonoma.com/search/results.html?words=${q}`;
    case "books": return `https://bookshop.org/search?keywords=${encodeURIComponent(product)}`;
    case "writing": return `https://www.jetpens.com/search?q=${q}`;
    case "beauty": return `https://www.sephora.com/search?keyword=${q}`;
    case "outdoor": return `https://www.rei.com/search?q=${q}`;
    case "fitness": return `https://www.nike.com/w?q=${encodeURIComponent(product)}`;
    case "pets": return `https://www.chewy.com/s?query=${q}`;
    case "art": return `https://www.dickblick.com/search/?q=${q}`;
    case "food": return `https://www.goldbelly.com/search?q=${encodeURIComponent(product)}`;
    case "experiences": return `https://www.masterclass.com/search?query=${encodeURIComponent(product)}`;
    default: return `https://www.amazon.com/s?k=${q}`;
  }
}

function slugSafe(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function buildExpandedCuratedProducts(): ExpandedSeed[] {
  const products: ExpandedSeed[] = [];

  for (const category of CATEGORIES) {
    const brands = BRANDS[category] ?? ["Curated"];
    const names = PRODUCT_NAMES[category] ?? ["Gift Pick"];

    for (let i = 0; i < 16; i++) {
      const brand = brands[i % brands.length]!;
      const productName = names[i % names.length]!;
      const name = `${brand} ${productName}`;
      const slug = slugSafe(`${brand}-${productName}-curated-${i}`);

      products.push({
        slug,
        name,
        brand,
        category,
        price: 2800 + i * 1200 + CATEGORIES.indexOf(category) * 350,
        affiliateUrl: searchUrl(category, brand, productName),
        interests: [category, "giftable", productName.split(" ")[0]!.toLowerCase()],
        summary: `Curated ${category} gift: ${productName.toLowerCase()}.`,
        why: "Hand-picked for broad appeal and strong giftability.",
        badge: "Curated link",
      });
    }
  }

  return products;
}

export const EXPANDED_CURATED_PRODUCTS = buildExpandedCuratedProducts();
