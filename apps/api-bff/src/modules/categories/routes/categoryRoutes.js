/**
 * Category routes
 * @module modules/categories/routes/categoryRoutes
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, authorizeRoles } = require('../../auth/middleware/authMiddleware');
const { validate } = require('../../../shared/middleware/validation');
const { categorySchemas } = require('../../../shared/validation/schemas');

/**
 * Category routes
 * - GET /categories - Get all categories
 * - GET /categories/:id - Get category by ID
 * - POST /categories - Create a new category
 * - PUT /categories/:id - Update a category
 * - DELETE /categories/:id - Delete a category
 */

// GET /categories - Get all categories (protected)
router.get('/', authenticateToken, categoryController.getAllCategories);

// GET /categories/:id - Get category by ID (protected)
router.get('/:id', authenticateToken, validate(categorySchemas.getById), categoryController.getCategoryById);

// POST /categories - Create a new category (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), validate(categorySchemas.create), categoryController.createCategory);

// PUT /categories/:id - Update a category (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), validate(categorySchemas.update), categoryController.updateCategory);

// DELETE /categories/:id - Delete a category (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), categoryController.deleteCategory);

module.exports = router;
