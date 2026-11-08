async function deepExplore() {
  const baseUrl = "https://tech-nexa-hub.vercel.app";
  
  // 1. robots.txt
  try {
    const res = await fetch(baseUrl + "/robots.txt");
    console.log("robots.txt:", res.status, await res.text());
  } catch(e) {
    console.log("robots.txt err:", e.message);
  }

  // 2. check if any api routes exist
  const apis = ["/api/products", "/api/catalog", "/api/items", "/api/search"];
  for (const api of apis) {
    try {
      const res = await fetch(baseUrl + api);
      console.log(api, "status:", res.status);
    } catch(e) {}
  }

  // 3. check /search with various query params
  const catRes = await fetch(baseUrl + "/search");
  const catText = await catRes.text();
  console.log("Search page HTML length:", catText.length);
  
  // Check if any build manifest or _buildManifest.js exists
  const manifestMatches = [...catText.matchAll(/src=["'](\/_next\/static\/[^"']+_buildManifest\.js)["']/g)].map(m => m[1]);
  console.log("Build manifest:", manifestMatches);
  if (manifestMatches.length > 0) {
    const mRes = await fetch(baseUrl + manifestMatches[0]);
    console.log("Manifest text:", await mRes.text());
  }
}
deepExplore();
