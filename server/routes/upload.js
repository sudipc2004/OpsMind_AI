const express = require('express');
const multer = require('multer'); 
const { parsePdf, chunkText } = require('../ingestion/processPdf');
const { embedText } = require('../ingestion/embedChunks');
const { indexInDatabase } = require('../ingestion/indexChunks');



const router = express.Router();

// Store file in memory (buffer) — no disk writes needed
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

/**
 * POST /api/upload
 * Accepts a PDF, parses → chunks → embeds → stores in MongoDB Atlas.
 */
router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const filename = req.file.originalname;
    console.log(`\n[Upload] Processing: ${filename} (${req.file.size} bytes)`);

    // 1. Parse PDF
    const { text, pageCount } = await parsePdf(req.file.buffer);
    console.log(`[Upload] Parsed ${pageCount} pages`);

    // 2. Chunk text
    const rawChunks = chunkText(text);
    console.log(`[Upload] Created ${rawChunks.length} chunks`);

    if (rawChunks.length === 0) {
      return res.status(422).json({ error: 'No text content found in PDF' });
    }

    // 3. Embed chunks
    const docs = [];
    for (let i = 0; i < rawChunks.length; i++) {
      const embedding = await embedText(rawChunks[i]);
      docs.push({
        text: rawChunks[i],
        embedding,
        source: filename,
        page: Math.floor(i / (rawChunks.length / pageCount)) + 1 // Rough page estimate
      });
      if (i % 5 === 0) console.log(`[Upload] Embedded ${i}/${rawChunks.length} chunks`);
    }

    // 4. Index in Turso
    const count = await indexInDatabase(docs);
    console.log(`[Upload] Stored ${count} chunks in Turso\n`);

    res.json({
      success: true,
      filename,
      pages: pageCount,
      chunks: count,
      message: `Successfully indexed ${count} chunks from "${filename}"`,
    });

  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({ error: err.message || 'Failed to process PDF' });
  }
});

// GET /api/upload/docs
router.get('/docs', async (req, res) => {
  try {
    const { getTursoClient } = require('../lib/turso');
    const client = getTursoClient();
    const result = await client.execute("SELECT DISTINCT source, COUNT(*) as chunks FROM sop_chunks GROUP BY source");
    
    const docs = result.rows.map(row => ({
      name: row.source,
      chunks: row.chunks,
      pages: Math.ceil(row.chunks / 10), // Estimate
    }));
    
    res.json(docs);
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// DELETE /api/upload/docs/:source
router.delete('/docs/:source', async (req, res) => {
  const { source } = req.params;
  try {
    const { getTursoClient } = require('../lib/turso');
    const client = getTursoClient();
    await client.execute({
      sql: "DELETE FROM sop_chunks WHERE source = ?",
      args: [source]
    });
    res.json({ success: true, message: `Deleted ${source}` });
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

module.exports = router;

