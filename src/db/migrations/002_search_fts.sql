create or replace function search_posts(
  search_query text,
  result_limit int default 10,
  result_offset int default 0
)
returns table (
  id uuid,
  title varchar,
  slug varchar,
  content text,
  status post_status,
  author_id uuid,
  category_id int,
  created_at timestamp,
  rank real,
  total_count bigint
)
language sql
stable
as $$
  select
    p.id, p.title, p.slug, p.content, p.status, p.author_id, p.category_id, p.created_at,
    ts_rank(p.search_vector, websearch_to_tsquery('english', search_query)) as rank,
    count(*) over() as total_count
  from posts p
  where p.search_vector @@ websearch_to_tsquery('english', search_query)
  order by rank desc, p.created_at desc
  limit result_limit offset result_offset;
$$;

create or replace function search_debates(
  search_query text,
  result_limit int default 10,
  result_offset int default 0
)
returns table (
  id uuid,
  title varchar,
  description text,
  status debate_status,
  created_by uuid,
  category_id int,
  created_at timestamp,
  rank real,
  total_count bigint
)
language sql
stable
as $$
  select
    d.id, d.title, d.description, d.status, d.created_by, d.category_id, d.created_at,
    ts_rank(d.search_vector, websearch_to_tsquery('english', search_query)) as rank,
    count(*) over() as total_count
  from debates d
  where d.search_vector @@ websearch_to_tsquery('english', search_query)
  order by rank desc, d.created_at desc
  limit result_limit offset result_offset;
$$;

grant execute on function search_posts(text, int, int) to anon, authenticated, service_role;
grant execute on function search_debates(text, int, int) to anon, authenticated, service_role;

