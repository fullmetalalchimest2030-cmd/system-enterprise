/**
 * Inventory Model - Stock movements and Kardex history
 * @module modules/inventory/models/inventoryModel
 * Based on baseDatos.txt schema
 */

const db = require('../../../config/database');

class InventoryModel {
  /**
   * Get all stock movements
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Stock movements
   */
  async findAll(filters = {}) {
    let query = `
      SELECT sm.*, 
             p.name as product_name, 
             smt.code as movement_type_code,
             u.first_name as user_first_name, 
             u.last_name as user_last_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN stock_movement_types smt ON sm.movement_type_id = smt.id
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (filters.product_id) {
      query += ` AND sm.product_id = $${paramCount}`;
      params.push(filters.product_id);
      paramCount++;
    }

    if (filters.movement_type_id) {
      query += ` AND sm.movement_type_id = $${paramCount}`;
      params.push(filters.movement_type_id);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND sm.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND sm.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    query += ` ORDER BY sm.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get all stock movement types
   * @returns {Promise<Array>} Movement types
   */
  async getMovementTypes() {
    const result = await db.query(`SELECT id, code FROM stock_movement_types`);
    return result.rows;
  }

  /**
   * Get movement type ID by code
   * @param {string} code - Movement type code
   * @returns {Promise<number>} Movement type ID
   */
  async getMovementTypeIdByCode(code) {
    const result = await db.query(
      `SELECT id FROM stock_movement_types WHERE code = $1`,
      [code]
    );
    return result.rows[0]?.id;
  }

  /**
   * Get stock movement by ID
   * @param {number} id - Movement ID
   * @returns {Promise<Object>} Movement object
   */
  async findById(id) {
    const result = await db.query(`
      SELECT sm.*, 
             p.name as product_name, 
             smt.code as movement_type_code,
             u.first_name as user_first_name, 
             u.last_name as user_last_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN stock_movement_types smt ON sm.movement_type_id = smt.id
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE sm.id = $1
    `, [id]);
    return result.rows[0];
  }

  /**
   * Create a new stock movement
   * @param {Object} movement - Movement data
   * @returns {Promise<Object>} Created movement
   */
  async create(movement) {
    const { product_id, movement_type_id, quantity, unit_cost, reference_table, reference_id, user_id } = movement;

    const result = await db.query(`
      INSERT INTO stock_movements (product_id, movement_type_id, quantity, unit_cost, reference_table, reference_id, user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [product_id, movement_type_id, quantity, unit_cost, reference_table, reference_id, user_id]);

    return result.rows[0];
  }

  /**
   * Get current stock for a product
   * @param {number} productId - Product ID
   * @returns {Promise<number>} Current stock
   */
  async getCurrentStock(productId) {
    const result = await db.query(
      `SELECT stock_cached FROM products WHERE id = $1`,
      [productId]
    );
    return result.rows[0]?.stock_cached || 0;
  }

  /**
   * Get kardex history for a product
   * @param {number} productId - Product ID
   * @param {number} limit - Limit results
   * @returns {Promise<Array>} Kardex entries
   */
  async getKardex(productId, limit = 50) {
    const result = await db.query(`
      SELECT sm.*, 
             p.name as product_name,
             smt.code as movement_type_code,
             u.first_name as user_first_name,
             u.last_name as user_last_name
      FROM stock_movements sm
      LEFT JOIN products p ON sm.product_id = p.id
      LEFT JOIN stock_movement_types smt ON sm.movement_type_id = smt.id
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE sm.product_id = $1
      ORDER BY sm.created_at DESC
      LIMIT $2
    `, [productId, limit]);
    return result.rows;
  }

  /**
   * Get products below minimum stock
   * @returns {Promise<Array>} Products with low stock
   */
  async getLowStockProducts() {
    const result = await db.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.deleted_at IS NULL AND p.stock_cached <= p.min_stock
      ORDER BY (p.min_stock - p.stock_cached) DESC
    `);
    return result.rows;
  }

  /**
   * Get inventory summary by category
   * @returns {Promise<Array>} Inventory summary
   */
  async getInventorySummary() {
    const result = await db.query(`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        COUNT(p.id) as total_products,
        COALESCE(SUM(p.stock_cached), 0) as total_stock,
        COALESCE(SUM(p.stock_cached * p.cost_price), 0) as total_value,
        COALESCE(AVG(p.stock_cached), 0) as average_stock
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.deleted_at IS NULL
      WHERE c.deleted_at IS NULL
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);
    return result.rows;
  }

  /**
   * Get movement statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Movement statistics
   */
  async getMovementStats(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND sm.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      dateFilter += ` AND sm.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    // Total movements
    const totalResult = await db.query(`
      SELECT 
        COUNT(*) as total_movements,
        COUNT(CASE WHEN sm.quantity > 0 THEN 1 END) as inbound_movements,
        COUNT(CASE WHEN sm.quantity < 0 THEN 1 END) as outbound_movements,
        COALESCE(SUM(CASE WHEN sm.quantity > 0 THEN sm.quantity ELSE 0 END), 0) as total_inbound,
        COALESCE(SUM(CASE WHEN sm.quantity < 0 THEN ABS(sm.quantity) ELSE 0 END), 0) as total_outbound
      FROM stock_movements sm
      WHERE 1=1${dateFilter}
    `, params);

    // Movements by type
    const typeResult = await db.query(`
      SELECT 
        smt.code as movement_type,
        COUNT(*) as count,
        COALESCE(SUM(ABS(sm.quantity)), 0) as total_quantity
      FROM stock_movements sm
      JOIN stock_movement_types smt ON sm.movement_type_id = smt.id
      WHERE 1=1${dateFilter}
      GROUP BY smt.code
      ORDER BY count DESC
    `, params);

    return {
      summary: totalResult.rows[0],
      by_type: typeResult.rows
    };
  }
}

module.exports = new InventoryModel();