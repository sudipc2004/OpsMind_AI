const { storeChunks } = require('../lib/vectorDb');

/**
 * Indexes chunks into the Turso database.
 */
async function indexInDatabase(chunks) {
  return await storeChunks(chunks);
}

module.exports = { indexInDatabase };
