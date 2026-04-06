/**
 * Database connection module using pg (node-postgres)
 * @module config/database
 */

const { Pool } = require('pg');
const config = require('./index');

/**
 * PostgreSQL connection pool
 * @type {Pool}
 */
const pool = new Pool(config.database);

/**
 * Test database connection
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Execute a query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
  return res;
}

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>}
 */
async function getClient() {
  return await pool.connect();
}

/**
 * Close the pool
 */
async function close() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  close,
};
