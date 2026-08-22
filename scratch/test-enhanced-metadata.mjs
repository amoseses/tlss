import { parseHtmlMetadata } from "../server/api-lib/html-metadata-parser.mjs";

async function testUrl(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`HTTP ${res.status} for ${url}`);
      return null;
    }
    const html = await res.text();
    const parsed = parseHtmlMetadata(html, url);
    console.log(`URL: ${url}`);
    console.log(`Extracted Price: ${parsed?.price ? "$" + parsed.price : "None"}`);
    console.log(`Title: ${parsed?.title}`);
    return parsed;
  } catch (err) {
    console.log(`Error testing ${url}: ${err.message}`);
    return null;
  }
}

async function run() {
  await testUrl("https://www.gouletpens.com/products/pilot-custom-823-fountain-pen-amber");
  await testUrl("https://electronics.sony.com/audio/headphones/headband/p/wh1000xm5-b");
  await testUrl("https://www.amazon.com/dp/B08KTZ8249");
}

run();
