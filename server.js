/**
 * Open Post - Standalone Server & Scheduler
 * Free, lightweight, single-service alternative to Postiz.
 * Eliminates Temporal cluster, Redis, and multi-container Docker requirements.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { ChannelDispatcher } = require('./channels');
const { AutopilotEngine } = require('./autopilot');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'open_post_store.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Database store helper
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultData = {
      channels: [
        { id: 'ch_x', name: 'Official X / Twitter', type: 'twitter', handle: '@openpost_app', connected: true, credentials: { mock: true } },
        { id: 'ch_li', name: 'Company LinkedIn', type: 'linkedin', handle: 'Open Post Inc', connected: true, credentials: { mock: true } },
        { id: 'ch_rd', name: 'Reddit r/selfhosted', type: 'reddit', handle: 'u/openpost_bot', connected: true, credentials: { mock: true } },
        { id: 'ch_bs', name: 'Bluesky Network', type: 'bluesky', handle: 'openpost.bsky.social', connected: true, credentials: { mock: true } }
      ],
      posts: [
        {
          id: 'post_1',
          content: 'Run your social media on autopilot with Open Post 🚀 100% free, zero-bloat, self-hosted scheduling.',
          platformOverrides: {
            twitter: { content: 'Run your social media on autopilot with Open Post 🚀 100% free, zero-bloat scheduling. Thread 👇' },
            linkedin: { content: 'Excited to announce Open Post: an open-source, lightweight social media scheduler designed for developers and creators who want autopilot consistency without paying hundreds in SaaS fees.' }
          },
          targetChannelIds: ['ch_x', 'ch_li'],
          scheduledFor: new Date(Date.now() + 3600000).toISOString(),
          status: 'scheduled',
          tags: ['Launch', 'OpenSource'],
          isAutopilot: false,
          createdAt: new Date().toISOString()
        }
      ],
      autopilot: {
        enabled: true,
        persona: 'indie_hacker',
        cadence: ['09:00', '13:00', '17:30'],
        targetChannelIds: ['ch_x', 'ch_li'],
        topicsQueue: [
          { id: 'top_1', title: 'Why self-hosting social media saves $2,000/yr on Buffer/Hootsuite', pillar: 'Cost Efficiency' },
          { id: 'top_2', title: 'How we reduced scheduler RAM usage from 3GB to 45MB', pillar: 'Architecture' },
          { id: 'top_3', title: 'The 3-step flywheel for building an engaged audience in 2026', pillar: 'Growth' },
          { id: 'top_4', title: 'Automating cross-platform syndication without looking spammy', pillar: 'Automation' }
        ]
      },
      analytics: {
        totalPublished: 142,
        totalEngagements: 18450,
        averageReach: 4210,
        topPlatform: 'X (Twitter)'
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading DB, returning blank schema', err);
    return { channels: [], posts: [], autopilot: {}, analytics: {} };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const dispatcher = new ChannelDispatcher({ DRY_RUN: process.env.DRY_RUN === 'true' });
const autopilot = new AutopilotEngine();

// --- API ROUTES ---

// Health & Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Open Post',
    version: '1.0.0',
    mode: 'standalone',
    uptime: process.uptime()
  });
});

// Channels
app.get('/api/channels', (req, res) => {
  const db = loadDB();
  res.json(db.channels);
});

app.post('/api/channels', (req, res) => {
  const db = loadDB();
  const newChannel = {
    id: `ch_${Date.now()}`,
    name: req.body.name,
    type: req.body.type,
    handle: req.body.handle,
    connected: true,
    credentials: req.body.credentials || { mock: true },
    createdAt: new Date().toISOString()
  };
  db.channels.push(newChannel);
  saveDB(db);
  res.status(201).json(newChannel);
});

app.delete('/api/channels/:id', (req, res) => {
  const db = loadDB();
  db.channels = db.channels.filter(c => c.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

// Posts
app.get('/api/posts', (req, res) => {
  const db = loadDB();
  const { status, channelId } = req.query;
  let result = db.posts;
  if (status) {
    result = result.filter(p => p.status === status);
  }
  if (channelId) {
    result = result.filter(p => p.targetChannelIds && p.targetChannelIds.includes(channelId));
  }
  res.json(result);
});

app.post('/api/posts', (req, res) => {
  const db = loadDB();
  const newPost = {
    id: `post_${Date.now()}`,
    content: req.body.content || '',
    platformOverrides: req.body.platformOverrides || {},
    targetChannelIds: req.body.targetChannelIds || [],
    scheduledFor: req.body.scheduledFor || new Date().toISOString(),
    status: req.body.status || 'scheduled',
    tags: req.body.tags || [],
    isAutopilot: req.body.isAutopilot || false,
    createdAt: new Date().toISOString()
  };
  db.posts.push(newPost);
  saveDB(db);
  res.status(201).json(newPost);
});

app.put('/api/posts/:id', (req, res) => {
  const db = loadDB();
  const idx = db.posts.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Post not found' });
  db.posts[idx] = { ...db.posts[idx], ...req.body, updatedAt: new Date().toISOString() };
  saveDB(db);
  res.json(db.posts[idx]);
});

app.delete('/api/posts/:id', (req, res) => {
  const db = loadDB();
  db.posts = db.posts.filter(p => p.id !== req.params.id);
  saveDB(db);
  res.json({ success: true });
});

// Autopilot Management
app.get('/api/autopilot', (req, res) => {
  const db = loadDB();
  res.json(db.autopilot);
});

app.put('/api/autopilot', (req, res) => {
  const db = loadDB();
  db.autopilot = { ...db.autopilot, ...req.body };
  saveDB(db);
  res.json(db.autopilot);
});

// Trigger Instant Autopilot Generation
app.post('/api/autopilot/generate-now', async (req, res) => {
  try {
    const db = loadDB();
    const config = db.autopilot;
    if (!config.topicsQueue || config.topicsQueue.length === 0) {
      return res.status(400).json({ error: 'Topic queue is empty. Add topics first.' });
    }

    const topicItem = config.topicsQueue[0];
    const generated = await autopilot.generatePost({
      topic: topicItem.title,
      pillar: topicItem.pillar,
      persona: config.persona || 'indie_hacker',
      targetChannels: ['twitter', 'linkedin']
    });

    const scheduledDate = req.body.scheduledFor || new Date(Date.now() + 1800000).toISOString(); // 30 mins from now

    const newPost = {
      id: `auto_${Date.now()}`,
      content: generated.content,
      platformOverrides: generated.platformOverrides,
      targetChannelIds: config.targetChannelIds || ['ch_x', 'ch_li'],
      scheduledFor: scheduledDate,
      status: 'scheduled',
      tags: generated.tags || ['Autopilot'],
      isAutopilot: true,
      createdAt: new Date().toISOString()
    };

    db.posts.push(newPost);
    // Cycle topic to end of queue
    config.topicsQueue.push(config.topicsQueue.shift());
    saveDB(db);

    res.json({ success: true, post: newPost });
  } catch (err) {
    console.error('Autopilot generation failed', err);
    res.status(500).json({ error: err.message });
  }
});

// Instant Publish Trigger
app.post('/api/posts/:id/publish-now', async (req, res) => {
  const db = loadDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const targetChannels = db.channels.filter(c => post.targetChannelIds.includes(c.id));
  const results = [];

  for (const ch of targetChannels) {
    try {
      const resPub = await dispatcher.publish(ch, post);
      results.push({ channelId: ch.id, success: true, details: resPub });
    } catch (err) {
      results.push({ channelId: ch.id, success: false, error: err.message });
    }
  }

  post.status = results.some(r => r.success) ? 'published' : 'failed';
  post.dispatchLog = results;
  post.publishedAt = new Date().toISOString();
  saveDB(db);

  res.json({ post, results });
});

// --- LIGHTWEIGHT CRON SCHEDULER (Runs every minute) ---
cron.schedule('* * * * *', async () => {
  const db = loadDB();
  const now = new Date();
  const duePosts = db.posts.filter(p => p.status === 'scheduled' && new Date(p.scheduledFor) <= now);

  if (duePosts.length > 0) {
    console.log(`[Scheduler] Found ${duePosts.length} posts due for publishing.`);
    for (const post of duePosts) {
      const targetChannels = db.channels.filter(c => post.targetChannelIds.includes(c.id));
      const results = [];
      for (const ch of targetChannels) {
        try {
          const resPub = await dispatcher.publish(ch, post);
          results.push({ channelId: ch.id, success: true, details: resPub });
        } catch (err) {
          results.push({ channelId: ch.id, success: false, error: err.message });
        }
      }
      post.status = results.some(r => r.success) ? 'published' : 'failed';
      post.dispatchLog = results;
      post.publishedAt = new Date().toISOString();
    }
    saveDB(db);
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 Open Post is running at http://localhost:${PORT}`);
    console.log(`   Standalone Social Media Autopilot`);
    console.log(`   Zero Temporal, Zero Redis bloat, 100% Free`);
    console.log(`===============================================`);
  });
}

module.exports = app;
