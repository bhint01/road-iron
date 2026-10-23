import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';

// Browser-safe publishable key. Access is restricted by database grants and RLS.
const SUPABASE_URL = 'https://aefukymxvapmwkujuxtq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_myk5127XIz8uUW0NnbQ1Jg_zRg81sq7';
export const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
