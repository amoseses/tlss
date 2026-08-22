const testUrls = [
  "https://pilotpen.us/categories/fountain-pens/custom-823-fountain/",
  "https://pilotpen.us/brands/custom-823/",
  "https://pilotpen.us/products/custom-823/",
  "https://pilotpen.us/fine-writing/custom-823/",
  "https://www.gouletpens.com/products/pilot-custom-823-fountain-pen-amber",
  "https://www.penchalet.com/fine_pens/fountain_pens/pilot_custom_823_fountain_pen.html"
];

async function test() {
  for (const url of testUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        redirect: "follow"
      });
      console.log(`${res.status} | ${res.url} (original: ${url})`);
    } catch (e) {
      console.log(`ERROR: ${url} | ${e.message}`);
    }
  }
}

test();
