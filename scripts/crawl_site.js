async function crawlSite() {
  const baseUrl = "https://tech-nexa-hub.vercel.app";
  const visited = new Set();
  const queue = ["/"];
  const allLinks = new Set();

  while (queue.length > 0 && queue.length < 50) {
    const p = queue.shift();
    if (visited.has(p)) continue;
    visited.add(p);

    try {
      const res = await fetch(baseUrl + p);
      if (!res.ok) continue;
      const html = await res.text();

      const hrefs = [...html.matchAll(/href=["'](\/[^"']*)["']/g)].map(m => m[1]);
      for (const h of hrefs) {
        if (!visited.has(h) && !queue.includes(h) && !h.startsWith("/_next")) {
          queue.push(h);
          allLinks.add(h);
        }
      }
    } catch (e) {
      console.log("Error crawling", p, e.message);
    }
  }

  console.log("All internal routes found on tech-nexa-hub.vercel.app:", Array.from(allLinks));
}
crawlSite().catch(console.error);
