const PAGE_SIZE_DEFAULT = 10;
const PAGE_SIZE_MAX = 50;
const VALID_TYPES = ['posts', 'debates', 'users', 'tags'];

function getPagination(req) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || PAGE_SIZE_DEFAULT, 1), PAGE_SIZE_MAX);
  const from = (page - 1) * limit;
  return { page, limit, from };
}

function sanitizeTerm(raw) {
  return raw.replace(/[,()%]/g, ' ').trim();
}

async function searchPosts(supabase, rawQ, { limit, from }) {
  const { data, error } = await supabase.rpc('search_posts', {
    search_query: rawQ,
    result_limit: limit,
    result_offset: from,
  });
  if (error) throw error;
  const count = data.length ? Number(data[0].total_count) : 0;
  return { data: data.map(({ total_count, ...row }) => row), count };
}

async function searchDebates(supabase, rawQ, { limit, from }) {
  const { data, error } = await supabase.rpc('search_debates', {
    search_query: rawQ,
    result_limit: limit,
    result_offset: from,
  });
  if (error) throw error;
  const count = data.length ? Number(data[0].total_count) : 0;
  return { data: data.map(({ total_count, ...row }) => row), count };
}

async function searchUsers(supabase, q, { limit, from }) {
  const to = from + limit - 1;
  const { data, error, count } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url', { count: 'exact' })
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .range(from, to);
  if (error) throw error;
  return { data, count };
}

async function searchTags(supabase, q, { limit, from }) {
  const to = from + limit - 1;
  const { data, error, count } = await supabase
    .from('tags')
    .select('id, name, slug', { count: 'exact' })
    .ilike('name', `%${q}%`)
    .range(from, to);
  if (error) throw error;
  return { data, count };
}

async function search(req, res, next) {
  try {
    const rawQ = (req.query.q || '').trim();
    if (!rawQ) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    if (rawQ.length > 100) {
      return res.status(400).json({ error: 'Query too long (max 100 characters)' });
    }
    const ilikeQ = sanitizeTerm(rawQ);

    const { type } = req.query;
    const pagination = getPagination(req);
    const supabase = req.supabase;

    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
      }
      const { data, count } =
        type === 'posts' ? await searchPosts(supabase, rawQ, pagination)
        : type === 'debates' ? await searchDebates(supabase, rawQ, pagination)
        : type === 'users' ? await searchUsers(supabase, ilikeQ, pagination)
        : await searchTags(supabase, ilikeQ, pagination);

      return res.json({
        query: rawQ,
        type,
        page: pagination.page,
        limit: pagination.limit,
        total: count,
        results: data,
      });
    }

    const slice = { limit: pagination.limit, from: 0 };
    const [posts, debates, users, tags] = await Promise.all([
      searchPosts(supabase, rawQ, slice),
      searchDebates(supabase, rawQ, slice),
      searchUsers(supabase, ilikeQ, slice),
      searchTags(supabase, ilikeQ, slice),
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
