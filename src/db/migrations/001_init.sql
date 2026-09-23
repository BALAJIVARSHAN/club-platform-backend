-- ============================================================
-- Club Community & Blogging Platform — Initial Migration
-- Generated from club_platform_schema.dbml (reviewed version)
-- Target: Supabase (Postgres)
-- ============================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('guest', 'member', 'moderator', 'admin');
create type post_status as enum ('draft', 'published', 'archived');
create type debate_status as enum ('open', 'closed');
create type stance_type as enum ('for', 'against');
create type reaction_target as enum ('post', 'comment');
create type report_target as enum ('post', 'comment', 'user', 'debate_argument');
create type report_status as enum ('pending', 'reviewed', 'actioned', 'dismissed');

-- ============================================================
-- CORE / IDENTITY
-- ============================================================

create table roles (
  id serial primary key,
  name user_role unique not null,
  description varchar
);

insert into roles (name, description) values
  ('guest', 'Unauthenticated / browse-only access'),
  ('member', 'Standard club member'),
  ('moderator', 'Can moderate content and reports'),
  ('admin', 'Full platform administration');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username varchar unique not null,
  display_name varchar,
  bio text,
  avatar_url varchar,
  role_id int not null references roles(id),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- ============================================================
-- CONTENT
-- ============================================================

create table categories (
  id serial primary key,
  name varchar unique not null,
  slug varchar unique not null,
  description text
);

create table tags (
  id serial primary key,
  name varchar unique not null,
  slug varchar unique not null
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  category_id int references categories(id) on delete set null,
  title varchar not null,
  slug varchar unique not null,
  content text not null,
  cover_image_url varchar,
  status post_status not null default 'draft',
  reading_time_minutes int,
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  published_at timestamp
);

create index idx_posts_author_id on posts(author_id);
create index idx_posts_category_id on posts(category_id);
create index idx_posts_status on posts(status);
create index idx_posts_search_vector on posts using gin(search_vector);

create table post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  image_url varchar not null,
  alt_text varchar,
  sort_order int default 0,
  created_at timestamp default now()
);

create table post_tags (
  post_id uuid not null references posts(id) on delete cascade,
  tag_id int not null references tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  parent_comment_id uuid references comments(id) on delete cascade,
  content text not null,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index idx_comments_post_id on comments(post_id);
create index idx_comments_author_id on comments(author_id);

create table reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  target_type reaction_target not null,
  target_id uuid not null, -- app-enforced: posts.id or comments.id
  reaction_type varchar not null default 'like',
  created_at timestamp default now(),
  unique (user_id, target_type, target_id, reaction_type)
);

-- Added during schema review: proposal's dashboard site map lists
-- "Saved Posts" but no table existed for it in the original DBML.
create table saved_posts (
  user_id uuid not null references profiles(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  created_at timestamp default now(),
  primary key (user_id, post_id)
);

-- ============================================================
-- DEBATES
-- ============================================================

create table debates (
  id uuid primary key default gen_random_uuid(),
  title varchar not null,
  description text,
  category_id int references categories(id) on delete set null,
  created_by uuid not null references profiles(id) on delete cascade,
  status debate_status not null default 'open',
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create index idx_debates_search_vector on debates using gin(search_vector);
create index idx_debates_created_by on debates(created_by);

create table debate_arguments (
  id uuid primary key default gen_random_uuid(),
  debate_id uuid not null references debates(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  stance stance_type not null,
  content text not null,
  created_at timestamp default now()
);

create index idx_debate_arguments_debate_id on debate_arguments(debate_id);
create index idx_debate_arguments_author_id on debate_arguments(author_id);

create table debate_argument_votes (
  id uuid primary key default gen_random_uuid(),
  argument_id uuid not null references debate_arguments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamp default now(),
  unique (argument_id, user_id)
);

create table debate_replies (
  id uuid primary key default gen_random_uuid(),
  argument_id uuid not null references debate_arguments(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamp default now()
);

-- ============================================================
-- GAMIFICATION (FUTURE — Phase 5, schema only, do not build on yet)
-- ============================================================

create table games (
  id uuid primary key default gen_random_uuid(),
  title varchar not null,
  type varchar, -- quiz | puzzle | debug_challenge | trivia
  category_id int references categories(id) on delete set null,
  description text,
  difficulty varchar,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamp default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  prompt text not null,
  options jsonb,
  correct_answer varchar,
  points int default 0,
  order_index int
);

create table game_attempts (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  score int default 0,
  completed_at timestamp,
  created_at timestamp default now()
);

create table streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_active_date date
);

create table badges (
  id uuid primary key default gen_random_uuid(),
  name varchar unique not null,
  description text,
  icon_url varchar,
  criteria text
);

create table user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  earned_at timestamp default now(),
  unique (user_id, badge_id)
);

-- ============================================================
-- ENGAGEMENT & ADMIN
-- ============================================================

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade, -- recipient
  type varchar not null, -- comment | reply | debate_response | badge | streak_reminder | new_debate | daily_challenge | announcement
  reference_type varchar,
  reference_id uuid,
  message text,
  is_read boolean default false,
  created_at timestamp default now()
);

create index idx_notifications_user_read on notifications(user_id, is_read);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type report_target not null,
  target_id uuid not null,
  reason text not null,
  status report_status not null default 'pending',
  reviewed_by uuid references profiles(id) on delete set null,
  created_at timestamp default now(),
  resolved_at timestamp
);

create table announcements (
  id uuid primary key default gen_random_uuid(),
  title varchar not null,
  content text not null,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamp default now()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Generic updated_at bumper
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_posts_updated_at before update on posts
  for each row execute function set_updated_at();
create trigger trg_comments_updated_at before update on comments
  for each row execute function set_updated_at();
create trigger trg_debates_updated_at before update on debates
  for each row execute function set_updated_at();

-- Auto-create a profile row when a new auth.users row is created
create or replace function handle_new_user()
returns trigger as $$
declare
  member_role_id int;
begin
  select id into member_role_id from public.roles where name = 'member';

  insert into public.profiles (id, username, role_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    member_role_id
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper: resolve a user's role name (used in RLS policies below)
create or replace function get_user_role(uid uuid)
returns user_role as $$
  select r.name from public.profiles p
  join public.roles r on p.role_id = r.id
  where p.id = uid;
$$ language sql stable security definer set search_path = public;

-- ============================================================
-- ROW LEVEL SECURITY
-- Pattern: public read, owner-only write, admin/moderator override
-- ============================================================

alter table roles enable row level security;
alter table profiles enable row level security;
alter table categories enable row level security;
alter table tags enable row level security;
alter table posts enable row level security;
alter table post_images enable row level security;
alter table post_tags enable row level security;
alter table comments enable row level security;
alter table reactions enable row level security;
alter table saved_posts enable row level security;
alter table debates enable row level security;
alter table debate_arguments enable row level security;
alter table debate_argument_votes enable row level security;
alter table debate_replies enable row level security;
alter table games enable row level security;
alter table questions enable row level security;
alter table game_attempts enable row level security;
alter table streaks enable row level security;
alter table badges enable row level security;
alter table user_badges enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;
alter table announcements enable row level security;

-- roles: public read, no user writes
create policy roles_select on roles for select using (true);

-- profiles: public read, owner-only write
create policy profiles_select on profiles for select using (true);
create policy profiles_insert on profiles for insert with check (auth.uid() = id);
create policy profiles_update on profiles for update using (auth.uid() = id);

-- categories / tags: public read, admin-only write
create policy categories_select on categories for select using (true);
create policy categories_write on categories for all
  using (get_user_role(auth.uid()) = 'admin')
  with check (get_user_role(auth.uid()) = 'admin');
create policy tags_select on tags for select using (true);
create policy tags_write on tags for all
  using (get_user_role(auth.uid()) in ('admin', 'moderator'))
  with check (get_user_role(auth.uid()) in ('admin', 'moderator'));

-- posts: published posts public; draft visible to owner; owner-only write
create policy posts_select on posts for select
  using (status = 'published' or author_id = auth.uid());
create policy posts_insert on posts for insert with check (author_id = auth.uid());
create policy posts_update on posts for update
  using (author_id = auth.uid() or get_user_role(auth.uid()) in ('admin', 'moderator'));
create policy posts_delete on posts for delete
  using (author_id = auth.uid() or get_user_role(auth.uid()) in ('admin', 'moderator'));

-- post_images / post_tags: follow the parent post's visibility, owner-only write
create policy post_images_select on post_images for select using (true);
create policy post_images_write on post_images for all
  using (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));

create policy post_tags_select on post_tags for select using (true);
create policy post_tags_write on post_tags for all
  using (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()))
  with check (exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));

-- comments: public read, owner-only write
create policy comments_select on comments for select using (true);
create policy comments_insert on comments for insert with check (author_id = auth.uid());
create policy comments_update on comments for update using (author_id = auth.uid());
create policy comments_delete on comments for delete
  using (author_id = auth.uid() or get_user_role(auth.uid()) in ('admin', 'moderator'));

-- reactions: public read, owner-only write/delete
create policy reactions_select on reactions for select using (true);
create policy reactions_insert on reactions for insert with check (user_id = auth.uid());
create policy reactions_delete on reactions for delete using (user_id = auth.uid());

-- saved_posts: private to the owner
create policy saved_posts_select on saved_posts for select using (user_id = auth.uid());
create policy saved_posts_insert on saved_posts for insert with check (user_id = auth.uid());
create policy saved_posts_delete on saved_posts for delete using (user_id = auth.uid());

-- debates: public read, owner-only write
create policy debates_select on debates for select using (true);
create policy debates_insert on debates for insert with check (created_by = auth.uid());
create policy debates_update on debates for update
  using (created_by = auth.uid() or get_user_role(auth.uid()) in ('admin', 'moderator'));

-- debate_arguments / votes / replies: public read, owner-only write
create policy debate_arguments_select on debate_arguments for select using (true);
create policy debate_arguments_insert on debate_arguments for insert with check (author_id = auth.uid());
create policy debate_arguments_delete on debate_arguments for delete
  using (author_id = auth.uid() or get_user_role(auth.uid()) in ('admin', 'moderator'));

create policy debate_votes_select on debate_argument_votes for select using (true);
create policy debate_votes_insert on debate_argument_votes for insert with check (user_id = auth.uid());
create policy debate_votes_delete on debate_argument_votes for delete using (user_id = auth.uid());

create policy debate_replies_select on debate_replies for select using (true);
create policy debate_replies_insert on debate_replies for insert with check (author_id = auth.uid());
create policy debate_replies_delete on debate_replies for delete
  using (author_id = auth.uid() or get_user_role(auth.uid()) in ('admin', 'moderator'));

-- gamification (future phase, permissive read now, writes locked to admin for now)
create policy games_select on games for select using (true);
create policy questions_select on questions for select using (true);
create policy badges_select on badges for select using (true);
create policy game_attempts_select on game_attempts for select using (user_id = auth.uid());
create policy game_attempts_insert on game_attempts for insert with check (user_id = auth.uid());
create policy streaks_select on streaks for select using (user_id = auth.uid());
create policy user_badges_select on user_badges for select using (true);

-- notifications: recipient-only
create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update using (user_id = auth.uid());

-- reports: reporter can create/see own; moderators/admins see all
create policy reports_select on reports for select
  using (reporter_id = auth.uid() or get_user_role(auth.uid()) in ('admin', 'moderator'));
create policy reports_insert on reports for insert with check (reporter_id = auth.uid());
create policy reports_update on reports for update
  using (get_user_role(auth.uid()) in ('admin', 'moderator'));

-- announcements: public read, admin-only write
create policy announcements_select on announcements for select using (true);
create policy announcements_write on announcements for all
  using (get_user_role(auth.uid()) = 'admin')
  with check (get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- END OF MIGRATION
-- ============================================================
