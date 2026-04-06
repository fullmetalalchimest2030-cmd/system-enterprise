/**
 * Product service
 * @module modules/products/services/productService
 */

const productModel = require('../models/productModel');
const { AppError } = require('../../../shared/middleware/errorHandler');

/**
 * Product service class
 */
class ProductService {
  /**
   * Get all products
   * @param {boolean} includeInactive - Whether to include inactive products
   * @returns {Promise<Array>} Products array
   */
  async getAllProducts(includeInactive = false) {
    return await productModel.findAll(includeInactive);
  }

  /**
   * Get product by ID
   * @param {number} id - Product ID
   * @returns {Promise<Object>} Product object
   */
  async getProductById(id) {
    const product = await productModel.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    return product;
  }

  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @returns {Promise<Object>} Created product
   */
  async createProduct(productData) {
    // Normalize field names from frontend to database schema
    // Frontend sends: price, cost, current_stock
    // Database expects: sell_price, cost_price, stock_cached
    const normalizedData = {
      name: productData.name,
      description: productData.description,
      category_id: productData.category_id,
      sku: productData.sku,
      unit_of_measure: productData.unit_of_measure,
      cost_price: productData.cost_price || productData.cost,
      sell_price: productData.sell_price || productData.price,
      stock_cached: productData.stock_cached || productData.current_stock,
      min_stock: productData.min_stock,
      image_url: productData.image_url,
    };

    const { name, description, category_id, sku, unit_of_measure, cost_price, sell_price, stock_cached, min_stock, image_url } = normalizedData;

    // Validate required fields
    if (!name) {
      throw new AppError('Product name is required', 400);
    }

    if (!unit_of_measure) {
      throw new AppError('Unit of measure is required', 400);
    }

    if (sell_price === undefined || sell_price < 0) {
      throw new AppError('Valid price is required', 400);
    }

    if (cost_price === undefined || cost_price < 0) {
      throw new AppError('Valid cost is required', 400);
    }

    // Validate category exists if provided
    if (category_id) {
      const categoryModel = require('../../categories/models/categoryModel');
      const category = await categoryModel.findById(category_id);
      if (!category) {
        throw new AppError('Category not found', 404);
      }
    }

    return await productModel.create({
      name,
      description,
      category_id,
      sku,
      unit_of_measure,
      cost_price,
      sell_price,
      stock_cached: stock_cached || 0,
      min_stock: min_stock || 0,
      image_url,
    });
  }

  /**
   * Update a product
   * @param {number} id - Product ID
   * @param {Object} productData - Product data to update
   * @returns {Promise<Object>} Updated product
   */
  async updateProduct(id, productData) {
    const existingProduct = await productModel.findById(id);
    if (!existingProduct) {
      throw new AppError('Product not found', 404);
    }

    // Validate category exists if provided
    if (productData.category_id) {
      const categoryModel = require('../../categories/models/categoryModel');
      const category = await categoryModel.findById(productData.category_id);
      if (!category) {
        throw new AppError('Category not found', 404);
      }
    }

    // Normalize field names from frontend to database schema
    const normalizedData = {
      category_id: productData.category_id,
      name: productData.name,
      sku: productData.sku,
      unit_of_measure: productData.unit_of_measure,
      cost_price: productData.cost_price || productData.cost,
      sell_price: productData.sell_price || productData.price,
      stock_cached: productData.stock_cached || productData.current_stock,
      min_stock: productData.min_stock,
      description: productData.description,
      image_url: productData.image_url,
    };

    return await productModel.update(id, normalizedData);
  }

  /**
   * Delete a product (soft delete)
   * @param {number} id - Product ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteProduct(id) {
    const existingProduct = await productModel.findById(id);
    if (!existingProduct) {
      throw new AppError('Product not found', 404);
    }

    return await productModel.softDelete(id);
  }

  /**
   * Get products by category
   * @param {number} categoryId - Category ID
   * @returns {Promise<Array>} Products array
   */
  async getProductsByCategory(categoryId) {
    return await productModel.findByCategory(categoryId);
  }

  /**
   * Get products with low stock
   * @returns {Promise<Array>} Products array
   */
  async getLowStockProducts() {
    return await productModel.findLowStock();
  }

  /**
   * Update stock quantity
   * @param {number} id - Product ID
   * @param {number} quantity - Quantity to add (positive) or remove (negative)
   * @param {string} operation - 'add' or 'remove'
   * @returns {Promise<Object>} Updated product
   */
  async updateStock(id, quantity, operation = 'add') {
    const existingProduct = await productModel.findById(id);
    if (!existingProduct) {
      throw new AppError('Product not found', 404);
    }

    // Calculate the actual quantity change
    let quantityChange = quantity;
    if (operation === 'remove') {
      quantityChange = -quantity;
      
      // Check if we have enough stock
      if (existingProduct.current_stock < quantity) {
        throw new AppError('Insufficient stock', 400);
      }
    }

    return await productModel.updateStock(id, quantityChange);
  }

  /**
   * Search products
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Products array
   */
  async searchProducts(searchTerm) {
    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new AppError('Search term must be at least 2 characters', 400);
    }
    return await productModel.search(searchTerm);
  }

  async getCatalogProducts() {
    return await productModel.findCatalog();
  }

  async setCatalogVisibility(id, show) {
    const existing = await productModel.findById(id);
    if (!existing) throw new AppError('Product not found', 404);
    return await productModel.setCatalogVisibility(id, show);
  }

  /**
   * Get active products
   * @returns {Promise<Array>} Active products array
   */
  async getActiveProducts() {
    return await productModel.findActive();
  }

  /**
   * Restore a soft-deleted product
   * @param {number} id - Product ID
   * @returns {Promise<Object>} Restored product
   */
  async restoreProduct(id) {
    const existingProduct = await productModel.findById(id);
    if (!existingProduct) {
      throw new AppError('Product not found', 404);
    }

    return await productModel.update(id, { is_active: true });
  }
}

module.exports = new ProductService();
