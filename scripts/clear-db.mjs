import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://hagkoloxxagrgzfjthdf.supabase.co',
    'sb_publishable_jzBEcmN5yBg-Xk8cKOGOsw_ZmBIsx_t'
);

async function check() {
    const { data, error } = await supabase
        .from('sightings')
        .select('*');

    console.log('Number of submissions:', data?.length);
}

check();
