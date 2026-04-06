/**
 * Recipe Controller - HTTP layer for recipe operations
 * @module modules/recipes/controllers/recipeController
 */

const recipeService = require('../services/recipeService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

class RecipeController {
  /**
   * Get all recipes with filters
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getAllRecipes = asyncHandler(async (req, res, next) => {
    const filters = {
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      category_id: req.query.category_id,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const recipes = await recipeService.getAllRecipes(filters);
    res.json(successResponse(recipes, 'Recipes retrieved successfully'));
  });

  /**
   * Get recipe by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getRecipeById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const recipe = await recipeService.getRecipeById(id);
    res.json(successResponse(recipe, 'Recipe retrieved successfully'));
  });

  /**
   * Create a new recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  createRecipe = asyncHandler(async (req, res, next) => {
    const recipe = await recipeService.createRecipe(req.body);
    res.status(201).json(successResponse(recipe, 'Recipe created successfully'));
  });

  /**
   * Update a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  updateRecipe = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const recipe = await recipeService.updateRecipe(id, req.body);
    res.json(successResponse(recipe, 'Recipe updated successfully'));
  });

  /**
   * Delete a recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  deleteRecipe = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    await recipeService.deleteRecipe(id);
    res.json(successResponse(null, 'Recipe deleted successfully'));
  });

  /**
   * Get available recipes (can be produced with current stock)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getAvailableRecipes = asyncHandler(async (req, res, next) => {
    const recipes = await recipeService.getAvailableRecipes();
    res.json(successResponse(recipes, 'Available recipes retrieved successfully'));
  });

  /**
   * Validate production (check stock availability)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  validateProduction = asyncHandler(async (req, res, next) => {
    const { recipeId } = req.params;
    const { quantity } = req.body;
    
    const result = await recipeService.validateProduction(recipeId, quantity || 1);
    res.json(successResponse(result, 'Production validation completed'));
  });

  /**
   * Produce a recipe (deduct stock)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  produceRecipe = asyncHandler(async (req, res, next) => {
    const { recipeId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;
    
    const result = await recipeService.produceRecipe(recipeId, quantity || 1, userId);
    res.status(201).json(successResponse(result, 'Recipe produced successfully'));
  });

  /**
   * Get recipes by category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getRecipesByCategory = asyncHandler(async (req, res, next) => {
    const { categoryId } = req.params;
    const recipes = await recipeService.getRecipesByCategory(categoryId);
    res.json(successResponse(recipes, 'Recipes retrieved successfully'));
  });

  /**
   * Get popular recipes
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getPopularRecipes = asyncHandler(async (req, res, next) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const recipes = await recipeService.getPopularRecipes(limit);
    res.json(successResponse(recipes, 'Popular recipes retrieved successfully'));
  });

  /**
   * Calculate cost for custom recipe
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  calculateCost = asyncHandler(async (req, res, next) => {
    const { ingredients } = req.body;
    const result = await recipeService.calculateCost(ingredients);
    res.json(successResponse(result, 'Cost calculation completed'));
  });

  setCatalogVisibility = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { show_in_catalog } = req.body;
    const recipe = await recipeService.setCatalogVisibility(id, show_in_catalog);
    res.json(successResponse(recipe, 'Recipe catalog visibility updated'));
  });

  getCatalogRecipes = asyncHandler(async (req, res, next) => {
    const recipes = await recipeService.getCatalogRecipes();
    res.json(successResponse(recipes, 'Catalog recipes retrieved successfully'));
  });
}

module.exports = new RecipeController();
