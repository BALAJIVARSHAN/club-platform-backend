const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
}

// Admin client — bypasses RLS entirely. Server-side use only
// (seed scripts, admin routes that need elevated access). Never
// expose SUPABASE_SERVICE_ROLE_KEY to the frontend.
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

// Per-request client — forwards the logged-in user's JWT so every
// query runs AS that user, meaning your RLS policies (owner-only
// write, public read, etc.) are enforced automatically. Use this
// in routes instead of supabaseAdmin whenever the action should be
// scoped to "the current user," which is almost always.
function getClientForRequest(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

module.exports = { supabaseAdmin, getClientForRequest };
