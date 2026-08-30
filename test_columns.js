import { createClient } from '@supabase/supabase-js';

const url = 'https://wxhdkwbpsffgiymuxvgf.supabase.co';
const anonKey = 'sb_publishable_gGLm1-rZXNGiUjRODg7_Yw_iT6dHmCL';
const supabase = createClient(url, anonKey);

async function checkColumns() {
  const fields = ['unit', 'weight', 'costPrice', 'observations', 'category', 'lastUpdated', 'quantity', 'isDiscarded'];
  for (const field of fields) {
    const obj = {
      id: 'test-col-' + field,
      code: '00000',
      location: 'Heladera 1',
      expiryDate: '2026-08-30',
      addedDate: new Date().toISOString(),
      addedBy: 'test',
      status: 'vigente',
      [field]: field === 'weight' || field === 'costPrice' || field === 'quantity' ? 1 : field === 'isDiscarded' ? false : 'test'
    };
    const { error } = await supabase.from('products').upsert([obj]);
    if (error) {
      console.log(`Column '${field}' ERROR:`, error.message);
    } else {
      console.log(`Column '${field}' OK!`);
      // Cleanup test row
      await supabase.from('products').delete().eq('id', obj.id);
    }
  }
}

checkColumns();
