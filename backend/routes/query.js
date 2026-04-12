const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { embedText } = require('../lib/embedder');
const { vectorSearch } = require('../lib/mongo');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are OpsMind AI, an expert enterprise assistant that answers questions strictly based on the provided Standard Operating Procedure (SOP) documents.

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
  const { query, topK = 5 } = req.body;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // ── SSE Headers ──────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.flushHeaders();

  const send = (type, content) => {
    res.write(`data: ${JSON.stringify({ type, content })}\n\n`);
  };

  try {
    // 1. Embed the user query
    console.log(`[Query] Embedding: "${query}"`);
    const queryEmbedding = await embedText(query);

    // 2. Vector search for top-K relevant chunks
    const chunks = await vectorSearch(queryEmbedding, topK);
    console.log(`[Query] Found ${chunks.length} relevant chunks`);

    if (chunks.length === 0) {
      send('chunk', "I couldn't find relevant information in the uploaded SOP documents. Please upload relevant SOP PDFs first.");
      send('done', '');
      res.end();
      return;
    }

    // 3. Build context from retrieved chunks
    const context = chunks
      .map(
        (c, i) =>
          `[Source ${i + 1}: ${c.source}, Page ${c.page}]\n${c.text}`
      )
      .join('\n\n---\n\n');

    const userMessage = `Context from SOP Documents:\n\n${context}\n\n---\n\nQuestion: ${query}`;

    // 4. Stream response from Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContentStream(userMessage);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        send('chunk', text);
      }
    }

    // 5. Send source citations at the end
    const sources = chunks.map((c) => ({
      source: c.source,
      page: c.page,
      score: c.score,
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

module.exports = router;
