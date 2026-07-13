
const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'apqp_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Force UTF-8 encoding for Spanish characters
  client_encoding: 'UTF8',
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
  process.exit(-1);
});

// Query function
const query = async (text, params) => {
  const start = Date.now();
  try {
    console.log('📊 PostgreSQL query:', text);
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`⚡ Query executed in ${duration}ms, returned ${res.rowCount} rows`);
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Get client for transactions
const getClient = async () => {
  return await pool.connect();
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🔄 Shutting down gracefully...');
  pool.end(() => {
    console.log('✅ PostgreSQL pool has ended');
    process.exit(0);
  });
});

module.exports = {
  query,
  getClient,
  pool
};