import { createClient, type SupportedStorage } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables in .env.local');
}

// Custom storage provider to dynamically control session persistence based on "Remember Me" preference
const customStorage: SupportedStorage = {
  getItem: (key: string): string | null => {
    const localVal = localStorage.getItem(key);
    if (localVal !== null) return localVal;
    return sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    const rememberMe = localStorage.getItem('photo_timeline_remember_me') === 'true';
    if (rememberMe) {
      localStorage.setItem(key, value);
    } else {
      sessionStorage.setItem(key, value);
    }
  },
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

// Single instance of the Supabase client with custom dynamic session storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
