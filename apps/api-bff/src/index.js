/**
 * Main entry point for the Floreria API BFF Server
 * @module index
 */

require('dotenv').config();

const app = require('./main');
const config = require('./config');

const PORT = config.port || 3001;

/**
 * Start the Express server
 */
app.listen(PORT,"0.0.0.0", () => {
  console.log(`🌸 Floreria API BFF Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
