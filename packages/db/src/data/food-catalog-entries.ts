import { FOOD_CATALOG_IMAGES, type FoodImageKey } from "./food-catalog-images.ts";

export type FoodCatalogDraft = {
  name: string;
  cuisine: string;
  category: string;
  isVeg: boolean;
  imageKey: FoodImageKey;
  aliases?: string[];
};

function add(
  out: FoodCatalogDraft[],
  row: Omit<FoodCatalogDraft, "aliases"> & { aliases?: string[] },
) {
  out.push(row);
}

function addMany(
  out: FoodCatalogDraft[],
  names: string[],
  meta: Omit<FoodCatalogDraft, "name" | "aliases">,
  aliasesFor?: (name: string) => string[],
) {
  for (const name of names) {
    add(out, { ...meta, name, aliases: aliasesFor?.(name) });
  }
}

export function buildFoodCatalogEntries(): FoodCatalogDraft[] {
  const e: FoodCatalogDraft[] = [];

  const biryaniStyles = [
    "Hyderabadi",
    "Lucknowi",
    "Awadhi",
    "Kolkata",
    "Malabar",
    "Ambur",
    "Dindigul",
    "Mughlai",
    "Thalassery",
    "Chettinad",
  ];
  const biryaniProteins = ["Chicken", "Mutton", "Fish", "Prawn", "Egg"];
  for (const style of biryaniStyles) {
    for (const protein of biryaniProteins) {
      add(e, {
        name: `${style} ${protein} Biryani`,
        cuisine: "indian",
        category: "biryani",
        isVeg: false,
        imageKey: "biryaniNonVeg",
        aliases: [`${protein.toLowerCase()} biryani`, `${style.toLowerCase()} biryani`],
      });
    }
    add(e, {
      name: `${style} Veg Biryani`,
      cuisine: "indian",
      category: "biryani",
      isVeg: true,
      imageKey: "biryaniVeg",
    });
    add(e, {
      name: `${style} Paneer Biryani`,
      cuisine: "indian",
      category: "biryani",
      isVeg: true,
      imageKey: "biryaniVeg",
    });
  }

  addMany(
    e,
    [
      "Chicken Dum Biryani",
      "Mutton Dum Biryani",
      "Hyderabadi Chicken Biryani",
      "Paneer Tikka Biryani",
      "Veg Dum Biryani",
      "Egg Biryani",
      "Biryani Box Special",
      "Family Biryani Pack",
    ],
    { cuisine: "indian", category: "biryani", isVeg: false, imageKey: "biryaniNonVeg" },
  );
  add(e, {
    name: "Shahi Paneer Dum Biryani",
    cuisine: "indian",
    category: "biryani",
    isVeg: true,
    imageKey: "biryaniVeg",
  });

  addMany(
    e,
    [
      "Paneer Butter Masala",
      "Dal Makhani",
      "Dal Tadka",
      "Chole Bhature",
      "Rajma Masala",
      "Palak Paneer",
      "Kadai Paneer",
      "Malai Kofta",
      "Mix Veg Curry",
      "Bhindi Masala",
      "Aloo Gobi",
      "Methi Malai Matar",
      "Paneer Lababdar",
      "Shahi Paneer",
      "Dal Fry",
      "Moong Dal",
      "Sambar",
      "Rasam",
    ],
    { cuisine: "indian", category: "curry", isVeg: true, imageKey: "curry" },
  );

  addMany(
    e,
    [
      "Butter Chicken",
      "Chicken Chettinad",
      "Chicken Tikka Masala",
      "Mutton Rogan Josh",
      "Fish Curry",
      "Prawn Malabar Curry",
      "Egg Curry",
      "Kerala Chicken Curry",
      "Laal Maas",
      "Nihari",
      "Keema Matar",
    ],
    { cuisine: "indian", category: "curry", isVeg: false, imageKey: "curry" },
  );

  addMany(
    e,
    [
      "Tandoori Chicken",
      "Chicken Tikka",
      "Malai Tikka",
      "Hariyali Tikka",
      "Seekh Kebab",
      "Galouti Kebab",
      "Fish Tikka",
      "Paneer Tikka",
      "Tandoori Pomfret",
      "Chicken Tangdi",
      "Mutton Seekh Kebab",
      "Charred Malai Tikka",
    ],
    { cuisine: "indian", category: "starter", isVeg: false, imageKey: "tikkaKebab" },
  );
  addMany(
    e,
    [
      "Paneer Tikka",
      "Paneer Malai Tikka",
      "Tandoori Paneer",
      "Mushroom Tikka",
      "Soya Chaap Tikka",
    ],
    { cuisine: "indian", category: "starter", isVeg: true, imageKey: "tikkaKebab" },
  );

  addMany(
    e,
    [
      "Butter Naan",
      "Garlic Naan",
      "Tandoori Roti",
      "Roomali Roti",
      "Lachha Paratha",
      "Missi Roti",
      "Kulcha",
      "Phulka",
      "Bhatura",
      "Appam",
      "Parotta",
      "Woodfired Sourdough Focaccia",
    ],
    { cuisine: "indian", category: "roti", isVeg: true, imageKey: "rotiBread" },
  );

  addMany(
    e,
    [
      "Masala Dosa",
      "Plain Dosa",
      "Rava Dosa",
      "Mysore Masala Dosa",
      "Set Dosa",
      "Paper Dosa",
      "Ghee Roast Dosa",
      "Onion Uttapam",
      "Medu Vada",
      "Idli (2 pc)",
      "Rava Idli",
      "Pongal",
    ],
    { cuisine: "indian", category: "south_indian", isVeg: true, imageKey: "dosa" },
  );
  add(e, {
    name: "Idli Sambar",
    cuisine: "indian",
    category: "south_indian",
    isVeg: true,
    imageKey: "idli",
  });

  addMany(
    e,
    [
      "Pani Puri",
      "Bhel Puri",
      "Sev Puri",
      "Dahi Puri",
      "Samosa Chaat",
      "Aloo Tikki Chaat",
      "Pav Bhaji",
      "Vada Pav",
      "Dabeli",
      "Kachori",
    ],
    { cuisine: "indian", category: "chaat", isVeg: true, imageKey: "chaat" },
  );

  addMany(
    e,
    [
      "Chicken Roll",
      "Egg Roll",
      "Mutton Roll",
      "Kathi Roll",
      "Paneer Tikka Roll",
      "Double Egg Roll",
    ],
    { cuisine: "indian", category: "roll", isVeg: false, imageKey: "roll" },
  );
  add(e, {
    name: "Paneer Roll",
    cuisine: "indian",
    category: "roll",
    isVeg: true,
    imageKey: "roll",
  });

  addMany(
    e,
    [
      "Veg Manchurian",
      "Gobi Manchurian",
      "Paneer Chilli",
      "Veg Fried Rice",
      "Veg Hakka Noodles",
      "Veg Spring Roll",
      "Veg Momos",
      "Schezwan Fried Rice",
      "Hot & Sour Soup (Veg)",
    ],
    { cuisine: "chinese", category: "main", isVeg: true, imageKey: "chinese" },
  );
  addMany(
    e,
    [
      "Chicken Manchurian",
      "Chilli Chicken",
      "Chicken Fried Rice",
      "Chicken Hakka Noodles",
      "Kung Pao Chicken",
      "Sweet & Sour Chicken",
      "Prawn Fried Rice",
      "Chicken Momos",
      "Hot & Sour Soup (Chicken)",
    ],
    { cuisine: "chinese", category: "main", isVeg: false, imageKey: "chinese" },
  );
  addMany(
    e,
    ["Dim Sum Platter", "Steamed Dumplings", "Siu Mai", "Har Gow"],
    { cuisine: "chinese", category: "starter", isVeg: false, imageKey: "dimSum" },
  );

  addMany(
    e,
    [
      "California Roll",
      "Salmon Nigiri",
      "Tuna Sashimi",
      "Veg Sushi Platter",
      "Dragon Roll",
      "Maki Platter",
    ],
    { cuisine: "japanese", category: "sushi", isVeg: false, imageKey: "sushi" },
  );
  addMany(
    e,
    ["Avocado Maki", "Cucumber Roll", "Inari Sushi"],
    { cuisine: "japanese", category: "sushi", isVeg: true, imageKey: "sushi" },
  );
  addMany(
    e,
    ["Tonkotsu Ramen", "Shoyu Ramen", "Miso Ramen", "Chicken Ramen", "Veg Ramen"],
    { cuisine: "japanese", category: "ramen", isVeg: false, imageKey: "ramen" },
  );
  addMany(
    e,
    ["Teriyaki Chicken", "Chicken Katsu", "Yakitori", "Tempura Prawns", "Gyudon"],
    { cuisine: "japanese", category: "main", isVeg: false, imageKey: "japanese" },
  );

  addMany(
    e,
    ["Bibimbap", "Kimchi Fried Rice", "Bulgogi", "Japchae", "Tteokbokki", "Kimchi Stew"],
    { cuisine: "korean", category: "main", isVeg: false, imageKey: "korean" },
  );
  addMany(
    e,
    ["Korean Fried Chicken", "Yangnyeom Chicken", "Half & Half Chicken"],
    { cuisine: "korean", category: "starter", isVeg: false, imageKey: "koreanFriedChicken" },
  );
  add(e, {
    name: "Veg Bibimbap",
    cuisine: "korean",
    category: "main",
    isVeg: true,
    imageKey: "korean",
  });

  addMany(
    e,
    [
      "Classic Burger",
      "Cheese Burger",
      "Chicken Burger",
      "Veg Burger",
      "Double Patty Burger",
      "Crispy Chicken Burger",
    ],
    { cuisine: "fast_food", category: "burger", isVeg: false, imageKey: "burger" },
  );
  add(e, {
    name: "Veg Supreme Burger",
    cuisine: "fast_food",
    category: "burger",
    isVeg: true,
    imageKey: "burger",
  });
  addMany(
    e,
    [
      "French Fries",
      "Peri Peri Fries",
      "Loaded Fries",
      "Margherita Pizza",
      "Pepperoni Pizza",
      "Truffle Burrata Pizza",
      "Veggie Supreme Pizza",
      "Chicken Wings (6 pc)",
      "Fiery Ghost Pepper Wings (8pc)",
      "Chicken Nuggets",
    ],
    { cuisine: "fast_food", category: "fast_food", isVeg: false, imageKey: "pizza" },
  );
  add(e, {
    name: "Peri Peri Wings",
    cuisine: "fast_food",
    category: "starter",
    isVeg: false,
    imageKey: "wings",
  });
  add(e, {
    name: "French Fries (Regular)",
    cuisine: "fast_food",
    category: "side",
    isVeg: true,
    imageKey: "fries",
  });

  addMany(
    e,
    [
      "Grilled Chicken Salad",
      "Caesar Salad",
      "Greek Salad",
      "Quinoa Buddha Bowl",
      "Protein Bowl",
      "Grilled Fish & Greens",
      "Avocado Toast",
      "Oats Porridge",
      "Grilled Paneer Salad",
    ],
    { cuisine: "healthy", category: "bowl", isVeg: false, imageKey: "salad" },
  );
  addMany(
    e,
    ["Veg Caesar Salad", "Fruit & Nut Bowl", "Green Detox Salad", "Sprout Salad"],
    { cuisine: "healthy", category: "salad", isVeg: true, imageKey: "salad" },
  );

  addMany(
    e,
    [
      "Low Cal Clear Soup",
      "Grilled Chicken Breast",
      "Steamed Veg & Brown Rice",
      "Egg White Omelette",
      "Keto Chicken Bowl",
      "High Protein Paneer Bowl",
    ],
    { cuisine: "diet", category: "diet", isVeg: false, imageKey: "salad" },
  );
  addMany(
    e,
    ["Veg Clear Soup", "Steamed Salad Plate", "Tofu & Veg Steamed Bowl"],
    { cuisine: "diet", category: "diet", isVeg: true, imageKey: "salad" },
  );

  addMany(
    e,
    [
      "Fresh Orange Juice",
      "Watermelon Juice",
      "Mixed Fruit Juice",
      "Pomegranate Juice",
      "Cold Press Green Juice",
      "Mango Lassi",
      "Sweet Lassi",
      "Salted Lassi",
      "Masala Chaas",
    ],
    { cuisine: "beverage", category: "juice", isVeg: true, imageKey: "juice" },
  );
  addMany(
    e,
    [
      "Virgin Mojito",
      "Blue Lagoon Mocktail",
      "Amigo Botanical Spritz",
      "Passion Fruit Cooler",
      "Mint Lemonade",
    ],
    { cuisine: "beverage", category: "mocktail", isVeg: true, imageKey: "mocktail" },
  );
  addMany(
    e,
    ["Classic Martini", "Whiskey Sour", "Margarita", "Old Fashioned", "Gin & Tonic"],
    { cuisine: "beverage", category: "cocktail", isVeg: true, imageKey: "cocktail" },
  );
  addMany(
    e,
    ["Filter Coffee", "Cappuccino", "Latte", "Espresso", "Masala Chai", "Ginger Tea"],
    { cuisine: "beverage", category: "hot_drink", isVeg: true, imageKey: "coffee" },
  );
  add(e, {
    name: "Masala Chai",
    cuisine: "beverage",
    category: "hot_drink",
    isVeg: true,
    imageKey: "chai",
  });
  add(e, {
    name: "Mango Lassi",
    cuisine: "beverage",
    category: "juice",
    isVeg: true,
    imageKey: "lassi",
  });

  addMany(
    e,
    [
      "Tom Yum Soup",
      "Manchow Soup",
      "Sweet Corn Soup",
      "Hot & Sour Soup",
      "Chicken Clear Soup",
    ],
    { cuisine: "pan_asian", category: "soup", isVeg: false, imageKey: "soup" },
  );

  addMany(
    e,
    [
      "Chocolate Brownie",
      "Gulab Jamun",
      "Rasmalai",
      "Kheer",
      "Mango Passion Tart",
      "Ice Cream Sundae",
      "Tiramisu",
    ],
    { cuisine: "dessert", category: "dessert", isVeg: true, imageKey: "dessert" },
  );
  add(e, {
    name: "Vanilla Ice Cream",
    cuisine: "dessert",
    category: "dessert",
    isVeg: true,
    imageKey: "iceCream",
  });

  addMany(
    e,
    ["Spaghetti Arrabiata", "Penne Alfredo", "Smoked Ricotta Ravioli", "Lasagna"],
    { cuisine: "continental", category: "pasta", isVeg: true, imageKey: "pasta" },
  );

  return e;
}

export function slugForCatalogEntry(name: string, isVeg: boolean) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return `${base}-${isVeg ? "veg" : "nonveg"}`;
}

export function searchTextForEntry(name: string, aliases: string[], cuisine: string, category: string) {
  return [name, ...aliases, cuisine, category].join(" ").toLowerCase();
}

export function imageUrlForKey(key: FoodImageKey) {
  return FOOD_CATALOG_IMAGES[key];
}
