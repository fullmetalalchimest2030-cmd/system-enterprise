/**
 * Category controller
 * @module modules/categories/controllers/categoryController
 */

const categoryService = require('../services/categoryService');
const { asyncHandler, successResponse } = require('../../../shared/utils');

/**
 * Category controller class
 */
class CategoryController {
  /**
   * Get all categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getAllCategories = asyncHandler(async (req, res, next) => {
    const categories = await categoryService.getAllCategories();
    res.json(successResponse(categories, 'Categories retrieved successfully'));
  });

  /**
   * Get category by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  getCategoryById = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const category = await categoryService.getCategoryById(id);
    res.json(successResponse(category, 'Category retrieved successfully'));
  });

  /**
   * Create a new category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  createCategory = asyncHandler(async (req, res, next) => {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json(successResponse(category, 'Category created successfully'));
  });

  /**
   * Update a category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  updateCategory = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const category = await categoryService.updateCategory(id, req.body);
    res.json(successResponse(category, 'Category updated successfully'));
  });

  /**
   * Delete a category
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  deleteCategory = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    await categoryService.deleteCategory(id);
    res.json(successResponse(null, 'Category deleted successfully'));
  });
}

module.exports = new CategoryController();
