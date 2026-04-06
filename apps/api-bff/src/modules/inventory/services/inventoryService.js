/**
 * Inventory Service - Business logic for stock movements
 * @module modules/inventory/services/inventoryService
 */

const inventoryModel = require('../models/inventoryModel');
const productModel = require('../../products/models/productModel');
const { AppError } = require('../../../shared/middleware/errorHandler');

const VALID_MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT', 'WASTE'];
const VALID_REASONS = [
  'purchase',
  'return',
  'adjustment',
  'sale',
  'damage',
  'theft',
  'production',
  'transfer',
  'initial_stock',
  'waste'
];

class InventoryService {
  /**
   * Get all inventory movements with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Inventory movements
   */
  async getAllMovements(filters) {
    return await inventoryModel.findAll(filters);
  }

  /**
   * Get movement by ID
   * @param {number} id - Movement ID
   * @returns {Promise<Object>} Movement object
   */
  async getMovementById(id) {
    const movement = await inventoryModel.findById(id);
    if (!movement) {
      throw new AppError('Inventory movement not found', 404);
    }
    return movement;
  }

  /**
   * Create a new inventory movement (stock IN/OUT)
   * @param {Object} movementData - Movement data
   * @returns {Promise<Object>} Created movement
   */
  async createMovement(movementData) {
    const { product_id, movement_type, quantity, reason, reference_id, user_id, unit_cost } = movementData;

    // Validate required fields
    if (!product_id || !movement_type || !quantity || !user_id) {
      throw new AppError('Product ID, movement type, quantity, and user ID are required', 400);
    }

    // Validate movement type
    if (!VALID_MOVEMENT_TYPES.includes(movement_type)) {
      throw new AppError(`Invalid movement type. Valid types are: ${VALID_MOVEMENT_TYPES.join(', ')}`, 400);
    }

    // Validate quantity
    if (!quantity || quantity <= 0) {
      throw new AppError('Quantity must be greater than 0', 400);
    }

    // Validate reason if provided
    if (reason && !VALID_REASONS.includes(reason)) {
      throw new AppError(`Invalid reason. Valid reasons are: ${VALID_REASONS.join(', ')}`, 400);
    }

    // Check if product exists
    const product = await productModel.findById(product_id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Check stock for OUT movements
    if (movement_type === 'OUT') {
      if (product.stock_cached < quantity) {
        throw new AppError(`Insufficient stock. Available: ${product.stock_cached}, Requested: ${quantity}`, 400);
      }
    }

    // Map movement_type and reason to movement_type_id from DB
    // In our schema, movement_type_id refers to stock_movement_types (purchase, sale, waste, adjustment, consumption)
    // Normalize to uppercase for consistency
    let typeCode;
    const movementTypeUpper = movement_type.toUpperCase();
    
    // Priority: movement_type WASTE > reason
    if (movementTypeUpper === 'WASTE') {
      typeCode = 'waste';
    } else if (movementTypeUpper === 'OUT') {
      typeCode = 'sale';
    } else if (movementTypeUpper === 'IN') {
      typeCode = 'purchase';
    } else if (movementTypeUpper === 'ADJUSTMENT') {
      typeCode = 'adjustment';
    } else if (reason) {
      // Use reason if provided and no match on movement_type
      typeCode = reason.toLowerCase();
    } else {
      typeCode = 'adjustment';
    }
    
    // Find the ID for the typeCode
    const movementTypes = await inventoryModel.getMovementTypes();
    const typeObj = movementTypes.find(t => t.code === typeCode.toLowerCase());
    
    if (!typeObj) {
      // Fallback if type not found - use adjustment
      typeCode = 'adjustment';
    }

    const typeIdResult = await inventoryModel.getMovementTypeIdByCode(typeCode.toLowerCase());
    if (!typeIdResult) {
      throw new AppError(`Movement type code '${typeCode}' not found in database`, 500);
    }

    // Prepare final quantity (negative for OUT and WASTE)
    let finalQuantity = quantity;
    if (movementTypeUpper === 'OUT' || movementTypeUpper === 'WASTE' || typeCode === 'waste' || typeCode === 'sale') {
      finalQuantity = -Math.abs(quantity);
    } else {
      finalQuantity = Math.abs(quantity);
    }

    // Create the movement record
    const movement = await inventoryModel.create({
      product_id,
      movement_type_id: typeIdResult,
      quantity: finalQuantity,
      unit_cost: unit_cost || product.cost_price,
      reference_table: movementData.reference_table || 'manual_adjustment',
      reference_id,
      user_id
    });

    // Manual stock update since DB triggers might have permission issues
    const updatedProduct = await productModel.updateStock(product_id, finalQuantity);

    // Manual low stock check
    if (updatedProduct && updatedProduct.stock_cached <= updatedProduct.min_stock) {
      const alertModel = require('../../alerts/models/alertModel');
      await alertModel.create({
        type: 'low_stock',
        severity: 'warning',
        message: `Stock bajo detectado: ${updatedProduct.name} (${updatedProduct.stock_cached} ${updatedProduct.unit_of_measure})`,
        reference_table: 'products',
        reference_id: updatedProduct.id
      });
    }

    return movement;
  }

  /**
   * Get kardex history for a product
   * @param {number} productId - Product ID
   * @param {number} limit - Limit results
   * @returns {Promise<Array>} Kardex entries
   */
  async getKardex(productId, limit = 50) {
    const product = await productModel.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const kardex = await inventoryModel.getKardex(productId, limit);
    
    // Calculate running balance
    let balance = product.stock_cached;
    return kardex.map(movement => {
      if (movement.movement_type === 'OUT') {
        balance += movement.quantity;
      } else {
        balance -= movement.quantity;
      }
      return {
        ...movement,
        balance
      };
    }).reverse();
  }

  /**
   * Get products with low stock (below minimum)
   * @returns {Promise<Array>} Products with low stock
   */
  async getLowStockProducts() {
    return await inventoryModel.getLowStockProducts();
  }

  /**
   * Get inventory summary by category
   * @returns {Promise<Array>} Inventory summary
   */
  async getInventorySummary() {
    return await inventoryModel.getInventorySummary();
  }

  /**
   * Get movement statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Movement statistics
   */
  async getMovementStats(filters) {
    return await inventoryModel.getMovementStats(filters);
  }

  /**
   * Get current stock for a product
   * @param {number} productId - Product ID
   * @returns {Promise<number>} Current stock
   */
  async getCurrentStock(productId) {
    const product = await productModel.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    return product.stock_cached;
  }

  /**
   * Bulk create inventory movements (for batch operations)
   * @param {Array} movements - Array of movement data
   * @returns {Promise<Array>} Created movements
   */
  async bulkCreateMovements(movements) {
    if (!Array.isArray(movements) || movements.length === 0) {
      throw new AppError('Movements array is required', 400);
    }

    const results = [];
    for (const movement of movements) {
      const created = await this.createMovement(movement);
      results.push(created);
    }
    return results;
  }

  /**
   * Get stock adjustment history
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Adjustment history
   */
  async getAdjustmentHistory(filters) {
    const adjustmentReasons = ['adjustment', 'correction', 'inventory_count'];
    return await inventoryModel.findAll({
      ...filters,
      reason: adjustmentReasons
    });
  }

  /**
   * Validate stock availability for multiple products
   * @param {Array} items - Array of {product_id, quantity}
   * @returns {Promise<Object>} Validation result
   */
  async validateStockAvailability(items) {
    // Validate input
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('Items array is required and must not be empty', 400);
    }

    const unavailable = [];
    
    for (const item of items) {
      // Validate item structure
      if (!item.product_id || !item.quantity) {
        unavailable.push({
          product_id: item.product_id || 'unknown',
          reason: 'Product ID and quantity are required'
        });
        continue;
      }

      // Validate quantity is positive
      if (item.quantity <= 0) {
        unavailable.push({
          product_id: item.product_id,
          reason: 'Quantity must be greater than 0'
        });
        continue;
      }

      const product = await productModel.findById(item.product_id);
      if (!product) {
        unavailable.push({
          product_id: item.product_id,
          reason: 'Product not found'
        });
      } else if (product.stock_cached < item.quantity) {
        unavailable.push({
          product_id: item.product_id,
          product_name: product.name,
          available: product.stock_cached,
          requested: item.quantity,
          reason: 'Insufficient stock'
        });
      }
    }
    
    return {
      valid: unavailable.length === 0,
      unavailable,
      total_items: items.length,
      valid_items: items.length - unavailable.length
    };
  }
}

module.exports = new InventoryService();

