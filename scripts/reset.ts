import { getStore } from "../src/lib/store";

/**
 * npm run reset: deletes data/catalog.json, data/photos and data/corrections.jsonl.
 * The next request starts again from data/catalog.seed.json.
 */
await getStore().reset();
console.log("Catalogue reset. The next request reloads data/catalog.seed.json.");
