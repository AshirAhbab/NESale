async function inspect012() {
  const baseUrl = "https://tech-nexa-hub.vercel.app";
  const res = await fetch(baseUrl + "/_next/static/chunks/012zjvi5kz2om.js");
  const code = await res.text();
  console.log("Has CPU:", code.includes("Core i") || code.includes("Ryzen"));
  console.log("Has GPU:", code.includes("RTX") || code.includes("Radeon"));
  console.log("Has Motherboard:", code.includes("ASUS") || code.includes("MSI") || code.includes("Gigabyte"));
  console.log("Has price:", code.includes("price"));
  
  // Find where price or items occur
  const idx = code.indexOf("RTX");
  if (idx !== -1) {
    console.log("Snippet around RTX:", code.slice(Math.max(0, idx - 150), idx + 250));
  }
}
inspect012();
