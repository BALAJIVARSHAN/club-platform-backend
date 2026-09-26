// Owner: m5 (Balaji)
// Day 3: basic ILIKE search across posts, debates, users, tags.
// Day 4 TODO: swap posts/debates ILIKE for tsvector + ts_rank, add
// relevance ranking, and consider trigram search for users/tags.

const PAGE_SIZE_DEFAULT = 10;
const PAGE_SIZE_MAX = 50;
const VALID_TYPES = ['posts', 'debates', 'users', 'tags'];

function getPagination(req) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || PAGE_SIZE_DEFAULT, 1), PAGE_SIZE_MAX);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, limit, from, to };
}

// PostgREST's .or() filter syntax uses `,` to separate conditions and
// treats `(` `)` `%` specially — strip them so a search term can't
// accidentally break (or manipulate) the query being built below.
function sanitizeTerm(raw) {
  return raw.replace(/[,()%]/g, ' ').trim();
}

async function searchPosts(supabase, q, { from, to }) {
  const { data, error, count } = await supabase
    .from('posts')
    .select('id, title, slug, content, status, author_id, category_id, created_at', { count: 'exact' })
    .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { data, count };
}

async function searchDebates(supabase, q, { from, to }) {
  const { data, error, count } = await supabase
    .from('debates')
    .select('id, title, description, status, created_by, category_id, created_at', { count: 'exact' })
    .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { data, count };
}

async function searchUsers(supabase, q, { from, to }) {
  const { data, error, count } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url', { count: 'exact' })
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .range(from, to);
  if (error) throw error;
  return { data, count };
}

async function searchTags(supabase, q, { from, to }) {
  const { data, error, count } = await supabase
    .from('tags')
    .select('id, name, slug', { count: 'exact' })
    .ilike('name', `%${q}%`)
    .range(from, to);
  if (error) throw error;
  return { data, count };
}

const SEARCHERS = { posts: searchPosts, debates: searchDebates, users: searchUsers, tags: searchTags };

// GET /api/search?q=...&type=posts|debates|users|tags&page=&limit=
// Omitting `type` searches all four and returns them grouped.
async function search(req, res, next) {
  try {
    const rawQ = (req.query.q || '').trim();
    if (!rawQ) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    if (rawQ.length > 100) {
      return res.status(400).json({ error: 'Query too long (max 100 characters)' });
    }
    const q = sanitizeTerm(rawQ);
    if (!q) {
      return res.status(400).json({ error: 'Query must contain searchable characters' });
    }

    const { type } = req.query;
    const pagination = getPagination(req);
    const supabase = req.supabase;

    if (type) {
      const searcher = SEARCHERS[type];
      if (!searcher) {
        return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
      }
      const { data, count } = await searcher(supabase, q, pagination);
      return res.json({
        query: rawQ,
        type,
        page: pagination.page,
        limit: pagination.limit,
        total: count,
        results: data,
      });
    }

    // No type — search everything in parallel, first page of each only.
    const slice = { from: 0, to: pagination.limit - 1 };
    const [posts, debates, users, tags] = await Promise.all([
      searchPosts(supabase, q, slice),
      searchDebates(supabase, q, slice),
      searchUsers(supabase, q, slice),
      searchTags(supabase, q, slice),
    ]);

    res.json({
      query: rawQ,
      results: { posts: posts.data, debates: debates.data, users: users.data, tags: tags.data },
      counts: { posts: posts.count, debates: debates.count, users: users.count, tags: tags.count },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { search };
