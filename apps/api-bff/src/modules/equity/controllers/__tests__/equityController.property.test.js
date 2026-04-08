// Feature: equity-working-capital, Property 6: Autorización de endpoints

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const fc = require('fast-check');
const config = require('../../../../config');

// Mock dependencies
jest.mock('../../services/equityService');
jest.mock('../../models/equityModel');

const equityService = require('../../services/equityService');
const equityModel = require('../../models/equityModel');

// Setup mocks
equityService.closeMonth = jest.fn().mockResolvedValue({ id: 1 });
equityService.getHistory = jest.fn().mockResolvedValue([]);
equityService.getCurrentCapital = jest.fn().mockResolvedValue(1000);
equityModel.getCurrentCapital = jest.fn().mockResolvedValue(null);

// Create test app
const equityRoutes = require('../../routes/equityRoutes');
const app = express();
app.use(express.json());
app.use('/api/v1/equity', equityRoutes);
// Add error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ error: err.message });
});

function createToken(role) {
  return jwt.sign({ id: 1, role }, config.jwt.secret, { expiresIn: '1h' });
}

/**
 * Validates: Requirements 6.4, 6.5
 */
describe('Property 6: Autorización de endpoints', () => {
  it('any equity endpoint without Authorization header returns 401', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '/api/v1/equity/history',
          '/api/v1/equity/current-capital',
          '/api/v1/equity/close'
        ),
        async (endpoint) => {
          let res;
          if (endpoint === '/api/v1/equity/close') {
            res = await request(app)
              .post(endpoint)
              .send({ period_year: 2025, period_month: 6 });
          } else {
            res = await request(app).get(endpoint);
          }
          expect(res.status).toBe(401);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('POST /equity/close with non-admin role returns 403', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('cashier', 'warehouse'),
        async (role) => {
          const token = createToken(role);
          const res = await request(app)
            .post('/api/v1/equity/close')
            .set('Authorization', `Bearer ${token}`)
            .send({ period_year: 2025, period_month: 6 });
          expect(res.status).toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('GET /equity/history with valid token returns 200', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('admin', 'cashier', 'warehouse'),
        async (role) => {
          const token = createToken(role);
          const res = await request(app)
            .get('/api/v1/equity/history')
            .set('Authorization', `Bearer ${token}`);
          expect(res.status).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('GET /equity/current-capital with valid token returns 200', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('admin', 'cashier', 'warehouse'),
        async (role) => {
          const token = createToken(role);
          const res = await request(app)
            .get('/api/v1/equity/current-capital')
            .set('Authorization', `Bearer ${token}`);
          expect(res.status).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: equity-working-capital, Property 7: Validación de body en cierre

/**
 * Validates: Requirements 6.6
 */
describe('Property 7: Validación de body en cierre', () => {
  it('body with period_year/period_month absent, null, or out of range returns 400', async () => {
    const adminToken = createToken('admin');

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // 1. Missing fields (empty body)
          fc.record({}),
          // 2. Month out of range
          fc.record({
            period_year: fc.integer({ min: 2020, max: 2030 }),
            period_month: fc.oneof(
              fc.integer({ min: -100, max: 0 }),
              fc.integer({ min: 13, max: 100 })
            ),
          }),
          // 3. Year out of range
          fc.record({
            period_year: fc.integer({ min: 1900, max: 2019 }),
            period_month: fc.integer({ min: 1, max: 12 }),
          }),
          // 4. Null fields
          fc.record({
            period_year: fc.constant(null),
            period_month: fc.constant(null),
          })
        ),
        async (invalidBody) => {
          const res = await request(app)
            .post('/api/v1/equity/close')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidBody);
          expect(res.status).toBe(400);
          expect(res.body).toHaveProperty('error');
          expect(typeof res.body.error).toBe('string');
          expect(res.body.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
