async function printAllProductsInChunk() {
  const baseUrl = "https://tech-nexa-hub.vercel.app";
  const res = await fetch(baseUrl + "/_next/static/chunks/21w8u84r9qu1y.js");
  const code = await res.text();

  // Find all objects
  const regex = /\{id:["']?([^,"'}]+)["']?,name:["']?([^"']+)["']?,category:["']?([^"']+)["']?,price:([0-9.]+)/g;
  let m;
  const products = [];
  while ((m = regex.exec(code)) !== null) {
    products.push({ id: m[1], name: m[2], category: m[3], price: m[4] });
  }

  console.log("Total products matched with regex:", products.length);
  console.log("Categories:", [...new Set(products.map(p => p.category))]);
  console.log("Sample 10 items:", products.slice(0, 10));

  // Let's also check if there are other object patterns with "price:"
  const allPrices = [...code.matchAll(/name:["']?([^"']+)["']?[^}]{1,150}price:([0-9.]+)/g)];
  console.log("Alternative name/price match count:", allPrices.length);

  // Check if there are other chunks with products
  const searchRes = await fetch(baseUrl + "/search");
  const searchHtml = await searchRes.text();
  const chunkPaths = [...searchHtml.matchAll(/src=["'](\/_next\/static\/chunks\/[^"']+)["']/g)].map(m => m[1]);
  for (const cp of chunkPaths) {
    if (cp.includes("21w8u84r9qu1y")) continue;
    const cRes = await fetch(baseUrl + cp);
    const cCode = await cRes.text();
    const cMatches = [...cCode.matchAll(/\{id:["']?([^,"'}]+)["']?,name:["']?([^"']+)["']?,/g)];
    if (cMatches.length > 0) {
      console.log("Other chunk with id/name:", cp, "Count:", cMatches.length);
    }
  }
}
printAllProductsInChunk().catch(console.error);
