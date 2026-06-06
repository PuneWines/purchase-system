import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgizywoucvknfzvvhkkn.supabase.co';
const supabaseKey = 'sb_publishable_rzGOQWENr6Ei7u4qzCOWmw_vWewnTFy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  let allIndentItems = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: pageData, error: pageError } = await supabase
      .from("indent_items")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (pageError) {
      console.error(pageError);
      break;
    }

    if (pageData && pageData.length > 0) {
      allIndentItems = [...allIndentItems, ...pageData];
      page++;
      if (pageData.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  console.log('Total items fetched with pagination:', allIndentItems.length);

  // Group by primary key 'id' to see if there are duplicates with the exact same ID
  const counts = {};
  allIndentItems.forEach(item => {
    counts[item.id] = (counts[item.id] || 0) + 1;
  });

  const duplicateIds = Object.entries(counts).filter(([id, count]) => count > 1);
  console.log('Duplicate IDs found in paginated fetch:', duplicateIds.length);
  if (duplicateIds.length > 0) {
    console.log('First 5 duplicate IDs:', duplicateIds.slice(0, 5));
  }
}

run();
