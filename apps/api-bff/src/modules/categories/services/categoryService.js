/**
 * Category service
 * @module modules/categories/services/categoryService
 */

const categoryModel = require('../models/categoryModel');
const { AppError } = require('../../../shared/middleware/errorHandler');

/**
 * Category service class
 */
class CategoryService {
  /**
   * Get all categories
   * @returns {Promise<Array>} Categories array
   */
  async getAllCategories() {
    return await categoryModel.findAll();
  }

  /**
   * Get category by ID
   * @param {number} id - Category ID
   * @returns {Promise<Object>} Category object
   */
  async getCategoryById(id) {
    const category = await categoryModel.findById(id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }
    return category;
  }

  /**
   * Create a new category
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} Created category
   */
  async createCategory(categoryData) {
    const { name, description, image_url } = categoryData;

    // Validate required fields
    if (!name) {
      throw new AppError('Category name is required', 400);
    }

    // Check if category name already exists
    const existingCategory = await categoryModel.findByName(name);
    if (existingCategory) {
      throw new AppError('Category name already exists', 400);
    }

    return await categoryModel.create({
      name,
      description,
      image_url,
    });
  }

  /**
   * Update a category
   * @param {number} id - Category ID
   * @param {Object} categoryData - Category data to update
   * @returns {Promise<Object>} Updated category
   */
  async updateCategory(id, categoryData) {
    const existingCategory = await categoryModel.findById(id);
    if (!existingCategory) {
      throw new AppError('Category not found', 404);
    }

    // Check if new name already exists (if name is being changed)
    if (categoryData.name) {
      const categoryWithName = await categoryModel.findByName(categoryData.name);
      if (categoryWithName && categoryWithName.id !== id) {
        throw new AppError('Category name already exists', 400);
      }
    }

    return await categoryModel.update(id, categoryData);
  }

  /**
   * Delete a category
   * @param {number} id - Category ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteCategory(id) {
    const existingCategory = await categoryModel.findById(id);
    if (!existingCategory) {
      throw new AppError('Category not found', 404);
    }

    return await categoryModel.delete(id);
  }

  /**
   * Get active categories
   * @returns {Promise<Array>} Active categories array
   */
  async getActiveCategories() {
    return await categoryModel.findActive();
  }
}

module.exports = new CategoryService();
