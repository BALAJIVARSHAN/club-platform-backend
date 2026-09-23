const { getClientForRequest } = require('../config/supabaseClient');

// Attaches req.user if a valid Supabase JWT is present, but does NOT
// block the request if it's missing — use `requireAuth` below on
// routes that must be logged-in-only.
async function attachUser(req, res, next) {
  const supabase = getClientForRequest(req);
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      req.user = data.user;
    }
  }
  req.supabase = supabase; // RLS-scoped client for this request
  next();
}

// Use after attachUser on routes that require a logged-in user.
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

module.exports = { attachUser, requireAuth };
