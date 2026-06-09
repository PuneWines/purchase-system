import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgizywoucvknfzvvhkkn.supabase.co';
const supabaseKey = 'sb_publishable_rzGOQWENr6Ei7u4qzCOWmw_vWewnTFy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('item_list')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Object keys:", Object.keys(data[0]));
  console.log("Object:", data[0]);
}

check();
