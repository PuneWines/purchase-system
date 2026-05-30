import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mgizywoucvknfzvvhkkn.supabase.co';
const supabaseKey = 'sb_publishable_rzGOQWENr6Ei7u4qzCOWmw_vWewnTFy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking receivers table structure...');
  const { data: rec, error: recErr } = await supabase.from('receivers').select('*').limit(1);
  if (recErr) {
    console.error('Error fetching receivers:', recErr);
  } else {
    console.log('Receivers row keys:', rec[0] ? Object.keys(rec[0]) : 'No rows found');
  }
}

check();
