/**
 * Recipe Model - Recipe management for floral arrangements
 * @module modules/recipes/models/recipeModel
 * Based on baseDatos.txt schema
 */

const db = require('../../../config/database');

class RecipeModel {
  /**
   * Get all recipes with optional filters
   * @param {Object} filters - Filter options (is_active, category_id, limit)
   * @returns {Promise<Array>} Recipes array
   */
  async findAll(filters = {}) {
    let query = `
      SELECT r.*, c.name as category_name
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.deleted_at IS NULL
    `;
    
    const params = [];
    
    if (filters.is_active !== undefined) {
      params.push(filters.is_active);
      query += ` AND r.is_active = ${params.length}`;
    }
    
    if (filters.category_id) {
      params.push(filters.category_id);
      query += ` AND r.category_id = ${params.length}`;
    }
    
    query += ` ORDER BY r.name ASC`;
    
    if (filters.limit) {
      params.push(filters.limit);
      query += ` LIMIT ${params.length}`;
    }
    
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get recipes by category
   * @param {number} categoryId - Category ID
   * @returns {Promise<Array>} Recipes in category
   */
  async findByCategory(categoryId) {
    const result = await db.query(`
      SELECT r.*, c.name as category_name
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.category_id = $1 AND r.deleted_at IS NULL
      ORDER BY r.name ASC
    `, [categoryId]);
    return result.rows;
  }

  /**
   * Get recipe by ID
   * @param {number} id - Recipe ID
   * @returns {Promise<Object>} Recipe object with items
   */
  async findById(id) {
    const result = await db.query(`
      SELECT r.* 
      FROM recipes r
      WHERE r.id = $1 AND r.deleted_at IS NULL
    `, [id]);
    
    if (!result.rows[0]) return null;
    
    // Get recipe ingredients
    const ingredientsResult = await db.query(`
      SELECT ri.*, p.name as product_name, p.cost_price
      FROM recipe_items ri
      LEFT JOIN products p ON ri.product_id = p.id
      WHERE ri.recipe_id = $1 AND ri.deleted_at IS NULL
    `, [id]);
    
    return {
      ...result.rows[0],
      ingredients: ingredientsResult.rows
    };
  }

  /**
   * Create a new recipe
   * @param {Object} recipe - Recipe data
   * @returns {Promise<Object>} Created recipe
   */
  async create(recipe) {
    const { name, description, category_id, total_cost, suggested_price, preparation_time, is_active, ingredients, image_url } = recipe;
    
    const result = await db.query(`
      INSERT INTO recipes (name, description, category_id, total_cost, suggested_price, preparation_time, is_active, image_url, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `, [name, description, category_id, total_cost, suggested_price, preparation_time, is_active, image_url || null]);
    
    const newRecipe = result.rows[0];
    
    // Add recipe ingredients
    if (ingredients && ingredients.length > 0) {
      for (const item of ingredients) {
        await db.query(`
          INSERT INTO recipe_items (recipe_id, product_id, quantity)
          VALUES ($1, $2, $3)
        `, [newRecipe.id, item.product_id, item.quantity]);
      }
    }
    
    return this.findById(newRecipe.id);
  }

  /**
   * Update a recipe
   * @param {number} id - Recipe ID
   * @param {Object} recipe - Recipe data
   * @returns {Promise<Object>} Updated recipe
   */
  async update(id, recipe) {
    const { name, description, category_id, total_cost, suggested_price, preparation_time, is_active, ingredients, image_url } = recipe;
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      let result;
      try {
        result = await client.query(`
          UPDATE recipes 
          SET name = COALESCE($1, name), 
              description = COALESCE($2, description),
              category_id = COALESCE($3, category_id),
              total_cost = COALESCE($4, total_cost),
              suggested_price = COALESCE($5, suggested_price),
              preparation_time = COALESCE($6, preparation_time),
              is_active = COALESCE($7, is_active),
              image_url = COALESCE($8, image_url),
              updated_at = NOW()
          WHERE id = $9 AND deleted_at IS NULL
          RETURNING *
        `, [name, description, category_id, total_cost, suggested_price, preparation_time, is_active, image_url, id]);
      } catch (err) {
        if (err.message.includes('updated_at')) {
          result = await client.query(`
            UPDATE recipes 
            SET name = COALESCE($1, name), 
                description = COALESCE($2, description),
                category_id = COALESCE($3, category_id),
                total_cost = COALESCE($4, total_cost),
                suggested_price = COALESCE($5, suggested_price),
                preparation_time = COALESCE($6, preparation_time),
                is_active = COALESCE($7, is_active),
                image_url = COALESCE($8, image_url)
            WHERE id = $9 AND deleted_at IS NULL
            RETURNING *
          `, [name, description, category_id, total_cost, suggested_price, preparation_time, is_active, image_url, id]);
        } else {
          throw err;
        }
      }

      if (result.rows.length === 0) {
        throw new Error('Recipe not found');
      }

      if (ingredients) {
        await client.query(
          'DELETE FROM recipe_items WHERE recipe_id = $1',
          [id]
        );
        for (const item of ingredients) {
          await client.query(`
            INSERT INTO recipe_items (recipe_id, product_id, quantity)
            VALUES ($1, $2, $3)
          `, [id, item.product_id, item.quantity]);
        }
      }

      await client.query('COMMIT');
      return this.findById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a recipe (soft delete)
   * @param {number} id - Recipe ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    const result = await db.query(
      'UPDATE recipes SET deleted_at = NOW() WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Calculate recipe cost based on items
   * @param {number} recipeId - Recipe ID
   * @returns {Promise<number>} Total cost
   */
  async calculateCost(recipeId) {
    const result = await db.query(`
      SELECT SUM(ri.quantity * p.cost_price) as total_cost
      FROM recipe_items ri
      JOIN products p ON ri.product_id = p.id
      WHERE ri.recipe_id = $1 AND ri.deleted_at IS NULL
    `, [recipeId]);
    
    return parseFloat(result.rows[0].total_cost) || 0;
  }

  /**
   * Check if recipe can be produced with current stock
   * @param {number} recipeId - Recipe ID
   * @returns {Promise<Object>} Availability info
   */
  async checkStockAvailability(recipeId) {
    const items = await db.query(`
      SELECT ri.product_id, ri.quantity, p.stock_cached, p.name
      FROM recipe_items ri
      JOIN products p ON ri.product_id = p.id
      WHERE ri.recipe_id = $1 AND ri.deleted_at IS NULL
    `, [recipeId]);
    
    const unavailable = [];
    for (const item of items.rows) {
      // Convert to numbers for proper comparison (PostgreSQL returns strings)
      const stock = parseFloat(item.stock_cached);
      const required = parseFloat(item.quantity);
      
      if (stock < required) {
        unavailable.push({
          product: item.name,
          required: required,
          available: stock
        });
      }
    }
    
    return {
      canProduce: unavailable.length === 0,
      unavailable
    };
  }

  /**
   * Get all recipes that can be produced with current stock
   * Only returns active recipes with sufficient stock
   * @returns {Promise<Array>} Available recipes
   */
  async getAvailableRecipes() {
    // Get only active recipes
    const result = await db.query(`
      SELECT r.*, c.name as category_name
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.deleted_at IS NULL AND r.is_active = true
      ORDER BY r.name ASC
    `);
    
    const availableRecipes = [];
    
    for (const recipe of result.rows) {
      const availability = await this.checkStockAvailability(recipe.id);
      if (availability.canProduce) {
        availableRecipes.push(recipe);
      }
    }
    
    return availableRecipes;
  }

  /**
   * Get popular recipes based on sales count
   * @param {number} limit - Maximum number of recipes to return
   * @returns {Promise<Array>} Popular recipes with sales count
   */
  async getPopularRecipes(limit = 10) {
    const result = await db.query(`
      SELECT 
        r.id,
        r.name,
        r.suggested_price,
        r.created_at,
        COALESCE(SUM(si.quantity), 0) as sales_count,
        COALESCE(SUM(si.quantity * si.unit_price_at_sale), 0) as total_revenue
      FROM recipes r
      LEFT JOIN sale_items si ON r.id = si.recipe_id
      WHERE r.deleted_at IS NULL
      GROUP BY r.id, r.name, r.suggested_price, r.created_at
      ORDER BY sales_count DESC, total_revenue DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  async findCatalog() {
    const result = await db.query(`
      SELECT name, description, suggested_price as price, image_url
      FROM recipes
      WHERE deleted_at IS NULL AND show_in_catalog = true AND is_active = true
      ORDER BY name ASC
    `);
    return result.rows;
  }

  async setCatalogVisibility(id, show) {
    const result = await db.query(
      'UPDATE recipes SET show_in_catalog = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, name, show_in_catalog',
      [show, id]
    );
    return result.rows[0];
  }
}

module.exports = new RecipeModel();
