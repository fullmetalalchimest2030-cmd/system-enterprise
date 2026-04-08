// Feature: equity-working-capital, Property 3: Fórmula de capital final

const fc = require('fast-check');

/**
 * Pure helper function that computes final_capital from equity components.
 * final_capital = initial_capital + inventory_net + cash_in_boxes - total_expenses
 */
function buildEquityRecord({ initial_capital, inventory_net, cash_in_boxes, total_expenses }) {
  return {
    initial_capital,
    inventory_net,
    cash_in_boxes,
    total_expenses,
    final_capital: initial_capital + inventory_net + cash_in_boxes - total_expenses,
  };
}

/**
 * Validates: Requirements 2.1, 1.4
 */
describe('Property 3: Fórmula de capital final', () => {
  it('final_capital = initial_capital + inventory_net + cash_in_boxes - total_expenses', () => {
    fc.assert(
      fc.property(
        fc.record({
          initial_capital: fc.float({ min: 0, max: 1_000_000, noNaN: true }),
          inventory_net: fc.float({ min: -100_000, max: 500_000, noNaN: true }),
          cash_in_boxes: fc.float({ min: 0, max: 500_000, noNaN: true }),
          total_expenses: fc.float({ min: 0, max: 200_000, noNaN: true }),
        }),
        ({ initial_capital, inventory_net, cash_in_boxes, total_expenses }) => {
          const expected = initial_capital + inventory_net + cash_in_boxes - total_expenses;
          const record = buildEquityRecord({ initial_capital, inventory_net, cash_in_boxes, total_expenses });
          expect(record.final_capital).toBeCloseTo(expected, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: equity-working-capital, Property 5: Variación en historial

/**
 * Pure helper function that computes variation_absolute and variation_percentage
 * for an array of records with final_capital.
 * - First record: variation_absolute = null, variation_percentage = null
 * - Subsequent records: variation_absolute = final_capital[n] - final_capital[n-1]
 *   variation_percentage = Math.round((variation_absolute / final_capital[n-1]) * 100 * 100) / 100
 *   (null if previous final_capital is 0)
 */
function computeHistoryVariations(records) {
  return records.map((record, index) => {
    if (index === 0) {
      return { ...record, variation_absolute: null, variation_percentage: null };
    }
    const prev = records[index - 1].final_capital;
    const variation_absolute = record.final_capital - prev;
    const variation_percentage =
      prev === 0 ? null : Math.round((variation_absolute / prev) * 100 * 100) / 100;
    return { ...record, variation_absolute, variation_percentage };
  });
}

/**
 * Validates: Requirements 4.3
 */
describe('Property 5: Variación en historial', () => {
  it('variation_absolute[n] = final_capital[n] - final_capital[n-1] and variation_percentage rounded to 2 decimals', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ final_capital: fc.float({ min: 1, max: 1_000_000, noNaN: true }) }),
          { minLength: 2 }
        ),
        (records) => {
          const result = computeHistoryVariations(records);

          // First record must have null variations
          expect(result[0].variation_absolute).toBeNull();
          expect(result[0].variation_percentage).toBeNull();

          // Subsequent records must have correct variations
          for (let n = 1; n < result.length; n++) {
            const expectedAbsolute = records[n].final_capital - records[n - 1].final_capital;
            expect(result[n].variation_absolute).toBeCloseTo(expectedAbsolute, 2);

            const prev = records[n - 1].final_capital;
            if (prev !== 0) {
              const expectedPercentage = Math.round((expectedAbsolute / prev) * 100 * 100) / 100;
              expect(result[n].variation_percentage).toBeCloseTo(expectedPercentage, 2);
            } else {
              expect(result[n].variation_percentage).toBeNull();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
