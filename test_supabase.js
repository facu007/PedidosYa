import { createClient } from '@supabase/supabase-js';

const url = 'https://wxhdkwbpsffgiymuxvgf.supabase.co';
const anonKey = 'sb_publishable_gGLm1-rZXNGiUjRODg7_Yw_iT6dHmCL';

const supabase = createClient(url, anonKey);

async function test() {
  const testProduct = {
    id: 'test-' + Date.now(),
    code: '12345',
    location: 'Heladera 1',
    expiryDate: '2026-08-30',
    addedDate: new Date().toISOString(),
    addedBy: 'test',
    status: 'vigente',
    isDiscarded: false,
    quantity: 1,
    category: 'general'
  };

  console.log('Testing Supabase upsert basic fields...');
  const { data: upsertData, error: upsertError } = await supabase.from('products').upsert([testProduct]);
  console.log('Products upsert result:', { upsertData, upsertError });
}

test();
