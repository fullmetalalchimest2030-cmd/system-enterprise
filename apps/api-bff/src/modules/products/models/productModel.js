/**
 * Product model
 * @module modules/products/models/productModel
 * Based on baseDatos.txt schema
 */

const db = require('../../../config/database');

class ProductModel {
  /**
   * Get all products (excluding soft deleted)
   * @returns {Promise<Array>} Products array
   */
  async findAll() {
    const result = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.created_at DESC
    `);
    return result.rows;
  }

  /**
   * Get product by ID
   * @param {number} id - Product ID
   * @returns {Promise<Object>} Product object
   */
  async findById(id) {
    const result = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `, [id]);
    return result.rows[0];
  }

  /**
   * Create a new product
   * @param {Object} product - Product data
   * @returns {Promise<Object>} Created product
   */
  async create(product) {
    const { category_id, name, sku, unit_of_measure, cost_price, sell_price, stock_cached, min_stock, description, image_url } = product;
    
    const result = await db.query(`
      INSERT INTO products (category_id, name, sku, unit_of_measure, cost_price, sell_price, stock_cached, min_stock, description, image_url, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `, [category_id, name, sku, unit_of_measure, cost_price, sell_price, stock_cached || 0, min_stock || 0, description || null, image_url || null]);
    return result.rows[0];
  }

  /**
   * Update a product
   * @param {number} id - Product ID
   * @param {Object} product - Product data
   * @returns {Promise<Object>} Updated product
   */
  async update(id, product) {
    const { category_id, name, sku, unit_of_measure, cost_price, sell_price, stock_cached, min_stock, description, image_url } = product;
    
    const result = await db.query(`
      UPDATE products 
      SET category_id = COALESCE($1, category_id),
          name = COALESCE($2, name),
          sku = COALESCE($3, sku),
          unit_of_measure = COALESCE($4, unit_of_measure),
          cost_price = COALESCE($5, cost_price),
          sell_price = COALESCE($6, sell_price),
          stock_cached = COALESCE($7, stock_cached),
          min_stock = COALESCE($8, min_stock),
          description = COALESCE($9, description),
          image_url = COALESCE($10, image_url)
      WHERE id = $11 AND deleted_at IS NULL
      RETURNING *
    `, [category_id, name, sku, unit_of_measure, cost_price, sell_price, stock_cached, min_stock, description, image_url, id]);
    return result.rows[0];
  }

  /**
   * Soft delete a product
   * @param {number} id - Product ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    const result = await db.query(
      'UPDATE products SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Get products by category
   * @param {number} categoryId - Category ID
   * @returns {Promise<Array>} Products array
   */
  async findByCategory(categoryId) {
    const result = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = $1 AND p.deleted_at IS NULL
      ORDER BY p.created_at DESC
    `, [categoryId]);
    return result.rows;
  }

  /**
   * Get products with low stock
   * @returns {Promise<Array>} Products array
   */
  async findLowStock() {
    const result = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.deleted_at IS NULL AND p.stock_cached <= p.min_stock
      ORDER BY p.stock_cached ASC
    `);
    return result.rows;
  }

  /**
   * Update stock quantity
   * @param {number} id - Product ID
   * @param {number} quantity - Quantity to add (positive) or remove (negative)
   * @returns {Promise<Object>} Updated product
   */
  async updateStock(id, quantity) {
    // We don't use GREATEST(0, ...) here to allow negative stock if the application permits it
    // But we ensure the update is recorded correctly
    try {
      const result = await db.query(`
        UPDATE products 
        SET stock_cached = COALESCE(stock_cached, 0) + $1,
            updated_at = NOW()
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING *
      `, [quantity, id]);
      return result.rows[0];
    } catch (error) {
      // Fallback if updated_at column doesn't exist
      if (error.message.includes('updated_at')) {
        const result = await db.query(`
          UPDATE products 
          SET stock_cached = COALESCE(stock_cached, 0) + $1
          WHERE id = $2 AND deleted_at IS NULL
          RETURNING *
        `, [quantity, id]);
        return result.rows[0];
      }
      throw error;
    }
  }

  /**
   * Search products by name
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Products array
   */
  async search(searchTerm) {
    const result = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.deleted_at IS NULL AND p.name ILIKE $1
      ORDER BY p.created_at DESC
    `, [`%${searchTerm}%`]);
    return result.rows;
  }

  async findCatalog() {
    const result = await db.query(`
      SELECT name, description, sell_price as price, image_url
      FROM products
      WHERE deleted_at IS NULL AND show_in_catalog = true
      ORDER BY name ASC
    `);
    return result.rows;
  }

  async setCatalogVisibility(id, show) {
    const result = await db.query(
      'UPDATE products SET show_in_catalog = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, name, show_in_catalog',
      [show, id]
    );
    return result.rows[0];
  }
}

module.exports = new ProductModel();
