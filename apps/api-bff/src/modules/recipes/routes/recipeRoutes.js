/**
 * Recipe Routes - API endpoints for recipe management
 * @module modules/recipes/routes/recipeRoutes
 */

const express = require('express');
const router = express.Router();
const recipeController = require('../controllers/recipeController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');

/**
 * Recipe routes:
 * - GET /recipes - Get all recipes
 * - GET /recipes/:id - Get recipe by ID
 * - POST /recipes - Create new recipe
 * - PUT /recipes/:id - Update recipe
 * - DELETE /recipes/:id - Delete recipe
 * - GET /recipes/available - Get recipes that can be produced
 * - GET /recipes/category/:categoryId - Get recipes by category
 * - GET /recipes/popular - Get popular recipes
 * - POST /recipes/:recipeId/validate - Validate production
 * - POST /recipes/:recipeId/produce - Produce recipe
 * - POST /recipes/calculate-cost - Calculate cost
 */

// GET /recipes - Get all recipes
router.get('/', authenticateToken, recipeController.getAllRecipes);

// GET /recipes/available - Get available recipes (can be produced with current stock)
router.get('/available', authenticateToken, recipeController.getAvailableRecipes);

// GET /recipes/popular - Get popular recipes
router.get('/popular', authenticateToken, recipeController.getPopularRecipes);

// GET /recipes/category/:categoryId - Get recipes by category
router.get('/category/:categoryId', authenticateToken, recipeController.getRecipesByCategory);

// GET /recipes/:id - Get recipe by ID
router.get('/:id', authenticateToken, recipeController.getRecipeById);

// POST /recipes - Create new recipe (admin/warehouse)
router.post('/', authenticateToken, authorizeRoles('admin', 'warehouse'), recipeController.createRecipe);

// PUT /recipes/:id - Update recipe (admin/warehouse)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'warehouse'), recipeController.updateRecipe);

// DELETE /recipes/:id - Delete recipe (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), recipeController.deleteRecipe);

// PATCH /recipes/:id/catalog - Toggle catalog visibility (admin/warehouse)
router.patch('/:id/catalog', authenticateToken, authorizeRoles('admin', 'warehouse'), recipeController.setCatalogVisibility);
router.put('/:id/catalog', authenticateToken, authorizeRoles('admin', 'warehouse'), recipeController.setCatalogVisibility);

// POST /recipes/:recipeId/validate - Validate production (check stock)
router.post('/:recipeId/validate', authenticateToken, recipeController.validateProduction);

// POST /recipes/:recipeId/produce - Produce recipe (deduct stock)
router.post('/:recipeId/produce', authenticateToken, authorizeRoles('admin', 'warehouse'), recipeController.produceRecipe);

// POST /recipes/calculate-cost - Calculate cost for custom recipe
router.post('/calculate-cost', authenticateToken, recipeController.calculateCost);

module.exports = router;
