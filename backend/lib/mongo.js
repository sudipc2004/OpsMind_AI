const { MongoClient } = require('mongodb');

let client;
let db;

async function getDb() {
  if (db) return db;

  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.MONGODB_DB || 'opsmind');
  console.log('[MongoDB] Connected to Atlas');
  return db;
}

/**
 * Store an array of chunk documents into the collection.
 * Each doc: { text, embedding, source, page, chunkIndex }
 */
async function storeChunks(chunks) {
  const database = await getDb();
  const col = database.collection(process.env.MONGODB_COLLECTION || 'sop_chunks');
  const result = await col.insertMany(chunks);
  return result.insertedCount;
}

/**
 * Vector similarity search using MongoDB Atlas $vectorSearch.
 * Returns top-K chunks whose embeddings are closest to queryEmbedding.
 */
async function vectorSearch(queryEmbedding, topK = 5) {
  const database = await getDb();
  const col = database.collection(process.env.MONGODB_COLLECTION || 'sop_chunks');

  const pipeline = [
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: topK * 10,
        limit: topK,
      },
    },
    {
      $project: {
        _id: 0,
        text: 1,
        source: 1,
        page: 1,
        chunkIndex: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];

  const results = await col.aggregate(pipeline).toArray();
  return results;
}

module.exports = { getDb, storeChunks, vectorSearch };
