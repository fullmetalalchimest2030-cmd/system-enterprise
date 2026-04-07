/**
 * Sales Model
 * @module modules/sales/models/salesModel
 * Based on baseDatos.txt schema
 */

const db = require('../../../config/database');

const VALID_STATUSES = ['completed', 'cancelled', 'refunded'];

class SalesModel {
  /**
   * Get all sales
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Sales array
   */
  async findAll(filters = {}) {
    let query = `
      SELECT s.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name,
             c.status as cashbox_status
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN cashboxes c ON s.cashbox_id = c.id
      WHERE s.deleted_at IS NULL
    `;
    
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND s.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.user_id) {
      query += ` AND s.user_id = $${paramCount}`;
      params.push(filters.user_id);
      paramCount++;
    }

    if (filters.cashbox_id) {
      query += ` AND s.cashbox_id = $${paramCount}`;
      params.push(filters.cashbox_id);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND s.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND s.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    query += ` ORDER BY s.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get sale items by sale ID
   * @param {number} saleId - Sale ID
   * @returns {Promise<Array>} Sale items
   */
  async findItemsBySaleId(saleId) {
    const result = await db.query(`
      SELECT si.*, 
             p.name as product_name, 
             p.sku as product_sku,
             r.name as recipe_name
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN recipes r ON si.recipe_id = r.id
      WHERE si.sale_id = $1
      ORDER BY si.id ASC
    `, [saleId]);
    return result.rows;
  }

  /**
   * Get sale by ID
   * @param {number} id - Sale ID
   * @returns {Promise<Object>} Sale object
   */
  async findById(id) {
    const result = await db.query(`
      SELECT s.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1 AND s.deleted_at IS NULL
    `, [id]);
    return result.rows[0];
  }

  /**
   * Create a new sale
   * @param {Object} sale - Sale data
   * @returns {Promise<Object>} Created sale
   */
  async create(sale) {
    const { user_id, cashbox_id, total_amount, customer_identifier, customer_name, status, ticket_number } = sale;
    
    const finalStatus = status || 'completed';
    if (!VALID_STATUSES.includes(finalStatus)) {
      throw new Error(`Invalid status. Valid statuses are: ${VALID_STATUSES.join(', ')}`);
    }

    const result = await db.query(`
      INSERT INTO sales (user_id, cashbox_id, total_amount, customer_identifier, customer_name, status, ticket_number, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [user_id, cashbox_id, total_amount, customer_identifier, customer_name, finalStatus, ticket_number]);
    
    return result.rows[0];
  }

  /**
   * Update a sale
   * @param {number} id - Sale ID
   * @param {Object} sale - Sale data
   * @returns {Promise<Object>} Updated sale
   */
  async update(id, sale) {
    const { status, customer_identifier, customer_name, payment_method_id, notes } = sale;
    
    if (status && !VALID_STATUSES.includes(status)) {
      throw new Error(`Invalid status. Valid statuses are: ${VALID_STATUSES.join(', ')}`);
    }
    
    const result = await db.query(`
      UPDATE sales 
      SET status = COALESCE($1, status), 
          customer_identifier = COALESCE($2, customer_identifier),
          customer_name = COALESCE($3, customer_name),
          payment_method_id = COALESCE($4, payment_method_id),
          notes = COALESCE($5, notes),
          updated_at = NOW()
      WHERE id = $6 AND deleted_at IS NULL
      RETURNING *
    `, [status, customer_identifier, customer_name, payment_method_id, notes, id]);
    
    return result.rows[0];
  }

  /**
   * Cancel a sale
   * @param {number} id - Sale ID
   * @returns {Promise<Object>} Cancelled sale
   */
  async cancel(id) {
    const result = await db.query(
      `UPDATE sales SET status = 'cancelled' WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * Cancel a sale and restore stock within a transaction
   * @param {number} saleId - The ID of the sale to cancel
   * @param {number} userId - The ID of the user performing the cancellation
   * @returns {Promise<Object>} The updated sale object
   */
  async cancelWithStockRestoration(saleId, userId) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 1. Fetch the sale and its items
      const saleResult = await client.query('SELECT * FROM sales WHERE id = $1 AND deleted_at IS NULL', [saleId]);
      const sale = saleResult.rows[0];

      if (!sale) {
        throw new Error('Sale not found');
      }
      if (sale.status === 'cancelled') {
        throw new Error('Sale is already cancelled');
      }

      const itemsResult = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [saleId]);
      const items = itemsResult.rows;

      // 2. Update sale status to 'cancelled'
      const updatedSaleResult = await client.query(
        `UPDATE sales SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [saleId]
      );

      // 3. Restore stock for each product item
      const returnMovementTypeResult = await client.query(`SELECT id FROM stock_movement_types WHERE code = 'return'`);
      if (returnMovementTypeResult.rows.length === 0) {
        // Fallback to a generic 'IN' if a specific 'return' type doesn't exist
        console.warn("Stock movement type 'return' not found, falling back to 'IN'. Please consider adding a 'return' type for better tracking.");
        const inMovementTypeResult = await client.query(`SELECT id FROM stock_movement_types WHERE code = 'IN'`);
        if (inMovementTypeResult.rows.length === 0) throw new Error("Critical: Stock movement type 'IN' not found.");
        returnMovementTypeResult.rows.push(inMovementTypeResult.rows[0]);
      }
      const returnMovementTypeId = returnMovementTypeResult.rows[0].id;

      for (const item of items) {
        if (item.product_id) {
          await client.query(`
            INSERT INTO stock_movements (product_id, movement_type_id, quantity, unit_cost, reference_table, reference_id, user_id, notes, created_at)
            VALUES ($1, $2, $3, $4, 'sales', $5, $6, $7, NOW())
          `, [
            item.product_id, 
            returnMovementTypeId, 
            item.quantity, // Positive quantity to add back to stock
            item.unit_cost_at_sale, 
            saleId, 
            userId,
            'Stock restored from cancelled sale #'
          ]);

          // Update stock_cached - use try/catch to handle missing updated_at column
          try {
            await client.query(
              'UPDATE products SET stock_cached = stock_cached + $1, updated_at = NOW() WHERE id = $2',
              [item.quantity, item.product_id]
            );
          } catch (updateError) {
            // Fallback if updated_at column doesn't exist
            await client.query(
              'UPDATE products SET stock_cached = stock_cached + $1 WHERE id = $2',
              [item.quantity, item.product_id]
            );
          }
        }
      }

      await client.query('COMMIT');
      return updatedSaleResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[Transaction Error] Failed to cancel sale ${saleId}:`, error);
      // Re-throw the error to be caught by the service layer
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get sales statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(filters = {}) {
    let dateFilter = '';
    const params = [];
    let paramCount = 1;

    if (filters.start_date) {
      dateFilter += ` AND s.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      dateFilter += ` AND s.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    // Total sales count and amount
    const totalResult = await db.query(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(AVG(total_amount), 0) as average_sale
      FROM sales s
      WHERE s.status = 'completed'${dateFilter}
    `, params);

    // Sales by payment method (apply same date filter)
    const paymentResult = await db.query(`
      SELECT p.code as payment_method, COUNT(*) as count, COALESCE(SUM(pay.amount), 0) as total
      FROM payments pay
      JOIN payment_methods p ON pay.payment_method_id = p.id
      JOIN sales s ON pay.sale_id = s.id
      WHERE s.status = 'completed'${dateFilter}
      GROUP BY p.code
    `, params);

    return {
      summary: {
        total_sales: parseInt(totalResult.rows[0].total_sales),
        total_amount: parseFloat(totalResult.rows[0].total_amount),
        average_sale: parseFloat(totalResult.rows[0].average_sale)
      },
      by_payment_method: paymentResult.rows
    };
  }

  /**
   * Get today's sales
   * @returns {Promise<Array>} Today's sales
   */
  async getTodaySales() {
    const result = await db.query(`
      SELECT s.*, 
             u.first_name as user_first_name, 
             u.last_name as user_last_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE DATE(s.created_at) = CURRENT_DATE AND s.deleted_at IS NULL
      ORDER BY s.created_at DESC
    `);
    return result.rows;
  }

  /**
   * Create sale with items (transaction)
   * @param {Object} saleData - Sale data with items
   * @returns {Promise<Object>} Created sale
   */
  async createWithItems(saleData) {
    const { 
      user_id, cashbox_id, customer_identifier, customer_name, status, items, 
      payment_method_id, subtotal, discount_percentage, discount_amount, total_amount
    } = saleData;

    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // Generate ticket number
      let ticketResult = await client.query(`
        UPDATE document_series 
        SET current_number = current_number + 1 
        WHERE code = 'TICKET' AND is_active = TRUE
        RETURNING prefix, current_number
      `);
      
      // Fallback if document_series is not initialized
      if (ticketResult.rows.length === 0) {
        console.warn('Document series TICKET not found or inactive, using default TKT-00000000');
        ticketResult = { rows: [{ prefix: 'TKT', current_number: Math.floor(Math.random() * 10000) }] };
      }
      
      const ticket_number = `${ticketResult.rows[0].prefix}${String(ticketResult.rows[0].current_number).padStart(8, '0')}`;
      
      // Create sale
      const saleResult = await client.query(`
        INSERT INTO sales (user_id, cashbox_id, subtotal, discount_percentage, discount_amount, total_amount, customer_identifier, customer_name, status, ticket_number, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING *
      `, [user_id, cashbox_id, subtotal, discount_percentage, discount_amount, total_amount, customer_identifier, customer_name, status || 'completed', ticket_number]);

      const sale = saleResult.rows[0];

          // Add sale items
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(`
            INSERT INTO sale_items (sale_id, product_id, recipe_id, item_name_snapshot, quantity, unit_price_at_sale, unit_cost_at_sale, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          `, [sale.id, item.product_id || null, item.recipe_id || null, item.name, item.quantity, item.price, item.cost || 0]);

          // Get movement type ID for 'sale'
          const movementTypeResult = await client.query(`SELECT id FROM stock_movement_types WHERE code = 'sale'`);
          const movementTypeId = movementTypeResult.rows[0].id;

          if (item.product_id) {
            await client.query(`
              INSERT INTO stock_movements (product_id, movement_type_id, quantity, unit_cost, reference_table, reference_id, user_id, created_at)
              VALUES ($1, $2, $3, $4, 'sales', $5, $6, NOW())
            `, [item.product_id, movementTypeId, -item.quantity, item.cost, sale.id, user_id]);

            // Manual stock update - use try/catch to handle missing updated_at column
            try {
              await client.query(
                'UPDATE products SET stock_cached = stock_cached - $1, updated_at = NOW() WHERE id = $2',
                [item.quantity, item.product_id]
              );
            } catch (updateError) {
              // Fallback if updated_at column doesn't exist
              await client.query(
                'UPDATE products SET stock_cached = stock_cached - $1 WHERE id = $2',
                [item.quantity, item.product_id]
              );
            }
          } else if (item.recipe_id) {
            // Deduct stock for each ingredient in the recipe
            const ingredientsResult = await client.query(
              `SELECT product_id, quantity FROM recipe_items WHERE recipe_id = $1 AND deleted_at IS NULL`,
              [item.recipe_id]
            );
            
            for (const ing of ingredientsResult.rows) {
              const totalQuantity = ing.quantity * item.quantity;
              // Get current cost price for the product to record in movement
              const productResult = await client.query(`SELECT cost_price FROM products WHERE id = $1`, [ing.product_id]);
              const currentCost = productResult.rows[0]?.cost_price || 0;

              await client.query(`
                INSERT INTO stock_movements (product_id, movement_type_id, quantity, unit_cost, reference_table, reference_id, user_id, created_at)
                VALUES ($1, $2, $3, $4, 'sales', $5, $6, NOW())
              `, [ing.product_id, movementTypeId, -totalQuantity, currentCost, sale.id, user_id]);

              // Manual stock update - use try/catch to handle missing updated_at column
              try {
                await client.query(
                  'UPDATE products SET stock_cached = stock_cached - $1, updated_at = NOW() WHERE id = $2',
                  [totalQuantity, ing.product_id]
                );
              } catch (updateError) {
                // Fallback if updated_at column doesn't exist
                await client.query(
                  'UPDATE products SET stock_cached = stock_cached - $1 WHERE id = $2',
                  [totalQuantity, ing.product_id]
                );
              }
            }
          }
        }
      }

      // Create payment record
      if (payment_method_id) {
        const paymentResult = await client.query(`
          INSERT INTO payments (sale_id, cashbox_id, payment_method_id, amount, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          RETURNING id
        `, [sale.id, cashbox_id, payment_method_id, total_amount]);

        // Register cash flow entry so the cashbox tracks this income
        if (cashbox_id && paymentResult.rows[0]) {
          const flowTypeResult = await client.query(
            `SELECT id FROM cash_flow_types WHERE code = 'sale_income' LIMIT 1`
          );
          if (flowTypeResult.rows[0]) {
            await client.query(`
              INSERT INTO cash_flow (cashbox_id, flow_type_id, reference_table, reference_id, amount, created_at)
              VALUES ($1, $2, 'payments', $3, $4, NOW())
            `, [cashbox_id, flowTypeResult.rows[0].id, paymentResult.rows[0].id, total_amount]);
          }
        }
      }

      await client.query('COMMIT');
      
      return sale;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new SalesModel();
