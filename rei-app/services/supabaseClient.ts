import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('CRITICAL: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. Set them in Vercel Environment Variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
