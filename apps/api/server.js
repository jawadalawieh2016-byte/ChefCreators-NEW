import cors from 'cors';
import express from 'express';
import pg from 'pg';

const { Pool } = pg;

const app = express();
const port = Number(process.env.PORT || 3000);
const adminPin = process.env.ADMIN_PIN || 'kafta';
const databaseUrl = process.env.DATABASE_URL;
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!databaseUrl) {
  console.error('Missing DATABASE_URL. Connect a Render PostgreSQL database to this service.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  }
}));
app.use(express.json({ limit: '30mb' }));

function cleanString(value, max = 120) {
  return String(value ?? '').trim().slice(0, max);
}

function requireAdmin(req, res, next) {
  const pin = req.get('x-admin-pin') || req.query.adminPin || '';
  if (pin !== adminPin) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function userToken(req) {
  return cleanString(req.get('x-user-token') || req.body?.userToken || req.query.userToken || '', 120);
}

async function initDb() {
  await pool.query(`
    create table if not exists users (
      id text primary key,
      user_token text,
      name text not null default '',
      age integer,
      age_group text not null default '',
      plan text not null default 'free',
      banned boolean not null default false,
      flags integer not null default 0,
      last_flag_text text,
      last_flag_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      last_seen timestamptz not null default now()
    )
  `);
  await pool.query('alter table users add column if not exists user_token text');
  await pool.query(`
    create table if not exists feed_posts (
      id text primary key,
      user_id text not null default '',
      user_token text not null default '',
      chef text not null default 'Chef',
      dish text not null,
      style text not null default '',
      note text not null default '',
      media_data text,
      media_type text not null default '',
      media_name text not null default '',
      created_at timestamptz not null default now()
    )
  `);
}

function rowToUser(row) {
  return {
    id: row.id,
    name: row.name || '',
    age: row.age ?? undefined,
    ageGroup: row.age_group || '',
    plan: row.plan || 'free',
    banned: Boolean(row.banned),
    flags: Number(row.flags || 0),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    lastSeen: row.last_seen ? new Date(row.last_seen).getTime() : Date.now(),
    ...(row.last_flag_text ? { lastFlag: { text: row.last_flag_text, at: row.last_flag_at } } : {})
  };
}

function rowToFeedPost(row) {
  return {
    id: row.id,
    userId: row.user_id || '',
    chef: row.chef || 'Chef',
    dish: row.dish || '',
    style: row.style || '',
    note: row.note || '',
    media: row.media_data ? {
      data: row.media_data,
      type: row.media_type || '',
      name: row.media_name || ''
    } : null,
    date: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US') : '',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
  };
}

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'ChefCreators API', health: '/health' });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/feed', async (req, res, next) => {
  try {
    const result = await pool.query('select * from feed_posts order by created_at desc limit 60');
    res.json({ posts: result.rows.map(rowToFeedPost) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/feed', async (req, res, next) => {
  try {
    const id = cleanString(req.body.id, 80) || `food-${Date.now()}`;
    const userId = cleanString(req.body.userId, 80);
    const token = userToken(req);
    const chef = cleanString(req.body.chef, 80) || 'Chef';
    const dish = cleanString(req.body.dish, 80);
    const style = cleanString(req.body.style, 60);
    const note = cleanString(req.body.note, 180);
    const media = req.body.media && typeof req.body.media === 'object' ? req.body.media : null;
    const mediaData = media?.data ? cleanString(media.data, 28 * 1024 * 1024) : null;
    const mediaType = media?.type ? cleanString(media.type, 80) : '';
    const mediaName = media?.name ? cleanString(media.name, 120) : '';

    if (!dish) return res.status(400).json({ error: 'Missing dish name' });
    if (!userId) return res.status(400).json({ error: 'Missing user id' });
    if (!token) return res.status(400).json({ error: 'Missing user token' });
    if (mediaData && !mediaData.startsWith('data:image/') && !mediaData.startsWith('data:video/')) {
      return res.status(400).json({ error: 'Only food photos and videos are allowed' });
    }

    const result = await pool.query(`
      insert into feed_posts (id, user_id, user_token, chef, dish, style, note, media_data, media_type, media_name, created_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
      returning *
    `, [id, userId, token, chef, dish, style, note, mediaData, mediaType, mediaName]);

    res.status(201).json({ post: rowToFeedPost(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/users', async (req, res, next) => {
  try {
    const id = cleanString(req.body.id, 80);
    const token = userToken(req);
    const name = cleanString(req.body.name, 80);
    const age = Number(req.body.age);
    const ageGroup = cleanString(req.body.ageGroup, 20);

    if (!id) return res.status(400).json({ error: 'Missing user id' });
    if (!token) return res.status(400).json({ error: 'Missing user token' });
    if (!name) return res.status(400).json({ error: 'Missing name' });

    const existing = await pool.query('select user_token from users where id = $1', [id]);
    if (existing.rowCount && existing.rows[0].user_token && existing.rows[0].user_token !== token) {
      return res.status(403).json({ error: 'User token mismatch' });
    }

    const safeAge = Number.isInteger(age) && age >= 5 && age <= 120 ? age : null;
    const result = await pool.query(`
      insert into users (id, user_token, name, age, age_group, plan, banned, created_at, updated_at, last_seen)
      values ($1, $2, $3, $4, $5, 'free', false, now(), now(), now())
      on conflict (id) do update set
        user_token = coalesce(users.user_token, excluded.user_token),
        name = excluded.name,
        age = coalesce(excluded.age, users.age),
        age_group = coalesce(nullif(excluded.age_group, ''), users.age_group),
        updated_at = now(),
        last_seen = now()
      returning *
    `, [id, token, name, safeAge, ageGroup]);

    res.json({ user: rowToUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users', requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query('select * from users order by created_at desc');
    const users = {};
    result.rows.forEach((row) => {
      const user = rowToUser(row);
      users[user.id] = user;
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users/:id', async (req, res, next) => {
  try {
    const id = cleanString(req.params.id, 80);
    const token = userToken(req);
    if (!token) return res.status(400).json({ error: 'Missing user token' });
    const result = await pool.query('select * from users where id = $1', [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
    if (result.rows[0].user_token && result.rows[0].user_token !== token) {
      return res.status(403).json({ error: 'User token mismatch' });
    }
    res.json({ user: rowToUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = cleanString(req.params.id, 80);
    const banned = typeof req.body.banned === 'boolean' ? req.body.banned : null;
    const plan = req.body.plan === 'pro' || req.body.plan === 'free' ? req.body.plan : null;

    const existing = await pool.query('select * from users where id = $1', [id]);
    if (!existing.rowCount) return res.status(404).json({ error: 'User not found' });

    const result = await pool.query(`
      update users set
        banned = coalesce($2, banned),
        plan = coalesce($3, plan),
        updated_at = now()
      where id = $1
      returning *
    `, [id, banned, plan]);

    res.json({ user: rowToUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/users/:id/flag', async (req, res, next) => {
  try {
    const id = cleanString(req.params.id, 80);
    const token = userToken(req);
    const text = cleanString(req.body.text, 500);

    if (!id) return res.status(400).json({ error: 'Missing user id' });
    if (!token) return res.status(400).json({ error: 'Missing user token' });

    const existing = await pool.query('select user_token from users where id = $1', [id]);
    if (existing.rowCount && existing.rows[0].user_token && existing.rows[0].user_token !== token) {
      return res.status(403).json({ error: 'User token mismatch' });
    }

    const result = await pool.query(`
      insert into users (id, user_token, name, flags, last_flag_text, last_flag_at, created_at, updated_at, last_seen)
      values ($1, $2, '', 1, $3, now(), now(), now(), now())
      on conflict (id) do update set
        user_token = coalesce(users.user_token, excluded.user_token),
        flags = users.flags + 1,
        last_flag_text = excluded.last_flag_text,
        last_flag_at = now(),
        updated_at = now(),
        last_seen = now()
      returning *
    `, [id, token, text]);

    res.json({ user: rowToUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = cleanString(req.params.id, 80);
    await pool.query('delete from users where id = $1', [id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Server error' });
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`ChefCreators API listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });
