/**
 * Recipe Service - Business logic for recipe management
 * @module modules/recipes/services/recipeService
 */

const recipeModel = require('../models/recipeModel');
const productModel = require('../../products/models/productModel');
const inventoryService = require('../../inventory/services/inventoryService');
const { AppError } = require('../../../shared/middleware/errorHandler');
const { roundToTenCents } = require('../../../shared/utils/currencyUtils');

class RecipeService {
  /**
   * Get all recipes with filters
   * @param {Object} filters - Filter options (is_active, category_id, limit)
   * @returns {Promise<Array>} Recipes array
   */
  async getAllRecipes(filters = {}) {
    // Process query params to proper types
    const processedFilters = {};
    
    if (filters.is_active !== undefined) {
      processedFilters.is_active = filters.is_active === true || filters.is_active === 'true';
    }
    
    if (filters.category_id) {
      processedFilters.category_id = parseInt(filters.category_id) || filters.category_id;
    }
    
    if (filters.limit) {
      processedFilters.limit = parseInt(filters.limit) || filters.limit;
    }
    
    return await recipeModel.findAll(processedFilters);
  }

  /**
   * Get recipe by ID
   * @param {number} id - Recipe ID
   * @returns {Promise<Object>} Recipe object
   */
  async getRecipeById(id) {
    const recipe = await recipeModel.findById(id);
    if (!recipe) {
      throw new AppError('Recipe not found', 404);
    }
    return recipe;
  }

  /**
   * Create a new recipe
   * @param {Object} recipeData - Recipe data
   * @returns {Promise<Object>} Created recipe
   */
  async createRecipe(recipeData) {
    const { name, description, category_id, ingredients, suggested_price, is_active, preparation_time, image_url } = recipeData;

    // Validate required fields
    if (!name) {
      throw new AppError('Recipe name is required', 400);
    }

    // Calculate total cost if ingredients provided
    let total_cost = 0;
    if (ingredients && ingredients.length > 0) {
      // Use service method to calculate cost from ingredients
      const costResult = await this.calculateCost(ingredients);
      total_cost = costResult.totalCost;
    }

    // Calculate suggested price if not provided
    const finalSuggestedPrice = suggested_price || this.calculateSuggestedPrice(total_cost);

    return await recipeModel.create({
      name,
      description,
      category_id,
      ingredients,
      total_cost,
      suggested_price: finalSuggestedPrice,
      is_active: is_active !== false,
      preparation_time,
      image_url
    });
  }

  /**
   * Update a recipe
   * @param {number} id - Recipe ID
   * @param {Object} recipeData - Recipe data to update
   * @returns {Promise<Object>} Updated recipe
   */
  async updateRecipe(id, recipeData) {
    const existingRecipe = await recipeModel.findById(id);
    if (!existingRecipe) {
      throw new AppError('Recipe not found', 404);
    }

    // Recalculate cost if ingredients changed
    let total_cost = existingRecipe.total_cost;
    if (recipeData.ingredients) {
      const costResult = await this.calculateCost(recipeData.ingredients);
      total_cost = costResult.totalCost;
    }

    // Recalculate suggested price if cost changed or suggested_price not provided
    let suggested_price = recipeData.suggested_price;
    if (!suggested_price && recipeData.ingredients) {
      suggested_price = this.calculateSuggestedPrice(total_cost);
    }

    return await recipeModel.update(id, {
      ...recipeData,
      total_cost,
      suggested_price
    });
  }

  /**
   * Delete a recipe
   * @param {number} id - Recipe ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteRecipe(id) {
    const existingRecipe = await recipeModel.findById(id);
    if (!existingRecipe) {
      throw new AppError('Recipe not found', 404);
    }
    return await recipeModel.delete(id);
  }

  /**
   * Calculate suggested price based on cost
   * @param {number} cost - Production cost
   * @returns {number} Suggested price
   */
  calculateSuggestedPrice(cost) {
    // Default 40% profit margin
    const markup = 1.4;
    return roundToTenCents(cost * markup);
  }

  /**
   * Get recipes that can be produced with current stock
   * @returns {Promise<Array>} Available recipes
   */
  async getAvailableRecipes() {
    return await recipeModel.getAvailableRecipes();
  }

  /**
   * Validate stock for recipe production
   * @param {number} recipeId - Recipe ID
   * @param {number} quantity - Quantity to produce
   * @returns {Promise<Object>} Validation result
   */
  async validateProduction(recipeId, quantity = 1) {
    const recipe = await recipeModel.findById(recipeId);
    if (!recipe) {
      throw new AppError('Recipe not found', 404);
    }

    if (!recipe.is_active) {
      throw new AppError('Recipe is not active', 400);
    }

    const ingredients = recipe.ingredients.map(ing => ({
      product_id: ing.product_id,
      quantity: ing.quantity * quantity
    }));

    // Use inventory service to validate
    const validation = await inventoryService.validateStockAvailability(ingredients);
    
    if (!validation.valid) {
      return {
        canProduce: false,
        recipe,
        missing: validation.unavailable
      };
    }

    return {
      canProduce: true,
      recipe,
      total_cost: recipe.total_cost * quantity,
      suggested_price: recipe.suggested_price * quantity
    };
  }

  /**
   * Produce a recipe (deduct stock)
   * @param {number} recipeId - Recipe ID
   * @param {number} quantity - Quantity to produce
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Production result
   */
  async produceRecipe(recipeId, quantity, userId) {
    // Validate stock first
    const validation = await this.validateProduction(recipeId, quantity);
    
    if (!validation.canProduce) {
      throw new AppError('Insufficient stock for production', 400);
    }

    const recipe = validation.recipe;

    // Deduct stock for each ingredient
    for (const ingredient of recipe.ingredients) {
      const totalQuantity = ingredient.quantity * quantity;
      
      await inventoryService.createMovement({
        product_id: ingredient.product_id,
        movement_type: 'OUT',
        quantity: totalQuantity,
        reason: 'production',
        reference_id: recipeId,
        user_id: userId
      });
    }

    return {
      recipe,
      quantity_produced: quantity,
      total_cost: validation.total_cost,
      production_date: new Date()
    };
  }

  /**
   * Get recipes by category
   * @param {number} categoryId - Category ID
   * @returns {Promise<Array>} Recipes in category
   */
  async getRecipesByCategory(categoryId) {
    return await recipeModel.findByCategory(categoryId);
  }

  /**
   * Get popular recipes
   * @param {number} limit - Limit results
   * @returns {Promise<Array>} Popular recipes
   */
  async getPopularRecipes(limit = 10) {
    return await recipeModel.getPopularRecipes(limit);
  }

  async getCatalogRecipes() {
    return await recipeModel.findCatalog();
  }

  async setCatalogVisibility(id, show) {
    const existing = await recipeModel.findById(id);
    if (!existing) throw new AppError('Recipe not found', 404);
    return await recipeModel.setCatalogVisibility(id, show);
  }

  /**
   * Calculate cost for custom recipe
   * @param {Array} ingredients - Array of ingredients
   * @returns {Promise<Object>} Cost calculation
   */
  async calculateCost(ingredients) {
    if (!ingredients || ingredients.length === 0) {
      throw new AppError('Ingredients are required', 400);
    }

    // Get ingredient details and calculate total cost
    // Ensure product_id is converted to number for proper comparison
    const productIds = ingredients.map(i => Number(i.product_id));
    const products = await Promise.all(
      productIds.map(id => productModel.findById(id))
    );

    let totalCost = 0;
    const ingredientDetails = ingredients.map((ing, index) => {
      const numericProductId = Number(ing.product_id);
      const product = products.find(p => p && Number(p.id) === numericProductId);
      const unitCost = parseFloat(product?.cost_price) || 0;
      const quantity = parseInt(ing.quantity) || 0;
      const subtotal = unitCost * quantity;
      totalCost += subtotal;
      return {
        product_id: numericProductId,
        product_name: product?.name || 'Unknown',
        quantity: quantity,
        unit_cost: unitCost,
        subtotal: subtotal
      };
    });

    const suggestedPrice = this.calculateSuggestedPrice(totalCost);

    return {
      ingredients: ingredientDetails,
      totalCost: totalCost,
      suggestedPrice: suggestedPrice,
      profitMargin: suggestedPrice - totalCost,
      profitPercentage: totalCost > 0 ? ((suggestedPrice - totalCost) / totalCost * 100).toFixed(2) : 0
    };
  }
}

module.exports = new RecipeService();
