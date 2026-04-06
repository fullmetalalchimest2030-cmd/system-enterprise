/**
 * Express application setup
 * @module main
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { errorHandler, notFoundHandler } = require('./shared/middleware/errorHandler');

// Import routes - Auth
const authRoutes = require('./modules/auth/routes/authRoutes');

// Import routes - Employees
const employeeRoutes = require('./modules/employees/routes/employeeRoutes');

// Import routes - Categories
const categoryRoutes = require('./modules/categories/routes/categoryRoutes');

// Import routes - Products
const productRoutes = require('./modules/products/routes/productRoutes');

// Import routes - Inventory
const inventoryRoutes = require('./modules/inventory/routes/inventoryRoutes');

// Import routes - Recipes
const recipeRoutes = require('./modules/recipes/routes/recipeRoutes');

// Import routes - Sales
const salesRoutes = require('./modules/sales/routes/salesRoutes');

// Import routes - Cashbox
const cashboxRoutes = require('./modules/cashbox/routes/cashboxRoutes');

// Import routes - Finances
const financeRoutes = require('./modules/finances/routes/financeRoutes');

// Import routes - Reports
const reportRoutes = require('./modules/reports/routes/reportRoutes');

// Import routes - Dashboard
const dashboardRoutes = require('./modules/dashboard/routes/dashboardRoutes');

// Import routes - Alerts
const alertRoutes = require('./modules/alerts/routes/alertRoutes');

// Import routes - Audit
const auditRoutes = require('./modules/audit/routes/auditRoutes');

// Import routes - Public Catalog
const catalogRoutes = require('./modules/catalog/catalogRoutes');

/**
 * Create Express application
 * @returns {express.Application}
 */
function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors(config.cors));

  // Rate limiting middleware
  // General API rate limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // límite de 100 requests por ventana
    message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Strict rate limiter for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // límite de 5 intentos de login
    message: 'Demasiados intentos de autenticación, por favor intente más tarde',
    skipSuccessfulRequests: true, // No contar requests exitosos
  });

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply rate limiting to all API routes
  app.use('/api/', apiLimiter);

  // Health check endpoint (sin rate limiting)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes - v1
  app.use('/api/v1/auth', authLimiter, authRoutes); // Rate limiting estricto para auth
  app.use('/api/v1/employees', employeeRoutes);
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/recipes', recipeRoutes);
  app.use('/api/v1/sales', salesRoutes);
  app.use('/api/v1/cashbox', cashboxRoutes);
  app.use('/api/v1/finances', financeRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/alerts', alertRoutes);
  app.use('/api/v1/audit', auditRoutes);

  // Public routes (no authentication required)
  app.use('/api/v1/catalog', catalogRoutes);

  // Error handling middleware
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Export the app factory function
module.exports = createApp();
