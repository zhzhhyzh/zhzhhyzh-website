const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createClient } = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

function loadLocalEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

// =========================================================
// GitHub Stats Cache Configuration (Vercel Compatible)
// =========================================================
// Use /tmp for Vercel serverless (ephemeral but works within function lifecycle)
const isVercel = process.env.VERCEL === '1';
const CACHE_DIR = isVercel 
  ? path.join('/tmp', 'github-stats-cache')
  : path.join(__dirname, '.cache', 'github-stats');

// Cache duration: 1 hour for server, CDN handles edge caching
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const CDN_CACHE_SECONDS = 3600; // 1 hour CDN cache
const STALE_WHILE_REVALIDATE = 86400; // Allow stale for 24h while refreshing

// GitHub stats URLs with alternatives (primary + fallbacks)
const GITHUB_STATS_CONFIG = {
  'trophies': {
    urls: [
      'https://github-profile-trophy.vercel.app/?username=zhzhhyzh&theme=tokyonight&margin-w=10&margin-h=10&no-bg=true&no-frame=true',
      'https://github-trophies.vercel.app/?username=zhzhhyzh&theme=tokyonight&margin-w=10&margin-h=10&no-bg=true&no-frame=true',
    ],
    fallbackSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="120" viewBox="0 0 800 120">
      <rect width="100%" height="100%" fill="#1a1b27" rx="10"/>
      <text x="400" y="65" text-anchor="middle" fill="#70a5fd" font-family="sans-serif" font-size="16">GitHub Trophies - Loading...</text>
    </svg>`
  },
  'stats': {
    urls: [
      'https://github-readme-stats.vercel.app/api?username=zhzhhyzh&show_icons=true&theme=tokyonight&hide_border=true',
      'https://github-readme-stats-eight-theta.vercel.app/api?username=zhzhhyzh&show_icons=true&theme=tokyonight&hide_border=true',
      'https://github-readme-stats-git-masterrstaa-rickstaa.vercel.app/api?username=zhzhhyzh&show_icons=true&theme=tokyonight&hide_border=true',
    ],
    fallbackSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="195" viewBox="0 0 400 195">
      <rect width="100%" height="100%" fill="#1a1b27" rx="10"/>
      <text x="200" y="100" text-anchor="middle" fill="#70a5fd" font-family="sans-serif" font-size="14">GitHub Stats - Temporarily Unavailable</text>
    </svg>`
  },
  'languages': {
    urls: [
      'https://github-readme-stats.vercel.app/api/top-langs/?username=zhzhhyzh&layout=compact&theme=tokyonight&hide_border=true',
      'https://github-readme-stats-eight-theta.vercel.app/api/top-langs/?username=zhzhhyzh&layout=compact&theme=tokyonight&hide_border=true',
      'https://github-readme-stats-git-masterrstaa-rickstaa.vercel.app/api/top-langs/?username=zhzhhyzh&layout=compact&theme=tokyonight&hide_border=true',
    ],
    fallbackSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="165" viewBox="0 0 350 165">
      <rect width="100%" height="100%" fill="#1a1b27" rx="10"/>
      <text x="175" y="85" text-anchor="middle" fill="#70a5fd" font-family="sans-serif" font-size="14">Top Languages - Temporarily Unavailable</text>
    </svg>`
  },
  'streak': {
    urls: [
      'https://github-readme-streak-stats.herokuapp.com/?user=zhzhhyzh&theme=tokyonight&hide_border=true',
      'https://streak-stats.demolab.com/?user=zhzhhyzh&theme=tokyonight&hide_border=true',
    ],
    fallbackSvg: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="195" viewBox="0 0 400 195">
      <rect width="100%" height="100%" fill="#1a1b27" rx="10"/>
      <text x="200" y="100" text-anchor="middle" fill="#70a5fd" font-family="sans-serif" font-size="14">GitHub Streak - Temporarily Unavailable</text>
    </svg>`
  }
};

// Simple key list for backwards compatibility
const GITHUB_STATS = Object.fromEntries(
  Object.entries(GITHUB_STATS_CONFIG).map(([key, config]) => [key, config.urls[0]])
);

// In-memory cache for serverless (persists within function warm state)
let memoryCache = {};

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// Fetch image from URL
function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/svg+xml,image/*,*/*'
      },
      timeout: 15000
    }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fetchImage(response.headers.location).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ 
          buffer, 
          contentType: response.headers['content-type'] || 'image/svg+xml' 
        });
      });
      response.on('error', reject);
    });
    
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Get cached image (memory + file fallback) with alternative providers
async function getCachedImage(key) {
  const config = GITHUB_STATS_CONFIG[key];
  if (!config) throw new Error('Unknown stat key');
  
  const now = Date.now();
  
  // Check memory cache first (fastest)
  if (memoryCache[key] && (now - memoryCache[key].cachedAt) < CACHE_DURATION) {
    console.log(`[Cache] Memory HIT: ${key}`);
    return memoryCache[key];
  }
  
  // Check file cache
  ensureCacheDir();
  const cacheFile = path.join(CACHE_DIR, `${key}.svg`);
  const metaFile = path.join(CACHE_DIR, `${key}.json`);
  
  if (fs.existsSync(cacheFile) && fs.existsSync(metaFile)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      if ((now - meta.cachedAt) < CACHE_DURATION) {
        const buffer = fs.readFileSync(cacheFile);
        memoryCache[key] = { buffer, contentType: meta.contentType, cachedAt: meta.cachedAt };
        console.log(`[Cache] File HIT: ${key}`);
        return memoryCache[key];
      }
    } catch (e) {
      // Cache read failed, fetch fresh
    }
  }
  
  // Try each URL in order until one works
  console.log(`[Cache] MISS, fetching: ${key}`);
  let lastError = null;
  
  for (const url of config.urls) {
    try {
      console.log(`[Cache] Trying: ${url.substring(0, 60)}...`);
      const { buffer, contentType } = await fetchImage(url);
      
      // Verify it's a valid SVG (not an error page)
      const content = buffer.toString('utf8').substring(0, 200);
      if (content.includes('<svg') || content.includes('<?xml')) {
        // Save to file cache
        try {
          fs.writeFileSync(cacheFile, buffer);
          fs.writeFileSync(metaFile, JSON.stringify({ cachedAt: now, contentType }));
        } catch (e) {
          console.error(`[Cache] File write error: ${e.message}`);
        }
        
        // Save to memory cache
        memoryCache[key] = { buffer, contentType, cachedAt: now };
        console.log(`[Cache] SUCCESS: ${key} (${buffer.length} bytes)`);
        return memoryCache[key];
      } else {
        console.log(`[Cache] Invalid response from provider (not SVG)`);
        lastError = new Error('Invalid SVG response');
      }
    } catch (err) {
      console.log(`[Cache] Provider failed: ${err.message}`);
      lastError = err;
    }
  }
  
  // All providers failed - use fallback SVG
  console.log(`[Cache] All providers failed for ${key}, using fallback`);
  const fallbackBuffer = Buffer.from(config.fallbackSvg, 'utf8');
  
  // Cache the fallback for a shorter time (5 minutes)
  memoryCache[key] = { 
    buffer: fallbackBuffer, 
    contentType: 'image/svg+xml', 
    cachedAt: now - CACHE_DURATION + (5 * 60 * 1000) // Expire in 5 min
  };
  
  return memoryCache[key];
}

// Middleware to parse JSON
app.use(express.json());

// Serve static files from the root directory
app.use(express.static('.'));

// =========================================================
// GitHub Stats Cache Endpoints (Vercel CDN Compatible)
// =========================================================
app.get('/api/github-stats/:key', async (req, res) => {
  const { key } = req.params;
  
  if (!GITHUB_STATS[key]) {
    return res.status(404).json({ error: 'Unknown stat type' });
  }
  
  try {
    const { buffer, contentType } = await getCachedImage(key);
    
    // Vercel CDN cache headers - this is the key for static deployment!
    // s-maxage: CDN cache duration (shared cache for all visitors)
    // stale-while-revalidate: serve stale while fetching fresh in background
    res.set({
      'Content-Type': contentType,
      'Cache-Control': `public, s-maxage=${CDN_CACHE_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
      'CDN-Cache-Control': `public, max-age=${CDN_CACHE_SECONDS}`,
      'Vercel-CDN-Cache-Control': `public, max-age=${CDN_CACHE_SECONDS}`
    });
    
    res.send(buffer);
  } catch (err) {
    console.error(`[Cache] Error serving ${key}:`, err.message);
    // Fallback: redirect to original URL with cache headers
    res.set({
      'Cache-Control': `public, s-maxage=300, stale-while-revalidate=3600`
    });
    res.redirect(GITHUB_STATS[key]);
  }
});

// Endpoint to get cache status
app.get('/api/github-stats-status', (req, res) => {
  const status = {
    isVercel,
    cacheDir: CACHE_DIR,
    cacheDurationMinutes: CACHE_DURATION / 60000,
    cdnCacheSeconds: CDN_CACHE_SECONDS,
    stats: {}
  };
  
  for (const key of Object.keys(GITHUB_STATS)) {
    const cached = memoryCache[key];
    if (cached) {
      const age = Date.now() - cached.cachedAt;
      status.stats[key] = {
        cached: true,
        ageMinutes: Math.round(age / 60000),
        expiresInMinutes: Math.max(0, Math.round((CACHE_DURATION - age) / 60000)),
        size: cached.buffer ? cached.buffer.length : 0
      };
    } else {
      status.stats[key] = { cached: false };
    }
  }
  
  res.set({ 'Cache-Control': 'no-cache' });
  res.json(status);
});

// =========================================================
// Visitor Tracking Storage (Vercel Compatible)
// =========================================================
// For Vercel: use Vercel KV/Redis REST env vars or a standard Redis connection URL.
// Required in production so visitor data persists across serverless invocations and redeploys.
const VISITOR_STORE_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const VISITOR_STORE_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_URL = process.env.REDIS_URL;
const VISITOR_REDIS_KEY = 'portfolio:visitor-records:v1';
const VISITOR_STORAGE_SETUP_MESSAGE = 'Persistent visitor storage is not configured. Set REDIS_URL, KV_REST_API_URL and KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel.';

// In-memory fallback for local development
let localVisitorData = [];
let redisClientPromise = null;

function hasVisitorStore() {
  return Boolean((VISITOR_STORE_URL && VISITOR_STORE_TOKEN) || REDIS_URL);
}

async function getRedisClient() {
  if (!REDIS_URL) return null;

  if (!redisClientPromise) {
    const client = createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: false
      }
    });
    client.on('error', err => console.error('[Visitor Redis] Client error:', err.message));
    redisClientPromise = client.connect().then(() => client);
  }

  return redisClientPromise;
}

// Redis helper functions. Compatible with Vercel KV REST, Upstash REST, and REDIS_URL.
async function redisCommand(command, args = []) {
  if (!hasVisitorStore()) {
    return null; // Fallback to local storage
  }

  if (REDIS_URL && !(VISITOR_STORE_URL && VISITOR_STORE_TOKEN)) {
    const client = await getRedisClient();

    if (command === 'HVALS') {
      return client.hVals(args[0]);
    }

    if (command === 'HSET') {
      await client.hSet(args[0], args[1], args[2]);
      return 1;
    }

    throw new Error(`Unsupported Redis command: ${command}`);
  }
  
  try {
    const response = await fetch(`${VISITOR_STORE_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VISITOR_STORE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([command, ...args])
    });

    if (!response.ok) {
      throw new Error(`Redis REST HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    return data.result;
  } catch (err) {
    console.error('[Visitor Redis] Error:', err.message);
    throw err;
  }
}

// Get all visitors from storage
async function getVisitors() {
  if (hasVisitorStore()) {
    const values = await redisCommand('HVALS', [VISITOR_REDIS_KEY]);
    return (values || [])
      .map(value => {
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch (e) {
          return null;
        }
      })
      .filter(visitor => visitor && visitor.ip)
      .sort((a, b) => String(b.dateTime || '').localeCompare(String(a.dateTime || '')));
  }

  if (isVercel) {
    throw new Error(VISITOR_STORAGE_SETUP_MESSAGE);
  }
  
  // Local fallback: try to read from CSV
  if (!isVercel && fs.existsSync(csvFile)) {
    try {
      const content = fs.readFileSync(csvFile, 'utf8');
      const lines = content.trim().split('\n').slice(1); // Skip header
      return lines.map(line => {
        const [ip, region, dateTime, longLat] = line.split(',');
        return { ip, region, dateTime, longLat };
      }).filter(v => v.ip);
    } catch (e) {
      return localVisitorData;
    }
  }
  
  return localVisitorData;
}

function getVisitorStorageKey(visitor) {
  const date = String(visitor.dateTime || '').split('T')[0] || new Date().toISOString().split('T')[0];
  return `${date}:${visitor.ip}`;
}

function escapeCsv(value) {
  const text = String(value || '');
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

// Save one visitor record. Redis HSET gives persistence and per-day IP de-duplication.
async function saveVisitor(visitor) {
  if (hasVisitorStore()) {
    await redisCommand('HSET', [
      VISITOR_REDIS_KEY,
      getVisitorStorageKey(visitor),
      JSON.stringify(visitor)
    ]);
    return true;
  }

  if (isVercel) {
    throw new Error(VISITOR_STORAGE_SETUP_MESSAGE);
  }
  
  // Local fallback: write to CSV
  const visitors = await getVisitors();
  const key = getVisitorStorageKey(visitor);
  const existingIndex = visitors.findIndex(item => getVisitorStorageKey(item) === key);

  if (existingIndex >= 0) {
    visitors[existingIndex] = visitor;
  } else {
    visitors.push(visitor);
  }

  try {
    const csvContent = 'IP,Region,DateTime,longLat\n' +
      visitors.map(v => [v.ip, v.region, v.dateTime, v.longLat].map(escapeCsv).join(',')).join('\n') + '\n';
    fs.writeFileSync(csvFile, csvContent);
    return true;
  } catch (e) {
    console.error('[Storage] CSV write error:', e.message);
  }
  
  localVisitorData = visitors;
  return true;
}

// Ensure the directory exists (for local dev)
const csvDir = path.join(__dirname, 'assets', 'pnc');
if (!isVercel && !fs.existsSync(csvDir)) {
  fs.mkdirSync(csvDir, { recursive: true });
}

const csvFile = path.join(csvDir, 'index.csv');

// Initialize CSV if it doesn't exist (local dev only)
if (!isVercel && !fs.existsSync(csvFile)) {
  fs.writeFileSync(csvFile, 'IP,Region,DateTime,longLat\n');
}

// Endpoint to capture visitor data
async function captureVisitor(req, res) {
  const { ip, region, dateTime, longLat } = req.body;
  if (!ip || !region || !dateTime || !longLat) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const currentDate = dateTime.split('T')[0];

  try {
    const visitor = {
      ip: String(ip),
      region: String(region),
      dateTime: String(dateTime),
      longLat: String(longLat)
    };

    // Local duplicate check. Production Redis uses a stable HSET key per IP/day.
    if (!hasVisitorStore() && !isVercel) {
      const visitors = await getVisitors();
      const isDuplicate = visitors.some(v => {
        const existingDate = v.dateTime ? v.dateTime.split('T')[0] : '';
        return v.ip === ip && existingDate === currentDate;
      });

      if (isDuplicate) {
        return res.json({ success: true, message: 'Data already exists for today' });
      }
    }

    await saveVisitor(visitor);
    
    console.log(`[Visitor] New: ${ip} from ${region}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[Visitor] Error:', err.message);
    res.status(500).json({ error: 'Failed to save data', message: err.message });
  }
}

app.post('/api/capture', captureVisitor);
app.post('/capture', captureVisitor);

// API endpoint to get visitors (for pnc.html)
app.get('/api/visitors', async (req, res) => {
  try {
    const visitors = await getVisitors();
    
    // Return as CSV format for compatibility
    const csvContent = 'IP,Region,DateTime,longLat\n' +
      visitors.map(v => [v.ip, v.region, v.dateTime, v.longLat].map(escapeCsv).join(',')).join('\n');
    
    res.set('Content-Type', 'text/csv');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data', message: err.message });
  }
});

// JSON API endpoint
app.get('/api/visitors/json', async (req, res) => {
  try {
    const visitors = await getVisitors();
    res.json({ count: visitors.length, visitors });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data', message: err.message });
  }
});

// =========================================================
// AI Chatbot API (LLM Integration with Groq - FREE)
// =========================================================
// Set GROQ_API_KEY in environment variables (free at console.groq.com)
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const RAG_REFUSAL =
  "I'm Zhe Heng's assistant and can only answer questions about him. Try asking about his skills, projects, experience, or how to contact him!";

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'about', 'be', 'by', 'can', 'do', 'does', 'for',
  'from', 'he', 'her', 'him', 'his', 'how', 'i', 'in', 'is', 'it', 'me', 'of', 'on',
  'or', 'please', 'tell', 'the', 'their', 'to', 'what', 'where', 'who', 'with', 'you',
  'your', 'zhe', 'heng', 'yeoh'
]);

const RAG_KNOWLEDGE_BASE = [
  {
    id: 'profile',
    title: 'Profile',
    keywords: ['name', 'about', 'profile', 'intro', 'introduction', 'location', 'kuala', 'lumpur', 'malaysia'],
    text: 'Yeoh Zhe Heng is a Software Engineer, Full-Stack Developer, and AI & Cloud Enthusiast based in Kuala Lumpur, Malaysia.'
  },
  {
    id: 'contact',
    title: 'Contact',
    keywords: ['contact', 'email', 'mail', 'gmail', 'reach', 'connect', 'hire', 'linkedin', 'github', 'leetcode'],
    text: 'Zhe Heng can be contacted at henryyzh0309@gmail.com. His GitHub is https://github.com/zhzhhyzh, LinkedIn is https://linkedin.com/in/zhzhhyzh, LeetCode is https://leetcode.com/zhzhhyzh, Facebook is https://facebook.com/zheheng.yeoh, and Instagram is https://instagram.com/ob.hyzh.'
  },
  {
    id: 'education',
    title: 'Education',
    keywords: ['education', 'study', 'university', 'tarumt', 'degree', 'cgpa', 'gpa', 'student', 'graduate'],
    text: "Zhe Heng is pursuing a Bachelor of Software Engineering (Hons) at Tunku Abdul Rahman University of Management & Technology (TARUMT), 2023-2026. His CGPA is 3.97."
  },
  {
    id: 'achievements',
    title: 'Achievements',
    keywords: ['achievement', 'award', 'scholarship', 'president', 'list', 'soft-skill', 'hackathon', 'exchange'],
    text: "Zhe Heng's achievements include TARUMT Bachelor's Degree Scholarship Recipient, President's List x5, Soft Skill Competency Gold Award, and international hackathon/student exchange experiences in Vietnam, China, and the U.S."
  },
  {
    id: 'current-role',
    title: 'Current Role',
    keywords: ['current', 'now', 'present', 'ant', 'international', 'job', 'role', 'work', 'payment', 'iot', 'sofa'],
    text: 'Zhe Heng is a Java Backend Engineer at Ant International, TRX 106 Kuala Lumpur, from Nov 2025 to Present. He works on payment innovation solutions using the A&I SOFA stack, IoT payment device backend systems, and RESTful APIs for payment systems.'
  },
  {
    id: 'persis',
    title: 'Persis Experience',
    keywords: ['persis', 'remote', 'reinforcement', 'learning', 'analytics', 'flutter', 'python', 'pm2', 'aws'],
    text: 'Zhe Heng worked as a Project Developer at Persis remotely from Mar 2025 to Sep 2025. He built the Persis App using reinforcement learning for personalized analytics with a Node.js backend, Python AI services, Flutter frontend, and AWS EC2 deployment with PM2.'
  },
  {
    id: '33digitec',
    title: '33Digitec Experience',
    keywords: ['33digitec', 'full-stack', 'fullstack', 'developer', 'react', 'node', 'express', 'agile'],
    text: 'Zhe Heng worked as a Full-Stack Developer at 33Digitec Solution in Petaling Jaya, Kuala Lumpur from Mar 2023 to Mar 2025. He built RESTful APIs using Node.js and Express, developed responsive React components, and worked in Agile development with Git.'
  },
  {
    id: 'skills',
    title: 'Technical Skills',
    keywords: ['skill', 'skills', 'technology', 'tech', 'stack', 'programming', 'language', 'backend', 'frontend', 'database', 'cloud', 'tools'],
    text: 'Zhe Heng has skills in Java, JavaScript, TypeScript, Python, C++, Spring Boot, Node.js, Express.js, React, Flutter, MySQL, MongoDB, AWS EC2/RDS/S3, Docker, Kubernetes, Redis, Git/GitHub/GitLab, CI/CD, PM2, Postman, Figma, VS Code, and IntelliJ.'
  },
  {
    id: 'ai-ml',
    title: 'AI and Machine Learning',
    keywords: ['ai', 'ml', 'machine', 'learning', 'reinforcement', 'ppo', 'q-learning', 'forecasting', 'scikit', 'pandas'],
    text: 'Zhe Heng has AI/ML experience with reinforcement learning, PPO, Q-learning, time-series forecasting, Scikit-learn, Pandas, Python services, and AWS deployments.'
  },
  {
    id: 'projects-main',
    title: 'Portfolio Projects',
    keywords: ['project', 'projects', 'portfolio', 'built', 'developed', 'stallsync', 'invento', 'opengl', 'blockchain', 'mobile', 'game', 'agentic', 'banking'],
    text: 'Zhe Heng has built StallSync, Invento, AI/ML projects, OpenGL 3D projects, Solidity blockchain projects, Flutter mobile apps, online games, developer tools, and an Agentic AI Banking project.'
  },
  {
    id: 'stallsync',
    title: 'StallSync',
    keywords: ['stallsync', 'canteen', 'orders', 'inventory', 'rewards', 'analytics', 'react', 'node', 'mysql'],
    text: 'StallSync is a full-stack canteen management system using React, Node.js, and MySQL. It includes orders, inventory, rewards, and analytics modules.'
  },
  {
    id: 'invento',
    title: 'Invento',
    keywords: ['invento', 'inventory', 'spring', 'boot', 'react', 'transaction', 'user', 'product'],
    text: 'Invento is an inventory management application built with Spring Boot and React, with transaction, user, and product modules.'
  },
  {
    id: 'deployed-projects',
    title: 'Deployed Projects',
    keywords: ['deployed', 'live', 'tools', 'pdf', 'currency', 'snake', 'game', 'visit'],
    text: 'Zhe Heng has deployed live projects including Dev Tools at https://zhzhhyzh-dev-tools.vercel.app/, PDF Tools at https://zhzhhyzh-pdf-tools.vercel.app/, and Currency Converter at https://currency-frontend-3mdz.onrender.com/.'
  },
  {
    id: 'languages',
    title: 'Languages Spoken',
    keywords: ['language', 'languages', 'speak', 'mandarin', 'english', 'malay', 'chinese'],
    text: 'Zhe Heng speaks Mandarin at native level, English proficiently, and Malay independently.'
  },
  {
    id: 'availability',
    title: 'Availability',
    keywords: ['available', 'hire', 'hiring', 'opportunity', 'job', 'role', 'permanent', 'recruit'],
    text: 'Zhe Heng is open to permanent roles and professional opportunities. The best contact is email at henryyzh0309@gmail.com or LinkedIn at https://linkedin.com/in/zhzhhyzh.'
  }
];

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

function retrieveContext(question, limit = 5) {
  const queryTerms = tokenize(question);
  const querySet = new Set(queryTerms);

  return RAG_KNOWLEDGE_BASE
    .map(chunk => {
      const chunkTerms = tokenize(`${chunk.title} ${chunk.keywords.join(' ')} ${chunk.text}`);
      const keywordHits = chunk.keywords.filter(keyword => String(question).toLowerCase().includes(keyword.toLowerCase())).length;
      const lexicalHits = chunkTerms.filter(term => querySet.has(term)).length;
      const score = (keywordHits * 4) + lexicalHits;
      return { ...chunk, score };
    })
    .filter(chunk => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function isQuestionAboutZheHeng(question, retrievedChunks) {
  const q = String(question || '').toLowerCase();
  const directProfileTerms = /\b(zhe\s*heng|yeoh|zhzhhyzh|portfolio|resume|cv|github|linkedin|leetcode|skill|skills|project|projects|experience|education|cgpa|tarumt|ant international|persis|33digitec|stallsync|invento|contact|email|hire|available)\b/i;
  const unrelatedTerms = /\b(weather|news|politics|president|prime minister|recipe|cook|movie|music|song|translate|stock|bitcoin|football|math|calculate)\b/i;

  if (directProfileTerms.test(q)) return true;
  if (unrelatedTerms.test(q)) return false;
  return retrievedChunks.length > 0;
}

function formatContext(chunks) {
  return chunks.map((chunk, index) => `[${index + 1}] ${chunk.title}: ${chunk.text}`).join('\n');
}

function createGroundedFallback(question, chunks) {
  const q = String(question || '').toLowerCase();
  const text = chunks.map(chunk => chunk.text).join(' ');

  if (!chunks.length) return RAG_REFUSAL;

  if (/\b(email|mail|gmail|contact|reach|connect)\b/.test(q)) {
    return 'You can contact Zhe Heng at henryyzh0309@gmail.com. You can also connect with him on LinkedIn at https://linkedin.com/in/zhzhhyzh or view his GitHub at https://github.com/zhzhhyzh.';
  }

  if (/\b(skill|skills|tech|stack|programming|language|backend|frontend|cloud)\b/.test(q)) {
    return 'Zhe Heng works with Java, JavaScript, TypeScript, Python, C++, Spring Boot, Node.js, Express.js, React, Flutter, MySQL, MongoDB, AWS, Docker, Kubernetes, Redis, Git/GitHub/GitLab, CI/CD, PM2, Postman, Figma, VS Code, and IntelliJ.';
  }

  if (/\b(project|projects|built|portfolio|deployed|live)\b/.test(q)) {
    return 'Zhe Heng has built projects including StallSync, Invento, AI/ML services, OpenGL 3D work, Solidity blockchain projects, Flutter mobile apps, online games, developer tools, and Agentic AI Banking. Deployed tools include Dev Tools, PDF Tools, and Currency Converter.';
  }

  if (/\b(experience|work|job|company|career|current|currently|role)\b/.test(q)) {
    return 'Zhe Heng is currently a Java Backend Engineer at Ant International in Kuala Lumpur. He previously worked as a Project Developer at Persis and as a Full-Stack Developer at 33Digitec Solution.';
  }

  if (/\b(education|study|university|degree|cgpa|gpa|tarumt)\b/.test(q)) {
    return 'Zhe Heng is pursuing a Bachelor of Software Engineering (Hons) at TARUMT from 2023 to 2026, with a CGPA of 3.97.';
  }

  if (/\b(language|speak|mandarin|english|malay)\b/.test(q)) {
    return 'Zhe Heng speaks Mandarin at native level, English proficiently, and Malay independently.';
  }

  return text.split('. ').slice(0, 3).join('. ').replace(/\.$/, '') + '.';
}

app.post('/api/chat', async (req, res) => {
  const { question } = req.body;
  
  if (!question) {
    return res.status(400).json({ error: 'Question required' });
  }
  
  const retrievedChunks = retrieveContext(question);

  if (!isQuestionAboutZheHeng(question, retrievedChunks)) {
    return res.json({
      response: RAG_REFUSAL,
      sources: [],
      grounded: true
    });
  }

  // Try Groq first (free), then OpenAI as fallback
  const apiKey = GROQ_API_KEY || process.env.OPENAI_API_KEY;
  const isGroq = !!GROQ_API_KEY;
  
  if (!apiKey) {
    return res.json({
      response: createGroundedFallback(question, retrievedChunks),
      sources: retrievedChunks.map(chunk => ({ id: chunk.id, title: chunk.title })),
      grounded: true,
      fallback: true
    });
  }
  
  try {
    const apiUrl = isGroq 
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    
    const model = isGroq
      ? (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile')
      : (process.env.OPENAI_MODEL || 'gpt-4o-mini');
    const context = formatContext(retrievedChunks);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: [
              "You are Zhe Heng's portfolio assistant.",
              'Use retrieval augmented generation: answer only from the provided context snippets.',
              `If the question is unrelated to Zhe Heng or the answer is not in the context, reply exactly: ${RAG_REFUSAL}`,
              'Keep answers concise, friendly, and factually grounded. Do not invent dates, employers, projects, links, or skills.'
            ].join('\n')
          },
          {
            role: 'user',
            content: `Question: ${question}\n\nRetrieved context:\n${context}`
          }
        ],
        max_tokens: 300,
        temperature: 0.2
      })
    });
    
    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      const answer = data.choices[0].message.content;
      res.json({
        response: answer,
        sources: retrievedChunks.map(chunk => ({ id: chunk.id, title: chunk.title })),
        grounded: true
      });
    } else {
      console.error('[Chat API] Invalid response:', data);
      res.json({
        response: createGroundedFallback(question, retrievedChunks),
        sources: retrievedChunks.map(chunk => ({ id: chunk.id, title: chunk.title })),
        grounded: true,
        fallback: true
      });
    }
  } catch (err) {
    console.error('[Chat API] Error:', err.message);
    res.json({
      response: createGroundedFallback(question, retrievedChunks),
      sources: retrievedChunks.map(chunk => ({ id: chunk.id, title: chunk.title })),
      grounded: true,
      fallback: true
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${isVercel ? 'Vercel Serverless' : 'Local/Node.js'}`);
  console.log(`Cache directory: ${CACHE_DIR}`);
});

// Export for Vercel serverless
module.exports = app;
