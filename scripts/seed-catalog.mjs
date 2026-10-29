import { seedMasterCatalog } from "../lib/catalog-seed-service.ts";

async function main() {
  console.log("Seeding master catalog...");
  const result = await seedMasterCatalog(1);
  console.log("Result:", result);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
