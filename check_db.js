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

async function check() {
  console.log("Checking Supabase tables...");
  
  // 1. Companies
  const { data: companies, error: compErr } = await supabase.from("companies").select("*");
  console.log("Companies:", companies, compErr || "");
  
  // 2. Indents count
  const { count: indentsCount, error: indErr } = await supabase
    .from("indents")
    .select("*", { count: "exact", head: true })
    .eq("shop_name", "VISHAL");
  console.log("Indents with shop_name = 'VISHAL' count:", indentsCount, indErr || "");
  
  // 3. POs count
  const { count: poCount, error: poErr } = await supabase
    .from("purchase_orders")
    .select("*", { count: "exact", head: true })
    .eq("shop_name", "VISHAL");
  console.log("Purchase Orders with shop_name = 'VISHAL' count:", poCount, poErr || "");
}

check();
