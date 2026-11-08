async function analyzeAllProducts() {
  const baseUrl = "https://tech-nexa-hub.vercel.app";
  
  // 1. Check sitemap.xml
  try {
    const sitemapRes = await fetch(baseUrl + "/sitemap.xml");
    console.log("/sitemap.xml status:", sitemapRes.status);
    if (sitemapRes.ok) {
      const sitemap = await sitemapRes.text();
      const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
      console.log("Sitemap URLs found:", urls.length, urls.slice(0, 10));
    }
  } catch(e) {
    console.log("Sitemap error:", e.message);
  }

  // 2. Check /search HTML and all chunks
  const searchRes = await fetch(baseUrl + "/search");
  const searchHtml = await searchRes.text();
  const chunkPaths = [...searchHtml.matchAll(/src=["'](\/_next\/static\/chunks\/[^"']+)["']/g)].map(m => m[1]);
  console.log("Found chunks on /search:", chunkPaths.length);

  let totalProductsFound = [];

  for (const cp of chunkPaths) {
    try {
      const cRes = await fetch(baseUrl + cp);
      const code = await cRes.text();
      
      // Let's search for any data arrays or product definitions
      // Look for products: [...] or items: [...] or hardware items
      if (code.includes("RTX") || code.includes("Gaming") || code.includes("Laptop") || code.includes("price")) {
        console.log("Inspecting chunk with potential products:", cp, "Length:", code.length);
        
        // Find all JSON-like objects with id, name, price
        const regex1 = /\{id:["']?([^,"'}]+)["']?,name:["']?([^"']+)["']?,category:["']?([^"']+)["']?,price:([0-9.]+)/g;
        let m;
        let count = 0;
        while ((m = regex1.exec(code)) !== null) {
          count++;
          if (!totalProductsFound.some(p => p.id === m[1] || p.name === m[2])) {
            totalProductsFound.push({ id: m[1], name: m[2], category: m[3], price: m[4] });
          }
        }
        console.log("Matches with regex1 in", cp, ":", count);
      }
    } catch(e) {
      console.log("Chunk error:", cp, e.message);
    }
  }

  console.log("Total unique products found across search chunks:", totalProductsFound.length);

  // 3. Check other pages: /pc-builder, /category, etc.
  const pages = ["/", "/search", "/pc-builder", "/categories", "/laptops", "/desktops", "/components"];
  for (const page of pages) {
    try {
      const pRes = await fetch(baseUrl + page);
      console.log(page, "-> status:", pRes.status);
      if (pRes.ok) {
        const pHtml = await pRes.text();
        const pChunks = [...pHtml.matchAll(/src=["'](\/_next\/static\/chunks\/[^"']+)["']/g)].map(m => m[1]);
        for (const c of pChunks) {
          if (!chunkPaths.includes(c)) {
            chunkPaths.push(c);
            console.log("New chunk found on", page, ":", c);
          }
        }
      }
    } catch {}
  }

  console.log("Total chunks across all pages:", chunkPaths.length);
}

analyzeAllProducts().catch(console.error);
