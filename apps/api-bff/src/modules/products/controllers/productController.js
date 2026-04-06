/**
 * Product controller
 * @module modules/products/controllers/productController
 */

const productService = require('../services/productService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

/**
 * Product controller class
 */
class ProductController {
  /**
   * Get all products
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getAllProducts = asyncHandler(async (req, res, next) => {
    const includeInactive = req.query.includeInactive === 'true';
    const products = await productService.getAllProducts(includeInactive);
    res.json(successResponse(products, 'Products retrieved successfully'));
  });

  /**
   * Get product by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getProductById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    res.json(successResponse(product, 'Product retrieved successfully'));
  });

  /**
   * Create a new product
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  createProduct = asyncHandler(async (req, res, next) => {
    const product = await productService.createProduct(req.body);
    res.status(201).json(successResponse(product, 'Product created successfully'));
  });

  /**
   * Update a product
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  updateProduct = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const product = await productService.updateProduct(id, req.body);
    res.json(successResponse(product, 'Product updated successfully'));
  });

  /**
   * Delete a product (soft delete)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  deleteProduct = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    await productService.deleteProduct(id);
    res.json(successResponse(null, 'Product deleted successfully'));
  });

  /**
   * Get products by category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getProductsByCategory = asyncHandler(async (req, res, next) => {
    const { categoryId } = req.params;
    const products = await productService.getProductsByCategory(categoryId);
    res.json(successResponse(products, 'Products retrieved successfully'));
  });

  /**
   * Get products with low stock
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getLowStockProducts = asyncHandler(async (req, res, next) => {
    const products = await productService.getLowStockProducts();
    res.json(successResponse(products, 'Product catalog low stock retrieved successfully'));
  });

  /**
   * Update product stock
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  updateStock = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { quantity, operation } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Valid quantity is required', statusCode: 400 }
      });
    }

    const product = await productService.updateStock(id, quantity, operation || 'add');
    res.json(successResponse(product, 'Stock updated successfully'));
  });

  /**
   * Search products
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  searchProducts = asyncHandler(async (req, res, next) => {
    const { q } = req.query;
    const products = await productService.searchProducts(q);
    res.json(successResponse(products, 'Products search completed'));
  });

  /**
   * Restore a soft-deleted product
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  restoreProduct = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const product = await productService.restoreProduct(id);
    res.json(successResponse(product, 'Product restored successfully'));
  });

  setCatalogVisibility = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { show_in_catalog } = req.body;
    const product = await productService.setCatalogVisibility(id, show_in_catalog);
    res.json(successResponse(product, 'Product catalog visibility updated'));
  });

  getCatalogProducts = asyncHandler(async (req, res, next) => {
    const products = await productService.getCatalogProducts();
    res.json(successResponse(products, 'Catalog products retrieved successfully'));
  });
}

module.exports = new ProductController();
