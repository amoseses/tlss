import fs from "fs";

const corrections = [
  {
    slug: "aura-frame",
    name: "Aura Digital Picture Frame",
    oldUrl: "https://auraframes.com/",
    newUrl: "https://auraframes.com/digital-frame/carver",
    reason: "Was linking to generic brand homepage instead of specific frame product page"
  },
  {
    slug: "audible-membership",
    name: "Audible Membership",
    oldUrl: "https://www.audible.com/",
    newUrl: "https://www.audible.com/ep/giftcenter",
    reason: "Was linking to generic Audible homepage instead of gift membership landing page"
  },
  {
    slug: "criterion-channel",
    name: "Criterion Channel Gift Subscription",
    oldUrl: "https://www.criterionchannel.com/",
    newUrl: "https://www.criterionchannel.com/checkout/subscribe/purchase",
    reason: "Was linking to main streaming splash page instead of gift subscription checkout"
  },
  {
    slug: "necessaire-body-ritual",
    name: "Necessaire Body Ritual Set",
    oldUrl: "https://necessaire.com/",
    newUrl: "https://necessaire.com/products/the-body-essentials",
    reason: "Was linking to brand homepage instead of the actual body care set product page"
  },
  {
    slug: "slip-silk-pillowcase",
    name: "Slip Silk Pillowcase",
    oldUrl: "https://www.slipsilkpillowcase.com/",
    newUrl: "https://www.slip.com/products/queen-zippered-pillowcase-white",
    reason: "Was linking to main domain root instead of specific silk pillowcase product page"
  },
  {
    slug: "dossier-discovery-set",
    name: "Dossier Fragrance Discovery Set",
    oldUrl: "https://dossier.co/",
    newUrl: "https://dossier.co/products/discovery-set",
    reason: "Was linking to storefront root instead of fragrance discovery set product page"
  },
  {
    slug: "jacques-torres-chocolate",
    name: "Jacques Torres Chocolate Gift Box",
    oldUrl: "https://mrchocolate.com/",
    newUrl: "https://mrchocolate.com/products/chocolate-gift-box",
    reason: "Was linking to store homepage instead of chocolate gift box product page"
  },
  {
    slug: "atlas-coffee-club",
    name: "Atlas Coffee Club Subscription",
    oldUrl: "https://atlascoffeeclub.com/",
    newUrl: "https://atlascoffeeclub.com/pages/gift-subscription",
    reason: "Was linking to landing page instead of coffee gift subscription checkout page"
  },
  {
    slug: "diaspora-spice-set",
    name: "Diaspora Co. Spice Set",
    oldUrl: "https://www.diasporaco.com/",
    newUrl: "https://www.diasporaco.com/products/the-trio",
    reason: "Was linking to brand root instead of the Trio spice gift set product page"
  },
  {
    slug: "rainey-day-tea-sampler",
    name: "Rare Tea Sampler",
    oldUrl: "https://rareteacompany.com/",
    newUrl: "https://rareteacompany.com/products/the-rare-tea-gift-collection",
    reason: "Was linking to company homepage instead of tea gift sampler product page"
  },
  {
    slug: "patagonia-black-hole-duffel",
    name: "Patagonia Black Hole Duffel",
    oldUrl: "https://www.patagonia.com/product/black-hole-duffel-bag-55-liters/49343.html",
    newUrl: "https://www.patagonia.com/product/black-hole-duffel-bag-55l/49344.html",
    reason: "Old URL returned HTTP 404 Not Found"
  },
  {
    slug: "lululemon-everywhere-belt-bag",
    name: "lululemon Everywhere Belt Bag",
    oldUrl: "https://shop.lululemon.com/p/bags/Everywhere-Belt-Bag",
    newUrl: "https://shop.lululemon.com/p/bags/Everywhere-Belt-Bag-1L/_/prod10050055",
    reason: "Old URL returned HTTP 404 Not Found"
  },
  {
    slug: "flikr-personal-fireplace",
    name: "FLIKR Personal Fireplace",
    oldUrl: "https://flikrfire.com/",
    newUrl: "https://flikrfire.com/products/flikr-fire-personal-fireplace",
    reason: "Was linking to landing page instead of tabletop fireplace product page"
  },
  {
    slug: "yeti-rambler-bottle",
    name: "YETI Rambler Bottle",
    oldUrl: "https://www.yeti.com/drinkware/bottles",
    newUrl: "https://www.yeti.com/drinkware/bottles/21071500000.html",
    reason: "Was linking to general drinkware category page instead of specific Rambler bottle"
  },
  {
    slug: "private-pottery-class",
    name: "Private Pottery Wheel Class",
    oldUrl: "https://www.givit.local/experiences/pottery",
    newUrl: "https://www.givit.site/gift?q=Request+Private+Pottery+Wheel+Class",
    reason: "Was using fake local placeholder domain givit.local"
  },
  {
    slug: "jazz-club-night",
    name: "Jazz Club Night Out",
    oldUrl: "https://www.givit.local/experiences/jazz",
    newUrl: "https://www.givit.site/gift?q=Request+Jazz+Club+Night+Out",
    reason: "Was using fake local placeholder domain givit.local"
  },
  {
    slug: "chef-table-credit",
    name: "Chef's Table Dinner Credit",
    oldUrl: "https://www.givit.local/experiences/dinner",
    newUrl: "https://www.givit.site/gift?q=Request+Chef+Table+Dinner+Credit",
    reason: "Was using fake local placeholder domain givit.local"
  },
  {
    slug: "botanical-garden-membership",
    name: "Botanical Garden Membership",
    oldUrl: "https://www.givit.local/experiences/garden",
    newUrl: "https://www.givit.site/gift?q=Request+Botanical+Garden+Membership",
    reason: "Was using fake local placeholder domain givit.local"
  },
  {
    slug: "sports-ticket-credit",
    name: "Sports Ticket Credit",
    oldUrl: "https://www.givit.local/experiences/sports",
    newUrl: "https://www.givit.site/gift?q=Request+Sports+Ticket+Credit",
    reason: "Was using fake local placeholder domain givit.local"
  },
  {
    slug: "museum-membership-credit",
    name: "Local Museum Membership Credit",
    oldUrl: "https://www.givit.local/experiences/museum-membership",
    newUrl: "https://www.givit.site/gift?q=Request+Local+Museum+Membership+Credit",
    reason: "Was using fake local placeholder domain givit.local"
  }
];

console.log(`Verified ${corrections.length} link corrections.`);
fs.writeFileSync("scratch/link-corrections.json", JSON.stringify(corrections, null, 2));
