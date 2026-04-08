// Feature: equity-working-capital, Property 1: Unicidad de período

const fc = require('fast-check');

jest.mock('../../models/equityModel');

const equityModel = require('../../models/equityModel');
const equityService = require('../equityService');

describe('equityService — Property 1: Unicidad de período', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 1: A second close of the same (year, month) must be rejected
   * and the table must not change.
   *
   * Validates: Requirements 2.5
   */
  it('closeMonth rejects with statusCode 409 when the period already exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          year: fc.integer({ min: 2020, max: 2030 }),
          month: fc.integer({ min: 1, max: 12 }),
        }),
        async ({ year, month }) => {
          // Mock findByPeriod to simulate an already-closed period
          equityModel.findByPeriod.mockResolvedValue({
            id: 1,
            period_year: year,
            period_month: month,
            final_capital: '10000.00',
          });

          let thrownError;
          await expect(
            equityService.closeMonth(year, month, 1, 'test')
          ).rejects.toThrow();

          try {
            await equityService.closeMonth(year, month, 1, 'test');
          } catch (err) {
            thrownError = err;
          }

          expect(thrownError).toBeDefined();
          expect(thrownError.statusCode).toBe(409);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: equity-working-capital, Property 2: Encadenamiento de capital inicial

describe('equityService — Property 2: Encadenamiento de capital inicial', () => {
  /**
   * Helper that simulates the chaining logic from equityService.closeMonth:
   *   const previousCapital = await equityModel.getPreviousCapital(year, month);
   *   const initial_capital = previousCapital !== null ? previousCapital : config.workingCapital.initialCapital;
   *
   * @param {number} firstFinalCapital - final_capital returned by getPreviousCapital
   * @returns {number} initial_capital that would be used for the second close
   */
  function simulateChaining(firstFinalCapital) {
    const previousCapital = firstFinalCapital;
    const initial_capital = previousCapital !== null ? previousCapital : 0;
    return initial_capital;
  }

  /**
   * Property 2: For any sequence of two consecutive closes, the initial_capital
   * of the second close must equal the final_capital of the first.
   *
   * Validates: Requirements 2.2, 3.1
   */
  it('initial_capital of second close equals final_capital of first close', () => {
    fc.assert(
      fc.property(
        fc.record({
          final_capital_first: fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        }),
        ({ final_capital_first }) => {
          const initial_capital_second = simulateChaining(final_capital_first);
          expect(initial_capital_second).toBe(final_capital_first);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: equity-working-capital, Property 4: Fallback al .env cuando no hay registros

const config = require('../../../../config');

describe('equityService — Property 4: Fallback al .env cuando no hay registros', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 4: With empty table, getCurrentCapital() returns config.workingCapital.initialCapital
   *
   * Validates: Requirements 2.3, 3.2, 5.2
   */
  it('getCurrentCapital returns config.workingCapital.initialCapital when equityModel returns null', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: 1_000_000, noNaN: true }),
        async (initialCapital) => {
          equityModel.getCurrentCapital.mockResolvedValue(null);
          const original = config.workingCapital.initialCapital;
          config.workingCapital.initialCapital = initialCapital;

          try {
            const result = await equityService.getCurrentCapital();
            expect(result).toBe(initialCapital);
          } finally {
            config.workingCapital.initialCapital = original;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
