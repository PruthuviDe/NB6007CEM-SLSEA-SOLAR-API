const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/data/db');

describe('Phase 1: Environment & Project Scaffolding Tests', () => {

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('GET / — Root Discovery Endpoint', () => {
    it('should return HTTP 200 OK with session identifier per Session 2 guideline', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('session');
      expect(response.body).toHaveProperty('service', 'SLSEA Solar Generation Telemetry API');
    });
  });

  describe('GET /api/v1/health — Operational Diagnostics Probe', () => {
    it('should return HTTP 200 OK with system telemetry and uptime', async () => {
      const response = await request(app).get('/api/v1/health');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('status', 'pass');
      expect(response.body).toHaveProperty('service');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('uptime_seconds');
      expect(response.body).toHaveProperty('memory_usage');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1 — Service Resource Index', () => {
    it('should return HTTP 200 OK and list expected resource endpoints', async () => {
      const response = await request(app).get('/api/v1');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authority', 'Sri Lanka Sustainable Energy Authority (SLSEA)');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('health');
    });
  });

  describe('WSO2 Section 11 Error Handling Contract', () => {
    it('should return HTTP 404 with standard error envelope for unmapped routes', async () => {
      const response = await request(app).get('/api/v1/nonexistent-route-xyz');
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('code', 'RESOURCE_NOT_FOUND');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return HTTP 400 with standard error envelope on malformed JSON payload', async () => {
      const response = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send('{"bad_json": '); // Missing closing brace

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'INVALID_JSON_SYNTAX');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

});
