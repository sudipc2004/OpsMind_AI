const { createClient } = require('@libsql/client');
console.log('[Turso.js] Module loaded');


let client;

function getTursoClient() {
  if (client) return client;

  const url = process.env.TURSO_URL;
  const token = process.env.TURSO_AUTH_TOKEN;

  console.log(`[Turso] Attempting to connect to: ${url}`);

  if (!url) {
    throw new Error('TURSO_URL is missing in environment variables');
  }

  try {
    client = createClient({
      url: url.trim(),
      authToken: token ? token.trim() : undefined,
    });
    console.log('[Turso] Client initialized successfully');
    return client;
  } catch (err) {
    console.error('[Turso] Failed to initialize client:', err.message);
    throw err;
  }
}


module.exports = { getTursoClient };
