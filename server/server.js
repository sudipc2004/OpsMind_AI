const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('[Server] Starting with PORT:', process.env.PORT);

const express = require('express');

const cors = require('cors');
const uploadRouter = require('./routes/upload');
const queryRouter = require('./routes/query');
const authRouter = require('./routes/auth');
const { requireAuth } = require('./lib/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/upload', requireAuth, uploadRouter);
app.use('/api/query', requireAuth, queryRouter);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'OpsMind AI Backend is running' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Model Check ─────────────────────────────────────────────────────────────
(async () => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // There isn't a direct listModels in the SDK for API keys usually, 
    // but we can try to initialize one to verify it doesn't immediately crash.
    console.log('[Gemini] Initializing models...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log('[Gemini] Model "gemini-2.5-flash" is configured');
  } catch (err) {
    console.warn('[Gemini Warn] Could not pre-verify model:', err.message);
  }
})();




// ── Serve Frontend ────────────────────────────────────────────────────────────
// In production, serve the compiled vite application
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 OpsMind AI Backend running on http://localhost:${PORT}\n`);
});
