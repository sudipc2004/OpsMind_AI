const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use gemini-embedding-2-preview with explicit 768 dims to match MongoDB Atlas vector index
const EMBEDDING_MODEL = 'gemini-embedding-2-preview';
const OUTPUT_DIMENSIONALITY = 768;

/**
 * Embed a single text string.
 * @returns {number[]} 768-dimensional embedding vector
 */
async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent({
    content: { parts: [{ text }], role: 'user' },
    outputDimensionality: OUTPUT_DIMENSIONALITY,
  });
  return result.embedding.values;
}

/**
 * Embed multiple texts in batches to avoid rate limits.
 * @param {string[]} texts
 * @param {number} batchSize
 * @returns {number[][]}
 */
async function embedBatch(texts, batchSize = 5) {
  const embeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    // Process batch in parallel
    const batchResults = await Promise.all(batch.map((t) => embedText(t)));
    embeddings.push(...batchResults);

    // Small delay between batches to respect rate limits
    if (i + batchSize < texts.length) {
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log(`[Embedder] Embedded ${Math.min(i + batchSize, texts.length)}/${texts.length} chunks`);
  }

  return embeddings;
}

module.exports = { embedText, embedBatch };
