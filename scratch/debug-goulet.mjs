import { fetchPageMetadata } from "../server/api-lib/metadata.mjs";

async function main() {
  const url = "https://www.gouletpens.com/products/pilot-custom-823-fountain-pen-amber";
  console.log("Fetching metadata for:", url);
  const meta = await fetchPageMetadata(url);
  console.log("Metadata fetched:", JSON.stringify(meta, null, 2));

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const html = await res.text();
  console.log("HTML length:", html.length);

  // Search for price tags in Goulet Pens HTML
  const matches = [...html.matchAll(/(?:"price"|priceAmount|og:price:amount|data-product-price|itemprop="price")[^>\n]{1,100}/gi)];
  console.log("Price matches in HTML:");
  for (const m of matches.slice(0, 10)) {
    console.log(" -", m[0]);
  }
}

main();
