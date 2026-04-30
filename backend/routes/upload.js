const express = require('express');
const multer = require('multer'); 
const { parsePdf } = require('../lib/pdfParser');
const { chunkPages } = require('../lib/chunker');
const { embedBatch } = require('../lib/embedder');
const { storeChunks } = require('../lib/mongo');

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

    // 1. Parse PDF into pages
    const pages = await parsePdf(req.file.buffer);
    console.log(`[Upload] Parsed ${pages.length} pages`);

    // 2. Chunk the pages
    const rawChunks = chunkPages(pages, { chunkSize: 800, overlap: 150 });
    console.log(`[Upload] Created ${rawChunks.length} chunks`);

    if (rawChunks.length === 0) {
      return res.status(422).json({ error: 'No text content found in PDF' });
    }

    // 3. Embed all chunks
    const texts = rawChunks.map((c) => c.text);
    const embeddings = await embedBatch(texts, 5);

    // 4. Build documents with embeddings
    const docs = rawChunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
      source: filename,
      uploadedAt: new Date(),
    }));

    // 5. Store in MongoDB Atlas
    const count = await storeChunks(docs);
    console.log(`[Upload] Stored ${count} chunks in MongoDB\n`);

    res.json({
      success: true,
      filename,
      pages: pages.length,
      chunks: count,
      message: `Successfully processed and indexed ${count} chunks from "${filename}"`,
    });
  } catch (err) {
    console.error('[Upload Error]', err);
    res.status(500).json({ error: err.message || 'Failed to process PDF' });
  }
});

module.exports = router;
