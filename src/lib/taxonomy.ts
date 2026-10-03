/**
 * The category list the model must choose from. A fixed list (an enum in the
 * schema) beats free text: the UI can filter on it, the eval can score it with an
 * exact match, and the model cannot invent "Kitchenware & Dining Accessories".
 *
 * The descriptions are for people and for prompts: paste them into the system
 * prompt if the model mixes up two categories.
 */
export const CATEGORIES = [
  "electronics",
  "computers",
  "phones_tablets",
  "audio",
  "cameras",
  "kitchen_dining",
  "home_furniture",
  "tools_diy",
  "garden_outdoor",
  "sports_fitness",
  "toys_games",
  "books_media",
  "clothing_shoes",
  "bags_luggage",
  "beauty_personal_care",
  "health_household",
  "food_drink",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_INFO: Record<Category, { label: string; description: string }> = {
  electronics: { label: "Electronics", description: "Lamps, chargers, smart home devices, small gadgets with a plug or battery" },
  computers: { label: "Computers", description: "Laptops, keyboards, mice, monitors, storage, cables for computers" },
  phones_tablets: { label: "Phones and tablets", description: "Phones, tablets, cases, screen protectors, phone accessories" },
  audio: { label: "Audio", description: "Headphones, earbuds, speakers, microphones, record players" },
  cameras: { label: "Cameras", description: "Cameras, lenses, tripods, camera bags and accessories" },
  kitchen_dining: { label: "Kitchen and dining", description: "Cookware, mugs, bottles, cutlery, small kitchen appliances" },
  home_furniture: { label: "Home and furniture", description: "Furniture, decor, bedding, storage, lighting fixtures" },
  tools_diy: { label: "Tools and DIY", description: "Power tools, hand tools, fixings, measuring tools" },
  garden_outdoor: { label: "Garden and outdoor", description: "Garden tools, hoses, planters, outdoor furniture, barbecues" },
  sports_fitness: { label: "Sports and fitness", description: "Sports equipment, gym gear, bikes, camping gear" },
  toys_games: { label: "Toys and games", description: "Toys, board games, puzzles, building sets" },
  books_media: { label: "Books and media", description: "Books, comics, vinyl, CDs, DVDs, video games" },
  clothing_shoes: { label: "Clothing and shoes", description: "Clothes, shoes, hats, belts, watches, jewellery" },
  bags_luggage: { label: "Bags and luggage", description: "Backpacks, handbags, suitcases, wallets" },
  beauty_personal_care: { label: "Beauty and personal care", description: "Skincare, make-up, hair care, shavers, toothbrushes" },
  health_household: { label: "Health and household", description: "Cleaning products, first aid, supplements, household supplies" },
  food_drink: { label: "Food and drink", description: "Packaged food, tea, coffee, drinks" },
  other: { label: "Other", description: "Anything that fits none of the categories above" },
};

export function categoryLabel(category: string): string {
  return (CATEGORY_INFO as Record<string, { label: string }>)[category]?.label ?? category;
}
