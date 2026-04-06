/**
 * Application configuration module
 * @module config
 */

module.exports = {
  /**
   * Server configuration
   */
  port: process.env.PORT || 3000,
  
  /**
   * Database configuration
   */
  database: process.env.DATABASE_URL 
    ? {
        // SI HAY DATABASE_URL (Caso Neon/Render)
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: parseInt(process.env.DB_POOL_SIZE || '5'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // Más tiempo para despertar a Neon
      }
    : {
        // SI NO HAY DATABASE_URL (Caso Local)
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'floreria',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        max: parseInt(process.env.DB_POOL_SIZE || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
        ssl: false
      },
  
  /**
   * JWT configuration
   */
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  /**
   * Application environment
   */
  env: process.env.NODE_ENV || 'development',
  
  /**
   * CORS configuration
   */
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  
  /**
   * Working capital configuration
   */
  workingCapital: {
    initialCapital: parseFloat(process.env.INITIAL_WORKING_CAPITAL) || 0,
  },
  
  /**
   * Analytics Service configuration
   */
  analytics: {
    baseUrl: process.env.ANALYTICS_URL || 'http://localhost:5001',
    timeout: parseInt(process.env.ANALYTICS_TIMEOUT || '5000'),
  },
};
