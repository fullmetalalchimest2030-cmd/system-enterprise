/**
 * Public Catalog Routes - No authentication required
 * @module modules/catalog/catalogRoutes
 */

const express = require('express');
const router = express.Router();
const productController = require('../products/controllers/productController');
const recipeController = require('../recipes/controllers/recipeController');

// GET /catalog/products - Public product catalog
router.get('/products', productController.getCatalogProducts);

// GET /catalog/recipes - Public recipe catalog
router.get('/recipes', recipeController.getCatalogRecipes);

module.exports = router;
