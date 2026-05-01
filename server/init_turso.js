require('dotenv').config();
const { getTursoClient } = require('./lib/turso');

async function initDb() {
  const client = getTursoClient();
  console.log('[Turso] Initializing tables...');
  
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS query_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT,
        model TEXT,
        timestamp TEXT
      )
    `);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        otp TEXT,
        expiresAt TEXT,
        pendingPassword TEXT,
        modifiedAt TEXT
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS sop_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT,
        embedding TEXT,
        source TEXT,
        page INTEGER
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS system_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt TEXT,
        isActive INTEGER DEFAULT 1
      )
    `);

    console.log('[Turso] Success: All tables ready.');

  } catch (err) {
    console.error('[Turso Error] Initialization failed:', err.message);
  }
}

initDb();
