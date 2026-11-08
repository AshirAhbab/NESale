async function checkPcBuilder() {
  const baseUrl = "https://tech-nexa-hub.vercel.app";
  const chunks = [
    "/_next/static/chunks/3t1xm20ibxjgp.js",
    "/_next/static/chunks/012zjvi5kz2om.js",
    "/_next/static/chunks/06pr6ao7t0vyh.js",
  ];

  for (const c of chunks) {
    const res = await fetch(baseUrl + c);
    const code = await res.text();
    console.log("Chunk:", c, "Length:", code.length);
    // search for component names or parts
    const parts = [...code.matchAll(/\{id:["']?([^,"'}]+)["']?,name:["']?([^"']+)["']?[^}]*?price:([0-9.]+)/g)];
    console.log("Found parts in", c, ":", parts.length);
    if (parts.length > 0) {
      console.log("Sample part:", parts[0][1], parts[0][2], parts[0][3]);
    }
  }
}
checkPcBuilder().catch(console.error);
