/**
 * Unit tests for financeModel integration with equityModel
 * Validates: Requirements 3.3
 */

// Mock equityModel (inline require inside financeModel methods)
jest.mock('../../../equity/models/equityModel', () => ({
  getCurrentCapital: jest.fn(),
}));

// Mock database to avoid real DB calls
jest.mock('../../../../config/database', () => ({
  query: jest.fn(),
  getClient: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn(),
  }),
}));

// Mock config so we control initialCapital
jest.mock('../../../../config', () => ({
  workingCapital: {
    initialCapital: 10000,
  },
}));

const db = require('../../../../config/database');
const equityModel = require('../../../equity/models/equityModel');
const financeModel = require('../financeModel');

// Helper: make db.query return 0 for all working capital sub-queries
function mockDbZeroValues() {
  db.query.mockResolvedValue({
    rows: [
      {
        inventory_value: '0',
        waste_value: '0',
        total_cash: '0',
        total_expenses: '0',
        closing_amount: '0',
      },
    ],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('financeModel — equity integration', () => {
  describe('getWorkingCapital', () => {
    it('uses equity value as initial_capital when equityModel returns a value', async () => {
      equityModel.getCurrentCapital.mockResolvedValue(50000);

      // getInventoryValue, getWasteValue, getCashInBoxes (closed + open), getTotalExpenses
      db.query
        .mockResolvedValueOnce({ rows: [{ inventory_value: '0' }] })   // getInventoryValue
        .mockResolvedValueOnce({ rows: [{ waste_value: '0' }] })        // getWasteValue
        .mockResolvedValueOnce({ rows: [{ total_cash: '0' }] })         // getCashInBoxes closed
        .mockResolvedValueOnce({ rows: [] })                            // getCashInBoxes open
        .mockResolvedValueOnce({ rows: [{ total_expenses: '0' }] });    // getTotalExpenses

      const result = await financeModel.getWorkingCapital({});

      expect(result.components.initial_capital).toBe(50000);
      expect(result.components.initial_capital_source).toBe('equity');
    });

    it('falls back to config.workingCapital.initialCapital when equityModel returns null', async () => {
      equityModel.getCurrentCapital.mockResolvedValue(null);

      db.query
        .mockResolvedValueOnce({ rows: [{ inventory_value: '0' }] })
        .mockResolvedValueOnce({ rows: [{ waste_value: '0' }] })
        .mockResolvedValueOnce({ rows: [{ total_cash: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total_expenses: '0' }] });

      const result = await financeModel.getWorkingCapital({});

      expect(result.components.initial_capital).toBe(10000);
      expect(result.components.initial_capital_source).toBe('environment');
    });
  });

  describe('getCapitalConfig', () => {
    it('returns source "equity" when equityModel returns a capital value', async () => {
      equityModel.getCurrentCapital.mockResolvedValue(75000);

      const result = await financeModel.getCapitalConfig();

      expect(result.source).toBe('equity');
      expect(result.initial_capital).toBe(75000);
    });

    it('returns source "environment" when equityModel returns null', async () => {
      equityModel.getCurrentCapital.mockResolvedValue(null);

      const result = await financeModel.getCapitalConfig();

      expect(result.source).toBe('environment');
      expect(result.initial_capital).toBe(10000);
    });
  });
});
