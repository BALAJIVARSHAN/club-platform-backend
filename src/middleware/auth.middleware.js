const { getClientForRequest } = require('../config/supabaseClient');

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
  req.supabase = supabase;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

module.exports = { attachUser, requireAuth };
