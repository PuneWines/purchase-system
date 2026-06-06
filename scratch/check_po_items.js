import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgizywoucvknfzvvhkkn.supabase.co';
const supabaseKey = 'sb_publishable_rzGOQWENr6Ei7u4qzCOWmw_vWewnTFy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const ids = [
    'b0cabf82-ec7d-4b7f-9026-f193ca2544ff::IN-28',
    '35f86343-ca56-48a1-beb8-359b19293f67::IN-10',
    '35f86343-ca56-48a1-beb8-359b19293f67::IN-8',
    'b0cabf82-ec7d-4b7f-9026-f193ca2544ff::IN-22',
    'b0cabf82-ec7d-4b7f-9026-f193ca2544ff::IN-19',
    'b0cabf82-ec7d-4b7f-9026-f193ca2544ff::IN-23',
    '35f86343-ca56-48a1-beb8-359b19293f67::IN-11',
    '35f86343-ca56-48a1-beb8-359b19293f67::IN-2',
    '35f86343-ca56-48a1-beb8-359b19293f67::IN-9',
    '35f86343-ca56-48a1-beb8-359b19293f67::IN-4'
  ];

  for (const id of ids) {
    const { data, error } = await supabase
      .from('indent_items')
      .select('count')
      .eq('unique_indent_id', id);
    console.log(`id: ${id}, count: ${data ? JSON.stringify(data) : null}, error: ${error ? error.message : null}`);
  }
}

run();
