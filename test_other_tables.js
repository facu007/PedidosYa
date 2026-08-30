import { createClient } from '@supabase/supabase-js';

const url = 'https://wxhdkwbpsffgiymuxvgf.supabase.co';
const anonKey = 'sb_publishable_gGLm1-rZXNGiUjRODg7_Yw_iT6dHmCL';
const supabase = createClient(url, anonKey);

async function checkOtherTables() {
  console.log('--- Checking config ---');
  const { data: cData, error: cErr } = await supabase.from('config').select('*');
  console.log('Config select:', { cData, cErr });

  console.log('--- Checking audit_logs ---');
  const { data: aData, error: aErr } = await supabase.from('audit_logs').select('*');
  console.log('Audit logs select:', { aData, aErr });

  console.log('--- Checking users ---');
  const { data: uData, error: uErr } = await supabase.from('users').select('*');
  console.log('Users select:', { uData, uErr });
}

checkOtherTables();
