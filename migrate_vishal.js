import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load env variables manually to avoid dependencies
const envContent = fs.readFileSync(".env", "utf8");
const envConfig = {};
envContent.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length > 1) {
    envConfig[parts[0].trim()] = parts.slice(1).join("=").trim();
  }
});

const supabase = createClient(
  envConfig.VITE_SUPABASE_URL,
  envConfig.VITE_SUPABASE_PUBLISHABLE_KEY
);

const OLD_NAME = "VISHAL";
const NEW_NAME = "The Liquor Story - Vishal - Hinjewadi";

async function migrate() {
  console.log(`Checking and migrating: '${OLD_NAME}' -> '${NEW_NAME}'`);

  // 1. Update company_settings table (column: name)
  const { data: compData, error: compErr } = await supabase
    .from("company_settings")
    .update({ name: NEW_NAME })
    .ilike("name", OLD_NAME)
    .select();
  console.log("Updated company_settings:", compData, compErr || "");

  // 2. Update indents table (column: shop_name)
  const { data: indData, error: indErr } = await supabase
    .from("indents")
    .update({ shop_name: NEW_NAME })
    .ilike("shop_name", OLD_NAME)
    .select();
  console.log("Updated indents:", indData, indErr || "");

  // 3. Update purchase_orders table (column: shop_name)
  const { data: poData, error: poErr } = await supabase
    .from("purchase_orders")
    .update({ shop_name: NEW_NAME })
    .ilike("shop_name", OLD_NAME)
    .select();
  console.log("Updated purchase_orders:", poData, poErr || "");

  // 4. Update approved_indent_items table if it has shop_name column
  try {
    const { data: appItemsData, error: appItemsErr } = await supabase
      .from("approved_indent_items")
      .update({ shop_name: NEW_NAME })
      .ilike("shop_name", OLD_NAME)
      .select();
    console.log("Updated approved_indent_items:", appItemsData, appItemsErr || "");
  } catch (err) {
    console.log("approved_indent_items table update skipped or failed:", err.message);
  }
  
  // 5. Check masterItem table
  const { data: masterItems, error: masterErr } = await supabase
    .from("masterItem")
    .select("*")
    .limit(5);
  console.log("Sample masterItem records:", masterItems, masterErr || "");
}

migrate();
