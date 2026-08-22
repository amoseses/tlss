import fs from "fs";
import path from "path";

const results = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "scratch/link-check-results.json"), "utf-8")
);

const broken = [];
const genericOrHomepage = [];
const validProductPages = [];

for (const r of results) {
  const url = r.url;

  // Check 1: Failed network or 404/500 HTTP errors
  if (!r.ok || r.status === 404 || r.status === 500 || r.status === 502) {
    broken.push({ ...r, issue: `HTTP ${r.status}` });
    continue;
  }

  // Check 2: Fake/placeholder URLs
  if (url.includes("givit.local")) {
    broken.push({ ...r, issue: "Fake local placeholder link" });
    continue;
  }

  // Check 3: Bare domain / homepage instead of a specific product page
  try {
    const parsed = new URL(r.finalUrl || url);
    const pathname = parsed.pathname.replace(/\/$/, "");
    if (!pathname || pathname === "" || pathname === "/en-us" || pathname === "/us/en-us") {
      genericOrHomepage.push({ ...r, issue: "Links to bare brand homepage instead of specific product" });
      continue;
    }
  } catch {
    broken.push({ ...r, issue: "Malformed URL" });
    continue;
  }

  validProductPages.push(r);
}

console.log("--- LINK AUDIT SUMMARY ---");
console.log(`Total Products Analyzed: ${results.length}`);
console.log(`Broken / 404 / Error Links: ${broken.length}`);
console.log(`Generic Brand Homepage Links: ${genericOrHomepage.length}`);
console.log(`Valid Product Page Links: ${validProductPages.length}`);

console.log("\n=== BROKEN / ERROR LINKS ===");
console.dir(broken, { depth: null });

console.log("\n=== GENERIC HOMEPAGE LINKS ===");
console.dir(genericOrHomepage, { depth: null });
