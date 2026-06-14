import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url, options = {}) => {
      if (typeof window !== 'undefined') {
        const userId = window.__supabase_user_id || window.sessionStorage.getItem('sb-user-id');
        const userRole = window.__supabase_user_role || window.sessionStorage.getItem('sb-user-role');
        
        if (userId) {
          if (!options.headers) {
            options.headers = {};
          }
          
          if (options.headers instanceof Headers || typeof options.headers.set === 'function') {
            options.headers.set('x-user-id', userId);
            options.headers.set('x-user-role', userRole || 'student');
          } else {
            options.headers['x-user-id'] = userId;
            options.headers['x-user-role'] = userRole || 'student';
          }
        }
      }
      return fetch(url, options);
    }
  }
});
