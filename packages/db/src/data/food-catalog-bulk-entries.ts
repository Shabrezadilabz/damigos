import type { FoodCatalogDraft } from "./food-catalog-entries.ts";

function add(
  out: FoodCatalogDraft[],
  row: FoodCatalogDraft,
) {
  out.push(row);
}

function addMany(
  out: FoodCatalogDraft[],
  names: string[],
  meta: Omit<FoodCatalogDraft, "name" | "aliases">,
) {
  for (const name of names) add(out, { ...meta, name });
}

/** Extra catalog rows (merged on seed) — JSON import can add more at runtime. */
export function buildFoodCatalogBulkEntries(): FoodCatalogDraft[] {
  const e: FoodCatalogDraft[] = [];

  addMany(
    e,
    [
      "Akbari Biryani",
      "Kacchi Biryani",
      "Donne Biryani",
      "Jackfruit Biryani",
      "Mushroom Biryani",
      "Soya Biryani",
      "Fish Biryani Kerala Style",
      "Prawn Biryani",
      "Keema Biryani",
      "Handi Biryani",
    ],
    { cuisine: "indian", category: "biryani", isVeg: false, imageKey: "biryaniNonVeg" },
  );
  addMany(
    e,
    ["Jackfruit Biryani (Veg)", "Mushroom Biryani (Veg)", "Soya Chunk Biryani"],
    { cuisine: "indian", category: "biryani", isVeg: true, imageKey: "biryaniVeg" },
  );

  addMany(
    e,
    [
      "Paneer Do Pyaza",
      "Kadhi Pakora",
      "Baigan Bharta",
      "Navratan Korma",
      "Dum Aloo",
      "Chana Masala",
      "Pindi Chole",
      "Matar Paneer",
      "Kadai Mushroom",
    ],
    { cuisine: "indian", category: "curry", isVeg: true, imageKey: "curry" },
  );
  addMany(
    e,
    [
      "Chicken Saagwala",
      "Mutton Keema",
      "Prawn Curry",
      "Goan Fish Curry",
      "Andhra Chicken Curry",
      "Kolhapuri Chicken",
      "Dhaba Style Chicken",
    ],
    { cuisine: "indian", category: "curry", isVeg: false, imageKey: "curry" },
  );

  addMany(
    e,
    [
      "Hara Bhara Kebab",
      "Dahi Ke Kebab",
      "Chicken Reshmi Kebab",
      "Bharwan Tangdi",
      "Tandoori Platter",
      "Fish Amritsari",
    ],
    { cuisine: "indian", category: "starter", isVeg: false, imageKey: "tikkaKebab" },
  );

  addMany(
    e,
    ["Misal Pav", "Sabudana Vada", "Medu Vada Sambar", "Filter Coffee Dosa Combo"],
    { cuisine: "indian", category: "south_indian", isVeg: true, imageKey: "dosa" },
  );

  addMany(
    e,
    [
      "Schezwan Noodles",
      "Triple Schezwan Rice",
      "Chilli Garlic Noodles",
      "American Chopsuey",
      "Crispy Corn",
      "Honey Chilli Potato",
      "Veg Manchow Soup",
    ],
    { cuisine: "chinese", category: "main", isVeg: true, imageKey: "chinese" },
  );
  addMany(
    e,
    [
      "Dragon Chicken",
      "Szechuan Chicken",
      "Black Pepper Chicken",
      "Lemon Coriander Soup (Chicken)",
      "Prawn Chilli Garlic",
    ],
    { cuisine: "chinese", category: "main", isVeg: false, imageKey: "chinese" },
  );

  addMany(
    e,
    ["Edamame", "Gyoza", "Chicken Teriyaki Bowl", "Salmon Teriyaki", "Katsu Curry"],
    { cuisine: "japanese", category: "main", isVeg: false, imageKey: "japanese" },
  );
  addMany(
    e,
    ["Veg Tempura", "Tofu Teriyaki Bowl", "Avocado Roll Set"],
    { cuisine: "japanese", category: "main", isVeg: true, imageKey: "sushi" },
  );

  addMany(
    e,
    ["Kimchi Jjigae", "Samgyeopsal", "Korean BBQ Chicken", "Corn Cheese", "Soondubu Stew"],
    { cuisine: "korean", category: "main", isVeg: false, imageKey: "korean" },
  );

  addMany(
    e,
    ["Sub Sandwich", "Chicken Sub", "Veggie Delite Wrap", "Fish Burger", "Chicken Popcorn"],
    { cuisine: "fast_food", category: "fast_food", isVeg: false, imageKey: "burger" },
  );

  addMany(
    e,
    ["Acai Bowl", "Poke Bowl", "Grilled Salmon Salad", "Zucchini Noodles", "Detox Smoothie Bowl"],
    { cuisine: "healthy", category: "bowl", isVeg: false, imageKey: "salad" },
  );
  addMany(
    e,
    ["Keto Salad", "Intermittent Fasting Bowl", "Low Carb Paneer Bowl", "Steamed Broccoli Plate"],
    { cuisine: "diet", category: "diet", isVeg: true, imageKey: "salad" },
  );

  addMany(
    e,
    ["Amla Juice", "Sugarcane Juice", "Beetroot Juice", "Pineapple Juice", "Virgin Piña Colada"],
    { cuisine: "beverage", category: "juice", isVeg: true, imageKey: "juice" },
  );
  addMany(
    e,
    ["Negroni", "Moscow Mule", "Cosmopolitan", "Whiskey Highball"],
    { cuisine: "beverage", category: "cocktail", isVeg: true, imageKey: "cocktail" },
  );

  addMany(
    e,
    ["Rumali Roti", "Sheermal", "Stuffed Kulcha", "Thepla", "Makki Roti"],
    { cuisine: "indian", category: "roti", isVeg: true, imageKey: "rotiBread" },
  );

  addMany(
    e,
    ["Jalebi", "Rabri", "Kulfi Falooda", "Phirni", "Gajar Halwa"],
    { cuisine: "dessert", category: "dessert", isVeg: true, imageKey: "dessert" },
  );

  return e;
}
