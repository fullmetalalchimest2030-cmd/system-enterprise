/**
 * Inventory Controller - HTTP layer for inventory operations
 * @module modules/inventory/controllers/inventoryController
 */

const inventoryService = require('../services/inventoryService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

class InventoryController {
  /**
   * Get all inventory movements with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getAllMovements = asyncHandler(async (req, res, next) => {
    const filters = {
      product_id: req.query.product_id,
      movement_type: req.query.movement_type,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const movements = await inventoryService.getAllMovements(filters);
    res.json(successResponse(movements, 'Inventory movements retrieved successfully'));
  });

  /**
   * Get movement by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getMovementById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const movement = await inventoryService.getMovementById(id);
    res.json(successResponse(movement, 'Inventory movement retrieved successfully'));
  });

  /**
   * Create a new inventory movement (stock IN/OUT)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  createMovement = asyncHandler(async (req, res, next) => {
    const movementData = {
      ...req.body,
      user_id: req.user.id // From auth middleware
    };
    
    const movement = await inventoryService.createMovement(movementData);
    res.status(201).json(successResponse(movement, 'Inventory movement created successfully'));
  });

  /**
   * Get kardex history for a product
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getKardex = asyncHandler(async (req, res, next) => {
    const { productId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    
    const kardex = await inventoryService.getKardex(productId, limit);
    res.json(successResponse(kardex, 'Kardex history retrieved successfully'));
  });

  /**
   * Get products with low stock (alerts)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getLowStockProducts = asyncHandler(async (req, res, next) => {
    const products = await inventoryService.getLowStockProducts();
    res.json(successResponse(products, 'Inventory movements low stock retrieved successfully'));
  });

  /**
   * Get inventory summary by category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getInventorySummary = asyncHandler(async (req, res, next) => {
    const summary = await inventoryService.getInventorySummary();
    res.json(successResponse(summary, 'Inventory summary retrieved successfully'));
  });

  /**
   * Get movement statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getMovementStats = asyncHandler(async (req, res, next) => {
    const filters = {
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };
    
    const stats = await inventoryService.getMovementStats(filters);
    res.json(successResponse(stats, 'Movement statistics retrieved successfully'));
  });

  /**
   * Get current stock for a product
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getCurrentStock = asyncHandler(async (req, res, next) => {
    const { productId } = req.params;
    const stock = await inventoryService.getCurrentStock(productId);
    res.json(successResponse({ product_id: productId, stock }, 'Current stock retrieved successfully'));
  });

  /**
   * Bulk create inventory movements
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  bulkCreateMovements = asyncHandler(async (req, res, next) => {
    const movements = req.body.movements.map(m => ({
      ...m,
      user_id: req.user.id
    }));
    
    const results = await inventoryService.bulkCreateMovements(movements);
    res.status(201).json(successResponse(results, 'Bulk movements created successfully'));
  });

  /**
   * Validate stock availability
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  validateStock = asyncHandler(async (req, res, next) => {
    const { items } = req.body;
    const result = await inventoryService.validateStockAvailability(items);
    res.json(successResponse(result, 'Stock validation completed'));
  });
}

module.exports = new InventoryController();
