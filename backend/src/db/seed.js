import path from "node:path";
import { openSqliteDatabase } from "./sqlite.js";
import { toMoneyInt, toQuantityInt } from "../shared/decimal.js";
import { createDefaultIdGenerator, createSystemClock } from "../shared/ports.js";
import { formatReceiptNumber } from "../sales/domain.js";

const CATEGORIES = [
  {
    category_id: "cat_canned",
    category_name: "Canned Goods",
    description: "Canned meat, fish, and instant meals"
  },
  {
    category_id: "cat_noodles",
    category_name: "Instant Noodles & Pasta",
    description: "Pancit canton, ramen, mami, and pasta"
  },
  {
    category_id: "cat_beverages",
    category_name: "Beverages & Drinks",
    description: "Soft drinks, bottled water, juices, and beer"
  },
  {
    category_id: "cat_coffee_milk",
    category_name: "Coffee, Milk & Breakfast",
    description: "3-in-1 coffee, powdered milk, chocolate drink, cereal"
  },
  {
    category_id: "cat_snacks",
    category_name: "Snacks & Biscuits",
    description: "Crackers, chips, cookies, and nuts"
  },
  {
    category_id: "cat_rice_cooking",
    category_name: "Rice, Oil & Condiments",
    description: "Grains, soy sauce, vinegar, cooking oil, seasonings"
  },
  {
    category_id: "cat_personal_care",
    category_name: "Personal Care & Toiletries",
    description: "Bath soap, shampoo sachets, toothpaste, deodorant"
  },
  {
    category_id: "cat_laundry_home",
    category_name: "Laundry & Household",
    description: "Detergent powder, fabric conditioner, dishwashing soap"
  }
];

const SUPPLIERS = [
  {
    supplier_id: "sup_monde",
    supplier_name: "Monde Nissin Sales Corp",
    contact_person: "Eduardo Santos",
    phone: "0917-555-0101",
    address: "Balintawak, Quezon City"
  },
  {
    supplier_id: "sup_urc",
    supplier_name: "Universal Robina Corporation",
    contact_person: "Maria Theresa Lim",
    phone: "0918-555-0202",
    address: "Pasig City, Metro Manila"
  },
  {
    supplier_id: "sup_nestle",
    supplier_name: "Nestlé Philippines Direct",
    contact_person: "Roberto Cruz",
    phone: "0920-555-0303",
    address: "Makati City, Metro Manila"
  },
  {
    supplier_id: "sup_smb",
    supplier_name: "San Miguel Beverages Inc",
    contact_person: "Arman Bautista",
    phone: "0919-555-0404",
    address: "Mandaluyong City, Metro Manila"
  },
  {
    supplier_id: "sup_local_grains",
    supplier_name: "Central Luzon Grain Wholesalers",
    contact_person: "Mang Danilo Ramos",
    phone: "0922-555-0505",
    address: "Bocaue, Bulacan"
  },
  {
    supplier_id: "sup_pg_unilever",
    supplier_name: "P&G and Unilever Local Distributor",
    contact_person: "Carmina Villanueva",
    phone: "0917-555-0606",
    address: "Valenzuela City"
  }
];

const PRODUCTS = [
  // Canned Goods (7)
  {
    id: "prod_01",
    category_id: "cat_canned",
    name: "Century Tuna Flakes in Oil 180g",
    barcode: "4800016644011",
    unit: "piece",
    cost: "34.00",
    price: "42.00",
    stock: "45",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_02",
    category_id: "cat_canned",
    name: "Century Tuna Hot & Spicy 180g",
    barcode: "4800016644028",
    unit: "piece",
    cost: "34.00",
    price: "42.00",
    stock: "38",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_03",
    category_id: "cat_canned",
    name: "Argentina Corned Beef 175g",
    barcode: "4800016123456",
    unit: "piece",
    cost: "39.00",
    price: "48.00",
    stock: "30",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_04",
    category_id: "cat_canned",
    name: "555 Sardines in Tomato Sauce 155g",
    barcode: "4800016555012",
    unit: "piece",
    cost: "19.50",
    price: "25.00",
    stock: "60",
    reorder: "15",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_05",
    category_id: "cat_canned",
    name: "San Marino Corned Tuna 180g",
    barcode: "4800016777014",
    unit: "piece",
    cost: "36.00",
    price: "45.00",
    stock: "25",
    reorder: "8",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_06",
    category_id: "cat_canned",
    name: "Purefoods Corned Beef 210g",
    barcode: "4800016888019",
    unit: "piece",
    cost: "78.00",
    price: "95.00",
    stock: "12",
    reorder: "5",
    supplier_id: "sup_smb"
  },
  {
    id: "prod_07",
    category_id: "cat_canned",
    name: "CDO Meat Loaf 150g",
    barcode: "4800016999015",
    unit: "piece",
    cost: "21.50",
    price: "28.00",
    stock: "3", // Low stock alert
    reorder: "10",
    supplier_id: "sup_urc"
  },

  // Instant Noodles & Pasta (7)
  {
    id: "prod_08",
    category_id: "cat_noodles",
    name: "Lucky Me! Pancit Canton Kalamansi 80g",
    barcode: "4807770270014",
    unit: "piece",
    cost: "12.80",
    price: "16.00",
    stock: "85",
    reorder: "20",
    supplier_id: "sup_monde",
    options: [
      {
        name: "3-Pack Kalamansi",
        barcode: "4807770270014-3PK",
        quantity: "3",
        price: "46.00"
      }
    ]
  },
  {
    id: "prod_09",
    category_id: "cat_noodles",
    name: "Lucky Me! Pancit Canton Original 80g",
    barcode: "4807770270021",
    unit: "piece",
    cost: "12.80",
    price: "16.00",
    stock: "70",
    reorder: "20",
    supplier_id: "sup_monde",
    options: [
      {
        name: "3-Pack Original",
        barcode: "4807770270021-3PK",
        quantity: "3",
        price: "46.00"
      }
    ]
  },
  {
    id: "prod_10",
    category_id: "cat_noodles",
    name: "Lucky Me! Pancit Canton Chili Mansi 80g",
    barcode: "4807770270038",
    unit: "piece",
    cost: "12.80",
    price: "16.00",
    stock: "90",
    reorder: "20",
    supplier_id: "sup_monde",
    options: [
      {
        name: "3-Pack Chili Mansi",
        barcode: "4807770270038-3PK",
        quantity: "3",
        price: "46.00"
      }
    ]
  },
  {
    id: "prod_11",
    category_id: "cat_noodles",
    name: "Lucky Me! Pancit Canton Sweet & Spicy 80g",
    barcode: "4807770270045",
    unit: "piece",
    cost: "12.80",
    price: "16.00",
    stock: "65",
    reorder: "20",
    supplier_id: "sup_monde",
    options: [
      {
        name: "3-Pack Sweet & Spicy",
        barcode: "4807770270045-3PK",
        quantity: "3",
        price: "46.00"
      }
    ]
  },
  {
    id: "prod_12",
    category_id: "cat_noodles",
    name: "Lucky Me! Supreme Instant Mami Beef 65g",
    barcode: "4807770270052",
    unit: "piece",
    cost: "11.50",
    price: "15.00",
    stock: "40",
    reorder: "15",
    supplier_id: "sup_monde"
  },
  {
    id: "prod_13",
    category_id: "cat_noodles",
    name: "Lucky Me! Supreme Instant Mami Chicken 65g",
    barcode: "4807770270069",
    unit: "piece",
    cost: "11.50",
    price: "15.00",
    stock: "35",
    reorder: "15",
    supplier_id: "sup_monde"
  },
  {
    id: "prod_14",
    category_id: "cat_noodles",
    name: "Payless Xtra Big Pancit Canton Sweet Spicy 130g",
    barcode: "4807770270076",
    unit: "piece",
    cost: "17.50",
    price: "22.00",
    stock: "0", // Out of stock test
    reorder: "15",
    supplier_id: "sup_urc"
  },

  // Beverages & Drinks (7)
  {
    id: "prod_15",
    category_id: "cat_beverages",
    name: "Coca-Cola 1.5L PET",
    barcode: "4800088110012",
    unit: "bottle",
    cost: "62.00",
    price: "75.00",
    stock: "24",
    reorder: "8",
    supplier_id: "sup_smb"
  },
  {
    id: "prod_16",
    category_id: "cat_beverages",
    name: "Royal Tru-Orange 1.5L PET",
    barcode: "4800088110029",
    unit: "bottle",
    cost: "62.00",
    price: "75.00",
    stock: "18",
    reorder: "8",
    supplier_id: "sup_smb"
  },
  {
    id: "prod_17",
    category_id: "cat_beverages",
    name: "Sprite 1.5L PET",
    barcode: "4800088110036",
    unit: "bottle",
    cost: "62.00",
    price: "75.00",
    stock: "16",
    reorder: "8",
    supplier_id: "sup_smb"
  },
  {
    id: "prod_18",
    category_id: "cat_beverages",
    name: "C2 Cool & Clean Green Tea Apple 500ml",
    barcode: "4800016223344",
    unit: "bottle",
    cost: "19.50",
    price: "25.00",
    stock: "32",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_19",
    category_id: "cat_beverages",
    name: "San Miguel Pale Pilsen 330ml Can",
    barcode: "4800016334455",
    unit: "can",
    cost: "44.00",
    price: "55.00",
    stock: "48",
    reorder: "12",
    supplier_id: "sup_smb",
    options: [
      {
        name: "6-Can Pack",
        barcode: "4800016334455-6PK",
        quantity: "6",
        price: "310.00"
      }
    ]
  },
  {
    id: "prod_20",
    category_id: "cat_beverages",
    name: "Red Horse Beer 500ml Bottle",
    barcode: "4800016445566",
    unit: "bottle",
    cost: "52.00",
    price: "65.00",
    stock: "30",
    reorder: "12",
    supplier_id: "sup_smb"
  },
  {
    id: "prod_21",
    category_id: "cat_beverages",
    name: "Nature's Spring Purified Water 500ml",
    barcode: "4800016556677",
    unit: "bottle",
    cost: "10.50",
    price: "15.00",
    stock: "60",
    reorder: "15",
    supplier_id: "sup_smb"
  },

  // Coffee, Milk & Breakfast (6)
  {
    id: "prod_22",
    category_id: "cat_coffee_milk",
    name: "Nescafé Classic Sachet 2g",
    barcode: "4800361234011",
    unit: "sachet",
    cost: "2.80",
    price: "4.00",
    stock: "150",
    reorder: "30",
    supplier_id: "sup_nestle",
    options: [
      {
        name: "Strip of 10",
        barcode: "4800361234011-STRIP",
        quantity: "10",
        price: "38.00"
      }
    ]
  },
  {
    id: "prod_23",
    category_id: "cat_coffee_milk",
    name: "Great Taste White Twin Pack 50g",
    barcode: "4800016333018",
    unit: "pack",
    cost: "11.20",
    price: "14.00",
    stock: "80",
    reorder: "20",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_24",
    category_id: "cat_coffee_milk",
    name: "Kopiko Blanca Twin Pack 52g",
    barcode: "4800016444014",
    unit: "pack",
    cost: "11.20",
    price: "14.00",
    stock: "75",
    reorder: "20",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_25",
    category_id: "cat_coffee_milk",
    name: "Bear Brand Fortified Powdered Milk 33g",
    barcode: "4800361555018",
    unit: "sachet",
    cost: "12.50",
    price: "16.00",
    stock: "90",
    reorder: "20",
    supplier_id: "sup_nestle"
  },
  {
    id: "prod_26",
    category_id: "cat_coffee_milk",
    name: "Milo Chocolate Powdered Drink 24g",
    barcode: "4800361666014",
    unit: "sachet",
    cost: "9.20",
    price: "12.00",
    stock: "110",
    reorder: "25",
    supplier_id: "sup_nestle",
    options: [
      {
        name: "Bundle of 5",
        barcode: "4800361666014-5PK",
        quantity: "5",
        price: "55.00"
      }
    ]
  },
  {
    id: "prod_27",
    category_id: "cat_coffee_milk",
    name: "Energen Champion Chocolate Cereal 40g",
    barcode: "4800016778899",
    unit: "sachet",
    cost: "7.80",
    price: "10.00",
    stock: "4", // Low stock alert
    reorder: "15",
    supplier_id: "sup_urc"
  },

  // Snacks & Biscuits (6)
  {
    id: "prod_28",
    category_id: "cat_snacks",
    name: "SkyFlakes Crackers Single Pack 25g",
    barcode: "4800016111019",
    unit: "piece",
    cost: "5.20",
    price: "7.00",
    stock: "120",
    reorder: "25",
    supplier_id: "sup_monde",
    options: [
      {
        name: "10-Pack Bundle",
        barcode: "4800016111019-10PK",
        quantity: "10",
        price: "65.00"
      }
    ]
  },
  {
    id: "prod_29",
    category_id: "cat_snacks",
    name: "Fita Biscuits Single Pack 30g",
    barcode: "4800016111026",
    unit: "piece",
    cost: "6.10",
    price: "8.00",
    stock: "60",
    reorder: "15",
    supplier_id: "sup_monde"
  },
  {
    id: "prod_30",
    category_id: "cat_snacks",
    name: "Rebisco Sandwich Choco 32g",
    barcode: "4800016111033",
    unit: "piece",
    cost: "6.80",
    price: "9.00",
    stock: "70",
    reorder: "15",
    supplier_id: "sup_monde"
  },
  {
    id: "prod_31",
    category_id: "cat_snacks",
    name: "Piattos Cheese Potato Crisps 85g",
    barcode: "4800016222013",
    unit: "pack",
    cost: "30.00",
    price: "38.00",
    stock: "28",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_32",
    category_id: "cat_snacks",
    name: "Nova Multigrain Country Cheddar 78g",
    barcode: "4800016222020",
    unit: "pack",
    cost: "30.00",
    price: "38.00",
    stock: "25",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_33",
    category_id: "cat_snacks",
    name: "Oishi Prawn Crackers Plain 60g",
    barcode: "4800016333025",
    unit: "pack",
    cost: "16.50",
    price: "22.00",
    stock: "35",
    reorder: "10",
    supplier_id: "sup_urc"
  },

  // Rice, Cooking Oil & Condiments (6)
  {
    id: "prod_34",
    category_id: "cat_rice_cooking",
    name: "Dinorado Special Fragrant Rice",
    barcode: "4800016900011",
    unit: "kg",
    cost: "46.00",
    price: "58.00",
    stock: "125",
    reorder: "30",
    supplier_id: "sup_local_grains",
    options: [
      {
        name: "5kg Bag",
        barcode: "4800016900011-5KG",
        quantity: "5",
        price: "285.00"
      },
      {
        name: "25kg Sack",
        barcode: "4800016900011-25KG",
        quantity: "25",
        price: "1400.00"
      }
    ]
  },
  {
    id: "prod_35",
    category_id: "cat_rice_cooking",
    name: "Sinandomeng Well-Milled Rice",
    barcode: "4800016900028",
    unit: "kg",
    cost: "38.00",
    price: "48.00",
    stock: "150",
    reorder: "30",
    supplier_id: "sup_local_grains",
    options: [
      {
        name: "5kg Bag",
        barcode: "4800016900028-5KG",
        quantity: "5",
        price: "235.00"
      },
      {
        name: "25kg Sack",
        barcode: "4800016900028-25KG",
        quantity: "25",
        price: "1150.00"
      }
    ]
  },
  {
    id: "prod_36",
    category_id: "cat_rice_cooking",
    name: "Silver Swan Soy Sauce 385ml Bottle",
    barcode: "4800016911017",
    unit: "bottle",
    cost: "18.50",
    price: "24.00",
    stock: "30",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_37",
    category_id: "cat_rice_cooking",
    name: "Datu Puti Cane Vinegar 385ml Bottle",
    barcode: "4800016911024",
    unit: "bottle",
    cost: "17.00",
    price: "22.00",
    stock: "28",
    reorder: "10",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_38",
    category_id: "cat_rice_cooking",
    name: "UFC Tamis Anghang Banana Ketchup 320g",
    barcode: "4800016911031",
    unit: "bottle",
    cost: "21.50",
    price: "28.00",
    stock: "22",
    reorder: "8",
    supplier_id: "sup_urc"
  },
  {
    id: "prod_39",
    category_id: "cat_rice_cooking",
    name: "Golden Fiesta Palm Oil 1L Bottle",
    barcode: "4800016911048",
    unit: "bottle",
    cost: "76.00",
    price: "95.00",
    stock: "18",
    reorder: "8",
    supplier_id: "sup_local_grains"
  },
  {
    id: "prod_40",
    category_id: "cat_rice_cooking",
    name: "Maggi Magic Sarap Seasoning 8g",
    barcode: "4800361999011",
    unit: "sachet",
    cost: "4.20",
    price: "6.00",
    stock: "140",
    reorder: "30",
    supplier_id: "sup_nestle",
    options: [
      {
        name: "Strip of 12",
        barcode: "4800361999011-STRIP",
        quantity: "12",
        price: "65.00"
      }
    ]
  },

  // Personal Care & Toiletries (6)
  {
    id: "prod_41",
    category_id: "cat_personal_care",
    name: "Safeguard Pure White Bar Soap 130g",
    barcode: "4800016800013",
    unit: "piece",
    cost: "38.00",
    price: "48.00",
    stock: "40",
    reorder: "10",
    supplier_id: "sup_pg_unilever"
  },
  {
    id: "prod_42",
    category_id: "cat_personal_care",
    name: "Palmolive Naturals Shampoo Moisture 15ml",
    barcode: "4800016800020",
    unit: "sachet",
    cost: "5.80",
    price: "8.00",
    stock: "95",
    reorder: "20",
    supplier_id: "sup_pg_unilever",
    options: [
      {
        name: "Strip of 6",
        barcode: "4800016800020-6PK",
        quantity: "6",
        price: "45.00"
      }
    ]
  },
  {
    id: "prod_43",
    category_id: "cat_personal_care",
    name: "Head & Shoulders Cool Menthol 12ml",
    barcode: "4800016800037",
    unit: "sachet",
    cost: "6.60",
    price: "9.00",
    stock: "80",
    reorder: "20",
    supplier_id: "sup_pg_unilever"
  },
  {
    id: "prod_44",
    category_id: "cat_personal_care",
    name: "Colgate Great Regular Flavor Toothpaste 50ml",
    barcode: "4800016800044",
    unit: "tube",
    cost: "41.00",
    price: "52.00",
    stock: "20",
    reorder: "5",
    supplier_id: "sup_pg_unilever"
  },
  {
    id: "prod_45",
    category_id: "cat_personal_care",
    name: "Sunsilk Smooth & Manageable 15ml",
    barcode: "4800016800051",
    unit: "sachet",
    cost: "5.80",
    price: "8.00",
    stock: "0", // Out of stock test
    reorder: "20",
    supplier_id: "sup_pg_unilever"
  },
  {
    id: "prod_46",
    category_id: "cat_personal_care",
    name: "Rexona Men Ice Cool Roll-On 25ml",
    barcode: "4800016800068",
    unit: "piece",
    cost: "68.00",
    price: "85.00",
    stock: "2", // Low stock alert
    reorder: "5",
    supplier_id: "sup_pg_unilever"
  },

  // Laundry & Household Cleaning (4)
  {
    id: "prod_47",
    category_id: "cat_laundry_home",
    name: "Surf Cherry Blossom Detergent Powder 65g",
    barcode: "4800016700016",
    unit: "sachet",
    cost: "9.20",
    price: "12.00",
    stock: "110",
    reorder: "25",
    supplier_id: "sup_pg_unilever",
    options: [
      {
        name: "Strip of 6",
        barcode: "4800016700016-6PK",
        quantity: "6",
        price: "68.00"
      }
    ]
  },
  {
    id: "prod_48",
    category_id: "cat_laundry_home",
    name: "Ariel Sunrise Fresh Detergent Powder 66g",
    barcode: "4800016700023",
    unit: "sachet",
    cost: "10.80",
    price: "14.00",
    stock: "85",
    reorder: "20",
    supplier_id: "sup_pg_unilever"
  },
  {
    id: "prod_49",
    category_id: "cat_laundry_home",
    name: "Downy Mystique Fabric Conditioner 20ml",
    barcode: "4800016700030",
    unit: "sachet",
    cost: "6.80",
    price: "9.00",
    stock: "100",
    reorder: "20",
    supplier_id: "sup_pg_unilever",
    options: [
      {
        name: "Strip of 6",
        barcode: "4800016700030-6PK",
        quantity: "6",
        price: "50.00"
      }
    ]
  },
  {
    id: "prod_50",
    category_id: "cat_laundry_home",
    name: "Joy Dishwashing Liquid Lemon 200ml",
    barcode: "4800016700047",
    unit: "bottle",
    cost: "27.50",
    price: "36.00",
    stock: "26",
    reorder: "8",
    supplier_id: "sup_pg_unilever"
  }
];

function getMockProductImageUrl(item) {
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

  if (categoryId === "cat_noodles") {
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

  if (categoryId === "cat_coffee_milk") {
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

  if (categoryId === "cat_snacks") {
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

  if (categoryId === "cat_rice_cooking") {
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

  if (categoryId === "cat_personal_care") {
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

  if (categoryId === "cat_laundry_home") {
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

export function seedDatabase(targetDbPath, clean = false) {
  let resolvedPath = targetDbPath;
  if (!resolvedPath) {
    resolvedPath = path.resolve(import.meta.dirname, "../../data/store.db");
  }

  const database = openSqliteDatabase(resolvedPath);
  const idGen = createDefaultIdGenerator();
  const clock = createSystemClock();
  const nowIso = clock.nowIso();

  if (clean) {
    database.exec("DELETE FROM sales_return_items");
    database.exec("DELETE FROM sales_returns");
    database.exec("DELETE FROM sales_items");
    database.exec("DELETE FROM sales_transactions");
    database.exec("DELETE FROM receipt_sequences");
    database.exec("DELETE FROM inventory_transactions");
    database.exec("DELETE FROM product_selling_options");
    database.exec("DELETE FROM products");
    database.exec("DELETE FROM suppliers");
    database.exec("DELETE FROM product_categories");
  }

  // 1. Seed Categories
  const insertCatStmt = database.prepare(`
    INSERT OR IGNORE INTO product_categories (category_id, category_name, description, is_active)
    VALUES (?, ?, ?, 1)
  `);
  for (let categoryIndex = 0; categoryIndex < CATEGORIES.length; categoryIndex = categoryIndex + 1) {
    const categoryItem = CATEGORIES[categoryIndex];
    insertCatStmt.run(categoryItem.category_id, categoryItem.category_name, categoryItem.description);
  }

  // 2. Seed Suppliers
  const insertSupStmt = database.prepare(`
    INSERT OR IGNORE INTO suppliers (supplier_id, supplier_name, contact_person, phone, address, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  for (let supplierIndex = 0; supplierIndex < SUPPLIERS.length; supplierIndex = supplierIndex + 1) {
    const supplierItem = SUPPLIERS[supplierIndex];
    insertSupStmt.run(
      supplierItem.supplier_id,
      supplierItem.supplier_name,
      supplierItem.contact_person,
      supplierItem.phone,
      supplierItem.address
    );
  }

  // 3. Seed Products and Selling Options
  const insertProdStmt = database.prepare(`
    INSERT OR REPLACE INTO products (
      product_id, category_id, product_name, barcode, description,
      image_url, base_unit, current_stock_int, cost_price_int,
      selling_price_int, reorder_level_int, allow_custom_amount,
      is_active, deleted_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NULL, ?, ?)
  `);

  const insertOptionStmt = database.prepare(`
    INSERT OR REPLACE INTO product_selling_options (
      option_id, product_id, option_name, barcode, quantity_int,
      price_int, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const insertTxStmt = database.prepare(`
    INSERT INTO inventory_transactions (
      transaction_id, product_id, supplier_id, option_id,
      transaction_type, quantity_int, unit_cost_int, reference_number,
      remarks, created_by, created_at
    ) VALUES (?, ?, ?, NULL, 'STOCK_IN', ?, ?, ?, 'Initial inventory stock', 'system', ?)
  `);

  for (let productIndex = 0; productIndex < PRODUCTS.length; productIndex = productIndex + 1) {
    const item = PRODUCTS[productIndex];
    const stockInt = toQuantityInt(item.stock, "stock");
    const costInt = toMoneyInt(item.cost, "cost");
    const priceInt = toMoneyInt(item.price, "price");
    const reorderInt = toQuantityInt(item.reorder, "reorder");
    const mockImageUrl = getMockProductImageUrl(item);

    insertProdStmt.run(
      item.id,
      item.category_id,
      item.name,
      item.barcode,
      null,
      item.image_url || mockImageUrl,
      item.unit,
      stockInt,
      costInt,
      priceInt,
      reorderInt,
      nowIso,
      nowIso
    );

    // Initial stock-in movement
    if (stockInt > 0) {
      const txId = idGen.nextId();
      insertTxStmt.run(
        txId,
        item.id,
        item.supplier_id,
        stockInt,
        costInt,
        "INIT-STOCK",
        nowIso
      );
    }

    // Selling options
    if (item.options && item.options.length > 0) {
      for (let optionIndex = 0; optionIndex < item.options.length; optionIndex = optionIndex + 1) {
        const optionItem = item.options[optionIndex];
        const optionId = idGen.nextId();
        const optionQtyInt = toQuantityInt(optionItem.quantity, "option.quantity");
        const optionPriceInt = toMoneyInt(optionItem.price, "option.price");

        insertOptionStmt.run(
          optionId,
          item.id,
          optionItem.name,
          optionItem.barcode,
          optionQtyInt,
          optionPriceInt,
          nowIso,
          nowIso
        );
      }
    }
  }

  // 4. Seed Sample Completed Sales Transactions (12 sales across today and yesterday)
  const insertSaleStmt = database.prepare(`
    INSERT OR IGNORE INTO sales_transactions (
      sale_id, receipt_number, shift_id, customer_id, payment_method,
      subtotal_amount_int, discount_amount_int, total_amount_int,
      cash_amount_int, credit_amount_int, amount_paid_int, change_amount_int,
      status, created_by, created_at
    ) VALUES (?, ?, NULL, NULL, 'CASH', ?, 0, ?, ?, 0, ?, ?, 'COMPLETED', 'system', ?)
  `);

  const insertSaleItemStmt = database.prepare(`
    INSERT OR IGNORE INTO sales_items (
      sale_item_id, sale_id, product_id, option_id, option_name_snapshot,
      quantity_int, base_quantity_int, unit_price_int, unit_cost_int,
      discount_amount_int, subtotal_int
    ) VALUES (?, ?, ?, NULL, 'Base Unit', ?, ?, ?, ?, 0, ?)
  `);

  const compactDate = clock.todayManilaCompact();
  const SAMPLE_SALES = [
    // Today's sales
    {
      items: [
        { id: "prod_08", qty: 2, price: 1600, cost: 1280 }, // Lucky Me Kalamansi
        { id: "prod_22", qty: 3, price: 400, cost: 280 }    // Nescafe Classic
      ],
      cashPaid: 5000,
      hoursAgo: 1
    },
    {
      items: [
        { id: "prod_15", qty: 1, price: 7500, cost: 6200 }, // Coke 1.5L
        { id: "prod_31", qty: 1, price: 3800, cost: 3000 }  // Piattos
      ],
      cashPaid: 15000,
      hoursAgo: 2
    },
    {
      items: [
        { id: "prod_34", qty: 2, price: 5800, cost: 4600 }, // Dinorado 2kg
        { id: "prod_36", qty: 1, price: 2400, cost: 1850 }, // Silver Swan
        { id: "prod_40", qty: 2, price: 600, cost: 420 }    // Magic Sarap
      ],
      cashPaid: 20000,
      hoursAgo: 3
    },
    {
      items: [
        { id: "prod_01", qty: 2, price: 4200, cost: 3400 }, // Century Tuna
        { id: "prod_28", qty: 4, price: 700, cost: 520 }    // SkyFlakes
      ],
      cashPaid: 12000,
      hoursAgo: 4
    },
    {
      items: [
        { id: "prod_41", qty: 1, price: 4800, cost: 3800 }, // Safeguard
        { id: "prod_42", qty: 2, price: 800, cost: 580 },   // Palmolive sachet
        { id: "prod_47", qty: 2, price: 1200, cost: 920 }   // Surf sachet
      ],
      cashPaid: 10000,
      hoursAgo: 5
    },
    {
      items: [
        { id: "prod_19", qty: 2, price: 5500, cost: 4400 }, // San Miguel Pale
        { id: "prod_33", qty: 1, price: 2200, cost: 1650 }  // Oishi Prawn
      ],
      cashPaid: 15000,
      hoursAgo: 6
    },
    // Yesterday's sales
    {
      items: [
        { id: "prod_03", qty: 1, price: 4800, cost: 3900 }, // Argentina Corned Beef
        { id: "prod_35", qty: 3, price: 4800, cost: 3800 }  // Sinandomeng 3kg
      ],
      cashPaid: 20000,
      hoursAgo: 26
    },
    {
      items: [
        { id: "prod_25", qty: 2, price: 1600, cost: 1250 }, // Bear Brand
        { id: "prod_23", qty: 2, price: 1400, cost: 1120 }  // Great Taste White
      ],
      cashPaid: 10000,
      hoursAgo: 28
    },
    {
      items: [
        { id: "prod_10", qty: 3, price: 1600, cost: 1280 }, // Lucky Me Chili Mansi
        { id: "prod_04", qty: 2, price: 2500, cost: 1950 }  // 555 Sardines
      ],
      cashPaid: 10000,
      hoursAgo: 30
    },
    {
      items: [
        { id: "prod_39", qty: 1, price: 9500, cost: 7600 }, // Golden Fiesta 1L
        { id: "prod_37", qty: 1, price: 2200, cost: 1700 }  // Datu Puti Vinegar
      ],
      cashPaid: 12000,
      hoursAgo: 32
    },
    {
      items: [
        { id: "prod_20", qty: 2, price: 6500, cost: 5200 }, // Red Horse
        { id: "prod_32", qty: 1, price: 3800, cost: 3000 }  // Nova
      ],
      cashPaid: 20000,
      hoursAgo: 34
    },
    {
      items: [
        { id: "prod_50", qty: 1, price: 3600, cost: 2750 }, // Joy Dishwashing
        { id: "prod_49", qty: 3, price: 900, cost: 680 }    // Downy sachet
      ],
      cashPaid: 10000,
      hoursAgo: 36
    }
  ];

  const findSaleByReceiptStmt = database.prepare(
    "SELECT sale_id FROM sales_transactions WHERE receipt_number = ?"
  );

  for (let saleIndex = 0; saleIndex < SAMPLE_SALES.length; saleIndex = saleIndex + 1) {
    const saleData = SAMPLE_SALES[saleIndex];
    const receiptNum = formatReceiptNumber(compactDate, saleIndex + 1);
    const existingSale = findSaleByReceiptStmt.get(receiptNum);
    if (existingSale) {
      continue;
    }

    const saleId = idGen.nextId();

    let subtotalInt = 0;
    for (let itemIndex = 0; itemIndex < saleData.items.length; itemIndex = itemIndex + 1) {
      const itm = saleData.items[itemIndex];
      subtotalInt = subtotalInt + (itm.price * itm.qty);
    }

    const changeInt = saleData.cashPaid - subtotalInt;
    const saleTimestamp = new Date(Date.now() - (saleData.hoursAgo * 60 * 60 * 1000)).toISOString();

    insertSaleStmt.run(
      saleId,
      receiptNum,
      subtotalInt,
      subtotalInt,
      saleData.cashPaid,
      saleData.cashPaid,
      changeInt,
      saleTimestamp
    );

    for (let itemIndex = 0; itemIndex < saleData.items.length; itemIndex = itemIndex + 1) {
      const itm = saleData.items[itemIndex];
      const saleItemId = idGen.nextId();
      const lineSubtotal = itm.price * itm.qty;
      const qtyInt = toQuantityInt(itm.qty, "qty");

      insertSaleItemStmt.run(
        saleItemId,
        saleId,
        itm.id,
        qtyInt,
        qtyInt,
        itm.price,
        itm.cost,
        lineSubtotal
      );
    }
  }

  const prodCountRow = database.prepare("SELECT count(*) as count FROM products").get();
  const catCountRow = database.prepare("SELECT count(*) as count FROM product_categories").get();
  const supCountRow = database.prepare("SELECT count(*) as count FROM suppliers").get();
  const optCountRow = database.prepare("SELECT count(*) as count FROM product_selling_options").get();
  const txCountRow = database.prepare("SELECT count(*) as count FROM inventory_transactions").get();
  const salesCountRow = database.prepare("SELECT count(*) as count FROM sales_transactions").get();

  return {
    categories: catCountRow.count,
    suppliers: supCountRow.count,
    products: prodCountRow.count,
    selling_options: optCountRow.count,
    inventory_transactions: txCountRow.count,
    sales_transactions: salesCountRow.count
  };
}

// Direct CLI invocation
const isMain = process.argv[1] && process.argv[1].endsWith("seed.js");
if (isMain) {
  const shouldClean = process.argv.includes("--clean");
  console.log("Seeding store database (clean: " + shouldClean + ")...");
  const stats = seedDatabase(null, shouldClean);
  console.log("Database seeded successfully!");
  console.log("  Categories:             " + stats.categories);
  console.log("  Suppliers:              " + stats.suppliers);
  console.log("  Products:               " + stats.products);
  console.log("  Selling Options:        " + stats.selling_options);
  console.log("  Inventory Transactions: " + stats.inventory_transactions);
  console.log("  Sales Transactions:     " + stats.sales_transactions);
}
