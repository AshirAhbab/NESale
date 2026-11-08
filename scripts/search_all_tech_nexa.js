async function searchAllChunksForProducts() {
  const baseUrl = "https://tech-nexa-hub.vercel.app";
  const searchRes = await fetch(baseUrl + "/search");
  const html = await searchRes.text();
  const chunks = [...html.matchAll(/src=["'](\/_next\/static\/chunks\/[^"']+)["']/g)].map(m => m[1]);

  console.log("Searching in", chunks.length, "chunks...");
  let allDetectedProducts = [];

  for (const c of chunks) {
    const res = await fetch(baseUrl + c);
    const text = await res.text();

    // Look for any array of products or objects with id, name
    const matches = [...text.matchAll(/\{id:["']?([^,"'}]+)["']?,name:["']?([^"']+)["']?[^}]*?price:([0-9.]+)/g)];
    if (matches.length > 0) {
      console.log(`Chunk ${c}: found ${matches.length} products`);
      for (const m of matches) {
        if (!allDetectedProducts.some(p => p.id === m[1])) {
          allDetectedProducts.push({ id: m[1], name: m[2], price: m[3] });
        }
      }
    }
  }

  console.log("Total unique products found on tech-nexa-hub.vercel.app:", allDetectedProducts.length);
  console.log("Product list:", allDetectedProducts.map(p => `${p.name} ($${p.price})`));
}

searchAllChunksForProducts().catch(console.error);
