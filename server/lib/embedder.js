const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Master Embedder with automatic fallback for quota issues.
 */
async function embedText(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (err) {
    if (err.code === 'insufficient_quota' || err.message.includes('quota')) {
      console.warn('[Embedder] Quota exceeded. Using deterministic fallback.');
      return generateFallbackEmbedding(text);
    }
    console.error('[Embedder Error]', err.message);
    throw err;
  }
}

/**
 * Embed multiple texts.
 */
async function embedBatch(texts, batchSize = 20) {
  const embeddings = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });
      embeddings.push(...response.data.map(d => d.embedding));
    } catch (err) {
      if (err.code === 'insufficient_quota' || err.message.includes('quota')) {
        console.warn('[Embedder] Batch quota exceeded. Falling back.');
        const fallbackBatch = batch.map(t => generateFallbackEmbedding(t));
        embeddings.push(...fallbackBatch);
      } else {
        throw err;
      }
    }
  }
  return embeddings;
}

function generateFallbackEmbedding(text) {
  const vector = new Array(1536).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = (charCode * (i + 1)) % 1536;
    vector[index] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(v => v / magnitude);
}

module.exports = { embedText, embedBatch };
