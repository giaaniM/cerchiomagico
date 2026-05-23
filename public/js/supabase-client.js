import { createClient } from './supabase.bundle.js';
import { API_URL } from './state.js';

// Fetch Supabase credentials from server to avoid hardcoding in client bundle
let _supabase = null;

export async function getSupabase() {
    if (_supabase) return _supabase;
    const res = await fetch(`${API_URL}/api/config`);
    const { url, anonKey } = await res.json();
    _supabase = createClient(url, anonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
        },
    });
    return _supabase;
}
