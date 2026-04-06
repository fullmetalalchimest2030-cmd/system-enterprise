/**
 * Category model
 * @module modules/categories/models/categoryModel
 * Based on baseDatos.txt schema
 */

const db = require('../../../config/database');

class CategoryModel {
  /**
   * Get all categories (excluding soft deleted)
   * @returns {Promise<Array>} Categories array
   */
  async findAll() {
    const result = await db.query(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM products WHERE category_id = c.id AND deleted_at IS NULL) as product_count
      FROM categories c
      WHERE c.deleted_at IS NULL
      ORDER BY c.name ASC
    `);
    return result.rows;
  }

  /**
   * Get category by ID
   * @param {number} id - Category ID
   * @returns {Promise<Object>} Category object
   */
  async findById(id) {
    const result = await db.query(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM products WHERE category_id = c.id AND deleted_at IS NULL) as product_count
      FROM categories c 
      WHERE c.id = $1 AND c.deleted_at IS NULL
    `, [id]);
    return result.rows[0];
  }

  /**
   * Get category by name
   * @param {string} name - Category name
   * @returns {Promise<Object>} Category object
   */
  async findByName(name) {
    const result = await db.query(
      'SELECT * FROM categories WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL',
      [name]
    );
    return result.rows[0];
  }

  /**
   * Create a new category
   * @param {Object} category - Category data
   * @returns {Promise<Object>} Created category
   */
  async create(category) {
    const { name, description } = category;
    
    const result = await db.query(`
      INSERT INTO categories (name, description, created_at)
      VALUES ($1, $2, NOW())
      RETURNING *
    `, [name, description]);
    return result.rows[0];
  }

  /**
   * Update a category
   * @param {number} id - Category ID
   * @param {Object} category - Category data
   * @returns {Promise<Object>} Updated category
   */
  async update(id, category) {
    const { name, description } = category;
    
    const result = await db.query(`
      UPDATE categories 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description)
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING *
    `, [name, description, id]);
    return result.rows[0];
  }

  /**
   * Delete a category (soft delete)
   * @param {number} id - Category ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    const result = await db.query(
      'UPDATE categories SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }
}

module.exports = new CategoryModel();
