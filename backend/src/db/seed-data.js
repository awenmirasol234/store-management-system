// Static demo data used by seed.js.

export const BASE_UNITS = [
  "Piece (pc)",
  "Pack",
  "Box",
  "Bottle",
  "Can",
  "Sachet",
  "Kilogram (kg)",
  "Gram (g)",
  "Liter (L)",
  "Milliliter (mL)",
  "Meter (m)",
  "Roll",
  "Dozen (doz)",
  "Pair",
  "Set",
  "Bundle",
  "Sack",
  "Case",
  "Carton",
  "Tray",
  "Gallon",
  "Pouch",
  "Tube",
  "Jar",
  "Bar",
  "Stick",
  "Ream",
  "Sheet"
];

export const PRODUCT_CATEGORIES = [
  "All",
  "Beverages",
  "Snacks",
  "Biscuits & Crackers",
  "Candies & Chocolates",
  "Canned Goods",
  "Instant Food",
  "Rice & Grains",
  "Condiments & Seasonings",
  "Cooking Essentials",
  "Bread & Bakery",
  "Frozen Goods",
  "Meat & Processed Foods",
  "Personal Care",
  "Laundry & Cleaning",
  "Household Supplies",
  "Kitchen Supplies",
  "Baby Products",
  "Health & Hygiene",
  "School & Office Supplies",
  "Cigarettes & Tobacco"
];

export const CATEGORIES = [
  {
    category_id: "cat_beverages",
    category_name: "Beverages",
    description: "Soda, bottled water, juices, and ready-to-drink beverages"
  },
  {
    category_id: "cat_snacks",
    category_name: "Snacks",
    description: "Chips, crackers, and savory snack packs"
  },
  {
    category_id: "cat_biscuits_crackers",
    category_name: "Biscuits & Crackers",
    description: "Biscuits, cookies, and everyday crackers"
  },
  {
    category_id: "cat_candies_chocolates",
    category_name: "Candies & Chocolates",
    description: "Candies, chewing gum, and chocolate treats"
  },
  {
    category_id: "cat_canned",
    category_name: "Canned Goods",
    description: "Canned fish, meat, and ready-to-eat meals"
  },
  {
    category_id: "cat_instant_food",
    category_name: "Instant Food",
    description: "Instant noodles, cup meals, and quick-cook food"
  },
  {
    category_id: "cat_rice_grains",
    category_name: "Rice & Grains",
    description: "Rice varieties, grains, oats, and breakfast cereals"
  },
  {
    category_id: "cat_condiments_seasonings",
    category_name: "Condiments & Seasonings",
    description: "Sauces, vinegar, seasoning mixes, and flavorings"
  },
  {
    category_id: "cat_cooking_essentials",
    category_name: "Cooking Essentials",
    description: "Cooking oil, sugar, salt, and pantry staples"
  },
  {
    category_id: "cat_bread_bakery",
    category_name: "Bread & Bakery",
    description: "Loaves, buns, pastries, and baked snacks"
  },
  {
    category_id: "cat_frozen_goods",
    category_name: "Frozen Goods",
    description: "Frozen desserts, ice pops, and ready-to-cook food"
  },
  {
    category_id: "cat_meat_processed_foods",
    category_name: "Meat & Processed Foods",
    description: "Hotdogs, sausages, bacon, and processed meats"
  },
  {
    category_id: "cat_personal_care",
    category_name: "Personal Care",
    description: "Bath soap, shampoo, deodorant, and personal care"
  },
  {
    category_id: "cat_laundry_cleaning",
    category_name: "Laundry & Cleaning",
    description: "Laundry detergent, conditioner, bleach, and cleaners"
  },
  {
    category_id: "cat_household_supplies",
    category_name: "Household Supplies",
    description: "Batteries, insect control, candles, and matches"
  },
  {
    category_id: "cat_kitchen_supplies",
    category_name: "Kitchen Supplies",
    description: "Dishwashing liquid, sponges, foil, and trash bags"
  },
  {
    category_id: "cat_baby_products",
    category_name: "Baby Products",
    description: "Diapers, wipes, formula, and infant care products"
  },
  {
    category_id: "cat_health_hygiene",
    category_name: "Health & Hygiene",
    description: "Toothpaste, toothbrushes, and daily hygiene supplies"
  },
  {
    category_id: "cat_school_office_supplies",
    category_name: "School & Office Supplies",
    description: "Paper, notebooks, pens, and basic office supplies"
  },
  {
    category_id: "cat_cigarettes_tobacco",
    category_name: "Cigarettes & Tobacco",
    description: "Cigarettes, tobacco products, and lighters"
  }
];

export const SUPPLIERS = [
  {
    supplier_id: "sup_monde",
    supplier_name: "North Metro Grocery Distribution",
    contact_person: "Andrea Mercado",
    phone: "0917-620-1842",
    address: "Caloocan City, Metro Manila"
  },
  {
    supplier_id: "sup_urc",
    supplier_name: "South Luzon Consumer Goods",
    contact_person: "Paolo Villanueva",
    phone: "0918-731-2965",
    address: "Muntinlupa City, Metro Manila"
  },
  {
    supplier_id: "sup_nestle",
    supplier_name: "Metro Beverage and Dairy Supply",
    contact_person: "Janelle Cruz",
    phone: "0920-845-3176",
    address: "Taguig City, Metro Manila"
  },
  {
    supplier_id: "sup_smb",
    supplier_name: "Capital Drinks Wholesale",
    contact_person: "Marco Bautista",
    phone: "0919-564-4287",
    address: "Mandaluyong City, Metro Manila"
  },
  {
    supplier_id: "sup_local_grains",
    supplier_name: "Bayanihan Rice and Pantry Supply",
    contact_person: "Danilo Ramos",
    phone: "0922-678-5398",
    address: "Meycauayan, Bulacan"
  },
  {
    supplier_id: "sup_pg_unilever",
    supplier_name: "Everyday Home Care Distribution",
    contact_person: "Carmina Reyes",
    phone: "0917-892-6410",
    address: "Valenzuela City, Metro Manila"
  }
];

export const PRODUCTS = [
  // Canned Goods (7)
  {
    id: "prod_01",
    category_id: "cat_canned",
    name: "Ligo Sardines in Tomato Sauce 155g",
    barcode: "4800016644011",
    unit: "piece",
    cost: "22.50",
    price: "29.00",
    stock: "52",
    reorder: "12",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_02",
    category_id: "cat_canned",
    name: "555 Tuna Caldereta 155g",
    barcode: "4800016644028",
    unit: "piece",
    cost: "31.00",
    price: "40.00",
    stock: "34",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_03",
    category_id: "cat_canned",
    name: "Highlands Corned Beef 175g",
    barcode: "4800016123456",
    unit: "piece",
    cost: "42.00",
    price: "52.00",
    stock: "27",
    reorder: "9",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_04",
    category_id: "cat_canned",
    name: "Mega Sardines Chili 155g",
    barcode: "4800016555012",
    unit: "piece",
    cost: "20.00",
    price: "27.00",
    stock: "68",
    reorder: "15",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_05",
    category_id: "cat_canned",
    name: "Fresca Tuna Afritada 180g",
    barcode: "4800016777014",
    unit: "piece",
    cost: "37.00",
    price: "46.00",
    stock: "22",
    reorder: "8",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_06",
    category_id: "cat_canned",
    name: "Purefoods Corned Beef 210g",
    barcode: "4800016888019",
    unit: "piece",
    cost: "82.00",
    price: "99.00",
    stock: "15",
    reorder: "5",
    supplier_id: "sup_smb"
  },
  {
    id: "prod_07",
    category_id: "cat_canned",
    name: "Holiday Meat Loaf 150g",
    barcode: "4800016999015",
    unit: "piece",
    cost: "23.00",
    price: "30.00",
    stock: "6", // Low stock alert
    reorder: "10",
    supplier_id: "sup_urc"
  },

  // Instant Food (7)
  {
    id: "prod_08",
    category_id: "cat_instant_food",
    name: "Lucky Me! Beef Noodles 70g",
    barcode: "4807770270014",
    unit: "piece",
    cost: "13.20",
    price: "17.00",
    stock: "92",
    reorder: "20",
    supplier_id: "sup_monde",
    options: [
      {
        name: "3-Pack Beef",
        barcode: "4807770270014-3PK",
        quantity: "3",
        price: "49.00"
      }
    ]
  },
  {
    id: "prod_09",
    category_id: "cat_instant_food",
    name: "Payless Xtra Big Original 120g",
    barcode: "4807770270021",
    unit: "piece",
    cost: "18.50",
    price: "24.00",
    stock: "66",
    reorder: "18",
    supplier_id: "sup_monde",
    options: [
      {
        name: "3-Pack Original",
        barcode: "4807770270021-3PK",
        quantity: "3",
        price: "68.00"
      }
    ]
  },
  {
    id: "prod_10",
    category_id: "cat_instant_food",
    name: "Nissin Yakisoba Original 60g",
    barcode: "4807770270038",
    unit: "piece",
    cost: "13.50",
    price: "18.00",
    stock: "78",
    reorder: "18",
    supplier_id: "sup_monde",
    options: [
      {
        name: "3-Pack Yakisoba",
        barcode: "4807770270038-3PK",
        quantity: "3",
        price: "51.00"
      }
    ]
  },
  {
    id: "prod_11",
    category_id: "cat_instant_food",
    name: "QuickChow Pancit Canton 80g",
    barcode: "4807770270045",
    unit: "piece",
    cost: "12.50",
    price: "16.00",
    stock: "58",
    reorder: "18",
    supplier_id: "sup_monde",
    options: [
      {
        name: "3-Pack QuickChow",
        barcode: "4807770270045-3PK",
        quantity: "3",
        price: "45.00"
      }
    ]
  },
  {
    id: "prod_12",
    category_id: "cat_instant_food",
    name: "Nissin Cup Noodles Beef 60g",
    barcode: "4807770270052",
    unit: "piece",
    cost: "24.00",
    price: "30.00",
    stock: "42",
    reorder: "12",
    supplier_id: "sup_monde"
  },
  {
    id: "prod_13",
    category_id: "cat_instant_food",
    name: "Nissin Cup Noodles Chicken 60g",
    barcode: "4807770270069",
    unit: "piece",
    cost: "24.00",
    price: "30.00",
    stock: "37",
    reorder: "12",
    supplier_id: "sup_monde"
  },
  {
    id: "prod_14",
    category_id: "cat_instant_food",
    name: "Lucky Me! Batchoy Noodles 55g",
    barcode: "4807770270076",
    unit: "piece",
    cost: "16.00",
    price: "21.00",
    stock: "0", // Out of stock test
    reorder: "15",
    supplier_id: "sup_urc"
  },

  // Beverages & Drinks (7)
  {
    id: "prod_15",
    category_id: "cat_beverages",
    name: "Pepsi 1.5L PET",
    barcode: "4800088110012",
    unit: "bottle",
    cost: "59.00",
    price: "72.00",
    stock: "27",
    reorder: "8",
    supplier_id: "sup_smb"
  },
  {
    id: "prod_16",
    category_id: "cat_beverages",
    name: "Mountain Dew 1.5L PET",
    barcode: "4800088110029",
    unit: "bottle",
    cost: "59.00",
    price: "72.00",
    stock: "19",
    reorder: "8",
    supplier_id: "sup_smb"
  },
  {
    id: "prod_17",
    category_id: "cat_beverages",
    name: "7UP 1.5L PET",
    barcode: "4800088110036",
    unit: "bottle",
    cost: "59.00",
    price: "72.00",
    stock: "21",
    reorder: "8",
    supplier_id: "sup_smb"
  },
  {
    id: "prod_18",
    category_id: "cat_beverages",
    name: "Sting Energy Drink 330ml Can",
    barcode: "4800016223344",
    unit: "bottle",
    cost: "22.00",
    price: "28.00",
    stock: "36",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_19",
    category_id: "cat_beverages",
    name: "San Miguel Flavored Beer 330ml Can",
    barcode: "4800016334455",
    unit: "can",
    cost: "46.00",
    price: "58.00",
    stock: "44",
    reorder: "12",
    supplier_id: "sup_smb",
    options: [
      {
        name: "6-Can Pack",
        barcode: "4800016334455-6PK",
        quantity: "6",
        price: "325.00"
      }
    ]
  },
  {
    id: "prod_20",
    category_id: "cat_beverages",
    name: "Red Horse Beer 500ml Bottle",
    barcode: "4800016445566",
    unit: "bottle",
    cost: "55.00",
    price: "69.00",
    stock: "26",
    reorder: "12",
    supplier_id: "sup_smb"
  },
  {
    id: "prod_21",
    category_id: "cat_beverages",
    name: "Wilkins Distilled Water 500ml",
    barcode: "4800016556677",
    unit: "bottle",
    cost: "11.00",
    price: "16.00",
    stock: "72",
    reorder: "15",
    supplier_id: "sup_smb"
  },

  // Beverages (including coffee and powdered drinks)
  {
    id: "prod_22",
    category_id: "cat_beverages",
    name: "Nescafé Original Sachet 2g",
    barcode: "4800361234011",
    unit: "sachet",
    cost: "3.00",
    price: "5.00",
    stock: "165",
    reorder: "30",
    supplier_id: "sup_nestle",
    options: [
      {
        name: "Strip of 10",
        barcode: "4800361234011-STRIP",
        quantity: "10",
        price: "45.00"
      }
    ]
  },
  {
    id: "prod_23",
    category_id: "cat_beverages",
    name: "Great Taste Choco Twin Pack 50g",
    barcode: "4800016333018",
    unit: "pack",
    cost: "12.00",
    price: "16.00",
    stock: "88",
    reorder: "20",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_24",
    category_id: "cat_beverages",
    name: "Kopiko Brown Coffee 30g",
    barcode: "4800016444014",
    unit: "pack",
    cost: "10.00",
    price: "14.00",
    stock: "82",
    reorder: "20",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_25",
    category_id: "cat_beverages",
    name: "Alaska Fortified Milk 33g",
    barcode: "4800361555018",
    unit: "sachet",
    cost: "13.00",
    price: "17.00",
    stock: "96",
    reorder: "20",
    supplier_id: "sup_nestle"
  },
  {
    id: "prod_26",
    category_id: "cat_beverages",
    name: "Milo Chocolate Powdered Drink 24g",
    barcode: "4800361666014",
    unit: "sachet",
    cost: "9.50",
    price: "13.00",
    stock: "125",
    reorder: "25",
    supplier_id: "sup_nestle",
    options: [
      {
        name: "Bundle of 5",
        barcode: "4800361666014-5PK",
        quantity: "5",
        price: "60.00"
      }
    ]
  },
  {
    id: "prod_27",
    category_id: "cat_beverages",
    name: "Energen Vanilla Cereal 40g",
    barcode: "4800016778899",
    unit: "sachet",
    cost: "8.50",
    price: "11.00",
    stock: "7", // Low stock alert
    reorder: "15",
    supplier_id: "sup_urc"
  },

  // Biscuits & Snacks (6)
  {
    id: "prod_28",
    category_id: "cat_biscuits_crackers",
    name: "SkyFlakes Crackers Single Pack 25g",
    barcode: "4800016111019",
    unit: "piece",
    cost: "5.50",
    price: "8.00",
    stock: "135",
    reorder: "25",
    supplier_id: "sup_monde",
    options: [
      {
        name: "10-Pack Bundle",
        barcode: "4800016111019-10PK",
        quantity: "10",
        price: "75.00"
      }
    ]
  },
  {
    id: "prod_29",
    category_id: "cat_biscuits_crackers",
    name: "Fita Biscuits Single Pack 30g",
    barcode: "4800016111026",
    unit: "piece",
    cost: "6.50",
    price: "9.00",
    stock: "67",
    reorder: "15",
    supplier_id: "sup_monde"
  },
  {
    id: "prod_30",
    category_id: "cat_snacks",
    name: "Rebisco Crackers 32g",
    barcode: "4800016111033",
    unit: "piece",
    cost: "7.00",
    price: "10.00",
    stock: "76",
    reorder: "15",
    supplier_id: "sup_monde"
  },
  {
    id: "prod_31",
    category_id: "cat_snacks",
    name: "Piattos Sour Cream Potato Crisps 85g",
    barcode: "4800016222013",
    unit: "pack",
    cost: "31.00",
    price: "40.00",
    stock: "31",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_32",
    category_id: "cat_snacks",
    name: "Nova Barbecue Multigrain 78g",
    barcode: "4800016222020",
    unit: "pack",
    cost: "31.00",
    price: "40.00",
    stock: "22",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_33",
    category_id: "cat_snacks",
    name: "Oishi Fish Crackers 60g",
    barcode: "4800016333025",
    unit: "pack",
    cost: "17.00",
    price: "23.00",
    stock: "39",
    reorder: "10",
    supplier_id: "sup_urc"
  },

  // Rice, Cooking Oil & Condiments (6)
  {
    id: "prod_34",
    category_id: "cat_rice_grains",
    name: "Jasponica Premium Rice",
    barcode: "4800016900011",
    unit: "kg",
    cost: "48.00",
    price: "60.00",
    stock: "118",
    reorder: "30",
    supplier_id: "sup_local_grains",
    options: [
      {
        name: "5kg Bag",
        barcode: "4800016900011-5KG",
        quantity: "5",
        price: "295.00"
      },
      {
        name: "25kg Sack",
        barcode: "4800016900011-25KG",
        quantity: "25",
        price: "1450.00"
      }
    ]
  },
  {
    id: "prod_35",
    category_id: "cat_rice_grains",
    name: "Dinorado Well-Milled Rice",
    barcode: "4800016900028",
    unit: "kg",
    cost: "42.00",
    price: "53.00",
    stock: "142",
    reorder: "30",
    supplier_id: "sup_local_grains",
    options: [
      {
        name: "5kg Bag",
        barcode: "4800016900028-5KG",
        quantity: "5",
        price: "260.00"
      },
      {
        name: "25kg Sack",
        barcode: "4800016900028-25KG",
        quantity: "25",
        price: "1275.00"
      }
    ]
  },
  {
    id: "prod_36",
    category_id: "cat_condiments_seasonings",
    name: "Silver Swan Soy Sauce 385ml Bottle",
    barcode: "4800016911017",
    unit: "bottle",
    cost: "19.00",
    price: "26.00",
    stock: "34",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_37",
    category_id: "cat_condiments_seasonings",
    name: "Datu Puti Cane Vinegar 385ml Bottle",
    barcode: "4800016911024",
    unit: "bottle",
    cost: "18.00",
    price: "24.00",
    stock: "31",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_38",
    category_id: "cat_condiments_seasonings",
    name: "UFC Sweet Chili Banana Ketchup 320g",
    barcode: "4800016911031",
    unit: "bottle",
    cost: "23.00",
    price: "30.00",
    stock: "25",
    reorder: "8",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_39",
    category_id: "cat_cooking_essentials",
    name: "Baguio Cooking Oil 1L Bottle",
    barcode: "4800016911048",
    unit: "bottle",
    cost: "80.00",
    price: "99.00",
    stock: "16",
    reorder: "8",
    supplier_id: "sup_local_grains"
  },
  {
    id: "prod_40",
    category_id: "cat_condiments_seasonings",
    name: "Maggi Magic Sarap Seasoning 8g",
    barcode: "4800361999011",
    unit: "sachet",
    cost: "4.50",
    price: "7.00",
    stock: "155",
    reorder: "30",
    supplier_id: "sup_nestle",
    options: [
      {
        name: "Strip of 12",
        barcode: "4800361999011-STRIP",
        quantity: "12",
        price: "75.00"
      }
    ]
  },

  // Personal Care & Toiletries (6)
  {
    id: "prod_41",
    category_id: "cat_personal_care",
    name: "Bioderm Fresh Soap 90g",
    barcode: "4800016800013",
    unit: "piece",
    cost: "35.00",
    price: "45.00",
    stock: "44",
    reorder: "10",
    supplier_id: "sup_pg_unilever"
  },
  {
    id: "prod_42",
    category_id: "cat_personal_care",
    name: "Cream Silk Daily Treatment 12ml",
    barcode: "4800016800020",
    unit: "sachet",
    cost: "6.50",
    price: "9.00",
    stock: "100",
    reorder: "20",
    supplier_id: "sup_pg_unilever",
    options: [
      {
        name: "Strip of 6",
        barcode: "4800016800020-6PK",
        quantity: "6",
        price: "50.00"
      }
    ]
  },
  {
    id: "prod_43",
    category_id: "cat_personal_care",
    name: "Clear Cool Sport Shampoo 12ml",
    barcode: "4800016800037",
    unit: "sachet",
    cost: "7.00",
    price: "10.00",
    stock: "84",
    reorder: "20",
    supplier_id: "sup_pg_unilever"
  },
  {
    id: "prod_44",
    category_id: "cat_health_hygiene",
    name: "Hapee Fresh Mint Toothpaste 50ml",
    barcode: "4800016800044",
    unit: "tube",
    cost: "32.00",
    price: "42.00",
    stock: "23",
    reorder: "5",
    supplier_id: "sup_pg_unilever"
  },
  {
    id: "prod_45",
    category_id: "cat_personal_care",
    name: "Cream Silk Conditioner 12ml",
    barcode: "4800016800051",
    unit: "sachet",
    cost: "6.50",
    price: "9.00",
    stock: "0", // Out of stock test
    reorder: "20",
    supplier_id: "sup_pg_unilever"
  },
  {
    id: "prod_46",
    category_id: "cat_personal_care",
    name: "Nivea Men Deodorant Roll-On 25ml",
    barcode: "4800016800068",
    unit: "piece",
    cost: "70.00",
    price: "89.00",
    stock: "3", // Low stock alert
    reorder: "5",
    supplier_id: "sup_pg_unilever"
  },

  // Laundry & Household Cleaning (4)
  {
    id: "prod_47",
    category_id: "cat_laundry_cleaning",
    name: "Surf Lavender Detergent Powder 65g",
    barcode: "4800016700016",
    unit: "sachet",
    cost: "10.00",
    price: "14.00",
    stock: "118",
    reorder: "25",
    supplier_id: "sup_pg_unilever",
    options: [
      {
        name: "Strip of 6",
        barcode: "4800016700016-6PK",
        quantity: "6",
        price: "78.00"
      }
    ]
  },
  {
    id: "prod_48",
    category_id: "cat_laundry_cleaning",
    name: "Tide Clean Breeze Detergent Powder 66g",
    barcode: "4800016700023",
    unit: "sachet",
    cost: "11.50",
    price: "15.00",
    stock: "91",
    reorder: "20",
    supplier_id: "sup_pg_unilever"
  },
  {
    id: "prod_49",
    category_id: "cat_laundry_cleaning",
    name: "Downy Sunrise Fresh Conditioner 20ml",
    barcode: "4800016700030",
    unit: "sachet",
    cost: "7.20",
    price: "10.00",
    stock: "105",
    reorder: "20",
    supplier_id: "sup_pg_unilever",
    options: [
      {
        name: "Strip of 6",
        barcode: "4800016700030-6PK",
        quantity: "6",
        price: "55.00"
      }
    ]
  },
  {
    id: "prod_50",
    category_id: "cat_kitchen_supplies",
    name: "Smart Dishwashing Liquid Lemon 200ml",
    barcode: "4800016700047",
    unit: "bottle",
    cost: "29.00",
    price: "39.00",
    stock: "29",
    reorder: "8",
    supplier_id: "sup_pg_unilever"
  }
];

export function getMockProductImageUrl(item) {
  if (item.image_url) {
    return item.image_url;
  }
  const name = item.name.toLowerCase();
  const categoryId = item.category_id;

  if (categoryId === "cat_canned") {
    if (name.includes("tuna")) {
      return "https://images.unsplash.com/photo-1544943910-4c1dc44a0b27?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("beef") || name.includes("meat")) {
      return "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("sardine") || name.includes("mackerel")) {
      return "https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("sausage") || name.includes("vienna")) {
      return "https://images.unsplash.com/photo-1597692493666-bf10d32f918e?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("spam") || name.includes("luncheon")) {
      return "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=400&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1584727638096-042c45049ebe?w=400&auto=format&fit=crop&q=80";
  }

  if (categoryId === "cat_noodles" || categoryId === "cat_instant_food") {
    if (name.includes("pancit") || name.includes("canton")) {
      return "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("spaghetti") || name.includes("pasta") || name.includes("macaroni")) {
      return "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("spicy") || name.includes("chili")) {
      return "https://images.unsplash.com/photo-1552611052-33e04de081de?w=400&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&auto=format&fit=crop&q=80";
  }

  if (categoryId === "cat_beverages") {
    if (name.includes("coca-cola") || name.includes("coke")) {
      return "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("royal") || name.includes("orange")) {
      return "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("sprite") || name.includes("lemon")) {
      return "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("water") || name.includes("nature") || name.includes("wilkins")) {
      return "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("beer") || name.includes("san miguel") || name.includes("red horse")) {
      return "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("juice") || name.includes("c2") || name.includes("tea")) {
      return "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&auto=format&fit=crop&q=80";
  }

  if (categoryId === "cat_coffee_milk" || categoryId === "cat_dairy_breakfast") {
    if (name.includes("milo") || name.includes("choco") || name.includes("ovaltine")) {
      return "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("milk") || name.includes("bear brand")) {
      return "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("black")) {
      return "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("blanca") || name.includes("white")) {
      return "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80";
  }

  if (categoryId === "cat_snacks" || categoryId === "cat_biscuits_crackers") {
    if (
      name.includes("skyflakes") ||
      name.includes("fita") ||
      name.includes("rebisco") ||
      name.includes("cracker")
    ) {
      return "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop&q=80";
    }
    if (
      name.includes("piattos") ||
      name.includes("chips") ||
      name.includes("crisps") ||
      name.includes("nova")
    ) {
      return "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("chippy") || name.includes("corn")) {
      return "https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("prawn") || name.includes("oishi")) {
      return "https://images.unsplash.com/photo-1621447504864-d8686e12698c?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("nut") || name.includes("peanut") || name.includes("ding dong")) {
      return "https://images.unsplash.com/photo-1569429593410-b498b3fb3387?w=400&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80";
  }

  if (
    categoryId === "cat_rice_cooking" ||
    categoryId === "cat_rice_grains" ||
    categoryId === "cat_cooking_essentials" ||
    categoryId === "cat_condiments_seasonings"
  ) {
    if (name.includes("rice")) {
      return "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("oil")) {
      return "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("soy sauce")) {
      return "https://images.unsplash.com/photo-1589135233689-d562f4b46c9a?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("vinegar")) {
      return "https://images.unsplash.com/photo-1622205313162-be1d5712a43c?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("sarap") || name.includes("seasoning") || name.includes("mix")) {
      return "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("sugar") || name.includes("salt")) {
      return "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1589135233689-d562f4b46c9a?w=400&auto=format&fit=crop&q=80";
  }

  if (categoryId === "cat_personal_care" || categoryId === "cat_health_hygiene") {
    if (name.includes("soap") || name.includes("safeguard")) {
      return "https://images.unsplash.com/photo-1607006314640-1a6c0c2bc42c?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("shampoo") || name.includes("conditioner")) {
      return "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("toothpaste") || name.includes("colgate") || name.includes("close-up")) {
      return "https://images.unsplash.com/photo-1559591937-e1032b49298e?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("deodorant") || name.includes("rexona")) {
      return "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80";
  }

  if (
    categoryId === "cat_laundry_home" ||
    categoryId === "cat_laundry_cleaning" ||
    categoryId === "cat_kitchen_supplies"
  ) {
    if (
      name.includes("powder") ||
      name.includes("detergent") ||
      name.includes("surf") ||
      name.includes("tide") ||
      name.includes("ariel")
    ) {
      return "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("downy") || name.includes("fabric")) {
      return "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("joy") || name.includes("dishwashing")) {
      return "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&auto=format&fit=crop&q=80";
    }
    if (name.includes("zonrox") || name.includes("bleach")) {
      return "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&auto=format&fit=crop&q=80";
    }
    return "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=80";
  }

  return "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80";
}

export const SAMPLE_SALES = [
  // Today's sales
  {
    items: [
      { id: "prod_08", qty: 2, price: 1700, cost: 1320 }, // Lucky Me Beef noodles
      { id: "prod_22", qty: 4, price: 500, cost: 300 }    // Nescafe Original
    ],
    cashPaid: 7000,
    hoursAgo: 1
  },
  {
    items: [
      { id: "prod_15", qty: 1, price: 7200, cost: 5900 }, // Pepsi 1.5L
      { id: "prod_31", qty: 1, price: 4000, cost: 3100 }  // Piattos
    ],
    cashPaid: 15000,
    hoursAgo: 2
  },
  {
    items: [
      { id: "prod_34", qty: 2, price: 6000, cost: 4800 }, // Jasponica rice
      { id: "prod_36", qty: 1, price: 2600, cost: 1900 }, // Silver Swan
      { id: "prod_40", qty: 3, price: 700, cost: 450 }    // Magic Sarap
    ],
    cashPaid: 20000,
    hoursAgo: 3
  },
  {
    items: [
      { id: "prod_01", qty: 3, price: 2900, cost: 2250 }, // Ligo sardines
      { id: "prod_28", qty: 5, price: 800, cost: 550 }    // SkyFlakes
    ],
    cashPaid: 15000,
    hoursAgo: 4
  },
  {
    items: [
      { id: "prod_41", qty: 1, price: 4500, cost: 3500 }, // Bioderm soap
      { id: "prod_42", qty: 2, price: 900, cost: 650 },   // Cream Silk sachet
      { id: "prod_47", qty: 2, price: 1400, cost: 1000 }   // Surf sachet
    ],
    cashPaid: 12000,
    hoursAgo: 5
  },
  {
    items: [
      { id: "prod_19", qty: 2, price: 5800, cost: 4600 }, // San Miguel flavored beer
      { id: "prod_33", qty: 2, price: 2300, cost: 1700 }  // Oishi fish crackers
    ],
    cashPaid: 20000,
    hoursAgo: 6
  },
  // Yesterday's sales
  {
    items: [
      { id: "prod_03", qty: 1, price: 5200, cost: 4200 }, // Highlands corned beef
      { id: "prod_35", qty: 2, price: 5300, cost: 4200 }  // Dinorado rice
    ],
    cashPaid: 20000,
    hoursAgo: 26
  },
  {
    items: [
      { id: "prod_25", qty: 2, price: 1700, cost: 1300 }, // Alaska milk
      { id: "prod_23", qty: 2, price: 1600, cost: 1200 }  // Great Taste Choco
    ],
    cashPaid: 10000,
    hoursAgo: 28
  },
  {
    items: [
      { id: "prod_10", qty: 3, price: 1800, cost: 1350 }, // Nissin Yakisoba
      { id: "prod_04", qty: 2, price: 2700, cost: 2000 }  // Mega sardines
    ],
    cashPaid: 15000,
    hoursAgo: 30
  },
  {
    items: [
      { id: "prod_39", qty: 1, price: 9900, cost: 8000 }, // Baguio cooking oil
      { id: "prod_37", qty: 1, price: 2400, cost: 1800 }  // Datu Puti vinegar
    ],
    cashPaid: 15000,
    hoursAgo: 32
  },
  {
    items: [
      { id: "prod_20", qty: 2, price: 6900, cost: 5500 }, // Red Horse
      { id: "prod_32", qty: 1, price: 4000, cost: 3100 }  // Nova
    ],
    cashPaid: 20000,
    hoursAgo: 34
  },
  {
    items: [
      { id: "prod_50", qty: 1, price: 3900, cost: 2900 }, // Smart dishwashing
      { id: "prod_49", qty: 3, price: 1000, cost: 720 }    // Downy sachet
    ],
    cashPaid: 10000,
    hoursAgo: 36
  }
];
