/**
 * Audit Middleware - Automatic logging of operations
 * @module modules/audit/middleware/auditMiddleware
 */

const auditService = require('../services/auditService');

/**
 * Middleware to automatically log operations
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
function auditLogger(options = {}) {
  const {
    action = 'unknown',
    module = 'unknown',
    tableName = null,
    skipLogging = false,
    extractRecordId = null,
    extractOldValues = null,
    extractNewValues = null
  } = options;

  return async (req, res, next) => {
    // DEBUG: Inicio del middleware de auditoría

    if (skipLogging) {
      return next();
    }

    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Override response methods to capture data
    let responseData = null;
    let statusCode = null;

    res.send = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      return originalJson.call(this, data);
    };

    // Continue with the request
    next();

    // Log after response is sent - wait for response to complete
    // Use res.on('finish') to ensure it runs after response is complete
    res.on('finish', async () => {
      
      try {
        // Only log successful operations (2xx status codes)
        if (statusCode >= 200 && statusCode < 300) {
          
          // DEBUG: Verificar extractRecordId
          let referenceId = null;
          if (extractRecordId) {
            referenceId = extractRecordId(req, responseData);
          } else {
            referenceId = req.params.id || null;
          }

          const logData = {
            user_id: req.user?.id || null,
            action: typeof action === 'function' ? action(req) : action,
            module: typeof module === 'function' ? module(req) : module,
            reference_table: typeof tableName === 'function' ? tableName(req) : tableName,
            reference_id: referenceId,
            old_values: extractOldValues ? extractOldValues(req) : null,
            new_values: extractNewValues ? extractNewValues(req, responseData) : req.body || null,
            ip_address: req.ip || req.connection?.remoteAddress,
            user_agent: req.get('User-Agent'),
            method: req.method,
            url: req.originalUrl
          };

          
          const result = await auditService.createLog(logData);
        } else {
        }
      } catch (error) {
        // Don't throw - audit failures shouldn't break the application
      }
    });
  };
}
/**
 * Predefined audit configurations for common operations
 */
const auditConfigs = {
  // Product operations
  productCreate: {
    action: 'create',
    module: 'products',
    tableName: 'products',
    extractRecordId: (req, responseData) => responseData?.data?.id,
    extractNewValues: (req) => req.body
  },
  
  productUpdate: {
    action: 'update', 
    module: 'products',
    tableName: 'products',
    extractRecordId: (req) => req.params.id,
    extractNewValues: (req) => req.body
  },
  
  productDelete: {
    action: 'delete',
    module: 'products', 
    tableName: 'products',
    extractRecordId: (req) => req.params.id
  },

  // Sales operations
  saleCreate: {
    action: 'sale_created',
    module: 'sales',
    tableName: 'sales',
    extractRecordId: (req, responseData) => responseData?.data?.id,
    extractNewValues: (req) => req.body
  },

  // Inventory operations
  inventoryMovement: {
    action: (req) => req.body.movement_type === 'IN' ? 'inventory_in' : 'inventory_out',
    module: 'inventory',
    tableName: 'stock_movements',
    extractRecordId: (req, responseData) => responseData?.data?.id,
    extractNewValues: (req) => req.body
  },

  // Cashbox operations
  cashboxOpen: {
    action: 'cashbox_open',
    module: 'cashbox',
    tableName: 'cashbox_sessions',
    extractRecordId: (req, responseData) => responseData?.data?.id,
    extractNewValues: (req) => req.body
  },

  cashboxClose: {
    action: 'cashbox_close',
    module: 'cashbox', 
    tableName: 'cashbox_sessions',
    extractRecordId: (req) => req.params.id,
    extractNewValues: (req) => req.body
  }
};

/**
 * Quick audit middleware for common operations
 */
const quickAudit = {
  productCreate: () => auditLogger(auditConfigs.productCreate),
  productUpdate: () => auditLogger(auditConfigs.productUpdate),
  productDelete: () => auditLogger(auditConfigs.productDelete),
  saleCreate: () => auditLogger(auditConfigs.saleCreate),
  inventoryMovement: () => auditLogger(auditConfigs.inventoryMovement),
  cashboxOpen: () => auditLogger(auditConfigs.cashboxOpen),
  cashboxClose: () => auditLogger(auditConfigs.cashboxClose)
};

module.exports = {
  auditLogger,
  auditConfigs,
  quickAudit
};