/**
 * Sales Service - Business logic for sales operations
 * @module modules/sales/services/salesService
 */

const salesModel = require('../models/salesModel');
const productModel = require('../../products/models/productModel');
const inventoryService = require('../../inventory/services/inventoryService');
const { AppError } = require('../../../shared/middleware/errorHandler');
const { roundToTenCents } = require('../../../shared/utils/currencyUtils');

const VALID_STATUSES = ['pending', 'completed', 'cancelled'];

class SalesService {
  async getAllSales(filters) {
    return await salesModel.findAll(filters);
  }

  async getSaleById(id) {
    const sale = await salesModel.findById(id);
    if (!sale) {
      throw new AppError('Sale not found', 404);
    }
    const items = await salesModel.findItemsBySaleId(id);
    return { ...sale, items };
  }

  async getDetailedSale(id) {
    const sale = await salesModel.findById(id);
    if (!sale) {
      throw new AppError('Sale not found', 404);
    }
    const items = await this.getSaleItems(id);
    return { ...sale, items };
  }

  /**
   * Create a new sale with items (complete flow)
   * SECURITY: total_amount is always calculated internally, client value is ignored
   */
  async createSale(saleData) {
    const { user_id, cashbox_id, customer_identifier, customer_name, status, items, payment_method_id, discount_percentage } = saleData;

    if (!user_id) {
      throw new AppError('User ID is required', 400);
    }

    // SECURITY: items are required — never fall back to a client-provided total_amount
    if (!items || items.length === 0) {
      throw new AppError('Sale must have at least one item', 400);
    }

    // Validate item fields
    for (const item of items) {
      if (!item.product_id && !item.recipe_id) {
        throw new AppError('Each item must have either product_id or recipe_id', 400);
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new AppError('Each item must have a positive quantity', 400);
      }
      if (!item.price || item.price <= 0) {
        throw new AppError('Each item must have a positive price', 400);
      }
    }

    // SECURITY: Calculate total internally — never trust client-provided total_amount
    const subtotal = await this.calculateTotal(items);
    const discountAmount = discount_percentage ? (subtotal * discount_percentage) / 100 : 0;
    const finalTotal = subtotal - discountAmount;

    if (saleData.total_amount !== undefined) {
      const discrepancy = Math.abs(finalTotal - saleData.total_amount);
      if (discrepancy > 0.01) {
        console.warn(`[SECURITY] Total discrepancy: client sent ${saleData.total_amount}, calculated ${finalTotal}. Using internal value.`);
      }
    }

    if (status && !VALID_STATUSES.includes(status)) {
      throw new AppError(`Invalid status. Valid statuses are: ${VALID_STATUSES.join(', ')}`, 400);
    }

    // Validate stock availability for all items (products and recipes)
    const stockValidation = await this.validateStock(items);
    if (!stockValidation.valid) {
      throw new AppError(`Insufficient stock: ${stockValidation.unavailable.map(u => u.reason || u.product_name).join(', ')}`, 400);
    }

    return await salesModel.createWithItems({
      user_id,
      cashbox_id,
      subtotal: subtotal,
      discount_percentage: discount_percentage || 0,
      discount_amount: discountAmount,
      total_amount: finalTotal, // always the internally calculated value
      customer_identifier,
      customer_name,
      status: status || 'completed',
      items,
      payment_method_id
    });
  }

  async updateSale(id, saleData) {
    const existingSale = await salesModel.findById(id);
    if (!existingSale) {
      throw new AppError('Sale not found', 404);
    }
    if (existingSale.status === 'cancelled') {
      throw new AppError('Cannot update a cancelled sale', 400);
    }
    return await salesModel.update(id, saleData);
  }

  async cancelSale(id, userId) {
    // The model now handles the transaction of cancelling and restoring stock
    const cancelledSale = await salesModel.cancelWithStockRestoration(id, userId);
    if (!cancelledSale) {
      // This case might occur if the sale was already cancelled in a race condition
      throw new AppError('Failed to cancel sale or sale not found', 404);
    }
    return { ...cancelledSale, stock_restored: true };
  }

  async validateStock(items) {
    const requiredProducts = [];

    for (const item of items) {
      if (item.product_id) {
        requiredProducts.push({ product_id: item.product_id, quantity: item.quantity });
      } else if (item.recipe_id) {
        const recipeService = require('../../recipes/services/recipeService');
        const recipe = await recipeService.getRecipeById(item.recipe_id);
        if (recipe && recipe.ingredients) {
          for (const ing of recipe.ingredients) {
            requiredProducts.push({ 
              product_id: ing.product_id, 
              quantity: ing.quantity * item.quantity 
            });
          }
        }
      }
    }

    if (requiredProducts.length === 0) {
      return { valid: true, unavailable: [] };
    }

    // Aggregate quantities for the same product
    const aggregated = requiredProducts.reduce((acc, curr) => {
      const existing = acc.find(p => p.product_id === curr.product_id);
      if (existing) {
        existing.quantity += curr.quantity;
      } else {
        acc.push({ ...curr });
      }
      return acc;
    }, []);

    return await inventoryService.validateStockAvailability(aggregated);
  }

  async getStatistics(filters) {
    return await salesModel.getStatistics(filters);
  }

  async getTodaySales() {
    return await salesModel.getTodaySales();
  }

  /**
   * Calculate sale total from items using DB prices for products
   * SECURITY: uses product.sell_price from DB as fallback if item.price is not provided
   */
  async calculateTotal(items) {
    let total = 0;
    for (const item of items) {
      if (item.product_id) {
        const product = await productModel.findById(item.product_id);
        if (!product) {
          throw new AppError(`Product not found: ${item.product_id}`, 404);
        }
        const price = item.price || product.sell_price;
        total += price * item.quantity;
      } else {
        total += item.price * item.quantity;
      }
    }
    return roundToTenCents(total);
  }

  async processQuickSale(saleData) {
    const { user_id, items, payment_method_id, customer_identifier, customer_name, cashbox_id, discount_percentage } = saleData;
    if (!user_id || !items || items.length === 0) {
      throw new AppError('User ID and sale items are required', 400);
    }
    return await this.createSale({
      user_id,
      cashbox_id,
      customer_identifier,
      customer_name,
      status: 'completed',
      items,
      payment_method_id,
      discount_percentage
    });
  }

  async completeSale(id, saleData) {
    const sale = await salesModel.findById(id);
    if (!sale) {
      throw new AppError('Sale not found', 404);
    }
    if (sale.status !== 'pending') {
      throw new AppError('Only pending sales can be completed', 400);
    }
    // Only allow updating status and payment_method — never total_amount
    const { payment_method_id, notes } = saleData;
    return await salesModel.update(id, { status: 'completed', payment_method_id, notes });
  }

  async getSalesByEmployee(employeeId, filters = {}) {
    return await salesModel.findAll({ ...filters, user_id: employeeId });
  }

  async getSaleItems(saleId) {
    const db = require('../../../config/database');
    const result = await db.query(`
      SELECT si.*, 
             p.name as product_name,
             p.sku as product_code
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = $1
      ORDER BY si.created_at
    `, [saleId]);
    return result.rows;
  }
}

module.exports = new SalesService();
