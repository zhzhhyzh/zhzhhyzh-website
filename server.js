const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

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
// For Vercel: Use environment variables for Upstash Redis
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory fallback for local development
let localVisitorData = [];

// Upstash Redis helper functions
async function upstashCommand(command, args = []) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return null; // Fallback to local storage
  }
  
  try {
    const response = await fetch(`${UPSTASH_URL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([command, ...args])
    });
    const data = await response.json();
    return data.result;
  } catch (err) {
    console.error('[Upstash] Error:', err.message);
    return null;
  }
}

// Get all visitors from storage
async function getVisitors() {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    const data = await upstashCommand('GET', ['visitors']);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    }
    return [];
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

// Save visitors to storage
async function saveVisitors(visitors) {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    await upstashCommand('SET', ['visitors', JSON.stringify(visitors)]);
    return true;
  }
  
  // Local fallback: write to CSV
  if (!isVercel) {
    try {
      const csvContent = 'IP,Region,DateTime,longLat\n' + 
        visitors.map(v => `${v.ip},${v.region},${v.dateTime},${v.longLat}`).join('\n') + '\n';
      fs.writeFileSync(csvFile, csvContent);
      return true;
    } catch (e) {
      console.error('[Storage] CSV write error:', e.message);
    }
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
app.post('/capture', async (req, res) => {
  const { ip, region, dateTime, longLat } = req.body;
  if (!ip || !region || !dateTime || !longLat) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const currentDate = dateTime.split('T')[0];

  try {
    const visitors = await getVisitors();
    
    // Check for duplicates on the same day
    const isDuplicate = visitors.some(v => {
      const existingDate = v.dateTime ? v.dateTime.split('T')[0] : '';
      return v.ip === ip && existingDate === currentDate;
    });

    if (isDuplicate) {
      return res.json({ success: true, message: 'Data already exists for today' });
    }

    // Add new visitor
    visitors.push({ ip, region, dateTime, longLat });
    await saveVisitors(visitors);
    
    console.log(`[Visitor] New: ${ip} from ${region}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[Visitor] Error:', err.message);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// API endpoint to get visitors (for pnc.html)
app.get('/api/visitors', async (req, res) => {
  try {
    const visitors = await getVisitors();
    
    // Return as CSV format for compatibility
    const csvContent = 'IP,Region,DateTime,longLat\n' + 
      visitors.map(v => `${v.ip},${v.region},${v.dateTime},${v.longLat}`).join('\n');
    
    res.set('Content-Type', 'text/csv');
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// JSON API endpoint
app.get('/api/visitors/json', async (req, res) => {
  try {
    const visitors = await getVisitors();
    res.json({ count: visitors.length, visitors });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// =========================================================
// AI Chatbot API (LLM Integration with Groq - FREE)
// =========================================================
// Set GROQ_API_KEY in environment variables (free at console.groq.com)
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const ZHE_HENG_CONTEXT = `
You are an AI assistant for Yeoh Zhe Heng's personal portfolio website. You MUST ONLY answer questions about Zhe Heng.

## STRICT RULES:
1. ONLY answer questions related to Zhe Heng (his work, skills, projects, education, contact, social media)
2. For ANY unrelated questions (weather, news, general knowledge, other people, politics, etc.), respond with: "I'm Zhe Heng's assistant and can only answer questions about him. Try asking about his skills, projects, experience, or how to contact him!"
3. Keep responses concise (2-4 sentences max for simple questions)
4. Be friendly and professional
5. Always redirect back to Zhe Heng's portfolio

## ABOUT ZHE HENG:
- Full Name: Yeoh Zhe Heng
- Title: Software Engineer | Full-Stack Developer | AI & Cloud Enthusiast
- Location: Kuala Lumpur, Malaysia
- Email: henryyzh0309@gmail.com

## SOCIAL MEDIA:
- GitHub: github.com/zhzhhyzh
- LinkedIn: linkedin.com/in/zhzhhyzh
- LeetCode: leetcode.com/zhzhhyzh
- Facebook: facebook.com/zhzhhyzh
- Instagram: instagram.com/zhzhhyzh

## EDUCATION:
- University: Tunku Abdul Rahman University of Management & Technology (TARUMT)
- Degree: Bachelor of Software Engineering (Hons), 2023-2026
- CGPA: 3.97
- Achievements: President's List x5, Soft Skill Competency Gold Award, Bachelor's Degree Scholarship

## WORK EXPERIENCE:
1. Java Backend Engineer at Ant International, TRX 106 KL (Nov 2025-Present)
   - Payment innovation solutions using SOFA stack
   - IoT backend development
   - RESTful APIs for payment systems

2. Project Developer at Persis - Remote (Mar 2025-Sep 2025)
   - Built Persis App with Reinforcement Learning for personalized analytics
   - Node.js backend + Python AI + Flutter frontend
   - AWS EC2 deployment with PM2

3. Full-Stack Developer at 33Digitec Solution, PJ KL (Mar 2023-Mar 2025)
   - RESTful APIs using Node.js and Express
   - Responsive React components
   - Agile development with Git

## SKILLS:
- Languages: Java, JavaScript, TypeScript, Python, C++
- Backend: Spring Boot, Node.js, Express.js
- Frontend: React, Flutter
- Databases: MySQL, MongoDB
- Cloud: AWS (EC2, RDS, S3), Docker, Kubernetes
- AI/ML: Reinforcement Learning (PPO, Q-learning), Time-Series Forecasting, Scikit-learn, Pandas
- Tools: Git/GitHub/GitLab, PM2, Postman, Figma, VS Code, IntelliJ

## PROJECTS:
- StallSync: Full-stack canteen management (React, Node.js, MySQL) - Orders, Inventory, Rewards, Analytics
- Invento: Inventory management with Spring Boot and React
- AI/ML Projects: RL (PPO/Q-learning) and time-series forecasting on AWS
- OpenGL 3D: 3D graphics with lighting using C++
- Blockchain: Solidity smart contracts with Node.js integration
- Mobile Apps: Flutter/Dart apps with MVC architecture

## LANGUAGES SPOKEN:
- Mandarin: Native
- English: Proficient
- Malay: Independent

## CERTIFICATIONS:
- AWS Cloud (Beginner/Practitioner track)

## ACHIEVEMENTS:
- TARUMT Bachelor's Degree Scholarship Recipient
- President's List x5
- Soft Skills Competency Gold Award
- International experiences: Hackathons & Student Exchange in Vietnam, China, U.S.

## PERSONAL:
- Interests: Software Development, AI/ML, Cloud Technologies, Problem Solving, Hackathons
- Hobbies: Coding, Learning new technologies, Building projects, Competitive programming
- Personality: Passionate, hardworking, detail-oriented, team player
- Status: Open to permanent roles

Remember: ONLY answer about Zhe Heng. Politely decline any other topics.
`;

app.post('/api/chat', async (req, res) => {
  const { question } = req.body;
  
  if (!question) {
    return res.status(400).json({ error: 'Question required' });
  }
  
  // Try Groq first (free), then OpenAI as fallback
  const apiKey = GROQ_API_KEY || process.env.OPENAI_API_KEY;
  const isGroq = !!GROQ_API_KEY;
  
  if (!apiKey) {
    return res.status(503).json({ error: 'LLM not configured' });
  }
  
  try {
    const apiUrl = isGroq 
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    
    const model = isGroq ? 'llama-3.1-70b-versatile' : 'gpt-3.5-turbo';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: ZHE_HENG_CONTEXT },
          { role: 'user', content: question }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      res.json({ response: data.choices[0].message.content });
    } else {
      console.error('[Chat API] Invalid response:', data);
      res.status(500).json({ error: 'Invalid API response' });
    }
  } catch (err) {
    console.error('[Chat API] Error:', err.message);
    res.status(500).json({ error: 'Failed to get response' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${isVercel ? 'Vercel Serverless' : 'Local/Node.js'}`);
  console.log(`Cache directory: ${CACHE_DIR}`);
});

// Export for Vercel serverless
module.exports = app;