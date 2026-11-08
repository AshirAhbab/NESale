async function checkAlexGrey() {
  const bizId = "16cf642c-412f-419f-a4c1-5e93793c6d54";
  const productsRes = await fetch("http://localhost:3000/api/v1/dashboard/products?businessId=" + bizId);
  const data = await productsRes.json();
  console.log("Business name:", data.business?.name);
  console.log("Products count:", data.products?.length);
  console.log("Products:", data.products?.map(p => p.name));
}
checkAlexGrey().catch(console.error);
