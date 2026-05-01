const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const Pusher = require('pusher');
const twilio = require('twilio');
const { embedText } = require('../lib/embedder');
const { vectorSearch } = require('../lib/vectorDb');

const { getTursoClient } = require('../lib/turso');

const router = express.Router();

// ── Lazy Initializers ────────────────────────────────────────────────────────
let genAI;
let groq;
let pusher;
let twilioClient;

function getGenAI() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');
  return genAI;
}

function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_key' });
  return groq;
}

function getPusher() {
  if (!pusher) {
    pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID || 'dummy',
      key: process.env.PUSHER_KEY || 'dummy',
      secret: process.env.PUSHER_SECRET || 'dummy',
      cluster: process.env.PUSHER_CLUSTER || 'ap2',
      useTLS: true
    });
  }
  return pusher;
}

function getTwilio() {
  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID || 'dummy',
      process.env.TWILIO_AUTH_TOKEN || 'dummy'
    );
  }
  return twilioClient;
}



const DEFAULT_SYSTEM_PROMPT = `You are OpsMind AI, an expert enterprise assistant that answers questions strictly based on the provided Standard Operating Procedure (SOP) documents.

Rules:
- ONLY answer using the provided context chunks. Do not use outside knowledge.
- Be precise, structured, and professional.
- If the context does not contain enough information, say: "I couldn't find relevant information in the uploaded SOP documents."
- Always cite the source document and page number for each key point.
- Format responses with clear headings and bullet points when appropriate.
- Keep answers concise but complete.`;

/**
 * POST /api/query
 * Body: { query: string, topK?: number }
 * Streams back SSE events: { type: 'chunk'|'sources'|'done'|'error', content }
 */
router.post('/', async (req, res) => {
  const { query, topK = 5, modelChoice = 'groq' } = req.body;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // ── SSE Headers ──────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = (type, content) => {
    res.write(`data: ${JSON.stringify({ type, content })}\n\n`);
  };

  try {
    // 0. Broadcast Activity via Pusher
    getPusher().trigger('opsmind-activity', 'new-query', { query: query.slice(0, 50) + '...' });

    // 0.1 Fetch Dynamic System Prompt
    let activeSystemPrompt = DEFAULT_SYSTEM_PROMPT;
    try {
      const turso = getTursoClient();
      const promptResult = await turso.execute("SELECT prompt FROM system_prompts WHERE isActive = 1 ORDER BY id DESC LIMIT 1");
      if (promptResult.rows.length > 0) {
        activeSystemPrompt = promptResult.rows[0].prompt;
      }
    } catch (err) {
      console.warn('[Query Warn] Could not fetch dynamic prompt, using default.');
    }

    // 1. Embed and Search
    const queryEmbedding = await embedText(query);
    const chunks = await vectorSearch(queryEmbedding, topK);

    if (chunks.length === 0) {
      send('chunk', "I couldn't find relevant information in the uploaded SOP documents.");
      send('done', '');
      return res.end();
    }

    // 2. Build Context
    const context = chunks
      .map((c, i) => `[Source ${i + 1}: ${c.source}, Page ${c.page}]\n${c.text}`)
      .join('\n\n---\n\n');

    const userMessage = `Context from SOP Documents:\n\n${context}\n\n---\n\nQuestion: ${query}`;

    // 3. AI Generation (Gemini or Groq)
    if (modelChoice === 'gemini') {
      const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction: activeSystemPrompt });

      const result = await model.generateContentStream(userMessage);
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) send('chunk', text);
      }
    } else {
      // Default to Groq (Llama 3) for speed
      const stream = await getGroq().chat.completions.create({

        messages: [
          { role: 'system', content: activeSystemPrompt },
          { role: 'user', content: userMessage }
        ],
          model: 'llama-3.3-70b-versatile',
          stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) send('chunk', content);
      }
    }


    // 4. Critical Alert Check (Twilio)
    const criticalKeywords = ['emergency', 'fire', 'injury', 'accident', 'critical', 'danger'];
    if (criticalKeywords.some(kw => query.toLowerCase().includes(kw))) {
      console.log('[Alert] Critical query detected. Sending SMS...');
      try {
        await getTwilio().messages.create({
          body: `🚨 OpsMind Critical Alert: A user is asking about "${query.slice(0, 30)}...". Emergency SOPs may be required.`,

          from: process.env.TWILIO_PHONE_NUMBER,
          to: process.env.STAFF_PHONE_NUMBER
        });
      } catch (smsErr) {
        console.error('[Twilio Error]', smsErr.message);
      }
    }

    // 5. Audit Log (Turso)
    try {
      const turso = getTursoClient();
      await turso.execute({
        sql: "INSERT INTO query_logs (query, model, timestamp) VALUES (?, ?, ?)",
        args: [query, modelChoice, new Date().toISOString()]
      });
    } catch (dbErr) {
      console.warn('[Turso Warn] Failed to log query:', dbErr.message);
    }

    // 6. Send Sources and Finish
    const sources = chunks.map((c) => ({
      source: c.source,
      page: c.page,
      preview: c.text.slice(0, 150) + '...',
    }));
    send('sources', sources);
    send('done', '');
    res.end();
  } catch (err) {
    console.error('[Query Error]', err);
    send('error', err.message || 'Failed to process query');
    res.end();
  }
});


// GET /api/query/prompt
router.get('/prompt', async (req, res) => {
  try {
    const turso = getTursoClient();
    const result = await turso.execute("SELECT prompt FROM system_prompts WHERE isActive = 1 ORDER BY id DESC LIMIT 1");
    if (result.rows.length > 0) {
      return res.json({ prompt: result.rows[0].prompt });
    }
    res.json({ prompt: DEFAULT_SYSTEM_PROMPT });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prompt' });
  }
});

// POST /api/query/prompt
router.post('/prompt', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
  try {
    const turso = getTursoClient();
    // Deactivate old prompts
    await turso.execute("UPDATE system_prompts SET isActive = 0");
    // Insert new prompt
    await turso.execute({
      sql: "INSERT INTO system_prompts (prompt, isActive) VALUES (?, 1)",
      args: [prompt]
    });
    res.json({ success: true, message: 'System prompt updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

module.exports = router;

