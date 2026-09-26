// seed.js
// Seeds the club platform with realistic dummy data for Day 2 testing.
//
// Why this uses the Supabase Admin API instead of raw SQL inserts:
// `profiles.id` is a FK to `auth.users.id`, and auth.users has a lot of
// internal, version-sensitive columns (encrypted_password, tokens, etc).
// Going through supabase.auth.admin.createUser() creates real, valid auth
// users, which fires your handle_new_user() trigger and auto-creates a
// matching `profiles` row — exactly like real signup would.
//
// Setup:
//   npm install @supabase/supabase-js dotenv
//   cp .env.example .env   (fill in your values — see below)
//   node seed.js
//
// Get SUPABASE_SERVICE_ROLE_KEY from Project Settings -> API -> service_role
// (NOT the anon key — this script needs elevated access to bypass RLS and
// create users). Never commit this key or use it in frontend code.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TEST_PASSWORD = 'TestPass123!';

async function main() {
  console.log('1/8 Creating test users...');
  const usersToCreate = [
    { email: 'alice@clubplatform.test', username: 'alice_codes', display_name: 'Alice Fernandes' },
    { email: 'bharath@clubplatform.test', username: 'bharath_dev', display_name: 'Bharath Kumar' },
    { email: 'chitra@clubplatform.test', username: 'chitra_ml', display_name: 'Chitra Rao' },
    { email: 'dev@clubplatform.test', username: 'dev_writes', display_name: 'Dev Sharma' },
    { email: 'esha@clubplatform.test', username: 'esha_debates', display_name: 'Esha Nair' },
    { email: 'farhan@clubplatform.test', username: 'farhan_builds', display_name: 'Farhan Ali' },
  ];

  const uid = {}; // username -> profile id
  for (const u of usersToCreate) {
    let userId;
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { username: u.username },
    });

    if (error) {
      if (!error.message.includes('already been registered')) {
        throw new Error(`createUser(${u.email}): ${error.message}`);
      }
      // Already exists from a previous run — look it up and reuse it.
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) throw new Error(`listUsers lookup for ${u.email}: ${listErr.message}`);
      const existing = list.users.find((usr) => usr.email === u.email);
      if (!existing) throw new Error(`Could not find existing user for ${u.email} after duplicate error`);
      userId = existing.id;
      console.log(`   ${u.email} already exists — reusing`);
    } else {
      userId = data.user.id;
    }

    uid[u.username] = userId;

    const { error: updErr } = await supabase
      .from('profiles')
      .update({ display_name: u.display_name })
      .eq('id', userId);
    if (updErr) throw new Error(`update display_name(${u.username}): ${updErr.message}`);
  }
  console.log('   done —', Object.keys(uid).length, 'users');

  console.log('2/8 Promoting test roles (alice=admin, bharath=moderator)...');
  const { data: roles, error: rolesErr } = await supabase.from('roles').select('id, name');
  if (rolesErr) throw rolesErr;
  const roleId = (name) => roles.find((r) => r.name === name).id;

  await supabase.from('profiles').update({ role_id: roleId('admin') }).eq('id', uid.alice_codes);
  await supabase.from('profiles').update({ role_id: roleId('moderator') }).eq('id', uid.bharath_dev);

  console.log('3/8 Seeding categories...');
  const categorySeed = [
    { name: 'Technology', slug: 'technology' },
    { name: 'AI & ML', slug: 'ai-ml' },
    { name: 'Programming', slug: 'programming' },
    { name: 'Projects', slug: 'projects' },
    { name: 'Events', slug: 'events' },
    { name: 'Career', slug: 'career' },
    { name: 'College Life', slug: 'college-life' },
  ];
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .upsert(categorySeed, { onConflict: 'slug' })
    .select();
  if (catErr) throw catErr;
  const catId = (slug) => categories.find((c) => c.slug === slug).id;

  console.log('4/8 Seeding tags...');
  const tagSeed = [
    { name: 'JavaScript', slug: 'javascript' },
    { name: 'React', slug: 'react' },
    { name: 'Node.js', slug: 'nodejs' },
    { name: 'Python', slug: 'python' },
    { name: 'Machine Learning', slug: 'machine-learning' },
    { name: 'Supabase', slug: 'supabase' },
    { name: 'Hackathon', slug: 'hackathon' },
    { name: 'Career Advice', slug: 'career-advice' },
  ];
  const { data: tags, error: tagErr } = await supabase
    .from('tags')
    .upsert(tagSeed, { onConflict: 'slug' })
    .select();
  if (tagErr) throw tagErr;
  const tagId = (slug) => tags.find((t) => t.slug === slug).id;

  console.log('5/8 Seeding posts...');
  const postSeed = [
    {
      author_id: uid.alice_codes,
      category_id: catId('programming'),
      title: 'Getting Started with Postgres Full-Text Search',
      slug: 'postgres-full-text-search',
      content:
        'Full-text search in Postgres is more capable than most people realize. In this post I walk through tsvector, GIN indexes, and ts_rank — everything you need before reaching for Elasticsearch.',
      status: 'published',
      reading_time_minutes: 6,
      published_at: new Date().toISOString(),
    },
    {
      author_id: uid.chitra_ml,
      category_id: catId('ai-ml'),
      title: 'Demystifying Transformers for Beginners',
      slug: 'demystifying-transformers',
      content:
        'Attention is all you need — but what does that actually mean? A beginner-friendly walkthrough of self-attention, positional encoding, and why transformers replaced RNNs.',
      status: 'published',
      reading_time_minutes: 9,
      published_at: new Date().toISOString(),
    },
    {
      author_id: uid.bharath_dev,
      category_id: catId('projects'),
      title: 'Our Club Platform: Architecture Decisions Explained',
      slug: 'club-platform-architecture',
      content:
        'React, Express, and Supabase — here is why we picked this stack for the club community platform, and what tradeoffs we accepted along the way.',
      status: 'published',
      reading_time_minutes: 5,
      published_at: new Date().toISOString(),
    },
    {
      author_id: uid.dev_writes,
      category_id: catId('career'),
      title: 'How I Prepared for My First Tech Internship',
      slug: 'first-tech-internship-prep',
      content:
        'DSA practice, mock interviews, and building projects that actually get noticed — a practical roadmap from someone who just went through it.',
      status: 'published',
      reading_time_minutes: 7,
      published_at: new Date().toISOString(),
    },
    {
      author_id: uid.esha_debates,
      category_id: catId('technology'),
      title: 'Should College Clubs Build Their Own Platforms?',
      slug: 'should-clubs-build-platforms',
      content:
        'Off-the-shelf tools like Discord and Notion are free and fast. So why are so many clubs building custom platforms anyway? An honest look at the tradeoffs.',
      status: 'published',
      reading_time_minutes: 4,
      published_at: new Date().toISOString(),
    },
    {
      author_id: uid.farhan_builds,
      category_id: catId('events'),
      title: '24 Hours, One Idea: Our Hackathon Recap',
      slug: 'hackathon-recap',
      content:
        'What our team learned building a debate-matching app in a single weekend, from sleep deprivation to a surprisingly good demo.',
      status: 'published',
      reading_time_minutes: 5,
      published_at: new Date().toISOString(),
    },
    {
      author_id: uid.alice_codes,
      category_id: catId('programming'),
      title: '[Draft] Row Level Security Patterns in Supabase',
      slug: 'rls-patterns-draft',
      content: 'Draft notes on RLS patterns — public read, owner write, admin override. Not ready to publish yet.',
      status: 'draft',
      reading_time_minutes: 8,
    },
  ];
  const { data: posts, error: postErr } = await supabase
    .from('posts')
    .upsert(postSeed, { onConflict: 'slug' })
    .select();
  if (postErr) throw postErr;
  const postId = (slug) => posts.find((p) => p.slug === slug).id;

  console.log('6/8 Seeding post_tags, comments, reactions, saved_posts...');
  await supabase.from('post_tags').upsert([
    { post_id: postId('postgres-full-text-search'), tag_id: tagId('supabase') },
    { post_id: postId('postgres-full-text-search'), tag_id: tagId('nodejs') },
    { post_id: postId('demystifying-transformers'), tag_id: tagId('machine-learning') },
    { post_id: postId('demystifying-transformers'), tag_id: tagId('python') },
    { post_id: postId('club-platform-architecture'), tag_id: tagId('react') },
    { post_id: postId('club-platform-architecture'), tag_id: tagId('supabase') },
    { post_id: postId('first-tech-internship-prep'), tag_id: tagId('career-advice') },
    { post_id: postId('hackathon-recap'), tag_id: tagId('hackathon') },
    { post_id: postId('hackathon-recap'), tag_id: tagId('javascript') },
  ], { onConflict: 'post_id,tag_id' });

  const { data: comment1 } = await supabase
    .from('comments')
    .insert({
      post_id: postId('postgres-full-text-search'),
      author_id: uid.bharath_dev,
      content: 'This saved me from reaching for Elasticsearch way too early. Great breakdown.',
    })
    .select()
    .single();

  await supabase.from('comments').insert([
    {
      post_id: postId('postgres-full-text-search'),
      author_id: uid.chitra_ml,
      parent_comment_id: comment1.id,
      content: 'Agreed — did you benchmark ts_rank against a large dataset?',
    },
    {
      post_id: postId('demystifying-transformers'),
      author_id: uid.dev_writes,
      content: 'The positional encoding explanation finally made it click for me. Thanks!',
    },
    {
      post_id: postId('hackathon-recap'),
      author_id: uid.esha_debates,
      content: 'Congrats on shipping something in 24 hours, that\'s no joke.',
    },
  ]);

  await supabase.from('reactions').insert([
    { user_id: uid.chitra_ml, target_type: 'post', target_id: postId('postgres-full-text-search'), reaction_type: 'like' },
    { user_id: uid.dev_writes, target_type: 'post', target_id: postId('postgres-full-text-search'), reaction_type: 'like' },
    { user_id: uid.farhan_builds, target_type: 'post', target_id: postId('demystifying-transformers'), reaction_type: 'like' },
    { user_id: uid.alice_codes, target_type: 'post', target_id: postId('hackathon-recap'), reaction_type: 'like' },
    { user_id: uid.esha_debates, target_type: 'comment', target_id: comment1.id, reaction_type: 'like' },
  ]);

  await supabase.from('saved_posts').insert([
    { user_id: uid.farhan_builds, post_id: postId('postgres-full-text-search') },
    { user_id: uid.esha_debates, post_id: postId('demystifying-transformers') },
  ]);

  console.log('7/8 Seeding debates, arguments, votes, replies...');
  const debateSeed = [
    {
      title: 'Should first-years be allowed to lead club projects?',
      description: 'Some say experience matters most, others say fresh perspective is worth the risk.',
      category_id: catId('college-life'),
      created_by: uid.esha_debates,
      status: 'open',
    },
    {
      title: 'Is a custom-built platform worth it over Discord + Notion?',
      description: 'Following up on the blog post — let\'s actually debate it.',
      category_id: catId('technology'),
      created_by: uid.bharath_dev,
      status: 'open',
    },
  ];
  const { data: debates, error: debateErr } = await supabase.from('debates').insert(debateSeed).select();
  if (debateErr) throw debateErr;
  const debateId = (title) => debates.find((d) => d.title === title).id;

  const { data: arguments1 } = await supabase
    .from('debate_arguments')
    .insert([
      {
        debate_id: debateId('Should first-years be allowed to lead club projects?'),
        author_id: uid.farhan_builds,
        stance: 'for',
        content: 'Fresh perspective and high motivation often outweigh lack of experience, especially with a mentor assigned.',
      },
      {
        debate_id: debateId('Should first-years be allowed to lead club projects?'),
        author_id: uid.dev_writes,
        stance: 'against',
        content: 'Leading requires navigating team conflict and scope creep — skills that usually take a year or two to build.',
      },
      {
        debate_id: debateId('Is a custom-built platform worth it over Discord + Notion?'),
        author_id: uid.alice_codes,
        stance: 'for',
        content: 'A custom platform gives the club a real portfolio project and full control over gamification, which no off-the-shelf tool offers.',
      },
      {
        debate_id: debateId('Is a custom-built platform worth it over Discord + Notion?'),
        author_id: uid.chitra_ml,
        stance: 'against',
        content: 'Maintenance burden after the founding team graduates is a real risk — Discord just keeps working with zero upkeep.',
      },
    ])
    .select();

  await supabase.from('debate_argument_votes').insert([
    { argument_id: arguments1[0].id, user_id: uid.chitra_ml },
    { argument_id: arguments1[0].id, user_id: uid.alice_codes },
    { argument_id: arguments1[2].id, user_id: uid.farhan_builds },
  ]);

  await supabase.from('debate_replies').insert([
    {
      argument_id: arguments1[1].id,
      author_id: uid.esha_debates,
      content: 'Fair point, though a co-lead structure could offset that risk.',
    },
    {
      argument_id: arguments1[3].id,
      author_id: uid.bharath_dev,
      content: 'That\'s exactly why we\'re keeping the stack boring: React + Express + Supabase, nothing exotic to maintain.',
    },
  ]);

  console.log('8/8 Seeding notifications, a report, and an announcement...');
  await supabase.from('notifications').insert([
    {
      user_id: uid.alice_codes,
      type: 'comment',
      reference_type: 'post',
      reference_id: postId('postgres-full-text-search'),
      message: 'bharath_dev commented on your post.',
    },
    {
      user_id: uid.bharath_dev,
      type: 'reply',
      reference_type: 'comment',
      reference_id: comment1.id,
      message: 'chitra_ml replied to your comment.',
    },
    {
      user_id: uid.esha_debates,
      type: 'debate_response',
      reference_type: 'debate_argument',
      reference_id: arguments1[1].id,
      message: 'Your debate got a new counter-argument.',
    },
  ]);

  await supabase.from('reports').insert([
    {
      reporter_id: uid.dev_writes,
      target_type: 'comment',
      target_id: comment1.id,
      reason: 'Test report — flagging for RLS/moderation queue testing, not real spam.',
      status: 'pending',
    },
  ]);

  await supabase.from('announcements').insert([
    {
      title: 'Welcome to the new Club Platform (Beta)',
      content: 'We\'re testing the new blog, debate, and community features ahead of full launch. Feedback welcome!',
      created_by: uid.alice_codes,
    },
  ]);

  console.log('\nSeed complete.');
  console.log('Test login password for all seeded users:', TEST_PASSWORD);
  console.log('Users:', Object.entries(uid).map(([u, id]) => `${u} (${id})`).join('\n  '));
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
