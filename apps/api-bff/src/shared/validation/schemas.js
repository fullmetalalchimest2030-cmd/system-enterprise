/**
 * Joi Validation Schemas
 * @module shared/validation/schemas
 */

const Joi = require('joi');

// Common schemas
const idSchema = Joi.number().integer().positive();
const emailSchema = Joi.string().email().max(150);
const passwordSchema = Joi.string().min(8).max(100);
const dateSchema = Joi.date().iso();
const statusSchema = Joi.string().valid('pending', 'completed', 'cancelled');

// Product schemas
const productSchemas = {
  create: {
    body: Joi.object({
      category_id: Joi.number().integer().positive().required(),
      name: Joi.string().max(150).required(),
      sku: Joi.string().max(100).optional(),
      unit_of_measure: Joi.string().max(20).required(),
      cost_price: Joi.number().positive().required(),
      sell_price: Joi.number().positive().required(),
      stock_cached: Joi.number().min(0).default(0),
      min_stock: Joi.number().min(0).default(0),
      description: Joi.string().max(500).allow(null, '').optional(),
      image_url: Joi.string().uri().max(500).allow(null, '').optional(),
    }),
  },
  update: {
    params: Joi.object({
      id: idSchema.required(),
    }),
    body: Joi.object({
      category_id: Joi.number().integer().positive(),
      name: Joi.string().max(150),
      sku: Joi.string().max(100),
      unit_of_measure: Joi.string().max(20),
      cost_price: Joi.number().positive(),
      sell_price: Joi.number().positive(),
      stock_cached: Joi.number().min(0),
      min_stock: Joi.number().min(0),
      description: Joi.string().max(500).allow(null, ''),
      image_url: Joi.string().uri().max(500).allow(null, ''),
    }).min(1),
  },
  getById: {
    params: Joi.object({
      id: idSchema.required(),
    }),
  },
};

// Category schemas
const categorySchemas = {
  create: {
    body: Joi.object({
      name: Joi.string().max(100).required(),
      description: Joi.string().max(255).allow(null, '').optional(),
      image_url: Joi.string().max(255).allow(null, '').optional(),
    }),
  },
  update: {
    params: Joi.object({
      id: idSchema.required(),
    }),
    body: Joi.object({
      name: Joi.string().max(100),
      description: Joi.string().max(255).allow(null, ''),
      image_url: Joi.string().max(255).allow(null, ''),
    }).min(1),
  },
  getById: {
    params: Joi.object({
      id: idSchema.required(),
    }),
  },
};

// Sale schemas
const saleSchemas = {
  create: {
    body: Joi.object({
      user_id: Joi.number().integer().positive().required(),
      customer_id: Joi.number().integer().positive().allow(null).optional(),
      customer_identifier: Joi.string().max(20).allow(null, '').optional(),
      customer_name: Joi.string().max(150).allow(null, '').optional(),
      cashbox_id: Joi.number().integer().positive().required(),
      // SECURITY: total_amount is now optional - backend calculates it internally
      // Client can still send it for reference, but it will be ignored
      total_amount: Joi.number().positive().allow(null).optional(),
      discount_percentage: Joi.number().min(0).max(100).allow(null).optional(),
      status: statusSchema.default('completed'),
      payment_method_id: Joi.number().integer().positive().allow(null).optional(),
      notes: Joi.string().max(500).allow(null, '').optional(),
      items: Joi.array().items(
        Joi.object({
          product_id: Joi.number().integer().positive().allow(null).optional(),
          recipe_id: Joi.number().integer().positive().allow(null).optional(),
          quantity: Joi.number().positive().required(),
          price: Joi.number().positive().required(),
          cost: Joi.number().min(0).allow(null).optional(),
          name: Joi.string().max(150).allow(null, '').optional(),
        })
      ).min(1).required(),
    })
    .or('customer_id', 'customer_identifier', 'items')
    .unknown(true),
  },
  update: {
    params: Joi.object({
      id: idSchema.required(),
    }),
    body: Joi.object({
      status: statusSchema,
      payment_method: Joi.string().valid('cash', 'yape', 'plin', 'transfer', 'card'),
      notes: Joi.string().max(500),
    }).min(1),
  },
  getById: {
    params: Joi.object({
      id: idSchema.required(),
    }),
  },
};

// Cashbox schemas
const cashboxSchemas = {
  open: {
    body: Joi.object({
      user_id: Joi.number().integer().positive().required(),
      opening_amount: Joi.number().min(0).required(),
    }),
  },
  close: {
    params: Joi.object({
      id: idSchema.required(),
    }),
    body: Joi.object({
      closing_amount: Joi.number().min(0).required(),
      expected_amount: Joi.number().min(0).optional(),
    }),
  },
  getById: {
    params: Joi.object({
      id: idSchema.required(),
    }),
  },
};

// Inventory schemas
const inventorySchemas = {
  createMovement: {
    body: Joi.object({
      product_id: Joi.number().integer().positive().required(),
      movement_type: Joi.string()
        .valid('IN', 'OUT', 'ADJUSTMENT', 'WASTE', 'in', 'out', 'adjustment', 'waste')
        .required()
        .messages({
          'any.only': '"movement_type" must be one of [IN, OUT, ADJUSTMENT, WASTE]',
          'string.base': '"movement_type" must be a string'
        }),
      quantity: Joi.number().positive().required(),
      reason: Joi.string().max(100).allow(null, '').optional(),
      reference_id: Joi.number().integer().positive().allow(null).optional(),
      user_id: Joi.number().integer().positive().required(),
      notes: Joi.string().max(500).allow(null, '').optional(),
    }),
  },
  getKardex: {
    params: Joi.object({
      productId: idSchema.required(),
    }),
    query: Joi.object({
      limit: Joi.number().integer().positive().max(1000).default(50),
    }),
  },
};

// Auth schemas
const authSchemas = {
  login: {
    body: Joi.object({
      email: emailSchema.required(),
      password: Joi.string().required(),
    }),
  },
  register: {
    body: Joi.object({
      email: emailSchema.required(),
      password: passwordSchema.required(),
      first_name: Joi.string().max(100).required(),
      last_name: Joi.string().max(100).required(),
      role: Joi.string().valid('admin', 'cashier', 'warehouse').default('cashier'),
    }),
  },
  refreshToken: {
    body: Joi.object({
      refreshToken: Joi.string().required(),
    }),
  },
};

// Employee schemas
const employeeSchemas = {
  create: {
    body: Joi.object({
      email: emailSchema.required(),
      password: passwordSchema.required(),
      first_name: Joi.string().max(100).required(),
      last_name: Joi.string().max(100).required(),
      role: Joi.string().valid('admin', 'cashier', 'warehouse').default('cashier'),
      phone: Joi.string().max(20).optional(),
      address: Joi.string().max(255).optional(),
    }),
  },
  update: {
    params: Joi.object({
      id: idSchema.required(),
    }),
    body: Joi.object({
      email: emailSchema,
      first_name: Joi.string().max(100),
      last_name: Joi.string().max(100),
      role: Joi.string().valid('admin', 'cashier', 'warehouse'),
      phone: Joi.string().max(20),
      address: Joi.string().max(255),
      is_active: Joi.boolean(),
    }).min(1),
  },
  getById: {
    params: Joi.object({
      id: idSchema.required(),
    }),
  },
};

// Recipe schemas
const recipeSchemas = {
  create: {
    body: Joi.object({
      name: Joi.string().max(150).required(),
      description: Joi.string().max(500).allow(null, '').optional(),
      category_id: Joi.number().integer().positive().allow(null).optional(),
      suggested_price: Joi.number().min(0).allow(null).optional(),
      is_active: Joi.boolean().default(true),
      preparation_time: Joi.number().integer().min(0).allow(null).optional(),
      image_url: Joi.string().uri().max(500).allow(null, '').optional(),
      ingredients: Joi.array().items(
        Joi.object({
          product_id: Joi.number().integer().positive().required(),
          quantity: Joi.number().positive().required(),
        })
      ).min(1).required(),
    }),
  },
  update: {
    params: Joi.object({
      id: idSchema.required(),
    }),
    body: Joi.object({
      name: Joi.string().max(150),
      description: Joi.string().max(500).allow(null, ''),
      category_id: Joi.number().integer().positive().allow(null),
      suggested_price: Joi.number().min(0).allow(null),
      is_active: Joi.boolean(),
      preparation_time: Joi.number().integer().min(0).allow(null),
      image_url: Joi.string().uri().max(500).allow(null, '').optional(),
      ingredients: Joi.array().items(
        Joi.object({
          product_id: Joi.number().integer().positive().required(),
          quantity: Joi.number().positive().required(),
        })
      ).min(1),
    }).min(1),
  },
  getById: {
    params: Joi.object({
      id: idSchema.required(),
    }),
  },
};

// Finance schemas
const financeSchemas = {
  createExpense: {
    body: Joi.object({
      description: Joi.string().max(255).required(),
      amount: Joi.number().positive().required(),
      category: Joi.string().valid('flowers', 'services', 'transport', 'salaries', 'utilities', 'supplies', 'other').required(),
      cashbox_id: Joi.number().integer().positive().required(),
      payment_method: Joi.string().valid('cash', 'transfer', 'card', 'yape', 'plin').optional(),
      receipt_number: Joi.string().max(100).allow(null, '').optional(),
      notes: Joi.string().max(500).allow(null, '').optional(),
      date: Joi.date().iso().optional(),
    }),
  },
  updateExpense: {
    params: Joi.object({
      id: idSchema.required(),
    }),
    body: Joi.object({
      description: Joi.string().max(255),
      amount: Joi.number().positive(),
      category: Joi.string().valid('flowers', 'services', 'transport', 'salaries', 'utilities', 'supplies', 'other'),
      payment_method: Joi.string().valid('cash', 'transfer', 'card', 'yape', 'plin'),
      receipt_number: Joi.string().max(100).allow(null, ''),
      notes: Joi.string().max(500).allow(null, ''),
      date: Joi.date().iso(),
    }).min(1),
  },
};

module.exports = {
  productSchemas,
  categorySchemas,
  saleSchemas,
  cashboxSchemas,
  inventorySchemas,
  recipeSchemas,
  financeSchemas,
  authSchemas,
  employeeSchemas,
};
